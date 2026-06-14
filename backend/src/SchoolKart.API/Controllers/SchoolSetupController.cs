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
    // ── Academic Years ──────────────────────────────────────────

    [HttpGet("academic-years")]
    public async Task<IActionResult> GetAcademicYears(CancellationToken ct)
    {
        var years = await db.AcademicYears
            .Where(a => a.TenantId == tenant.TenantId)
            .OrderByDescending(a => a.StartDate)
            .Select(a => new { a.Id, a.Name, a.StartDate, a.EndDate, a.IsCurrent, a.IsLocked })
            .ToListAsync(ct);
        return Ok(years);
    }

    [HttpPost("academic-years")]
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

    [HttpPatch("academic-years/{id:guid}/set-current")]
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
            .Where(c => c.TenantId == tenant.TenantId && c.IsActive)
            .Select(c => new { c.Id, c.Name, c.Code, c.City, c.Phone, c.Email, c.IsActive })
            .ToListAsync(ct);
        return Ok(campuses);
    }

    [HttpPost("campuses")]
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

    // ── Classes ─────────────────────────────────────────────────

    [HttpGet("classes")]
    public async Task<IActionResult> GetClasses([FromQuery] Guid? campusId, CancellationToken ct)
    {
        var q = db.Classes
            .Where(c => c.TenantId == tenant.TenantId && c.IsActive);

        if (campusId.HasValue) q = q.Where(c => c.CampusId == campusId);

        var classes = await q
            .OrderBy(c => c.NumericLevel)
            .Select(c => new { c.Id, c.Name, c.NumericLevel, c.CampusId })
            .ToListAsync(ct);

        return Ok(classes);
    }

    [HttpPost("classes")]
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

    // ── Sections ────────────────────────────────────────────────

    [HttpGet("sections")]
    public async Task<IActionResult> GetSections([FromQuery] Guid classId, [FromQuery] Guid? academicYearId, CancellationToken ct)
    {
        var yearId = academicYearId ??
            (await db.AcademicYears.FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct))?.Id;

        var sections = await db.Sections
            .Include(s => s.ClassTeacher)
            .Where(s => s.TenantId == tenant.TenantId && s.ClassId == classId &&
                        (!yearId.HasValue || s.AcademicYearId == yearId.Value) && s.IsActive)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.RoomNumber,
                s.MaxStrength,
                ClassTeacher = s.ClassTeacher == null ? null : new { s.ClassTeacher.Id, s.ClassTeacher.FirstName, s.ClassTeacher.LastName }
            })
            .ToListAsync(ct);

        return Ok(sections);
    }

    [HttpPost("sections")]
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
}

public record CreateAcademicYearRequest(string Name, DateOnly StartDate, DateOnly EndDate, bool IsCurrent = false);
public record CreateCampusRequest(string Name, string? Code, string? Address, string? City, string? State, string? Pincode, string? Phone, string? Email);
public record CreateClassRequest(string Name, int? NumericLevel, Guid? CampusId);
public record CreateSectionRequest(Guid AcademicYearId, Guid ClassId, string Name, Guid? ClassTeacherId, string? RoomNumber, int MaxStrength = 40);
