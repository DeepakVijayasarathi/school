namespace SchoolKart.Domain.Entities;

public class AccountGroup : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string Nature { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<Ledger> Ledgers { get; set; } = new List<Ledger>();
}

public class Ledger : TenantEntity
{
    public Guid AccountGroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public decimal OpeningBalance { get; set; }
    public string OpeningBalanceType { get; set; } = "Debit";
    public bool IsBankAccount { get; set; }
    public string? BankName { get; set; }
    public string? AccountNumber { get; set; }
    public string? IfscCode { get; set; }
    public bool IsCashAccount { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; } = true;
    public AccountGroup? AccountGroup { get; set; }
    public ICollection<VoucherEntry> Entries { get; set; } = new List<VoucherEntry>();
}

public class Voucher : TenantEntity
{
    public string VoucherType { get; set; } = string.Empty;
    public string VoucherNumber { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string? Narration { get; set; }
    public string? Reference { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Draft";
    public bool IsPosted { get; set; }
    public Guid? PostedBy { get; set; }
    public DateTime? PostedAt { get; set; }
    public Guid? CancelledBy { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }
    public Guid? CreatedBy { get; set; }
    public ICollection<VoucherEntry> Entries { get; set; } = new List<VoucherEntry>();
}

public class VoucherEntry : TenantEntity
{
    public Guid VoucherId { get; set; }
    public Guid LedgerId { get; set; }
    public string EntryType { get; set; } = "Debit";
    public decimal Amount { get; set; }
    public string? Narration { get; set; }
    public int SortOrder { get; set; }
    public Ledger? Ledger { get; set; }
    public Voucher? Voucher { get; set; }
}
