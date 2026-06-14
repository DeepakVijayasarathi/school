'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { onlineLearningApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  Video, BookOpen, ClipboardCheck, HelpCircle, Plus, Play,
  Clock, Users, CheckCircle, XCircle, Loader2, ChevronRight,
  Radio, CalendarDays, Award, FileText, Upload, X,
} from 'lucide-react'

type Tab = 'live' | 'courses' | 'assignments' | 'quizzes'

export default function OnlineLearningPage() {
  const [tab, setTab]                         = useState<Tab>('live')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showCreateCourse, setShowCreateCourse]   = useState(false)
  const [quizAttempt, setQuizAttempt]   = useState<{ quizId: string; answers: Record<string, string>; startTime: number } | null>(null)
  const [quizResult, setQuizResult]     = useState<any>(null)
  const qc = useQueryClient()

  const { data: liveClasses, isLoading: liveLoading } = useQuery({
    queryKey: ['live-classes'],
    queryFn: () => onlineLearningApi.getLiveClasses().then(r => r.data),
    enabled: tab === 'live',
    refetchInterval: tab === 'live' ? 30000 : false,
  })

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => onlineLearningApi.getCourses({}).then(r => r.data),
  })

  const { data: courseDetail } = useQuery({
    queryKey: ['course-detail', selectedCourseId],
    queryFn: () => onlineLearningApi.getCourse(selectedCourseId).then(r => r.data),
    enabled: !!selectedCourseId,
  })

  const startClassMutation = useMutation({
    mutationFn: (id: string) => onlineLearningApi.startClass(id),
    onSuccess: (data) => { window.open(data.data.joinUrl, '_blank'); qc.invalidateQueries({ queryKey: ['live-classes'] }) },
    onError: () => toast.error('Failed to start class'),
  })
  const joinClassMutation = useMutation({
    mutationFn: (id: string) => onlineLearningApi.joinClass(id),
    onSuccess: (data) => window.open(data.data.joinUrl, '_blank'),
    onError: () => toast.error('Failed to join class'),
  })
  const endClassMutation = useMutation({
    mutationFn: (id: string) => onlineLearningApi.endClass(id),
    onSuccess: () => { toast.success('Class ended'); qc.invalidateQueries({ queryKey: ['live-classes'] }) },
  })
  const submitQuizMutation = useMutation({
    mutationFn: ({ id, answers, timeTaken }: { id: string; answers: Record<string, string>; timeTaken: number }) =>
      onlineLearningApi.submitQuiz(id, { answers, timeTakenSeconds: timeTaken }),
    onSuccess: (data) => { setQuizResult(data.data); setQuizAttempt(null) },
  })

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'live',        label: 'Live Classes', icon: Radio },
    { id: 'courses',     label: 'Courses',      icon: BookOpen },
    { id: 'assignments', label: 'Assignments',  icon: ClipboardCheck },
    { id: 'quizzes',     label: 'Quizzes',      icon: HelpCircle },
  ]

  const [timeLeft, setTimeLeft] = useState(0)
  useEffect(() => {
    if (!quizAttempt) return
    const iv = setInterval(() => setTimeLeft(Math.floor((Date.now() - quizAttempt.startTime) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [quizAttempt])

  // ── Quiz result screen ───────────────────────────────────────────────────────
  if (quizResult) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center anim-fade-up">
        <div className="card p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: quizResult.isPassed ? 'var(--success-bg)' : 'var(--danger-bg)' }}>
            {quizResult.isPassed
              ? <CheckCircle className="w-10 h-10" style={{ color: 'var(--success)' }} />
              : <XCircle    className="w-10 h-10" style={{ color: 'var(--danger)' }} />}
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>
            {quizResult.isPassed ? 'Congratulations!' : 'Better Luck Next Time'}
          </h2>
          <p className="mb-6 text-sm" style={{ color: 'var(--text-3)' }}>Quiz completed</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Score',   value: quizResult.marksObtained, color: 'var(--brand)' },
              { label: '%',       value: `${quizResult.percentage}%`, color: '#7c3aed' },
              { label: quizResult.isPassed ? 'Pass' : 'Fail',
                value: `≥${quizResult.passingMarks}`,
                color: quizResult.isPassed ? 'var(--success)' : 'var(--danger)' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setQuizResult(null)} className="btn btn-primary w-full">Back to Quizzes</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 anim-fade-up">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
            Online Learning
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            Live classes, videos, assignments &amp; quizzes
          </p>
        </div>
        <div className="flex gap-2">
          {tab === 'live' && (
            <button onClick={() => setShowScheduleModal(true)} className="btn btn-primary gap-2">
              <Plus className="w-4 h-4" /> Schedule Class
            </button>
          )}
          {tab === 'courses' && (
            <button onClick={() => setShowCreateCourse(true)} className="btn btn-primary gap-2">
              <Plus className="w-4 h-4" /> New Course
            </button>
          )}
        </div>
      </div>

      {/* ── Tab strip ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all',
              tab === t.id
                ? 'text-white shadow-sm'
                : 'hover:opacity-80'
            )}
            style={tab === t.id
              ? { background: 'var(--brand)', color: '#fff' }
              : { color: 'var(--text-3)', background: 'transparent' }}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Live Classes ──────────────────────────────────────────────────────── */}
      {tab === 'live' && (
        <div className="space-y-4">
          {liveLoading ? (
            <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-4)' }}>
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading classes…
            </div>
          ) : !liveClasses?.length ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <Video className="w-8 h-8" style={{ color: 'var(--text-4)' }} />
              </div>
              <p className="text-[14px] font-medium" style={{ color: 'var(--text-2)' }}>No live classes scheduled</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-4)' }}>Click "Schedule Class" to create one</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {liveClasses.map((cls: any) => (
                <LiveClassCard key={cls.id} cls={cls}
                  onStart={() => startClassMutation.mutate(cls.id)}
                  onJoin={() => joinClassMutation.mutate(cls.id)}
                  onEnd={() => endClassMutation.mutate(cls.id)}
                  isStarting={startClassMutation.isPending}
                  isJoining={joinClassMutation.isPending} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Courses ───────────────────────────────────────────────────────────── */}
      {tab === 'courses' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {coursesLoading ? (
            <div className="col-span-3 flex items-center justify-center h-48" style={{ color: 'var(--text-4)' }}>
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : courses?.items?.map((c: any) => (
            <div key={c.id} className="card overflow-hidden card-hover cursor-pointer"
              onClick={() => setSelectedCourseId(selectedCourseId === c.id ? '' : c.id)}>
              <div className="h-36 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                {c.thumbnailUrl
                  ? <img src={c.thumbnailUrl} alt={c.title} className="h-full w-full object-cover" />
                  : <BookOpen className="w-12 h-12 text-white/50" />}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-[14px]" style={{ color: 'var(--text-1)' }}>{c.title}</h3>
                  <span className={cn('badge flex-shrink-0', c.isPublished ? 'badge-active' : 'badge-draft')}>
                    {c.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                {c.description && (
                  <p className="text-[12px] mt-1 line-clamp-2" style={{ color: 'var(--text-3)' }}>{c.description}</p>
                )}
                <button className="mt-3 flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--brand)' }}>
                  View details <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {selectedCourseId === c.id && courseDetail && (
                <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}
                  onClick={e => e.stopPropagation()}>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    {[
                      { label: 'Videos',      value: courseDetail.videos?.length ?? 0,      color: 'var(--brand)' },
                      { label: 'Assignments', value: courseDetail.assignments?.length ?? 0, color: 'var(--warning)' },
                      { label: 'Quizzes',     value: courseDetail.quizzes?.length ?? 0,     color: '#7c3aed' },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <p className="font-bold text-[16px]" style={{ color: s.color }}>{s.value}</p>
                        <p style={{ color: 'var(--text-4)' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {courseDetail.upcomingClass && (
                    <div className="flex items-center gap-2 text-[12px] rounded-lg px-3 py-2"
                      style={{ background: 'var(--brand-bg)', color: 'var(--brand)' }}>
                      <CalendarDays className="w-4 h-4" />
                      Next: {formatDate(courseDetail.upcomingClass.scheduledAt)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {!courses?.items?.length && !coursesLoading && (
            <div className="col-span-3 card p-12 text-center" style={{ color: 'var(--text-4)' }}>
              No courses created yet
            </div>
          )}
        </div>
      )}

      {/* ── Assignments ───────────────────────────────────────────────────────── */}
      {tab === 'assignments' && <AssignmentsPanel courses={courses?.items ?? []} />}

      {/* ── Quizzes ───────────────────────────────────────────────────────────── */}
      {tab === 'quizzes' && (
        <QuizzesPanel
          courses={courses?.items ?? []}
          onAttempt={(quizId) => setQuizAttempt({ quizId, answers: {}, startTime: Date.now() })}
        />
      )}

      {/* ── Schedule Modal ────────────────────────────────────────────────────── */}
      {showScheduleModal && (
        <ScheduleClassModal
          courses={courses?.items ?? []}
          coursesLoading={coursesLoading}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => { setShowScheduleModal(false); qc.invalidateQueries({ queryKey: ['live-classes'] }) }}
        />
      )}
    </div>
  )
}

// ── Live Class Card ────────────────────────────────────────────────────────────
function LiveClassCard({ cls, onStart, onJoin, onEnd, isStarting, isJoining }: any) {
  const isLive      = cls.status === 'live'
  const isScheduled = cls.status === 'scheduled'
  const isEnded     = cls.status === 'ended'

  const statusBar = isLive
    ? { bg: '#ef4444', label: 'Live Now',  pulse: true }
    : isScheduled
    ? { bg: 'var(--brand)', label: 'Scheduled', pulse: false }
    : { bg: 'var(--text-4)', label: 'Ended',    pulse: false }

  return (
    <div className="card overflow-hidden"
      style={isLive ? { border: '1px solid #fca5a5', boxShadow: '0 0 0 3px rgba(239,68,68,.08)' } : {}}>
      <div className="px-4 py-2 flex items-center gap-2" style={{ background: statusBar.bg }}>
        {statusBar.pulse && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
        <span className="text-white text-[11px] font-bold uppercase tracking-wider">{statusBar.label}</span>
        {isLive && <span className="ml-auto text-white/70 text-[11px]">● Recording</span>}
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-[15px] leading-snug" style={{ color: 'var(--text-1)' }}>{cls.title}</h3>
        {cls.courseName && (
          <p className="text-[12px] mt-0.5 font-medium" style={{ color: 'var(--brand)' }}>{cls.courseName}</p>
        )}
        {cls.description && (
          <p className="text-[12px] mt-2 line-clamp-2" style={{ color: 'var(--text-3)' }}>{cls.description}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-[11px]" style={{ color: 'var(--text-4)' }}>
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> {formatDate(cls.scheduledAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {cls.durationMinutes} min
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          {isLive && (
            <>
              <button onClick={onJoin} disabled={isJoining}
                className="btn btn-primary flex-1 gap-2 py-2.5 text-[13px]">
                {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {isJoining ? 'Joining…' : 'Join Class'}
              </button>
              <button onClick={onEnd}
                className="btn px-3 py-2.5 text-[12px]"
                style={{ border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' }}>
                End
              </button>
            </>
          )}
          {isScheduled && (
            <button onClick={onStart} disabled={isStarting}
              className="btn btn-primary flex-1 gap-2 py-2.5 text-[13px]">
              {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isStarting ? 'Starting…' : 'Start Class'}
            </button>
          )}
          {isEnded && cls.recordingUrl && (
            <a href={cls.recordingUrl} target="_blank"
              className="btn btn-ghost flex-1 gap-2 py-2.5 text-[13px]">
              <Play className="w-4 h-4" /> Watch Recording
            </a>
          )}
          {isEnded && !cls.recordingUrl && (
            <div className="flex-1 py-2.5 text-center text-[12px] rounded-xl"
              style={{ background: 'var(--surface-2)', color: 'var(--text-4)' }}>
              Class ended · No recording
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Assignments Panel ──────────────────────────────────────────────────────────
function AssignmentsPanel({ courses }: { courses: any[] }) {
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id ?? '')
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', selectedCourse],
    queryFn: () => onlineLearningApi.getAssignments(selectedCourse).then(r => r.data),
    enabled: !!selectedCourse,
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {courses.map((c: any) => (
          <button key={c.id} onClick={() => setSelectedCourse(c.id)}
            className="btn text-[12px] px-3 py-1.5 rounded-full"
            style={selectedCourse === c.id
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            {c.title}
          </button>
        ))}
      </div>

      {!selectedCourse ? (
        <div className="card p-10 text-center text-[13px]" style={{ color: 'var(--text-4)' }}>
          Select a course to view assignments
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-4)' }} /></div>
      ) : (
        <div className="grid gap-3">
          {assignments?.map((a: any) => {
            const isOverdue = new Date(a.dueDate) < new Date()
            return (
              <div key={a.id} className="card p-5 flex items-start gap-4">
                <div className="p-3 rounded-xl flex-shrink-0"
                  style={{ background: isOverdue ? 'var(--danger-bg)' : 'var(--warning-bg)' }}>
                  <FileText className="w-5 h-5" style={{ color: isOverdue ? 'var(--danger)' : 'var(--warning)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[14px]" style={{ color: 'var(--text-1)' }}>{a.title}</h3>
                  {a.instructions && (
                    <p className="text-[12px] mt-1 line-clamp-2" style={{ color: 'var(--text-3)' }}>{a.instructions}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-[11px]">
                    <span className="flex items-center gap-1" style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-4)' }}>
                      <Clock className="w-3.5 h-3.5" />
                      Due: {formatDate(a.dueDate)} {isOverdue && '(Overdue)'}
                    </span>
                    <span style={{ color: 'var(--text-4)' }}>Max: {a.maxMarks} marks</span>
                    {a.allowLateSubmission && (
                      <span style={{ color: 'var(--success)' }}>Late OK</span>
                    )}
                  </div>
                </div>
                <button className="btn btn-primary flex-shrink-0 gap-1.5 text-[12px] px-3 py-1.5">
                  <Upload className="w-3.5 h-3.5" /> Submit
                </button>
              </div>
            )
          })}
          {!assignments?.length && (
            <div className="card p-10 text-center text-[13px]" style={{ color: 'var(--text-4)' }}>
              No assignments in this course
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Quizzes Panel ─────────────────────────────────────────────────────────────
function QuizzesPanel({ courses, onAttempt }: { courses: any[]; onAttempt: (id: string) => void }) {
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id ?? '')
  const { data: quizzes, isLoading } = useQuery({
    queryKey: ['quizzes', selectedCourse],
    queryFn: () => onlineLearningApi.getQuizzes(selectedCourse).then(r => r.data),
    enabled: !!selectedCourse,
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {courses.map((c: any) => (
          <button key={c.id} onClick={() => setSelectedCourse(c.id)}
            className="btn text-[12px] px-3 py-1.5 rounded-full"
            style={selectedCourse === c.id
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            {c.title}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-4)' }} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {quizzes?.map((q: any) => {
            const isAvailable =
              (!q.availableFrom || new Date(q.availableFrom) <= new Date()) &&
              (!q.availableTo   || new Date(q.availableTo)   >= new Date())
            return (
              <div key={q.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-xl flex-shrink-0" style={{ background: 'rgba(124,58,237,.1)' }}>
                    <Award className="w-5 h-5" style={{ color: '#7c3aed' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[14px]" style={{ color: 'var(--text-1)' }}>{q.title}</h3>
                    {q.description && (
                      <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-3)' }}>{q.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: 'var(--text-4)' }}>
                      <span>{q.questionCount} questions</span>
                      <span>·</span>
                      <span>{q.totalMarks} marks</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{q.timeLimitMinutes} min</span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-4)' }}>
                      Pass: {q.passingMarks}/{q.totalMarks}
                    </p>
                  </div>
                </div>
                <button onClick={() => onAttempt(q.id)} disabled={!isAvailable}
                  className={cn('mt-4 w-full btn text-[13px] py-2', isAvailable ? 'btn-primary' : 'btn-ghost')}
                  style={!isAvailable ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                  {isAvailable ? 'Start Quiz' : 'Not Available'}
                </button>
              </div>
            )
          })}
          {!quizzes?.length && (
            <div className="col-span-2 card p-10 text-center text-[13px]" style={{ color: 'var(--text-4)' }}>
              No quizzes in this course
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Schedule Class Modal ───────────────────────────────────────────────────────
function ScheduleClassModal({ courses, coursesLoading, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    courseId: courses[0]?.id ?? '',
    title: '',
    description: '',
    scheduledAt: '',
    durationMinutes: 60,
  })

  useEffect(() => {
    if (!form.courseId && courses[0]?.id) setForm(p => ({ ...p, courseId: courses[0].id }))
  }, [courses])

  const mutation = useMutation({
    mutationFn: () => onlineLearningApi.scheduleLiveClass(form.courseId, {
      title: form.title,
      description: form.description,
      scheduledAt: form.scheduledAt,
      durationMinutes: form.durationMinutes,
    }),
    onSuccess: () => { toast.success('Class scheduled!'); onSuccess() },
    onError: () => toast.error('Failed to schedule class'),
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}>
      <div className="card w-full max-w-md p-6 space-y-4 anim-fade-up"
        style={{ boxShadow: 'var(--shadow-xl)' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[16px]" style={{ color: 'var(--text-1)' }}>Schedule Live Class</h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>Fill in the details below</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost w-8 h-8 p-0 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {/* Course */}
          <div>
            <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--text-2)' }}>Course</label>
            <select value={form.courseId} onChange={set('courseId')} disabled={coursesLoading}
              className="input-base focus-ring w-full bg-white"
              style={{ background: 'var(--bg)' }}>
              {coursesLoading
                ? <option>Loading…</option>
                : courses.length === 0
                  ? <option value="">No courses available</option>
                  : courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)
              }
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--text-2)' }}>Title</label>
            <input value={form.title} onChange={set('title')}
              placeholder="e.g. Chapter 5 – Introduction to Algebra"
              className="input-base focus-ring w-full" />
          </div>

          {/* Description */}
          <div>
            <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--text-2)' }}>Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2}
              placeholder="What will be covered in this class…"
              className="input-base focus-ring w-full resize-none" />
          </div>

          {/* Date + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--text-2)' }}>Date &amp; Time</label>
              <input type="datetime-local" value={form.scheduledAt}
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={set('scheduledAt')}
                className="input-base focus-ring w-full" />
            </div>
            <div>
              <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--text-2)' }}>Duration (min)</label>
              <input type="number" value={form.durationMinutes}
                onChange={e => setForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))}
                className="input-base focus-ring w-full" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title || !form.scheduledAt || !form.courseId}
            className="btn btn-primary flex-1 gap-2"
            style={{ opacity: (mutation.isPending || !form.title || !form.scheduledAt) ? 0.6 : 1 }}>
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mutation.isPending ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}
