using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

// ─── DTOs ─────────────────────────────────────────────────────
public record TimetableEntryDto(Guid Id, string DayOfWeek, int PeriodNumber, string PeriodName,
    string StartTime, string EndTime, Guid? SubjectId, string? SubjectName,
    Guid? EmployeeId, string? TeacherName, string? Room);
public record CreateTimetableTemplateRequest(string Name, string? Description, bool IsDefault,
    List<string> WorkingDays, List<PeriodRequest> Periods);
public record PeriodRequest(int PeriodNumber, string? Name, string StartTime, string EndTime, bool IsBreak);
public record UpsertTimetableEntryRequest(Guid SectionId, Guid PeriodId, string DayOfWeek,
    Guid? SubjectId, Guid? EmployeeId, string? Room);
public record AssignClassTeacherRequest(Guid AcademicYearId, Guid ClassId, Guid SectionId, Guid EmployeeId);
public record CreateLessonPlanRequest(Guid EmployeeId, Guid SubjectId, Guid ClassId, Guid? SectionId,
    Guid AcademicYearId, DateOnly Date, string Topic, string? Chapter, string? Objectives,
    string? Materials, string? Activities, string? Methodology, string? Homework, string? Assessment);
public record CreateCalendarEventRequest(Guid AcademicYearId, string Title, string? Description,
    string EventType, DateOnly StartDate, DateOnly EndDate, bool IsHoliday, string? Color, Guid? ClassId);

