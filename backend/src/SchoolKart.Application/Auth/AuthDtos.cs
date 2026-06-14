using System.ComponentModel.DataAnnotations;

namespace SchoolKart.Application.Auth;

public record LoginRequest(
    [Required] string TenantSlug,
    string? Email,
    string? Phone,
    [Required] string Password,
    string? DeviceId,
    string? DeviceName
);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User,
    bool RequiresTwoFa
);

public record RefreshTokenRequest([Required] string RefreshToken);

public record LogoutRequest([Required] string RefreshToken);

public record ForgotPasswordRequest(
    [Required] string TenantSlug,
    string? Email,
    string? Phone
);

public record ResetPasswordRequest(
    [Required] string Token,
    [Required] string Otp,
    [Required][MinLength(8)] string NewPassword
);

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required][MinLength(8)] string NewPassword
);

public record VerifyTwoFaRequest(
    [Required] string TempToken,
    [Required] string Code
);

public record SetupTwoFaRequest([Required] string Code);

public record UserDto(
    Guid Id,
    Guid TenantId,
    string FullName,
    string? Email,
    string? Phone,
    string? ProfilePicture,
    string Role,
    string[] Permissions
);

public record TenantDto(
    Guid Id,
    string Name,
    string Slug,
    string? LogoUrl,
    string Plan,
    string Currency
);

public record ForgotPasswordResult(
    string Token,
    string? Otp  // returned in non-production environments; null when email/SMS sending is live
);
