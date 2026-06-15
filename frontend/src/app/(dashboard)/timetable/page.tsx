'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api as httpClient, timetableApi, hrApi } from '@/lib/api'
import { Plus, Printer, X } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Palette using CSS variable colors as inline style pairs: [bg, text, border]
const SUBJECT_COLOR_PALETTE: Array<{ bg: string; color: string; border: string }> = [
  { bg: 'var(--brand-bg)',    color: 'var(--brand)',   border: 'var(--brand)' },
  { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success)' },
  { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning)' },
  { bg: 'var(--danger-bg)',  color: 'var(--danger)',  border: 'var(--danger)' },
  // Repeat with opacity variants for more subjects
  { bg: 'color-mix(in srgb, var(--brand) 12%, transparent)',   color: 'var(--brand)',   border: 'color-mix(in srgb, var(--brand) 40%, transparent)' },
  { bg: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)', border: 'color-mix(in srgb, var(--success) 40%, transparent)' },
  { bg: 'color-mix(in srgb, var(--warning) 12%, transparent)', color: 'var(--warning)', border: 'color-mix(in srgb, var(--warning) 40%, transparent)' },
  { bg: 'color-mix(in srgb, var(--danger) 12%, transparent)',  color: 'var(--danger)',  border: 'color-mix(in srgb, var(--danger) 40%, transparent)' },
]

