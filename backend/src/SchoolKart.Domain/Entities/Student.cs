using SchoolKart.Domain.Enums;

namespace SchoolKart.Domain.Entities;

public class Student : TenantEntity
{
    public Guid? UserId { get; set; }
    public string AdmissionNumber { get; set; } = string.Empty;
    public string? RollNumber { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public Gender Gender { get; set; }
    public DateOnly DateOfBirth { get; set; }
    public BloodGroup? BloodGroup { get; set; }
    public string? Religion { get; set; }
    public string? Caste { get; set; }
    public string? Category { get; set; }
    public string Nationality { get; set; } = "Indian";
    public string? MotherTongue { get; set; }
    public string? AadharNumber { get; set; }
    public string? ProfilePicture { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public AdmissionStatus Status { get; set; } = AdmissionStatus.Active;
    public DateOnly AdmissionDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? LeavingDate { get; set; }
    public string? LeavingReason { get; set; }
    public string? PreviousSchool { get; set; }
    public string? PreviousClass { get; set; }
    public string? TcNumber { get; set; }
    public string? Remarks { get; set; }
    public Dictionary<string, object> ExtraInfo { get; set; } = new();

    public User? User { get; set; }
    public ICollection<StudentEnrollment> Enrollments { get; set; } = new List<StudentEnrollment>();
    public ICollection<StudentGuardian> Guardians { get; set; } = new List<StudentGuardian>();
    public ICollection<StudentDocument> Documents { get; set; } = new List<StudentDocument>();

    public string FullName => $"{FirstName} {LastName}".Trim();
}

public class StudentEnrollment : TenantEntity
{
    public Guid StudentId { get; set; }
    public Guid AcademicYearId { get; set; }
    public Guid ClassId { get; set; }
    public Guid SectionId { get; set; }
    public string? RollNumber { get; set; }
    public bool? IsPromoted { get; set; }
    public Guid? PromotedToClassId { get; set; }
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;

    public Student? Student { get; set; }
    public AcademicYear? AcademicYear { get; set; }
    public Class? Class { get; set; }
    public Section? Section { get; set; }
}

public class Guardian : TenantEntity
{
    public Guid? UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Occupation { get; set; }
    public decimal? AnnualIncome { get; set; }
    public string? AadharNumber { get; set; }
    public string? ProfilePicture { get; set; }
    public string? Address { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();
    public ICollection<StudentGuardian> Students { get; set; } = new List<StudentGuardian>();
}

public class StudentGuardian : BaseEntity
{
    public Guid StudentId { get; set; }
    public Guid GuardianId { get; set; }
    public GuardianRelation Relation { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsPickup { get; set; } = true;
    public bool ReceivesSms { get; set; } = true;
    public bool ReceivesEmail { get; set; } = true;

    public Student? Student { get; set; }
    public Guardian? Guardian { get; set; }
}

public class StudentDocument : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public DocumentType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public int? FileSize { get; set; }
    public string? MimeType { get; set; }
    public bool Verified { get; set; }
    public Guid? VerifiedBy { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public Student? Student { get; set; }
}
