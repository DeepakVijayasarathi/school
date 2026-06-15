namespace SchoolKart.Domain.Entities;

public class ReportCardTemplate : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public bool ShowAttendance { get; set; } = true;
    public bool ShowRank { get; set; } = true;
    public bool ShowGrade { get; set; } = true;
    public bool ShowRemarks { get; set; } = true;
    public bool ShowSignature { get; set; } = true;
    public string? HeaderText { get; set; }
    public string? FooterText { get; set; }
    public string? SchoolLogoUrl { get; set; }
    public string GradeScale { get; set; } = "standard";  // standard|custom
    public string GradeConfig { get; set; } = "[]";        // JSON array of grade bands
    public bool IsDefault { get; set; }
}
