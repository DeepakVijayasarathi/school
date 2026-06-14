namespace SchoolKart.Domain.Entities;

public class AdmissionInquiry : TenantEntity
{
    public string StudentName { get; set; } = string.Empty;
    public string? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string ClassSeeking { get; set; } = string.Empty;
    public Guid? AcademicYearId { get; set; }
    public string ParentName { get; set; } = string.Empty;
    public string ParentPhone { get; set; } = string.Empty;
    public string? ParentEmail { get; set; }
    public string? Address { get; set; }
    public string? PreviousSchool { get; set; }
    public string? ReferredBy { get; set; }
    public string Source { get; set; } = "walk_in";
    public string Status { get; set; } = "inquiry";
    public string? Notes { get; set; }
    public Guid? AssignedTo { get; set; }
    public DateTime FollowUpDate { get; set; } = DateTime.UtcNow;
}

public class AdmissionApplication : TenantEntity
{
    public Guid? InquiryId { get; set; }
    public string ApplicationNumber { get; set; } = string.Empty;
    public string StudentFirstName { get; set; } = string.Empty;
    public string? StudentLastName { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Religion { get; set; }
    public string? Caste { get; set; }
    public string? Category { get; set; }
    public string? BloodGroup { get; set; }
    public Guid? ClassId { get; set; }
    public Guid? AcademicYearId { get; set; }
    public string? PreviousSchool { get; set; }
    public string? PreviousClass { get; set; }
    public string FatherName { get; set; } = string.Empty;
    public string? FatherPhone { get; set; }
    public string? FatherOccupation { get; set; }
    public string MotherName { get; set; } = string.Empty;
    public string? MotherPhone { get; set; }
    public string? MotherOccupation { get; set; }
    public string? GuardianName { get; set; }
    public string? GuardianPhone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactEmail { get; set; }
    public string? Allergies { get; set; }
    public string? MedicalConditions { get; set; }
    public List<string> DocumentUrls { get; set; } = new();
    public string Status { get; set; } = "applied";
    public string? RejectionReason { get; set; }
    public decimal? ApplicationFee { get; set; }
    public bool ApplicationFeePaid { get; set; }
    public Guid? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }
    public Guid? ConvertedStudentId { get; set; }
}

public class EntranceTest : TenantEntity
{
    public Guid ApplicationId { get; set; }
    public DateOnly TestDate { get; set; }
    public TimeOnly TestTime { get; set; }
    public string? Venue { get; set; }
    public string? Subject { get; set; }
    public decimal? MaxMarks { get; set; }
    public decimal? MarksObtained { get; set; }
    public string? Result { get; set; }
    public string? Notes { get; set; }
    public AdmissionApplication? Application { get; set; }
}
