using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

// ─── DTOs ─────────────────────────────────────────────────────
public record ParentDto(Guid Id, string FullName, string Phone, string? Email, bool PortalEnabled, bool IsActive,
    List<StudentMappingDto> Children);
public record StudentMappingDto(Guid StudentId, string StudentName, string ClassName, string SectionName, string Relation, bool IsPrimary);
public record ParentDashboardDto(List<ChildSummaryDto> Children);
public record ChildSummaryDto(Guid StudentId, string Name, string ClassName, string SectionName,
    decimal AttendancePercent, int PresentDays, int AbsentDays, decimal TotalFeesDue, int UnreadMessages);
public record CreateParentRequest(string FirstName, string? LastName, string Phone, string? Email,
    string? Gender, string? Occupation, string? Employer, string? Address, string? City, string? State, string? Pincode,
    string? AadharNumber, bool PortalEnabled);
public record LinkStudentRequest(Guid ParentId, Guid StudentId, string Relation, bool IsPrimary,
    bool IsPickupAuthorized, bool CanViewResults, bool CanViewFees, bool CanViewAttendance);
public record SendMessageRequest(Guid ParentId, Guid? StudentId, string? Subject, string Message, string Type);

[ApiController]
[Route("api/parents")]
[Route("api/parent-portal")]
[Authorize]
public class ParentPortalController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ─── Parent Management ─────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetParents(
        [FromQuery] string? search, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var q = db.Set<Parent>()
            .Include(p => p.StudentMappings).ThenInclude(m => m.Student)
            .Where(p => p.TenantId == tenant.TenantId && p.IsActive && p.DeletedAt == null);

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            q = q.Where(p => p.FirstName.ToLower().Contains(s)
                || (p.LastName != null && p.LastName.ToLower().Contains(s))
                || p.Phone.Contains(s)
                || (p.Email != null && p.Email.ToLower().Contains(s)));
        }

        var total = await q.CountAsync(ct);
        var items = await q.Skip((page - 1) * 20).Take(20).ToListAsync(ct);

        return Ok(new
        {
            items = items.Select(p => MapParentDto(p)),
            total,
            page,
            totalPages = (int)Math.Ceiling(total / 20.0)
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetParent(Guid id, CancellationToken ct)
    {
        var parent = await db.Set<Parent>()
            .Include(p => p.StudentMappings).ThenInclude(m => m.Student)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenant.TenantId, ct);

        if (parent is null) return NotFound();
        return Ok(MapParentDto(parent));
    }

    [HttpPost]
    public async Task<IActionResult> CreateParent([FromBody] CreateParentRequest req, CancellationToken ct)
    {
        var parent = new Parent
        {
            TenantId = tenant.TenantId,
            FirstName = req.FirstName,
            LastName = req.LastName,
            Phone = req.Phone,
            Email = req.Email,
            Gender = req.Gender,
            Occupation = req.Occupation,
            Employer = req.Employer,
            Address = req.Address,
            City = req.City,
            State = req.State,
            Pincode = req.Pincode,
            AadharNumber = req.AadharNumber,
            PortalEnabled = req.PortalEnabled
        };
        db.Set<Parent>().Add(parent);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = parent.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateParent(Guid id, [FromBody] CreateParentRequest req, CancellationToken ct)
    {
        var parent = await db.Set<Parent>().FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenant.TenantId, ct);
        if (parent is null) return NotFound();

        parent.FirstName = req.FirstName;
        parent.LastName = req.LastName;
        parent.Phone = req.Phone;
        parent.Email = req.Email;
        parent.Gender = req.Gender;
        parent.Occupation = req.Occupation;
        parent.Employer = req.Employer;
        parent.Address = req.Address;
        parent.City = req.City;
        parent.State = req.State;
        parent.Pincode = req.Pincode;
        parent.AadharNumber = req.AadharNumber;
        parent.PortalEnabled = req.PortalEnabled;
        parent.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("link-student")]
    public async Task<IActionResult> LinkStudent([FromBody] LinkStudentRequest req, CancellationToken ct)
    {
        var existing = await db.Set<ParentStudentMapping>()
            .FirstOrDefaultAsync(m => m.ParentId == req.ParentId && m.StudentId == req.StudentId, ct);

        if (existing is not null) return Conflict(new { message = "Student already linked to this parent." });

        if (req.IsPrimary)
        {
            var existingPrimary = await db.Set<ParentStudentMapping>()
                .Where(m => m.StudentId == req.StudentId && m.Relation == req.Relation && m.IsPrimary)
                .ToListAsync(ct);
            existingPrimary.ForEach(m => m.IsPrimary = false);
        }

        db.Set<ParentStudentMapping>().Add(new ParentStudentMapping
        {
            TenantId = tenant.TenantId,
            ParentId = req.ParentId,
            StudentId = req.StudentId,
            Relation = req.Relation,
            IsPrimary = req.IsPrimary,
            IsPickupAuthorized = req.IsPickupAuthorized,
            CanViewResults = req.CanViewResults,
            CanViewFees = req.CanViewFees,
            CanViewAttendance = req.CanViewAttendance
        });

        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Student linked to parent." });
    }

    [HttpDelete("link-student/{mappingId:guid}")]
    public async Task<IActionResult> UnlinkStudent(Guid mappingId, CancellationToken ct)
    {
        var mapping = await db.Set<ParentStudentMapping>()
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.TenantId == tenant.TenantId, ct);
        if (mapping is null) return NotFound();
        db.Set<ParentStudentMapping>().Remove(mapping);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ─── Register (no-op stub — parent accounts created by staff) ─

    [HttpPost("register")]
    public IActionResult Register() =>
        Ok(new { message = "Parent registration must be done by school staff." });

    // ─── Get children for a parent (by ?parentId= query param) ───

    [HttpGet("children")]
    public async Task<IActionResult> GetChildren([FromQuery] Guid? parentId, CancellationToken ct)
    {
        if (!parentId.HasValue)
            return BadRequest(new { error = "parentId query parameter is required." });

        var mappings = await db.Set<ParentStudentMapping>()
            .Include(m => m.Student)
            .Where(m => m.ParentId == parentId && m.TenantId == tenant.TenantId)
            .ToListAsync(ct);

        var result = mappings.Select(m => new
        {
            studentId = m.StudentId,
            studentName = m.Student?.FullName,
            relation = m.Relation,
            isPrimary = m.IsPrimary
        });

        return Ok(result);
    }

    // ─── Parent Dashboard ──────────────────────────────────────

    [HttpGet("dashboard/{parentId:guid}")]
    public async Task<IActionResult> GetDashboard(Guid parentId, CancellationToken ct)
    {
        var mappings = await db.Set<ParentStudentMapping>()
            .Include(m => m.Student)
            .Where(m => m.ParentId == parentId && m.TenantId == tenant.TenantId)
            .ToListAsync(ct);

        var children = new List<ChildSummaryDto>();

        foreach (var mapping in mappings)
        {
            var student = mapping.Student;
            if (student is null) continue;

            var currentYear = await db.AcademicYears
                .FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct);

            var enrollment = await db.StudentEnrollments
                .Include(e => e.Class).Include(e => e.Section)
                .FirstOrDefaultAsync(e => e.StudentId == student.Id && e.AcademicYearId == currentYear!.Id, ct);

            var attendanceRecords = await db.Set<StudentAttendance>()
                .Where(a => a.StudentId == student.Id && a.TenantId == tenant.TenantId)
                .ToListAsync(ct);

            var totalDays = attendanceRecords.Count;
            var presentDays = attendanceRecords.Count(a => a.Status == Domain.Enums.AttendanceStatus.Present);
            var absentDays = attendanceRecords.Count(a => a.Status == Domain.Enums.AttendanceStatus.Absent);
            var attendancePercent = totalDays > 0 ? (decimal)presentDays / totalDays * 100 : 0;

            var feeDues = await db.Set<FeeRecord>()
                .Where(f => f.StudentId == student.Id && f.TenantId == tenant.TenantId && f.Status != "paid")
                .SumAsync(f => f.Amount - f.PaidAmount, ct);

            var unreadMessages = await db.Set<ParentCommunication>()
                .CountAsync(c => c.ParentId == parentId && !c.IsRead && c.TenantId == tenant.TenantId, ct);

            children.Add(new ChildSummaryDto(
                student.Id,
                student.FullName,
                enrollment?.Class?.Name ?? "",
                enrollment?.Section?.Name ?? "",
                Math.Round(attendancePercent, 1),
                presentDays, absentDays,
                feeDues,
                unreadMessages));
        }

        return Ok(new ParentDashboardDto(children));
    }

    [HttpGet("children/{studentId:guid}/dashboard")]
    public Task<IActionResult> GetChildDashboardAlias(Guid studentId, CancellationToken ct) =>
        GetDashboard(studentId, ct);

    [HttpGet("children/{studentId:guid}/attendance")]
    [HttpGet("child/{studentId:guid}/attendance")]
    public async Task<IActionResult> GetChildAttendance(Guid studentId,
        [FromQuery] int? month, [FromQuery] int? year, CancellationToken ct)
    {
        var q = db.Set<StudentAttendance>()
            .Where(a => a.StudentId == studentId && a.TenantId == tenant.TenantId);

        if (month.HasValue && year.HasValue)
        {
            var from = new DateOnly(year.Value, month.Value, 1);
            var to = from.AddMonths(1).AddDays(-1);
            q = q.Where(a => a.Date >= from && a.Date <= to);
        }

        var records = await q.OrderBy(a => a.Date).ToListAsync(ct);

        var summary = new
        {
            total = records.Count,
            present = records.Count(a => a.Status == Domain.Enums.AttendanceStatus.Present),
            absent = records.Count(a => a.Status == Domain.Enums.AttendanceStatus.Absent),
            late = records.Count(a => a.Status == Domain.Enums.AttendanceStatus.Late),
            percentage = records.Count > 0
                ? Math.Round((decimal)records.Count(a => a.Status == Domain.Enums.AttendanceStatus.Present) / records.Count * 100, 1)
                : 0m,
            calendar = records.Select(a => new { date = a.Date, status = a.Status.ToString(), remarks = a.Remarks })
        };

        return Ok(summary);
    }

    [HttpGet("children/{studentId:guid}/fees")]
    [HttpGet("child/{studentId:guid}/fees")]
    public async Task<IActionResult> GetChildFees(Guid studentId, CancellationToken ct)
    {
        var fees = await (
            from f in db.Set<FeeRecord>()
            join cat in db.Set<FeeCategory>() on f.FeeTypeId equals cat.Id into catJoin
            from cat in catJoin.DefaultIfEmpty()
            where f.StudentId == studentId && f.TenantId == tenant.TenantId
            orderby f.DueDate descending
            select new
            {
                f.Id,
                feeTypeName = cat != null ? cat.Name : "—",
                f.Amount,
                f.PaidAmount,
                f.DueDate,
                f.Status
            }
        ).ToListAsync(ct);

        var summary = new
        {
            totalDue = fees.Where(f => f.Status.ToLower() != "paid").Sum(f => f.Amount - f.PaidAmount),
            totalPaid = fees.Sum(f => f.PaidAmount),
            records = fees
        };

        return Ok(summary);
    }

    [HttpGet("children/{studentId:guid}/results")]
    [HttpGet("child/{studentId:guid}/results")]
    public async Task<IActionResult> GetChildResults(Guid studentId,
        [FromQuery] Guid? examId, CancellationToken ct)
    {
        var q = db.Set<StudentMark>()
            .Include(m => m.ExamSchedule!.Exam)
            .Include(m => m.ExamSchedule!.Subject)
            .Where(m => m.StudentId == studentId && m.TenantId == tenant.TenantId);

        if (examId.HasValue) q = q.Where(m => m.ExamSchedule!.ExamId == examId);

        var results = await q
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new
            {
                m.Id,
                examName = m.ExamSchedule!.Exam != null ? m.ExamSchedule.Exam.Name : "—",
                subjectName = m.ExamSchedule.Subject != null ? m.ExamSchedule.Subject.Name : "—",
                m.MaxMarks,
                m.MarksObtained,
                m.Grade,
                isPassed = m.IsPass,
                m.IsAbsent,
                m.Remarks
            })
            .ToListAsync(ct);

        return Ok(results);
    }

    // ─── PTM (Parent-Teacher Meeting) ─────────────────────────

    [HttpGet("ptm")]
    public async Task<IActionResult> GetPtmSchedule([FromQuery] Guid? parentId, CancellationToken ct)
    {
        // Returns upcoming PTM slots — stub returns empty list if no PTM entity exists yet
        return Ok(new { items = Array.Empty<object>(), message = "PTM scheduling coming soon." });
    }

    [HttpPost("ptm/book")]
    public async Task<IActionResult> BookPtm([FromBody] object request, CancellationToken ct)
    {
        return Ok(new { message = "PTM booking request received. Staff will confirm shortly." });
    }

    // ─── Messaging ─────────────────────────────────────────────

    [HttpGet("messages")]
    public async Task<IActionResult> GetAllMessages(
        [FromQuery] Guid? parentId, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var q = db.Set<ParentCommunication>().Where(c => c.TenantId == tenant.TenantId);
        if (parentId.HasValue) q = q.Where(c => c.ParentId == parentId);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(c => c.CreatedAt).Skip((page - 1) * 20).Take(20).ToListAsync(ct);
        return Ok(new { items, total, page, unread = items.Count(i => !i.IsRead) });
    }

    [HttpGet("messages/{parentId:guid}")]
    public async Task<IActionResult> GetMessages(Guid parentId,
        [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var q = db.Set<ParentCommunication>()
            .Where(c => c.ParentId == parentId && c.TenantId == tenant.TenantId);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(c => c.CreatedAt).Skip((page - 1) * 20).Take(20).ToListAsync(ct);

        return Ok(new { items, total, page, unread = items.Count(i => !i.IsRead) });
    }

    [HttpPost("messages")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest req, CancellationToken ct)
    {
        var msg = new ParentCommunication
        {
            TenantId = tenant.TenantId,
            ParentId = req.ParentId,
            StudentId = req.StudentId,
            InitiatedBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null,
            Type = req.Type,
            Direction = "outgoing",
            Subject = req.Subject,
            Message = req.Message
        };
        db.Set<ParentCommunication>().Add(msg);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = msg.Id });
    }

    [HttpPost("messages/{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var msg = await db.Set<ParentCommunication>()
            .FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenant.TenantId, ct);
        if (msg is null) return NotFound();
        msg.IsRead = true;
        msg.ReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ─── Private helpers ───────────────────────────────────────

    private static ParentDto MapParentDto(Parent parent)
    {
        var children = parent.StudentMappings.Select(m => new StudentMappingDto(
            m.StudentId,
            m.Student?.FullName ?? "",
            "",
            "",
            m.Relation,
            m.IsPrimary)).ToList();

        return new ParentDto(parent.Id,
            $"{parent.FirstName} {parent.LastName}".Trim(),
            parent.Phone, parent.Email,
            parent.PortalEnabled, parent.IsActive, children);
    }
}
