namespace SchoolKart.Domain.Entities;

public class ExamResult : TenantEntity
{
    public Guid StudentId { get; set; }
    public Guid ExamId { get; set; }
    public Guid ExamScheduleId { get; set; }
    public Guid SubjectId { get; set; }
    public decimal? MarksObtained { get; set; }
    public decimal MaxMarks { get; set; }
    public string? Grade { get; set; }
    public bool IsAbsent { get; set; }
    public string? Remarks { get; set; }
}
