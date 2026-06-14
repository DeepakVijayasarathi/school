using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

// ─── DTOs ─────────────────────────────────────────────────────
public record InquiryDto(Guid Id, string StudentName, string ClassSeeking, string ParentName,
    string ParentPhone, string Status, DateTime FollowUpDate, DateTime CreatedAt);
public record ApplicationSummaryDto(Guid Id, string ApplicationNumber, string StudentName,
    string FatherName, string? ContactPhone, string Status, DateTime CreatedAt);
public record CreateInquiryRequest(string StudentName, string? DateOfBirth, string? Gender,
    string ClassSeeking, Guid? AcademicYearId, string ParentName, string ParentPhone,
    string? ParentEmail, string? Address, string? PreviousSchool, string? ReferredBy, string Source, string? Notes);
public record CreateApplicationRequest(
    Guid? InquiryId, string StudentFirstName, string? StudentLastName, string? DateOfBirth, string? Gender,
    string? Religion, string? Caste, string? Category, string? BloodGroup,
    Guid? ClassId, Guid? AcademicYearId, string? PreviousSchool, string? PreviousClass,
    string FatherName, string? FatherPhone, string? FatherOccupation,
    string MotherName, string? MotherPhone, string? MotherOccupation,
    string? Address, string? City, string? State, string? Pincode, string? ContactPhone, string? ContactEmail,
    string? Allergies, string? MedicalConditions, List<string>? DocumentUrls, decimal? ApplicationFee);
public record UpdateStatusRequest(string Status, string? Reason, string? Notes);
public record ScheduleTestRequest(DateOnly TestDate, string TestTime, string? Venue, string? Subject, decimal? MaxMarks);
public record RecordTestResultRequest(decimal MarksObtained, decimal MaxMarks, string Result, string? Notes);
public record ConvertToStudentRequest(Guid? SectionId, string? AdmissionDate);

