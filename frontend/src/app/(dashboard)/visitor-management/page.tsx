'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { visitorApi, api as httpClient } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, Search, LogIn, LogOut, X, User } from 'lucide-react'

const PURPOSES = ['meeting', 'parent_visit', 'delivery', 'maintenance', 'official', 'interview', 'other']

export default function VisitorManagementPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'current' | 'history' | 'gate-passes'>('current')
  const [search, setSearch] = useState('')
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showGatePass, setShowGatePass] = useState(false)

  const { data: visitors } = useQuery({
    queryKey: ['visitors', tab, search],
    queryFn: () => visitorApi.getVisitors({ status: tab === 'current' ? 'checked_in' : undefined, search: search || undefined }).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: gatePasses } = useQuery({
    queryKey: ['gate-passes'],
    queryFn: () => visitorApi.getGatePasses({ status: 'pending' }).then(r => r.data),
    enabled: tab === 'gate-passes',
  })

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => visitorApi.checkOut(id),
    onSuccess: () => { toast.success('Visitor checked out'); qc.invalidateQueries({ queryKey: ['visitors'] }) },
    onError: () => toast.error('Failed to check out'),
  })

  const gatePassActionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      action === 'approve'
        ? visitorApi.approveGatePass(id)
        : httpClient.post(`/visitor/gate-passes/${id}/${action}`),
    onSuccess: () => { toast.success('Gate pass updated'); qc.invalidateQueries({ queryKey: ['gate-passes'] }) },
    onError: () => toast.error('Action failed'),
  })

  const todayVisitors = visitors?.items ?? []
  const currentlyInside = visitors?.currentlyInside ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitor Management</h1>
          <p className="text-gray-500 text-sm">Track visitors and issue gate passes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGatePass(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <Plus className="w-4 h-4" /> Gate Pass
          </button>
          <button onClick={() => setShowCheckIn(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <LogIn className="w-4 h-4" /> Check In Visitor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Currently Inside', value: currentlyInside, color: 'bg-blue-50 text-blue-700' },
          { label: "Today's Visitors", value: visitors?.total ?? 0, color: 'bg-green-50 text-green-700' },
          { label: 'Checked Out', value: (visitors?.total ?? 0) - currentlyInside, color: 'bg-gray-50 text-gray-700' },
          { label: 'Gate Passes', value: gatePasses?.total ?? 0, color: 'bg-orange-50 text-orange-700' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4 text-center', s.color)}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-medium uppercase mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1">
          {[
            { key: 'current', label: 'Inside Now' },
            { key: 'history', label: 'History' },
            { key: 'gate-passes', label: 'Gate Passes' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium',
                tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search visitors..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Visitor Table */}
      {(tab === 'current' || tab === 'history') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Visitor', 'Purpose', 'Host', 'Check In', 'Check Out', 'Duration', 'Badge', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {todayVisitors.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium flex-shrink-0">
                        {v.visitorName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{v.visitorName}</p>
                        <p className="text-xs text-gray-400">{v.phone} {v.company && `• ${v.company}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-gray-600">{v.purpose?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {v.hostName}
                    {v.hostDepartment && <span className="block text-xs text-gray-400">{v.hostDepartment}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">{new Date(v.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3 text-sm">{v.checkOut ? new Date(v.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-3 text-sm">{v.durationMinutes ? `${v.durationMinutes} min` : '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{v.badgeNumber}</td>
                  <td className="px-4 py-3">
                    {v.status === 'checked_in' && (
                      <button
                        onClick={() => checkOutMutation.mutate(v.id)}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                        <LogOut className="w-3 h-3" /> Check Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {todayVisitors.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">No visitors found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Gate Passes */}
      {tab === 'gate-passes' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Pass No', 'Student', 'Reason', 'Authorized Person', 'Expected Return', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(gatePasses?.items ?? []).map((gp: any) => (
                <tr key={gp.id}>
                  <td className="px-4 py-3 text-xs font-mono">{gp.passNumber}</td>
                  <td className="px-4 py-3 text-sm font-medium">{gp.studentName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{gp.reason}</td>
                  <td className="px-4 py-3 text-sm">{gp.authorizedPerson || '—'}</td>
                  <td className="px-4 py-3 text-sm">{gp.expectedReturn ? new Date(gp.expectedReturn).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                      gp.status === 'approved' ? 'bg-green-100 text-green-700' :
                      gp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      gp.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700')}>
                      {gp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {gp.status === 'pending' && (
                      <>
                        <button onClick={() => gatePassActionMutation.mutate({ id: gp.id, action: 'approve' })}
                          className="text-xs text-green-600 hover:underline font-medium">Approve</button>
                        <button onClick={() => gatePassActionMutation.mutate({ id: gp.id, action: 'reject' })}
                          className="text-xs text-red-600 hover:underline font-medium">Reject</button>
                      </>
                    )}
                    {gp.status === 'approved' && (
                      <button onClick={() => gatePassActionMutation.mutate({ id: gp.id, action: 'out' })}
                        className="text-xs text-blue-600 hover:underline font-medium">Mark Out</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    onSuccess: onSaved,
  })

  const upd = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }))

  const inp = (f: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input type={type} value={form[f] as string} onChange={e => upd(f, e.target.value)}
        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2"><LogIn className="w-5 h-5 text-blue-600" /> Visitor Check In</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inp('visitorName', 'Visitor Name *')}
          {inp('phone', 'Phone *', 'tel')}
          {inp('email', 'Email', 'email')}
          {inp('company', 'Company / Organization')}
          <div>
            <label className="text-sm font-medium text-gray-700">ID Type</label>
            <select value={form.idType} onChange={e => upd('idType', e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
              {['Aadhaar', 'PAN', 'Passport', 'Driving License', 'Voter ID'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {inp('idNumber', 'ID Number')}
          <div>
            <label className="text-sm font-medium text-gray-700">Purpose *</label>
            <select value={form.purpose} onChange={e => upd('purpose', e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
              {PURPOSES.map(p => <option key={p} value={p} className="capitalize">{p.replace('_', ' ')}</option>)}
            </select>
          </div>
          {inp('purposeDetails', 'Purpose Details')}
          {inp('hostName', 'Host Name')}
          {inp('hostDepartment', 'Department / Class')}
          <div>
            <label className="text-sm font-medium text-gray-700">No. of Persons</label>
            <input type="number" min={1} value={form.noOfPersons} onChange={e => upd('noOfPersons', +e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          {inp('vehicleNumber', 'Vehicle Number')}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={2}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!form.visitorName || !form.phone || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            <LogIn className="w-4 h-4" /> {mutation.isPending ? 'Checking In...' : 'Check In'}
          </button>
        </div>

        {mutation.data && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            Visitor checked in. Badge: <strong>{(mutation.data as any)?.data?.badgeNumber}</strong>
          </div>
        )}
      </div>
    </div>
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
  })

  const upd = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Issue Gate Pass</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Student ID</label>
            <input value={form.studentId} onChange={e => upd('studentId', e.target.value)} placeholder="Enter student UUID"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Reason *</label>
            <textarea value={form.reason} onChange={e => upd('reason', e.target.value)} rows={2}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Parent Phone</label>
            <input value={form.parentPhone} onChange={e => upd('parentPhone', e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Authorized Person</label>
            <input value={form.authorizedPerson} onChange={e => upd('authorizedPerson', e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Expected Return</label>
            <input type="datetime-local" value={form.expectedReturn} onChange={e => upd('expectedReturn', e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!form.studentId || !form.reason || mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {mutation.isPending ? 'Issuing...' : 'Issue Pass'}
          </button>
        </div>
      </div>
    </div>
  )
}
