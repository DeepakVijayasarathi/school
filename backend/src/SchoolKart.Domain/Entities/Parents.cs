namespace SchoolKart.Domain.Entities;

public class Parent : TenantEntity
{
    public Guid? UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? Gender { get; set; }
    public string? Email { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? AlternatePhone { get; set; }
    public string? Occupation { get; set; }
    public string? Employer { get; set; }
    public string? AnnualIncome { get; set; }
    public string? Qualification { get; set; }
    public string? AadharNumber { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public string? ProfilePicture { get; set; }
    public bool PortalEnabled { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? DeletedAt { get; set; }
    public ICollection<ParentStudentMapping> StudentMappings { get; set; } = new List<ParentStudentMapping>();
    public ICollection<ParentCommunication> Communications { get; set; } = new List<ParentCommunication>();
}

public class ParentStudentMapping : TenantEntity
{
    public Guid ParentId { get; set; }
    public Guid StudentId { get; set; }
    public string Relation { get; set; } = "guardian";
    public bool IsPrimary { get; set; }
    public bool IsEmergency { get; set; }
    public bool IsPickupAuthorized { get; set; }
    public bool CanViewResults { get; set; } = true;
    public bool CanViewFees { get; set; } = true;
    public bool CanViewAttendance { get; set; } = true;
    public Parent? Parent { get; set; }
    public Student? Student { get; set; }
}

public class ParentCommunication : TenantEntity
{
    public Guid ParentId { get; set; }
    public Guid? StudentId { get; set; }
    public Guid? InitiatedBy { get; set; }
    public string Type { get; set; } = "app_notification";
    public string Direction { get; set; } = "outgoing";
    public string? Subject { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? Response { get; set; }
    public DateTime? RespondedAt { get; set; }
}
