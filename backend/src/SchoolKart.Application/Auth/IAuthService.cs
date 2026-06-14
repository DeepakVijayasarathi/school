using SchoolKart.Application.Common;

namespace SchoolKart.Application.Auth;

public interface IAuthService
{
    Task<Result<LoginResponse>> LoginAsync(LoginRequest request, string ipAddress, CancellationToken ct = default);
    Task<Result<LoginResponse>> RefreshTokenAsync(RefreshTokenRequest request, string ipAddress, CancellationToken ct = default);
    Task<Result<bool>> LogoutAsync(Guid userId, LogoutRequest request, CancellationToken ct = default);
    Task<Result<ForgotPasswordResult>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default);
    Task<Result<bool>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);
    Task<Result<bool>> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default);
    Task<Result<string>> SetupTwoFaAsync(Guid userId, CancellationToken ct = default);
    Task<Result<bool>> EnableTwoFaAsync(Guid userId, SetupTwoFaRequest request, CancellationToken ct = default);
    Task<Result<LoginResponse>> VerifyTwoFaAsync(VerifyTwoFaRequest request, string ipAddress, CancellationToken ct = default);
    Task<Result<bool>> VerifyEmailAsync(Guid userId, string otp, CancellationToken ct = default);
    Task<Result<bool>> VerifyPhoneAsync(Guid userId, string otp, CancellationToken ct = default);
}
