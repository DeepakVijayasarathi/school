using SchoolKart.Domain.Enums;

namespace SchoolKart.Domain.Entities;

public class EmployeeSalary : TenantEntity
{
    public Guid EmployeeId { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public List<Dictionary<string, object>> Components { get; set; } = new();
    public decimal GrossSalary { get; set; }
    public Guid? CreatedBy { get; set; }
    public Employee? Employee { get; set; }
}

public class Payroll : TenantEntity
{
    public int Month { get; set; }
    public int Year { get; set; }
    public PayrollStatus Status { get; set; } = PayrollStatus.Draft;
    public decimal? TotalGross { get; set; }
    public decimal? TotalDeductions { get; set; }
    public decimal? TotalNet { get; set; }
    public Guid? ProcessedBy { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public ICollection<Payslip> Payslips { get; set; } = new List<Payslip>();
}

public class Payslip : TenantEntity
{
    public Guid PayrollId { get; set; }
    public Guid EmployeeId { get; set; }
    public int? WorkingDays { get; set; }
    public int? PresentDays { get; set; }
    public int? LeaveDays { get; set; }
    public List<Dictionary<string, object>> Earnings { get; set; } = new();
    public List<Dictionary<string, object>> Deductions { get; set; } = new();
    public decimal GrossEarnings { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal NetSalary { get; set; }
    public string? PdfUrl { get; set; }
    public PayrollStatus Status { get; set; } = PayrollStatus.Draft;
    public Payroll? Payroll { get; set; }
    public Employee? Employee { get; set; }
}
