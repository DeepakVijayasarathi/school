using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using OtpNet;
using SchoolKart.Application.Auth;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Domain.Enums;
using SchoolKart.Infrastructure.Identity;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.Infrastructure.Services;

public class AuthService(
    AppDbContext db,
    IJwtTokenService jwt,
    IDistributedCache cache
) : IAuthService
{
    private const int MaxFailedAttempts = 5;
    private const int LockoutMinutes = 15;

    public async Task<Result<LoginResponse>> LoginAsync(LoginRequest request, string ipAddress, CancellationToken ct = default)
    {
        var tenant = await db.Tenants
            .FirstOrDefaultAsync(t => t.Slug == request.TenantSlug, ct);

        if (tenant is null || !tenant.IsActive)
            return Result<LoginResponse>.Failure("Invalid tenant", 401);

        if (tenant.PlanStatus == SubscriptionStatus.Expired || tenant.PlanStatus == SubscriptionStatus.Suspended)
            return Result<LoginResponse>.Failure("Subscription expired or suspended", 403);

        if (string.IsNullOrWhiteSpace(request.Email) && string.IsNullOrWhiteSpace(request.Phone))
            return Result<LoginResponse>.Failure("Email or phone is required", 400);

        User? user = null;
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var emailLower = request.Email.Trim().ToLower();
            user = await db.Users.Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.Email != null && u.Email.ToLower() == emailLower, ct);
        }
        else if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            user = await db.Users.Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.Phone == request.Phone.Trim(), ct);
        }

        if (user is null)
            return Result<LoginResponse>.Failure("Invalid credentials", 401);

        if (user.IsLocked)
            return Result<LoginResponse>.Failure($"Account locked until {user.LockedUntil:HH:mm}", 401);

        if (user.Status == UserStatus.Suspended)
            return Result<LoginResponse>.Failure("Account suspended", 403);

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= MaxFailedAttempts)
                user.LockedUntil = DateTime.UtcNow.AddMinutes(LockoutMinutes);

            await db.SaveChangesAsync(ct);
            return Result<LoginResponse>.Failure("Invalid credentials", 401);
        }

        // Reset failed attempts
        user.FailedLoginCount = 0;
        user.LockedUntil = null;
        user.LastLoginAt = DateTime.UtcNow;
        user.LastLoginIp = ipAddress;

        // 2FA check
        if (user.TwoFaEnabled)
        {
            var tempToken = jwt.GenerateTempToken(user.Id, "2fa");
            await db.SaveChangesAsync(ct);

            var userDto = MapUserDto(user);
            return Result<LoginResponse>.Success(new LoginResponse(
                tempToken, string.Empty, DateTime.UtcNow.AddMinutes(5), userDto, RequiresTwoFa: true
            ));
        }

        var response = await IssueTokensAsync(user, tenant, ipAddress, request.DeviceId, request.DeviceName, ct);
        return Result<LoginResponse>.Success(response);
    }

    public async Task<Result<LoginResponse>> VerifyTwoFaAsync(VerifyTwoFaRequest request, string ipAddress, CancellationToken ct = default)
    {
        var principal = jwt.ValidateToken(request.TempToken);
        if (principal is null)
            return Result<LoginResponse>.Failure("Invalid or expired token", 401);

        var purpose = principal.FindFirst("purpose")?.Value;
        if (purpose != "2fa")
            return Result<LoginResponse>.Failure("Invalid token purpose", 401);

        var userId = Guid.Parse(principal.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value!);
        var user = await db.Users.Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user is null || !user.TwoFaEnabled || user.TwoFaSecret is null)
            return Result<LoginResponse>.Failure("Invalid request", 401);

        var totp = new Totp(Base32Encoding.ToBytes(user.TwoFaSecret));
        if (!totp.VerifyTotp(request.Code, out _, VerificationWindow.RfcSpecifiedNetworkDelay))
            return Result<LoginResponse>.Failure("Invalid 2FA code", 401);

        var tenant = await db.Tenants.FindAsync([user.TenantId], ct);
        var response = await IssueTokensAsync(user, tenant!, ipAddress, null, null, ct);
        return Result<LoginResponse>.Success(response);
    }

    public async Task<Result<LoginResponse>> RefreshTokenAsync(RefreshTokenRequest request, string ipAddress, CancellationToken ct = default)
    {
        var hash = jwt.HashToken(request.RefreshToken);
        var token = await db.RefreshTokens
            .Include(r => r.User!.Role)
            .FirstOrDefaultAsync(r => r.TokenHash == hash, ct);

        if (token is null || !token.IsActive)
            return Result<LoginResponse>.Failure("Invalid or expired refresh token", 401);

        token.RevokedAt = DateTime.UtcNow;

        var tenant = await db.Tenants.FindAsync([token.TenantId], ct);
        var response = await IssueTokensAsync(token.User!, tenant!, ipAddress, null, null, ct);
        return Result<LoginResponse>.Success(response);
    }

    public async Task<Result<bool>> LogoutAsync(Guid userId, LogoutRequest request, CancellationToken ct = default)
    {
        var hash = jwt.HashToken(request.RefreshToken);
        var token = await db.RefreshTokens
            .FirstOrDefaultAsync(r => r.UserId == userId && r.TokenHash == hash, ct);

        if (token is not null)
        {
            token.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return Result<bool>.Success(true);
    }

    public async Task<Result<ForgotPasswordResult>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == request.TenantSlug, ct);
        if (tenant is null)
            return Result<ForgotPasswordResult>.Failure("Invalid school ID", 404);

        User? user = null;
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var emailLower = request.Email.Trim().ToLower();
            user = await db.Users.FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.Email != null && u.Email.ToLower() == emailLower, ct);
        }
        else if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            user = await db.Users.FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.Phone == request.Phone.Trim(), ct);
        }

        if (user is null)
            return Result<ForgotPasswordResult>.Failure("No account found with those details", 404);

        var otp = GenerateOtp();
        var otpHash = BCrypt.Net.BCrypt.HashPassword(otp);
        var key = $"pwd_reset:{user.Id}";
        await cache.SetStringAsync(key, otpHash, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15)
        }, ct);

        var token = jwt.GenerateTempToken(user.Id, "pwd_reset");
        // TODO: send OTP via email/SMS. For now returned in response.
        return Result<ForgotPasswordResult>.Success(new ForgotPasswordResult(token, otp));
    }

    public async Task<Result<bool>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var principal = jwt.ValidateToken(request.Token);
        if (principal is null)
            return Result<bool>.Failure("Invalid or expired token", 401);

        var userId = Guid.Parse(principal.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value!);
        var key = $"pwd_reset:{userId}";
        var otpHash = await cache.GetStringAsync(key, ct);

        if (otpHash is null || !BCrypt.Net.BCrypt.Verify(request.Otp, otpHash))
            return Result<bool>.Failure("Invalid or expired OTP", 401);

        var user = await db.Users.FindAsync([userId], ct);
        if (user is null) return Result<bool>.Failure("User not found", 404);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.FailedLoginCount = 0;
        user.LockedUntil = null;

        await cache.RemoveAsync(key, ct);
        await db.SaveChangesAsync(ct);

        // Revoke all refresh tokens
        await db.RefreshTokens
            .Where(r => r.UserId == userId && r.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.RevokedAt, DateTime.UtcNow), ct);

        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct);
        if (user is null) return Result<bool>.NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return Result<bool>.Failure("Current password is incorrect");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await db.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<string>> SetupTwoFaAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct);
        if (user is null) return Result<string>.NotFound();

        var secret = Base32Encoding.ToString(KeyGeneration.GenerateRandomKey(20));
        user.TwoFaSecret = secret;
        await db.SaveChangesAsync(ct);

        return Result<string>.Success(secret);
    }

    public async Task<Result<bool>> EnableTwoFaAsync(Guid userId, SetupTwoFaRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct);
        if (user is null || user.TwoFaSecret is null) return Result<bool>.NotFound();

        var totp = new Totp(Base32Encoding.ToBytes(user.TwoFaSecret));
        if (!totp.VerifyTotp(request.Code, out _, VerificationWindow.RfcSpecifiedNetworkDelay))
            return Result<bool>.Failure("Invalid code");

        user.TwoFaEnabled = true;
        await db.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> VerifyEmailAsync(Guid userId, string otp, CancellationToken ct = default)
    {
        var key = $"email_verify:{userId}";
        var otpHash = await cache.GetStringAsync(key, ct);
        if (otpHash is null || !BCrypt.Net.BCrypt.Verify(otp, otpHash))
            return Result<bool>.Failure("Invalid or expired OTP");

        var user = await db.Users.FindAsync([userId], ct);
        if (user is null) return Result<bool>.NotFound();

        user.EmailVerified = true;
        if (user.Status == UserStatus.PendingVerification)
            user.Status = UserStatus.Active;

        await cache.RemoveAsync(key, ct);
        await db.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> VerifyPhoneAsync(Guid userId, string otp, CancellationToken ct = default)
    {
        var key = $"phone_verify:{userId}";
        var otpHash = await cache.GetStringAsync(key, ct);
        if (otpHash is null || !BCrypt.Net.BCrypt.Verify(otp, otpHash))
            return Result<bool>.Failure("Invalid or expired OTP");

        var user = await db.Users.FindAsync([userId], ct);
        if (user is null) return Result<bool>.NotFound();

        user.PhoneVerified = true;
        if (user.Status == UserStatus.PendingVerification)
            user.Status = UserStatus.Active;

        await cache.RemoveAsync(key, ct);
        await db.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    private async Task<LoginResponse> IssueTokensAsync(User user, Tenant tenant, string ipAddress,
        string? deviceId, string? deviceName, CancellationToken ct)
    {
        var roleCode = user.Role?.Code ?? "student";
        var permissions = user.Role?.Permissions.ToArray() ?? [];
        var accessToken = jwt.GenerateAccessToken(user, roleCode, permissions);
        var rawRefresh = jwt.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            TenantId = user.TenantId,
            TokenHash = jwt.HashToken(rawRefresh),
            IpAddress = ipAddress,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            DeviceInfo = deviceId is not null
                ? new Dictionary<string, object> { ["deviceId"] = deviceId, ["deviceName"] = deviceName ?? "" }
                : new()
        };

        db.RefreshTokens.Add(refreshToken);
        await db.SaveChangesAsync(ct);

        return new LoginResponse(
            accessToken,
            rawRefresh,
            DateTime.UtcNow.AddMinutes(15),
            MapUserDto(user),
            RequiresTwoFa: false
        );
    }

    private static UserDto MapUserDto(User user) => new(
        user.Id,
        user.TenantId,
        user.FullName,
        user.Email,
        user.Phone,
        user.ProfilePicture,
        user.Role?.Code ?? "",
        user.Role?.Permissions.ToArray() ?? []
    );

    private static string GenerateOtp() =>
        Random.Shared.Next(100000, 999999).ToString();
}
