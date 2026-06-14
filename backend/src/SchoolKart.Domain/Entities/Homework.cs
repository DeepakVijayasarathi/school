namespace SchoolKart.Domain.Entities;

public class Homework : TenantEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Subject { get; set; }
    public Guid? ClassId { get; set; }
    public Guid? SectionId { get; set; }
    public DateOnly? DueDate { get; set; }
    public string SubmissionType { get; set; } = "written";
    public int? MaxMarks { get; set; }
    public string Status { get; set; } = "active";
    public Guid? CreatedBy { get; set; }

    public Class? Class { get; set; }
    public Section? Section { get; set; }
}
