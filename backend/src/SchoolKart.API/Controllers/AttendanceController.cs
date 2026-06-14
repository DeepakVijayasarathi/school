using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Domain.Enums;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    [HttpGet("students")]
    public async Task<IActionResult> GetStudentAttendance(
        [FromQuery] Guid sectionId,
        [FromQuery] DateOnly date,
        CancellationToken ct)
    {
        var enrollments = await db.StudentEnrollments
            .Include(e => e.Student)
            .Where(e => e.SectionId == sectionId && e.TenantId == tenant.TenantId)
            .ToListAsync(ct);

        var existing = await db.Set<StudentAttendance>()
            .Where(a => a.SectionId == sectionId && a.Date == date)
            .ToDictionaryAsync(a => a.StudentId, ct);

        var result = enrollments.Select(e => new
        {
            e.Student!.Id,
            e.Student.AdmissionNumber,
            e.Student.FullName,
            e.RollNumber,
            Status = existing.TryGetValue(e.StudentId, out var att) ? att.Status.ToString() : "NotMarked",
            Remarks = existing.TryGetValue(e.StudentId, out var att2) ? att2.Remarks : null
        });

        return Ok(result);
    }

    [HttpPost("students/mark")]
    public async Task<IActionResult> MarkStudentAttendance([FromBody] MarkAttendanceRequest request, CancellationToken ct)
    {
        var currentYear = await db.AcademicYears
            .FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct);

        if (currentYear is null) return BadRequest("No current academic year");

        foreach (var entry in request.Entries)
        {
            var existing = await db.Set<StudentAttendance>()
                .FirstOrDefaultAsync(a => a.StudentId == entry.StudentId && a.Date == request.Date
                    && a.PeriodNumber == null, ct);

            if (existing is null)
            {
                db.Set<StudentAttendance>().Add(new StudentAttendance
                {
                    TenantId = tenant.TenantId,
                    StudentId = entry.StudentId,
                    SectionId = request.SectionId,
                    AcademicYearId = currentYear.Id,
                    Date = request.Date,
                    Status = entry.Status,
                    MarkedBy = tenant.UserId,
                    Remarks = entry.Remarks
                });
            }
            else
            {
                existing.Status = entry.Status;
                existing.Remarks = entry.Remarks;
                existing.MarkedBy = tenant.UserId;
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { marked = request.Entries.Count() });
    }

    [HttpGet("students/report")]
    public async Task<IActionResult> GetStudentAttendanceReport(
        [FromQuery] Guid studentId,
        [FromQuery] Guid? academicYearId,
        [FromQuery] int? month,
        [FromQuery] int? year,
        CancellationToken ct)
    {
        var yearId = academicYearId ??
            (await db.AcademicYears.FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct))?.Id;

        var q = db.Set<StudentAttendance>()
            .Where(a => a.StudentId == studentId && a.TenantId == tenant.TenantId);

        if (yearId.HasValue) q = q.Where(a => a.AcademicYearId == yearId.Value);
        if (month.HasValue && year.HasValue)
            q = q.Where(a => a.Date.Month == month.Value && a.Date.Year == year.Value);

        var records = await q.OrderBy(a => a.Date).ToListAsync(ct);

        var summary = new
        {
            Total = records.Count,
            Present = records.Count(a => a.Status == AttendanceStatus.Present),
            Absent = records.Count(a => a.Status == AttendanceStatus.Absent),
            Late = records.Count(a => a.Status == AttendanceStatus.Late),
            HalfDay = records.Count(a => a.Status == AttendanceStatus.HalfDay),
            Percentage = records.Count == 0 ? 0 : Math.Round(
                (double)records.Count(a => a.Status != AttendanceStatus.Absent) / records.Count * 100, 2)
        };

        return Ok(new { summary, records = records.Select(a => new { a.Date, a.Status, a.Remarks }) });
    }

    [HttpGet("staff")]
    public async Task<IActionResult> GetStaffAttendance([FromQuery] DateOnly date, CancellationToken ct)
    {
        var records = await db.Set<StaffAttendance>()
            .Include(a => a.Employee!.User)
            .Where(a => a.TenantId == tenant.TenantId && a.Date == date)
            .Select(a => new
            {
                a.Employee!.Id,
                a.Employee.EmployeeCode,
                Name = a.Employee.User!.FirstName + " " + a.Employee.User.LastName,
                a.Status,
                a.CheckIn,
                a.CheckOut,
                a.WorkHours,
                a.Remarks
            })
            .ToListAsync(ct);

        return Ok(records);
    }

    [HttpPost("staff/mark")]
    public async Task<IActionResult> MarkStaffAttendance([FromBody] MarkStaffAttendanceRequest request, CancellationToken ct)
    {
        var existing = await db.Set<StaffAttendance>()
            .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date == request.Date, ct);

        if (existing is null)
        {
            db.Set<StaffAttendance>().Add(new StaffAttendance
            {
                TenantId = tenant.TenantId,
                EmployeeId = request.EmployeeId,
                Date = request.Date,
                Status = request.Status,
                CheckIn = request.CheckIn,
                CheckOut = request.CheckOut,
                Remarks = request.Remarks,
                MarkedBy = tenant.UserId
            });
        }
        else
        {
            existing.Status = request.Status;
            existing.CheckIn = request.CheckIn;
            existing.CheckOut = request.CheckOut;
            existing.Remarks = request.Remarks;
        }

        await db.SaveChangesAsync(ct);
        return Ok();
    }
}

public record MarkAttendanceRequest(
    Guid SectionId,
    DateOnly Date,
    IEnumerable<AttendanceEntry> Entries
);

public record AttendanceEntry(
    Guid StudentId,
    AttendanceStatus Status,
    string? Remarks
);

public record MarkStaffAttendanceRequest(
    Guid EmployeeId,
    DateOnly Date,
    AttendanceStatus Status,
    DateTime? CheckIn,
    DateTime? CheckOut,
    string? Remarks
);
