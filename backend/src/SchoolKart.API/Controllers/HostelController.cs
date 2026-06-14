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
public class HostelController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ── Stats ─────────────────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var rooms = await db.Set<HostelRoom>().Where(r => r.TenantId == tenant.TenantId).ToListAsync();
        var activeAllocations = await db.Set<RoomAllocation>()
            .CountAsync(a => a.TenantId == tenant.TenantId && a.Status == "active");
        var visitors = await db.Set<HostelVisitor>()
            .CountAsync(v => v.TenantId == tenant.TenantId && v.CheckOut == null);
        var openComplaints = await db.Set<HostelComplaint>()
            .CountAsync(c => c.TenantId == tenant.TenantId && c.Status == "open");

        var totalBeds = rooms.Sum(r => r.Capacity);
        var occupiedBeds = rooms.Sum(r => r.OccupiedBeds);

        return Ok(new
        {
            totalRooms = rooms.Count,
            totalBeds,
            occupiedBeds,
            availableBeds = totalBeds - occupiedBeds,
            activeStudents = activeAllocations,
            visitorsInside = visitors,
            openComplaints,
            occupancyRate = totalBeds > 0 ? Math.Round((double)occupiedBeds / totalBeds * 100, 1) : 0,
        });
    }

    // ── Hostels ───────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetHostels()
    {
        var items = await db.Set<Hostel>()
            .Where(h => h.TenantId == tenant.TenantId && h.IsActive)
            .Include(h => h.Rooms)
            .Select(h => new
            {
                h.Id, h.Name, h.Type, h.Warden, h.WardenPhone, h.TotalRooms,
                OccupiedRooms = h.Rooms.Count(r => r.OccupiedBeds > 0),
                TotalBeds = h.Rooms.Sum(r => r.Capacity),
                OccupiedBeds = h.Rooms.Sum(r => r.OccupiedBeds),
            })
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> CreateHostel([FromBody] CreateHostelRequest req)
    {
        var hostel = new Hostel
        {
            TenantId = tenant.TenantId,
            Name = req.Name,
            Type = req.Type,
            Warden = req.Warden,
            WardenPhone = req.WardenPhone,
            Address = req.Address,
            TotalRooms = req.TotalRooms,
        };
        db.Set<Hostel>().Add(hostel);
        await db.SaveChangesAsync();
        return Ok(hostel);
    }

    // ── Rooms ─────────────────────────────────────────────────────────────
    [HttpGet("{hostelId}/rooms")]
    public async Task<IActionResult> GetRooms(Guid hostelId)
    {
        var rooms = await db.Set<HostelRoom>()
            .Where(r => r.HostelId == hostelId && r.TenantId == tenant.TenantId)
            .OrderBy(r => r.Floor).ThenBy(r => r.RoomNumber)
            .Select(r => new
            {
                r.Id, r.RoomNumber, r.Floor, r.RoomType, r.Capacity,
                r.OccupiedBeds, r.FeeMonthly, r.IsAvailable,
                AvailableBeds = r.Capacity - r.OccupiedBeds,
            })
            .ToListAsync();
        return Ok(rooms);
    }

    [HttpPost("{hostelId}/rooms")]
    public async Task<IActionResult> CreateRoom(Guid hostelId, [FromBody] CreateRoomRequest req)
    {
        var room = new HostelRoom
        {
            TenantId = tenant.TenantId,
            HostelId = hostelId,
            RoomNumber = req.RoomNumber,
            Floor = req.Floor,
            RoomType = req.RoomType,
            Capacity = req.Capacity,
            FeeMonthly = req.FeeMonthly,
        };
        db.Set<HostelRoom>().Add(room);
        await db.SaveChangesAsync();
        return Ok(room);
    }

    // ── Allocations ───────────────────────────────────────────────────────
    [HttpGet("allocations")]
    public async Task<IActionResult> GetAllocations([FromQuery] Guid? hostelId, [FromQuery] string? status)
    {
        var q = db.Set<RoomAllocation>()
            .Where(a => a.TenantId == tenant.TenantId)
            .Include(a => a.Room).ThenInclude(r => r!.Hostel);

        if (!string.IsNullOrEmpty(status))
            q = (Microsoft.EntityFrameworkCore.Query.IIncludableQueryable<RoomAllocation, Hostel?>)q.Where(a => a.Status == status);

        var items = await q.OrderByDescending(a => a.AllocatedOn)
            .Select(a => new
            {
                a.Id, a.StudentId, a.BedNumber, a.AllocatedOn, a.VacatedOn, a.Status,
                RoomNumber = a.Room != null ? a.Room.RoomNumber : "",
                HostelName = a.Room != null && a.Room.Hostel != null ? a.Room.Hostel.Name : "",
                FeeMonthly = a.Room != null ? a.Room.FeeMonthly : 0,
            })
            .Take(200)
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("allocations")]
    public async Task<IActionResult> AllocateRoom([FromBody] AllocateRoomRequest req)
    {
        var room = await db.Set<HostelRoom>()
            .FirstOrDefaultAsync(r => r.Id == req.RoomId && r.TenantId == tenant.TenantId);
        if (room == null) return NotFound(new { message = "Room not found" });
        if (room.OccupiedBeds >= room.Capacity)
            return BadRequest(new { message = "Room is full" });

        // Check student not already allocated
        var existing = await db.Set<RoomAllocation>()
            .AnyAsync(a => a.StudentId == req.StudentId && a.TenantId == tenant.TenantId
                && a.AcademicYearId == req.AcademicYearId && a.Status == "active");
        if (existing) return BadRequest(new { message = "Student already has an active room allocation" });

        var allocation = new RoomAllocation
        {
            TenantId = tenant.TenantId,
            RoomId = req.RoomId,
            StudentId = req.StudentId,
            AcademicYearId = req.AcademicYearId,
            BedNumber = req.BedNumber,
        };
        room.OccupiedBeds++;
        if (room.OccupiedBeds >= room.Capacity) room.IsAvailable = false;

        db.Set<RoomAllocation>().Add(allocation);
        await db.SaveChangesAsync();
        return Ok(allocation);
    }

    [HttpPost("allocations/{id}/vacate")]
    public async Task<IActionResult> VacateRoom(Guid id)
    {
        var alloc = await db.Set<RoomAllocation>()
            .Include(a => a.Room)
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenant.TenantId);
        if (alloc == null) return NotFound();

        alloc.Status = "vacated";
        alloc.VacatedOn = DateTime.UtcNow;
        if (alloc.Room != null)
        {
            alloc.Room.OccupiedBeds = Math.Max(0, alloc.Room.OccupiedBeds - 1);
            alloc.Room.IsAvailable = true;
        }
        await db.SaveChangesAsync();
        return Ok(alloc);
    }

    // ── Visitors ──────────────────────────────────────────────────────────
    [HttpGet("visitors")]
    public async Task<IActionResult> GetVisitors([FromQuery] bool? inside, [FromQuery] int page = 1, [FromQuery] int pageSize = 30)
    {
        var q = db.Set<HostelVisitor>().Where(v => v.TenantId == tenant.TenantId);
        if (inside == true) q = q.Where(v => v.CheckOut == null);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(v => v.CheckIn)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();
        return Ok(new { items, total });
    }

    [HttpPost("visitors")]
    public async Task<IActionResult> CheckInVisitor([FromBody] CheckInVisitorRequest req)
    {
        var visitor = new HostelVisitor
        {
            TenantId = tenant.TenantId,
            StudentId = req.StudentId,
            VisitorName = req.VisitorName,
            VisitorPhone = req.VisitorPhone,
            Relation = req.Relation,
            Purpose = req.Purpose,
            IdProofType = req.IdProofType,
            IdProofNumber = req.IdProofNumber,
        };
        db.Set<HostelVisitor>().Add(visitor);
        await db.SaveChangesAsync();
        return Ok(visitor);
    }

    [HttpPost("visitors/{id}/checkout")]
    public async Task<IActionResult> CheckOutVisitor(Guid id)
    {
        var visitor = await db.Set<HostelVisitor>()
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenant.TenantId);
        if (visitor == null) return NotFound();
        visitor.CheckOut = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(visitor);
    }

    // ── Complaints ────────────────────────────────────────────────────────
    [HttpGet("complaints")]
    public async Task<IActionResult> GetComplaints([FromQuery] string? status)
    {
        var q = db.Set<HostelComplaint>().Where(c => c.TenantId == tenant.TenantId);
        if (!string.IsNullOrEmpty(status)) q = q.Where(c => c.Status == status);
        var items = await q.OrderByDescending(c => c.CreatedAt).Take(100).ToListAsync();
        return Ok(items);
    }

    [HttpPost("complaints")]
    public async Task<IActionResult> RaiseComplaint([FromBody] RaiseComplaintRequest req)
    {
        var complaint = new HostelComplaint
        {
            TenantId = tenant.TenantId,
            RoomId = req.RoomId,
            RaisedBy = tenant.UserId,
            Category = req.Category,
            Description = req.Description,
        };
        db.Set<HostelComplaint>().Add(complaint);
        await db.SaveChangesAsync();
        return Ok(complaint);
    }

    [HttpPut("complaints/{id}")]
    public async Task<IActionResult> UpdateComplaint(Guid id, [FromBody] UpdateComplaintRequest req)
    {
        var complaint = await db.Set<HostelComplaint>()
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenant.TenantId);
        if (complaint == null) return NotFound();
        complaint.Status = req.Status;
        complaint.Resolution = req.Resolution;
        if (req.Status == "resolved") complaint.ResolvedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(complaint);
    }
}

// ─── Request records ──────────────────────────────────────────────────────────
public record CreateHostelRequest(string Name, string? Type, string? Warden, string? WardenPhone, string? Address, int TotalRooms);
public record CreateRoomRequest(string RoomNumber, string? Floor, string RoomType, int Capacity, decimal FeeMonthly);
public record AllocateRoomRequest(Guid RoomId, Guid StudentId, Guid AcademicYearId, string? BedNumber);
public record CheckInVisitorRequest(Guid StudentId, string VisitorName, string? VisitorPhone, string? Relation, string? Purpose, string? IdProofType, string? IdProofNumber);
public record RaiseComplaintRequest(Guid? RoomId, string Category, string Description);
public record UpdateComplaintRequest(string Status, string? Resolution);
