using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Domain.Enums;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/library")]
[Authorize]
public class LibraryController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ── Books ────────────────────────────────────────────────────

    [HttpGet("books")]
    public async Task<IActionResult> GetBooks(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? available = null,
        CancellationToken ct = default)
    {
        var q = db.Set<Book>().Where(b => b.TenantId == tenant.TenantId && b.IsActive);

        if (!string.IsNullOrEmpty(search))
            q = q.Where(b => b.Title.Contains(search) || b.Author!.Contains(search) ||
                             b.Isbn!.Contains(search) || b.Barcode!.Contains(search));

        if (!string.IsNullOrEmpty(category))
            q = q.Where(b => b.Category == category);

        if (available.HasValue)
            q = available.Value
                ? q.Where(b => b.AvailableCopies > 0)
                : q.Where(b => b.AvailableCopies == 0);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderBy(b => b.Title)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new
            {
                b.Id, b.Isbn, b.Title, b.Author, b.Publisher,
                b.Edition, b.Category, b.TotalCopies, b.AvailableCopies,
                b.RackNumber, b.Barcode, b.Price, b.CoverUrl
            })
            .ToListAsync(ct);

        return Ok(new PagedResult<object> { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("books/{id:guid}")]
    public async Task<IActionResult> GetBook(Guid id, CancellationToken ct)
    {
        var book = await db.Set<Book>()
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenant.TenantId, ct);
        return book is null ? NotFound() : Ok(book);
    }

    [HttpPost("books")]
    public async Task<IActionResult> AddBook([FromBody] AddBookRequest req, CancellationToken ct)
    {
        var book = new Book
        {
            TenantId = tenant.TenantId,
            Isbn = req.Isbn,
            Title = req.Title,
            Author = req.Author,
            Publisher = req.Publisher,
            Edition = req.Edition,
            PublicationYear = req.PublicationYear,
            Category = req.Category,
            TotalCopies = req.TotalCopies,
            AvailableCopies = req.TotalCopies,
            RackNumber = req.RackNumber,
            Barcode = req.Barcode ?? req.Isbn,
            Price = req.Price,
            Description = req.Description
        };
        db.Set<Book>().Add(book);
        await db.SaveChangesAsync(ct);
        return Created($"/api/library/books/{book.Id}", new { book.Id });
    }

    [HttpPut("books/{id:guid}")]
    public async Task<IActionResult> UpdateBook(Guid id, [FromBody] AddBookRequest req, CancellationToken ct)
    {
        var book = await db.Set<Book>()
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenant.TenantId, ct);

        if (book is null) return NotFound();

        book.Title = req.Title;
        book.Author = req.Author;
        book.Publisher = req.Publisher;
        book.Edition = req.Edition;
        book.Category = req.Category;
        book.RackNumber = req.RackNumber;
        book.Price = req.Price;
        book.Description = req.Description;
        book.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Book Issues ──────────────────────────────────────────────

    [HttpPost("issues")]
    public async Task<IActionResult> IssueBook([FromBody] IssueBookRequest req, CancellationToken ct)
    {
        var book = await db.Set<Book>()
            .FirstOrDefaultAsync(b => b.Id == req.BookId && b.TenantId == tenant.TenantId, ct);

        if (book is null) return NotFound("Book not found");
        if (book.AvailableCopies <= 0) return BadRequest("No copies available");

        // Check if borrower already has this book
        var existing = await db.Set<BookIssue>()
            .AnyAsync(i => i.BookId == req.BookId &&
                (req.StudentId.HasValue ? i.StudentId == req.StudentId : i.EmployeeId == req.EmployeeId) &&
                i.ReturnDate == null, ct);

        if (existing) return BadRequest("Borrower already has this book issued");

        var issue = new BookIssue
        {
            TenantId = tenant.TenantId,
            BookId = req.BookId,
            BorrowerType = req.StudentId.HasValue ? "student" : "employee",
            StudentId = req.StudentId,
            EmployeeId = req.EmployeeId,
            IssuedBy = tenant.UserId,
            IssueDate = DateOnly.FromDateTime(DateTime.UtcNow),
            DueDate = req.DueDate,
            Status = BookStatus.Issued
        };

        book.AvailableCopies--;
        db.Set<BookIssue>().Add(issue);
        await db.SaveChangesAsync(ct);

        return Created($"/api/library/issues/{issue.Id}", new { issue.Id });
    }

    [HttpPost("issues/{id:guid}/return")]
    public async Task<IActionResult> ReturnBook(Guid id, CancellationToken ct)
    {
        var issue = await db.Set<BookIssue>()
            .Include(i => i.Book)
            .FirstOrDefaultAsync(i => i.Id == id && i.TenantId == tenant.TenantId && i.ReturnDate == null, ct);

        if (issue is null) return NotFound("Issue record not found or already returned");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        issue.ReturnDate = today;
        issue.Status = BookStatus.Available;

        // Fine: ₹2 per day overdue
        if (today > issue.DueDate)
        {
            issue.FineAmount = (today.DayNumber - issue.DueDate.DayNumber) * 2m;
        }

        issue.Book!.AvailableCopies++;
        await db.SaveChangesAsync(ct);

        return Ok(new { returned = true, fineAmount = issue.FineAmount });
    }

    [HttpGet("issues/active")]
    public async Task<IActionResult> GetActiveIssues(
        [FromQuery] string? borrowerType = null,
        [FromQuery] bool? overdue = null,
        CancellationToken ct = default)
    {
        var q = db.Set<BookIssue>()
            .Include(i => i.Book)
            .Include(i => i.Student)
            .Include(i => i.Employee!.User)
            .Where(i => i.TenantId == tenant.TenantId && i.ReturnDate == null);

        if (!string.IsNullOrEmpty(borrowerType))
            q = q.Where(i => i.BorrowerType == borrowerType);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (overdue == true)
            q = q.Where(i => i.DueDate < today);

        var issues = await q
            .OrderBy(i => i.DueDate)
            .Select(i => new
            {
                i.Id,
                Book = new { i.Book!.Title, i.Book.Author, i.Book.Barcode },
                BorrowerName = i.StudentId.HasValue
                    ? i.Student!.FirstName + " " + i.Student.LastName
                    : i.Employee!.User!.FirstName + " " + i.Employee.User.LastName,
                i.BorrowerType,
                i.IssueDate,
                i.DueDate,
                IsOverdue = i.DueDate < today,
                OverdueDays = i.DueDate < today ? today.DayNumber - i.DueDate.DayNumber : 0,
                EstimatedFine = i.DueDate < today ? (today.DayNumber - i.DueDate.DayNumber) * 2m : 0
            })
            .ToListAsync(ct);

        return Ok(issues);
    }

    [HttpGet("issues/history")]
    public async Task<IActionResult> GetIssueHistory(
        [FromQuery] Guid? studentId,
        [FromQuery] Guid? employeeId,
        CancellationToken ct = default)
    {
        var q = db.Set<BookIssue>()
            .Include(i => i.Book)
            .Where(i => i.TenantId == tenant.TenantId);

        if (studentId.HasValue) q = q.Where(i => i.StudentId == studentId);
        if (employeeId.HasValue) q = q.Where(i => i.EmployeeId == employeeId);

        var history = await q
            .OrderByDescending(i => i.IssueDate)
            .Select(i => new
            {
                i.Id,
                i.Book!.Title,
                i.IssueDate,
                i.DueDate,
                i.ReturnDate,
                i.FineAmount,
                i.FinePaid,
                Status = i.ReturnDate == null ? "Issued" : "Returned"
            })
            .ToListAsync(ct);

        return Ok(history);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var totalBooks = await db.Set<Book>().CountAsync(b => b.TenantId == tenant.TenantId && b.IsActive, ct);
        var totalCopies = await db.Set<Book>().Where(b => b.TenantId == tenant.TenantId).SumAsync(b => b.TotalCopies, ct);
        var issued = await db.Set<BookIssue>().CountAsync(i => i.TenantId == tenant.TenantId && i.ReturnDate == null, ct);
        var overdue = await db.Set<BookIssue>().CountAsync(i => i.TenantId == tenant.TenantId && i.ReturnDate == null && i.DueDate < today, ct);

        return Ok(new { totalBooks, totalCopies, issued, overdue, available = totalCopies - issued });
    }
}

// Request records
public record AddBookRequest(
    string? Isbn, string Title, string? Author, string? Publisher,
    string? Edition, int? PublicationYear, string? Category,
    int TotalCopies, string? RackNumber, string? Barcode,
    decimal? Price, string? Description);

public record IssueBookRequest(
    Guid BookId, Guid? StudentId, Guid? EmployeeId, DateOnly DueDate);
