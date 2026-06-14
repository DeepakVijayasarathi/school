using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Domain.Enums;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/fees")]
[Authorize]
public class FeesController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ── Fee Categories ──────────────────────────────────────────

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var cats = await db.Set<FeeCategory>()
            .Where(c => c.TenantId == tenant.TenantId && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new { c.Id, c.Name, c.Code, c.Description })
            .ToListAsync(ct);
        return Ok(cats);
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateFeeCategoryRequest req, CancellationToken ct)
    {
        var cat = new FeeCategory
        {
            TenantId = tenant.TenantId,
            Name = req.Name,
            Code = req.Code,
            Description = req.Description
        };
        db.Set<FeeCategory>().Add(cat);
        await db.SaveChangesAsync(ct);
        return Created($"/api/fees/categories/{cat.Id}", new { cat.Id });
    }

    // ── Fee Structures ──────────────────────────────────────────

    [HttpGet("structures")]
    public async Task<IActionResult> GetStructures([FromQuery] Guid? academicYearId, [FromQuery] Guid? classId, CancellationToken ct)
    {
        var yearId = academicYearId ??
            (await db.AcademicYears.FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct))?.Id;

        var q = db.Set<FeeStructure>()
            .Include(s => s.Category)
            .Where(s => s.TenantId == tenant.TenantId && s.IsActive);

        if (yearId.HasValue) q = q.Where(s => s.AcademicYearId == yearId.Value);
        if (classId.HasValue) q = q.Where(s => s.ClassId == classId || s.ClassId == null);

        var structures = await q
            .Select(s => new
            {
                s.Id,
                s.Name,
                Category = s.Category!.Name,
                s.Amount,
                s.Frequency,
                s.DueDay,
                s.IsOptional
            })
            .ToListAsync(ct);

        return Ok(structures);
    }

    [HttpPost("structures")]
    public async Task<IActionResult> CreateStructure([FromBody] CreateFeeStructureRequest req, CancellationToken ct)
    {
        var structure = new FeeStructure
        {
            TenantId = tenant.TenantId,
            AcademicYearId = req.AcademicYearId,
            ClassId = req.ClassId,
            CategoryId = req.CategoryId,
            Name = req.Name,
            Amount = req.Amount,
            Frequency = req.Frequency,
            DueDay = req.DueDay,
            IsOptional = req.IsOptional
        };
        db.Set<FeeStructure>().Add(structure);
        await db.SaveChangesAsync(ct);
        return Created($"/api/fees/structures/{structure.Id}", new { structure.Id });
    }

    // ── Student Fees ────────────────────────────────────────────

    [HttpGet("student/{studentId:guid}")]
    public async Task<IActionResult> GetStudentFees(Guid studentId, [FromQuery] Guid? academicYearId, CancellationToken ct)
    {
        var yearId = academicYearId ??
            (await db.AcademicYears.FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct))?.Id;

        var fees = await db.Set<StudentFee>()
            .Include(f => f.FeeStructure!.Category)
            .Where(f => f.StudentId == studentId && f.TenantId == tenant.TenantId &&
                        (!yearId.HasValue || f.AcademicYearId == yearId.Value))
            .Select(f => new
            {
                f.Id,
                f.FeeStructure!.Name,
                Category = f.FeeStructure.Category!.Name,
                f.Amount,
                f.DiscountAmount,
                f.FinalAmount,
                f.PaidAmount,
                Pending = f.FinalAmount - f.PaidAmount,
                f.DueDate,
                f.Status
            })
            .ToListAsync(ct);

        var summary = new
        {
            TotalAmount = fees.Sum(f => f.FinalAmount),
            PaidAmount = fees.Sum(f => f.PaidAmount),
            PendingAmount = fees.Sum(f => f.Pending)
        };

        return Ok(new { summary, fees });
    }

    [HttpPost("assign/{studentId:guid}")]
    public async Task<IActionResult> AssignFees(Guid studentId, [FromBody] AssignFeesRequest req, CancellationToken ct)
    {
        var enrollment = await db.StudentEnrollments
            .FirstOrDefaultAsync(e => e.StudentId == studentId && e.AcademicYearId == req.AcademicYearId
                && e.TenantId == tenant.TenantId, ct);

        if (enrollment is null) return BadRequest("Student not enrolled in this academic year");

        var structures = await db.Set<FeeStructure>()
            .Where(s => s.TenantId == tenant.TenantId && s.AcademicYearId == req.AcademicYearId
                && s.IsActive && (s.ClassId == enrollment.ClassId || s.ClassId == null))
            .ToListAsync(ct);

        var existing = await db.Set<StudentFee>()
            .Where(f => f.StudentId == studentId && f.AcademicYearId == req.AcademicYearId)
            .Select(f => f.FeeStructureId)
            .ToListAsync(ct);

        var toAdd = structures.Where(s => !existing.Contains(s.Id)).ToList();

        foreach (var structure in toAdd)
        {
            db.Set<StudentFee>().Add(new StudentFee
            {
                TenantId = tenant.TenantId,
                StudentId = studentId,
                AcademicYearId = req.AcademicYearId,
                FeeStructureId = structure.Id,
                Amount = structure.Amount,
                DiscountAmount = 0,
                FinalAmount = structure.Amount,
                Status = PaymentStatus.Pending
            });
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { assigned = toAdd.Count });
    }

    // ── Payments ────────────────────────────────────────────────

    [HttpPost("pay")]
    public async Task<IActionResult> CollectPayment([FromBody] CollectPaymentRequest req, CancellationToken ct)
    {
        if (req.Amount <= 0)
            return BadRequest(new { error = "Payment amount must be greater than zero" });

        var fee = await db.Set<StudentFee>()
            .FirstOrDefaultAsync(f => f.Id == req.StudentFeeId && f.TenantId == tenant.TenantId, ct);

        if (fee is null) return NotFound();

        var remaining = fee.FinalAmount - fee.PaidAmount;
        if (req.Amount > remaining)
            return BadRequest($"Amount exceeds pending balance of {remaining}");

        // Generate receipt number
        var lastReceipt = await db.Set<FeePayment>()
            .Where(p => p.TenantId == tenant.TenantId)
            .OrderByDescending(p => p.PaidAt)
            .FirstOrDefaultAsync(ct);

        var year = DateTime.UtcNow.Year.ToString()[2..];
        var lastSeq = lastReceipt is not null && int.TryParse(lastReceipt.ReceiptNumber.Split('/').LastOrDefault(), out var parsed) ? parsed : 0;
        var seq = lastSeq + 1;
        var receiptNumber = $"RCP/{year}/{seq:D6}";

        var payment = new FeePayment
        {
            TenantId = tenant.TenantId,
            StudentFeeId = fee.Id,
            StudentId = fee.StudentId,
            ReceiptNumber = receiptNumber,
            Amount = req.Amount,
            Method = req.Method,
            TransactionId = req.TransactionId,
            ChequeNumber = req.ChequeNumber,
            ChequeDate = req.ChequeDate,
            BankName = req.BankName,
            Notes = req.Notes,
            CollectedBy = tenant.UserId
        };

        fee.PaidAmount += req.Amount;
        fee.Status = fee.PaidAmount >= fee.FinalAmount ? PaymentStatus.Paid : PaymentStatus.Partial;

        db.Set<FeePayment>().Add(payment);
        await db.SaveChangesAsync(ct);

        return Ok(new { receiptNumber, paymentId = payment.Id });
    }

    [HttpGet("receipts/{studentId:guid}")]
    public async Task<IActionResult> GetReceipts(Guid studentId, CancellationToken ct)
    {
        var receipts = await db.Set<FeePayment>()
            .Where(p => p.StudentId == studentId && p.TenantId == tenant.TenantId)
            .OrderByDescending(p => p.PaidAt)
            .Select(p => new { p.Id, p.ReceiptNumber, p.Amount, p.Method, p.PaidAt, p.Notes })
            .ToListAsync(ct);

        return Ok(receipts);
    }

    [HttpGet("dues")]
    public async Task<IActionResult> GetFeesDue([FromQuery] Guid? classId, [FromQuery] int daysOverdue = 0, CancellationToken ct = default)
    {
        var q = db.Set<StudentFee>()
            .Include(f => f.Student)
            .Where(f => f.TenantId == tenant.TenantId && f.Status != PaymentStatus.Paid && f.Status != PaymentStatus.Waived);

        if (daysOverdue > 0)
            q = q.Where(f => f.DueDate < DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-daysOverdue)));

        var dues = await q
            .Select(f => new
            {
                f.Student!.AdmissionNumber,
                StudentName = f.Student.FirstName + " " + f.Student.LastName,
                f.FinalAmount,
                f.PaidAmount,
                Pending = f.FinalAmount - f.PaidAmount,
                f.DueDate,
                f.Status
            })
            .ToListAsync(ct);

        return Ok(dues);
    }
}

// Request records
public record CreateFeeCategoryRequest(string Name, string? Code, string? Description);
public record CreateFeeStructureRequest(
    Guid AcademicYearId, Guid? ClassId, Guid CategoryId, string Name,
    decimal Amount, FeeFrequency Frequency, int? DueDay, bool IsOptional = false);
public record AssignFeesRequest(Guid AcademicYearId);
public record CollectPaymentRequest(
    Guid StudentFeeId, decimal Amount, PaymentMethod Method,
    string? TransactionId, string? ChequeNumber, DateOnly? ChequeDate, string? BankName, string? Notes);
