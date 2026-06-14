using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

// ─── DTOs ─────────────────────────────────────────────────────
public record AccountGroupDto(Guid Id, string Name, string Nature, Guid? ParentId, bool IsSystem, bool IsActive);
public record LedgerDto(Guid Id, string Name, string? Code, Guid AccountGroupId, string GroupName, string Nature,
    decimal OpeningBalance, string OpeningBalanceType, bool IsBankAccount, bool IsCashAccount, bool IsActive);
public record VoucherSummaryDto(Guid Id, string VoucherNumber, string VoucherType, DateOnly Date,
    decimal TotalAmount, string Status, bool IsPosted, string? Narration);
public record VoucherDetailDto(Guid Id, string VoucherNumber, string VoucherType, DateOnly Date,
    decimal TotalAmount, string Status, bool IsPosted, string? Narration, string? Reference,
    List<VoucherEntryDto> Entries);
public record VoucherEntryDto(Guid LedgerId, string LedgerName, string EntryType, decimal Amount, string? Narration);
public record LedgerStatementRow(DateOnly Date, string VoucherNumber, string VoucherType, string Narration,
    decimal Debit, decimal Credit, decimal Balance);
public record TrialBalanceRow(string LedgerName, string GroupName, string Nature, decimal TotalDebit, decimal TotalCredit, decimal NetBalance);

public record CreateAccountGroupRequest(string Name, string Nature, Guid? ParentId, string? Description, int SortOrder);
public record CreateLedgerRequest(string Name, string? Code, Guid AccountGroupId, string? Description,
    decimal OpeningBalance, string OpeningBalanceType, bool IsBankAccount, string? BankName,
    string? AccountNumber, string? IfscCode, bool IsCashAccount);
public record CreateVoucherRequest(string VoucherType, DateOnly Date, string? Narration, string? Reference,
    List<CreateVoucherEntryRequest> Entries);
public record CreateVoucherEntryRequest(Guid LedgerId, string EntryType, decimal Amount, string? Narration);

