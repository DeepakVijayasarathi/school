namespace SchoolKart.Domain.Entities;

public class AcademicYear : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public bool IsLocked { get; set; }

    public Tenant? Tenant { get; set; }
    public ICollection<Section> Sections { get; set; } = new List<Section>();
}
