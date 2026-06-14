namespace SchoolKart.Application.Common;

public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Data { get; }
    public string? Error { get; }
    public int StatusCode { get; }

    private Result(bool success, T? data, string? error, int statusCode)
    {
        IsSuccess = success;
        Data = data;
        Error = error;
        StatusCode = statusCode;
    }

    public static Result<T> Success(T data, int statusCode = 200) =>
        new(true, data, null, statusCode);

    public static Result<T> Failure(string error, int statusCode = 400) =>
        new(false, default, error, statusCode);

    public static Result<T> NotFound(string error = "Resource not found") =>
        new(false, default, error, 404);

    public static Result<T> Unauthorized(string error = "Unauthorized") =>
        new(false, default, error, 401);

    public static Result<T> Forbidden(string error = "Access denied") =>
        new(false, default, error, 403);
}

public class PagedResult<T>
{
    public IEnumerable<T> Items { get; set; } = Enumerable.Empty<T>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}
