namespace SchoolKart.Domain.Entities;

public class Course : TenantEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ThumbnailUrl { get; set; }
    public Guid? ClassId { get; set; }
    public Guid? SubjectId { get; set; }
    public Guid TeacherId { get; set; }
    public bool IsPublished { get; set; }
}

public class LiveClass : TenantEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string MeetingId { get; set; } = string.Empty;
    public string AttendeePw { get; set; } = string.Empty;
    public string ModeratorPw { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public string Status { get; set; } = "scheduled";
    public string? RecordingUrl { get; set; }

    public Course? Course { get; set; }
}

public class CourseVideo : TenantEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string VideoUrl { get; set; } = string.Empty;
    public int? DurationSeconds { get; set; }
    public int Order { get; set; }

    public Course? Course { get; set; }
}

public class VideoProgress : TenantEntity
{
    public Guid VideoId { get; set; }
    public Guid StudentId { get; set; }
    public int WatchedSeconds { get; set; }
    public bool IsCompleted { get; set; }
}

public class OnlineAssignment : TenantEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public DateTime DueDate { get; set; }
    public int MaxMarks { get; set; } = 100;
    public bool AllowLateSubmission { get; set; }

    public Course? Course { get; set; }
}

public class AssignmentSubmission : TenantEntity
{
    public Guid AssignmentId { get; set; }
    public Guid StudentId { get; set; }
    public string? FileUrl { get; set; }
    public string? TextContent { get; set; }
    public int? MarksObtained { get; set; }
    public string? Feedback { get; set; }
    public bool IsLate { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public OnlineAssignment? Assignment { get; set; }
}

public class Quiz : TenantEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; } = 30;
    public int PassingMarks { get; set; } = 50;
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableTo { get; set; }

    public List<QuizQuestion> Questions { get; set; } = [];
    public Course? Course { get; set; }
}

public class QuizQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QuizId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public string QuestionType { get; set; } = "mcq";
    public List<string> Options { get; set; } = [];
    public string CorrectAnswer { get; set; } = string.Empty;
    public int Marks { get; set; } = 1;
    public int Order { get; set; }
}

public class QuizAttempt : TenantEntity
{
    public Guid QuizId { get; set; }
    public Guid StudentId { get; set; }
    public int MarksObtained { get; set; }
    public int TotalMarks { get; set; }
    public bool IsPassed { get; set; }
    public int TimeTakenSeconds { get; set; }
    public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;

    public Quiz? Quiz { get; set; }
}
