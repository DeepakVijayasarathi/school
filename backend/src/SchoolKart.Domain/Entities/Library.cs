using SchoolKart.Domain.Enums;

namespace SchoolKart.Domain.Entities;

public class Book : TenantEntity
{
    public string? Isbn { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Author { get; set; }
    public string? Publisher { get; set; }
    public string? Edition { get; set; }
    public int? PublicationYear { get; set; }
    public string? Category { get; set; }
    public Guid? SubjectId { get; set; }
    public int TotalCopies { get; set; }
    public int AvailableCopies { get; set; }
    public string? RackNumber { get; set; }
    public string? Barcode { get; set; }
    public decimal? Price { get; set; }
    public string? CoverUrl { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<BookIssue> Issues { get; set; } = new List<BookIssue>();
}

public class BookIssue : TenantEntity
{
    public Guid BookId { get; set; }
    public string BorrowerType { get; set; } = "Student";
    public Guid? StudentId { get; set; }
    public Guid? EmployeeId { get; set; }
    public Guid? IssuedBy { get; set; }
    public DateOnly IssueDate { get; set; }
    public DateOnly DueDate { get; set; }
    public DateOnly? ReturnDate { get; set; }
    public decimal FineAmount { get; set; }
    public bool FinePaid { get; set; }
    public BookStatus Status { get; set; } = BookStatus.Issued;
    public string? Remarks { get; set; }
    public Book? Book { get; set; }
    public Student? Student { get; set; }
    public Employee? Employee { get; set; }
}
