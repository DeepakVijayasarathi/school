namespace SchoolKart.Domain.Entities;

public class AssetCategory : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class Asset : TenantEntity
{
    public Guid CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? AssetCode { get; set; }
    public string? SerialNumber { get; set; }
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public string? Location { get; set; }
    public string Condition { get; set; } = "good";
    public decimal PurchasePrice { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public DateTime? WarrantyExpiry { get; set; }
    public Guid? AssignedTo { get; set; }
    public string? AssignedToName { get; set; }

    public AssetCategory? Category { get; set; }
}

public class StockCategory : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Unit { get; set; }
}

public class StockItem : TenantEntity
{
    public Guid CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public int CurrentStock { get; set; }
    public int MinimumStock { get; set; } = 5;
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Supplier { get; set; }

    public StockCategory? Category { get; set; }
}

public class StockTransaction : TenantEntity
{
    public Guid StockItemId { get; set; }
    public string Type { get; set; } = "in";
    public int Quantity { get; set; }
    public int StockBefore { get; set; }
    public int StockAfter { get; set; }
    public string? Reason { get; set; }
    public string? Reference { get; set; }
    public Guid CreatedBy { get; set; }

    public StockItem? StockItem { get; set; }
}

public class PurchaseOrder : TenantEntity
{
    public string PoNumber { get; set; } = string.Empty;
    public string Supplier { get; set; } = string.Empty;
    public string? SupplierContact { get; set; }
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? ExpectedDate { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public string Status { get; set; } = "draft";
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }

    public List<PurchaseOrderItem> Items { get; set; } = [];
}

public class PurchaseOrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PurchaseOrderId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public Guid? StockItemId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total => Quantity * UnitPrice;
}
