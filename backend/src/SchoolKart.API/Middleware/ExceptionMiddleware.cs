using System.Net;
using System.Text.Json;

namespace SchoolKart.API.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception on {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
            await WriteErrorAsync(ctx, ex);
        }
    }

    private static Task WriteErrorAsync(HttpContext ctx, Exception ex)
    {
        ctx.Response.ContentType = "application/json";

        var (status, message) = ex switch
        {
            ArgumentNullException     => (400, "A required argument was missing."),
            ArgumentException         => (400, ex.Message),
            UnauthorizedAccessException => (403, "Access denied."),
            KeyNotFoundException      => (404, "The requested resource was not found."),
            InvalidOperationException => (400, ex.Message),
            OperationCanceledException => (499, "Request cancelled."),
            _ => (500, "An unexpected error occurred. Please try again later.")
        };

        ctx.Response.StatusCode = status;

        var body = JsonSerializer.Serialize(new { error = message }, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        return ctx.Response.WriteAsync(body);
    }
}
