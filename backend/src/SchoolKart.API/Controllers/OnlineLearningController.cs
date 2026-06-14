using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;
using SchoolKart.Infrastructure.Persistence;
using System.Security.Cryptography;
using System.Text;

namespace SchoolKart.API.Controllers;

// ─── Controller ──────────────────────────────────────────────────────────────
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OnlineLearningController(
    AppDbContext db,
    IConfiguration config,
    ITenantContext tenant) : ControllerBase
{
    private readonly string _bbbUrl = config["BigBlueButton:Url"] ?? "https://bbb.example.com/bigbluebutton/api";
    private readonly string _bbbSecret = config["BigBlueButton:Secret"] ?? "demo-secret";

    // ── Courses ───────────────────────────────────────────────────────────
    [HttpGet("courses")]
    public async Task<IActionResult> GetCourses([FromQuery] string? search, [FromQuery] Guid? classId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = db.Set<Course>().Where(c => c.TenantId == tenant.TenantId);
        if (!string.IsNullOrEmpty(search))
            q = q.Where(c => c.Title.Contains(search));
        if (classId.HasValue)
            q = q.Where(c => c.ClassId == classId);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new { c.Id, c.Title, c.Description, c.ThumbnailUrl, c.IsPublished, c.CreatedAt, c.TeacherId })
            .ToListAsync();
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("courses/{id}")]
    public async Task<IActionResult> GetCourse(Guid id)
    {
        var course = await db.Set<Course>().FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenant.TenantId);
        if (course == null) return NotFound();

        var videos = await db.Set<CourseVideo>().Where(v => v.CourseId == id).OrderBy(v => v.Order).ToListAsync();
        var assignments = await db.Set<OnlineAssignment>().Where(a => a.CourseId == id).ToListAsync();
        var quizzes = await db.Set<Quiz>().Where(q => q.CourseId == id).ToListAsync();
        var upcoming = await db.Set<LiveClass>()
            .Where(l => l.CourseId == id && l.Status != "ended")
            .OrderBy(l => l.ScheduledAt).FirstOrDefaultAsync();

        return Ok(new { course, videos, assignments, quizzes, upcomingClass = upcoming });
    }

    [HttpPost("courses")]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest req)
    {
        var course = new Course
        {
            TenantId = tenant.TenantId,
            Title = req.Title,
            Description = req.Description,
            ThumbnailUrl = req.ThumbnailUrl,
            ClassId = req.ClassId,
            SubjectId = req.SubjectId,
            TeacherId = tenant.UserId,
        };
        db.Set<Course>().Add(course);
        await db.SaveChangesAsync();
        return Ok(course);
    }

    [HttpPut("courses/{id}")]
    public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] CreateCourseRequest req)
    {
        var course = await db.Set<Course>().FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenant.TenantId);
        if (course == null) return NotFound();
        course.Title = req.Title;
        course.Description = req.Description;
        course.ThumbnailUrl = req.ThumbnailUrl;
        course.IsPublished = req.IsPublished;
        await db.SaveChangesAsync();
        return Ok(course);
    }

    // ── Live Classes (BigBlueButton) ──────────────────────────────────────
    [HttpGet("courses/{courseId}/live-classes")]
    public async Task<IActionResult> GetLiveClasses(Guid courseId)
    {
        var items = await db.Set<LiveClass>()
            .Where(l => l.CourseId == courseId && l.TenantId == tenant.TenantId)
            .OrderByDescending(l => l.ScheduledAt)
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("live-classes")]
    public async Task<IActionResult> GetAllLiveClasses([FromQuery] string? status)
    {
        var q = db.Set<LiveClass>().Where(l => l.TenantId == tenant.TenantId);
        if (!string.IsNullOrEmpty(status))
            q = q.Where(l => l.Status == status);
        var items = await q.OrderByDescending(l => l.ScheduledAt)
            .Include(l => l.Course)
            .Take(50)
            .Select(l => new
            {
                l.Id, l.Title, l.Description, l.ScheduledAt, l.DurationMinutes,
                l.Status, l.RecordingUrl,
                CourseName = l.Course != null ? l.Course.Title : ""
            })
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("courses/{courseId}/live-classes")]
    public async Task<IActionResult> ScheduleLiveClass(Guid courseId, [FromBody] ScheduleLiveClassRequest req)
    {
        var meetingId = $"{tenant.TenantId}-{Guid.NewGuid():N}";
        var liveClass = new LiveClass
        {
            TenantId = tenant.TenantId,
            CourseId = courseId,
            Title = req.Title,
            Description = req.Description,
            MeetingId = meetingId,
            AttendeePw = GeneratePassword(),
            ModeratorPw = GeneratePassword(),
            ScheduledAt = req.ScheduledAt,
            DurationMinutes = req.DurationMinutes,
        };
        db.Set<LiveClass>().Add(liveClass);
        await db.SaveChangesAsync();
        return Ok(liveClass);
    }

    [HttpPost("live-classes/{id}/start")]
    public async Task<IActionResult> StartClass(Guid id)
    {
        var cls = await db.Set<LiveClass>().FirstOrDefaultAsync(l => l.Id == id && l.TenantId == tenant.TenantId);
        if (cls == null) return NotFound();

        // Create BBB meeting
        var createUrl = BuildBbbUrl("create", new Dictionary<string, string>
        {
            ["meetingID"] = cls.MeetingId,
            ["name"] = Uri.EscapeDataString(cls.Title),
            ["attendeePW"] = cls.AttendeePw,
            ["moderatorPW"] = cls.ModeratorPw,
            ["record"] = "true",
            ["autoStartRecording"] = "true",
            ["allowStartStopRecording"] = "false",
            ["welcome"] = Uri.EscapeDataString($"Welcome to {cls.Title}"),
        });

        cls.Status = "live";
        await db.SaveChangesAsync();

        var joinUrl = BuildBbbJoinUrl(cls.MeetingId, "Teacher", cls.ModeratorPw);
        return Ok(new { joinUrl, createUrl, cls.Status });
    }

    [HttpPost("live-classes/{id}/end")]
    public async Task<IActionResult> EndClass(Guid id)
    {
        var cls = await db.Set<LiveClass>().FirstOrDefaultAsync(l => l.Id == id && l.TenantId == tenant.TenantId);
        if (cls == null) return NotFound();
        cls.Status = "ended";
        await db.SaveChangesAsync();
        return Ok(cls);
    }

    [HttpGet("live-classes/{id}/join")]
    public async Task<IActionResult> GetJoinUrl(Guid id)
    {
        var cls = await db.Set<LiveClass>().FirstOrDefaultAsync(l => l.Id == id && l.TenantId == tenant.TenantId);
        if (cls == null) return NotFound();
        if (cls.Status == "ended") return BadRequest(new { message = "Class has ended" });

        // Determine if moderator (teacher) or attendee (student)
        var isModerator = tenant.HasPermission("class.moderate") || tenant.HasPermission("school.*");
        var password = isModerator ? cls.ModeratorPw : cls.AttendeePw;
        var fullName = "User"; // In production: fetch user name from context

        var joinUrl = BuildBbbJoinUrl(cls.MeetingId, fullName, password);
        return Ok(new { joinUrl, isModerator });
    }

    // ── Videos ────────────────────────────────────────────────────────────
    [HttpGet("courses/{courseId}/videos")]
    public async Task<IActionResult> GetVideos(Guid courseId)
    {
        var items = await db.Set<CourseVideo>()
            .Where(v => v.CourseId == courseId && v.TenantId == tenant.TenantId)
            .OrderBy(v => v.Order)
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("courses/{courseId}/videos")]
    public async Task<IActionResult> AddVideo(Guid courseId, [FromBody] AddVideoRequest req)
    {
        var maxOrder = await db.Set<CourseVideo>()
            .Where(v => v.CourseId == courseId)
            .MaxAsync(v => (int?)v.Order) ?? 0;

        var video = new CourseVideo
        {
            TenantId = tenant.TenantId,
            CourseId = courseId,
            Title = req.Title,
            Description = req.Description,
            VideoUrl = req.VideoUrl,
            DurationSeconds = req.DurationSeconds,
            Order = maxOrder + 1,
        };
        db.Set<CourseVideo>().Add(video);
        await db.SaveChangesAsync();
        return Ok(video);
    }

    [HttpPost("videos/{id}/progress")]
    public async Task<IActionResult> UpdateVideoProgress(Guid id, [FromBody] VideoProgressRequest req)
    {
        var progress = await db.Set<VideoProgress>()
            .FirstOrDefaultAsync(p => p.VideoId == id && p.StudentId == tenant.UserId);

        if (progress == null)
        {
            progress = new VideoProgress { TenantId = tenant.TenantId, VideoId = id, StudentId = tenant.UserId };
            db.Set<VideoProgress>().Add(progress);
        }
        progress.WatchedSeconds = req.WatchedSeconds;
        progress.IsCompleted = req.IsCompleted;
        progress.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(progress);
    }

    // ── Assignments ───────────────────────────────────────────────────────
    [HttpGet("courses/{courseId}/assignments")]
    public async Task<IActionResult> GetAssignments(Guid courseId)
    {
        var items = await db.Set<OnlineAssignment>()
            .Where(a => a.CourseId == courseId && a.TenantId == tenant.TenantId)
            .OrderByDescending(a => a.DueDate)
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("courses/{courseId}/assignments")]
    public async Task<IActionResult> CreateAssignment(Guid courseId, [FromBody] CreateAssignmentRequest req)
    {
        var assignment = new OnlineAssignment
        {
            TenantId = tenant.TenantId,
            CourseId = courseId,
            Title = req.Title,
            Instructions = req.Instructions,
            DueDate = req.DueDate,
            MaxMarks = req.MaxMarks,
            AllowLateSubmission = req.AllowLateSubmission,
        };
        db.Set<OnlineAssignment>().Add(assignment);
        await db.SaveChangesAsync();
        return Ok(assignment);
    }

    [HttpPost("assignments/{assignmentId}/submit")]
    public async Task<IActionResult> SubmitAssignment(Guid assignmentId, [FromBody] SubmitAssignmentRequest req)
    {
        var assignment = await db.Set<OnlineAssignment>()
            .FirstOrDefaultAsync(a => a.Id == assignmentId && a.TenantId == tenant.TenantId);
        if (assignment == null) return NotFound();

        var existing = await db.Set<AssignmentSubmission>()
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == tenant.UserId);
        if (existing != null) return BadRequest(new { message = "Already submitted" });

        var submission = new AssignmentSubmission
        {
            TenantId = tenant.TenantId,
            AssignmentId = assignmentId,
            StudentId = tenant.UserId,
            FileUrl = req.FileUrl,
            TextContent = req.TextContent,
            IsLate = DateTime.UtcNow > assignment.DueDate,
        };
        db.Set<AssignmentSubmission>().Add(submission);
        await db.SaveChangesAsync();
        return Ok(submission);
    }

    [HttpGet("assignments/{assignmentId}/submissions")]
    public async Task<IActionResult> GetSubmissions(Guid assignmentId)
    {
        var items = await db.Set<AssignmentSubmission>()
            .Where(s => s.AssignmentId == assignmentId && s.TenantId == tenant.TenantId)
            .Select(s => new
            {
                s.Id, s.StudentId, s.FileUrl, s.TextContent,
                s.MarksObtained, s.Feedback, s.IsLate, s.SubmittedAt
            })
            .ToListAsync();
        return Ok(items);
    }

    [HttpPut("submissions/{id}/grade")]
    public async Task<IActionResult> GradeSubmission(Guid id, [FromBody] GradeRequest req)
    {
        var sub = await db.Set<AssignmentSubmission>()
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenant.TenantId);
        if (sub == null) return NotFound();
        sub.MarksObtained = req.Marks;
        sub.Feedback = req.Feedback;
        await db.SaveChangesAsync();
        return Ok(sub);
    }

    // ── Quizzes ───────────────────────────────────────────────────────────
    [HttpGet("courses/{courseId}/quizzes")]
    public async Task<IActionResult> GetQuizzes(Guid courseId)
    {
        var items = await db.Set<Quiz>()
            .Where(q => q.CourseId == courseId && q.TenantId == tenant.TenantId)
            .Include(q => q.Questions)
            .ToListAsync();
        return Ok(items.Select(q => new
        {
            q.Id, q.Title, q.Description, q.TimeLimitMinutes, q.PassingMarks,
            q.AvailableFrom, q.AvailableTo,
            QuestionCount = q.Questions.Count,
            TotalMarks = q.Questions.Sum(x => x.Marks),
        }));
    }

    [HttpPost("courses/{courseId}/quizzes")]
    public async Task<IActionResult> CreateQuiz(Guid courseId, [FromBody] CreateQuizRequest req)
    {
        var quiz = new Quiz
        {
            TenantId = tenant.TenantId,
            CourseId = courseId,
            Title = req.Title,
            Description = req.Description,
            TimeLimitMinutes = req.TimeLimitMinutes,
            PassingMarks = req.PassingMarks,
            AvailableFrom = req.AvailableFrom,
            AvailableTo = req.AvailableTo,
            Questions = req.Questions.Select((q, i) => new QuizQuestion
            {
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                Options = q.Options,
                CorrectAnswer = q.CorrectAnswer,
                Marks = q.Marks,
                Order = i + 1,
            }).ToList(),
        };
        db.Set<Quiz>().Add(quiz);
        await db.SaveChangesAsync();
        return Ok(quiz);
    }

    [HttpGet("quizzes/{id}")]
    public async Task<IActionResult> GetQuiz(Guid id)
    {
        var quiz = await db.Set<Quiz>()
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == id && q.TenantId == tenant.TenantId);
        if (quiz == null) return NotFound();

        // Strip correct answers for students
        var isTeacher = tenant.HasPermission("quiz.create") || tenant.HasPermission("school.*");
        if (!isTeacher)
        {
            return Ok(new
            {
                quiz.Id, quiz.Title, quiz.Description, quiz.TimeLimitMinutes, quiz.PassingMarks,
                Questions = quiz.Questions.OrderBy(q => q.Order).Select(q => new
                {
                    q.Id, q.QuestionText, q.QuestionType, q.Options, q.Marks
                }),
            });
        }
        return Ok(quiz);
    }

    [HttpPost("quizzes/{id}/attempt")]
    public async Task<IActionResult> SubmitQuiz(Guid id, [FromBody] QuizAttemptRequest req)
    {
        var quiz = await db.Set<Quiz>()
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == id && q.TenantId == tenant.TenantId);
        if (quiz == null) return NotFound();

        // Auto-grade MCQ / truefalse
        var marks = 0;
        var totalMarks = quiz.Questions.Sum(q => q.Marks);
        foreach (var q in quiz.Questions)
        {
            if (req.Answers.TryGetValue(q.Id.ToString(), out var answer))
            {
                if (string.Equals(answer.Trim(), q.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase))
                    marks += q.Marks;
            }
        }

        var attempt = new QuizAttempt
        {
            TenantId = tenant.TenantId,
            QuizId = id,
            StudentId = tenant.UserId,
            MarksObtained = marks,
            TotalMarks = totalMarks,
            IsPassed = marks >= quiz.PassingMarks,
            TimeTakenSeconds = req.TimeTakenSeconds,
        };
        db.Set<QuizAttempt>().Add(attempt);
        await db.SaveChangesAsync();

        return Ok(new
        {
            attempt.Id, attempt.MarksObtained, attempt.TotalMarks,
            attempt.IsPassed, Percentage = totalMarks > 0 ? (marks * 100 / totalMarks) : 0,
            quiz.PassingMarks,
        });
    }

    [HttpGet("quizzes/{id}/results")]
    public async Task<IActionResult> GetQuizResults(Guid id)
    {
        var items = await db.Set<QuizAttempt>()
            .Where(a => a.QuizId == id && a.TenantId == tenant.TenantId)
            .OrderByDescending(a => a.AttemptedAt)
            .Select(a => new
            {
                a.Id, a.StudentId, a.MarksObtained, a.TotalMarks,
                a.IsPassed, a.TimeTakenSeconds, a.AttemptedAt,
                Percentage = a.TotalMarks > 0 ? (a.MarksObtained * 100 / a.TotalMarks) : 0,
            })
            .ToListAsync();
        return Ok(items);
    }

    // ── BBB Helpers ───────────────────────────────────────────────────────
    private string BuildBbbUrl(string action, Dictionary<string, string> @params)
    {
        var query = string.Join("&", @params.Select(kv => $"{kv.Key}={kv.Value}"));
        var checksum = ComputeChecksum(action, query);
        return $"{_bbbUrl}/{action}?{query}&checksum={checksum}";
    }

    private string BuildBbbJoinUrl(string meetingId, string fullName, string password)
    {
        var @params = new Dictionary<string, string>
        {
            ["meetingID"] = meetingId,
            ["fullName"] = Uri.EscapeDataString(fullName),
            ["password"] = password,
        };
        return BuildBbbUrl("join", @params);
    }

    private string ComputeChecksum(string action, string queryString)
    {
        var data = action + queryString + _bbbSecret;
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(bytes).ToLower();
    }

    private static string GeneratePassword() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(12))
            .Replace("+", "").Replace("/", "").Replace("=", "")[..12];
}

// ─── Request records ─────────────────────────────────────────────────────────
public record CreateCourseRequest(string Title, string? Description, string? ThumbnailUrl, Guid? ClassId, Guid? SubjectId, bool IsPublished = false);
public record ScheduleLiveClassRequest(string Title, string? Description, DateTime ScheduledAt, int DurationMinutes = 60);
public record AddVideoRequest(string Title, string? Description, string VideoUrl, int? DurationSeconds);
public record VideoProgressRequest(int WatchedSeconds, bool IsCompleted);
public record CreateAssignmentRequest(string Title, string? Instructions, DateTime DueDate, int MaxMarks, bool AllowLateSubmission);
public record SubmitAssignmentRequest(string? FileUrl, string? TextContent);
public record GradeRequest(int Marks, string? Feedback);
public record CreateQuizRequest(
    string Title, string? Description,
    int TimeLimitMinutes, int PassingMarks,
    DateTime? AvailableFrom, DateTime? AvailableTo,
    List<QuizQuestionDto> Questions);
public record QuizQuestionDto(string QuestionText, string QuestionType, List<string> Options, string CorrectAnswer, int Marks);
public record QuizAttemptRequest(Dictionary<string, string> Answers, int TimeTakenSeconds);
