namespace SchoolKart.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public Dictionary<string, object> DeviceInfo { get; set; } = new();
    public string? IpAddress { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    public User? User { get; set; }

    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
    public bool IsRevoked => RevokedAt.HasValue;
    public bool IsActive => !IsExpired && !IsRevoked;
}
