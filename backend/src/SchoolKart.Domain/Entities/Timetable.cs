namespace SchoolKart.Domain.Entities;

public class TimetableTemplate : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public List<string> WorkingDays { get; set; } = new();
    public ICollection<TimetablePeriod> Periods { get; set; } = new List<TimetablePeriod>();
}

public class TimetablePeriod : TenantEntity
{
    public Guid TemplateId { get; set; }
    public int PeriodNumber { get; set; }
    public string? Name { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsBreak { get; set; }
    public TimetableTemplate? Template { get; set; }
}

public class TimetableEntry : TenantEntity
{
    public Guid AcademicYearId { get; set; }
    public Guid ClassId { get; set; }
    public Guid SectionId { get; set; }
    public Guid PeriodId { get; set; }
    public string DayOfWeek { get; set; } = string.Empty;
    public Guid? SubjectId { get; set; }
    public Guid? EmployeeId { get; set; }
    public string? Room { get; set; }
    public bool IsActive { get; set; } = true;
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public Guid? CreatedBy { get; set; }
}

public class ClassTeacher : TenantEntity
{
    public Guid AcademicYearId { get; set; }
    public Guid ClassId { get; set; }
    public Guid SectionId { get; set; }
    public Guid EmployeeId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}

public class LessonPlan : TenantEntity
{
    public Guid? TimetableEntryId { get; set; }
    public Guid EmployeeId { get; set; }
    public Guid SubjectId { get; set; }
    public Guid ClassId { get; set; }
    public Guid? SectionId { get; set; }
    public Guid AcademicYearId { get; set; }
    public DateOnly Date { get; set; }
    public string Topic { get; set; } = string.Empty;
    public string? Chapter { get; set; }
    public string? Objectives { get; set; }
    public string? Materials { get; set; }
    public string? Activities { get; set; }
    public string? Methodology { get; set; }
    public string? Homework { get; set; }
    public string? Assessment { get; set; }
    public string Status { get; set; } = "Draft";
    public Guid? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewComments { get; set; }
}

public class AcademicCalendarEvent : TenantEntity
{
    public Guid AcademicYearId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string EventType { get; set; } = "General";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsHoliday { get; set; }
    public string AppliesTo { get; set; } = "All";
    public Guid? ClassId { get; set; }
    public string? Color { get; set; }
    public Guid? CreatedBy { get; set; }
}