export default function TimetablePage() {
  const qc = useQueryClient()
  const [view, setView] = useState<'section' | 'teacher'>('section')
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('')
  const [modal, setModal] = useState<{ day: string; period: any } | null>(null)
  const [editEntry, setEditEntry] = useState<any>(null)

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => httpClient.get('/school/academic-years').then(r => r.data),
  })

  const { data: sections } = useQuery({
    queryKey: ['sections-all'],
    queryFn: () => httpClient.get('/school/sections').then(r => r.data),
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees({ pageSize: 200 }).then(r => r.data),
  })

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => httpClient.get('/school/subjects').then(r => r.data),
  })

  const { data: timetableData, isLoading } = useQuery({
    queryKey: ['timetable', view, selectedSectionId, selectedTeacherId, selectedAcademicYearId],
    queryFn: () => {
      if (view === 'section' && selectedSectionId && selectedAcademicYearId)
        return timetableApi.getSectionTimetable(selectedSectionId, selectedAcademicYearId).then(r => r.data)
      if (view === 'teacher' && selectedTeacherId && selectedAcademicYearId)
        return timetableApi.getTeacherTimetable(selectedTeacherId, selectedAcademicYearId).then(r => r.data)
      return null
    },
    enabled: !!(selectedAcademicYearId && (selectedSectionId || selectedTeacherId)),
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => timetableApi.saveEntries(selectedAcademicYearId, data.classId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable'] })
      setModal(null)
      setEditEntry(null)
    }
  })

  const periods = timetableData?.periods ?? []
  const entries: any[] = timetableData?.entries ?? []

  const getCellEntry = (day: string, periodId: string) =>
    entries.find(e => e.dayOfWeek === day && e.id === periodId)

  const subjectColorMap: Record<string, { bg: string; color: string; border: string }> = {}
  let colorIdx = 0
  entries.forEach(e => {
    if (e.subjectId && !subjectColorMap[e.subjectId]) {
      subjectColorMap[e.subjectId] = SUBJECT_COLOR_PALETTE[colorIdx++ % SUBJECT_COLOR_PALETTE.length]
    }
  })

  const getEntriesForCell = (day: string, period: any) =>
    entries.find(e => e.dayOfWeek === day && e.periodNumber === period.periodNumber)

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Timetable</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Manage class schedules and teacher assignments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="btn btn-ghost flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--surface-2)' }}>
          {(['section', 'teacher'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors',
                view === v
                  ? 'bg-white shadow'
                  : ''
              )}
              style={view === v
                ? { color: 'var(--brand)' }
                : { color: 'var(--text-3)' }
              }>
              {v === 'section' ? 'Class/Section' : 'Teacher'} View
            </button>
          ))}
        </div>

        <select value={selectedAcademicYearId} onChange={e => setSelectedAcademicYearId(e.target.value)}
          className="input-base focus-ring px-3 py-2 text-sm">
          <option value="">Select Academic Year</option>
          {(academicYears as any[])?.map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>

        {view === 'section' ? (
          <select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)}
            className="input-base focus-ring px-3 py-2 text-sm">
            <option value="">Select Section</option>
            {sections?.map?.((s: any) => <option key={s.id} value={s.id}>{s.className} - {s.name}</option>)}
          </select>
        ) : (
          <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}
            className="input-base focus-ring px-3 py-2 text-sm">
            <option value="">Select Teacher</option>
            {employees?.items?.map?.((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        )}
      </div>

      {/* Timetable Grid */}
      {isLoading ? (
        <div className="card p-12 text-center" style={{ color: 'var(--text-4)' }}>Loading timetable...</div>
      ) : !timetableData ? (
        <div className="card p-12 text-center" style={{ color: 'var(--text-4)' }}>
          Select an academic year and {view === 'section' ? 'section' : 'teacher'} to view the timetable.
        </div>
      ) : (
        <div className="card overflow-auto">
          <table className="w-full min-w-[700px]">
            <thead style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th className="table-header w-28 text-left">Period</th>
                <th className="table-header w-24 text-left">Time</th>
                {DAYS.map(d => (
                  <th key={d} className="table-header text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid var(--border)' }}>
              {periods.filter((p: any) => !p.isBreak).map((period: any) => (
                <tr key={period.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="table-cell font-medium" style={{ color: 'var(--text-2)' }}>
                    {period.name || `Period ${period.periodNumber}`}
                  </td>
                  <td className="table-cell text-xs whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                    {period.startTime}–{period.endTime}
                  </td>
                  {DAYS.map(day => {
                    const entry = getEntriesForCell(day, period)
                    const palette = entry?.subjectId ? subjectColorMap[entry.subjectId] : null
                    return (
                      <td key={day} className="px-2 py-2">
                        {entry ? (
                          <div
                            onClick={() => { setModal({ day, period }); setEditEntry(entry) }}
                            className="rounded-lg p-2 border cursor-pointer hover:opacity-80 transition-opacity"
                            style={palette
                              ? { background: palette.bg, color: palette.color, borderColor: palette.border }
                              : { background: 'var(--surface-2)', borderColor: 'var(--border)' }
                            }>
                            <p className="text-xs font-semibold leading-tight">{entry.subjectName || '—'}</p>
                            <p className="text-xs opacity-70 truncate">{entry.teacherName || ''}</p>
                            {entry.room && <p className="text-xs opacity-50">Rm {entry.room}</p>}
                          </div>
                        ) : (
                          <div
                            onClick={() => { setModal({ day, period }); setEditEntry(null) }}
                            className="rounded-lg p-2 border border-dashed cursor-pointer transition-colors min-h-[48px] flex items-center justify-center"
                            style={{ borderColor: 'var(--border)' }}
                            onMouseEnter={e => {
                              const el = e.currentTarget as HTMLElement
                              el.style.borderColor = 'var(--brand)'
                              el.style.background = 'var(--brand-bg)'
                            }}
                            onMouseLeave={e => {
                              const el = e.currentTarget as HTMLElement
                              el.style.borderColor = 'var(--border)'
                              el.style.background = ''
                            }}
                          >
                            <Plus className="w-4 h-4" style={{ color: 'var(--text-4)' }} />
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subject Legend */}
      {Object.keys(subjectColorMap).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entries.filter((e, i, arr) => e.subjectId && arr.findIndex(a => a.subjectId === e.subjectId) === i)
            .map(e => {
              const palette = subjectColorMap[e.subjectId]
              return (
                <span
                  key={e.subjectId}
                  className="text-xs px-2 py-1 rounded-full border"
                  style={palette
                    ? { background: palette.bg, color: palette.color, borderColor: palette.border }
                    : {}
                  }
                >
                  {e.subjectName}
                </span>
              )
            })}
        </div>
      )}

      {/* Edit Modal */}
      {modal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}
        >
          <div className="card w-full max-w-md shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>
                {modal.day} — {modal.period.name || `Period ${modal.period.periodNumber}`}
              </h3>
              <button onClick={() => setModal(null)} className="btn btn-ghost p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <EditPeriodForm
              entry={editEntry}
              subjects={subjects ?? []}
              employees={employees?.items ?? []}
              onSave={(data: any) => {
                saveMutation.mutate({
                  sectionId: selectedSectionId,
                  periodId: modal.period.id,
                  dayOfWeek: modal.day,
                  classId: sections?.find?.((s: any) => s.id === selectedSectionId)?.classId,
                  ...data,
                })
              }}
              onClose={() => setModal(null)}
              isSaving={saveMutation.isPending}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function EditPeriodForm({ entry, subjects, employees, onSave, onClose, isSaving }: any) {
  const [subjectId, setSubjectId] = useState(entry?.subjectId ?? '')
  const [employeeId, setEmployeeId] = useState(entry?.employeeId ?? '')
  const [room, setRoom] = useState(entry?.room ?? '')

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Subject</label>
        <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
          className="input-base focus-ring w-full mt-1 px-3 py-2 text-sm">
          <option value="">Select Subject</option>
          {subjects.map?.((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Teacher</label>
        <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
          className="input-base focus-ring w-full mt-1 px-3 py-2 text-sm">
          <option value="">Select Teacher</option>
          {employees.map?.((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Room</label>
        <input value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. Room 101"
          className="input-base focus-ring w-full mt-1 px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-ghost px-4 py-2">Cancel</button>
        <button
          onClick={() => onSave({ subjectId: subjectId || null, employeeId: employeeId || null, room: room || null })}
          disabled={isSaving}
          className="btn btn-primary px-4 py-2 disabled:opacity-60">
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
