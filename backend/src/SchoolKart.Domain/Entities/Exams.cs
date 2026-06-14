using SchoolKart.Domain.Enums;

namespace SchoolKart.Domain.Entities;

public class Subject : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public SubjectType Type { get; set; } = SubjectType.Core;
    public bool IsActive { get; set; } = true;
}

public class Exam : TenantEntity
{
    public Guid AcademicYearId { get; set; }
    public Guid? ExamTermId { get; set; }
    public string Name { get; set; } = string.Empty;
    public ExamType Type { get; set; } = ExamType.UnitTest;
    public Guid? ClassId { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsPublished { get; set; }
    public Guid? CreatedBy { get; set; }
    public ICollection<ExamSchedule> Schedules { get; set; } = new List<ExamSchedule>();
}

public class ExamSchedule : TenantEntity
{
    public Guid ExamId { get; set; }
    public Guid SectionId { get; set; }
    public Guid SubjectId { get; set; }
    public DateOnly ExamDate { get; set; }
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public decimal MaxMarks { get; set; }
    public decimal PassMarks { get; set; }
    public string? RoomNumber { get; set; }
    public Guid? InvigilatorId { get; set; }
    public Exam? Exam { get; set; }
    public Section? Section { get; set; }
    public Subject? Subject { get; set; }
    public ICollection<StudentMark> Marks { get; set; } = new List<StudentMark>();
}

public class StudentMark : TenantEntity
{
    public Guid ExamScheduleId { get; set; }
    public Guid StudentId { get; set; }
    public decimal? MarksObtained { get; set; }
    public string? Grade { get; set; }
    public bool IsAbsent { get; set; }
    public bool IsExempted { get; set; }
    public bool IsPass { get; set; }
    public decimal MaxMarks { get; set; }
    public string? Remarks { get; set; }
    public Guid? EnteredBy { get; set; }
    public DateTime? EnteredAt { get; set; }
    public ExamSchedule? ExamSchedule { get; set; }
    public Student? Student { get; set; }
}
