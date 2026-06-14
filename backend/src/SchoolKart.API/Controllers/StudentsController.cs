using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Application.Students;
using SchoolKart.Domain.Entities;
using SchoolKart.Domain.Enums;
using SchoolKart.Infrastructure.Persistence;
using BCrypt.Net;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/students")]
[Authorize]
public class StudentsController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] StudentQueryParams query, CancellationToken ct)
    {
        var academicYearId = query.AcademicYearId ??
            (await db.AcademicYears.FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct))?.Id;

        var q = db.StudentEnrollments
            .Include(e => e.Student)
            .Include(e => e.Class)
            .Include(e => e.Section)
            .Where(e => e.TenantId == tenant.TenantId);

        if (academicYearId.HasValue)
            q = q.Where(e => e.AcademicYearId == academicYearId.Value);

        if (query.ClassId.HasValue)
            q = q.Where(e => e.ClassId == query.ClassId.Value);

        if (query.SectionId.HasValue)
            q = q.Where(e => e.SectionId == query.SectionId.Value);

        if (!string.IsNullOrEmpty(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(e =>
                e.Student!.FirstName.ToLower().Contains(search) ||
                (e.Student.LastName != null && e.Student.LastName.ToLower().Contains(search)) ||
                e.Student.AdmissionNumber.ToLower().Contains(search));
        }

        if (!string.IsNullOrEmpty(query.Status) && Enum.TryParse<AdmissionStatus>(query.Status, true, out var status))
            q = q.Where(e => e.Student!.Status == status);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderBy(e => e.Section!.Name)
            .ThenBy(e => e.RollNumber)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(e => new StudentListDto(
                e.Student!.Id,
                e.Student.AdmissionNumber,
                e.Student.FirstName + " " + e.Student.LastName,
                e.Student.Gender.ToString(),
                e.Student.DateOfBirth,
                e.Class!.Name,
                e.Section!.Name,
                e.RollNumber,
                e.Student.Status.ToString(),
                e.Student.ProfilePicture
            ))
            .ToListAsync(ct);

        return Ok(new PagedResult<StudentListDto>
        {
            Items = items,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var student = await db.Students
            .Include(s => s.Guardians).ThenInclude(sg => sg.Guardian)
            .Include(s => s.Documents)
            .Include(s => s.Enrollments).ThenInclude(e => e.AcademicYear)
            .Include(s => s.Enrollments).ThenInclude(e => e.Class)
            .Include(s => s.Enrollments).ThenInclude(e => e.Section)
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenant.TenantId, ct);

        if (student is null) return NotFound();

        var currentEnrollment = student.Enrollments
            .OrderByDescending(e => e.EnrolledAt)
            .FirstOrDefault();

        var dto = new StudentDetailDto(
            student.Id,
            student.AdmissionNumber,
            student.FirstName,
            student.LastName,
            student.FullName,
            student.Gender.ToString(),
            student.DateOfBirth,
            student.BloodGroup?.ToString(),
            student.Religion,
            student.Caste,
            student.Category,
            student.Nationality,
            student.MotherTongue,
            student.AadharNumber,
            student.ProfilePicture,
            student.Address,
            student.City,
            student.State,
            student.Pincode,
            student.Status.ToString(),
            student.AdmissionDate,
            student.LeavingDate,
            student.PreviousSchool,
            student.PreviousClass,
            student.Remarks,
            currentEnrollment is null ? null : new StudentEnrollmentDto(
                currentEnrollment.Id,
                currentEnrollment.AcademicYear!.Name,
                currentEnrollment.Class!.Name,
                currentEnrollment.Section!.Name,
                currentEnrollment.RollNumber,
                currentEnrollment.EnrolledAt
            ),
            student.Guardians.Select(sg => new GuardianDto(
                sg.Guardian!.Id,
                sg.Guardian.FullName,
                sg.Guardian.Phone,
                sg.Guardian.Email,
                sg.Guardian.Occupation,
                sg.Relation.ToString(),
                sg.IsPrimary,
                sg.IsPickup
            )),
            student.Documents.Select(d => new DocumentDto(
                d.Id, d.Type.ToString(), d.Name, d.FileUrl, d.Verified, d.UploadedAt
            ))
        );

        return Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStudentRequest request, CancellationToken ct)
    {
        // Generate admission number
        var lastStudent = await db.Students
            .Where(s => s.TenantId == tenant.TenantId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(ct);

        var year = DateTime.UtcNow.Year.ToString()[2..];
        var seq = (lastStudent is null ? 1 : int.Parse(lastStudent.AdmissionNumber.Split('/').Last()) + 1);
        var admissionNumber = $"ADM/{year}/{seq:D4}";

        var student = new Student
        {
            TenantId = tenant.TenantId,
            AdmissionNumber = admissionNumber,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Gender = request.Gender,
            DateOfBirth = request.DateOfBirth,
            BloodGroup = request.BloodGroup,
            Religion = request.Religion,
            Caste = request.Caste,
            Category = request.Category,
            Nationality = request.Nationality ?? "Indian",
            MotherTongue = request.MotherTongue,
            AadharNumber = request.AadharNumber,
            Address = request.Address,
            City = request.City,
            State = request.State,
            Pincode = request.Pincode,
            AdmissionDate = request.AdmissionDate,
            PreviousSchool = request.PreviousSchool,
            PreviousClass = request.PreviousClass,
            TcNumber = request.TcNumber,
            Remarks = request.Remarks,
            Status = AdmissionStatus.Active
        };

        db.Students.Add(student);

        // Create enrollment
        var enrollment = new StudentEnrollment
        {
            TenantId = tenant.TenantId,
            StudentId = student.Id,
            AcademicYearId = request.AcademicYearId,
            ClassId = request.ClassId,
            SectionId = request.SectionId
        };
        db.StudentEnrollments.Add(enrollment);

        // Create guardian
        var guardian = new Guardian
        {
            TenantId = tenant.TenantId,
            FirstName = request.PrimaryGuardian.FirstName,
            LastName = request.PrimaryGuardian.LastName,
            Phone = request.PrimaryGuardian.Phone,
            Email = request.PrimaryGuardian.Email,
            Occupation = request.PrimaryGuardian.Occupation,
            AnnualIncome = request.PrimaryGuardian.AnnualIncome
        };
        db.Guardians.Add(guardian);

        var studentGuardian = new StudentGuardian
        {
            StudentId = student.Id,
            GuardianId = guardian.Id,
            Relation = request.PrimaryGuardian.Relation,
            IsPrimary = true,
            IsPickup = request.PrimaryGuardian.IsPickup
        };
        db.StudentGuardians.Add(studentGuardian);

        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = student.Id }, new { id = student.Id, admissionNumber });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStudentRequest request, CancellationToken ct)
    {
        var student = await db.Students
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenant.TenantId, ct);

        if (student is null) return NotFound();

        if (request.FirstName is not null) student.FirstName = request.FirstName;
        if (request.LastName is not null) student.LastName = request.LastName;
        if (request.BloodGroup.HasValue) student.BloodGroup = request.BloodGroup;
        if (request.Religion is not null) student.Religion = request.Religion;
        if (request.Caste is not null) student.Caste = request.Caste;
        if (request.Category is not null) student.Category = request.Category;
        if (request.AadharNumber is not null) student.AadharNumber = request.AadharNumber;
        if (request.Address is not null) student.Address = request.Address;
        if (request.City is not null) student.City = request.City;
        if (request.State is not null) student.State = request.State;
        if (request.Pincode is not null) student.Pincode = request.Pincode;
        if (request.Remarks is not null) student.Remarks = request.Remarks;

        student.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("promote")]
    public async Task<IActionResult> Promote([FromBody] PromoteStudentsRequest request, CancellationToken ct)
    {
        var promotions = new List<StudentEnrollment>();

        foreach (var item in request.Students)
        {
            var currentEnrollment = await db.StudentEnrollments
                .FirstOrDefaultAsync(e => e.StudentId == item.StudentId && e.AcademicYearId == request.FromAcademicYearId, ct);

            if (currentEnrollment is null) continue;

            currentEnrollment.IsPromoted = item.Status == PromotionStatus.Promoted;
            currentEnrollment.PromotedToClassId = item.ToClassId;

            if (item.Status == PromotionStatus.Promoted && item.ToClassId.HasValue && item.ToSectionId.HasValue)
            {
                promotions.Add(new StudentEnrollment
                {
                    TenantId = tenant.TenantId,
                    StudentId = item.StudentId,
                    AcademicYearId = request.ToAcademicYearId,
                    ClassId = item.ToClassId.Value,
                    SectionId = item.ToSectionId.Value
                });
            }
        }

        db.StudentEnrollments.AddRange(promotions);
        await db.SaveChangesAsync(ct);
        return Ok(new { promoted = promotions.Count });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var student = await db.Students
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenant.TenantId, ct);

        if (student is null) return NotFound();

        student.Status = AdmissionStatus.Withdrawn;
        student.LeavingDate = DateOnly.FromDateTime(DateTime.UtcNow);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
