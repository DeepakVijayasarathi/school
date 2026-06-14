'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Plus, Search, Users, ClipboardList, UserCheck, X } from 'lucide-react'

const STATUSES = [
  { value: 'inquiry',        label: 'Inquiry',        color: 'bg-gray-100 text-gray-700' },
  { value: 'applied',        label: 'Applied',        color: 'bg-blue-100 text-blue-700' },
  { value: 'shortlisted',    label: 'Shortlisted',    color: 'bg-purple-100 text-purple-700' },
  { value: 'test_scheduled', label: 'Test Scheduled', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'interview',      label: 'Interview',      color: 'bg-orange-100 text-orange-700' },
  { value: 'admitted',       label: 'Admitted',       color: 'bg-green-100 text-green-700' },
  { value: 'rejected',       label: 'Rejected',       color: 'bg-red-100 text-red-700' },
]

const api = (path: string, opts?: RequestInit) =>
  fetch(`/api/admissions${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(r => r.json())

export default function AdmissionsPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [tab, setTab] = useState<'inquiries' | 'applications'>('applications')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  const { data: applications } = useQuery({
    queryKey: ['applications', search, statusFilter],
    queryFn: () => api(`/applications?search=${search}&status=${statusFilter}`),
  })

  const { data: inquiries } = useQuery({
    queryKey: ['inquiries', search],
    queryFn: () => api(`/inquiries?search=${search}`),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] })
  })

  const stats = applications?.stats ?? []
  const items = applications?.items ?? []

  const getCountByStatus = (s: string) => stats.find((st: any) => st.status === s)?.count ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admissions</h1>
          <p className="text-gray-500 text-sm">Manage student admissions pipeline</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Application
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {STATUSES.slice(0, 6).map(s => (
          <div key={s.value} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{getCountByStatus(s.value)}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-white rounded-lg shadow-sm border border-gray-100 p-1">
          {(['applications', 'inquiries'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-1.5 rounded-md text-sm font-medium capitalize',
                tab === t ? 'bg-blue-600 text-white' : 'text-gray-600')}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'applications' && (
          <div className="flex gap-1 bg-white rounded-lg shadow-sm border border-gray-100 p-1">
            {(['kanban', 'table'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn('px-3 py-1.5 rounded-md text-sm font-medium capitalize',
                  view === v ? 'bg-gray-200 text-gray-800' : 'text-gray-500')}>
                {v}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Inquiries Table */}
      {tab === 'inquiries' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Student Name', 'Class Seeking', 'Parent Name', 'Phone', 'Source', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(inquiries?.items ?? []).map((i: any) => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{i.studentName}</td>
                  <td className="px-4 py-3 text-sm">{i.classSeeking}</td>
                  <td className="px-4 py-3 text-sm">{i.parentName}</td>
                  <td className="px-4 py-3 text-sm">{i.parentPhone}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{i.source?.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize font-medium',
                      STATUSES.find(s => s.value === i.status)?.color ?? 'bg-gray-100 text-gray-700')}>
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(i.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-blue-600 hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Applications - Kanban View */}
      {tab === 'applications' && view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map(status => {
            const colItems = items.filter((a: any) => a.status === status.value)
            return (
              <div key={status.value} className="flex-shrink-0 w-64">
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', status.color)}>
                    {status.label}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{colItems.length}</span>
                </div>
                <div className="space-y-2">
                  {colItems.map((app: any) => (
                    <div
                      key={app.id}
                      onClick={() => setSelected(app)}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <p className="text-sm font-medium text-gray-900">{app.studentName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{app.fatherName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{app.contactPhone}</p>
                      <p className="text-xs text-gray-300 mt-1">{app.applicationNumber}</p>
                    </div>
                  ))}
                  {colItems.length === 0 && (
                    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                      No applications
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Applications - Table View */}
      {tab === 'applications' && view === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['App No', 'Student', 'Father', 'Phone', 'Status', 'Applied On', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((app: any) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{app.applicationNumber}</td>
                  <td className="px-4 py-3 text-sm font-medium">{app.studentName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{app.fatherName}</td>
                  <td className="px-4 py-3 text-sm">{app.contactPhone}</td>
                  <td className="px-4 py-3">
                    <select
                      value={app.status}
                      onChange={e => statusMutation.mutate({ id: app.id, status: e.target.value })}
                      className={cn('text-xs px-2 py-1 rounded-full border font-medium cursor-pointer',
                        STATUSES.find(s => s.value === app.status)?.color)}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(app)} className="text-xs text-blue-600 hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Application Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelected(null)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold">Application Detail</h3>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-500">App Number:</div><div className="font-medium">{selected.applicationNumber}</div>
                <div className="text-gray-500">Student:</div><div className="font-medium">{selected.studentName}</div>
                <div className="text-gray-500">Father:</div><div className="font-medium">{selected.fatherName} ({selected.contactPhone})</div>
                <div className="text-gray-500">Status:</div>
                <div>
                  <select
                    value={selected.status}
                    onChange={e => { statusMutation.mutate({ id: selected.id, status: e.target.value }); setSelected({ ...selected, status: e.target.value }) }}
                    className={cn('text-xs px-2 py-1 rounded-full border font-medium',
                      STATUSES.find(s => s.value === selected.status)?.color)}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 border border-blue-500 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50">
                  Schedule Test
                </button>
                <button className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  Convert to Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
