using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

// ─── Entities ────────────────────────────────────────────────
public class ReportCardTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Name { get; set; } = "";
    public bool ShowAttendance { get; set; } = true;
    public bool ShowRank { get; set; } = true;
    public bool ShowGrade { get; set; } = true;
    public bool ShowRemarks { get; set; } = true;
    public bool ShowSignature { get; set; } = true;
    public string? HeaderText { get; set; }
    public string? FooterText { get; set; }
    public string? SchoolLogoUrl { get; set; }
    public string GradeScale { get; set; } = "standard";  // standard|custom
    public string GradeConfig { get; set; } = "[]";        // JSON
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// ─── DTOs ─────────────────────────────────────────────────────
public record ReportCardSubjectRow(string SubjectName, decimal? MaxMarks, decimal? MarksObtained,
    string? Grade, decimal? Percentage, bool IsPassed, string? Remarks);
public record ReportCardDto(
    Guid StudentId, string AdmissionNumber, string StudentName, string? ClassName, string? SectionName,
    string? RollNumber, string ExamName, string AcademicYear,
    decimal TotalMarks, decimal MarksObtained, decimal Percentage, string? Grade, string? Remarks,
    int? Rank, int? TotalStudents, int TotalPresentDays, int TotalWorkingDays, decimal AttendancePercent,
    List<ReportCardSubjectRow> Subjects, string? TeacherRemarks, string? PrincipalRemarks);
public record HallTicketDto(Guid StudentId, string AdmissionNumber, string StudentName,
    string ClassName, string SectionName, string? RollNumber, string ExamName,
    DateOnly ExamStartDate, DateOnly ExamEndDate, List<HallTicketSubjectRow> Subjects);
public record HallTicketSubjectRow(string SubjectName, DateOnly ExamDate, string StartTime, string EndTime,
    string Venue, decimal MaxMarks);

