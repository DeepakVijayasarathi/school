'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { admissionApi, schoolApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Search, X, Loader2 } from 'lucide-react'

const STATUSES = [
  { value: 'inquiry',        label: 'Inquiry',        color: 'bg-gray-100 text-gray-700' },
  { value: 'applied',        label: 'Applied',        color: 'bg-blue-100 text-blue-700' },
  { value: 'shortlisted',    label: 'Shortlisted',    color: 'bg-purple-100 text-purple-700' },
  { value: 'test_scheduled', label: 'Test Scheduled', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'interview',      label: 'Interview',      color: 'bg-orange-100 text-orange-700' },
  { value: 'admitted',       label: 'Admitted',       color: 'bg-green-100 text-green-700' },
  { value: 'rejected',       label: 'Rejected',       color: 'bg-red-100 text-red-700' },
]

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all'

const emptyApp = {
  studentFirstName: '', studentLastName: '',
  fatherName: '', motherName: '',
  contactPhone: '', contactEmail: '',
  gender: '', dateOfBirth: '',
  classId: '', academicYearId: '',
  address: '', previousSchool: '',
  source: 'direct',
}

export default function AdmissionsPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [tab, setTab] = useState<'applications' | 'inquiries'>('applications')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ ...emptyApp })

  const { data: applications } = useQuery({
    queryKey: ['applications', search],
    queryFn: () => admissionApi.getApplications({ search: search || undefined, pageSize: 100 }).then(r => r.data),
  })

  const { data: inquiries } = useQuery({
    queryKey: ['inquiries', search],
    queryFn: () => admissionApi.getInquiries({ search: search || undefined, pageSize: 100 }).then(r => r.data),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolApi.getClasses().then(r => r.data),
  })

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => schoolApi.getAcademicYears().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => admissionApi.createApplication({
      studentFirstName: form.studentFirstName,
      studentLastName: form.studentLastName || undefined,
      fatherName: form.fatherName,
      motherName: form.motherName || undefined,
      contactPhone: form.contactPhone || undefined,
      contactEmail: form.contactEmail || undefined,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      classId: form.classId || undefined,
      academicYearId: form.academicYearId || undefined,
      address: form.address || undefined,
      previousSchool: form.previousSchool || undefined,
    }),
    onSuccess: (res) => {
      toast.success(`Application ${res.data.applicationNumber} created`)
      setShowAdd(false)
      setForm({ ...emptyApp })
      qc.invalidateQueries({ queryKey: ['applications'] })
    },
    onError: () => toast.error('Failed to create application'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      admissionApi.updateStatus(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  })

  const convertMutation = useMutation({
    mutationFn: (id: string) => admissionApi.convertToStudent(id),
    onSuccess: (res) => {
      toast.success(`Student created: ${res.data.admissionNumber}`)
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['applications'] })
    },
    onError: () => toast.error('Failed to convert — ensure status is admitted/shortlisted'),
  })

  const stats = applications?.stats ?? []
  const items = applications?.items ?? []
  const canSubmit = form.studentFirstName.trim() && form.fatherName.trim()

  const getCount = (s: string) => stats.find((st: any) => st.status === s)?.count ?? 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admissions</h1>
          <p className="text-gray-500 text-sm">Manage student admissions pipeline</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200">
          <Plus className="w-4 h-4" /> New Application
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {STATUSES.slice(0, 6).map(s => (
          <div key={s.value} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{getCount(s.value)}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1">
          {(['applications', 'inquiries'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
                tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-800')}>
              {t}
            </button>
          ))}
        </div>
        {tab === 'applications' && (
          <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1">
            {(['kanban', 'table'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
                  view === v ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
                {v}
              </button>
            ))}
          </div>
        )}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
        </div>
      </div>

      {/* Inquiries Table */}
      {tab === 'inquiries' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50/70 border-b border-gray-100">
                <tr>
                  {['Student Name', 'Class Seeking', 'Parent Name', 'Phone', 'Source', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(inquiries?.items ?? []).map((i: any) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{i.studentName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{i.classSeeking}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{i.parentName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{i.parentPhone}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{i.source?.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize',
                        STATUSES.find(s => s.value === i.status)?.color ?? 'bg-gray-100 text-gray-700')}>
                        {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(i.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!inquiries?.items?.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No inquiries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kanban View */}
      {tab === 'applications' && view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map(status => {
            const colItems = items.filter((a: any) => a.status === status.value)
            return (
              <div key={status.value} className="flex-shrink-0 w-60">
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', status.color)}>{status.label}</span>
                  <span className="text-xs text-gray-400 font-medium">{colItems.length}</span>
                </div>
                <div className="space-y-2">
                  {colItems.map((app: any) => (
                    <div key={app.id} onClick={() => setSelected(app)}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-pointer hover:shadow-md hover:border-blue-100 transition-all">
                      <p className="text-sm font-semibold text-gray-900">{app.studentName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{app.fatherName}</p>
                      <p className="text-xs text-gray-400">{app.contactPhone}</p>
                      <p className="text-[10px] text-gray-300 mt-1 font-mono">{app.applicationNumber}</p>
                    </div>
                  ))}
                  {colItems.length === 0 && (
                    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">Empty</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {tab === 'applications' && view === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50/70 border-b border-gray-100">
                <tr>
                  {['App No', 'Student', 'Father', 'Phone', 'Status', 'Applied On', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((app: any) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{app.applicationNumber}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{app.studentName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{app.fatherName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{app.contactPhone}</td>
                    <td className="px-4 py-3">
                      <select value={app.status}
                        onChange={e => statusMutation.mutate({ id: app.id, status: e.target.value })}
                        className={cn('text-xs px-2.5 py-1 rounded-full border font-semibold cursor-pointer outline-none',
                          STATUSES.find(s => s.value === app.status)?.color)}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(app)} className="text-xs text-blue-600 hover:underline font-medium">View</button>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No applications found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Application Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSelected(null)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-gray-900">Application Detail</h3>
              <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-y-2.5 gap-x-3 text-sm">
                <span className="text-gray-500 text-xs">App Number</span><span className="font-mono text-xs font-medium">{selected.applicationNumber}</span>
                <span className="text-gray-500 text-xs">Student</span><span className="font-semibold text-gray-900">{selected.studentName}</span>
                <span className="text-gray-500 text-xs">Father</span><span>{selected.fatherName}</span>
                <span className="text-gray-500 text-xs">Contact</span><span>{selected.contactPhone ?? '—'}</span>
                <span className="text-gray-500 text-xs">Applied</span><span>{new Date(selected.createdAt).toLocaleDateString()}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Update Status</label>
                <select value={selected.status}
                  onChange={e => { statusMutation.mutate({ id: selected.id, status: e.target.value }); setSelected({ ...selected, status: e.target.value }) }}
                  className={cn('text-sm px-3 py-2 rounded-xl border font-medium w-full outline-none focus:ring-2 focus:ring-blue-500/30',
                    STATUSES.find(s => s.value === selected.status)?.color)}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button className="flex-1 py-2.5 border border-blue-300 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors">
                  Schedule Test
                </button>
                <button
                  onClick={() => convertMutation.mutate(selected.id)}
                  disabled={convertMutation.isPending}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                >
                  {convertMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Convert to Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Application Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">New Application</h3>
              <button onClick={() => { setShowAdd(false); setForm({ ...emptyApp }) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Student Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                  <input value={form.studentFirstName} onChange={e => setForm(f => ({ ...f, studentFirstName: e.target.value }))}
                    placeholder="First name" className={inputCls} autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <input value={form.studentLastName} onChange={e => setForm(f => ({ ...f, studentLastName: e.target.value }))}
                    placeholder="Last name" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className={inputCls}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Parent / Guardian</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Father Name <span className="text-red-500">*</span></label>
                  <input value={form.fatherName} onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))}
                    placeholder="Father's full name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mother Name</label>
                  <input value={form.motherName} onChange={e => setForm(f => ({ ...f, motherName: e.target.value }))}
                    placeholder="Mother's full name" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
                  <input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                    placeholder="+91 98765 43210" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                    placeholder="email@example.com" className={inputCls} />
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Class Preference</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
                  <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} className={inputCls}>
                    <option value="">Select class</option>
                    {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Academic Year</label>
                  <select value={form.academicYearId} onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))} className={inputCls}>
                    <option value="">Select year</option>
                    {academicYears?.map((y: any) => <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (Current)' : ''}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Previous School</label>
                <input value={form.previousSchool} onChange={e => setForm(f => ({ ...f, previousSchool: e.target.value }))}
                  placeholder="Previous school name (optional)" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => { setShowAdd(false); setForm({ ...emptyApp }) }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
