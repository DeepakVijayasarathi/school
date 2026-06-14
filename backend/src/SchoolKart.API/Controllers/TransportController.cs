using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;

namespace SchoolKart.API.Controllers;

[ApiController]
[Route("api/transport")]
[Authorize]
public class TransportController(AppDbContext db, ITenantContext tenant) : ControllerBase
{
    // ── Routes ───────────────────────────────────────────────────

    [HttpGet("routes")]
    public async Task<IActionResult> GetRoutes(CancellationToken ct)
    {
        var routes = await db.Set<TransportRoute>()
            .Include(r => r.Stops)
            .Where(r => r.TenantId == tenant.TenantId && r.IsActive)
            .Select(r => new
            {
                r.Id, r.Name, r.Code, r.StartPoint, r.EndPoint,
                r.DistanceKm, r.FeeMonthly,
                StopCount = r.Stops.Count
            })
            .ToListAsync(ct);

        return Ok(routes);
    }

    [HttpGet("routes/{id:guid}")]
    public async Task<IActionResult> GetRoute(Guid id, CancellationToken ct)
    {
        var route = await db.Set<TransportRoute>()
            .Include(r => r.Stops.OrderBy(s => s.Sequence))
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenant.TenantId, ct);

        return route is null ? NotFound() : Ok(route);
    }

    [HttpPost("routes")]
    public async Task<IActionResult> CreateRoute([FromBody] CreateRouteRequest req, CancellationToken ct)
    {
        var route = new TransportRoute
        {
            TenantId = tenant.TenantId,
            Name = req.Name,
            Code = req.Code,
            StartPoint = req.StartPoint,
            EndPoint = req.EndPoint,
            DistanceKm = req.DistanceKm,
            FeeMonthly = req.FeeMonthly
        };

        if (req.Stops is not null)
        {
            route.Stops = req.Stops.Select((s, i) => new TransportStop
            {
                RouteId = route.Id,
                Name = s.Name,
                Sequence = s.Sequence ?? i + 1,
                ArrivalTime = s.ArrivalTime.HasValue ? TimeOnly.Parse(s.ArrivalTime.Value.ToString()) : null,
                Latitude = s.Latitude,
                Longitude = s.Longitude
            }).ToList();
        }

        db.Set<TransportRoute>().Add(route);
        await db.SaveChangesAsync(ct);
        return Created($"/api/transport/routes/{route.Id}", new { route.Id });
    }

    [HttpPost("routes/{routeId:guid}/stops")]
    public async Task<IActionResult> AddStop(Guid routeId, [FromBody] AddStopRequest req, CancellationToken ct)
    {
        var route = await db.Set<TransportRoute>()
            .FirstOrDefaultAsync(r => r.Id == routeId && r.TenantId == tenant.TenantId, ct);
        if (route is null) return NotFound();

        var stop = new TransportStop
        {
            RouteId = routeId,
            Name = req.Name,
            Sequence = req.Sequence,
            ArrivalTime = req.ArrivalTime.HasValue ? TimeOnly.Parse(req.ArrivalTime.Value.ToString()) : null,
            Latitude = req.Latitude,
            Longitude = req.Longitude
        };

        db.Set<TransportStop>().Add(stop);
        await db.SaveChangesAsync(ct);
        return Created($"/api/transport/routes/{routeId}/stops/{stop.Id}", new { stop.Id });
    }

    // ── Vehicles ─────────────────────────────────────────────────

    [HttpGet("vehicles")]
    public async Task<IActionResult> GetVehicles(CancellationToken ct)
    {
        var vehicles = await db.Set<Vehicle>()
            .Where(v => v.TenantId == tenant.TenantId && v.IsActive)
            .Select(v => new
            {
                v.Id, v.Registration, v.VehicleType, v.Capacity,
                v.DriverName, v.DriverPhone, v.GpsDeviceId, v.IsActive
            })
            .ToListAsync(ct);

        return Ok(vehicles);
    }

    [HttpPost("vehicles")]
    public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleRequest req, CancellationToken ct)
    {
        var vehicle = new Vehicle
        {
            TenantId = tenant.TenantId,
            Registration = req.Registration,
            VehicleType = req.VehicleType,
            Capacity = req.Capacity,
            DriverName = req.DriverName,
            DriverPhone = req.DriverPhone,
            DriverLicense = req.DriverLicense,
            GpsDeviceId = req.GpsDeviceId
        };
        db.Set<Vehicle>().Add(vehicle);
        await db.SaveChangesAsync(ct);
        return Created($"/api/transport/vehicles/{vehicle.Id}", new { vehicle.Id });
    }

    [HttpPut("vehicles/{id:guid}")]
    public async Task<IActionResult> UpdateVehicle(Guid id, [FromBody] CreateVehicleRequest req, CancellationToken ct)
    {
        var v = await db.Set<Vehicle>()
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenant.TenantId, ct);
        if (v is null) return NotFound();

        v.VehicleType = req.VehicleType;
        v.Capacity = req.Capacity;
        v.DriverName = req.DriverName;
        v.DriverPhone = req.DriverPhone;
        v.DriverLicense = req.DriverLicense;
        v.GpsDeviceId = req.GpsDeviceId;
        v.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Student Transport ────────────────────────────────────────

    [HttpGet("students")]
    public async Task<IActionResult> GetStudentTransport(
        [FromQuery] Guid? routeId,
        [FromQuery] Guid? academicYearId,
        CancellationToken ct = default)
    {
        var yearId = academicYearId ??
            (await db.AcademicYears.FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct))?.Id;

        var q = db.Set<StudentTransport>()
            .Include(st => st.Student)
            .Include(st => st.Route)
            .Include(st => st.Stop)
            .Include(st => st.Vehicle)
            .Where(st => st.TenantId == tenant.TenantId && st.IsActive);

        if (yearId.HasValue) q = q.Where(st => st.AcademicYearId == yearId.Value);
        if (routeId.HasValue) q = q.Where(st => st.RouteId == routeId.Value);

        var records = await q
            .Select(st => new
            {
                st.Id,
                StudentName = st.Student!.FirstName + " " + st.Student.LastName,
                st.Student.AdmissionNumber,
                Route = st.Route!.Name,
                Stop = st.Stop != null ? st.Stop.Name : null,
                Vehicle = st.Vehicle != null ? st.Vehicle.Registration : null,
                st.PickupTime,
                st.DropTime
            })
            .ToListAsync(ct);

        return Ok(records);
    }

    [HttpPost("students/assign")]
    public async Task<IActionResult> AssignTransport([FromBody] AssignTransportRequest req, CancellationToken ct)
    {
        var yearId = req.AcademicYearId ??
            (await db.AcademicYears.FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct))?.Id;

        if (yearId is null) return BadRequest("No current academic year");

        var existing = await db.Set<StudentTransport>()
            .FirstOrDefaultAsync(st => st.StudentId == req.StudentId && st.AcademicYearId == yearId.Value, ct);

        if (existing is not null)
        {
            existing.RouteId = req.RouteId;
            existing.StopId = req.StopId;
            existing.VehicleId = req.VehicleId;
            existing.PickupTime = req.PickupTime.HasValue ? TimeOnly.Parse(req.PickupTime.Value.ToString()) : null;
            existing.DropTime = req.DropTime.HasValue ? TimeOnly.Parse(req.DropTime.Value.ToString()) : null;
            existing.IsActive = true;
        }
        else
        {
            db.Set<StudentTransport>().Add(new StudentTransport
            {
                TenantId = tenant.TenantId,
                StudentId = req.StudentId,
                AcademicYearId = yearId.Value,
                RouteId = req.RouteId,
                StopId = req.StopId,
                VehicleId = req.VehicleId,
                PickupTime = req.PickupTime.HasValue ? TimeOnly.Parse(req.PickupTime.Value.ToString()) : null,
                DropTime = req.DropTime.HasValue ? TimeOnly.Parse(req.DropTime.Value.ToString()) : null
            });
        }

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpDelete("students/{studentId:guid}")]
    public async Task<IActionResult> RemoveTransport(Guid studentId, CancellationToken ct)
    {
        var yearId = (await db.AcademicYears
            .FirstOrDefaultAsync(a => a.TenantId == tenant.TenantId && a.IsCurrent, ct))?.Id;

        var updated = await db.Set<StudentTransport>()
            .Where(st => st.StudentId == studentId && st.AcademicYearId == yearId && st.TenantId == tenant.TenantId)
            .ExecuteUpdateAsync(s => s.SetProperty(st => st.IsActive, false), ct);

        return updated > 0 ? Ok() : NotFound();
    }

    // ── GPS Location ─────────────────────────────────────────────

    [HttpPost("vehicles/{vehicleId:guid}/location")]
    public async Task<IActionResult> UpdateLocation(
        Guid vehicleId,
        [FromBody] UpdateLocationRequest req,
        CancellationToken ct)
    {
        // In production this would update a Redis key for real-time tracking
        // For now just acknowledge receipt
        return Ok(new
        {
            vehicleId,
            latitude = req.Latitude,
            longitude = req.Longitude,
            speed = req.Speed,
            timestamp = DateTime.UtcNow
        });
    }

    [HttpGet("vehicles/{vehicleId:guid}/location")]
    public async Task<IActionResult> GetLocation(Guid vehicleId, CancellationToken ct)
    {
        // Would read from Redis in production
        return Ok(new { vehicleId, message = "GPS integration required" });
    }
}

// Request records
public record CreateRouteRequest(
    string Name, string? Code, string? StartPoint, string? EndPoint,
    decimal? DistanceKm, decimal? FeeMonthly,
    IEnumerable<StopRequest>? Stops);

public record StopRequest(string Name, int? Sequence, TimeSpan? ArrivalTime, decimal? Latitude, decimal? Longitude);
public record AddStopRequest(string Name, int Sequence, TimeSpan? ArrivalTime, decimal? Latitude, decimal? Longitude);
public record CreateVehicleRequest(string Registration, string? VehicleType, int? Capacity, string? DriverName, string? DriverPhone, string? DriverLicense, string? GpsDeviceId);
public record AssignTransportRequest(Guid StudentId, Guid RouteId, Guid? StopId, Guid? VehicleId, Guid? AcademicYearId, TimeSpan? PickupTime, TimeSpan? DropTime);
public record UpdateLocationRequest(decimal Latitude, decimal Longitude, decimal? Speed);
