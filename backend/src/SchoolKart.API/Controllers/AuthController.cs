using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Auth;
using SchoolKart.Application.Common;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService, ITenantContext tenantContext) : ControllerBase
{
    private string IpAddress => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await authService.LoginAsync(request, IpAddress, ct);
        return result.IsSuccess ? Ok(result.Data) : StatusCode(result.StatusCode, new { error = result.Error });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        var result = await authService.RefreshTokenAsync(request, IpAddress, ct);
        return result.IsSuccess ? Ok(result.Data) : StatusCode(result.StatusCode, new { error = result.Error });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request, CancellationToken ct)
    {
        var result = await authService.LogoutAsync(tenantContext.UserId, request, ct);
        return result.IsSuccess ? Ok() : StatusCode(result.StatusCode, new { error = result.Error });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        var result = await authService.ForgotPasswordAsync(request, ct);
        if (!result.IsSuccess) return StatusCode(result.StatusCode, new { error = result.Error });
        // OTP is delivered via email/SMS in production; never expose it in the HTTP response
        return Ok(new { message = "OTP sent to your registered email/phone. Use it to reset your password.", token = result.Data!.Token });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var result = await authService.ResetPasswordAsync(request, ct);
        return result.IsSuccess ? Ok() : StatusCode(result.StatusCode, new { error = result.Error });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        var result = await authService.ChangePasswordAsync(tenantContext.UserId, request, ct);
        return result.IsSuccess ? Ok() : StatusCode(result.StatusCode, new { error = result.Error });
    }

    [HttpPost("2fa/setup")]
    [Authorize]
    public async Task<IActionResult> SetupTwoFa(CancellationToken ct)
    {
        var result = await authService.SetupTwoFaAsync(tenantContext.UserId, ct);
        if (!result.IsSuccess) return StatusCode(result.StatusCode, new { error = result.Error });

        // Return secret + TOTP URI for QR code
        var uri = $"otpauth://totp/SchoolKart:{tenantContext.UserId}?secret={result.Data}&issuer=SchoolKart";
        return Ok(new { secret = result.Data, uri });
    }

    [HttpPost("2fa/enable")]
    [Authorize]
    public async Task<IActionResult> EnableTwoFa([FromBody] SetupTwoFaRequest request, CancellationToken ct)
    {
        var result = await authService.EnableTwoFaAsync(tenantContext.UserId, request, ct);
        return result.IsSuccess ? Ok() : StatusCode(result.StatusCode, new { error = result.Error });
    }

    [HttpPost("2fa/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyTwoFa([FromBody] VerifyTwoFaRequest request, CancellationToken ct)
    {
        var result = await authService.VerifyTwoFaAsync(request, IpAddress, ct);
        return result.IsSuccess ? Ok(result.Data) : StatusCode(result.StatusCode, new { error = result.Error });
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile(
        [FromServices] SchoolKart.Infrastructure.Persistence.AppDbContext db,
        CancellationToken ct)
    {
        var user = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == tenantContext.UserId)
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.ProfilePicture })
            .FirstOrDefaultAsync(ct);

        return user is null ? NotFound() : Ok(user);
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateProfileRequest request,
        [FromServices] SchoolKart.Infrastructure.Persistence.AppDbContext db,
        CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenantContext.UserId, ct);
        if (user is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.FirstName)) user.FirstName = request.FirstName.Trim();
        if (!string.IsNullOrWhiteSpace(request.LastName))  user.LastName  = request.LastName.Trim();
        if (!string.IsNullOrWhiteSpace(request.Email))     user.Email     = request.Email.Trim().ToLower();
        if (!string.IsNullOrWhiteSpace(request.Phone))     user.Phone     = request.Phone.Trim();

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpPost("verify-email")]
    [Authorize]
    public async Task<IActionResult> VerifyEmail([FromBody] string otp, CancellationToken ct)
    {
        var result = await authService.VerifyEmailAsync(tenantContext.UserId, otp, ct);
        return result.IsSuccess ? Ok() : StatusCode(result.StatusCode, new { error = result.Error });
    }

    [HttpPost("verify-phone")]
    [Authorize]
    public async Task<IActionResult> VerifyPhone([FromBody] string otp, CancellationToken ct)
    {
        var result = await authService.VerifyPhoneAsync(tenantContext.UserId, otp, ct);
        return result.IsSuccess ? Ok() : StatusCode(result.StatusCode, new { error = result.Error });
    }
}

public record UpdateProfileRequest(string? FirstName, string? LastName, string? Email, string? Phone);
