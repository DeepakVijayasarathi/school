'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { admissionApi, schoolApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Search, X, Loader2 } from 'lucide-react'

const STATUSES = [
  { value: 'inquiry',        label: 'Inquiry',        cls: 'badge-draft' },
  { value: 'applied',        label: 'Applied',        cls: 'badge-pending' },
  { value: 'shortlisted',    label: 'Shortlisted',    cls: 'badge-active' },
  { value: 'test_scheduled', label: 'Test Scheduled', cls: 'badge-pending' },
  { value: 'interview',      label: 'Interview',      cls: 'badge-partial' },
  { value: 'admitted',       label: 'Admitted',       cls: 'badge-paid' },
  { value: 'rejected',       label: 'Rejected',       cls: 'badge-inactive' },
]

const inputCls = 'input-base focus-ring w-full'

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
    onError: () => toast.error('Failed to update status'),
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
    <div className="space-y-5 anim-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Admissions</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Manage student admissions pipeline</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Application
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {STATUSES.slice(0, 6).map(s => (
          <div key={s.value} className="card p-3 text-center">
            <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{getCount(s.value)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {(['applications', 'inquiries'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
              style={tab === t
                ? { background: 'var(--brand)', color: '#fff' }
                : { color: 'var(--text-2)' }}>
              {t}
            </button>
          ))}
        </div>
        {tab === 'applications' && (
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {(['kanban', 'table'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
                style={view === v
                  ? { background: 'var(--surface-2)', color: 'var(--text-1)' }
                  : { color: 'var(--text-3)' }}>
                {v}
              </button>
            ))}
          </div>
        )}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone..."
            className="input-base focus-ring w-full pl-9" />
        </div>
      </div>

      {/* Inquiries Table */}
      {tab === 'inquiries' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  {['Student Name', 'Class Seeking', 'Parent Name', 'Phone', 'Source', 'Status', 'Date'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(inquiries?.items ?? []).map((i: any) => (
                  <tr key={i.id} className="table-row-hover">
                    <td className="table-cell text-sm font-medium" style={{ color: 'var(--text-1)' }}>{i.studentName}</td>
                    <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{i.classSeeking}</td>
                    <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{i.parentName}</td>
                    <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{i.parentPhone}</td>
                    <td className="table-cell text-xs capitalize" style={{ color: 'var(--text-3)' }}>{i.source?.replace('_', ' ')}</td>
                    <td className="table-cell">
                      <span className={cn(STATUSES.find(s => s.value === i.status)?.cls ?? 'badge-draft', 'capitalize')}>
                        {i.status}
                      </span>
                    </td>
                    <td className="table-cell text-xs" style={{ color: 'var(--text-4)' }}>{new Date(i.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!inquiries?.items?.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-4)' }}>No inquiries found</td></tr>
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
                  <span className={cn(status.cls, 'capitalize')}>{status.label}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>{colItems.length}</span>
                </div>
                <div className="space-y-2">
                  {colItems.map((app: any) => (
                    <div key={app.id} onClick={() => setSelected(app)}
                      className="card p-3 cursor-pointer transition-all hover:shadow-md">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{app.studentName}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{app.fatherName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-4)' }}>{app.contactPhone}</p>
                      <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-4)' }}>{app.applicationNumber}</p>
                    </div>
                  ))}
                  {colItems.length === 0 && (
                    <div className="rounded-xl border border-dashed p-4 text-center text-xs"
                      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-4)' }}>
                      Empty
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {tab === 'applications' && view === 'table' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  {['App No', 'Student', 'Father', 'Phone', 'Status', 'Applied On', 'Action'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((app: any) => (
                  <tr key={app.id} className="table-row-hover">
                    <td className="table-cell text-xs font-mono" style={{ color: 'var(--text-3)' }}>{app.applicationNumber}</td>
                    <td className="table-cell text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{app.studentName}</td>
                    <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{app.fatherName}</td>
                    <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{app.contactPhone}</td>
                    <td className="table-cell">
                      <select value={app.status}
                        onChange={e => statusMutation.mutate({ id: app.id, status: e.target.value })}
                        className={cn('text-xs px-2.5 py-1 rounded-full border font-semibold cursor-pointer outline-none',
                          STATUSES.find(s => s.value === app.status)?.cls)}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="table-cell text-xs" style={{ color: 'var(--text-4)' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <button onClick={() => setSelected(app)} className="btn btn-ghost text-xs">View</button>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-4)' }}>No applications found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Application Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto"
            style={{ background: 'var(--surface)', boxShadow: '-8px 0 40px rgba(0,0,0,.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Application Detail</h3>
              <button onClick={() => setSelected(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'var(--text-4)', border: '1px solid var(--border)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl p-4 grid grid-cols-2 gap-y-2.5 gap-x-3 text-sm"
                style={{ background: 'var(--surface-2)' }}>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>App Number</span>
                <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-1)' }}>{selected.applicationNumber}</span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Student</span>
                <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{selected.studentName}</span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Father</span>
                <span style={{ color: 'var(--text-2)' }}>{selected.fatherName}</span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Contact</span>
                <span style={{ color: 'var(--text-2)' }}>{selected.contactPhone ?? '—'}</span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Applied</span>
                <span style={{ color: 'var(--text-2)' }}>{new Date(selected.createdAt).toLocaleDateString()}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
                  Update Status
                </label>
                <select value={selected.status}
                  onChange={e => { statusMutation.mutate({ id: selected.id, status: e.target.value }); setSelected({ ...selected, status: e.target.value }) }}
                  className={cn('text-sm px-3 py-2 rounded-xl border font-medium w-full outline-none focus-ring',
                    STATUSES.find(s => s.value === selected.status)?.cls)}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button className="btn btn-ghost flex-1 py-2.5">
                  Schedule Test
                </button>
                <button
                  onClick={() => convertMutation.mutate(selected.id)}
                  disabled={convertMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  style={{ background: 'var(--success)', color: '#fff' }}
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
        <NewApplicationModal
          form={form}
          setForm={setForm}
          classes={classes}
          academicYears={academicYears}
          canSubmit={!!canSubmit}
          isPending={createMutation.isPending}
          onClose={() => { setShowAdd(false); setForm({ ...emptyApp }) }}
          onSubmit={() => createMutation.mutate()}
        />
      )}
    </div>
  )
}

function NewApplicationModal({ form, setForm, classes, academicYears, canSubmit, isPending, onClose, onSubmit }: any) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,.3)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>New Application</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{ color: 'var(--text-4)', border: '1px solid var(--border)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Student Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                First Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input value={form.studentFirstName} onChange={e => setForm((f: any) => ({ ...f, studentFirstName: e.target.value }))}
                placeholder="First name" className={inputCls} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Last Name</label>
              <input value={form.studentLastName} onChange={e => setForm((f: any) => ({ ...f, studentLastName: e.target.value }))}
                placeholder="Last name" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={e => setForm((f: any) => ({ ...f, dateOfBirth: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Gender</label>
              <select value={form.gender} onChange={e => setForm((f: any) => ({ ...f, gender: e.target.value }))} className={inputCls}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider pt-1" style={{ color: 'var(--text-4)' }}>Parent / Guardian</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Father Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input value={form.fatherName} onChange={e => setForm((f: any) => ({ ...f, fatherName: e.target.value }))}
                placeholder="Father's full name" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Mother Name</label>
              <input value={form.motherName} onChange={e => setForm((f: any) => ({ ...f, motherName: e.target.value }))}
                placeholder="Mother's full name" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Contact Phone</label>
              <input value={form.contactPhone} onChange={e => setForm((f: any) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="+91 98765 43210" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Email</label>
              <input type="email" value={form.contactEmail} onChange={e => setForm((f: any) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="email@example.com" className={inputCls} />
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider pt-1" style={{ color: 'var(--text-4)' }}>Class Preference</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Class</label>
              <select value={form.classId} onChange={e => setForm((f: any) => ({ ...f, classId: e.target.value }))} className={inputCls}>
                <option value="">Select class</option>
                {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Academic Year</label>
              <select value={form.academicYearId} onChange={e => setForm((f: any) => ({ ...f, academicYearId: e.target.value }))} className={inputCls}>
                <option value="">Select year</option>
                {academicYears?.map((y: any) => <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (Current)' : ''}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Previous School</label>
            <input value={form.previousSchool} onChange={e => setForm((f: any) => ({ ...f, previousSchool: e.target.value }))}
              placeholder="Previous school name (optional)" className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn btn-ghost flex-1 py-2.5">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit || isPending}
            className="btn btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Application
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