[ApiController]
[Route("api/timetable")]
[Authorize]
public class TimetableController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ─── Templates ─────────────────────────────────────────────

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates(CancellationToken ct)
    {
        var templates = await db.Set<TimetableTemplate>()
            .Include(t => t.Periods)
            .Where(t => t.TenantId == tenant.TenantId)
            .OrderBy(t => t.Name)
            .ToListAsync(ct);
        return Ok(templates);
    }

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateTimetableTemplateRequest req, CancellationToken ct)
    {
        if (req.IsDefault)
        {
            var existing = await db.Set<TimetableTemplate>()
                .Where(t => t.TenantId == tenant.TenantId && t.IsDefault)
                .ToListAsync(ct);
            existing.ForEach(t => t.IsDefault = false);
        }

        var template = new TimetableTemplate
        {
            TenantId = tenant.TenantId,
            Name = req.Name,
            Description = req.Description,
            IsDefault = req.IsDefault,
            WorkingDays = req.WorkingDays,
            Periods = req.Periods.Select(p => new TimetablePeriod
            {
                TenantId = tenant.TenantId,
                PeriodNumber = p.PeriodNumber,
                Name = p.Name,
                StartTime = TimeOnly.Parse(p.StartTime),
                EndTime = TimeOnly.Parse(p.EndTime),
                IsBreak = p.IsBreak
            }).ToList()
        };
        foreach (var p in template.Periods) p.TemplateId = template.Id;

        db.Set<TimetableTemplate>().Add(template);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = template.Id });
    }

    // ─── Section Timetable ─────────────────────────────────────

    [HttpGet("section/{sectionId:guid}")]
    public async Task<IActionResult> GetSectionTimetable(Guid sectionId,
        [FromQuery] Guid academicYearId, CancellationToken ct)
    {
        var entries = await db.Set<TimetableEntry>()
            .Where(e => e.TenantId == tenant.TenantId
                && e.SectionId == sectionId
                && e.AcademicYearId == academicYearId
                && e.IsActive)
            .ToListAsync(ct);

        var periods = await db.Set<TimetablePeriod>()
            .Where(p => p.TenantId == tenant.TenantId)
            .OrderBy(p => p.PeriodNumber)
            .ToListAsync(ct);

        var subjects = await db.Set<Subject>().Where(s => s.TenantId == tenant.TenantId).ToListAsync(ct);
        var employees = await db.Set<Employee>().Where(e => e.TenantId == tenant.TenantId).ToListAsync(ct);

        var grid = entries.Select(e =>
        {
            var period = periods.FirstOrDefault(p => p.Id == e.PeriodId);
            var subject = subjects.FirstOrDefault(s => s.Id == e.SubjectId);
            var emp = employees.FirstOrDefault(em => em.Id == e.EmployeeId);
            return new TimetableEntryDto(e.Id, e.DayOfWeek, period?.PeriodNumber ?? 0,
                period?.Name ?? $"Period {period?.PeriodNumber}",
                period?.StartTime.ToString("HH:mm") ?? "",
                period?.EndTime.ToString("HH:mm") ?? "",
                e.SubjectId, subject?.Name, e.EmployeeId,
                emp is null ? null : $"{emp.FirstName} {emp.LastName}",
                e.Room);
        }).ToList();

        return Ok(new { sectionId, academicYearId, entries = grid, periods });
    }

    [HttpGet("teacher/{employeeId:guid}")]
    public async Task<IActionResult> GetTeacherTimetable(Guid employeeId,
        [FromQuery] Guid academicYearId, CancellationToken ct)
    {
        var entries = await db.Set<TimetableEntry>()
            .Where(e => e.TenantId == tenant.TenantId
                && e.EmployeeId == employeeId
                && e.AcademicYearId == academicYearId
                && e.IsActive)
            .ToListAsync(ct);

        var periods = await db.Set<TimetablePeriod>()
            .Where(p => p.TenantId == tenant.TenantId)
            .OrderBy(p => p.PeriodNumber).ToListAsync(ct);

        var sections = await db.Sections.Where(s => s.TenantId == tenant.TenantId).ToListAsync(ct);
        var classes = await db.Classes.Where(c => c.TenantId == tenant.TenantId).ToListAsync(ct);
        var subjects = await db.Set<Subject>().Where(s => s.TenantId == tenant.TenantId).ToListAsync(ct);

        var result = entries.Select(e =>
        {
            var period = periods.FirstOrDefault(p => p.Id == e.PeriodId);
            var section = sections.FirstOrDefault(s => s.Id == e.SectionId);
            var cls = classes.FirstOrDefault(c => c.Id == e.ClassId);
            var subject = subjects.FirstOrDefault(s => s.Id == e.SubjectId);
            return new
            {
                e.Id, e.DayOfWeek,
                periodNumber = period?.PeriodNumber,
                startTime = period?.StartTime.ToString("HH:mm"),
                endTime = period?.EndTime.ToString("HH:mm"),
                className = cls?.Name,
                sectionName = section?.Name,
                subjectName = subject?.Name,
                e.Room
            };
        }).ToList();

        return Ok(new { employeeId, academicYearId, entries = result });
    }

    [HttpPost("entries")]
    public async Task<IActionResult> UpsertEntry([FromBody] UpsertTimetableEntryRequest req,
        [FromQuery] Guid academicYearId, [FromQuery] Guid classId, CancellationToken ct)
    {
        // Clash detection: teacher can't be in two places at same time
        if (req.EmployeeId.HasValue)
        {
            var clash = await db.Set<TimetableEntry>()
                .AnyAsync(e => e.TenantId == tenant.TenantId
                    && e.EmployeeId == req.EmployeeId
                    && e.AcademicYearId == academicYearId
                    && e.PeriodId == req.PeriodId
                    && e.DayOfWeek == req.DayOfWeek
                    && e.SectionId != req.SectionId
                    && e.IsActive, ct);

            if (clash) return Conflict(new { message = "Teacher has a clash at this time slot." });
        }

        var existing = await db.Set<TimetableEntry>()
            .FirstOrDefaultAsync(e => e.TenantId == tenant.TenantId
                && e.AcademicYearId == academicYearId
                && e.SectionId == req.SectionId
                && e.PeriodId == req.PeriodId
                && e.DayOfWeek == req.DayOfWeek, ct);

        if (existing is not null)
        {
            existing.SubjectId = req.SubjectId;
            existing.EmployeeId = req.EmployeeId;
            existing.Room = req.Room;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            db.Set<TimetableEntry>().Add(new TimetableEntry
            {
                TenantId = tenant.TenantId,
                AcademicYearId = academicYearId,
                ClassId = classId,
                SectionId = req.SectionId,
                PeriodId = req.PeriodId,
                DayOfWeek = req.DayOfWeek,
                SubjectId = req.SubjectId,
                EmployeeId = req.EmployeeId,
                Room = req.Room,
                CreatedBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null
            });
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Timetable entry saved." });
    }

    [HttpDelete("entries/{id:guid}")]
    public async Task<IActionResult> DeleteEntry(Guid id, CancellationToken ct)
    {
        var entry = await db.Set<TimetableEntry>()
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == tenant.TenantId, ct);
        if (entry is null) return NotFound();
        entry.IsActive = false;
        entry.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ─── Class Teachers ────────────────────────────────────────

    [HttpGet("class-teachers")]
    public async Task<IActionResult> GetClassTeachers([FromQuery] Guid academicYearId, CancellationToken ct)
    {
        var items = await db.Set<ClassTeacher>()
            .Where(ct2 => ct2.TenantId == tenant.TenantId && ct2.AcademicYearId == academicYearId && ct2.IsActive)
            .ToListAsync(ct);

        var empIds = items.Select(i => i.EmployeeId).Distinct().ToList();
        var employees = await db.Set<Employee>()
            .Where(e => empIds.Contains(e.Id)).ToListAsync(ct);

        var sections = await db.Sections.Where(s => s.TenantId == tenant.TenantId).ToListAsync(ct);
        var classes = await db.Classes.Where(c => c.TenantId == tenant.TenantId).ToListAsync(ct);

        var result = items.Select(i =>
        {
            var emp = employees.FirstOrDefault(e => e.Id == i.EmployeeId);
            var sec = sections.FirstOrDefault(s => s.Id == i.SectionId);
            var cls = classes.FirstOrDefault(c => c.Id == i.ClassId);
            return new
            {
                i.Id, i.SectionId, i.ClassId, i.EmployeeId,
                className = cls?.Name,
                sectionName = sec?.Name,
                teacherName = emp is null ? "" : $"{emp.FirstName} {emp.LastName}",
                i.AssignedAt
            };
        });

        return Ok(result);
    }

    [HttpPost("class-teachers")]
    public async Task<IActionResult> AssignClassTeacher([FromBody] AssignClassTeacherRequest req, CancellationToken ct)
    {
        var existing = await db.Set<ClassTeacher>()
            .FirstOrDefaultAsync(ct2 => ct2.TenantId == tenant.TenantId
                && ct2.AcademicYearId == req.AcademicYearId
                && ct2.SectionId == req.SectionId, ct);

        if (existing is not null)
        {
            existing.EmployeeId = req.EmployeeId;
            existing.AssignedAt = DateTime.UtcNow;
        }
        else
        {
            db.Set<ClassTeacher>().Add(new ClassTeacher
            {
                TenantId = tenant.TenantId,
                AcademicYearId = req.AcademicYearId,
                ClassId = req.ClassId,
                SectionId = req.SectionId,
                EmployeeId = req.EmployeeId
            });
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Class teacher assigned." });
    }

    // ─── Lesson Plans ──────────────────────────────────────────

    [HttpGet("lesson-plans")]
    public async Task<IActionResult> GetLessonPlans(
        [FromQuery] Guid? employeeId, [FromQuery] Guid? sectionId,
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var q = db.Set<LessonPlan>().Where(lp => lp.TenantId == tenant.TenantId);

        if (employeeId.HasValue) q = q.Where(lp => lp.EmployeeId == employeeId);
        if (sectionId.HasValue) q = q.Where(lp => lp.SectionId == sectionId);
        if (from.HasValue) q = q.Where(lp => lp.Date >= from.Value);
        if (to.HasValue) q = q.Where(lp => lp.Date <= to.Value);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(lp => lp.Date)
            .Skip((page - 1) * 20).Take(20)
            .ToListAsync(ct);

        return Ok(new { items, total, page });
    }

    [HttpPost("lesson-plans")]
    public async Task<IActionResult> CreateLessonPlan([FromBody] CreateLessonPlanRequest req, CancellationToken ct)
    {
        var plan = new LessonPlan
        {
            TenantId = tenant.TenantId,
            EmployeeId = req.EmployeeId,
            SubjectId = req.SubjectId,
            ClassId = req.ClassId,
            SectionId = req.SectionId,
            AcademicYearId = req.AcademicYearId,
            Date = req.Date,
            Topic = req.Topic,
            Chapter = req.Chapter,
            Objectives = req.Objectives,
            Materials = req.Materials,
            Activities = req.Activities,
            Methodology = req.Methodology,
            Homework = req.Homework,
            Assessment = req.Assessment
        };
        db.Set<LessonPlan>().Add(plan);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = plan.Id });
    }

    [HttpPut("lesson-plans/{id:guid}")]
    public async Task<IActionResult> UpdateLessonPlan(Guid id, [FromBody] CreateLessonPlanRequest req, CancellationToken ct)
    {
        var plan = await db.Set<LessonPlan>().FirstOrDefaultAsync(lp => lp.Id == id && lp.TenantId == tenant.TenantId, ct);
        if (plan is null) return NotFound();

        plan.Topic = req.Topic;
        plan.Chapter = req.Chapter;
        plan.Objectives = req.Objectives;
        plan.Materials = req.Materials;
        plan.Activities = req.Activities;
        plan.Methodology = req.Methodology;
        plan.Homework = req.Homework;
        plan.Assessment = req.Assessment;
        plan.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("lesson-plans/{id:guid}/submit")]
    public async Task<IActionResult> SubmitLessonPlan(Guid id, CancellationToken ct)
    {
        var plan = await db.Set<LessonPlan>().FirstOrDefaultAsync(lp => lp.Id == id && lp.TenantId == tenant.TenantId, ct);
        if (plan is null) return NotFound();
        plan.Status = "submitted";
        plan.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpPost("lesson-plans/{id:guid}/approve")]
    public async Task<IActionResult> ApproveLessonPlan(Guid id, [FromBody] string? comments, CancellationToken ct)
    {
        var plan = await db.Set<LessonPlan>().FirstOrDefaultAsync(lp => lp.Id == id && lp.TenantId == tenant.TenantId, ct);
        if (plan is null) return NotFound();
        plan.Status = "approved";
        plan.ReviewedBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null;
        plan.ReviewedAt = DateTime.UtcNow;
        plan.ReviewComments = comments;
        plan.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok();
    }

    // ─── Academic Calendar ─────────────────────────────────────

    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendar(
        [FromQuery] Guid academicYearId, [FromQuery] int? month, [FromQuery] int? year,
        CancellationToken ct = default)
    {
        var q = db.Set<AcademicCalendarEvent>()
            .Where(e => e.TenantId == tenant.TenantId && e.AcademicYearId == academicYearId);

        if (month.HasValue && year.HasValue)
        {
            var startDate = new DateOnly(year.Value, month.Value, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);
            q = q.Where(e => e.StartDate <= endDate && e.EndDate >= startDate);
        }

        var events = await q.OrderBy(e => e.StartDate).ToListAsync(ct);
        return Ok(events);
    }

    [HttpPost("calendar")]
    public async Task<IActionResult> CreateCalendarEvent([FromBody] CreateCalendarEventRequest req, CancellationToken ct)
    {
        if (req.EndDate < req.StartDate) return BadRequest("End date must be on or after start date.");

        var evt = new AcademicCalendarEvent
        {
            TenantId = tenant.TenantId,
            AcademicYearId = req.AcademicYearId,
            Title = req.Title,
            Description = req.Description,
            EventType = req.EventType,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            IsHoliday = req.IsHoliday,
            ClassId = req.ClassId,
            Color = req.Color,
            CreatedBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null
        };
        db.Set<AcademicCalendarEvent>().Add(evt);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = evt.Id });
    }

    [HttpPut("calendar/{id:guid}")]
    public async Task<IActionResult> UpdateCalendarEvent(Guid id, [FromBody] CreateCalendarEventRequest req, CancellationToken ct)
    {
        var evt = await db.Set<AcademicCalendarEvent>()
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == tenant.TenantId, ct);
        if (evt is null) return NotFound();

        evt.Title = req.Title;
        evt.Description = req.Description;
        evt.EventType = req.EventType;
        evt.StartDate = req.StartDate;
        evt.EndDate = req.EndDate;
        evt.IsHoliday = req.IsHoliday;
        evt.Color = req.Color;
        evt.ClassId = req.ClassId;
        evt.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("calendar/{id:guid}")]
    public async Task<IActionResult> DeleteCalendarEvent(Guid id, CancellationToken ct)
    {
        var evt = await db.Set<AcademicCalendarEvent>()
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == tenant.TenantId, ct);
        if (evt is null) return NotFound();
        db.Set<AcademicCalendarEvent>().Remove(evt);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
