namespace SchoolKart.Domain.Entities;

public class Department : TenantEntity
{
    public Guid? CampusId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public Guid? HeadId { get; set; }
    public bool IsActive { get; set; } = true;
    public User? Head { get; set; }
    public Campus? Campus { get; set; }
}
