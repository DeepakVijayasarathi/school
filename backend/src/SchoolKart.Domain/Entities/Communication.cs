namespace SchoolKart.Domain.Entities;

public class Announcement : TenantEntity
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Audience { get; set; } = "all";
    public Guid[]? ClassIds { get; set; }
    public Guid[]? SectionIds { get; set; }
    public string[] Channels { get; set; } = ["app"];
    public string? AttachmentUrl { get; set; }
    public bool IsPinned { get; set; }
    public DateTime PublishAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public Guid? CreatedBy { get; set; }
}

public class NotificationLog : TenantEntity
{
    public Guid? UserId { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string Recipient { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public string? Error { get; set; }
    public DateTime? SentAt { get; set; }
}
