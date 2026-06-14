namespace SchoolKart.Domain.Entities;

public class Hostel : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Warden { get; set; }
    public string? WardenPhone { get; set; }
    public string? Address { get; set; }
    public int TotalRooms { get; set; }
    public bool IsActive { get; set; } = true;

    public List<HostelRoom> Rooms { get; set; } = [];
}

public class HostelRoom : TenantEntity
{
    public Guid HostelId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public string? Floor { get; set; }
    public string RoomType { get; set; } = "standard";
    public int Capacity { get; set; } = 2;
    public int OccupiedBeds { get; set; }
    public decimal FeeMonthly { get; set; }
    public bool IsAvailable { get; set; } = true;

    public Hostel? Hostel { get; set; }
    public List<RoomAllocation> Allocations { get; set; } = [];
}

public class RoomAllocation : TenantEntity
{
    public Guid RoomId { get; set; }
    public Guid StudentId { get; set; }
    public Guid AcademicYearId { get; set; }
    public DateTime AllocatedOn { get; set; } = DateTime.UtcNow;
    public DateTime? VacatedOn { get; set; }
    public string Status { get; set; } = "active";
    public string? BedNumber { get; set; }

    public HostelRoom? Room { get; set; }
}

public class HostelVisitor : TenantEntity
{
    public Guid StudentId { get; set; }
    public string VisitorName { get; set; } = string.Empty;
    public string? VisitorPhone { get; set; }
    public string? Relation { get; set; }
    public string? Purpose { get; set; }
    public DateTime CheckIn { get; set; } = DateTime.UtcNow;
    public DateTime? CheckOut { get; set; }
    public string? IdProofType { get; set; }
    public string? IdProofNumber { get; set; }
}

public class HostelComplaint : TenantEntity
{
    public Guid? RoomId { get; set; }
    public Guid RaisedBy { get; set; }
    public string Category { get; set; } = "maintenance";
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "open";
    public string? Resolution { get; set; }
    public DateTime? ResolvedAt { get; set; }

    public HostelRoom? Room { get; set; }
}
