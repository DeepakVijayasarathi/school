namespace SchoolKart.Domain.Entities;

public class Role : BaseEntity
{
    public Guid? TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public List<string> Permissions { get; set; } = new();

    public Tenant? Tenant { get; set; }
    public ICollection<User> Users { get; set; } = new List<User>();
}
