using System.ComponentModel.DataAnnotations;
using SchoolKart.Domain.Enums;

namespace SchoolKart.Application.Students;

public record CreateStudentRequest(
    [Required] string FirstName,
    string? LastName,
    [Required] Gender Gender,
    [Required] DateOnly DateOfBirth,
    BloodGroup? BloodGroup,
    string? Religion,
    string? Caste,
    string? Category,
    string? Nationality,
    string? MotherTongue,
    string? AadharNumber,
    string? Address,
    string? City,
    string? State,
    string? Pincode,
    [Required] DateOnly AdmissionDate,
    string? PreviousSchool,
    string? PreviousClass,
    string? TcNumber,
    string? Remarks,
    // Enrollment
    [Required] Guid AcademicYearId,
    [Required] Guid ClassId,
    [Required] Guid SectionId,
    // Primary Guardian
    [Required] CreateGuardianRequest PrimaryGuardian
);

public record UpdateStudentRequest(
    string? FirstName,
    string? LastName,
    Gender? Gender,
    DateOnly? DateOfBirth,
    BloodGroup? BloodGroup,
    string? Religion,
    string? Caste,
    string? Category,
    string? AadharNumber,
    string? Address,
    string? City,
    string? State,
    string? Pincode,
    string? Remarks
);

public record CreateGuardianRequest(
    [Required] string FirstName,
    string? LastName,
    [Required] string Phone,
    string? Email,
    string? Occupation,
    decimal? AnnualIncome,
    [Required] GuardianRelation Relation,
    bool IsPrimary = true,
    bool IsPickup = true
);

public record StudentListDto(
    Guid Id,
    string AdmissionNumber,
    string FullName,
    string Gender,
    DateOnly DateOfBirth,
    string? ClassName,
    string? SectionName,
    string? RollNumber,
    string Status,
    string? ProfilePicture
);

public record StudentDetailDto(
    Guid Id,
    string AdmissionNumber,
    string FirstName,
    string? LastName,
    string FullName,
    string Gender,
    DateOnly DateOfBirth,
    string? BloodGroup,
    string? Religion,
    string? Caste,
    string? Category,
    string Nationality,
    string? MotherTongue,
    string? AadharNumber,
    string? ProfilePicture,
    string? Address,
    string? City,
    string? State,
    string? Pincode,
    string Status,
    DateOnly AdmissionDate,
    DateOnly? LeavingDate,
    string? PreviousSchool,
    string? PreviousClass,
    string? Remarks,
    StudentEnrollmentDto? CurrentEnrollment,
    IEnumerable<GuardianDto> Guardians,
    IEnumerable<DocumentDto> Documents
);

public record StudentEnrollmentDto(
    Guid Id,
    string AcademicYear,
    string ClassName,
    string SectionName,
    string? RollNumber,
    DateTime EnrolledAt
);

public record GuardianDto(
    Guid Id,
    string FullName,
    string Phone,
    string? Email,
    string? Occupation,
    string Relation,
    bool IsPrimary,
    bool IsPickup
);

public record DocumentDto(
    Guid Id,
    string Type,
    string Name,
    string FileUrl,
    bool Verified,
    DateTime UploadedAt
);

public record StudentQueryParams(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    Guid? ClassId = null,
    Guid? SectionId = null,
    string? Status = null,
    Guid? AcademicYearId = null
)
{
    public int SafePage => Math.Max(1, Page);
    public int SafePageSize => Math.Clamp(PageSize, 1, 100);
};

public record PromoteStudentsRequest(
    [Required] Guid FromAcademicYearId,
    [Required] Guid ToAcademicYearId,
    [Required] IEnumerable<PromoteStudentItem> Students
);

public record PromoteStudentItem(
    Guid StudentId,
    PromotionStatus Status,
    Guid? ToClassId,
    Guid? ToSectionId,
    string? Remarks
);
