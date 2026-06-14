namespace SchoolKart.Domain.Entities;

public class Visitor : TenantEntity
{
    public string VisitorName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? IdType { get; set; }
    public string? IdNumber { get; set; }
    public string? IdProofUrl { get; set; }
    public string? PhotoUrl { get; set; }
    public string Purpose { get; set; } = "other";
    public string? PurposeDetails { get; set; }
    public Guid? HostEmployeeId { get; set; }
    public string? HostName { get; set; }
    public string? HostDepartment { get; set; }
    public string? Company { get; set; }
    public int NoOfPersons { get; set; } = 1;
    public string? VehicleNumber { get; set; }
    public string? BadgeNumber { get; set; }
    public DateTime CheckIn { get; set; } = DateTime.UtcNow;
    public DateTime? CheckOut { get; set; }
    public int? DurationMinutes { get; set; }
    public string Status { get; set; } = "checked_in";
    public string? Notes { get; set; }
    public Guid? CheckedInBy { get; set; }
    public Guid? CheckedOutBy { get; set; }
}

public class GatePass : TenantEntity
{
    public string? PassNumber { get; set; }
    public Guid StudentId { get; set; }
    public string PassType { get; set; } = "both";
    public string Reason { get; set; } = string.Empty;
    public Guid? RequestedBy { get; set; }
    public string? ParentPhone { get; set; }
    public string? AuthorizedPerson { get; set; }
    public string? AuthorizedPersonPhone { get; set; }
    public DateTime? OutTime { get; set; }
    public DateTime? ExpectedReturn { get; set; }
    public DateTime? InTime { get; set; }
    public string Status { get; set; } = "pending";
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }
    public Student? Student { get; set; }
}
