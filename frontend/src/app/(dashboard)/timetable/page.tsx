'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api as httpClient, timetableApi, hrApi } from '@/lib/api'
import { Plus, Printer, AlertTriangle, ChevronDown, X } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SUBJECT_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
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

  const subjectColorMap: Record<string, string> = {}
  let colorIdx = 0
  entries.forEach(e => {
    if (e.subjectId && !subjectColorMap[e.subjectId]) {
      subjectColorMap[e.subjectId] = SUBJECT_COLORS[colorIdx++ % SUBJECT_COLORS.length]
    }
  })

  const getEntriesForCell = (day: string, period: any) =>
    entries.find(e => e.dayOfWeek === day && e.periodNumber === period.periodNumber)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-gray-500 text-sm">Manage class schedules and teacher assignments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['section', 'teacher'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors',
                view === v ? 'bg-white shadow text-blue-600' : 'text-gray-500')}>
              {v === 'section' ? 'Class/Section' : 'Teacher'} View
            </button>
          ))}
        </div>

        <select value={selectedAcademicYearId} onChange={e => setSelectedAcademicYearId(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Select Academic Year</option>
          {academicYears?.items?.map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>

        {view === 'section' ? (
          <select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">Select Section</option>
            {sections?.map?.((s: any) => <option key={s.id} value={s.id}>{s.className} - {s.name}</option>)}
          </select>
        ) : (
          <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">Select Teacher</option>
            {employees?.items?.map?.((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        )}
      </div>

      {/* Timetable Grid */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">Loading timetable...</div>
      ) : !timetableData ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          Select an academic year and {view === 'section' ? 'section' : 'teacher'} to view the timetable.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Time</th>
                {DAYS.map(d => (
                  <th key={d} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {periods.filter((p: any) => !p.isBreak).map((period: any) => (
                <tr key={period.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{period.name || `Period ${period.periodNumber}`}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{period.startTime}–{period.endTime}</td>
                  {DAYS.map(day => {
                    const entry = getEntriesForCell(day, period)
                    return (
                      <td key={day} className="px-2 py-2">
                        {entry ? (
                          <div
                            onClick={() => { setModal({ day, period }); setEditEntry(entry) }}
                            className={cn(
                              'rounded-lg p-2 border cursor-pointer hover:opacity-80 transition-opacity',
                              entry.subjectId ? subjectColorMap[entry.subjectId] : 'bg-gray-50 border-gray-100'
                            )}>
                            <p className="text-xs font-semibold leading-tight">{entry.subjectName || '—'}</p>
                            <p className="text-xs opacity-70 truncate">{entry.teacherName || ''}</p>
                            {entry.room && <p className="text-xs opacity-50">Rm {entry.room}</p>}
                          </div>
                        ) : (
                          <div
                            onClick={() => { setModal({ day, period }); setEditEntry(null) }}
                            className="rounded-lg p-2 border border-dashed border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors min-h-[48px] flex items-center justify-center">
                            <Plus className="w-4 h-4 text-gray-300" />
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
            .map(e => (
              <span key={e.subjectId} className={cn('text-xs px-2 py-1 rounded-full border', subjectColorMap[e.subjectId])}>
                {e.subjectName}
              </span>
            ))}
        </div>
      )}

      {/* Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {modal.day} — {modal.period.name || `Period ${modal.period.periodNumber}`}
              </h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded">
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
        </div>
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
        <label className="text-sm font-medium text-gray-700">Subject</label>
        <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Select Subject</option>
          {subjects.map?.((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Teacher</label>
        <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Select Teacher</option>
          {employees.map?.((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Room</label>
        <input value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. Room 101"
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
        <button
          onClick={() => onSave({ subjectId: subjectId || null, employeeId: employeeId || null, room: room || null })}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
