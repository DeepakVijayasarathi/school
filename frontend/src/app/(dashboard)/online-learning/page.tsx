'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { onlineLearningApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  Video, BookOpen, ClipboardCheck, HelpCircle, Plus, Play,
  Clock, Users, CheckCircle, XCircle, Loader2, ChevronRight,
  Radio, CalendarDays, Award, FileText, Upload
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'live' | 'courses' | 'assignments' | 'quizzes'

// ── Component ─────────────────────────────────────────────────────────────────
export default function OnlineLearningPage() {
  const [tab, setTab] = useState<Tab>('live')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showCreateCourse, setShowCreateCourse] = useState(false)
  const [quizAttempt, setQuizAttempt] = useState<{ quizId: string; answers: Record<string, string>; startTime: number } | null>(null)
  const [quizResult, setQuizResult] = useState<any>(null)
  const qc = useQueryClient()

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: liveClasses, isLoading: liveLoading } = useQuery({
    queryKey: ['live-classes'],
    queryFn: () => onlineLearningApi.getLiveClasses().then(r => r.data),
    enabled: tab === 'live',
    refetchInterval: tab === 'live' ? 30000 : false,
  })

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => onlineLearningApi.getCourses({}).then(r => r.data),
    enabled: tab === 'courses' || tab === 'assignments' || tab === 'quizzes',
  })

  const { data: courseDetail } = useQuery({
    queryKey: ['course-detail', selectedCourseId],
    queryFn: () => onlineLearningApi.getCourse(selectedCourseId).then(r => r.data),
    enabled: !!selectedCourseId,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const startClassMutation = useMutation({
    mutationFn: (id: string) => onlineLearningApi.startClass(id),
    onSuccess: (data) => {
      window.open(data.data.joinUrl, '_blank')
      qc.invalidateQueries({ queryKey: ['live-classes'] })
    },
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
    onSuccess: (data) => {
      setQuizResult(data.data)
      setQuizAttempt(null)
    },
  })

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'live', label: 'Live Classes', icon: Radio },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: ClipboardCheck },
    { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
  ]

  // ── Quiz attempt timer ────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(0)
  useEffect(() => {
    if (!quizAttempt) return
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - quizAttempt.startTime) / 1000)
      setTimeLeft(elapsed)
    }, 1000)
    return () => clearInterval(interval)
  }, [quizAttempt])

  // ── Quiz result modal ─────────────────────────────────────────────────────
  if (quizResult) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 max-w-sm w-full text-center">
          <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4',
            quizResult.isPassed ? 'bg-green-100' : 'bg-red-100')}>
            {quizResult.isPassed
              ? <CheckCircle className="w-10 h-10 text-green-500" />
              : <XCircle className="w-10 h-10 text-red-500" />}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {quizResult.isPassed ? 'Congratulations!' : 'Better Luck Next Time'}
          </h2>
          <p className="text-gray-500 mb-6">Quiz completed</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-blue-700">{quizResult.marksObtained}</p>
              <p className="text-xs text-blue-500 mt-0.5">Score</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-purple-700">{quizResult.percentage}%</p>
              <p className="text-xs text-purple-500 mt-0.5">Percentage</p>
            </div>
            <div className={cn('rounded-xl p-3', quizResult.isPassed ? 'bg-green-50' : 'bg-red-50')}>
              <p className={cn('text-lg font-bold', quizResult.isPassed ? 'text-green-700' : 'text-red-700')}>
                {quizResult.isPassed ? 'Pass' : 'Fail'}
              </p>
              <p className={cn('text-xs mt-0.5', quizResult.isPassed ? 'text-green-500' : 'text-red-500')}>
                Pass: {quizResult.passingMarks}
              </p>
            </div>
          </div>
          <button onClick={() => setQuizResult(null)}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
            Back to Quizzes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Online Learning</h1>
          <p className="text-gray-500 text-sm">Live classes, videos, assignments & quizzes</p>
        </div>
        <div className="flex gap-2">
          {tab === 'live' && (
            <button onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Schedule Class
            </button>
          )}
          {tab === 'courses' && (
            <button onClick={() => setShowCreateCourse(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> New Course
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LIVE CLASSES TAB ────────────────────────────────────────────────── */}
      {tab === 'live' && (
        <div className="space-y-4">
          {liveLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading classes...
            </div>
          ) : !liveClasses?.length ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Video className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400">No live classes scheduled</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {liveClasses.map((cls: any) => (
                <LiveClassCard
                  key={cls.id}
                  cls={cls}
                  onStart={() => startClassMutation.mutate(cls.id)}
                  onJoin={() => joinClassMutation.mutate(cls.id)}
                  onEnd={() => endClassMutation.mutate(cls.id)}
                  isStarting={startClassMutation.isPending}
                  isJoining={joinClassMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COURSES TAB ─────────────────────────────────────────────────────── */}
      {tab === 'courses' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {coursesLoading ? (
            <div className="col-span-3 flex items-center justify-center h-48 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : courses?.items?.map((c: any) => (
            <div key={c.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedCourseId(selectedCourseId === c.id ? '' : c.id)}>
              <div className="h-36 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                {c.thumbnailUrl
                  ? <img src={c.thumbnailUrl} alt={c.title} className="h-full w-full object-cover" />
                  : <BookOpen className="w-12 h-12 text-white/60" />}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{c.title}</h3>
                  {c.isPublished
                    ? <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Published</span>
                    : <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Draft</span>}
                </div>
                {c.description && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{c.description}</p>}
                <button className="mt-3 flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline">
                  View details <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Expandable detail */}
              {selectedCourseId === c.id && courseDetail && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3" onClick={e => e.stopPropagation()}>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white rounded-xl p-2">
                      <p className="font-bold text-blue-700">{courseDetail.videos?.length ?? 0}</p>
                      <p className="text-gray-400">Videos</p>
                    </div>
                    <div className="bg-white rounded-xl p-2">
                      <p className="font-bold text-orange-600">{courseDetail.assignments?.length ?? 0}</p>
                      <p className="text-gray-400">Assignments</p>
                    </div>
                    <div className="bg-white rounded-xl p-2">
                      <p className="font-bold text-purple-600">{courseDetail.quizzes?.length ?? 0}</p>
                      <p className="text-gray-400">Quizzes</p>
                    </div>
                  </div>
                  {courseDetail.upcomingClass && (
                    <div className="flex items-center gap-2 text-sm bg-blue-50 rounded-lg px-3 py-2">
                      <CalendarDays className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-700">Next: {formatDate(courseDetail.upcomingClass.scheduledAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {!courses?.items?.length && !coursesLoading && (
            <div className="col-span-3 bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              No courses created yet
            </div>
          )}
        </div>
      )}

      {/* ── ASSIGNMENTS TAB ─────────────────────────────────────────────────── */}
      {tab === 'assignments' && (
        <AssignmentsPanel courses={courses?.items ?? []} />
      )}

      {/* ── QUIZZES TAB ─────────────────────────────────────────────────────── */}
      {tab === 'quizzes' && (
        <QuizzesPanel
          courses={courses?.items ?? []}
          onAttempt={(quizId) => setQuizAttempt({ quizId, answers: {}, startTime: Date.now() })}
        />
      )}

      {/* ── Schedule Class Modal ─────────────────────────────────────────────── */}
      {showScheduleModal && (
        <ScheduleClassModal
          courses={courses?.items ?? []}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => { setShowScheduleModal(false); qc.invalidateQueries({ queryKey: ['live-classes'] }) }}
        />
      )}
    </div>
  )
}

// ── Live Class Card ────────────────────────────────────────────────────────────
function LiveClassCard({ cls, onStart, onJoin, onEnd, isStarting, isJoining }: any) {
  const isLive = cls.status === 'live'
  const isScheduled = cls.status === 'scheduled'
  const isEnded = cls.status === 'ended'

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm overflow-hidden transition-all',
      isLive ? 'border-red-200 shadow-red-100' : 'border-gray-100'
    )}>
      {/* Top status bar */}
      <div className={cn('px-4 py-2 flex items-center gap-2',
        isLive ? 'bg-red-500' : isScheduled ? 'bg-blue-600' : 'bg-gray-400')}>
        {isLive && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
        <span className="text-white text-xs font-semibold uppercase tracking-wider">
          {isLive ? 'Live Now' : isScheduled ? 'Scheduled' : 'Ended'}
        </span>
        {isLive && (
          <span className="ml-auto text-white/80 text-xs">Recording</span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 text-lg leading-tight">{cls.title}</h3>
        {cls.courseName && (
          <p className="text-sm text-blue-600 mt-0.5">{cls.courseName}</p>
        )}
        {cls.description && (
          <p className="text-sm text-gray-400 mt-2 line-clamp-2">{cls.description}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            {formatDate(cls.scheduledAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {cls.durationMinutes} min
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          {isLive && (
            <>
              {/* BIG BLUE BUTTON — the primary join action */}
              <button
                onClick={onJoin}
                disabled={isJoining}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-base shadow-lg transition-all',
                  'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200',
                  isJoining && 'opacity-70 cursor-not-allowed'
                )}
              >
                {isJoining
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Video className="w-5 h-5" />}
                {isJoining ? 'Joining...' : 'Join Class'}
              </button>
              <button
                onClick={onEnd}
                className="px-3 py-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium"
              >
                End
              </button>
            </>
          )}

          {isScheduled && (
            <button
              onClick={onStart}
              disabled={isStarting}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-base transition-all',
                'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 active:scale-95',
                isStarting && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {isStarting ? 'Starting...' : 'Start Class'}
            </button>
          )}

          {isEnded && cls.recordingUrl && (
            <a href={cls.recordingUrl} target="_blank"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition">
              <Play className="w-5 h-5" /> Watch Recording
            </a>
          )}

          {isEnded && !cls.recordingUrl && (
            <div className="flex-1 py-3 text-center text-sm text-gray-400 bg-gray-50 rounded-xl">
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
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium border transition',
              selectedCourse === c.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
            {c.title}
          </button>
        ))}
      </div>

      {!selectedCourse ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
          Select a course to view assignments
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid gap-3">
          {assignments?.map((a: any) => {
            const isOverdue = new Date(a.dueDate) < new Date()
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                <div className={cn('p-3 rounded-xl flex-shrink-0', isOverdue ? 'bg-red-50' : 'bg-orange-50')}>
                  <FileText className={cn('w-5 h-5', isOverdue ? 'text-red-500' : 'text-orange-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  {a.instructions && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{a.instructions}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className={cn('flex items-center gap-1', isOverdue ? 'text-red-500' : 'text-gray-400')}>
                      <Clock className="w-3.5 h-3.5" />
                      Due: {formatDate(a.dueDate)} {isOverdue && '(Overdue)'}
                    </span>
                    <span className="text-gray-400">Max: {a.maxMarks} marks</span>
                    {a.allowLateSubmission && <span className="text-green-600">Late OK</span>}
                  </div>
                </div>
                <button className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  <Upload className="w-3.5 h-3.5" /> Submit
                </button>
              </div>
            )
          })}
          {!assignments?.length && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
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
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium border transition',
              selectedCourse === c.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
            {c.title}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {quizzes?.map((q: any) => {
            const isAvailable = (!q.availableFrom || new Date(q.availableFrom) <= new Date()) &&
              (!q.availableTo || new Date(q.availableTo) >= new Date())
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-purple-50 rounded-xl flex-shrink-0">
                    <Award className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{q.title}</h3>
                    {q.description && <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{q.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{q.questionCount} questions</span>
                      <span>·</span>
                      <span>{q.totalMarks} marks</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{q.timeLimitMinutes} min</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">Pass: {q.passingMarks}/{q.totalMarks}</div>
                  </div>
                </div>
                <button
                  onClick={() => onAttempt(q.id)}
                  disabled={!isAvailable}
                  className={cn(
                    'mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition',
                    isAvailable
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isAvailable ? 'Start Quiz' : 'Not Available'}
                </button>
              </div>
            )
          })}
          {!quizzes?.length && (
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
              No quizzes in this course
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Schedule Class Modal ───────────────────────────────────────────────────────
function ScheduleClassModal({ courses, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    courseId: courses[0]?.id ?? '',
    title: '',
    description: '',
    scheduledAt: '',
    durationMinutes: 60,
  })

  const mutation = useMutation({
    mutationFn: () => onlineLearningApi.scheduleLiveClass(form.courseId, {
      title: form.title,
      description: form.description,
      scheduledAt: form.scheduledAt,
      durationMinutes: form.durationMinutes,
    }),
    onSuccess: () => { toast.success('Class scheduled'); onSuccess() },
    onError: () => toast.error('Failed to schedule class'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold mb-4">Schedule Live Class</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Course</label>
            <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
              {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Chapter 5 - Introduction to Algebra"
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} placeholder="What will be covered in this class..."
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Date & Time</label>
              <input type="datetime-local" value={form.scheduledAt}
                onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Duration (min)</label>
              <input type="number" value={form.durationMinutes}
                onChange={e => setForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title || !form.scheduledAt}
            className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Schedule
          </button>
        </div>
      </div>
    </div>
  )
}
