using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Domain.Enums;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/hr")]
[Authorize]
public class HRController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ── Employees ───────────────────────────────────────────────

    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployees(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] Guid? departmentId = null,
        CancellationToken ct = default)
    {
        var q = db.Set<Employee>()
            .Include(e => e.User)
            .Include(e => e.Campus)
            .Where(e => e.TenantId == tenant.TenantId);

        if (!string.IsNullOrEmpty(search))
            q = q.Where(e => e.EmployeeCode.Contains(search) ||
                e.User!.FirstName.Contains(search) ||
                (e.User.LastName != null && e.User.LastName.Contains(search)));

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<EmployeeStatus>(status, true, out var s))
            q = q.Where(e => e.Status == s);

        if (departmentId.HasValue)
            q = q.Where(e => e.DepartmentId == departmentId);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderBy(e => e.User!.FirstName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new
            {
                e.Id,
                e.EmployeeCode,
                FullName = e.User!.FirstName + " " + e.User.LastName,
                e.User.Email,
                e.User.Phone,
                e.User.ProfilePicture,
                e.Designation,
                e.EmploymentType,
                e.JoiningDate,
                e.Status,
                Department = e.Department != null ? e.Department.Name : null,
                Campus = e.Campus != null ? e.Campus.Name : null
            })
            .ToListAsync(ct);

        return Ok(new PagedResult<object> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("employees/{id:guid}")]
    public async Task<IActionResult> GetEmployee(Guid id, CancellationToken ct)
    {
        var employee = await db.Set<Employee>()
            .Include(e => e.User)
            .Include(e => e.Campus)
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == tenant.TenantId, ct);

        if (employee is null) return NotFound();

        return Ok(new
        {
            employee.Id,
            employee.EmployeeCode,
            FullName = employee.User!.FirstName + " " + employee.User.LastName,
            employee.User.Email,
            employee.User.Phone,
            employee.User.ProfilePicture,
            employee.User.Gender,
            employee.User.DateOfBirth,
            employee.Designation,
            employee.EmploymentType,
            employee.JoiningDate,
            employee.LeavingDate,
            employee.Qualification,
            employee.ExperienceYears,
            employee.Specialization,
            employee.BasicSalary,
            employee.BankName,
            employee.BankAccount,
            employee.BankIfsc,
            employee.PanNumber,
            employee.AadharNumber,
            employee.PfNumber,
            employee.EsiNumber,
            employee.EmergencyContact,
            employee.EmergencyPhone,
            employee.Status,
            Department = employee.Department?.Name,
            Campus = employee.Campus?.Name,
        });
    }

    [HttpPost("employees")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeRequest req, CancellationToken ct)
    {
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(req.Password ?? "Welcome@123");

        var user = new User
        {
            TenantId = tenant.TenantId,
            RoleId = (await db.Roles.FirstOrDefaultAsync(r => r.Code == req.RoleCode && r.TenantId == null, ct))?.Id,
            FirstName = req.FirstName,
            LastName = req.LastName,
            Email = req.Email,
            Phone = req.Phone,
            PasswordHash = passwordHash,
            Status = UserStatus.Active,
            EmailVerified = true
        };
        db.Users.Add(user);

        var lastEmp = await db.Set<Employee>()
            .Where(e => e.TenantId == tenant.TenantId)
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync(ct);

        var seq = lastEmp is null ? 1
            : (int.TryParse(lastEmp.EmployeeCode.Split('/').Last(), out var n) ? n : 0) + 1;
        var empCode = $"EMP/{seq:D4}";

        var employee = new Employee
        {
            TenantId = tenant.TenantId,
            UserId = user.Id,
            CampusId = req.CampusId,
            DepartmentId = req.DepartmentId,
            EmployeeCode = empCode,
            Designation = req.Designation,
            EmploymentType = req.EmploymentType,
            JoiningDate = req.JoiningDate,
            Qualification = req.Qualification,
            ExperienceYears = req.ExperienceYears,
            Specialization = req.Specialization,
            BasicSalary = req.BasicSalary,
            BankName = req.BankName,
            BankAccount = req.BankAccount,
            BankIfsc = req.BankIfsc,
            PanNumber = req.PanNumber,
            AadharNumber = req.AadharNumber,
            EmergencyContact = req.EmergencyContact,
            EmergencyPhone = req.EmergencyPhone
        };
        db.Set<Employee>().Add(employee);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetEmployee), new { id = employee.Id }, new { employee.Id, empCode });
    }

    [HttpPut("employees/{id:guid}")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> UpdateEmployee(Guid id, [FromBody] UpdateEmployeeRequest req, CancellationToken ct)
    {
        var employee = await db.Set<Employee>().Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == tenant.TenantId, ct);

        if (employee is null) return NotFound();

        if (req.Designation is not null) employee.Designation = req.Designation;
        if (req.BasicSalary.HasValue) employee.BasicSalary = req.BasicSalary;
        if (req.DepartmentId.HasValue) employee.DepartmentId = req.DepartmentId;
        if (req.Status.HasValue) employee.Status = req.Status.Value;
        if (req.BankName is not null) employee.BankName = req.BankName;
        if (req.BankAccount is not null) employee.BankAccount = req.BankAccount;
        if (req.BankIfsc is not null) employee.BankIfsc = req.BankIfsc;
        if (req.LeavingDate.HasValue) { employee.LeavingDate = req.LeavingDate; employee.Status = EmployeeStatus.Resigned; }

        employee.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Salary Structures ───────────────────────────────────────

    [HttpGet("employees/{id:guid}/salary")]
    public async Task<IActionResult> GetSalaryStructure(Guid id, CancellationToken ct)
    {
        var salary = await db.Set<EmployeeSalary>()
            .Where(s => s.EmployeeId == id && s.TenantId == tenant.TenantId)
            .OrderByDescending(s => s.EffectiveFrom)
            .FirstOrDefaultAsync(ct);

        return salary is null ? NotFound() : Ok(salary);
    }

    [HttpPost("employees/{id:guid}/salary")]
    public async Task<IActionResult> SetSalaryStructure(Guid id, [FromBody] SetSalaryRequest req, CancellationToken ct)
    {
        var salary = new EmployeeSalary
        {
            TenantId = tenant.TenantId,
            EmployeeId = id,
            EffectiveFrom = req.EffectiveFrom,
            Components = req.Components,
            GrossSalary = req.GrossSalary,
            CreatedBy = tenant.UserId
        };
        db.Set<EmployeeSalary>().Add(salary);
        await db.SaveChangesAsync(ct);
        return Created($"/api/hr/employees/{id}/salary", new { salary.Id });
    }

    // ── Payroll ─────────────────────────────────────────────────

    [HttpGet("payroll")]
    public async Task<IActionResult> GetPayrolls([FromQuery] int year = 0, CancellationToken ct = default)
    {
        if (year == 0) year = DateTime.UtcNow.Year;

        var payrolls = await db.Set<Payroll>()
            .Where(p => p.TenantId == tenant.TenantId && p.Year == year)
            .OrderByDescending(p => p.Month)
            .Select(p => new { p.Id, p.Month, p.Year, p.Status, p.TotalGross, p.TotalDeductions, p.TotalNet, p.ProcessedAt, p.PaidAt })
            .ToListAsync(ct);

        return Ok(payrolls);
    }

    [HttpPost("payroll/process")]
    [Authorize(Roles = "school_admin,super_admin")]
    public async Task<IActionResult> ProcessPayroll([FromBody] ProcessPayrollRequest req, CancellationToken ct)
    {
        var existing = await db.Set<Payroll>()
            .FirstOrDefaultAsync(p => p.TenantId == tenant.TenantId && p.Month == req.Month && p.Year == req.Year, ct);

        if (existing?.Status == PayrollStatus.Paid)
            return BadRequest("Payroll already paid for this period");

        var employees = await db.Set<Employee>()
            .Where(e => e.TenantId == tenant.TenantId && e.Status == EmployeeStatus.Active)
            .ToListAsync(ct);

        if (employees.Count == 0)
            return BadRequest("No active employees found");

        var payroll = existing ?? new Payroll
        {
            TenantId = tenant.TenantId,
            Month = req.Month,
            Year = req.Year,
            Status = PayrollStatus.Draft
        };
        if (existing is null) db.Set<Payroll>().Add(payroll);

        var employeeIds = employees.Select(e => e.Id).ToList();
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow);

        // Batch-load all salaries; pick the most recent per employee in memory
        var allSalaries = await db.Set<EmployeeSalary>()
            .AsNoTracking()
            .Where(s => employeeIds.Contains(s.EmployeeId) && s.EffectiveFrom <= cutoff)
            .OrderBy(s => s.EffectiveFrom)
            .ToListAsync(ct);
        var salaryMap = allSalaries
            .GroupBy(s => s.EmployeeId)
            .ToDictionary(g => g.Key, g => g.Last());

        // Batch-load all attendance for the target month
        var allAttendance = await db.Set<StaffAttendance>()
            .AsNoTracking()
            .Where(a => employeeIds.Contains(a.EmployeeId) &&
                        a.Date.Month == req.Month && a.Date.Year == req.Year &&
                        a.TenantId == tenant.TenantId)
            .ToListAsync(ct);
        var attendanceMap = allAttendance
            .GroupBy(a => a.EmployeeId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Batch-load existing payslips for this payroll (only relevant on re-process)
        var existingSlips = existing is not null
            ? await db.Set<Payslip>().Where(ps => ps.PayrollId == payroll.Id).ToListAsync(ct)
            : new List<Payslip>();
        var slipMap = existingSlips.ToDictionary(ps => ps.EmployeeId);

        decimal totalGross = 0, totalDeductions = 0;
        var newPayslips = new List<Payslip>();

        foreach (var emp in employees)
        {
            if (!salaryMap.TryGetValue(emp.Id, out var salary)) continue;

            var attendance = attendanceMap.GetValueOrDefault(emp.Id) ?? new List<StaffAttendance>();
            var presentDays = attendance.Count(a => a.Status != AttendanceStatus.Absent);
            var perDaySalary = salary.GrossSalary / req.WorkingDays;
            var earned = Math.Round(perDaySalary * presentDays, 2);
            var deductions = salary.Components
                .Where(c => c.ContainsKey("type") && c["type"].ToString() == "deduction")
                .Sum(c => c.TryGetValue("amount", out var a) ? Convert.ToDecimal(a) : 0);
            var net = earned - deductions;
            totalGross += earned;
            totalDeductions += deductions;

            if (slipMap.TryGetValue(emp.Id, out var existingSlip))
            {
                existingSlip.GrossEarnings = earned;
                existingSlip.TotalDeductions = deductions;
                existingSlip.NetSalary = net;
                existingSlip.WorkingDays = req.WorkingDays;
                existingSlip.PresentDays = presentDays;
            }
            else
            {
                newPayslips.Add(new Payslip
                {
                    TenantId = tenant.TenantId,
                    PayrollId = payroll.Id,
                    EmployeeId = emp.Id,
                    WorkingDays = req.WorkingDays,
                    PresentDays = presentDays,
                    LeaveDays = req.WorkingDays - presentDays,
                    Earnings = salary.Components.Where(c => c.GetValueOrDefault("type")?.ToString() != "deduction").ToList(),
                    Deductions = salary.Components.Where(c => c.GetValueOrDefault("type")?.ToString() == "deduction").ToList(),
                    GrossEarnings = earned,
                    TotalDeductions = deductions,
                    NetSalary = net,
                    Status = PayrollStatus.Draft
                });
            }
        }

        payroll.TotalGross = totalGross;
        payroll.TotalDeductions = totalDeductions;
        payroll.TotalNet = totalGross - totalDeductions;
        payroll.Status = PayrollStatus.Draft;
        payroll.ProcessedAt = DateTime.UtcNow;
        payroll.ProcessedBy = tenant.UserId;

        db.Set<Payslip>().AddRange(newPayslips);
        await db.SaveChangesAsync(ct);

        return Ok(new { payrollId = payroll.Id, employees = employees.Count, totalNet = payroll.TotalNet });
    }

    [HttpPost("payroll/{id:guid}/approve")]
    public async Task<IActionResult> ApprovePayroll(Guid id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var updated = await db.Set<Payroll>()
            .Where(p => p.Id == id && p.TenantId == tenant.TenantId && p.Status == PayrollStatus.Draft)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, PayrollStatus.Approved), ct);

        if (updated == 0)
        {
            await tx.RollbackAsync(ct);
            return BadRequest("Payroll not found or not in draft state");
        }

        await db.Set<Payslip>()
            .Where(ps => ps.PayrollId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(ps => ps.Status, PayrollStatus.Approved), ct);

        await tx.CommitAsync(ct);
        return Ok();
    }

    [HttpPost("payroll/{id:guid}/mark-paid")]
    public async Task<IActionResult> MarkPayrollPaid(Guid id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var updated = await db.Set<Payroll>()
            .Where(p => p.Id == id && p.TenantId == tenant.TenantId && p.Status == PayrollStatus.Approved)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Status, PayrollStatus.Paid)
                .SetProperty(p => p.PaidAt, DateTime.UtcNow), ct);

        if (updated == 0)
        {
            await tx.RollbackAsync(ct);
            return BadRequest("Payroll not found or not approved");
        }

        await db.Set<Payslip>()
            .Where(ps => ps.PayrollId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(ps => ps.Status, PayrollStatus.Paid), ct);

        await tx.CommitAsync(ct);
        return Ok();
    }

    [HttpGet("payslips/{employeeId:guid}")]
    public async Task<IActionResult> GetPayslips(Guid employeeId, [FromQuery] int year = 0, CancellationToken ct = default)
    {
        if (year == 0) year = DateTime.UtcNow.Year;

        var payslips = await db.Set<Payslip>()
            .Include(ps => ps.Payroll)
            .Where(ps => ps.EmployeeId == employeeId && ps.TenantId == tenant.TenantId && ps.Payroll!.Year == year)
            .OrderByDescending(ps => ps.Payroll!.Month)
            .Select(ps => new
            {
                ps.Id,
                ps.Payroll!.Month,
                ps.Payroll.Year,
                ps.WorkingDays,
                ps.PresentDays,
                ps.LeaveDays,
                ps.GrossEarnings,
                ps.TotalDeductions,
                ps.NetSalary,
                ps.Status,
                ps.PdfUrl
            })
            .ToListAsync(ct);

        return Ok(payslips);
    }

    // ── Departments ─────────────────────────────────────────────

    [HttpGet("departments")]
    public async Task<IActionResult> GetDepartments(CancellationToken ct)
    {
        var depts = await db.Set<Department>()
            .Include(d => d.Head)
            .Where(d => d.TenantId == tenant.TenantId && d.IsActive)
            .Select(d => new { d.Id, d.Name, d.Code, Head = d.Head == null ? null : d.Head.FirstName + " " + d.Head.LastName })
            .ToListAsync(ct);
        return Ok(depts);
    }

    [HttpPost("departments")]
    public async Task<IActionResult> CreateDepartment([FromBody] CreateDepartmentRequest req, CancellationToken ct)
    {
        var dept = new Department
        {
            TenantId = tenant.TenantId,
            CampusId = req.CampusId,
            Name = req.Name,
            Code = req.Code,
            HeadId = req.HeadId
        };
        db.Set<Department>().Add(dept);
        await db.SaveChangesAsync(ct);
        return Created($"/api/hr/departments/{dept.Id}", new { dept.Id });
    }
}

// Request records
public record CreateEmployeeRequest(
    string FirstName, string? LastName, string? Email, string? Phone, string? Password,
    string RoleCode, Guid? CampusId, Guid? DepartmentId, string? Designation,
    EmploymentType EmploymentType, DateOnly JoiningDate, string? Qualification,
    int ExperienceYears, string? Specialization, decimal? BasicSalary,
    string? BankName, string? BankAccount, string? BankIfsc,
    string? PanNumber, string? AadharNumber, string? EmergencyContact, string? EmergencyPhone);

public record UpdateEmployeeRequest(
    string? Designation, decimal? BasicSalary, Guid? DepartmentId,
    EmployeeStatus? Status, string? BankName, string? BankAccount, string? BankIfsc,
    DateOnly? LeavingDate);

public record SetSalaryRequest(DateOnly EffectiveFrom, List<Dictionary<string, object>> Components, decimal GrossSalary);
public record ProcessPayrollRequest(int Month, int Year, int WorkingDays);
public record CreateDepartmentRequest(string Name, string? Code, Guid? CampusId, Guid? HeadId);
