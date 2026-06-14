using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

// ─── Controller ───────────────────────────────────────────────────────────────
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ── Stats ─────────────────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalAssets = await db.Set<Asset>().CountAsync(a => a.TenantId == tenant.TenantId && a.Condition != "disposed");
        var assetValue = await db.Set<Asset>().Where(a => a.TenantId == tenant.TenantId && a.Condition != "disposed").SumAsync(a => (decimal?)a.PurchasePrice) ?? 0;
        var stockItems = await db.Set<StockItem>().Where(s => s.TenantId == tenant.TenantId).ToListAsync();
        var lowStock = stockItems.Count(s => s.CurrentStock <= s.MinimumStock);
        var pendingOrders = await db.Set<PurchaseOrder>().CountAsync(p => p.TenantId == tenant.TenantId && p.Status == "ordered");

        return Ok(new
        {
            totalAssets,
            assetValue,
            totalStockItems = stockItems.Count,
            lowStockAlerts = lowStock,
            pendingOrders,
        });
    }

    // ── Asset Categories ──────────────────────────────────────────────────
    [HttpGet("asset-categories")]
    public async Task<IActionResult> GetAssetCategories()
    {
        var items = await db.Set<AssetCategory>().Where(c => c.TenantId == tenant.TenantId).ToListAsync();
        return Ok(items);
    }

    [HttpPost("asset-categories")]
    public async Task<IActionResult> CreateAssetCategory([FromBody] CreateCategoryRequest req)
    {
        var cat = new AssetCategory { TenantId = tenant.TenantId, Name = req.Name, Description = req.Description };
        db.Set<AssetCategory>().Add(cat);
        await db.SaveChangesAsync();
        return Ok(cat);
    }

    // ── Assets ────────────────────────────────────────────────────────────
    [HttpGet("assets")]
    public async Task<IActionResult> GetAssets([FromQuery] string? search, [FromQuery] Guid? categoryId, [FromQuery] string? condition, [FromQuery] int page = 1, [FromQuery] int pageSize = 30)
    {
        var q = db.Set<Asset>().Where(a => a.TenantId == tenant.TenantId).Include(a => a.Category).AsQueryable();
        if (!string.IsNullOrEmpty(search))
            q = q.Where(a => a.Name.Contains(search) || (a.AssetCode != null && a.AssetCode.Contains(search)));
        if (categoryId.HasValue) q = q.Where(a => a.CategoryId == categoryId.Value);
        if (!string.IsNullOrEmpty(condition)) q = q.Where(a => a.Condition == condition);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new
            {
                a.Id, a.Name, a.AssetCode, a.SerialNumber, a.Brand, a.Model,
                a.Location, a.Condition, a.PurchasePrice, a.PurchaseDate,
                a.WarrantyExpiry, a.AssignedToName,
                CategoryName = a.Category != null ? a.Category.Name : "",
            })
            .ToListAsync();
        return Ok(new { items, total, page, pageSize });
    }

    [HttpPost("assets")]
    public async Task<IActionResult> CreateAsset([FromBody] CreateAssetRequest req)
    {
        var count = await db.Set<Asset>().CountAsync(a => a.TenantId == tenant.TenantId) + 1;
        var asset = new Asset
        {
            TenantId = tenant.TenantId,
            CategoryId = req.CategoryId,
            Name = req.Name,
            AssetCode = $"AST/{count:D4}",
            SerialNumber = req.SerialNumber,
            Brand = req.Brand,
            Model = req.Model,
            Location = req.Location,
            PurchasePrice = req.PurchasePrice,
            PurchaseDate = req.PurchaseDate,
            WarrantyExpiry = req.WarrantyExpiry,
        };
        db.Set<Asset>().Add(asset);
        await db.SaveChangesAsync();
        return Ok(asset);
    }

    [HttpPut("assets/{id}")]
    public async Task<IActionResult> UpdateAsset(Guid id, [FromBody] UpdateAssetRequest req)
    {
        var asset = await db.Set<Asset>().FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenant.TenantId);
        if (asset == null) return NotFound();
        asset.Location = req.Location;
        asset.Condition = req.Condition;
        asset.AssignedTo = req.AssignedTo;
        asset.AssignedToName = req.AssignedToName;
        await db.SaveChangesAsync();
        return Ok(asset);
    }

    // ── Stock ─────────────────────────────────────────────────────────────
    [HttpGet("stock")]
    public async Task<IActionResult> GetStock([FromQuery] string? search, [FromQuery] bool? lowStock)
    {
        var q = db.Set<StockItem>().Where(s => s.TenantId == tenant.TenantId).Include(s => s.Category).AsQueryable();
        if (!string.IsNullOrEmpty(search))
            q = q.Where(s => s.Name.Contains(search));
        if (lowStock == true)
            q = q.Where(s => s.CurrentStock <= s.MinimumStock);

        var items = await q.OrderBy(s => s.Name)
            .Select(s => new
            {
                s.Id, s.Name, s.ItemCode, s.CurrentStock, s.MinimumStock,
                s.Unit, s.UnitPrice, s.Supplier,
                IsLow = s.CurrentStock <= s.MinimumStock,
                StockValue = s.CurrentStock * s.UnitPrice,
                CategoryName = s.Category != null ? s.Category.Name : "",
            })
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("stock")]
    public async Task<IActionResult> CreateStockItem([FromBody] CreateStockItemRequest req)
    {
        var item = new StockItem
        {
            TenantId = tenant.TenantId,
            CategoryId = req.CategoryId,
            Name = req.Name,
            Unit = req.Unit,
            MinimumStock = req.MinimumStock,
            UnitPrice = req.UnitPrice,
            Supplier = req.Supplier,
        };
        db.Set<StockItem>().Add(item);
        await db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPost("stock/{id}/transaction")]
    public async Task<IActionResult> StockTransaction(Guid id, [FromBody] StockTransactionRequest req)
    {
        var item = await db.Set<StockItem>().FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenant.TenantId);
        if (item == null) return NotFound();

        var before = item.CurrentStock;
        var after = req.Type switch
        {
            "in" => before + req.Quantity,
            "out" => before - req.Quantity,
            "adjustment" => req.Quantity,
            _ => before,
        };

        if (after < 0) return BadRequest(new { message = "Insufficient stock" });

        var tx = new StockTransaction
        {
            TenantId = tenant.TenantId,
            StockItemId = id,
            Type = req.Type,
            Quantity = req.Quantity,
            StockBefore = before,
            StockAfter = after,
            Reason = req.Reason,
            Reference = req.Reference,
            CreatedBy = tenant.UserId,
        };
        item.CurrentStock = after;
        item.UpdatedAt = DateTime.UtcNow;

        db.Set<StockTransaction>().Add(tx);
        await db.SaveChangesAsync();
        return Ok(new { transaction = tx, currentStock = after });
    }

    [HttpGet("stock/{id}/transactions")]
    public async Task<IActionResult> GetTransactions(Guid id, [FromQuery] int page = 1)
    {
        var items = await db.Set<StockTransaction>()
            .Where(t => t.StockItemId == id && t.TenantId == tenant.TenantId)
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * 30).Take(30)
            .ToListAsync();
        return Ok(items);
    }

    // ── Purchase Orders ────────────────────────────────────────────────────
    [HttpGet("purchase-orders")]
    public async Task<IActionResult> GetPurchaseOrders([FromQuery] string? status)
    {
        var q = db.Set<PurchaseOrder>()
            .Where(p => p.TenantId == tenant.TenantId)
            .Include(p => p.Items);
        if (!string.IsNullOrEmpty(status))
            q = (Microsoft.EntityFrameworkCore.Query.IIncludableQueryable<PurchaseOrder, List<PurchaseOrderItem>>)q.Where(p => p.Status == status);

        var items = await q.OrderByDescending(p => p.OrderDate).Take(100).ToListAsync();
        return Ok(items);
    }

    [HttpPost("purchase-orders")]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderRequest req)
    {
        var count = await db.Set<PurchaseOrder>().CountAsync(p => p.TenantId == tenant.TenantId) + 1;
        var po = new PurchaseOrder
        {
            TenantId = tenant.TenantId,
            PoNumber = $"PO/{DateTime.Now:yy}/{count:D4}",
            Supplier = req.Supplier,
            SupplierContact = req.SupplierContact,
            ExpectedDate = req.ExpectedDate,
            Notes = req.Notes,
            Items = req.Items.Select(i => new PurchaseOrderItem
            {
                ItemName = i.ItemName,
                StockItemId = i.StockItemId,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
            }).ToList(),
        };
        po.TotalAmount = po.Items.Sum(i => i.Total);
        db.Set<PurchaseOrder>().Add(po);
        await db.SaveChangesAsync();
        return Ok(po);
    }

    [HttpPost("purchase-orders/{id}/receive")]
    public async Task<IActionResult> ReceivePurchaseOrder(Guid id)
    {
        var po = await db.Set<PurchaseOrder>()
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenant.TenantId);
        if (po == null) return NotFound();

        po.Status = "received";
        po.ReceivedDate = DateTime.UtcNow;

        // Update stock for linked items
        foreach (var item in po.Items.Where(i => i.StockItemId.HasValue))
        {
            var stock = await db.Set<StockItem>().FindAsync(item.StockItemId!.Value);
            if (stock != null)
            {
                stock.CurrentStock += item.Quantity;
                stock.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync();
        return Ok(po);
    }

    [HttpPatch("purchase-orders/{id}/status")]
    public async Task<IActionResult> UpdatePoStatus(Guid id, [FromBody] UpdatePoStatusRequest req)
    {
        var po = await db.Set<PurchaseOrder>().FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenant.TenantId);
        if (po == null) return NotFound();
        po.Status = req.Status;
        await db.SaveChangesAsync();
        return Ok(po);
    }
}

// ─── Requests ─────────────────────────────────────────────────────────────────
public record CreateCategoryRequest(string Name, string? Description);
public record CreateAssetRequest(Guid CategoryId, string Name, string? SerialNumber, string? Brand, string? Model, string? Location, decimal PurchasePrice, DateTime? PurchaseDate, DateTime? WarrantyExpiry);
public record UpdateAssetRequest(string? Location, string Condition, Guid? AssignedTo, string? AssignedToName);
public record CreateStockItemRequest(Guid CategoryId, string Name, string? Unit, int MinimumStock, decimal UnitPrice, string? Supplier);
public record StockTransactionRequest(string Type, int Quantity, string? Reason, string? Reference);
public record CreatePurchaseOrderRequest(string Supplier, string? SupplierContact, DateTime? ExpectedDate, string? Notes, List<PoItemRequest> Items);
public record PoItemRequest(string ItemName, Guid? StockItemId, int Quantity, decimal UnitPrice);
public record UpdatePoStatusRequest(string Status);
