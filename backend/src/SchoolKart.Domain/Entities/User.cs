using SchoolKart.Domain.Enums;

namespace SchoolKart.Domain.Entities;

public class User : TenantEntity
{
    public Guid? RoleId { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? ProfilePicture { get; set; }
    public Gender? Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public UserStatus Status { get; set; } = UserStatus.PendingVerification;
    public bool EmailVerified { get; set; }
    public bool PhoneVerified { get; set; }
    public bool TwoFaEnabled { get; set; }
    public string? TwoFaSecret { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginIp { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTime? LockedUntil { get; set; }
    public Dictionary<string, object> Settings { get; set; } = new();

    public Tenant? Tenant { get; set; }
    public Role? Role { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public string FullName => $"{FirstName} {LastName}".Trim();
    public bool IsLocked => LockedUntil.HasValue && LockedUntil > DateTime.UtcNow;
}
