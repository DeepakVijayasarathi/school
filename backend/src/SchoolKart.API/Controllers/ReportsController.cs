using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ── Overview / Summary ────────────────────────────────────────────────
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var tid = tenant.TenantId;

        var totalStudents = await db.Students.CountAsync(s => s.TenantId == tid);
        var totalEmployees = await db.Set<Employee>().CountAsync(e => e.TenantId == tid);

        // Attendance today
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayAttendance = await db.Set<StudentAttendance>()
            .Where(a => a.TenantId == tid && a.Date == today)
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
            .ToListAsync();

        // Fee collection this month
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var feeThisMonth = await db.Set<FeePayment>()
            .Where(p => p.TenantId == tid && p.PaidAt >= monthStart)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        var totalDues = await db.Set<StudentFee>()
            .Where(f => f.TenantId == tid && f.Status.ToString() != "Paid")
            .SumAsync(f => (decimal?)(f.Amount - f.PaidAmount)) ?? 0;

        // Gender distribution
        var genderDist = await db.Students
            .Where(s => s.TenantId == tid)
            .GroupBy(s => s.Gender)
            .Select(g => new { Gender = g.Key.ToString(), Count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            totalStudents,
            totalEmployees,
            feeCollectedThisMonth = feeThisMonth,
            totalOutstanding = totalDues,
            todayAttendance,
            genderDistribution = genderDist,
        });
    }

    // ── Student Report ─────────────────────────────────────────────────────
    [HttpGet("students")]
    public async Task<IActionResult> StudentReport([FromQuery] Guid? classId, [FromQuery] Guid? academicYearId, [FromQuery] string? status)
    {
        var q = db.Students.Where(s => s.TenantId == tenant.TenantId).AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(s => s.Status.ToString() == status);

        // Enrollment breakdown by class
        var byClass = await db.Set<StudentEnrollment>()
            .Where(e => e.TenantId == tenant.TenantId && (!academicYearId.HasValue || e.AcademicYearId == academicYearId))
            .GroupBy(e => new { e.ClassId })
            .Select(g => new { g.Key.ClassId, Count = g.Count() })
            .ToListAsync();

        // Monthly admissions (last 12 months)
        var yearAgo = DateTime.UtcNow.AddMonths(-12);
        var monthlyAdmissions = await q
            .Where(s => s.CreatedAt >= yearAgo)
            .GroupBy(s => new { s.CreatedAt.Year, s.CreatedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync();

        // Status distribution
        var byStatus = await q
            .GroupBy(s => s.Status)
            .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
            .ToListAsync();

        return Ok(new { byClass, monthlyAdmissions, byStatus, total = await q.CountAsync() });
    }

    // ── Attendance Report ─────────────────────────────────────────────────
    [HttpGet("attendance")]
    public async Task<IActionResult> AttendanceReport(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] Guid? sectionId,
        [FromQuery] string type = "student")
    {
        var start = from ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var end = to ?? DateOnly.FromDateTime(DateTime.UtcNow);

        if (type == "staff")
        {
            var staffData = await db.Set<StaffAttendance>()
                .Where(a => a.TenantId == tenant.TenantId && a.Date >= start && a.Date <= end)
                .GroupBy(a => new { a.Date, Status = a.Status.ToString() })
                .Select(g => new { g.Key.Date, g.Key.Status, Count = g.Count() })
                .OrderBy(x => x.Date)
                .ToListAsync();
            return Ok(staffData);
        }

        var q = db.Set<StudentAttendance>()
            .Where(a => a.TenantId == tenant.TenantId && a.Date >= start && a.Date <= end);
        if (sectionId.HasValue) q = q.Where(a => a.SectionId == sectionId.Value);

        // Daily summary
        var daily = await q
            .GroupBy(a => new { a.Date, Status = a.Status.ToString() })
            .Select(g => new { g.Key.Date, g.Key.Status, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        // Overall stats
        var total = await q.CountAsync();
        var presentCount = await q.CountAsync(a => a.Status.ToString() == "Present");
        var absentCount = await q.CountAsync(a => a.Status.ToString() == "Absent");

        // Student-wise summary (top absentees)
        var topAbsentees = await q
            .Where(a => a.Status.ToString() == "Absent")
            .GroupBy(a => a.StudentId)
            .Select(g => new { StudentId = g.Key, AbsentDays = g.Count() })
            .OrderByDescending(x => x.AbsentDays)
            .Take(10)
            .ToListAsync();

        return Ok(new
        {
            daily,
            total,
            presentCount,
            absentCount,
            attendanceRate = total > 0 ? Math.Round((double)presentCount / total * 100, 1) : 0,
            topAbsentees,
        });
    }

    // ── Fee Report ────────────────────────────────────────────────────────
    [HttpGet("fees")]
    public async Task<IActionResult> FeeReport([FromQuery] Guid? academicYearId, [FromQuery] int? month, [FromQuery] int? year)
    {
        var paymentsQ = db.Set<FeePayment>().Where(p => p.TenantId == tenant.TenantId).AsQueryable();
        if (month.HasValue && year.HasValue)
        {
            var start = new DateTime(year.Value, month.Value, 1, 0, 0, 0, DateTimeKind.Utc);
            var end = start.AddMonths(1);
            paymentsQ = paymentsQ.Where(p => p.PaidAt >= start && p.PaidAt < end);
        }

        // Monthly collection (last 12 months) — group in memory to avoid EF translation issues
        var yearAgo = DateTime.UtcNow.AddMonths(-12);
        var recentPayments = await db.Set<FeePayment>()
            .Where(p => p.TenantId == tenant.TenantId && p.PaidAt >= yearAgo)
            .Select(p => new { p.PaidAt, p.Amount })
            .ToListAsync();

        var monthlyCollection = recentPayments
            .GroupBy(p => new { p.PaidAt.Year, p.PaidAt.Month })
            .Select(g => new
            {
                g.Key.Year, g.Key.Month,
                Collected = g.Sum(p => p.Amount),
                Transactions = g.Count(),
            })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToList();

        // Payment method breakdown — use backing field names, group in memory
        var filteredPayments = await paymentsQ
            .Select(p => new { p.Method, p.Amount })
            .ToListAsync();

        var byMethod = filteredPayments
            .GroupBy(p => p.Method)
            .Select(g => new { Method = g.Key.ToString(), Amount = g.Sum(p => p.Amount), Count = g.Count() })
            .ToList();

        // Outstanding dues by fee category
        var outstanding = await db.Set<StudentFee>()
            .Where(f => f.TenantId == tenant.TenantId && f.Status.ToString() != "Paid"
                && (!academicYearId.HasValue || f.AcademicYearId == academicYearId))
            .GroupBy(f => f.FeeCategoryId)
            .Select(g => new
            {
                CategoryId = g.Key,
                TotalDue = g.Sum(f => f.Amount),
                TotalPaid = g.Sum(f => f.PaidAmount),
                Outstanding = g.Sum(f => f.Amount - f.PaidAmount),
                StudentCount = g.Count(),
            })
            .ToListAsync();

        var totalCollected = await paymentsQ.SumAsync(p => (decimal?)p.Amount) ?? 0;
        var totalOutstanding = await db.Set<StudentFee>()
            .Where(f => f.TenantId == tenant.TenantId && f.Status.ToString() != "Paid")
            .SumAsync(f => (decimal?)(f.Amount - f.PaidAmount)) ?? 0;

        return Ok(new { monthlyCollection, byMethod, outstanding, totalCollected, totalOutstanding });
    }

    // ── Exam / Result Report ──────────────────────────────────────────────
    [HttpGet("exams")]
    public async Task<IActionResult> ExamReport([FromQuery] Guid? examId, [FromQuery] Guid? sectionId)
    {
        var marksQ = db.Set<StudentMark>()
            .Where(m => m.TenantId == tenant.TenantId)
            .AsQueryable();

        if (examId.HasValue)
        {
            var scheduleIds = await db.Set<ExamSchedule>()
                .Where(s => s.ExamId == examId && s.TenantId == tenant.TenantId)
                .Select(s => s.Id).ToListAsync();
            marksQ = marksQ.Where(m => scheduleIds.Contains(m.ExamScheduleId));
        }

        // Grade distribution
        var gradeDist = await marksQ
            .GroupBy(m => m.Grade)
            .Select(g => new { Grade = g.Key ?? "N/A", Count = g.Count() })
            .OrderBy(x => x.Grade)
            .ToListAsync();

        // Pass/fail
        var passCount = await marksQ.CountAsync(m => m.IsPass);
        var failCount = await marksQ.CountAsync(m => !m.IsPass);
        var total = passCount + failCount;

        // Score distribution buckets
        var allMarks = await marksQ
            .Select(m => new { m.MarksObtained, m.MaxMarks })
            .ToListAsync();

        var scoreBuckets = allMarks
            .Where(m => m.MaxMarks > 0)
            .Select(m => (int)((double)(m.MarksObtained ?? 0) * 100.0 / (double)m.MaxMarks / 10) * 10)
            .GroupBy(b => b)
            .Select(g => new { RangeStart = g.Key, Count = g.Count() })
            .OrderBy(x => x.RangeStart)
            .ToList();

        // Average per subject
        var avgPerSchedule = await marksQ
            .GroupBy(m => m.ExamScheduleId)
            .Select(g => new
            {
                ScheduleId = g.Key,
                Average = g.Average(m => m.MaxMarks > 0 ? (double)(m.MarksObtained ?? 0) * 100.0 / (double)m.MaxMarks : 0.0),
                Count = g.Count(),
            })
            .ToListAsync();

        return Ok(new
        {
            gradeDist, passCount, failCount,
            passRate = total > 0 ? Math.Round((double)passCount / total * 100, 1) : 0,
            scoreBuckets, avgPerSchedule,
        });
    }

    // ── HR Report ─────────────────────────────────────────────────────────
    [HttpGet("hr")]
    public async Task<IActionResult> HrReport()
    {
        var employees = await db.Set<Employee>()
            .Where(e => e.TenantId == tenant.TenantId)
            .ToListAsync();

        var byDept = employees
            .GroupBy(e => e.Department?.Name ?? "Unassigned")
            .Select(g => new { Department = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToList();

        var byType = employees
            .GroupBy(e => e.EmploymentType.ToString())
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToList();

        var byStatus = employees
            .GroupBy(e => e.Status.ToString())
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToList();

        // Payroll trend (last 6 months)
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var payrollTrend = await db.Set<Payroll>()
            .Where(p => p.TenantId == tenant.TenantId && p.CreatedAt >= sixMonthsAgo)
            .OrderBy(p => p.Year).ThenBy(p => p.Month)
            .Select(p => new { p.Month, p.Year, p.TotalNet, p.TotalGross, p.Status })
            .ToListAsync();

        return Ok(new
        {
            totalEmployees = employees.Count,
            byDept, byType, byStatus, payrollTrend,
        });
    }

    // ── Library Report ────────────────────────────────────────────────────
    [HttpGet("library")]
    public async Task<IActionResult> LibraryReport()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var totalBooks = await db.Set<Book>().CountAsync(b => b.TenantId == tenant.TenantId);
        var totalCopies = await db.Set<Book>().Where(b => b.TenantId == tenant.TenantId).SumAsync(b => (int?)b.TotalCopies) ?? 0;
        var issued = await db.Set<BookIssue>().CountAsync(i => i.TenantId == tenant.TenantId && i.ReturnDate == null);
        var overdue = await db.Set<BookIssue>()
            .CountAsync(i => i.TenantId == tenant.TenantId && i.ReturnDate == null && i.DueDate < today);
        var fineCollected = await db.Set<BookIssue>()
            .Where(i => i.TenantId == tenant.TenantId && i.FineAmount > 0)
            .SumAsync(i => (decimal?)i.FineAmount) ?? 0;

        // Most issued books (top 10)
        var popularBooks = await db.Set<BookIssue>()
            .Where(i => i.TenantId == tenant.TenantId)
            .GroupBy(i => i.BookId)
            .Select(g => new { BookId = g.Key, IssueCount = g.Count() })
            .OrderByDescending(x => x.IssueCount)
            .Take(10)
            .ToListAsync();

        return Ok(new { totalBooks, totalCopies, issued, overdue, fineCollected, popularBooks });
    }

    // ── Transport Report ──────────────────────────────────────────────────
    [HttpGet("transport")]
    public async Task<IActionResult> TransportReport()
    {
        var routes = await db.Set<TransportRoute>().CountAsync(r => r.TenantId == tenant.TenantId);
        var vehicles = await db.Set<Vehicle>().CountAsync(v => v.TenantId == tenant.TenantId);
        var students = await db.Set<StudentTransport>().CountAsync(s => s.TenantId == tenant.TenantId);

        var byRoute = await db.Set<StudentTransport>()
            .Where(s => s.TenantId == tenant.TenantId)
            .GroupBy(s => s.RouteId)
            .Select(g => new { RouteId = g.Key, StudentCount = g.Count() })
            .ToListAsync();

        return Ok(new { routes, vehicles, studentsUsingTransport = students, byRoute });
    }
}
