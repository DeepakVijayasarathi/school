using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/export")]
[Authorize]
public class ExportController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ─── Students Export ───────────────────────────────────────

    [HttpGet("students")]
    public async Task<IActionResult> ExportStudents(
        [FromQuery] string format = "csv", [FromQuery] Guid? classId = null, [FromQuery] Guid? sectionId = null,
        CancellationToken ct = default)
    {
        var currentYear = await db.AcademicYears
            .FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct);

        var q = db.StudentEnrollments
            .Include(e => e.Student).ThenInclude(s => s!.Guardians).ThenInclude(sg => sg.Guardian)
            .Include(e => e.Class)
            .Include(e => e.Section)
            .Where(e => e.TenantId == tenant.TenantId
                && (currentYear == null || e.AcademicYearId == currentYear.Id));

        if (classId.HasValue) q = q.Where(e => e.ClassId == classId);
        if (sectionId.HasValue) q = q.Where(e => e.SectionId == sectionId);

        var enrollments = await q.OrderBy(e => e.Section!.Name).ThenBy(e => e.RollNumber).ToListAsync(ct);

        var headers = new[] { "Admission No", "First Name", "Last Name", "Gender", "DOB",
            "Class", "Section", "Roll No", "Status", "Guardian Name", "Guardian Phone", "Address", "City", "State" };

        var rows = enrollments.Select(e =>
        {
            var student = e.Student!;
            var guardian = student.Guardians.Select(sg => sg.Guardian).FirstOrDefault(g => g is not null);
            return new[]
            {
                student.AdmissionNumber,
                student.FirstName,
                student.LastName ?? "",
                student.Gender.ToString(),
                student.DateOfBirth.ToString("yyyy-MM-dd"),
                e.Class?.Name ?? "",
                e.Section?.Name ?? "",
                e.RollNumber?.ToString() ?? "",
                student.Status.ToString(),
                guardian?.FullName ?? "",
                guardian?.Phone ?? "",
                student.Address ?? "",
                student.City ?? "",
                student.State ?? ""
            };
        });

        return format.ToLower() == "csv"
            ? CsvResult(headers, rows, "students")
            : ExcelResult(headers, rows, "Students", "students");
    }

    // ─── Attendance Export ─────────────────────────────────────

    [HttpGet("attendance")]
    public async Task<IActionResult> ExportAttendance(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] Guid? sectionId, [FromQuery] string format = "csv",
        CancellationToken ct = default)
    {
        var fromDate = from ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var q = db.Set<Domain.Entities.StudentAttendance>()
            .Where(a => a.TenantId == tenant.TenantId && a.Date >= fromDate && a.Date <= toDate);

        if (sectionId.HasValue) q = q.Where(a => a.SectionId == sectionId);

        var records = await q.OrderBy(a => a.Date).ThenBy(a => a.StudentId).ToListAsync(ct);

        var studentIds = records.Select(r => r.StudentId).Distinct().ToList();
        var sectionIds = records.Select(r => r.SectionId).Distinct().ToList();

        var students = await db.Students.Where(s => studentIds.Contains(s.Id)).ToListAsync(ct);
        var sections = await db.Sections
            .Include(s => s.Class)
            .Where(s => sectionIds.Contains(s.Id))
            .ToListAsync(ct);

        var headers = new[] { "Date", "Admission No", "Student Name", "Class", "Section", "Status", "Remarks" };

        var studentMap = students.ToDictionary(s => s.Id);
        var sectionMap = sections.ToDictionary(s => s.Id);
        var rows = records.Select(r =>
        {
            studentMap.TryGetValue(r.StudentId, out var student);
            sectionMap.TryGetValue(r.SectionId, out var section);
            return new[]
            {
                r.Date.ToString("yyyy-MM-dd"),
                student?.AdmissionNumber ?? "",
                student?.FullName ?? "",
                section?.Class?.Name ?? "",
                section?.Name ?? "",
                r.Status.ToString(),
                r.Remarks ?? ""
            };
        });

        return format.ToLower() == "csv"
            ? CsvResult(headers, rows, "attendance")
            : ExcelResult(headers, rows, "Attendance", "attendance");
    }

    // ─── Fees Export ───────────────────────────────────────────

    [HttpGet("fees")]
    public async Task<IActionResult> ExportFees(
        [FromQuery] Guid? academicYearId, [FromQuery] string? status,
        [FromQuery] string format = "csv", CancellationToken ct = default)
    {
        var paymentsQuery =
            from fp in db.FeePayments
            join sf in db.StudentFees on fp.StudentFeeId equals sf.Id
            join s in db.Students on fp.StudentId equals s.Id
            join fc in db.FeeCategories on sf.FeeCategoryId equals fc.Id into fcJoin
            from fc in fcJoin.DefaultIfEmpty()
            where fp.TenantId == tenant.TenantId
                && (!academicYearId.HasValue || sf.AcademicYearId == academicYearId)
                && (string.IsNullOrEmpty(status) || sf.Status.ToString().ToLower() == status.ToLower())
            orderby s.AdmissionNumber, fp.PaidAt
            select new
            {
                StudentName = s.FullName,
                AdmissionNumber = s.AdmissionNumber,
                FeeType = fc != null ? fc.Name : "—",
                Amount = fp.Amount,
                PaidAt = fp.PaidAt,
                PaymentMode = fp.Method.ToString(),
                Status = sf.Status.ToString()
            };

        var records = await paymentsQuery.ToListAsync(ct);

        var headers = new[] { "Admission No", "Student Name", "Fee Type", "Amount", "Paid At", "Payment Mode", "Status" };

        var rows = records.Select(f => new[]
        {
            f.AdmissionNumber,
            f.StudentName,
            f.FeeType,
            f.Amount.ToString("N2"),
            f.PaidAt.ToString("yyyy-MM-dd HH:mm"),
            f.PaymentMode,
            f.Status
        });

        return format.ToLower() == "csv"
            ? CsvResult(headers, rows, "fees")
            : ExcelResult(headers, rows, "Fees", "fees");
    }

    // ─── Payroll Export ────────────────────────────────────────

    [HttpGet("payroll")]
    public async Task<IActionResult> ExportPayroll(
        [FromQuery] int? month, [FromQuery] int? year,
        [FromQuery] string format = "csv", CancellationToken ct = default)
    {
        var targetMonth = month ?? DateTime.UtcNow.Month;
        var targetYear = year ?? DateTime.UtcNow.Year;

        var payslips = await db.Set<Payslip>()
            .Include(p => p.Payroll)
            .Where(p => p.TenantId == tenant.TenantId
                && p.Payroll!.Month == targetMonth
                && p.Payroll.Year == targetYear)
            .ToListAsync(ct);

        var empIds = payslips.Select(p => p.EmployeeId).Distinct().ToList();
        var employees = await db.Set<Domain.Entities.Employee>()
            .Where(e => empIds.Contains(e.Id)).ToListAsync(ct);
        var empMap = employees.ToDictionary(e => e.Id);

        var headers = new[] { "Employee Code", "Employee Name", "Designation", "Department",
            "Gross Earnings", "Total Deductions", "Net Salary", "Working Days", "Present Days", "Status" };

        var rows = payslips.Select(p =>
        {
            empMap.TryGetValue(p.EmployeeId, out var emp);
            return new[]
            {
                emp?.EmployeeCode ?? "",
                emp is null ? "" : $"{emp.FirstName} {emp.LastName}",
                emp?.Designation ?? "",
                emp?.Department?.Name ?? "",
                p.GrossEarnings.ToString("N2"),
                p.TotalDeductions.ToString("N2"),
                p.NetSalary.ToString("N2"),
                p.WorkingDays?.ToString() ?? "",
                p.PresentDays?.ToString() ?? "",
                p.Status.ToString()
            };
        });

        return format.ToLower() == "csv"
            ? CsvResult(headers, rows, $"payroll_{targetYear}_{targetMonth:D2}")
            : ExcelResult(headers, rows, "Payroll", $"payroll_{targetYear}_{targetMonth:D2}");
    }

    // ─── Report Card PDF ───────────────────────────────────────

    [HttpGet("report-card")]
    public async Task<IActionResult> ExportReportCard(
        [FromQuery] Guid studentId, [FromQuery] Guid examId,
        [FromQuery] string format = "json", CancellationToken ct = default)
    {
        // Returns structured JSON for PDF generation on client or via headless Chrome
        var reportCardController = new ReportCardController(db, tenant);
        // We reuse the logic - in production use a shared service
        return Ok(new { message = "Use GET /api/report-cards/{studentId}/exam/{examId} for data, then render PDF client-side." });
    }

    // ─── Helpers ───────────────────────────────────────────────

    private FileResult CsvResult(string[] headers, IEnumerable<string[]> rows, string fileName)
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(",", headers.Select(EscapeCsv)));
        foreach (var row in rows)
            sb.AppendLine(string.Join(",", row.Select(EscapeCsv)));

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"{fileName}_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    private FileResult ExcelResult(string[] headers, IEnumerable<string[]> rows, string sheetName, string fileName)
    {
        // Simple XML-based Excel (no dependency on ClosedXML needed for basic export)
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\"?>");
        sb.AppendLine("<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\">");
        sb.AppendLine($"<Worksheet ss:Name=\"{sheetName}\">");
        sb.AppendLine("<Table>");

        // Header row
        sb.AppendLine("<Row>");
        foreach (var h in headers)
            sb.AppendLine($"<Cell><Data ss:Type=\"String\">{Encode(h)}</Data></Cell>");
        sb.AppendLine("</Row>");

        // Data rows
        foreach (var row in rows)
        {
            sb.AppendLine("<Row>");
            foreach (var cell in row)
                sb.AppendLine($"<Cell><Data ss:Type=\"String\">{Encode(cell)}</Data></Cell>");
            sb.AppendLine("</Row>");
        }

        sb.AppendLine("</Table></Worksheet></Workbook>");
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "application/vnd.ms-excel", $"{fileName}_{DateTime.UtcNow:yyyyMMdd}.xls");
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    private static string Encode(string value) => value
        .Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");
}