[ApiController]
[Route("api/admissions")]
[Authorize]
public class AdmissionController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ─── Inquiries ─────────────────────────────────────────────

    [HttpGet("inquiries")]
    public async Task<IActionResult> GetInquiries(
        [FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var q = db.Set<AdmissionInquiry>().Where(i => i.TenantId == tenant.TenantId);

        if (!string.IsNullOrEmpty(status)) q = q.Where(i => i.Status == status);
        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            q = q.Where(i => i.StudentName.ToLower().Contains(s) || i.ParentPhone.Contains(s));
        }

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(i => i.CreatedAt).Skip((page - 1) * 20).Take(20)
            .Select(i => new InquiryDto(i.Id, i.StudentName, i.ClassSeeking, i.ParentName, i.ParentPhone, i.Status, i.FollowUpDate, i.CreatedAt))
            .ToListAsync(ct);

        return Ok(new { items, total, page });
    }

    [HttpPost("inquiries")]
    public async Task<IActionResult> CreateInquiry([FromBody] CreateInquiryRequest req, CancellationToken ct)
    {
        var inquiry = new AdmissionInquiry
        {
            TenantId = tenant.TenantId,
            StudentName = req.StudentName,
            DateOfBirth = req.DateOfBirth,
            Gender = req.Gender,
            ClassSeeking = req.ClassSeeking,
            AcademicYearId = req.AcademicYearId,
            ParentName = req.ParentName,
            ParentPhone = req.ParentPhone,
            ParentEmail = req.ParentEmail,
            Address = req.Address,
            PreviousSchool = req.PreviousSchool,
            ReferredBy = req.ReferredBy,
            Source = req.Source,
            Notes = req.Notes,
            Status = "inquiry",
            FollowUpDate = DateTime.UtcNow.AddDays(3)
        };
        db.Set<AdmissionInquiry>().Add(inquiry);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = inquiry.Id });
    }

    [HttpPatch("inquiries/{id:guid}/status")]
    public async Task<IActionResult> UpdateInquiryStatus(Guid id, [FromBody] UpdateStatusRequest req, CancellationToken ct)
    {
        var inquiry = await db.Set<AdmissionInquiry>().FirstOrDefaultAsync(i => i.Id == id && i.TenantId == tenant.TenantId, ct);
        if (inquiry is null) return NotFound();
        inquiry.Status = req.Status;
        inquiry.Notes = req.Notes ?? inquiry.Notes;
        inquiry.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ─── Applications ──────────────────────────────────────────

    [HttpGet("applications")]
    public async Task<IActionResult> GetApplications(
        [FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var q = db.Set<AdmissionApplication>().Where(a => a.TenantId == tenant.TenantId);

        if (!string.IsNullOrEmpty(status)) q = q.Where(a => a.Status == status);
        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            q = q.Where(a => a.StudentFirstName.ToLower().Contains(s)
                || a.ApplicationNumber.ToLower().Contains(s)
                || (a.ContactPhone != null && a.ContactPhone.Contains(s)));
        }

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(a => a.CreatedAt).Skip((page - 1) * 20).Take(20)
            .Select(a => new ApplicationSummaryDto(a.Id, a.ApplicationNumber,
                a.StudentFirstName + " " + a.StudentLastName, a.FatherName, a.ContactPhone, a.Status, a.CreatedAt))
            .ToListAsync(ct);

        var stats = await db.Set<AdmissionApplication>()
            .Where(a => a.TenantId == tenant.TenantId)
            .GroupBy(a => a.Status)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync(ct);

        return Ok(new { items, total, page, stats });
    }

    [HttpGet("applications/{id:guid}")]
    public async Task<IActionResult> GetApplication(Guid id, CancellationToken ct)
    {
        var app = await db.Set<AdmissionApplication>()
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenant.TenantId, ct);
        if (app is null) return NotFound();
        return Ok(app);
    }

    [HttpPost("applications")]
    public async Task<IActionResult> CreateApplication([FromBody] CreateApplicationRequest req, CancellationToken ct)
    {
        var lastApp = await db.Set<AdmissionApplication>()
            .Where(a => a.TenantId == tenant.TenantId)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync(ct);

        var year = DateTime.UtcNow.Year.ToString()[2..];
        var seq = lastApp is null ? 1 : int.Parse(lastApp.ApplicationNumber.Split('/').Last()) + 1;
        var appNumber = $"APP/{year}/{seq:D5}";

        var application = new AdmissionApplication
        {
            TenantId = tenant.TenantId,
            InquiryId = req.InquiryId,
            ApplicationNumber = appNumber,
            StudentFirstName = req.StudentFirstName,
            StudentLastName = req.StudentLastName,
            DateOfBirth = req.DateOfBirth,
            Gender = req.Gender,
            Religion = req.Religion,
            Caste = req.Caste,
            Category = req.Category,
            BloodGroup = req.BloodGroup,
            ClassId = req.ClassId,
            AcademicYearId = req.AcademicYearId,
            PreviousSchool = req.PreviousSchool,
            PreviousClass = req.PreviousClass,
            FatherName = req.FatherName,
            FatherPhone = req.FatherPhone,
            FatherOccupation = req.FatherOccupation,
            MotherName = req.MotherName,
            MotherPhone = req.MotherPhone,
            MotherOccupation = req.MotherOccupation,
            Address = req.Address,
            City = req.City,
            State = req.State,
            Pincode = req.Pincode,
            ContactPhone = req.ContactPhone,
            ContactEmail = req.ContactEmail,
            Allergies = req.Allergies,
            MedicalConditions = req.MedicalConditions,
            DocumentUrls = req.DocumentUrls ?? [],
            ApplicationFee = req.ApplicationFee,
            Status = "applied"
        };

        if (req.InquiryId.HasValue)
        {
            var inquiry = await db.Set<AdmissionInquiry>().FindAsync([req.InquiryId], ct);
            if (inquiry is not null) { inquiry.Status = "applied"; inquiry.UpdatedAt = DateTime.UtcNow; }
        }

        db.Set<AdmissionApplication>().Add(application);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = application.Id, applicationNumber = appNumber });
    }

    [HttpPatch("applications/{id:guid}/status")]
    public async Task<IActionResult> UpdateApplicationStatus(Guid id, [FromBody] UpdateStatusRequest req, CancellationToken ct)
    {
        var app = await db.Set<AdmissionApplication>()
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenant.TenantId, ct);
        if (app is null) return NotFound();

        app.Status = req.Status;
        if (req.Status == "rejected") app.RejectionReason = req.Reason;
        app.ReviewNotes = req.Notes ?? app.ReviewNotes;
        app.ReviewedBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null;
        app.ReviewedAt = DateTime.UtcNow;
        app.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("applications/{id:guid}/schedule-test")]
    [HttpPost("applications/{id:guid}/test")]
    public async Task<IActionResult> ScheduleTest(Guid id, [FromBody] ScheduleTestRequest req, CancellationToken ct)
    {
        var app = await db.Set<AdmissionApplication>()
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenant.TenantId, ct);
        if (app is null) return NotFound();

        app.Status = "test_scheduled";
        app.UpdatedAt = DateTime.UtcNow;

        var test = new EntranceTest
        {
            TenantId = tenant.TenantId,
            ApplicationId = id,
            TestDate = req.TestDate,
            TestTime = TimeOnly.Parse(req.TestTime),
            Venue = req.Venue,
            Subject = req.Subject,
            MaxMarks = req.MaxMarks
        };
        db.Set<EntranceTest>().Add(test);
        await db.SaveChangesAsync(ct);
        return Ok(new { testId = test.Id });
    }

    [HttpPost("entrance-tests/{testId:guid}/result")]
    public async Task<IActionResult> RecordTestResult(Guid testId, [FromBody] RecordTestResultRequest req, CancellationToken ct)
    {
        var test = await db.Set<EntranceTest>()
            .Include(t => t.Application)
            .FirstOrDefaultAsync(t => t.Id == testId && t.TenantId == tenant.TenantId, ct);
        if (test is null) return NotFound();

        test.MarksObtained = req.MarksObtained;
        test.MaxMarks = req.MaxMarks;
        test.Result = req.Result;
        test.Notes = req.Notes;

        if (test.Application is not null && req.Result == "pass")
        {
            test.Application.Status = "shortlisted";
            test.Application.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { result = req.Result });
    }

    [HttpGet("merit-list")]
    public async Task<IActionResult> GetMeritList([FromQuery] Guid? classId, [FromQuery] Guid? academicYearId, CancellationToken ct)
    {
        var tests = await db.Set<EntranceTest>()
            .Include(t => t.Application)
            .Where(t => t.TenantId == tenant.TenantId
                && t.MarksObtained.HasValue
                && t.Result == "pass"
                && (classId == null || t.Application!.ClassId == classId)
                && (academicYearId == null || t.Application!.AcademicYearId == academicYearId))
            .OrderByDescending(t => t.MarksObtained)
            .ToListAsync(ct);

        var meritList = tests.Select((t, i) => new
        {
            rank = i + 1,
            applicationId = t.ApplicationId,
            applicationNumber = t.Application?.ApplicationNumber,
            studentName = $"{t.Application?.StudentFirstName} {t.Application?.StudentLastName}".Trim(),
            marksObtained = t.MarksObtained,
            maxMarks = t.MaxMarks,
            percentage = t.MaxMarks > 0 ? Math.Round(t.MarksObtained!.Value / t.MaxMarks.Value * 100, 2) : 0m,
            status = t.Application?.Status
        });

        return Ok(meritList);
    }

    [HttpPost("applications/{id:guid}/convert-to-student")]
    [HttpPost("applications/{id:guid}/convert")]
    public async Task<IActionResult> ConvertToStudent(Guid id, [FromBody] ConvertToStudentRequest req, CancellationToken ct)
    {
        var app = await db.Set<AdmissionApplication>()
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenant.TenantId, ct);
        if (app is null) return NotFound();
        if (app.Status != "admitted" && app.Status != "shortlisted")
            return BadRequest("Application must be admitted or shortlisted to convert.");
        if (app.ConvertedStudentId.HasValue)
            return BadRequest("Application already converted to student.");

        var lastStudent = await db.Students.Where(s => s.TenantId == tenant.TenantId)
            .OrderByDescending(s => s.CreatedAt).FirstOrDefaultAsync(ct);
        var year = DateTime.UtcNow.Year.ToString()[2..];
        var seq = lastStudent is null ? 1 : int.Parse(lastStudent.AdmissionNumber.Split('/').Last()) + 1;
        var admissionNumber = $"ADM/{year}/{seq:D4}";

        var admissionDate = req.AdmissionDate is not null
            ? DateOnly.Parse(req.AdmissionDate)
            : DateOnly.FromDateTime(DateTime.UtcNow);

        var student = new Student
        {
            TenantId = tenant.TenantId,
            AdmissionNumber = admissionNumber,
            FirstName = app.StudentFirstName,
            LastName = app.StudentLastName ?? "",
            Gender = Enum.TryParse<Domain.Enums.Gender>(app.Gender, true, out var g) ? g : Domain.Enums.Gender.Male,
            DateOfBirth = app.DateOfBirth is not null ? DateOnly.Parse(app.DateOfBirth) : DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-10)),
            Religion = app.Religion,
            Caste = app.Caste,
            Category = app.Category,
            Address = app.Address,
            City = app.City,
            State = app.State,
            Pincode = app.Pincode,
            PreviousSchool = app.PreviousSchool,
            PreviousClass = app.PreviousClass,
            AdmissionDate = admissionDate,
            Status = Domain.Enums.AdmissionStatus.Active
        };

        db.Students.Add(student);

        if (app.AcademicYearId.HasValue && app.ClassId.HasValue && req.SectionId.HasValue)
        {
            db.StudentEnrollments.Add(new StudentEnrollment
            {
                TenantId = tenant.TenantId,
                StudentId = student.Id,
                AcademicYearId = app.AcademicYearId.Value,
                ClassId = app.ClassId.Value,
                SectionId = req.SectionId.Value,
                EnrolledAt = DateTime.UtcNow
            });
        }

        app.Status = "admitted";
        app.ConvertedStudentId = student.Id;
        app.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(new { studentId = student.Id, admissionNumber });
    }
}
