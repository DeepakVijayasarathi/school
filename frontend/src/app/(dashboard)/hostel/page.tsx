'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hostelApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Home, Users, Bell, AlertCircle, Plus, UserCheck, LogOut, Loader2, BedDouble } from 'lucide-react'

const inputCls = 'input-base focus-ring'

type Tab = 'rooms' | 'allocations' | 'visitors' | 'complaints'

export default function HostelPage() {
  const [tab, setTab] = useState<Tab>('rooms')
  const [selectedHostel, setSelectedHostel] = useState('')
  const [showAddHostel, setShowAddHostel] = useState(false)
  const [hostelForm, setHostelForm] = useState({ name: '', type: 'boys', warden: '', wardenPhone: '', totalRooms: 20 })
  const [showCheckin, setShowCheckin] = useState(false)
  const [checkinForm, setCheckinForm] = useState({ studentId: '', visitorName: '', visitorPhone: '', relation: '', purpose: '', idProofType: 'Aadhaar', idProofNumber: '' })
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['hostel-stats'],
    queryFn: () => hostelApi.getStats().then(r => r.data),
  })

  const { data: hostels, isLoading: hostelsLoading } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => hostelApi.getHostels().then(r => r.data),
  })

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['hostel-rooms', selectedHostel],
    queryFn: () => hostelApi.getRooms(selectedHostel).then(r => r.data),
    enabled: !!selectedHostel && tab === 'rooms',
  })

  const { data: allocations, isLoading: allocLoading } = useQuery({
    queryKey: ['allocations'],
    queryFn: () => hostelApi.getAllocations({ status: 'active' }).then(r => r.data),
    enabled: tab === 'allocations',
  })

  const { data: visitors, isLoading: visitorsLoading } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => hostelApi.getVisitors({ inside: true }).then(r => r.data),
    enabled: tab === 'visitors',
  })

  const { data: complaints, isLoading: complaintsLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => hostelApi.getComplaints({}).then(r => r.data),
    enabled: tab === 'complaints',
  })

  const addHostelMutation = useMutation({
    mutationFn: () => hostelApi.createHostel(hostelForm),
    onSuccess: () => {
      toast.success('Hostel created')
      setShowAddHostel(false)
      setHostelForm({ name: '', type: 'boys', warden: '', wardenPhone: '', totalRooms: 20 })
      qc.invalidateQueries({ queryKey: ['hostels'] })
    },
    onError: () => toast.error('Failed to create hostel'),
  })

  const checkinMutation = useMutation({
    mutationFn: () => hostelApi.checkInVisitor(checkinForm),
    onSuccess: () => {
      toast.success('Visitor checked in')
      setShowCheckin(false)
      setCheckinForm({ studentId: '', visitorName: '', visitorPhone: '', relation: '', purpose: '', idProofType: 'Aadhaar', idProofNumber: '' })
      qc.invalidateQueries({ queryKey: ['visitors'] })
      qc.invalidateQueries({ queryKey: ['hostel-stats'] })
    },
    onError: () => toast.error('Failed to check in visitor'),
  })

  const checkoutMutation = useMutation({
    mutationFn: (id: string) => hostelApi.checkOutVisitor(id),
    onSuccess: () => { toast.success('Visitor checked out'); qc.invalidateQueries({ queryKey: ['visitors'] }); qc.invalidateQueries({ queryKey: ['hostel-stats'] }) },
    onError: () => toast.error('Failed to check out visitor'),
  })

  const vacateMutation = useMutation({
    mutationFn: (id: string) => hostelApi.vacateRoom(id),
    onSuccess: () => { toast.success('Room vacated'); qc.invalidateQueries({ queryKey: ['allocations'] }); qc.invalidateQueries({ queryKey: ['hostel-stats'] }) },
    onError: () => toast.error('Failed to vacate room'),
  })

  const resolveComplaintMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      hostelApi.updateComplaint(id, { status: 'resolved', resolution }),
    onSuccess: () => { toast.success('Complaint resolved'); qc.invalidateQueries({ queryKey: ['complaints'] }) },
    onError: () => toast.error('Failed to resolve complaint'),
  })

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'rooms', label: 'Rooms', icon: BedDouble },
    { id: 'allocations', label: 'Allocations', icon: Users },
    { id: 'visitors', label: 'Visitors', icon: UserCheck },
    { id: 'complaints', label: 'Complaints', icon: AlertCircle },
  ]

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Hostel</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Room management, allocations &amp; visitors</p>
        </div>
        <div className="flex gap-2">
          {tab === 'visitors' && (
            <button onClick={() => setShowCheckin(true)} className="btn btn-primary">
              <UserCheck className="w-4 h-4" /> Check In Visitor
            </button>
          )}
          <button onClick={() => setShowAddHostel(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add Hostel
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Rooms', value: stats.totalRooms, sub: `${stats.totalBeds} beds`, bgVar: 'var(--brand-bg)', colorVar: 'var(--brand)' },
            { label: 'Occupied', value: stats.occupiedBeds, sub: `${stats.occupancyRate}% occupancy`, bgVar: 'var(--warning-bg)', colorVar: 'var(--warning)' },
            { label: 'Available', value: stats.availableBeds, sub: 'beds free', bgVar: 'var(--success-bg)', colorVar: 'var(--success)' },
            { label: 'Visitors Inside', value: stats.visitorsInside, sub: `${stats.openComplaints} open complaints`, bgVar: 'var(--surface-2)', colorVar: 'var(--text-2)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: s.bgVar, color: s.colorVar }}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm font-medium mt-0.5">{s.label}</p>
              <p className="text-xs opacity-70 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Hostel selector */}
      <div className="flex gap-2 flex-wrap">
        {hostelsLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-4)' }} />
        ) : hostels?.map((h: any) => (
          <button key={h.id} onClick={() => setSelectedHostel(h.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition"
            style={selectedHostel === h.id
              ? { background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }
              : { background: 'var(--surface)', color: 'var(--text-2)', borderColor: 'var(--border)' }}>
            <Home className="w-4 h-4" />
            {h.name}
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={selectedHostel === h.id
                ? { background: 'rgba(255,255,255,0.2)' }
                : { background: 'var(--surface-2)' }}>
              {h.type}
            </span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-2)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition"
            style={tab === t.id
              ? { background: 'var(--surface)', color: 'var(--text-1)', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
              : { color: 'var(--text-3)' }}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ROOMS ───────────────────────────────────────────────────────────── */}
      {tab === 'rooms' && (
        !selectedHostel ? (
          <div className="card p-12 text-center" style={{ color: 'var(--text-4)' }}>
            <Home className="w-12 h-12 mx-auto mb-3 opacity-20" />
            Select a hostel above to view rooms
          </div>
        ) : roomsLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {rooms?.map((room: any) => (
              <div key={room.id} className="rounded-xl border p-4 shadow-sm hover:shadow-md transition cursor-pointer"
                style={{
                  background: room.availableBeds === 0 ? 'var(--danger-bg)' : 'var(--surface)',
                  borderColor: room.availableBeds === 0 ? 'var(--danger)' : 'var(--border)',
                }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>{room.roomNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                    style={room.roomType === 'ac'
                      ? { background: 'var(--brand-bg)', color: 'var(--brand)' }
                      : room.roomType === 'deluxe'
                      ? { background: 'var(--surface-2)', color: 'var(--text-2)' }
                      : { background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                    {room.roomType}
                  </span>
                </div>
                {room.floor && <p className="text-xs mb-2" style={{ color: 'var(--text-4)' }}>Floor {room.floor}</p>}
                {/* Bed occupancy bar */}
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: room.capacity }).map((_, i) => (
                    <div key={i} className="flex-1 h-2 rounded-full"
                      style={{ background: i < room.occupiedBeds ? 'var(--brand)' : 'var(--surface-2)' }} />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-3)' }}>{room.occupiedBeds}/{room.capacity} beds</span>
                  <span className="font-medium"
                    style={{ color: room.availableBeds === 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {room.availableBeds === 0 ? 'Full' : `${room.availableBeds} free`}
                  </span>
                </div>
                {room.feeMonthly > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--brand)' }}>₹{room.feeMonthly}/month</p>
                )}
              </div>
            ))}
            {!rooms?.length && (
              <div className="col-span-5 py-10 text-center" style={{ color: 'var(--text-4)' }}>No rooms added to this hostel</div>
            )}
          </div>
        )
      )}

      {/* ── ALLOCATIONS ─────────────────────────────────────────────────────── */}
      {tab === 'allocations' && (
        <div className="card overflow-hidden p-0">
          {allocLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    {['Student ID', 'Hostel', 'Room', 'Bed', 'Allocated On', 'Fee/Month', 'Action'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allocations?.map((a: any) => (
                    <tr key={a.id} className="table-row-hover">
                      <td className="table-cell font-mono" style={{ color: 'var(--text-2)' }}>{a.studentId.slice(0, 8)}...</td>
                      <td className="table-cell" style={{ color: 'var(--text-1)' }}>{a.hostelName}</td>
                      <td className="table-cell font-medium" style={{ color: 'var(--text-1)' }}>{a.roomNumber}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{a.bedNumber ?? '-'}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{formatDate(a.allocatedOn)}</td>
                      <td className="table-cell" style={{ color: 'var(--brand)' }}>₹{a.feeMonthly}</td>
                      <td className="table-cell">
                        <button onClick={() => vacateMutation.mutate(a.id)}
                          disabled={vacateMutation.isPending}
                          className="btn btn-danger text-xs px-2.5 py-1.5">
                          <LogOut className="w-3.5 h-3.5" /> Vacate
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!allocations?.length && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-4)' }}>No active allocations</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── VISITORS ────────────────────────────────────────────────────────── */}
      {tab === 'visitors' && (
        <div className="card overflow-hidden p-0">
          {visitorsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    {['Visitor', 'Phone', 'Relation', 'Purpose', 'Check In', 'ID Proof', 'Action'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visitors?.items?.map((v: any) => (
                    <tr key={v.id} className="table-row-hover">
                      <td className="table-cell font-medium" style={{ color: 'var(--text-1)' }}>{v.visitorName}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{v.visitorPhone ?? '-'}</td>
                      <td className="table-cell capitalize" style={{ color: 'var(--text-2)' }}>{v.relation ?? '-'}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{v.purpose ?? '-'}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{formatDate(v.checkIn)}</td>
                      <td className="table-cell text-xs" style={{ color: 'var(--text-3)' }}>{v.idProofType}: {v.idProofNumber ?? '-'}</td>
                      <td className="table-cell">
                        {!v.checkOut && (
                          <button onClick={() => checkoutMutation.mutate(v.id)}
                            className="btn btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1"
                            style={{ color: 'var(--success)' }}>
                            <LogOut className="w-3.5 h-3.5" /> Check Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!visitors?.items?.length && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-4)' }}>No visitors inside</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── COMPLAINTS ──────────────────────────────────────────────────────── */}
      {tab === 'complaints' && (
        <div className="space-y-3">
          {complaintsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} /></div>
          ) : complaints?.map((c: any) => (
            <div key={c.id} className="rounded-xl border shadow-sm p-4"
              style={{
                background: 'var(--surface)',
                borderColor: c.status === 'open' ? 'var(--danger)' :
                  c.status === 'in-progress' ? 'var(--warning)' : 'var(--success)',
              }}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg flex-shrink-0"
                  style={{
                    background: c.status === 'open' ? 'var(--danger-bg)' :
                      c.status === 'in-progress' ? 'var(--warning-bg)' : 'var(--success-bg)',
                  }}>
                  <AlertCircle className="w-4 h-4"
                    style={{
                      color: c.status === 'open' ? 'var(--danger)' :
                        c.status === 'in-progress' ? 'var(--warning)' : 'var(--success)',
                    }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium capitalize" style={{ color: 'var(--text-3)' }}>{c.category}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize',
                      c.status === 'open' ? 'badge-draft' :
                      c.status === 'in-progress' ? 'badge-pending' : 'badge-active')}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-1)' }}>{c.description}</p>
                  {c.resolution && <p className="text-xs italic mt-1" style={{ color: 'var(--success)' }}>Resolution: {c.resolution}</p>}
                  <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>{formatDate(c.createdAt)}</p>
                </div>
                {c.status !== 'resolved' && (
                  <button
                    onClick={() => resolveComplaintMutation.mutate({ id: c.id, resolution: 'Issue addressed and resolved.' })}
                    className="btn btn-primary flex-shrink-0 text-xs px-3 py-1.5">
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
          {!complaints?.length && !complaintsLoading && (
            <div className="card p-12 text-center" style={{ color: 'var(--text-4)' }}>No complaints</div>
          )}
        </div>
      )}

      {/* Add Hostel Modal */}
      {showAddHostel && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Add Hostel</h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              {[
                { label: 'Name', key: 'name', placeholder: 'e.g. Boys Hostel Block A' },
                { label: 'Warden Name', key: 'warden', placeholder: 'Full name' },
                { label: 'Warden Phone', key: 'wardenPhone', placeholder: '9876543210' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{f.label}</label>
                  <input value={(hostelForm as any)[f.key]}
                    onChange={e => setHostelForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={`mt-1 ${inputCls}`} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Type</label>
                  <select value={hostelForm.type} onChange={e => setHostelForm(p => ({ ...p, type: e.target.value }))}
                    className={`mt-1 ${inputCls}`}>
                    {['boys', 'girls', 'mixed'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Total Rooms</label>
                  <input type="number" value={hostelForm.totalRooms}
                    onChange={e => setHostelForm(p => ({ ...p, totalRooms: Number(e.target.value) }))}
                    className={`mt-1 ${inputCls}`} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowAddHostel(false); setHostelForm({ name: '', type: 'boys', warden: '', wardenPhone: '', totalRooms: 20 }) }}
                className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => addHostelMutation.mutate()}
                disabled={addHostelMutation.isPending || !hostelForm.name}
                className="btn btn-primary flex-1">
                {addHostelMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Check In Visitor Modal */}
      {showCheckin && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Check In Visitor</h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              {[
                { label: 'Student ID (UUID)', key: 'studentId', placeholder: 'Student ID' },
                { label: 'Visitor Name', key: 'visitorName', placeholder: 'Full name' },
                { label: 'Visitor Phone', key: 'visitorPhone', placeholder: '9876543210' },
                { label: 'Relation', key: 'relation', placeholder: 'e.g. Parent, Sibling' },
                { label: 'Purpose', key: 'purpose', placeholder: 'Reason for visit' },
                { label: 'ID Proof Number', key: 'idProofNumber', placeholder: 'Aadhaar / PAN number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{f.label}</label>
                  <input value={(checkinForm as any)[f.key]}
                    onChange={e => setCheckinForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={`mt-1 ${inputCls}`} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowCheckin(false); setCheckinForm({ studentId: '', visitorName: '', visitorPhone: '', relation: '', purpose: '', idProofType: 'Aadhaar', idProofNumber: '' }) }}
                className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => checkinMutation.mutate()}
                disabled={checkinMutation.isPending || !checkinForm.visitorName}
                className="btn btn-primary flex-1">
                {checkinMutation.isPending ? 'Checking in...' : 'Check In'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
