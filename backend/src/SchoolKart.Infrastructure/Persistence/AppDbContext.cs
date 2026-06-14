using Microsoft.EntityFrameworkCore;
using SchoolKart.Domain.Entities;

namespace SchoolKart.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AcademicYear> AcademicYears => Set<AcademicYear>();
    public DbSet<Campus> Campuses => Set<Campus>();
    public DbSet<Class> Classes => Set<Class>();
    public DbSet<Section> Sections => Set<Section>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<StudentEnrollment> StudentEnrollments => Set<StudentEnrollment>();
    public DbSet<Guardian> Guardians => Set<Guardian>();
    public DbSet<StudentGuardian> StudentGuardians => Set<StudentGuardian>();
    public DbSet<StudentDocument> StudentDocuments => Set<StudentDocument>();

    // Employee / HR base
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Department> Departments => Set<Department>();

    // Attendance
    public DbSet<StudentAttendance> StudentAttendances => Set<StudentAttendance>();
    public DbSet<StaffAttendance> StaffAttendances => Set<StaffAttendance>();

    // Fees (legacy)
    public DbSet<FeeRecord> FeeRecords => Set<FeeRecord>();

    // Communication
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();

    // Exam results
    public DbSet<ExamResult> ExamResults => Set<ExamResult>();

    // Hostel
    public DbSet<Hostel> Hostels => Set<Hostel>();
    public DbSet<HostelRoom> HostelRooms => Set<HostelRoom>();
    public DbSet<RoomAllocation> RoomAllocations => Set<RoomAllocation>();
    public DbSet<HostelVisitor> HostelVisitors => Set<HostelVisitor>();
    public DbSet<HostelComplaint> HostelComplaints => Set<HostelComplaint>();

    // Inventory
    public DbSet<AssetCategory> AssetCategories => Set<AssetCategory>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<StockCategory> StockCategories => Set<StockCategory>();
    public DbSet<StockItem> StockItems => Set<StockItem>();
    public DbSet<StockTransaction> StockTransactions => Set<StockTransaction>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();

    // Online Learning
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<LiveClass> LiveClasses => Set<LiveClass>();
    public DbSet<CourseVideo> CourseVideos => Set<CourseVideo>();
    public DbSet<VideoProgress> VideoProgresses => Set<VideoProgress>();
    public DbSet<OnlineAssignment> OnlineAssignments => Set<OnlineAssignment>();
    public DbSet<AssignmentSubmission> AssignmentSubmissions => Set<AssignmentSubmission>();
    public DbSet<Quiz> Quizzes => Set<Quiz>();
    public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();

    // Transport
    public DbSet<TransportRoute> TransportRoutes => Set<TransportRoute>();
    public DbSet<TransportStop> TransportStops => Set<TransportStop>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<StudentTransport> StudentTransports => Set<StudentTransport>();

    // Exams
    public DbSet<Subject> Subjects => Set<Subject>();
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<ExamSchedule> ExamSchedules => Set<ExamSchedule>();
    public DbSet<StudentMark> StudentMarks => Set<StudentMark>();

    // HR / Payroll
    public DbSet<EmployeeSalary> EmployeeSalaries => Set<EmployeeSalary>();
    public DbSet<Payroll> Payrolls => Set<Payroll>();
    public DbSet<Payslip> Payslips => Set<Payslip>();

    // Fees
    public DbSet<FeeCategory> FeeCategories => Set<FeeCategory>();
    public DbSet<FeeStructure> FeeStructures => Set<FeeStructure>();
    public DbSet<StudentFee> StudentFees => Set<StudentFee>();
    public DbSet<FeePayment> FeePayments => Set<FeePayment>();

    // Library
    public DbSet<Book> Books => Set<Book>();
    public DbSet<BookIssue> BookIssues => Set<BookIssue>();

    // Accounting
    public DbSet<AccountGroup> AccountGroups => Set<AccountGroup>();
    public DbSet<Ledger> Ledgers => Set<Ledger>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<VoucherEntry> VoucherEntries => Set<VoucherEntry>();

    // Timetable
    public DbSet<TimetableTemplate> TimetableTemplates => Set<TimetableTemplate>();
    public DbSet<TimetablePeriod> TimetablePeriods => Set<TimetablePeriod>();
    public DbSet<TimetableEntry> TimetableEntries => Set<TimetableEntry>();
    public DbSet<ClassTeacher> ClassTeachers => Set<ClassTeacher>();
    public DbSet<LessonPlan> LessonPlans => Set<LessonPlan>();
    public DbSet<AcademicCalendarEvent> AcademicCalendarEvents => Set<AcademicCalendarEvent>();

    // Admissions
    public DbSet<AdmissionInquiry> AdmissionInquiries => Set<AdmissionInquiry>();
    public DbSet<AdmissionApplication> AdmissionApplications => Set<AdmissionApplication>();
    public DbSet<EntranceTest> EntranceTests => Set<EntranceTest>();

    // Visitors / Gate
    public DbSet<Visitor> Visitors => Set<Visitor>();
    public DbSet<GatePass> GatePasses => Set<GatePass>();

    // Parents
    public DbSet<Parent> Parents => Set<Parent>();
    public DbSet<ParentStudentMapping> ParentStudentMappings => Set<ParentStudentMapping>();
    public DbSet<ParentCommunication> ParentCommunications => Set<ParentCommunication>();

    // Homework
    public DbSet<Homework> Homeworks => Set<Homework>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        modelBuilder.HasPostgresExtension("uuid-ossp");
        modelBuilder.HasPostgresExtension("pgcrypto");
        modelBuilder.HasPostgresExtension("citext");

        // Global query filter: soft-delete tenants
        modelBuilder.Entity<Tenant>().HasQueryFilter(t => t.IsActive);

        // StudentGuardian composite key
        modelBuilder.Entity<StudentGuardian>()
            .HasKey(sg => new { sg.StudentId, sg.GuardianId });

        // Enums stored as strings
        modelBuilder.Entity<User>()
            .Property(u => u.Gender)
            .HasConversion<string>();

        modelBuilder.Entity<User>()
            .Property(u => u.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Student>()
            .Property(s => s.Gender)
            .HasConversion<string>();

        modelBuilder.Entity<Student>()
            .Property(s => s.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Tenant>()
            .Property(t => t.Plan)
            .HasConversion<string>();

        modelBuilder.Entity<Tenant>()
            .Property(t => t.PlanStatus)
            .HasConversion<string>();

        // JSON columns
        modelBuilder.Entity<Tenant>()
            .Property(t => t.Settings)
            .HasColumnType("jsonb");

        modelBuilder.Entity<User>()
            .Property(u => u.Settings)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Role>()
            .Property(r => r.Permissions)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Student>()
            .Property(s => s.ExtraInfo)
            .HasColumnType("jsonb");

        modelBuilder.Entity<RefreshToken>()
            .Property(r => r.DeviceInfo)
            .HasColumnType("jsonb");

        // Unique constraints
        modelBuilder.Entity<Tenant>()
            .HasIndex(t => t.Slug).IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => new { u.TenantId, u.Email }).IsUnique();

        modelBuilder.Entity<AcademicYear>()
            .HasIndex(a => new { a.TenantId, a.Name }).IsUnique();

        modelBuilder.Entity<Student>()
            .HasIndex(s => new { s.TenantId, s.AdmissionNumber }).IsUnique();

        modelBuilder.Entity<StudentEnrollment>()
            .HasIndex(e => new { e.StudentId, e.AcademicYearId }).IsUnique();

        // Online Learning — JSON columns
        modelBuilder.Entity<Quiz>()
            .OwnsMany(q => q.Questions, b =>
            {
                b.ToJson();
                b.Property(q => q.Options).HasColumnType("jsonb");
            });

        modelBuilder.Entity<LiveClass>()
            .HasOne(l => l.Course).WithMany().HasForeignKey(l => l.CourseId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CourseVideo>()
            .HasOne(v => v.Course).WithMany().HasForeignKey(v => v.CourseId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OnlineAssignment>()
            .HasOne(a => a.Course).WithMany().HasForeignKey(a => a.CourseId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<VideoProgress>()
            .HasIndex(p => new { p.VideoId, p.StudentId }).IsUnique();

        // Hostel relationships
        modelBuilder.Entity<Hostel>()
            .HasMany(h => h.Rooms).WithOne(r => r.Hostel).HasForeignKey(r => r.HostelId);

        // Purchase Order owned items
        modelBuilder.Entity<PurchaseOrder>()
            .OwnsMany(p => p.Items, b => b.ToJson());

        // HR JSON columns
        modelBuilder.Entity<EmployeeSalary>()
            .Property(s => s.Components)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Payslip>()
            .Property(p => p.Earnings)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Payslip>()
            .Property(p => p.Deductions)
            .HasColumnType("jsonb");

    }

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
            {
                // UpdatedAt is managed by the entity or DB trigger
            }
        }
        return await base.SaveChangesAsync(ct);
    }
}
