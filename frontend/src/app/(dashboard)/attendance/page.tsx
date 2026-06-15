'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi, schoolApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Save, CheckCircle, XCircle, Clock, Minus, Users, MousePointerClick } from 'lucide-react'
import type { AttendanceRecord } from '@/types'

const STATUS_OPTIONS = [
  {
    value: 'Present',
    label: 'P',
    icon: CheckCircle,
    style: { color: 'var(--success)', backgroundColor: 'var(--success-bg)', borderColor: 'var(--success)' },
  },
  {
    value: 'Absent',
    label: 'A',
    icon: XCircle,
    style: { color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger)' },
  },
  {
    value: 'Late',
    label: 'L',
    icon: Clock,
    style: { color: 'var(--warning)', backgroundColor: 'var(--warning-bg)', borderColor: 'var(--warning)' },
  },
  {
    value: 'HalfDay',
    label: 'H',
    icon: Minus,
    style: { color: 'var(--brand)', backgroundColor: 'var(--brand-bg)', borderColor: 'var(--brand)' },
  },
]

export default function AttendancePage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const qc = useQueryClient()

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolApi.getClasses().then((r) => r.data),
  })

  const { data: sections } = useQuery({
    queryKey: ['sections', classId],
    queryFn: () => schoolApi.getSections(classId).then((r) => r.data),
    enabled: !!classId,
  })

  const { data: records, isLoading } = useQuery({
    queryKey: ['attendance', sectionId, date],
    queryFn: () => attendanceApi.getStudents(sectionId, date).then((r) => r.data),
    enabled: !!sectionId,
  })

  useEffect(() => {
    if (records) {
      const att: Record<string, string> = {}
      records.forEach((s: any) => { att[s.id] = s.status })
      setAttendance(att)
    }
  }, [records])

  const saveMutation = useMutation({
    mutationFn: () =>
      attendanceApi.markStudents({
        sectionId,
        date,
        entries: Object.entries(attendance).map(([studentId, status]) => ({
          studentId,
          status,
          remarks: null,
        })),
      }),
    onSuccess: () => {
      toast.success('Attendance saved!')
      qc.invalidateQueries({ queryKey: ['attendance', sectionId, date] })
    },
    onError: () => toast.error('Failed to save attendance'),
  })

  const markAll = (status: string) => {
    if (!records) return
    const all: Record<string, string> = {}
    records.forEach((r: any) => { all[r.id] = status })
    setAttendance(all)
  }

  const stats = records ? {
    present: Object.values(attendance).filter((s) => s === 'Present').length,
    absent: Object.values(attendance).filter((s) => s === 'Absent').length,
    late: Object.values(attendance).filter((s) => s === 'Late').length,
    total: records.length,
  } : null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Attendance</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Mark student attendance</p>
        </div>
        {sectionId && records && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-base focus-ring"
        />

        <select
          value={classId}
          onChange={(e) => { setClassId(e.target.value); setSectionId('') }}
          className="input-base focus-ring"
        >
          <option value="">Select Class</option>
          {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {classId && (
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="input-base focus-ring"
          >
            <option value="">Select Section</option>
            {sections?.map((s: any) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
          </select>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, style: { backgroundColor: 'var(--surface-2)', color: 'var(--text-1)' } },
            { label: 'Present', value: stats.present, style: { backgroundColor: 'var(--success-bg)', color: 'var(--success)' } },
            { label: 'Absent', value: stats.absent, style: { backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' } },
            { label: 'Late', value: stats.late, style: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' } },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={s.style}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mark all buttons */}
      {records && records.length > 0 && (
        <div className="flex gap-2 items-center">
          <span className="text-sm" style={{ color: 'var(--text-3)' }}>Mark all as:</span>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => markAll(opt.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border-2"
              style={opt.style}
            >
              {opt.label} - {opt.value}
            </button>
          ))}
        </div>
      )}

      {/* Attendance list */}
      {!sectionId ? (
        <div className="card p-16 text-center">
          <MousePointerClick className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>Select class and section</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Choose a class and section above to start marking attendance</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="table-header">
                  <th className="table-cell w-10 text-left">#</th>
                  <th className="table-cell text-left">Student</th>
                  <th className="table-cell text-left">Roll No</th>
                  <th className="table-cell text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><div className="skeleton h-3 w-4 rounded" /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="skeleton w-8 h-8 rounded-full" />
                            <div className="space-y-1.5">
                              <div className="skeleton h-3 w-28 rounded" />
                              <div className="skeleton h-2.5 w-20 rounded" />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><div className="skeleton h-3 w-12 rounded" /></td>
                        <td className="px-4 py-3"><div className="flex gap-1">{Array.from({ length: 4 }).map((_, j) => <div key={j} className="skeleton w-9 h-9 rounded-lg" />)}</div></td>
                      </tr>
                    ))
                  : records?.length === 0
                  ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-16 text-center">
                          <Users className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-4)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-4)' }}>No students found in this section</p>
                        </td>
                      </tr>
                    )
                  : records?.map((student: any, i: number) => (
                      <tr key={student.id} className="table-row-hover transition-colors">
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-4)' }}>{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                              style={{ backgroundColor: 'var(--brand-bg)', color: 'var(--brand)' }}
                            >
                              {student.fullName?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{student.fullName}</p>
                              <p className="text-xs" style={{ color: 'var(--text-4)' }}>{student.admissionNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-3)' }}>{student.rollNumber ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {STATUS_OPTIONS.map((opt) => {
                              const isSelected = attendance[student.id] === opt.value
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setAttendance((prev) => ({ ...prev, [student.id]: opt.value }))}
                                  className="w-9 h-9 rounded-lg text-xs font-bold border-2 transition-all"
                                  style={
                                    isSelected
                                      ? opt.style
                                      : { borderColor: 'var(--border)', color: 'var(--text-4)' }
                                  }
                                >
                                  {opt.label}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
