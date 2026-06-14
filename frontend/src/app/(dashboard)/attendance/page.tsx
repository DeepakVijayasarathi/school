'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi, schoolApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Save, CheckCircle, XCircle, Clock, Minus } from 'lucide-react'
import type { AttendanceRecord } from '@/types'

const STATUS_OPTIONS = [
  { value: 'Present', label: 'P', icon: CheckCircle, color: 'text-green-600 bg-green-100 border-green-300' },
  { value: 'Absent', label: 'A', icon: XCircle, color: 'text-red-600 bg-red-100 border-red-300' },
  { value: 'Late', label: 'L', icon: Clock, color: 'text-yellow-600 bg-yellow-100 border-yellow-300' },
  { value: 'HalfDay', label: 'H', icon: Minus, color: 'text-blue-600 bg-blue-100 border-blue-300' },
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
    queryFn: () => attendanceApi.getStudents(sectionId, date).then((r) => {
      const att: Record<string, string> = {}
      r.data.forEach((s: any) => { att[s.id] = s.status })
      setAttendance(att)
      return r.data
    }),
    enabled: !!sectionId,
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 text-sm">Mark student attendance</p>
        </div>
        {sectionId && records && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={classId}
          onChange={(e) => { setClassId(e.target.value); setSectionId('') }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Class</option>
          {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {classId && (
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
            { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-800' },
            { label: 'Present', value: stats.present, color: 'bg-green-100 text-green-800' },
            { label: 'Absent', value: stats.absent, color: 'bg-red-100 text-red-800' },
            { label: 'Late', value: stats.late, color: 'bg-yellow-100 text-yellow-800' },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mark all buttons */}
      {records && records.length > 0 && (
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">Mark all as:</span>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => markAll(opt.value)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border', opt.color)}
            >
              {opt.label} - {opt.value}
            </button>
          ))}
        </div>
      )}

      {/* Attendance list */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">Loading...</div>
      ) : !sectionId ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          Select a class and section to mark attendance
        </div>
      ) : records?.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          No students found in this section
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records?.map((student: any, i: number) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                        {student.fullName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
                        <p className="text-xs text-gray-400">{student.admissionNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.rollNumber ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAttendance((prev) => ({ ...prev, [student.id]: opt.value }))}
                          className={cn(
                            'w-9 h-9 rounded-lg text-xs font-bold border-2 transition-all',
                            attendance[student.id] === opt.value ? opt.color : 'border-gray-200 text-gray-400 hover:border-gray-300'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
