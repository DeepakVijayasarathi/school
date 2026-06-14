using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/homework")]
[Authorize]
public class HomeworkController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetHomework(
        [FromQuery] Guid? classId,
        [FromQuery] Guid? sectionId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        CancellationToken ct = default)
    {
        var q = db.Set<Homework>()
            .AsNoTracking()
            .Where(h => h.TenantId == tenant.TenantId);

        if (classId.HasValue) q = q.Where(h => h.ClassId == classId);
        if (sectionId.HasValue) q = q.Where(h => h.SectionId == sectionId);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(h => h.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(h => new
            {
                h.Id,
                h.Title,
                h.Description,
                h.Subject,
                h.DueDate,
                h.SubmissionType,
                h.MaxMarks,
                h.Status,
                h.CreatedAt,
                ClassName = h.Class != null ? h.Class.Name : null,
                SectionName = h.Section != null ? h.Section.Name : null,
            })
            .ToListAsync(ct);

        return Ok(new { items, total, page, pageSize });
    }

    [HttpPost]
    public async Task<IActionResult> CreateHomework([FromBody] CreateHomeworkRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Title is required" });

        if (!req.DueDate.HasValue)
            return BadRequest(new { error = "Due date is required" });

        var hw = new Homework
        {
            TenantId = tenant.TenantId,
            Title = req.Title.Trim(),
            Description = req.Description,
            Subject = req.Subject,
            ClassId = req.ClassId,
            SectionId = req.SectionId,
            DueDate = req.DueDate,
            SubmissionType = req.SubmissionType ?? "written",
            MaxMarks = req.MaxMarks,
            Status = "active",
            CreatedBy = tenant.UserId,
        };

        db.Set<Homework>().Add(hw);
        await db.SaveChangesAsync(ct);
        return Created($"/api/homework/{hw.Id}", new { hw.Id, hw.Title, hw.DueDate });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateHomework(Guid id, [FromBody] UpdateHomeworkRequest req, CancellationToken ct)
    {
        var hw = await db.Set<Homework>()
            .FirstOrDefaultAsync(h => h.Id == id && h.TenantId == tenant.TenantId, ct);

        if (hw is null) return NotFound();

        if (req.Title is not null) hw.Title = req.Title.Trim();
        if (req.Description is not null) hw.Description = req.Description;
        if (req.Status is not null) hw.Status = req.Status;
        if (req.DueDate.HasValue) hw.DueDate = req.DueDate;
        hw.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteHomework(Guid id, CancellationToken ct)
    {
        var hw = await db.Set<Homework>()
            .FirstOrDefaultAsync(h => h.Id == id && h.TenantId == tenant.TenantId, ct);

        if (hw is null) return NotFound();
        db.Set<Homework>().Remove(hw);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record CreateHomeworkRequest(
    string Title, string? Description, string? Subject,
    Guid? ClassId, Guid? SectionId, DateOnly? DueDate,
    string? SubmissionType, int? MaxMarks);

public record UpdateHomeworkRequest(string? Title, string? Description, string? Status, DateOnly? DueDate);
