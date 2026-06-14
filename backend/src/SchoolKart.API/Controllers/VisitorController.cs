using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

// ─── DTOs ─────────────────────────────────────────────────────
public record VisitorDto(Guid Id, string VisitorName, string Phone, string? Company, string Purpose,
    string? HostName, string? HostDepartment, DateTime CheckIn, DateTime? CheckOut, string Status,
    int? DurationMinutes, string? BadgeNumber);
public record CheckInRequest(string VisitorName, string Phone, string? Email, string? IdType, string? IdNumber,
    string? IdProofUrl, string? PhotoUrl, string Purpose, string? PurposeDetails,
    Guid? HostEmployeeId, string? HostName, string? HostDepartment, string? Company,
    int NoOfPersons, string? VehicleNumber, string? BadgeNumber, string? Notes);
public record CheckOutRequest(string? Notes);
public record CreateGatePassRequest(Guid StudentId, string Reason, string? ParentPhone,
    string? AuthorizedPerson, string? AuthorizedPersonPhone, DateTime? ExpectedReturn, string? Notes);
public record ApproveGatePassRequest(string Action, string? Reason);

[ApiController]
[Route("api/visitors")]
[Route("api/visitor")]
[Authorize]
public class VisitorController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ─── Visitor Check-in / Check-out ──────────────────────────

    [HttpGet]
    [HttpGet("check-ins")]
    [HttpGet("currently-inside")]
    public async Task<IActionResult> GetVisitors(
        [FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] DateOnly? date, [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var q = db.Set<Visitor>().Where(v => v.TenantId == tenant.TenantId);

        if (!string.IsNullOrEmpty(status)) q = q.Where(v => v.Status == status);

        if (date.HasValue)
        {
            var dayStart = date.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var dayEnd = date.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            q = q.Where(v => v.CheckIn >= dayStart && v.CheckIn <= dayEnd);
        }

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            q = q.Where(v => v.VisitorName.ToLower().Contains(s)
                || v.Phone.Contains(s)
                || (v.Company != null && v.Company.ToLower().Contains(s)));
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(v => v.CheckIn)
            .Skip((page - 1) * 20).Take(20)
            .Select(v => new VisitorDto(v.Id, v.VisitorName, v.Phone, v.Company, v.Purpose,
                v.HostName, v.HostDepartment, v.CheckIn, v.CheckOut, v.Status, v.DurationMinutes, v.BadgeNumber))
            .ToListAsync(ct);

        return Ok(new { items, total, page, currentlyInside = await q.CountAsync(v => v.Status == "checked_in", ct) });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetVisitor(Guid id, CancellationToken ct)
    {
        var visitor = await db.Set<Visitor>()
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenant.TenantId, ct);
        if (visitor is null) return NotFound();
        return Ok(visitor);
    }

    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInRequest req, CancellationToken ct)
    {
        var today = DateTime.UtcNow;
        var todayCount = await db.Set<Visitor>()
            .CountAsync(v => v.TenantId == tenant.TenantId && v.CheckIn.Date == today.Date, ct);
        var badgeNumber = req.BadgeNumber ?? $"VIS-{today:yyyyMMdd}-{todayCount + 1:D3}";

        var visitor = new Visitor
        {
            TenantId = tenant.TenantId,
            VisitorName = req.VisitorName,
            Phone = req.Phone,
            Email = req.Email,
            IdType = req.IdType,
            IdNumber = req.IdNumber,
            IdProofUrl = req.IdProofUrl,
            PhotoUrl = req.PhotoUrl,
            Purpose = req.Purpose,
            PurposeDetails = req.PurposeDetails,
            HostEmployeeId = req.HostEmployeeId,
            HostName = req.HostName,
            HostDepartment = req.HostDepartment,
            Company = req.Company,
            NoOfPersons = req.NoOfPersons,
            VehicleNumber = req.VehicleNumber,
            BadgeNumber = badgeNumber,
            Notes = req.Notes,
            CheckedInBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null,
            Status = "checked_in"
        };

        db.Set<Visitor>().Add(visitor);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = visitor.Id, badgeNumber, checkIn = visitor.CheckIn });
    }

    [HttpPost("{id:guid}/check-out")]
    [HttpPost("check-out/{id:guid}")]
    public async Task<IActionResult> CheckOut(Guid id, [FromBody] CheckOutRequest? req, CancellationToken ct)
    {
        var visitor = await db.Set<Visitor>()
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenant.TenantId, ct);
        if (visitor is null) return NotFound();
        if (visitor.Status != "checked_in") return BadRequest("Visitor is not currently inside.");

        visitor.CheckOut = DateTime.UtcNow;
        visitor.DurationMinutes = (int)(visitor.CheckOut.Value - visitor.CheckIn).TotalMinutes;
        visitor.Status = "checked_out";
        visitor.Notes = req?.Notes is not null ? $"{visitor.Notes}\n{req.Notes}".Trim() : visitor.Notes;
        visitor.CheckedOutBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null;

        await db.SaveChangesAsync(ct);
        return Ok(new { checkOut = visitor.CheckOut, duration = visitor.DurationMinutes });
    }

    [HttpGet("daily-report")]
    public async Task<IActionResult> DailyReport([FromQuery] DateOnly? date, CancellationToken ct)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var dayStart = targetDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var dayEnd = targetDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var visitors = await db.Set<Visitor>()
            .Where(v => v.TenantId == tenant.TenantId && v.CheckIn >= dayStart && v.CheckIn <= dayEnd)
            .ToListAsync(ct);

        return Ok(new
        {
            date = targetDate,
            totalVisitors = visitors.Sum(v => v.NoOfPersons),
            totalEntries = visitors.Count,
            checkedOut = visitors.Count(v => v.Status == "checked_out"),
            stillInside = visitors.Count(v => v.Status == "checked_in"),
            byPurpose = visitors.GroupBy(v => v.Purpose)
                .Select(g => new { purpose = g.Key, count = g.Count() }),
            visitors = visitors.Select(v => new VisitorDto(v.Id, v.VisitorName, v.Phone, v.Company, v.Purpose,
                v.HostName, v.HostDepartment, v.CheckIn, v.CheckOut, v.Status, v.DurationMinutes, v.BadgeNumber))
        });
    }

    // ─── Gate Passes ───────────────────────────────────────────

    [HttpGet("gate-passes")]
    public async Task<IActionResult> GetGatePasses(
        [FromQuery] string? status, [FromQuery] Guid? studentId,
        [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var q = db.Set<GatePass>()
            .Include(gp => gp.Student)
            .Where(gp => gp.TenantId == tenant.TenantId);

        if (!string.IsNullOrEmpty(status)) q = q.Where(gp => gp.Status == status);
        if (studentId.HasValue) q = q.Where(gp => gp.StudentId == studentId);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(gp => gp.CreatedAt).Skip((page - 1) * 20).Take(20).ToListAsync(ct);

        return Ok(new
        {
            items = items.Select(gp => new
            {
                gp.Id, gp.PassNumber, gp.StudentId, studentName = gp.Student?.FullName,
                gp.Reason, gp.Status, gp.OutTime, gp.InTime, gp.ExpectedReturn,
                gp.AuthorizedPerson, gp.CreatedAt
            }),
            total, page
        });
    }

    [HttpPost("gate-passes")]
    public async Task<IActionResult> CreateGatePass([FromBody] CreateGatePassRequest req, CancellationToken ct)
    {
        var student = await db.Students.FirstOrDefaultAsync(s => s.Id == req.StudentId && s.TenantId == tenant.TenantId, ct);
        if (student is null) return NotFound("Student not found.");

        var count = await db.Set<GatePass>().CountAsync(gp => gp.TenantId == tenant.TenantId, ct);
        var passNumber = $"GP/{DateTime.UtcNow:yyyyMMdd}/{count + 1:D4}";

        var gatePass = new GatePass
        {
            TenantId = tenant.TenantId,
            PassNumber = passNumber,
            StudentId = req.StudentId,
            Reason = req.Reason,
            ParentPhone = req.ParentPhone,
            AuthorizedPerson = req.AuthorizedPerson,
            AuthorizedPersonPhone = req.AuthorizedPersonPhone,
            ExpectedReturn = req.ExpectedReturn,
            Notes = req.Notes,
            RequestedBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null
        };

        db.Set<GatePass>().Add(gatePass);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = gatePass.Id, passNumber });
    }

    [HttpPost("gate-passes/{id:guid}/action")]
    [HttpPost("gate-passes/{id:guid}/approve")]
    public async Task<IActionResult> GatePassAction(Guid id, [FromBody] ApproveGatePassRequest? req, CancellationToken ct)
    {
        var gatePass = await db.Set<GatePass>()
            .FirstOrDefaultAsync(gp => gp.Id == id && gp.TenantId == tenant.TenantId, ct);
        if (gatePass is null) return NotFound();

        var userId = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : (Guid?)null;

        // Derive action from URL segment when body is absent (e.g. /approve route)
        var routeAction = HttpContext.Request.Path.Value?.Split('/').LastOrDefault()?.ToLower();
        var action = req?.Action?.ToLower()
            ?? (routeAction is "approve" or "reject" or "out" or "in" ? routeAction : "");
        switch (action)
        {
            case "approve":
                gatePass.Status = "approved";
                gatePass.ApprovedBy = userId;
                gatePass.ApprovedAt = DateTime.UtcNow;
                break;
            case "reject":
                gatePass.Status = "rejected";
                gatePass.RejectionReason = req.Reason;
                break;
            case "out":
                if (gatePass.Status != "approved") return BadRequest("Gate pass must be approved first.");
                gatePass.Status = "used";
                gatePass.OutTime = DateTime.UtcNow;
                break;
            case "in":
                gatePass.InTime = DateTime.UtcNow;
                break;
            default:
                return BadRequest("Invalid action. Use: approve, reject, out, in");
        }

        gatePass.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(new { status = gatePass.Status });
    }
}
