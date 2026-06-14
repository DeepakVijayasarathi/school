'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api as httpClient, schoolApi, timetableApi } from '@/lib/api'
import { Plus, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const EVENT_TYPES = [
  { value: 'holiday',         label: 'Holiday',       color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'national_holiday',label: 'National Holiday',color: 'bg-red-200 text-red-800 border-red-300' },
  { value: 'exam',            label: 'Exam',          color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'ptm',             label: 'PTM',           color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'sports',          label: 'Sports',        color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'cultural',        label: 'Cultural',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'school_event',    label: 'School Event',  color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { value: 'half_day',        label: 'Half Day',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'other',           label: 'Other',         color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function AcademicCalendarPage() {
  const qc = useQueryClient()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [filterType, setFilterType] = useState('')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [academicYearId, setAcademicYearId] = useState('')

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => schoolApi.getAcademicYears().then(r => r.data),
  })

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', academicYearId, month, year],
    queryFn: () => httpClient.get('/timetable/calendar', { params: { academicYearId, month: month + 1, year } }).then(r => r.data),
    enabled: !!academicYearId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => httpClient.delete(`/timetable/calendar/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-events'] })
  })

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return (events as any[]).filter(e => {
      const start = e.startDate?.slice(0, 10)
      const end = e.endDate?.slice(0, 10)
      return dateStr >= start && dateStr <= end
    })
  }

  const filteredEvents = filterType
    ? (events as any[]).filter(e => e.eventType === filterType)
    : (events as any[])

  const getEventColor = (type: string) =>
    EVENT_TYPES.find(t => t.value === type)?.color ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Calendar</h1>
          <p className="text-gray-500 text-sm">Holidays, exams, events and PTM schedules</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Select Academic Year</option>
          {(academicYears as any[])?.map?.((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>

        <div className="flex gap-1">
          <button onClick={() => setFilterType('')}
            className={cn('px-3 py-1.5 text-sm border rounded-lg', !filterType ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200')}>
            All
          </button>
          {EVENT_TYPES.map(t => (
            <button key={t.value} onClick={() => setFilterType(t.value === filterType ? '' : t.value)}
              className={cn('px-3 py-1.5 text-xs border rounded-lg', filterType === t.value ? t.color : 'border-gray-200 text-gray-600')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="font-semibold text-gray-900">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 uppercase border-b">
            {WEEKDAYS.map(d => <div key={d} className="py-2">{d}</div>)}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`e${i}`} className="min-h-[80px] border-b border-r border-gray-50" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dayEvents = getEventsForDay(day)
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const isSelected = selectedDay === day
              const isHoliday = dayEvents.some(e => e.isHoliday)

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={cn(
                    'min-h-[80px] border-b border-r border-gray-50 p-1 cursor-pointer hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-blue-50',
                    isHoliday && 'bg-red-50'
                  )}
                >
                  <span className={cn(
                    'inline-flex w-6 h-6 items-center justify-center rounded-full text-sm',
                    isToday ? 'bg-blue-600 text-white font-semibold' : 'text-gray-900'
                  )}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className={cn('text-xs px-1 rounded truncate border', getEventColor(e.eventType))}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-400">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Event List Sidebar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900">
              {selectedDay
                ? `Events on ${selectedDay} ${MONTHS[month]}`
                : 'All Events'}
            </h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {(selectedDay ? getEventsForDay(selectedDay) : filteredEvents).map((e: any) => (
              <div key={e.id} className="px-4 py-3 hover:bg-gray-50 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{e.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(e.startDate).toLocaleDateString()}
                      {e.startDate !== e.endDate && ` – ${new Date(e.endDate).toLocaleDateString()}`}
                    </p>
                    {e.description && <p className="text-xs text-gray-500 mt-1">{e.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border whitespace-nowrap', getEventColor(e.eventType))}>
                      {EVENT_TYPES.find(t => t.value === e.eventType)?.label}
                    </span>
                    <button
                      onClick={() => deleteMutation.mutate(e.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {e.isHoliday && (
                  <span className="text-xs text-red-600 font-medium mt-1 block">Holiday (School Closed)</span>
                )}
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <div className="px-4 py-12 text-center text-gray-400 text-sm">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No events found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map(t => (
          <span key={t.value} className={cn('text-xs px-2 py-1 rounded-full border', t.color)}>{t.label}</span>
        ))}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <AddEventModal
          academicYearId={academicYearId}
          defaultDate={selectedDay ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` : undefined}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); qc.invalidateQueries({ queryKey: ['calendar-events'] }) }}
        />
      )}
    </div>
  )
}

function AddEventModal({ academicYearId, defaultDate, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    title: '', description: '', eventType: 'other',
    startDate: defaultDate ?? new Date().toISOString().split('T')[0],
    endDate: defaultDate ?? new Date().toISOString().split('T')[0],
    isHoliday: false,
  })

  const mutation = useMutation({
    mutationFn: (data: any) => timetableApi.createCalendarEvent(data),
    onSuccess: onSaved,
  })

  const upd = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Add Calendar Event</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Title *</label>
            <input value={form.title} onChange={e => upd('title', e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Event Type</label>
            <select value={form.eventType} onChange={e => upd('eventType', e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => upd('startDate', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <input type="date" value={form.endDate} onChange={e => upd('endDate', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description} onChange={e => upd('description', e.target.value)} rows={2}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isHoliday} onChange={e => upd('isHoliday', e.target.checked)}
              className="rounded" />
            <span className="text-sm text-gray-700">School closed on this day (Holiday)</span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate({ ...form, academicYearId })}
            disabled={!form.title || mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {mutation.isPending ? 'Saving...' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
