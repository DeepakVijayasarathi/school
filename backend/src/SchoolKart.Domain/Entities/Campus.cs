namespace SchoolKart.Domain.Entities;

public class Campus : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public Guid? PrincipalId { get; set; }
    public bool IsActive { get; set; } = true;

    public Tenant? Tenant { get; set; }
    public User? Principal { get; set; }
    public ICollection<Class> Classes { get; set; } = new List<Class>();
}

public class Class : TenantEntity
{
    public Guid? CampusId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? NumericLevel { get; set; }
    public bool IsActive { get; set; } = true;

    public Campus? Campus { get; set; }
    public ICollection<Section> Sections { get; set; } = new List<Section>();
}

public class Section : TenantEntity
{
    public Guid AcademicYearId { get; set; }
    public Guid ClassId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? ClassTeacherId { get; set; }
    public string? RoomNumber { get; set; }
    public int MaxStrength { get; set; } = 40;
    public bool IsActive { get; set; } = true;

    public AcademicYear? AcademicYear { get; set; }
    public Class? Class { get; set; }
    public User? ClassTeacher { get; set; }
    public ICollection<StudentEnrollment> Enrollments { get; set; } = new List<StudentEnrollment>();
}
