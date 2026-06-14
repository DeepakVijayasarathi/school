using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;
using SchoolKart.Infrastructure.Services;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/communication")]
[Authorize]
public class CommunicationController(AppDbContext db, ITenantContext tenant, INotificationService notifications) : ControllerBase
{
    // ── Announcements ────────────────────────────────────────────

    [HttpGet("announcements")]
    public async Task<IActionResult> GetAnnouncements(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var q = db.Set<Announcement>()
            .Where(a => a.TenantId == tenant.TenantId && a.PublishAt <= now &&
                        (a.ExpiresAt == null || a.ExpiresAt > now))
            .OrderByDescending(a => a.IsPinned)
            .ThenByDescending(a => a.PublishAt);

        var total = await q.CountAsync(ct);
        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id, a.Title, a.Content, a.Audience, a.Channels,
                a.AttachmentUrl, a.IsPinned, a.PublishAt, a.ExpiresAt
            })
            .ToListAsync(ct);

        return Ok(new PagedResult<object> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpPost("announcements")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementRequest req, CancellationToken ct)
    {
        var announcement = new Announcement
        {
            TenantId = tenant.TenantId,
            Title = req.Title,
            Content = req.Content,
            Audience = req.Audience,
            ClassIds = req.ClassIds,
            SectionIds = req.SectionIds,
            Channels = req.Channels ?? ["app"],
            AttachmentUrl = req.AttachmentUrl,
            IsPinned = req.IsPinned,
            PublishAt = req.PublishAt ?? DateTime.UtcNow,
            ExpiresAt = req.ExpiresAt,
            CreatedBy = tenant.UserId
        };
        db.Set<Announcement>().Add(announcement);
        await db.SaveChangesAsync(ct);

        // Queue notifications on selected channels
        await notifications.SendAnnouncementAsync(announcement, ct);

        return Created($"/api/communication/announcements/{announcement.Id}", new { announcement.Id });
    }

    [HttpDelete("announcements/{id:guid}")]
    public async Task<IActionResult> DeleteAnnouncement(Guid id, CancellationToken ct)
    {
        var deleted = await db.Set<Announcement>()
            .Where(a => a.Id == id && a.TenantId == tenant.TenantId)
            .ExecuteDeleteAsync(ct);

        return deleted > 0 ? Ok() : NotFound();
    }

    // ── Send SMS ─────────────────────────────────────────────────

    [HttpPost("sms/send")]
    public async Task<IActionResult> SendSms([FromBody] SendSmsRequest req, CancellationToken ct)
    {
        var results = await notifications.SendSmsAsync(
            tenant.TenantId, req.Recipients, req.Message, ct);

        await db.Set<NotificationLog>().AddRangeAsync(results, ct);
        await db.SaveChangesAsync(ct);

        return Ok(new { sent = results.Count(r => r.Status == "sent"), failed = results.Count(r => r.Status == "failed") });
    }

    [HttpPost("sms/blast")]
    public async Task<IActionResult> SmsBlast([FromBody] SmsBlastRequest req, CancellationToken ct)
    {
        // Gather recipients based on audience
        var phones = new List<string>();

        if (req.Audience == "students" || req.Audience == "all")
        {
            var studentPhones = await db.StudentGuardians
                .Include(sg => sg.Guardian)
                .Where(sg => sg.IsPrimary && sg.ReceivesSms &&
                    db.StudentEnrollments.Any(e => e.StudentId == sg.StudentId && e.TenantId == tenant.TenantId))
                .Select(sg => sg.Guardian!.Phone)
                .ToListAsync(ct);
            phones.AddRange(studentPhones);
        }

        if (req.Audience == "staff" || req.Audience == "all")
        {
            var staffPhones = await db.Users
                .Where(u => u.TenantId == tenant.TenantId && u.Phone != null && u.Status == Domain.Enums.UserStatus.Active)
                .Select(u => u.Phone!)
                .ToListAsync(ct);
            phones.AddRange(staffPhones);
        }

        var uniquePhones = phones.Distinct().ToList();
        var results = await notifications.SendSmsAsync(tenant.TenantId, uniquePhones, req.Message, ct);

        await db.Set<NotificationLog>().AddRangeAsync(results, ct);
        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            totalRecipients = uniquePhones.Count,
            sent = results.Count(r => r.Status == "sent"),
            failed = results.Count(r => r.Status == "failed")
        });
    }

    // ── Send Email ───────────────────────────────────────────────

    [HttpPost("email/send")]
    public async Task<IActionResult> SendEmail([FromBody] SendEmailRequest req, CancellationToken ct)
    {
        var results = await notifications.SendEmailAsync(
            tenant.TenantId, req.Recipients, req.Subject, req.Body, ct);

        await db.Set<NotificationLog>().AddRangeAsync(results, ct);
        await db.SaveChangesAsync(ct);

        return Ok(new { sent = results.Count(r => r.Status == "sent"), failed = results.Count(r => r.Status == "failed") });
    }

    // ── WhatsApp ─────────────────────────────────────────────────

    [HttpPost("whatsapp/send")]
    public async Task<IActionResult> SendWhatsApp([FromBody] SendWhatsAppRequest req, CancellationToken ct)
    {
        var results = await notifications.SendWhatsAppAsync(
            tenant.TenantId, req.Recipients, req.Message, req.TemplateId, ct);

        await db.Set<NotificationLog>().AddRangeAsync(results, ct);
        await db.SaveChangesAsync(ct);

        return Ok(new { sent = results.Count(r => r.Status == "sent"), failed = results.Count(r => r.Status == "failed") });
    }

    // ── Notification Logs ────────────────────────────────────────

    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? channel = null,
        [FromQuery] string? status = null,
        CancellationToken ct = default)
    {
        var q = db.Set<NotificationLog>()
            .Where(l => l.TenantId == tenant.TenantId);

        if (!string.IsNullOrEmpty(channel))
            q = q.Where(l => l.Channel.ToString().ToLower() == channel.ToLower());

        if (!string.IsNullOrEmpty(status))
            q = q.Where(l => l.Status == status);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new { l.Id, l.Channel, l.Recipient, l.Subject, l.Status, l.Error, l.SentAt, l.CreatedAt })
            .ToListAsync(ct);

        return Ok(new PagedResult<object> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }
}

// Request records
public record CreateAnnouncementRequest(
    string Title, string Content, string Audience,
    Guid[]? ClassIds, Guid[]? SectionIds, string[]? Channels,
    string? AttachmentUrl, bool IsPinned, DateTime? PublishAt, DateTime? ExpiresAt);

public record SendSmsRequest(List<string> Recipients, string Message);
public record SmsBlastRequest(string Audience, string Message);
public record SendEmailRequest(List<string> Recipients, string Subject, string Body);
public record SendWhatsAppRequest(List<string> Recipients, string Message, string? TemplateId);
