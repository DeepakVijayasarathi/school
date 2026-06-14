using SchoolKart.Domain.Enums;

namespace SchoolKart.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Domain { get; set; }
    public string? LogoUrl { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string Country { get; set; } = "India";
    public string? Pincode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string Timezone { get; set; } = "Asia/Kolkata";
    public string Locale { get; set; } = "en-IN";
    public string Currency { get; set; } = "INR";
    public SubscriptionPlan Plan { get; set; } = SubscriptionPlan.Trial;
    public SubscriptionStatus PlanStatus { get; set; } = SubscriptionStatus.Trial;
    public DateTime? PlanExpiresAt { get; set; }
    public int MaxStudents { get; set; } = 500;
    public int MaxStaff { get; set; } = 50;
    public Dictionary<string, object> Settings { get; set; } = new();
    public bool IsActive { get; set; } = true;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<AcademicYear> AcademicYears { get; set; } = new List<AcademicYear>();
}
