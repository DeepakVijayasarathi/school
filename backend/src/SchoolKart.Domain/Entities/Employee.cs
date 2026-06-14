using SchoolKart.Domain.Enums;

namespace SchoolKart.Domain.Entities;

public class Employee : TenantEntity
{
    public Guid UserId { get; set; }
    public Guid? CampusId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? Designation { get; set; }
    public EmploymentType EmploymentType { get; set; } = EmploymentType.Permanent;
    public DateOnly JoiningDate { get; set; }
    public DateOnly? LeavingDate { get; set; }
    public string? Qualification { get; set; }
    public int ExperienceYears { get; set; }
    public string? Specialization { get; set; }
    public string? EmergencyContact { get; set; }
    public string? EmergencyPhone { get; set; }
    public string? BankName { get; set; }
    public string? BankAccount { get; set; }
    public string? BankIfsc { get; set; }
    public string? PanNumber { get; set; }
    public string? AadharNumber { get; set; }
    public string? PfNumber { get; set; }
    public string? EsiNumber { get; set; }
    public decimal? BasicSalary { get; set; }
    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;

    public User? User { get; set; }
    public Campus? Campus { get; set; }
    public Department? Department { get; set; }
    public ICollection<StaffAttendance> Attendances { get; set; } = new List<StaffAttendance>();
}
