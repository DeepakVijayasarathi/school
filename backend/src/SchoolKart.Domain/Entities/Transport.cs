namespace SchoolKart.Domain.Entities;

public class TransportRoute : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? StartPoint { get; set; }
    public string? EndPoint { get; set; }
    public decimal? DistanceKm { get; set; }
    public decimal? FeeMonthly { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<TransportStop> Stops { get; set; } = new List<TransportStop>();
    public ICollection<StudentTransport> Students { get; set; } = new List<StudentTransport>();
}

public class TransportStop : TenantEntity
{
    public Guid RouteId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Sequence { get; set; }
    public TimeOnly? ArrivalTime { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public TransportRoute? Route { get; set; }
}

public class Vehicle : TenantEntity
{
    public string Registration { get; set; } = string.Empty;
    public string? VehicleType { get; set; }
    public int? Capacity { get; set; }
    public string? DriverName { get; set; }
    public string? DriverPhone { get; set; }
    public string? DriverLicense { get; set; }
    public string? GpsDeviceId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class StudentTransport : TenantEntity
{
    public Guid StudentId { get; set; }
    public Guid AcademicYearId { get; set; }
    public Guid RouteId { get; set; }
    public Guid? StopId { get; set; }
    public Guid? VehicleId { get; set; }
    public TimeOnly? PickupTime { get; set; }
    public TimeOnly? DropTime { get; set; }
    public bool IsActive { get; set; } = true;
    public Student? Student { get; set; }
    public TransportRoute? Route { get; set; }
    public TransportStop? Stop { get; set; }
    public Vehicle? Vehicle { get; set; }
}
