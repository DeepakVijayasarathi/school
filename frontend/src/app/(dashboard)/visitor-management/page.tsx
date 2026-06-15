'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { visitorApi, api as httpClient } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, Search, LogIn, LogOut, X, User, Loader2 } from 'lucide-react'

const PURPOSES = ['meeting', 'parent_visit', 'delivery', 'maintenance', 'official', 'interview', 'other']

export default function VisitorManagementPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'current' | 'history' | 'gate-passes'>('current')
  const [search, setSearch] = useState('')
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showGatePass, setShowGatePass] = useState(false)

  const { data: visitors, isLoading: visitorsLoading } = useQuery({
    queryKey: ['visitors', tab, search],
    queryFn: () => visitorApi.getVisitors({ status: tab === 'current' ? 'checked_in' : undefined, search: search || undefined }).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: gatePasses } = useQuery({
    queryKey: ['gate-passes'],
    queryFn: () => visitorApi.getGatePasses({ status: 'pending' }).then(r => r.data),
  })

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => visitorApi.checkOut(id),
    onSuccess: () => { toast.success('Visitor checked out'); qc.invalidateQueries({ queryKey: ['visitors'] }) },
    onError: () => toast.error('Failed to check out'),
  })

  const gatePassActionMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: string; reason?: string }) =>
      visitorApi.gatePassAction(id, action, reason),
    onSuccess: () => { toast.success('Gate pass updated'); qc.invalidateQueries({ queryKey: ['gate-passes'] }) },
    onError: () => toast.error('Action failed'),
  })

  const todayVisitors = visitors?.items ?? []
  const currentlyInside = visitors?.currentlyInside ?? 0

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Visitor Management</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Track visitors and issue gate passes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGatePass(true)}
            className="btn btn-ghost flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Gate Pass
          </button>
          <button onClick={() => setShowCheckIn(true)}
            className="btn btn-primary flex items-center gap-2 text-sm">
            <LogIn className="w-4 h-4" /> Check In Visitor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Currently Inside', value: currentlyInside, bg: 'var(--brand-bg)', color: 'var(--brand)' },
          { label: "Today's Visitors", value: visitors?.total ?? 0, bg: 'var(--success-bg)', color: 'var(--success)' },
          { label: 'Checked Out', value: (visitors?.total ?? 0) - currentlyInside, bg: 'var(--surface-2)', color: 'var(--text-2)' },
          { label: 'Gate Passes', value: gatePasses?.total ?? 0, bg: 'var(--warning-bg)', color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center"
            style={{ background: s.bg, color: s.color }}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-medium uppercase mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="card flex gap-1 p-1" style={{ borderRadius: '0.75rem' }}>
          {[
            { key: 'current', label: 'Inside Now' },
            { key: 'history', label: 'History' },
            { key: 'gate-passes', label: 'Gate Passes' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === t.key
                  ? 'text-white'
                  : 'hover:bg-[var(--surface-2)]')}
              style={tab === t.key
                ? { background: 'var(--brand)' }
                : { color: 'var(--text-2)' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search visitors..."
            className="input-base focus-ring w-full pl-9 pr-3 py-2 text-sm" />
        </div>
      </div>

      {/* Visitor Table */}
      {(tab === 'current' || tab === 'history') && (
        <div className="card overflow-hidden">
          {visitorsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} />
            </div>
          ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                {['Visitor', 'Purpose', 'Host', 'Check In', 'Check Out', 'Duration', 'Badge', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todayVisitors.map((v: any) => (
                <tr key={v.id} className="table-row-hover">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                        style={{ background: 'var(--brand-bg)', color: 'var(--brand)' }}>
                        {v.visitorName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{v.visitorName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>{v.phone} {v.company && `• ${v.company}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-sm capitalize" style={{ color: 'var(--text-2)' }}>{v.purpose?.replace(/_/g, ' ')}</td>
                  <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>
                    {v.hostName}
                    {v.hostDepartment && <span className="block text-xs" style={{ color: 'var(--text-4)' }}>{v.hostDepartment}</span>}
                  </td>
                  <td className="table-cell text-sm" style={{ color: 'var(--text-1)' }}>{new Date(v.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="table-cell text-sm" style={{ color: 'var(--text-1)' }}>{v.checkOut ? new Date(v.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="table-cell text-sm" style={{ color: 'var(--text-1)' }}>{v.durationMinutes ? `${v.durationMinutes} min` : '—'}</td>
                  <td className="table-cell text-xs font-mono" style={{ color: 'var(--text-3)' }}>{v.badgeNumber}</td>
                  <td className="table-cell">
                    {v.status === 'checked_in' && (
                      <button
                        onClick={() => checkOutMutation.mutate(v.id)}
                        className="flex items-center gap-1 text-xs font-medium"
                        style={{ color: 'var(--danger)' }}>
                        <LogOut className="w-3 h-3" /> Check Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {todayVisitors.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-sm" style={{ color: 'var(--text-4)' }}>No visitors found.</td></tr>
              )}
            </tbody>
          </table>
          </div>
          )}
        </div>
      )}

      {/* Gate Passes */}
      {tab === 'gate-passes' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[650px]">
            <thead>
              <tr>
                {['Pass No', 'Student', 'Reason', 'Authorized Person', 'Expected Return', 'Status', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(gatePasses?.items ?? []).map((gp: any) => (
                <tr key={gp.id} className="table-row-hover">
                  <td className="table-cell text-xs font-mono" style={{ color: 'var(--text-1)' }}>{gp.passNumber}</td>
                  <td className="table-cell text-sm font-medium" style={{ color: 'var(--text-1)' }}>{gp.studentName}</td>
                  <td className="table-cell text-sm max-w-xs truncate" style={{ color: 'var(--text-2)' }}>{gp.reason}</td>
                  <td className="table-cell text-sm" style={{ color: 'var(--text-1)' }}>{gp.authorizedPerson || '—'}</td>
                  <td className="table-cell text-sm" style={{ color: 'var(--text-1)' }}>{gp.expectedReturn ? new Date(gp.expectedReturn).toLocaleString() : '—'}</td>
                  <td className="table-cell">
                    <span className={cn(
                      gp.status === 'approved' ? 'badge-active' :
                      gp.status === 'rejected' ? 'badge-inactive' :
                      gp.status === 'pending' ? 'badge-pending' : 'badge-draft',
                      'capitalize'
                    )}>
                      {gp.status}
                    </span>
                  </td>
                  <td className="table-cell flex gap-2">
                    {gp.status === 'pending' && (
                      <>
                        <button onClick={() => gatePassActionMutation.mutate({ id: gp.id, action: 'approve' })}
                          className="text-xs font-medium hover:underline" style={{ color: 'var(--success)' }}>Approve</button>
                        <button onClick={() => gatePassActionMutation.mutate({ id: gp.id, action: 'reject' })}
                          className="text-xs font-medium hover:underline" style={{ color: 'var(--danger)' }}>Reject</button>
                      </>
                    )}
                    {gp.status === 'approved' && (
                      <button onClick={() => gatePassActionMutation.mutate({ id: gp.id, action: 'out' })}
                        className="text-xs font-medium hover:underline" style={{ color: 'var(--brand)' }}>Mark Out</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Check In Modal */}
      {showCheckIn && (
        <CheckInModal onClose={() => setShowCheckIn(false)} onSaved={() => {
          setShowCheckIn(false)
          qc.invalidateQueries({ queryKey: ['visitors'] })
        }} />
      )}

      {/* Gate Pass Modal */}
      {showGatePass && (
        <GatePassModal onClose={() => setShowGatePass(false)} onSaved={() => {
          setShowGatePass(false)
          qc.invalidateQueries({ queryKey: ['gate-passes'] })
        }} />
      )}
    </div>
  )
}

function CheckInModal({ onClose, onSaved }: any) {
  const [form, setForm] = useState({
    visitorName: '', phone: '', email: '', company: '', idType: 'Aadhaar', idNumber: '',
    purpose: 'meeting', purposeDetails: '', hostName: '', hostDepartment: '',
    noOfPersons: 1, vehicleNumber: '', notes: ''
  })

  const mutation = useMutation({
    mutationFn: (data: any) => visitorApi.checkIn(data),
    onSuccess: (res) => {
      const badge = (res as any)?.data?.badgeNumber
      toast.success(badge ? `Checked in! Badge: ${badge}` : 'Visitor checked in')
      onSaved()
    },
    onError: () => toast.error('Check-in failed'),
  })

  const upd = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }))

  const inp = (f: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{label}</label>
      <input type={type} value={form[f] as string} onChange={e => upd(f, e.target.value)}
        className="input-base focus-ring w-full mt-1 text-sm" />
    </div>
  )

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4 rounded-2xl shadow-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <LogIn className="w-5 h-5" style={{ color: 'var(--brand)' }} /> Visitor Check In
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-3)' }}><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inp('visitorName', 'Visitor Name *')}
          {inp('phone', 'Phone *', 'tel')}
          {inp('email', 'Email', 'email')}
          {inp('company', 'Company / Organization')}
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>ID Type</label>
            <select value={form.idType} onChange={e => upd('idType', e.target.value)}
              className="input-base focus-ring w-full mt-1 text-sm">
              {['Aadhaar', 'PAN', 'Passport', 'Driving License', 'Voter ID'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {inp('idNumber', 'ID Number')}
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Purpose *</label>
            <select value={form.purpose} onChange={e => upd('purpose', e.target.value)}
              className="input-base focus-ring w-full mt-1 text-sm">
              {PURPOSES.map(p => <option key={p} value={p} className="capitalize">{p.replace('_', ' ')}</option>)}
            </select>
          </div>
          {inp('purposeDetails', 'Purpose Details')}
          {inp('hostName', 'Host Name')}
          {inp('hostDepartment', 'Department / Class')}
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>No. of Persons</label>
            <input type="number" min={1} value={form.noOfPersons} onChange={e => upd('noOfPersons', +e.target.value)}
              className="input-base focus-ring w-full mt-1 text-sm" />
          </div>
          {inp('vehicleNumber', 'Vehicle Number')}
        </div>

        <div>
          <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Notes</label>
          <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={2}
            className="input-base focus-ring w-full mt-1 text-sm resize-none" />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!form.visitorName || !form.phone || mutation.isPending}
            className="btn btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
            <LogIn className="w-4 h-4" /> {mutation.isPending ? 'Checking In...' : 'Check In'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function GatePassModal({ onClose, onSaved }: any) {
  const [form, setForm] = useState({
    studentId: '', reason: '', parentPhone: '', authorizedPerson: '',
    authorizedPersonPhone: '', expectedReturn: ''
  })

  const mutation = useMutation({
    mutationFn: (data: any) => visitorApi.createGatePass(data),
    onSuccess: onSaved,
    onError: () => toast.error('Failed to issue gate pass'),
  })

  const upd = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }))

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md p-6 space-y-4 rounded-2xl shadow-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Issue Gate Pass</h3>
          <button onClick={onClose} style={{ color: 'var(--text-3)' }}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Student ID</label>
            <input value={form.studentId} onChange={e => upd('studentId', e.target.value)} placeholder="Enter student UUID"
              className="input-base focus-ring w-full mt-1 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Reason *</label>
            <textarea value={form.reason} onChange={e => upd('reason', e.target.value)} rows={2}
              className="input-base focus-ring w-full mt-1 text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Parent Phone</label>
            <input value={form.parentPhone} onChange={e => upd('parentPhone', e.target.value)}
              className="input-base focus-ring w-full mt-1 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Authorized Person</label>
            <input value={form.authorizedPerson} onChange={e => upd('authorizedPerson', e.target.value)}
              className="input-base focus-ring w-full mt-1 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Expected Return</label>
            <input type="datetime-local" value={form.expectedReturn} onChange={e => upd('expectedReturn', e.target.value)}
              className="input-base focus-ring w-full mt-1 text-sm" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!form.studentId || !form.reason || mutation.isPending}
            className="btn btn-primary text-sm disabled:opacity-60">
            {mutation.isPending ? 'Issuing...' : 'Issue Pass'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
