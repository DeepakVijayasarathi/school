using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/school")]
[Authorize]
public class SchoolSetupController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ── School Info ─────────────────────────────────────────────

    [HttpGet("info")]
    public async Task<IActionResult> GetSchoolInfo(CancellationToken ct)
    {
        var info = await db.Tenants
            .AsNoTracking()
            .IgnoreQueryFilters()   // middleware already verified tenant is active
            .Where(t => t.Id == tenant.TenantId)
            .Select(t => new {
                t.Id, t.Name, t.Phone, t.Email, t.Website,
                t.Address, t.City, t.State, t.Pincode, t.Country,
                t.LogoUrl, t.Timezone, t.Locale, t.Currency,
                t.IsActive
            })
            .FirstOrDefaultAsync(ct);
        return info is null ? NotFound() : Ok(info);
    }

    [HttpPut("info")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> UpdateSchoolInfo([FromBody] UpdateSchoolInfoRequest req, CancellationToken ct)
    {
        var tenant_ = await db.Tenants.FirstOrDefaultAsync(t => t.Id == tenant.TenantId, ct);
        if (tenant_ is null) return NotFound();

        if (req.Name is not null) tenant_.Name = req.Name;
        if (req.Phone is not null) tenant_.Phone = req.Phone;
        if (req.Email is not null) tenant_.Email = req.Email;
        if (req.Website is not null) tenant_.Website = req.Website;
        if (req.Address is not null) tenant_.Address = req.Address;
        if (req.City is not null) tenant_.City = req.City;
        if (req.State is not null) tenant_.State = req.State;
        if (req.Pincode is not null) tenant_.Pincode = req.Pincode;

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    // ── Academic Years ──────────────────────────────────────────

    [HttpGet("academic-years")]
    public async Task<IActionResult> GetAcademicYears(CancellationToken ct)
    {
        var years = await db.AcademicYears
            .AsNoTracking()
            .Where(a => a.TenantId == tenant.TenantId)
            .OrderByDescending(a => a.StartDate)
            .Select(a => new { a.Id, a.Name, a.StartDate, a.EndDate, a.IsCurrent, a.IsLocked })
            .ToListAsync(ct);
        return Ok(years);
    }

    [HttpPost("academic-years")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> CreateAcademicYear([FromBody] CreateAcademicYearRequest req, CancellationToken ct)
    {
        if (req.IsCurrent)
        {
            await db.AcademicYears
                .Where(a => a.TenantId == tenant.TenantId && a.IsCurrent)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsCurrent, false), ct);
        }

        var year = new AcademicYear
        {
            TenantId = tenant.TenantId,
            Name = req.Name,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            IsCurrent = req.IsCurrent
        };
        db.AcademicYears.Add(year);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetAcademicYears), new { id = year.Id }, year);
    }

    [HttpPut("academic-years/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> UpdateAcademicYear(Guid id, [FromBody] UpdateAcademicYearRequest req, CancellationToken ct)
    {
        var year = await db.AcademicYears.FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenant.TenantId, ct);
        if (year is null) return NotFound();
        if (req.Name is not null) year.Name = req.Name;
        if (req.StartDate.HasValue) year.StartDate = req.StartDate.Value;
        if (req.EndDate.HasValue) year.EndDate = req.EndDate.Value;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("academic-years/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> DeleteAcademicYear(Guid id, CancellationToken ct)
    {
        var year = await db.AcademicYears.FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenant.TenantId, ct);
        if (year is null) return NotFound();
        db.AcademicYears.Remove(year);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPatch("academic-years/{id:guid}/set-current")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> SetCurrentYear(Guid id, CancellationToken ct)
    {
        await db.AcademicYears
            .Where(a => a.TenantId == tenant.TenantId && a.IsCurrent)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsCurrent, false), ct);

        var updated = await db.AcademicYears
            .Where(a => a.Id == id && a.TenantId == tenant.TenantId)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsCurrent, true), ct);

        return updated > 0 ? Ok() : NotFound();
    }

    // ── Campuses ────────────────────────────────────────────────

    [HttpGet("campuses")]
    public async Task<IActionResult> GetCampuses(CancellationToken ct)
    {
        var campuses = await db.Campuses
            .AsNoTracking()
            .Where(c => c.TenantId == tenant.TenantId && c.IsActive)
            .Select(c => new { c.Id, c.Name, c.Code, c.City, c.Phone, c.Email, c.IsActive })
            .ToListAsync(ct);
        return Ok(campuses);
    }

    [HttpPost("campuses")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> CreateCampus([FromBody] CreateCampusRequest req, CancellationToken ct)
    {
        var campus = new Campus
        {
            TenantId = tenant.TenantId,
            Name = req.Name,
            Code = req.Code,
            Address = req.Address,
            City = req.City,
            State = req.State,
            Pincode = req.Pincode,
            Phone = req.Phone,
            Email = req.Email
        };
        db.Campuses.Add(campus);
        await db.SaveChangesAsync(ct);
        return Created($"/api/school/campuses/{campus.Id}", new { campus.Id });
    }

    [HttpPut("campuses/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> UpdateCampus(Guid id, [FromBody] CreateCampusRequest req, CancellationToken ct)
    {
        var campus = await db.Campuses.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenant.TenantId, ct);
        if (campus is null) return NotFound();
        campus.Name = req.Name;
        campus.Code = req.Code;
        campus.Address = req.Address;
        campus.City = req.City;
        campus.Phone = req.Phone;
        campus.Email = req.Email;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("campuses/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> DeleteCampus(Guid id, CancellationToken ct)
    {
        var campus = await db.Campuses.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenant.TenantId, ct);
        if (campus is null) return NotFound();
        campus.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Classes ─────────────────────────────────────────────────

    [HttpGet("classes")]
    public async Task<IActionResult> GetClasses([FromQuery] Guid? campusId, CancellationToken ct)
    {
        var q = db.Classes
            .AsNoTracking()
            .Where(c => c.TenantId == tenant.TenantId && c.IsActive);

        if (campusId.HasValue) q = q.Where(c => c.CampusId == campusId);

        var classes = await q
            .OrderBy(c => c.NumericLevel)
            .Select(c => new { c.Id, c.Name, numericLevel = c.NumericLevel, c.CampusId })
            .ToListAsync(ct);

        return Ok(classes);
    }

    [HttpPost("classes")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassRequest req, CancellationToken ct)
    {
        var cls = new Class
        {
            TenantId = tenant.TenantId,
            CampusId = req.CampusId,
            Name = req.Name,
            NumericLevel = req.NumericLevel
        };
        db.Classes.Add(cls);
        await db.SaveChangesAsync(ct);
        return Created($"/api/school/classes/{cls.Id}", new { cls.Id });
    }

    [HttpPut("classes/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> UpdateClass(Guid id, [FromBody] CreateClassRequest req, CancellationToken ct)
    {
        var cls = await db.Classes.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenant.TenantId, ct);
        if (cls is null) return NotFound();
        cls.Name = req.Name;
        cls.NumericLevel = req.NumericLevel;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("classes/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> DeleteClass(Guid id, CancellationToken ct)
    {
        var cls = await db.Classes.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenant.TenantId, ct);
        if (cls is null) return NotFound();
        cls.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Sections ────────────────────────────────────────────────

    [HttpGet("sections")]
    public async Task<IActionResult> GetSections([FromQuery] Guid? classId, [FromQuery] Guid? academicYearId, CancellationToken ct)
    {
        var yearId = academicYearId ??
            (await db.AcademicYears.FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct))?.Id;

        var q = db.Sections
            .AsNoTracking()
            .Include(s => s.ClassTeacher)
            .Where(s => s.TenantId == tenant.TenantId && s.IsActive);

        if (classId.HasValue) q = q.Where(s => s.ClassId == classId.Value);
        if (yearId.HasValue) q = q.Where(s => s.AcademicYearId == yearId.Value);

        var sections = await q
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.ClassId,
                ClassName = s.Class != null ? s.Class.Name : null,
                s.RoomNumber,
                capacity = s.MaxStrength,
                ClassTeacher = s.ClassTeacher == null ? null : new { s.ClassTeacher.Id, s.ClassTeacher.FirstName, s.ClassTeacher.LastName }
            })
            .ToListAsync(ct);

        return Ok(sections);
    }

    [HttpPost("sections")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> CreateSection([FromBody] CreateSectionRequest req, CancellationToken ct)
    {
        var section = new Section
        {
            TenantId = tenant.TenantId,
            AcademicYearId = req.AcademicYearId,
            ClassId = req.ClassId,
            Name = req.Name,
            ClassTeacherId = req.ClassTeacherId,
            RoomNumber = req.RoomNumber,
            MaxStrength = req.MaxStrength
        };
        db.Sections.Add(section);
        await db.SaveChangesAsync(ct);
        return Created($"/api/school/sections/{section.Id}", new { section.Id });
    }

    [HttpPut("sections/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> UpdateSection(Guid id, [FromBody] UpdateSectionRequest req, CancellationToken ct)
    {
        var section = await db.Sections.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenant.TenantId, ct);
        if (section is null) return NotFound();
        if (req.Name is not null) section.Name = req.Name;
        if (req.MaxStrength.HasValue) section.MaxStrength = req.MaxStrength.Value;
        if (req.RoomNumber is not null) section.RoomNumber = req.RoomNumber;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("sections/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> DeleteSection(Guid id, CancellationToken ct)
    {
        var section = await db.Sections.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenant.TenantId, ct);
        if (section is null) return NotFound();
        section.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Subjects ────────────────────────────────────────────────

    [HttpGet("subjects")]
    public async Task<IActionResult> GetSubjects(CancellationToken ct)
    {
        var subjects = await db.Subjects
            .AsNoTracking()
            .Where(s => s.TenantId == tenant.TenantId && s.IsActive)
            .OrderBy(s => s.Name)
            .Select(s => new { s.Id, s.Name, s.Code, type = s.Type.ToString().ToLower() })
            .ToListAsync(ct);
        return Ok(subjects);
    }

    [HttpPost("subjects")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> CreateSubject([FromBody] CreateSubjectRequest req, CancellationToken ct)
    {
        var subject = new Subject
        {
            TenantId = tenant.TenantId,
            Name = req.Name,
            Code = req.Code,
        };
        db.Subjects.Add(subject);
        await db.SaveChangesAsync(ct);
        return Created($"/api/school/subjects/{subject.Id}", new { subject.Id });
    }

    [HttpPut("subjects/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> UpdateSubject(Guid id, [FromBody] CreateSubjectRequest req, CancellationToken ct)
    {
        var subject = await db.Subjects.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenant.TenantId, ct);
        if (subject is null) return NotFound();
        subject.Name = req.Name;
        subject.Code = req.Code;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("subjects/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> DeleteSubject(Guid id, CancellationToken ct)
    {
        var subject = await db.Subjects.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenant.TenantId, ct);
        if (subject is null) return NotFound();
        subject.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Departments ─────────────────────────────────────────────

    [HttpGet("departments")]
    public async Task<IActionResult> GetDepartments(CancellationToken ct)
    {
        var depts = await db.Set<Department>()
            .Include(d => d.Head)
            .Where(d => d.TenantId == tenant.TenantId && d.IsActive)
            .Select(d => new { d.Id, d.Name, d.Code, headName = d.Head == null ? null : d.Head.FirstName + " " + d.Head.LastName })
            .ToListAsync(ct);
        return Ok(depts);
    }

    [HttpPost("departments")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> CreateDepartment([FromBody] CreateDeptRequest req, CancellationToken ct)
    {
        var dept = new Department { TenantId = tenant.TenantId, Name = req.Name, Code = req.Code };
        db.Set<Department>().Add(dept);
        await db.SaveChangesAsync(ct);
        return Created($"/api/school/departments/{dept.Id}", new { dept.Id });
    }

    [HttpPut("departments/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> UpdateDepartment(Guid id, [FromBody] CreateDeptRequest req, CancellationToken ct)
    {
        var dept = await db.Set<Department>().FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenant.TenantId, ct);
        if (dept is null) return NotFound();
        dept.Name = req.Name;
        dept.Code = req.Code;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("departments/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> DeleteDepartment(Guid id, CancellationToken ct)
    {
        var dept = await db.Set<Department>().FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenant.TenantId, ct);
        if (dept is null) return NotFound();
        dept.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Fee Types (alias for Fee Categories) ────────────────────

    [HttpGet("fee-types")]
    public async Task<IActionResult> GetFeeTypes(CancellationToken ct)
    {
        var types = await db.Set<FeeCategory>()
            .Where(c => c.TenantId == tenant.TenantId && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new { c.Id, c.Name, c.Code, amount = 0m, frequency = "annual" })
            .ToListAsync(ct);
        return Ok(types);
    }

    [HttpPost("fee-types")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> CreateFeeType([FromBody] CreateFeeTypeRequest req, CancellationToken ct)
    {
        var cat = new FeeCategory { TenantId = tenant.TenantId, Name = req.Name, Code = req.Code };
        db.Set<FeeCategory>().Add(cat);
        await db.SaveChangesAsync(ct);
        return Created($"/api/school/fee-types/{cat.Id}", new { cat.Id });
    }

    [HttpPut("fee-types/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> UpdateFeeType(Guid id, [FromBody] CreateFeeTypeRequest req, CancellationToken ct)
    {
        var cat = await db.Set<FeeCategory>().FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenant.TenantId, ct);
        if (cat is null) return NotFound();
        cat.Name = req.Name;
        cat.Code = req.Code;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("fee-types/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> DeleteFeeType(Guid id, CancellationToken ct)
    {
        var cat = await db.Set<FeeCategory>().FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenant.TenantId, ct);
        if (cat is null) return NotFound();
        cat.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Roles ───────────────────────────────────────────────────

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles(CancellationToken ct)
    {
        var roles = await db.Roles
            .Where(r => r.TenantId == tenant.TenantId || r.IsSystem)
            .Select(r => new { r.Id, r.Name, r.Code, r.Description, r.Permissions, r.IsSystem })
            .ToListAsync(ct);
        return Ok(roles);
    }
}

public record UpdateSchoolInfoRequest(string? Name, string? Phone, string? Email, string? Website, string? Address, string? City, string? State, string? Pincode);
public record CreateAcademicYearRequest(string Name, DateOnly StartDate, DateOnly EndDate, bool IsCurrent = false);
public record UpdateAcademicYearRequest(string? Name, DateOnly? StartDate, DateOnly? EndDate);
public record CreateCampusRequest(string Name, string? Code, string? Address, string? City, string? State, string? Pincode, string? Phone, string? Email);
public record CreateClassRequest(string Name, int? NumericLevel, Guid? CampusId);
public record CreateSectionRequest(Guid AcademicYearId, Guid ClassId, string Name, Guid? ClassTeacherId, string? RoomNumber, int MaxStrength = 40);
public record UpdateSectionRequest(string? Name, int? MaxStrength, string? RoomNumber);
public record CreateSubjectRequest(string Name, string? Code);
public record CreateDeptRequest(string Name, string? Code);
public record CreateFeeTypeRequest(string Name, string? Code);