[ApiController]
[Route("api/report-cards")]
[Authorize]
public class ReportCardController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ─── Template Management ───────────────────────────────────

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates(CancellationToken ct)
    {
        var templates = await db.Set<ReportCardTemplate>()
            .Where(t => t.TenantId == tenant.TenantId)
            .OrderBy(t => t.Name)
            .ToListAsync(ct);
        return Ok(templates);
    }

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] ReportCardTemplate req, CancellationToken ct)
    {
        if (req.IsDefault)
        {
            var existing = await db.Set<ReportCardTemplate>()
                .Where(t => t.TenantId == tenant.TenantId && t.IsDefault).ToListAsync(ct);
            existing.ForEach(t => t.IsDefault = false);
        }
        req.Id = Guid.NewGuid();
        req.TenantId = tenant.TenantId;
        req.CreatedAt = req.UpdatedAt = DateTime.UtcNow;
        db.Set<ReportCardTemplate>().Add(req);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = req.Id });
    }

    // ─── Report Card Generation ────────────────────────────────

    [HttpGet("{studentId:guid}/exam/{examId:guid}")]
    public async Task<IActionResult> GetReportCard(Guid studentId, Guid examId, CancellationToken ct)
    {
        var reportCard = await BuildReportCard(studentId, examId, ct);
        if (reportCard is null) return NotFound("Student or exam result not found.");
        return Ok(reportCard);
    }

    [HttpGet("section/{sectionId:guid}/exam/{examId:guid}")]
    public async Task<IActionResult> GetSectionReportCards(Guid sectionId, Guid examId, CancellationToken ct)
    {
        var currentYear = await db.AcademicYears
            .FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct);

        var enrollments = await db.StudentEnrollments
            .Include(e => e.Student)
            .Where(e => e.TenantId == tenant.TenantId
                && e.SectionId == sectionId
                && (currentYear == null || e.AcademicYearId == currentYear.Id))
            .ToListAsync(ct);

        var reportCards = new List<ReportCardDto?>();
        foreach (var enrollment in enrollments)
        {
            var rc = await BuildReportCard(enrollment.StudentId, examId, ct);
            if (rc is not null) reportCards.Add(rc);
        }

        return Ok(new { sectionId, examId, reportCards = reportCards.Where(r => r is not null), total = reportCards.Count });
    }

    [HttpGet("{studentId:guid}/progress-report")]
    public async Task<IActionResult> GetProgressReport(Guid studentId,
        [FromQuery] Guid academicYearId, CancellationToken ct)
    {
        var student = await db.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TenantId == tenant.TenantId, ct);
        if (student is null) return NotFound();

        var exams = await db.Set<Exam>()
            .Where(e => e.TenantId == tenant.TenantId && e.AcademicYearId == academicYearId)
            .OrderBy(e => e.StartDate)
            .ToListAsync(ct);

        var allResults = await db.Set<ExamResult>()
            .Where(r => r.TenantId == tenant.TenantId && r.StudentId == studentId)
            .ToListAsync(ct);

        var progress = exams.Select(exam =>
        {
            var results = allResults.Where(r => r.ExamId == exam.Id).ToList();
            var total = results.Sum(r => r.MaxMarks);
            var obtained = results.Sum(r => r.MarksObtained ?? 0);
            return new
            {
                examId = exam.Id,
                examName = exam.Name,
                totalMarks = total,
                marksObtained = obtained,
                percentage = total > 0 ? Math.Round(obtained / total * 100, 2) : 0m,
                subjects = results.Select(r => new { subjectId = r.SubjectId, marks = r.MarksObtained, maxMarks = r.MaxMarks })
            };
        });

        return Ok(new { studentId, studentName = student.FullName, academicYearId, progress });
    }

    [HttpGet("{studentId:guid}/hall-ticket/{examId:guid}")]
    public async Task<IActionResult> GetHallTicket(Guid studentId, Guid examId, CancellationToken ct)
    {
        var student = await db.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TenantId == tenant.TenantId, ct);
        if (student is null) return NotFound();

        var exam = await db.Set<Exam>().FirstOrDefaultAsync(e => e.Id == examId && e.TenantId == tenant.TenantId, ct);
        if (exam is null) return NotFound();

        var currentYear = await db.AcademicYears
            .FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct);

        var enrollment = await db.StudentEnrollments
            .Include(e => e.Class).Include(e => e.Section)
            .FirstOrDefaultAsync(e => e.StudentId == studentId
                && (currentYear == null || e.AcademicYearId == currentYear.Id), ct);

        var schedules = await db.Set<ExamSchedule>()
            .Include(s => s.Subject)
            .Where(s => s.ExamId == examId && s.TenantId == tenant.TenantId)
            .OrderBy(s => s.ExamDate).ThenBy(s => s.StartTime)
            .ToListAsync(ct);

        var hallTicket = new HallTicketDto(
            student.Id,
            student.AdmissionNumber,
            student.FullName,
            enrollment?.Class?.Name ?? "",
            enrollment?.Section?.Name ?? "",
            enrollment?.RollNumber?.ToString(),
            exam.Name,
            exam.StartDate ?? DateOnly.MinValue,
            exam.EndDate ?? DateOnly.MinValue,
            schedules.Select(s => new HallTicketSubjectRow(
                s.Subject?.Name ?? "",
                s.ExamDate,
                s.StartTime?.ToString("HH:mm") ?? "",
                s.EndTime?.ToString("HH:mm") ?? "",
                s.RoomNumber ?? "TBD",
                s.MaxMarks)).ToList()
        );

        return Ok(hallTicket);
    }

    // ─── Private Helpers ───────────────────────────────────────

    private async Task<ReportCardDto?> BuildReportCard(Guid studentId, Guid examId, CancellationToken ct)
    {
        var student = await db.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TenantId == tenant.TenantId, ct);
        if (student is null) return null;

        var exam = await db.Set<Exam>().FirstOrDefaultAsync(e => e.Id == examId && e.TenantId == tenant.TenantId, ct);
        if (exam is null) return null;

        var academicYear = await db.AcademicYears.FindAsync([exam.AcademicYearId], ct);

        var enrollment = await db.StudentEnrollments
            .Include(e => e.Class).Include(e => e.Section)
            .FirstOrDefaultAsync(e => e.StudentId == studentId && e.AcademicYearId == exam.AcademicYearId, ct);

        var results = await db.Set<ExamResult>()
            .Where(r => r.StudentId == studentId && r.ExamId == examId && r.TenantId == tenant.TenantId)
            .ToListAsync(ct);

        if (!results.Any()) return null;

        var subjectIds = results.Select(r => r.SubjectId).Distinct().ToList();
        var subjects = await db.Set<Subject>().Where(s => subjectIds.Contains(s.Id)).ToListAsync(ct);

        // Attendance for this academic year
        var attendance = await db.Set<StudentAttendance>()
            .Where(a => a.StudentId == studentId && a.TenantId == tenant.TenantId)
            .ToListAsync(ct);

        var presentDays = attendance.Count(a => a.Status == Domain.Enums.AttendanceStatus.Present);
        var totalDays = attendance.Count;
        var attendancePercent = totalDays > 0 ? Math.Round((decimal)presentDays / totalDays * 100, 1) : 0m;

        // Calculate rank
        var sectionResults = await db.Set<ExamResult>()
            .Where(r => r.ExamId == examId && r.TenantId == tenant.TenantId)
            .GroupBy(r => r.StudentId)
            .Select(g => new { StudentId = g.Key, Total = g.Sum(r => r.MarksObtained ?? 0) })
            .OrderByDescending(g => g.Total)
            .ToListAsync(ct);

        var studentTotal = results.Sum(r => r.MarksObtained ?? 0);
        var rank = sectionResults.FindIndex(s => s.StudentId == studentId) + 1;

        var subjectRows = results.Select(r =>
        {
            var subject = subjects.FirstOrDefault(s => s.Id == r.SubjectId);
            var percentage = r.MaxMarks > 0 ? r.MarksObtained / r.MaxMarks * 100 : 0;
            var grade = ComputeGrade(percentage ?? 0);
            return new ReportCardSubjectRow(
                subject?.Name ?? "Unknown",
                r.MaxMarks,
                r.MarksObtained,
                grade,
                percentage.HasValue ? Math.Round(percentage.Value, 2) : null,
                (r.MarksObtained ?? 0) >= (r.MaxMarks * 0.33m),
                r.Remarks);
        }).ToList();

        var totalMax = results.Sum(r => r.MaxMarks);
        var totalObtained = results.Sum(r => r.MarksObtained ?? 0);
        var overallPercent = totalMax > 0 ? Math.Round(totalObtained / totalMax * 100, 2) : 0m;
        var overallGrade = ComputeGrade(overallPercent);

        return new ReportCardDto(
            student.Id,
            student.AdmissionNumber,
            student.FullName,
            enrollment?.Class?.Name,
            enrollment?.Section?.Name,
            enrollment?.RollNumber?.ToString(),
            exam.Name,
            academicYear?.Name ?? "",
            totalMax,
            totalObtained,
            overallPercent,
            overallGrade,
            null,
            rank,
            sectionResults.Count,
            presentDays,
            totalDays,
            attendancePercent,
            subjectRows,
            null,
            null
        );
    }

    private static string ComputeGrade(decimal percentage) => percentage switch
    {
        >= 90 => "A+",
        >= 80 => "A",
        >= 70 => "B+",
        >= 60 => "B",
        >= 50 => "C",
        >= 40 => "D",
        >= 33 => "E",
        _      => "F"
    };
}

