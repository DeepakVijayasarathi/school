using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

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
        var templates = await db.ReportCardTemplates
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
            var existing = await db.ReportCardTemplates
                .Where(t => t.TenantId == tenant.TenantId && t.IsDefault).ToListAsync(ct);
            existing.ForEach(t => t.IsDefault = false);
        }
        req.Id = Guid.NewGuid();
        req.TenantId = tenant.TenantId;
        req.CreatedAt = req.UpdatedAt = DateTime.UtcNow;
        db.ReportCardTemplates.Add(req);
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
        var exam = await db.Set<Exam>().FirstOrDefaultAsync(e => e.Id == examId && e.TenantId == tenant.TenantId, ct);
        if (exam is null) return NotFound();

        var academicYear = await db.AcademicYears.FindAsync([exam.AcademicYearId], ct);

        // Batch-load enrollments for the section + academic year
        var enrollments = await db.StudentEnrollments
            .Include(e => e.Student)
            .Include(e => e.Class)
            .Include(e => e.Section)
            .Where(e => e.TenantId == tenant.TenantId
                && e.SectionId == sectionId
                && e.AcademicYearId == exam.AcademicYearId)
            .ToListAsync(ct);

        if (enrollments.Count == 0)
            return Ok(new { sectionId, examId, reportCards = Array.Empty<ReportCardDto>(), total = 0 });

        var studentIds = enrollments.Select(e => e.StudentId).ToList();

        // H-9: Query StudentMark (via ExamSchedule) instead of ExamResult.
        // ExamSchedule links ExamId → SubjectId; StudentMark links ExamScheduleId → marks.
        var allMarks = await db.StudentMarks
            .Include(m => m.ExamSchedule).ThenInclude(s => s!.Subject)
            .Where(m => m.TenantId == tenant.TenantId
                && studentIds.Contains(m.StudentId)
                && m.ExamSchedule!.ExamId == examId)
            .ToListAsync(ct);

        // Batch-load attendance for all students
        var allAttendance = await db.Set<StudentAttendance>()
            .Where(a => studentIds.Contains(a.StudentId) && a.TenantId == tenant.TenantId)
            .ToListAsync(ct);
        var attendanceByStudent = allAttendance.GroupBy(a => a.StudentId).ToDictionary(g => g.Key, g => g.ToList());

        // Compute per-exam totals for ranking across all students
        var rankingData = allMarks
            .GroupBy(m => m.StudentId)
            .Select(g => new { StudentId = g.Key, Total = g.Sum(m => m.MarksObtained ?? 0) })
            .OrderByDescending(g => g.Total)
            .ToList();

        var reportCards = new List<ReportCardDto>();
        foreach (var enrollment in enrollments)
        {
            var studentMarks = allMarks.Where(m => m.StudentId == enrollment.StudentId).ToList();
            if (!studentMarks.Any()) continue;

            var attendance = attendanceByStudent.GetValueOrDefault(enrollment.StudentId) ?? new List<StudentAttendance>();
            var presentDays = attendance.Count(a => a.Status == Domain.Enums.AttendanceStatus.Present);
            var totalDays = attendance.Count;
            var attendancePercent = totalDays > 0 ? Math.Round((decimal)presentDays / totalDays * 100, 1) : 0m;

            var totalMax = studentMarks.Sum(m => m.MaxMarks);
            var totalObtained = studentMarks.Sum(m => m.MarksObtained ?? 0);
            var overallPercent = totalMax > 0 ? Math.Round(totalObtained / totalMax * 100, 2) : 0m;
            var overallGrade = ComputeGrade(overallPercent);
            var rank = rankingData.FindIndex(s => s.StudentId == enrollment.StudentId) + 1;

            var subjectRows = studentMarks.Select(m =>
            {
                var subjectName = m.ExamSchedule?.Subject?.Name ?? "Unknown";
                var pct = m.MaxMarks > 0 ? m.MarksObtained / m.MaxMarks * 100 : 0;
                var grade = ComputeGrade(pct ?? 0);
                return new ReportCardSubjectRow(
                    subjectName,
                    m.MaxMarks, m.MarksObtained, grade,
                    pct.HasValue ? Math.Round(pct.Value, 2) : null,
                    m.IsPass,
                    m.Remarks);
            }).ToList();

            reportCards.Add(new ReportCardDto(
                enrollment.StudentId,
                enrollment.Student!.AdmissionNumber,
                enrollment.Student.FullName,
                enrollment.Class?.Name,
                enrollment.Section?.Name,
                enrollment.RollNumber?.ToString(),
                exam.Name,
                academicYear?.Name ?? "",
                totalMax, totalObtained, overallPercent, overallGrade, null,
                rank, rankingData.Count,
                presentDays, totalDays, attendancePercent,
                subjectRows, null, null));
        }

        return Ok(new { sectionId, examId, reportCards, total = reportCards.Count });
    }

    [HttpGet("{studentId:guid}/progress-report")]
    public async Task<IActionResult> GetProgressReport(Guid studentId,
        [FromQuery] Guid academicYearId, CancellationToken ct)
    {
        var student = await db.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TenantId == tenant.TenantId, ct);
        if (student is null) return NotFound();

        var exams = await db.Set<Exam>()
            .Include(e => e.Schedules)
            .Where(e => e.TenantId == tenant.TenantId && e.AcademicYearId == academicYearId)
            .OrderBy(e => e.StartDate)
            .ToListAsync(ct);

        // H-9: Use StudentMark (joined through ExamSchedule) instead of ExamResult.
        var examIds = exams.Select(e => e.Id).ToList();
        var allMarks = await db.StudentMarks
            .Include(m => m.ExamSchedule)
            .Where(m => m.TenantId == tenant.TenantId
                && m.StudentId == studentId
                && m.ExamSchedule!.Exam != null
                && examIds.Contains(m.ExamSchedule.ExamId))
            .ToListAsync(ct);

        var progress = exams.Select(exam =>
        {
            var scheduleIds = exam.Schedules.Select(s => s.Id).ToHashSet();
            var marks = allMarks.Where(m => scheduleIds.Contains(m.ExamScheduleId)).ToList();
            var total = marks.Sum(m => m.MaxMarks);
            var obtained = marks.Sum(m => m.MarksObtained ?? 0);
            return new
            {
                examId = exam.Id,
                examName = exam.Name,
                totalMarks = total,
                marksObtained = obtained,
                percentage = total > 0 ? Math.Round(obtained / total * 100, 2) : 0m,
                subjects = marks.Select(m => new
                {
                    subjectId = m.ExamSchedule?.SubjectId,
                    marks = m.MarksObtained,
                    maxMarks = m.MaxMarks
                })
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

        // H-9: Query StudentMark via ExamSchedule (ExamId) instead of ExamResult.
        // ExamsController writes marks to StudentMark, not ExamResult, so this is the correct table.
        var marks = await db.StudentMarks
            .Include(m => m.ExamSchedule).ThenInclude(s => s!.Subject)
            .Where(m => m.StudentId == studentId
                && m.TenantId == tenant.TenantId
                && m.ExamSchedule!.ExamId == examId)
            .ToListAsync(ct);

        if (!marks.Any()) return null;

        // Attendance for this academic year
        var attendance = await db.Set<StudentAttendance>()
            .Where(a => a.StudentId == studentId && a.TenantId == tenant.TenantId)
            .ToListAsync(ct);

        var presentDays = attendance.Count(a => a.Status == Domain.Enums.AttendanceStatus.Present);
        var totalDays = attendance.Count;
        var attendancePercent = totalDays > 0 ? Math.Round((decimal)presentDays / totalDays * 100, 1) : 0m;

        // Calculate rank: compare against all other students' marks for this exam
        var allStudentTotals = await db.StudentMarks
            .Where(m => m.TenantId == tenant.TenantId && m.ExamSchedule!.ExamId == examId)
            .GroupBy(m => m.StudentId)
            .Select(g => new { StudentId = g.Key, Total = g.Sum(m => m.MarksObtained ?? 0) })
            .OrderByDescending(g => g.Total)
            .ToListAsync(ct);

        var rank = allStudentTotals.FindIndex(s => s.StudentId == studentId) + 1;

        var subjectRows = marks.Select(m =>
        {
            var subjectName = m.ExamSchedule?.Subject?.Name ?? "Unknown";
            var percentage = m.MaxMarks > 0 ? m.MarksObtained / m.MaxMarks * 100 : 0;
            var grade = ComputeGrade(percentage ?? 0);
            return new ReportCardSubjectRow(
                subjectName,
                m.MaxMarks,
                m.MarksObtained,
                grade,
                percentage.HasValue ? Math.Round(percentage.Value, 2) : null,
                m.IsPass,
                m.Remarks);
        }).ToList();

        var totalMax = marks.Sum(m => m.MaxMarks);
        var totalObtained = marks.Sum(m => m.MarksObtained ?? 0);
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
            allStudentTotals.Count,
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
