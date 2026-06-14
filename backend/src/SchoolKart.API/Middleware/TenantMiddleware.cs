using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace SchoolKart.API.Middleware;

public class TenantMiddleware(RequestDelegate next, IMemoryCache cache)
{
    public async Task InvokeAsync(HttpContext ctx, AppDbContext db)
    {
        if (ctx.User.Identity?.IsAuthenticated == true)
        {
            var tenantIdClaim = ctx.User.FindFirst("tid")?.Value;
            if (Guid.TryParse(tenantIdClaim, out var tenantId) && tenantId != Guid.Empty)
            {
                var cacheKey = $"tenant:{tenantId}";
                if (!cache.TryGetValue(cacheKey, out Tenant? tenant))
                {
                    tenant = await db.Tenants
                        .AsNoTracking()
                        .FirstOrDefaultAsync(t => t.Id == tenantId);

                    if (tenant is not null)
                        cache.Set(cacheKey, tenant, TimeSpan.FromMinutes(5));
                }

                if (tenant is null || !tenant.IsActive)
                {
                    ctx.Response.StatusCode = 403;
                    await ctx.Response.WriteAsJsonAsync(new { error = "Tenant not found or inactive" });
                    return;
                }
                ctx.Items["Tenant"] = tenant;
            }
        }
        await next(ctx);
    }
}

public class TenantContext(IHttpContextAccessor httpContextAccessor) : ITenantContext
{
    private readonly ClaimsPrincipal? _user = httpContextAccessor.HttpContext?.User;

    public Guid TenantId => Guid.Parse(_user?.FindFirst("tid")?.Value ?? Guid.Empty.ToString());
    public string TenantSlug => _user?.FindFirst("slug")?.Value ?? "";
    public Guid UserId => Guid.Parse(_user?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
    public string UserRole => _user?.FindFirst("role")?.Value ?? "";
    public string[] Permissions => _user?.FindFirst("perms")?.Value?.Split(',') ?? [];

    public bool HasPermission(string permission)
    {
        if (Permissions.Contains("*")) return true;
        if (Permissions.Contains(permission)) return true;

        // wildcard check: "student.*" matches "student.view"
        var parts = permission.Split('.');
        if (parts.Length == 2 && Permissions.Contains($"{parts[0]}.*")) return true;

        return false;
    }
}
