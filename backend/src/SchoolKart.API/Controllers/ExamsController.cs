using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Domain.Enums;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/exams")]
[Authorize]
public class ExamsController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetExams([FromQuery] Guid? academicYearId, CancellationToken ct)
    {
        var yearId = academicYearId ??
            (await db.AcademicYears.FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct))?.Id;

        var exams = await db.Set<Exam>()
            .Where(e => e.TenantId == tenant.TenantId && (!yearId.HasValue || e.AcademicYearId == yearId.Value))
            .Select(e => new { e.Id, e.Name, e.Type, e.StartDate, e.EndDate, e.IsPublished })
            .ToListAsync(ct);

        return Ok(exams);
    }

    [HttpPost]
    public async Task<IActionResult> CreateExam([FromBody] CreateExamRequest req, CancellationToken ct)
    {
        var exam = new Exam
        {
            TenantId = tenant.TenantId,
            AcademicYearId = req.AcademicYearId,
            ExamTermId = req.ExamTermId,
            Name = req.Name,
            Type = req.Type,
            ClassId = req.ClassId,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            CreatedBy = tenant.UserId
        };
        db.Set<Exam>().Add(exam);
        await db.SaveChangesAsync(ct);
        return Created($"/api/exams/{exam.Id}", new { exam.Id });
    }

    [HttpGet("{examId:guid}/schedule")]
    public async Task<IActionResult> GetSchedule(Guid examId, CancellationToken ct)
    {
        var schedule = await db.Set<ExamSchedule>()
            .Include(s => s.Subject)
            .Include(s => s.Section)
            .Where(s => s.ExamId == examId && s.TenantId == tenant.TenantId)
            .Select(s => new
            {
                s.Id,
                Subject = s.Subject!.Name,
                s.ExamDate,
                s.StartTime,
                s.EndTime,
                s.MaxMarks,
                s.PassMarks,
                s.RoomNumber
            })
            .ToListAsync(ct);

        return Ok(schedule);
    }

    [HttpPost("{examId:guid}/schedule")]
    public async Task<IActionResult> AddSchedule(Guid examId, [FromBody] AddExamScheduleRequest req, CancellationToken ct)
    {
        var schedule = new ExamSchedule
        {
            TenantId = tenant.TenantId,
            ExamId = examId,
            SectionId = req.SectionId,
            SubjectId = req.SubjectId,
            ExamDate = req.ExamDate,
            StartTime = req.StartTime,
            EndTime = req.EndTime,
            MaxMarks = req.MaxMarks,
            PassMarks = req.PassMarks,
            RoomNumber = req.RoomNumber
        };
        db.Set<ExamSchedule>().Add(schedule);
        await db.SaveChangesAsync(ct);
        return Created($"/api/exams/{examId}/schedule/{schedule.Id}", new { schedule.Id });
    }

    [HttpGet("schedule/{scheduleId:guid}/marks")]
    public async Task<IActionResult> GetMarks(Guid scheduleId, CancellationToken ct)
    {
        var schedule = await db.Set<ExamSchedule>()
            .FirstOrDefaultAsync(s => s.Id == scheduleId && s.TenantId == tenant.TenantId, ct);

        if (schedule is null) return NotFound();

        var enrollments = await db.StudentEnrollments
            .Include(e => e.Student)
            .Where(e => e.SectionId == schedule.SectionId && e.TenantId == tenant.TenantId)
            .ToListAsync(ct);

        var marks = await db.Set<StudentMark>()
            .Where(m => m.ExamScheduleId == scheduleId)
            .ToDictionaryAsync(m => m.StudentId, ct);

        var result = enrollments.Select(e => new
        {
            e.Student!.Id,
            e.Student.AdmissionNumber,
            e.Student.FullName,
            e.RollNumber,
            MarksObtained = marks.TryGetValue(e.StudentId, out var m) ? m.MarksObtained : null,
            Grade = marks.TryGetValue(e.StudentId, out var m2) ? m2.Grade : null,
            IsAbsent = marks.TryGetValue(e.StudentId, out var m3) && m3.IsAbsent,
            Remarks = marks.TryGetValue(e.StudentId, out var m4) ? m4.Remarks : null
        });

        return Ok(new { schedule = new { schedule.MaxMarks, schedule.PassMarks }, students = result });
    }

    [HttpPost("schedule/{scheduleId:guid}/marks")]
    public async Task<IActionResult> SaveMarks(Guid scheduleId, [FromBody] SaveMarksRequest req, CancellationToken ct)
    {
        var schedule = await db.Set<ExamSchedule>()
            .FirstOrDefaultAsync(s => s.Id == scheduleId && s.TenantId == tenant.TenantId, ct);

        if (schedule is null) return NotFound();

        foreach (var entry in req.Marks)
        {
            var existing = await db.Set<StudentMark>()
                .FirstOrDefaultAsync(m => m.ExamScheduleId == scheduleId && m.StudentId == entry.StudentId, ct);

            if (existing is null)
            {
                db.Set<StudentMark>().Add(new StudentMark
                {
                    TenantId = tenant.TenantId,
                    ExamScheduleId = scheduleId,
                    StudentId = entry.StudentId,
                    MarksObtained = entry.MarksObtained,
                    IsAbsent = entry.IsAbsent,
                    Remarks = entry.Remarks,
                    EnteredBy = tenant.UserId
                });
            }
            else
            {
                existing.MarksObtained = entry.MarksObtained;
                existing.IsAbsent = entry.IsAbsent;
                existing.Remarks = entry.Remarks;
                existing.EnteredBy = tenant.UserId;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpGet("{examId:guid}/results/{sectionId:guid}")]
    public async Task<IActionResult> GetResults(Guid examId, Guid sectionId, CancellationToken ct)
    {
        var schedules = await db.Set<ExamSchedule>()
            .Include(s => s.Subject)
            .Where(s => s.ExamId == examId && s.SectionId == sectionId && s.TenantId == tenant.TenantId)
            .ToListAsync(ct);

        var allMarks = await db.Set<StudentMark>()
            .Where(m => schedules.Select(s => s.Id).Contains(m.ExamScheduleId))
            .ToListAsync(ct);

        var enrollments = await db.StudentEnrollments
            .Include(e => e.Student)
            .Where(e => e.SectionId == sectionId && e.TenantId == tenant.TenantId)
            .ToListAsync(ct);

        var results = enrollments.Select(e =>
        {
            var studentMarks = allMarks.Where(m => m.StudentId == e.StudentId).ToList();
            var totalMax = schedules.Sum(s => s.MaxMarks);
            var totalObtained = studentMarks.Sum(m => m.MarksObtained ?? 0);
            var percentage = totalMax > 0 ? Math.Round((double)totalObtained / (double)totalMax * 100, 2) : 0;

            return new
            {
                e.Student!.Id,
                e.Student.AdmissionNumber,
                e.Student.FullName,
                e.RollNumber,
                Subjects = schedules.Select(s =>
                {
                    var mark = studentMarks.FirstOrDefault(m => m.ExamScheduleId == s.Id);
                    return new
                    {
                        Subject = s.Subject!.Name,
                        s.MaxMarks,
                        s.PassMarks,
                        ObtainedMarks = mark?.MarksObtained,
                        IsAbsent = mark?.IsAbsent ?? false,
                        Pass = mark != null && !mark.IsAbsent && mark.MarksObtained >= s.PassMarks
                    };
                }),
                TotalMaxMarks = totalMax,
                TotalObtained = totalObtained,
                Percentage = percentage,
                Result = studentMarks.Any(m => !m.IsAbsent && m.MarksObtained < schedules.First(s => s.Id == m.ExamScheduleId).PassMarks)
                    ? "Fail" : "Pass"
            };
        })
        .OrderByDescending(r => r.TotalObtained)
        .Select((r, i) => new { Rank = i + 1, r.Id, r.AdmissionNumber, r.FullName, r.RollNumber, r.Subjects, r.TotalMaxMarks, r.TotalObtained, r.Percentage, r.Result })
        .ToList();

        return Ok(results);
    }
}

// Request records
public record CreateExamRequest(Guid AcademicYearId, Guid? ExamTermId, string Name, ExamType Type, Guid? ClassId, DateOnly? StartDate, DateOnly? EndDate);
public record AddExamScheduleRequest(Guid SectionId, Guid SubjectId, DateOnly ExamDate, TimeOnly? StartTime, TimeOnly? EndTime, decimal MaxMarks, decimal PassMarks, string? RoomNumber);
public record SaveMarksRequest(IEnumerable<MarkEntry> Marks);
public record MarkEntry(Guid StudentId, decimal? MarksObtained, bool IsAbsent, string? Remarks);