[ApiController]
[Route("api/accounting")]
[Authorize]
public class AccountingController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ─── Account Groups ────────────────────────────────────────

    [HttpGet("account-groups")]
    [HttpGet("groups")]
    public async Task<IActionResult> GetAccountGroups(CancellationToken ct)
    {
        var groups = await db.Set<AccountGroup>()
            .Where(g => g.TenantId == tenant.TenantId && g.IsActive)
            .OrderBy(g => g.SortOrder).ThenBy(g => g.Name)
            .Select(g => new AccountGroupDto(g.Id, g.Name, g.Nature, g.ParentId, g.IsSystem, g.IsActive))
            .ToListAsync(ct);
        return Ok(groups);
    }

    [HttpPost("account-groups")]
    public async Task<IActionResult> CreateAccountGroup([FromBody] CreateAccountGroupRequest req, CancellationToken ct)
    {
        var group = new AccountGroup
        {
            TenantId = tenant.TenantId,
            Name = req.Name,
            Nature = req.Nature,
            ParentId = req.ParentId,
            Description = req.Description,
            SortOrder = req.SortOrder
        };
        db.Set<AccountGroup>().Add(group);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = group.Id });
    }

    [HttpPut("account-groups/{id:guid}")]
    public async Task<IActionResult> UpdateAccountGroup(Guid id, [FromBody] CreateAccountGroupRequest req, CancellationToken ct)
    {
        var group = await db.Set<AccountGroup>().FirstOrDefaultAsync(g => g.Id == id && g.TenantId == tenant.TenantId, ct);
        if (group is null) return NotFound();
        if (group.IsSystem) return BadRequest("System groups cannot be modified.");

        group.Name = req.Name;
        group.Nature = req.Nature;
        group.ParentId = req.ParentId;
        group.Description = req.Description;
        group.SortOrder = req.SortOrder;
        group.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("account-groups/{id:guid}")]
    public async Task<IActionResult> DeleteAccountGroup(Guid id, CancellationToken ct)
    {
        var group = await db.Set<AccountGroup>().FirstOrDefaultAsync(g => g.Id == id && g.TenantId == tenant.TenantId, ct);
        if (group is null) return NotFound();
        if (group.IsSystem) return BadRequest("System groups cannot be deleted.");

        var hasLedgers = await db.Set<Ledger>().AnyAsync(l => l.AccountGroupId == id, ct);
        if (hasLedgers) return BadRequest("Cannot delete a group that has ledgers.");

        group.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ─── Ledgers ───────────────────────────────────────────────

    [HttpGet("ledgers")]
    public async Task<IActionResult> GetLedgers([FromQuery] string? nature, [FromQuery] bool? cashBank, CancellationToken ct)
    {
        var q = db.Set<Ledger>()
            .Include(l => l.AccountGroup)
            .Where(l => l.TenantId == tenant.TenantId && l.IsActive);

        if (!string.IsNullOrEmpty(nature))
            q = q.Where(l => l.AccountGroup!.Nature == nature);

        if (cashBank == true)
            q = q.Where(l => l.IsCashAccount || l.IsBankAccount);

        var ledgers = await q
            .OrderBy(l => l.AccountGroup!.SortOrder).ThenBy(l => l.Name)
            .Select(l => new LedgerDto(l.Id, l.Name, l.Code, l.AccountGroupId,
                l.AccountGroup!.Name, l.AccountGroup.Nature,
                l.OpeningBalance, l.OpeningBalanceType, l.IsBankAccount, l.IsCashAccount, l.IsActive))
            .ToListAsync(ct);

        return Ok(ledgers);
    }

    [HttpPost("ledgers")]
    public async Task<IActionResult> CreateLedger([FromBody] CreateLedgerRequest req, CancellationToken ct)
    {
        var group = await db.Set<AccountGroup>().FindAsync([req.AccountGroupId], ct);
        if (group is null || group.TenantId != tenant.TenantId) return BadRequest("Invalid account group.");

        var ledger = new Ledger
        {
            TenantId = tenant.TenantId,
            AccountGroupId = req.AccountGroupId,
            Name = req.Name,
            Code = req.Code,
            Description = req.Description,
            OpeningBalance = req.OpeningBalance,
            OpeningBalanceType = req.OpeningBalanceType,
            IsBankAccount = req.IsBankAccount,
            BankName = req.BankName,
            AccountNumber = req.AccountNumber,
            IfscCode = req.IfscCode,
            IsCashAccount = req.IsCashAccount
        };
        db.Set<Ledger>().Add(ledger);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = ledger.Id });
    }

    [HttpPut("ledgers/{id:guid}")]
    public async Task<IActionResult> UpdateLedger(Guid id, [FromBody] CreateLedgerRequest req, CancellationToken ct)
    {
        var ledger = await db.Set<Ledger>().FirstOrDefaultAsync(l => l.Id == id && l.TenantId == tenant.TenantId, ct);
        if (ledger is null) return NotFound();
        if (ledger.IsSystem) return BadRequest("System ledgers cannot be modified.");

        ledger.Name = req.Name;
        ledger.Code = req.Code;
        ledger.AccountGroupId = req.AccountGroupId;
        ledger.Description = req.Description;
        ledger.BankName = req.BankName;
        ledger.AccountNumber = req.AccountNumber;
        ledger.IfscCode = req.IfscCode;
        ledger.IsBankAccount = req.IsBankAccount;
        ledger.IsCashAccount = req.IsCashAccount;
        ledger.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ─── Vouchers ─────────────────────────────────────────────

    [HttpGet("vouchers")]
    public async Task<IActionResult> GetVouchers(
        [FromQuery] string? type, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var q = db.Set<Voucher>().Where(v => v.TenantId == tenant.TenantId);

        if (!string.IsNullOrEmpty(type)) q = q.Where(v => v.VoucherType == type);
        if (!string.IsNullOrEmpty(status)) q = q.Where(v => v.Status == status);
        if (from.HasValue) q = q.Where(v => v.Date >= from.Value);
        if (to.HasValue) q = q.Where(v => v.Date <= to.Value);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(v => v.Date).ThenByDescending(v => v.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(v => new VoucherSummaryDto(v.Id, v.VoucherNumber, v.VoucherType, v.Date,
                v.TotalAmount, v.Status, v.IsPosted, v.Narration))
            .ToListAsync(ct);

        return Ok(new { items, total, page, pageSize, totalPages = (int)Math.Ceiling(total / (double)pageSize) });
    }

    [HttpGet("vouchers/{id:guid}")]
    public async Task<IActionResult> GetVoucher(Guid id, CancellationToken ct)
    {
        var voucher = await db.Set<Voucher>()
            .Include(v => v.Entries).ThenInclude(e => e.Ledger)
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenant.TenantId, ct);

        if (voucher is null) return NotFound();

        var dto = new VoucherDetailDto(voucher.Id, voucher.VoucherNumber, voucher.VoucherType,
            voucher.Date, voucher.TotalAmount, voucher.Status, voucher.IsPosted,
            voucher.Narration, voucher.Reference,
            voucher.Entries.Select(e => new VoucherEntryDto(
                e.LedgerId, e.Ledger?.Name ?? "", e.EntryType, e.Amount, e.Narration)).ToList());

        return Ok(dto);
    }

    [HttpPost("vouchers")]
    public async Task<IActionResult> CreateVoucher([FromBody] CreateVoucherRequest req, CancellationToken ct)
    {
        var totalDebit = req.Entries.Where(e => e.EntryType == "debit").Sum(e => e.Amount);
        var totalCredit = req.Entries.Where(e => e.EntryType == "credit").Sum(e => e.Amount);

        if (Math.Abs(totalDebit - totalCredit) > 0.001m)
            return BadRequest($"Voucher entries are not balanced. Debit: {totalDebit:N2}, Credit: {totalCredit:N2}");

        if (req.Entries.Count < 2)
            return BadRequest("A voucher must have at least 2 entries.");

        var prefix = req.VoucherType.ToUpper() switch
        {
            "PAYMENT" => "PV",
            "RECEIPT" => "RV",
            "JOURNAL" => "JV",
            "CONTRA"  => "CV",
            _          => "VR"
        };
        var lastVoucher = await db.Set<Voucher>()
            .Where(v => v.TenantId == tenant.TenantId && v.VoucherType == req.VoucherType)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync(ct);
        var seq = lastVoucher is null ? 1 : int.Parse(lastVoucher.VoucherNumber.Split('/').Last()) + 1;
        var voucherNumber = $"{prefix}/{req.Date.Year}/{seq:D5}";

        var voucher = new Voucher
        {
            TenantId = tenant.TenantId,
            VoucherType = req.VoucherType,
            VoucherNumber = voucherNumber,
            Date = req.Date,
            Narration = req.Narration,
            Reference = req.Reference,
            TotalAmount = totalDebit,
            Status = "draft",
            CreatedBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null
        };

        var entries = req.Entries.Select((e, i) => new VoucherEntry
        {
            TenantId = tenant.TenantId,
            VoucherId = voucher.Id,
            LedgerId = e.LedgerId,
            EntryType = e.EntryType,
            Amount = e.Amount,
            Narration = e.Narration,
            SortOrder = i
        }).ToList();

        voucher.Entries = entries;
        db.Set<Voucher>().Add(voucher);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = voucher.Id, voucherNumber });
    }

    [HttpPost("vouchers/{id:guid}/post")]
    public async Task<IActionResult> PostVoucher(Guid id, CancellationToken ct)
    {
        var voucher = await db.Set<Voucher>().FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenant.TenantId, ct);
        if (voucher is null) return NotFound();
        if (voucher.IsPosted) return BadRequest("Voucher is already posted.");
        if (voucher.Status == "cancelled") return BadRequest("Cannot post a cancelled voucher.");

        voucher.IsPosted = true;
        voucher.Status = "posted";
        voucher.PostedBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null;
        voucher.PostedAt = DateTime.UtcNow;
        voucher.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Voucher posted successfully." });
    }

    [HttpPost("vouchers/{id:guid}/unpost")]
    public async Task<IActionResult> UnpostVoucher(Guid id, CancellationToken ct)
    {
        var voucher = await db.Set<Voucher>().FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenant.TenantId, ct);
        if (voucher is null) return NotFound();
        if (!voucher.IsPosted) return BadRequest("Voucher is not posted.");

        voucher.IsPosted = false;
        voucher.Status = "draft";
        voucher.PostedBy = null;
        voucher.PostedAt = null;
        voucher.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Voucher unposted successfully." });
    }

    [HttpPost("vouchers/{id:guid}/cancel")]
    public async Task<IActionResult> CancelVoucher(Guid id, [FromBody] string reason, CancellationToken ct)
    {
        var voucher = await db.Set<Voucher>().FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenant.TenantId, ct);
        if (voucher is null) return NotFound();
        if (voucher.Status == "cancelled") return BadRequest("Voucher is already cancelled.");

        voucher.Status = "cancelled";
        voucher.IsPosted = false;
        voucher.CancelledBy = User.FindFirst("sub") is { } c ? Guid.Parse(c.Value) : null;
        voucher.CancelledAt = DateTime.UtcNow;
        voucher.CancelReason = reason;
        voucher.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Voucher cancelled." });
    }

    // ─── Reports ───────────────────────────────────────────────

    [HttpGet("reports/trial-balance")]
    [HttpGet("trial-balance")]
    public async Task<IActionResult> TrialBalance([FromQuery] DateOnly? asOfDate, CancellationToken ct)
    {
        var date = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var ledgers = await db.Set<Ledger>()
            .Include(l => l.AccountGroup)
            .Where(l => l.TenantId == tenant.TenantId && l.IsActive)
            .ToListAsync(ct);

        var entries = await db.Set<VoucherEntry>()
            .Include(e => e.Voucher)
            .Where(e => e.TenantId == tenant.TenantId
                && e.Voucher!.IsPosted
                && e.Voucher.Date <= date)
            .ToListAsync(ct);

        var result = ledgers.Select(l =>
        {
            var lEntries = entries.Where(e => e.LedgerId == l.Id).ToList();
            var totalDebit = lEntries.Where(e => e.EntryType == "debit").Sum(e => e.Amount)
                + (l.OpeningBalanceType == "debit" ? l.OpeningBalance : 0);
            var totalCredit = lEntries.Where(e => e.EntryType == "credit").Sum(e => e.Amount)
                + (l.OpeningBalanceType == "credit" ? l.OpeningBalance : 0);

            return new TrialBalanceRow(l.Name, l.AccountGroup?.Name ?? "", l.AccountGroup?.Nature ?? "",
                totalDebit, totalCredit, totalDebit - totalCredit);
        })
        .Where(r => r.TotalDebit > 0 || r.TotalCredit > 0)
        .OrderBy(r => r.GroupName).ThenBy(r => r.LedgerName)
        .ToList();

        var grandDebit = result.Sum(r => r.TotalDebit);
        var grandCredit = result.Sum(r => r.TotalCredit);

        return Ok(new { rows = result, grandDebit, grandCredit, isBalanced = Math.Abs(grandDebit - grandCredit) < 0.01m });
    }

    [HttpGet("reports/balance-sheet")]
    [HttpGet("balance-sheet")]
    public async Task<IActionResult> BalanceSheet([FromQuery] DateOnly? asOfDate, CancellationToken ct)
    {
        var date = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var groups = await db.Set<AccountGroup>()
            .Where(g => g.TenantId == tenant.TenantId && g.IsActive
                && (g.Nature == "assets" || g.Nature == "liabilities" || g.Nature == "capital"))
            .OrderBy(g => g.SortOrder).ToListAsync(ct);

        var ledgers = await db.Set<Ledger>()
            .Include(l => l.AccountGroup)
            .Where(l => l.TenantId == tenant.TenantId && l.IsActive)
            .ToListAsync(ct);

        var entries = await db.Set<VoucherEntry>()
            .Include(e => e.Voucher)
            .Where(e => e.TenantId == tenant.TenantId && e.Voucher!.IsPosted && e.Voucher.Date <= date)
            .ToListAsync(ct);

        var sheet = groups.Select(g =>
        {
            var gLedgers = ledgers.Where(l => l.AccountGroupId == g.Id).ToList();
            var items = gLedgers.Select(l =>
            {
                var debit = entries.Where(e => e.LedgerId == l.Id && e.EntryType == "debit").Sum(e => e.Amount)
                    + (l.OpeningBalanceType == "debit" ? l.OpeningBalance : 0);
                var credit = entries.Where(e => e.LedgerId == l.Id && e.EntryType == "credit").Sum(e => e.Amount)
                    + (l.OpeningBalanceType == "credit" ? l.OpeningBalance : 0);
                return new { ledgerName = l.Name, balance = debit - credit };
            }).ToList();

            return new
            {
                groupName = g.Name,
                nature = g.Nature,
                total = items.Sum(i => i.balance),
                items
            };
        }).ToList();

        var totalAssets = sheet.Where(s => s.nature == "assets").Sum(s => s.total);
        var totalLiabilitiesAndCapital = sheet.Where(s => s.nature is "liabilities" or "capital").Sum(s => s.total);

        return Ok(new { sheet, totalAssets, totalLiabilitiesAndCapital, asOfDate = date });
    }

    [HttpGet("reports/profit-loss")]
    [HttpGet("profit-loss")]
    public async Task<IActionResult> ProfitLoss([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var fromDate = from ?? DateOnly.FromDateTime(new DateTime(DateTime.UtcNow.Year, 4, 1));
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var groups = await db.Set<AccountGroup>()
            .Where(g => g.TenantId == tenant.TenantId && g.IsActive
                && (g.Nature == "income" || g.Nature == "expense"))
            .ToListAsync(ct);

        var ledgers = await db.Set<Ledger>()
            .Include(l => l.AccountGroup)
            .Where(l => l.TenantId == tenant.TenantId && l.IsActive
                && (l.AccountGroup!.Nature == "income" || l.AccountGroup.Nature == "expense"))
            .ToListAsync(ct);

        var entries = await db.Set<VoucherEntry>()
            .Include(e => e.Voucher)
            .Where(e => e.TenantId == tenant.TenantId && e.Voucher!.IsPosted
                && e.Voucher.Date >= fromDate && e.Voucher.Date <= toDate)
            .ToListAsync(ct);

        var pl = groups.Select(g =>
        {
            var gLedgers = ledgers.Where(l => l.AccountGroupId == g.Id).ToList();
            var items = gLedgers.Select(l =>
            {
                var credit = entries.Where(e => e.LedgerId == l.Id && e.EntryType == "credit").Sum(e => e.Amount);
                var debit = entries.Where(e => e.LedgerId == l.Id && e.EntryType == "debit").Sum(e => e.Amount);
                return new { ledgerName = l.Name, amount = g.Nature == "income" ? credit - debit : debit - credit };
            }).ToList();

            return new { groupName = g.Name, nature = g.Nature, total = items.Sum(i => i.amount), items };
        }).ToList();

        var totalIncome = pl.Where(p => p.nature == "income").Sum(p => p.total);
        var totalExpense = pl.Where(p => p.nature == "expense").Sum(p => p.total);
        var netProfit = totalIncome - totalExpense;

        return Ok(new { pl, totalIncome, totalExpense, netProfit, from = fromDate, to = toDate });
    }

    [HttpGet("reports/cash-book")]
    [HttpGet("cash-book")]
    public async Task<IActionResult> CashBook([FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] Guid? ledgerId, CancellationToken ct)
    {
        var fromDate = from ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var cashLedgers = await db.Set<Ledger>()
            .Where(l => l.TenantId == tenant.TenantId && l.IsActive && (l.IsCashAccount || l.IsBankAccount))
            .ToListAsync(ct);

        var targetLedger = ledgerId.HasValue
            ? cashLedgers.FirstOrDefault(l => l.Id == ledgerId)
            : cashLedgers.FirstOrDefault(l => l.IsCashAccount);

        if (targetLedger is null) return BadRequest("No cash/bank ledger found.");

        var entries = await db.Set<VoucherEntry>()
            .Include(e => e.Voucher)
            .Where(e => e.TenantId == tenant.TenantId
                && e.LedgerId == targetLedger.Id
                && e.Voucher!.IsPosted
                && e.Voucher.Date >= fromDate
                && e.Voucher.Date <= toDate)
            .OrderBy(e => e.Voucher!.Date).ThenBy(e => e.Voucher!.CreatedAt)
            .ToListAsync(ct);

        decimal runningBalance = targetLedger.OpeningBalance;
        if (targetLedger.OpeningBalanceType == "credit") runningBalance = -runningBalance;

        var rows = entries.Select(e =>
        {
            var debit = e.EntryType == "debit" ? e.Amount : 0;
            var credit = e.EntryType == "credit" ? e.Amount : 0;
            runningBalance += debit - credit;
            return new LedgerStatementRow(e.Voucher!.Date, e.Voucher.VoucherNumber,
                e.Voucher.VoucherType, e.Narration ?? e.Voucher.Narration ?? "",
                debit, credit, runningBalance);
        }).ToList();

        return Ok(new
        {
            ledger = new { targetLedger.Id, targetLedger.Name },
            openingBalance = targetLedger.OpeningBalance,
            rows,
            totalDebits = rows.Sum(r => r.Debit),
            totalCredits = rows.Sum(r => r.Credit),
            closingBalance = rows.LastOrDefault()?.Balance ?? targetLedger.OpeningBalance
        });
    }

    [HttpGet("reports/day-book")]
    [HttpGet("day-book")]
    public async Task<IActionResult> DayBook([FromQuery] DateOnly? date, CancellationToken ct)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var vouchers = await db.Set<Voucher>()
            .Include(v => v.Entries).ThenInclude(e => e.Ledger)
            .Where(v => v.TenantId == tenant.TenantId && v.Date == targetDate && v.IsPosted)
            .OrderBy(v => v.VoucherType).ThenBy(v => v.VoucherNumber)
            .ToListAsync(ct);

        var result = vouchers.Select(v => new VoucherDetailDto(v.Id, v.VoucherNumber, v.VoucherType,
            v.Date, v.TotalAmount, v.Status, v.IsPosted, v.Narration, v.Reference,
            v.Entries.Select(e => new VoucherEntryDto(e.LedgerId, e.Ledger?.Name ?? "", e.EntryType, e.Amount, e.Narration)).ToList()));

        return Ok(new { date = targetDate, vouchers = result, totalVouchers = vouchers.Count, totalAmount = vouchers.Sum(v => v.TotalAmount) });
    }

    [HttpGet("reports/ledger-statement")]
    public async Task<IActionResult> LedgerStatement(
        [FromQuery] Guid ledgerId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var ledger = await db.Set<Ledger>().FirstOrDefaultAsync(l => l.Id == ledgerId && l.TenantId == tenant.TenantId, ct);
        if (ledger is null) return NotFound();

        var fromDate = from ?? DateOnly.FromDateTime(new DateTime(DateTime.UtcNow.Year, 4, 1));
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var entries = await db.Set<VoucherEntry>()
            .Include(e => e.Voucher)
            .Where(e => e.TenantId == tenant.TenantId
                && e.LedgerId == ledgerId
                && e.Voucher!.IsPosted
                && e.Voucher.Date >= fromDate
                && e.Voucher.Date <= toDate)
            .OrderBy(e => e.Voucher!.Date).ThenBy(e => e.Voucher!.CreatedAt)
            .ToListAsync(ct);

        decimal runningBalance = ledger.OpeningBalanceType == "debit" ? ledger.OpeningBalance : -ledger.OpeningBalance;

        var rows = entries.Select(e =>
        {
            var debit = e.EntryType == "debit" ? e.Amount : 0;
            var credit = e.EntryType == "credit" ? e.Amount : 0;
            runningBalance += debit - credit;
            return new LedgerStatementRow(e.Voucher!.Date, e.Voucher.VoucherNumber,
                e.Voucher.VoucherType, e.Narration ?? e.Voucher.Narration ?? "",
                debit, credit, runningBalance);
        }).ToList();

        return Ok(new
        {
            ledger = new { ledger.Id, ledger.Name, ledger.Code },
            openingBalance = ledger.OpeningBalance,
            openingBalanceType = ledger.OpeningBalanceType,
            rows,
            totalDebits = rows.Sum(r => r.Debit),
            totalCredits = rows.Sum(r => r.Credit),
            closingBalance = rows.LastOrDefault()?.Balance ?? ledger.OpeningBalance,
            from = fromDate,
            to = toDate
        });
    }
}
