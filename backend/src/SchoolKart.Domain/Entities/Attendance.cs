using SchoolKart.Domain.Enums;

namespace SchoolKart.Domain.Entities;

public class StudentAttendance : TenantEntity
{
    public Guid StudentId { get; set; }
    public Guid SectionId { get; set; }
    public Guid AcademicYearId { get; set; }
    public DateOnly Date { get; set; }
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public Guid? MarkedBy { get; set; }
    public int? PeriodNumber { get; set; }
    public Guid? SubjectId { get; set; }
    public string? Remarks { get; set; }

    public Student? Student { get; set; }
    public Section? Section { get; set; }
}

public class StaffAttendance : TenantEntity
{
    public Guid EmployeeId { get; set; }
    public DateOnly Date { get; set; }
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public DateTime? CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }
    public string? BiometricIn { get; set; }
    public string? BiometricOut { get; set; }
    public decimal? WorkHours { get; set; }
    public decimal? Overtime { get; set; }
    public Guid? MarkedBy { get; set; }
    public string? Remarks { get; set; }

    public Employee? Employee { get; set; }
}
