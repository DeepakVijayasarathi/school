using SchoolKart.Domain.Enums;

namespace SchoolKart.Domain.Entities;

public class FeeCategory : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public ICollection<FeeStructure> Structures { get; set; } = new List<FeeStructure>();
}

public class FeeStructure : TenantEntity
{
    public Guid AcademicYearId { get; set; }
    public Guid? ClassId { get; set; }
    public Guid CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public FeeFrequency Frequency { get; set; } = FeeFrequency.OneTime;
    public int? DueDay { get; set; }
    public bool IsOptional { get; set; }
    public bool IsActive { get; set; } = true;
    public FeeCategory? Category { get; set; }
    public Class? Class { get; set; }
}

public class StudentFee : TenantEntity
{
    public Guid StudentId { get; set; }
    public Guid AcademicYearId { get; set; }
    public Guid FeeStructureId { get; set; }
    public Guid FeeCategoryId { get; set; }
    public decimal Amount { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? DiscountReason { get; set; }
    public decimal FinalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public DateOnly? DueDate { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public Student? Student { get; set; }
    public FeeStructure? FeeStructure { get; set; }
}

public class FeePayment : TenantEntity
{
    public Guid StudentFeeId { get; set; }
    public Guid StudentId { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; } = PaymentMethod.Cash;
    public string? TransactionId { get; set; }
    public string? Gateway { get; set; }
    public string? ChequeNumber { get; set; }
    public DateOnly? ChequeDate { get; set; }
    public string? BankName { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public Guid? CollectedBy { get; set; }
    public string? Notes { get; set; }
    public bool IsRefunded { get; set; }
    public decimal? RefundAmount { get; set; }
    public DateTime? RefundedAt { get; set; }
    public Student? Student { get; set; }
    public StudentFee? StudentFee { get; set; }

    // Aliases for backward compat with controllers
    public decimal AmountPaid => Amount;
    public PaymentMethod PaymentMethod => Method;
}
