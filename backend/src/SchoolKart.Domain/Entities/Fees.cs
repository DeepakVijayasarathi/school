namespace SchoolKart.Domain.Entities;

public class FeeRecord : TenantEntity
{
    public Guid StudentId { get; set; }
    public Guid AcademicYearId { get; set; }
    public Guid FeeTypeId { get; set; }
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "Pending";
    public DateOnly? LastPaymentDate { get; set; }

    public Student? Student { get; set; }
}
