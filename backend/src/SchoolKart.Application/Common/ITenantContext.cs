namespace SchoolKart.Application.Common;

public interface ITenantContext
{
    Guid TenantId { get; }
    string TenantSlug { get; }
    Guid UserId { get; }
    string UserRole { get; }
    string[] Permissions { get; }
    bool HasPermission(string permission);
}
