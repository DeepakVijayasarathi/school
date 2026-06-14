using Microsoft.EntityFrameworkCore;
using SchoolKart.Domain.Entities;
using SchoolKart.Domain.Enums;

namespace SchoolKart.Infrastructure.Persistence;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Skip if already seeded
        if (await db.Tenants.AnyAsync()) return;

        // ── System Roles ───────────────────────────────────────────────────────
        var allPerms = new List<string>
        {
            "students.view","students.create","students.edit","students.delete",
            "fees.view","fees.collect","fees.manage",
            "attendance.view","attendance.mark",
            "exams.view","exams.manage","exams.marks",
            "hr.view","hr.manage",
            "library.view","library.manage",
            "transport.view","transport.manage",
            "communication.view","communication.send",
            "reports.view","accounting.view","accounting.manage",
            "settings.manage","admissions.view","admissions.manage",
            "visitors.view","visitors.manage","timetable.view","timetable.manage",
        };

        var roles = new List<Role>
        {
            new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000001"), TenantId = null, Name = "Super Admin",    Code = "super_admin",    IsSystem = true, Permissions = allPerms },
            new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000002"), TenantId = null, Name = "School Admin",   Code = "school_admin",   IsSystem = true, Permissions = allPerms },
            new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000003"), TenantId = null, Name = "Teacher",        Code = "teacher",        IsSystem = true, Permissions = new() { "students.view","attendance.view","attendance.mark","exams.view","exams.marks","timetable.view","communication.view","communication.send" } },
            new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000004"), TenantId = null, Name = "Accountant",     Code = "accountant",     IsSystem = true, Permissions = new() { "fees.view","fees.collect","fees.manage","accounting.view","accounting.manage","reports.view" } },
            new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000005"), TenantId = null, Name = "Librarian",      Code = "librarian",      IsSystem = true, Permissions = new() { "library.view","library.manage","students.view" } },
            new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000006"), TenantId = null, Name = "Receptionist",   Code = "receptionist",   IsSystem = true, Permissions = new() { "visitors.view","visitors.manage","admissions.view","communication.view" } },
            new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000007"), TenantId = null, Name = "Parent",         Code = "parent",         IsSystem = true, Permissions = new() { "students.view","fees.view","attendance.view","exams.view","communication.view" } },
            new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000008"), TenantId = null, Name = "Student",        Code = "student",        IsSystem = true, Permissions = new() { "fees.view","attendance.view","exams.view","timetable.view","communication.view" } },
        };

        db.Set<Role>().AddRange(roles);

        // ── Demo Tenant ────────────────────────────────────────────────────────
        var tenantId = Guid.Parse("aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa");
        var tenant = new Tenant
        {
            Id        = tenantId,
            Name      = "Demo School",
            Slug      = "demo",
            City      = "Mumbai",
            State     = "Maharashtra",
            Country   = "India",
            Phone     = "9876543210",
            Email     = "admin@demo.com",
            Timezone  = "Asia/Kolkata",
            Plan      = SubscriptionPlan.Premium,
            PlanStatus= SubscriptionStatus.Active,
            MaxStudents = 2000,
            MaxStaff    = 200,
            IsActive    = true,
        };
        db.Tenants.Add(tenant);

        // ── Admin User  (password: Admin@123) ──────────────────────────────────
        var adminRoleId = Guid.Parse("10000000-0000-0000-0000-000000000002");
        db.Users.Add(new User
        {
            Id            = Guid.Parse("bbbbbbbb-0000-0000-0000-bbbbbbbbbbbb"),
            TenantId      = tenantId,
            RoleId        = adminRoleId,
            Email         = "admin@demo.com",
            PasswordHash  = BCrypt.Net.BCrypt.HashPassword("Admin@123", 12),
            FirstName     = "School",
            LastName      = "Admin",
            Status        = UserStatus.Active,
            EmailVerified = true,
        });

        // ── Academic Year ──────────────────────────────────────────────────────
        var yearId = Guid.Parse("cccccccc-0000-0000-0000-cccccccccccc");
        db.AcademicYears.Add(new AcademicYear
        {
            Id        = yearId,
            TenantId  = tenantId,
            Name      = "2024-25",
            StartDate = new DateOnly(2024, 4, 1),
            EndDate   = new DateOnly(2025, 3, 31),
            IsCurrent = true,
        });

        // ── Campus ────────────────────────────────────────────────────────────
        var campusId = Guid.Parse("dddddddd-0000-0000-0000-dddddddddddd");
        db.Campuses.Add(new Campus
        {
            Id       = campusId,
            TenantId = tenantId,
            Name     = "Main Campus",
            Code     = "MAIN",
            City     = "Mumbai",
            State    = "Maharashtra",
        });

        // ── Classes 1–12 ──────────────────────────────────────────────────────
        var classIds = new Dictionary<int, Guid>();
        for (int i = 1; i <= 12; i++)
        {
            var cls = new Class
            {
                TenantId     = tenantId,
                CampusId     = campusId,
                Name         = $"Class {i}",
                NumericLevel = i,
            };
            db.Classes.Add(cls);
            classIds[i] = cls.Id;
        }

        // ── Sections A & B for each class ────────────────────────────────────
        foreach (var (level, classId) in classIds)
        {
            foreach (var sec in new[] { "A", "B" })
            {
                db.Sections.Add(new Section
                {
                    TenantId       = tenantId,
                    ClassId        = classId,
                    AcademicYearId = yearId,
                    Name           = sec,
                    MaxStrength    = 40,
                });
            }
        }

        await db.SaveChangesAsync();
    }
}
