'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api as httpClient, schoolApi, timetableApi } from '@/lib/api'
import { Plus, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

// Event type definitions with CSS-var-based inline styles instead of Tailwind color classes
const EVENT_TYPES = [
  { value: 'holiday',          label: 'Holiday',        style: { color: 'var(--danger)',  background: 'var(--danger-bg)',  border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)' } },
  { value: 'national_holiday', label: 'National Holiday',style: { color: 'var(--danger)',  background: 'color-mix(in srgb, var(--danger-bg) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)' } },
  { value: 'exam',             label: 'Exam',           style: { color: 'var(--brand)',   background: 'var(--brand-bg)',   border: '1px solid color-mix(in srgb, var(--brand) 25%, transparent)' } },
  { value: 'ptm',              label: 'PTM',            style: { color: 'var(--success)', background: 'var(--success-bg)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)' } },
  { value: 'sports',           label: 'Sports',         style: { color: 'var(--warning)', background: 'var(--warning-bg)', border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)' } },
  { value: 'cultural',         label: 'Cultural',       style: { color: '#7c3aed',        background: '#f5f3ff',           border: '1px solid #ddd6fe' } },
  { value: 'school_event',     label: 'School Event',   style: { color: '#0d9488',        background: '#f0fdfa',           border: '1px solid #99f6e4' } },
  { value: 'half_day',         label: 'Half Day',       style: { color: 'var(--warning)', background: 'var(--warning-bg)', border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)', opacity: '0.85' } },
  { value: 'other',            label: 'Other',          style: { color: 'var(--text-3)',  background: 'var(--surface-2)',  border: '1px solid var(--border)' } },
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

  const getEventStyle = (type: string): React.CSSProperties =>
    EVENT_TYPES.find(t => t.value === type)?.style ?? { color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border)' }

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Academic Calendar</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Holidays, exams, events and PTM schedules</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)}
          className="input-base focus-ring">
          <option value="">Select Academic Year</option>
          {(academicYears as any[])?.map?.((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>

        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterType('')}
            className="px-3 py-1.5 text-sm rounded-lg transition-colors"
            style={!filterType
              ? { border: '1px solid var(--brand)', background: 'var(--brand-bg)', color: 'var(--brand)' }
              : { border: '1px solid var(--border)', color: 'var(--text-3)', background: 'transparent' }
            }>
            All
          </button>
          {EVENT_TYPES.map(t => (
            <button key={t.value} onClick={() => setFilterType(t.value === filterType ? '' : t.value)}
              className="px-3 py-1.5 text-xs rounded-lg transition-colors"
              style={filterType === t.value ? t.style : { border: '1px solid var(--border)', color: 'var(--text-3)', background: 'transparent' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 card overflow-hidden" style={{ padding: 0 }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <button onClick={prevMonth} className="p-1 rounded transition-colors hover:bg-[color:var(--surface-2)]"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-1 rounded transition-colors hover:bg-[color:var(--surface-2)]"><ChevronRight className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-medium uppercase" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} className="py-2" style={i === 0 || i === 6 ? { color: 'var(--danger)' } : {}}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`e${i}`} className="min-h-[80px]" style={{ borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dayEvents = getEventsForDay(day)
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const isSelected = selectedDay === day
              const isHoliday = dayEvents.some(e => e.isHoliday)
              const dayOfWeek = (firstDay + i) % 7
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className="min-h-[80px] p-1 cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    background: isSelected ? 'var(--brand-bg)' : isHoliday ? 'var(--danger-bg)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected && !isHoliday) e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'var(--brand-bg)' : isHoliday ? 'var(--danger-bg)' : 'transparent' }}
                >
                  <span
                    className="inline-flex w-6 h-6 items-center justify-center rounded-full text-sm"
                    style={isToday
                      ? { background: 'var(--brand)', color: '#fff', fontWeight: 600 }
                      : { color: isWeekend ? 'var(--danger)' : 'var(--text-1)' }
                    }
                  >{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className="text-xs px-1 rounded truncate" style={getEventStyle(e.eventType)}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs" style={{ color: 'var(--text-4)' }}>+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Event List Sidebar */}
        <div className="card overflow-hidden" style={{ padding: 0 }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>
              {selectedDay
                ? `Events on ${selectedDay} ${MONTHS[month]}`
                : 'All Events'}
            </h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {(selectedDay ? getEventsForDay(selectedDay) : filteredEvents).map((e: any) => (
              <div key={e.id} className="px-4 py-3 group transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{e.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>
                      {new Date(e.startDate).toLocaleDateString()}
                      {e.startDate !== e.endDate && ` – ${new Date(e.endDate).toLocaleDateString()}`}
                    </p>
                    {e.description && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{e.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={getEventStyle(e.eventType)}>
                      {EVENT_TYPES.find(t => t.value === e.eventType)?.label}
                    </span>
                    <button
                      onClick={() => deleteMutation.mutate(e.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--danger)' }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {e.isHoliday && (
                  <span className="text-xs font-medium mt-1 block" style={{ color: 'var(--danger)' }}>Holiday (School Closed)</span>
                )}
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <div className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-4)' }}>
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
          <span key={t.value} className="text-xs px-2 py-1 rounded-full" style={t.style}>{t.label}</span>
        ))}
      </div>

      {/* Add Event Modal via createPortal */}
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
  const todayStr = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    title: '', description: '', eventType: 'other',
    startDate: defaultDate ?? todayStr,
    endDate: defaultDate ?? todayStr,
    isHoliday: false,
  })
  const [dateError, setDateError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: any) => timetableApi.createCalendarEvent(data),
    onSuccess: onSaved,
    onError: () => toast.error('Failed to add event'),
  })

  const upd = (f: string, v: any) => {
    setForm(p => {
      const next = { ...p, [f]: v }
      // Auto-advance endDate if it falls before startDate
      if (f === 'startDate' && next.endDate < v) next.endDate = v
      return next
    })
    setDateError('')
  }

  const handleSubmit = () => {
    if (!form.title.trim()) return
    if (form.endDate < form.startDate) {
      setDateError('End date must be on or after the start date.')
      return
    }
    mutation.mutate({ ...form, academicYearId })
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: '0 25px 60px rgba(0,0,0,.3)',
        maxWidth: '480px',
        width: '100%',
        padding: '24px',
      }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-1)' }}>Add Calendar Event</h3>
          <button onClick={onClose} className="transition-colors" style={{ color: 'var(--text-3)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Title *</label>
            <input value={form.title} onChange={e => upd('title', e.target.value)}
              className="input-base focus-ring w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Event Type</label>
            <select value={form.eventType} onChange={e => upd('eventType', e.target.value)}
              className="input-base focus-ring w-full mt-1">
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => upd('startDate', e.target.value)}
                className="input-base focus-ring w-full mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>End Date</label>
              <input type="date" value={form.endDate} min={form.startDate} onChange={e => upd('endDate', e.target.value)}
                className="input-base focus-ring w-full mt-1" />
            </div>
          </div>
          {dateError && (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>{dateError}</p>
          )}
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Description</label>
            <textarea value={form.description} onChange={e => upd('description', e.target.value)} rows={2}
              className="input-base focus-ring w-full mt-1 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isHoliday} onChange={e => upd('isHoliday', e.target.checked)}
              className="rounded" />
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>School closed on this day (Holiday)</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!form.title || mutation.isPending}
            className="btn btn-primary disabled:opacity-60">
            {mutation.isPending ? 'Saving...' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
