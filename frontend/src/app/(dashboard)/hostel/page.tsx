'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hostelApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Home, Users, Bell, AlertCircle, Plus, UserCheck, LogOut, Loader2, BedDouble } from 'lucide-react'

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
  })

  const checkoutMutation = useMutation({
    mutationFn: (id: string) => hostelApi.checkOutVisitor(id),
    onSuccess: () => { toast.success('Visitor checked out'); qc.invalidateQueries({ queryKey: ['visitors'] }); qc.invalidateQueries({ queryKey: ['hostel-stats'] }) },
  })

  const vacateMutation = useMutation({
    mutationFn: (id: string) => hostelApi.vacateRoom(id),
    onSuccess: () => { toast.success('Room vacated'); qc.invalidateQueries({ queryKey: ['allocations'] }); qc.invalidateQueries({ queryKey: ['hostel-stats'] }) },
  })

  const resolveComplaintMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      hostelApi.updateComplaint(id, { status: 'resolved', resolution }),
    onSuccess: () => { toast.success('Complaint resolved'); qc.invalidateQueries({ queryKey: ['complaints'] }) },
  })

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'rooms', label: 'Rooms', icon: BedDouble },
    { id: 'allocations', label: 'Allocations', icon: Users },
    { id: 'visitors', label: 'Visitors', icon: UserCheck },
    { id: 'complaints', label: 'Complaints', icon: AlertCircle },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hostel</h1>
          <p className="text-gray-500 text-sm">Room management, allocations & visitors</p>
        </div>
        <div className="flex gap-2">
          {tab === 'visitors' && (
            <button onClick={() => setShowCheckin(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <UserCheck className="w-4 h-4" /> Check In Visitor
            </button>
          )}
          <button onClick={() => setShowAddHostel(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Hostel
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Rooms', value: stats.totalRooms, sub: `${stats.totalBeds} beds`, color: 'bg-blue-50 text-blue-700' },
            { label: 'Occupied', value: stats.occupiedBeds, sub: `${stats.occupancyRate}% occupancy`, color: 'bg-orange-50 text-orange-700' },
            { label: 'Available', value: stats.availableBeds, sub: 'beds free', color: 'bg-green-50 text-green-700' },
            { label: 'Visitors Inside', value: stats.visitorsInside, sub: `${stats.openComplaints} open complaints`, color: 'bg-purple-50 text-purple-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-4`}>
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
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        ) : hostels?.map((h: any) => (
          <button key={h.id} onClick={() => setSelectedHostel(h.id)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2',
              selectedHostel === h.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
            <Home className="w-4 h-4" />
            {h.name}
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full', selectedHostel === h.id ? 'bg-blue-500' : 'bg-gray-100')}>
              {h.type}
            </span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ROOMS ───────────────────────────────────────────────────────────── */}
      {tab === 'rooms' && (
        !selectedHostel ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
            <Home className="w-12 h-12 mx-auto mb-3 opacity-20" />
            Select a hostel above to view rooms
          </div>
        ) : roomsLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {rooms?.map((room: any) => (
              <div key={room.id} className={cn(
                'bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition cursor-pointer',
                room.availableBeds === 0 ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
              )}>
                <div className="flex items-start justify-between mb-2">
                  <span className="font-bold text-gray-900 text-lg">{room.roomNumber}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize',
                    room.roomType === 'ac' ? 'bg-blue-100 text-blue-700' :
                    room.roomType === 'deluxe' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-600')}>
                    {room.roomType}
                  </span>
                </div>
                {room.floor && <p className="text-xs text-gray-400 mb-2">Floor {room.floor}</p>}
                {/* Bed occupancy bar */}
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: room.capacity }).map((_, i) => (
                    <div key={i} className={cn('flex-1 h-2 rounded-full',
                      i < room.occupiedBeds ? 'bg-blue-500' : 'bg-gray-200')} />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{room.occupiedBeds}/{room.capacity} beds</span>
                  <span className={cn('font-medium', room.availableBeds === 0 ? 'text-red-500' : 'text-green-600')}>
                    {room.availableBeds === 0 ? 'Full' : `${room.availableBeds} free`}
                  </span>
                </div>
                {room.feeMonthly > 0 && (
                  <p className="text-xs text-blue-600 mt-1">₹{room.feeMonthly}/month</p>
                )}
              </div>
            ))}
            {!rooms?.length && (
              <div className="col-span-5 py-10 text-center text-gray-400">No rooms added to this hostel</div>
            )}
          </div>
        )
      )}

      {/* ── ALLOCATIONS ─────────────────────────────────────────────────────── */}
      {tab === 'allocations' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {allocLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  {['Student ID', 'Hostel', 'Room', 'Bed', 'Allocated On', 'Fee/Month', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allocations?.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{a.studentId.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{a.hostelName}</td>
                    <td className="px-4 py-3 text-sm font-medium">{a.roomNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.bedNumber ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(a.allocatedOn)}</td>
                    <td className="px-4 py-3 text-sm text-blue-600">₹{a.feeMonthly}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => vacateMutation.mutate(a.id)}
                        disabled={vacateMutation.isPending}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                        <LogOut className="w-3.5 h-3.5" /> Vacate
                      </button>
                    </td>
                  </tr>
                ))}
                {!allocations?.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No active allocations</td></tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {/* ── VISITORS ────────────────────────────────────────────────────────── */}
      {tab === 'visitors' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {visitorsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  {['Visitor', 'Phone', 'Relation', 'Purpose', 'Check In', 'ID Proof', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visitors?.items?.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.visitorName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.visitorPhone ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{v.relation ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.purpose ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(v.checkIn)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{v.idProofType}: {v.idProofNumber ?? '-'}</td>
                    <td className="px-4 py-3">
                      {!v.checkOut && (
                        <button onClick={() => checkoutMutation.mutate(v.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                          <LogOut className="w-3.5 h-3.5" /> Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!visitors?.items?.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No visitors inside</td></tr>
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
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : complaints?.map((c: any) => (
            <div key={c.id} className={cn('bg-white rounded-xl border shadow-sm p-4',
              c.status === 'open' ? 'border-red-100' :
              c.status === 'in-progress' ? 'border-yellow-100' : 'border-green-100')}>
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg flex-shrink-0',
                  c.status === 'open' ? 'bg-red-50' :
                  c.status === 'in-progress' ? 'bg-yellow-50' : 'bg-green-50')}>
                  <AlertCircle className={cn('w-4 h-4',
                    c.status === 'open' ? 'text-red-500' :
                    c.status === 'in-progress' ? 'text-yellow-600' : 'text-green-500')} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium capitalize text-gray-500">{c.category}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize',
                      c.status === 'open' ? 'bg-red-100 text-red-700' :
                      c.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mt-1">{c.description}</p>
                  {c.resolution && <p className="text-xs text-green-700 mt-1 italic">Resolution: {c.resolution}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(c.createdAt)}</p>
                </div>
                {c.status !== 'resolved' && (
                  <button
                    onClick={() => resolveComplaintMutation.mutate({ id: c.id, resolution: 'Issue addressed and resolved.' })}
                    className="flex-shrink-0 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
          {!complaints?.length && !complaintsLoading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">No complaints</div>
          )}
        </div>
      )}

      {/* Add Hostel Modal */}
      {showAddHostel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Add Hostel</h3>
            <div className="space-y-3">
              {[
                { label: 'Name', key: 'name', placeholder: 'e.g. Boys Hostel Block A' },
                { label: 'Warden Name', key: 'warden', placeholder: 'Full name' },
                { label: 'Warden Phone', key: 'wardenPhone', placeholder: '9876543210' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-gray-700">{f.label}</label>
                  <input value={(hostelForm as any)[f.key]}
                    onChange={e => setHostelForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select value={hostelForm.type} onChange={e => setHostelForm(p => ({ ...p, type: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                    {['boys', 'girls', 'mixed'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Rooms</label>
                  <input type="number" value={hostelForm.totalRooms}
                    onChange={e => setHostelForm(p => ({ ...p, totalRooms: Number(e.target.value) }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowAddHostel(false); setHostelForm({ name: '', type: 'boys', warden: '', wardenPhone: '', totalRooms: 20 }) }}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => addHostelMutation.mutate()}
                disabled={addHostelMutation.isPending || !hostelForm.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {addHostelMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check In Visitor Modal */}
      {showCheckin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Check In Visitor</h3>
            <div className="space-y-3">
              {[
                { label: 'Student ID (UUID)', key: 'studentId', placeholder: 'Student ID' },
                { label: 'Visitor Name', key: 'visitorName', placeholder: 'Full name' },
                { label: 'Visitor Phone', key: 'visitorPhone', placeholder: '9876543210' },
                { label: 'Relation', key: 'relation', placeholder: 'e.g. Parent, Sibling' },
                { label: 'Purpose', key: 'purpose', placeholder: 'Reason for visit' },
                { label: 'ID Proof Number', key: 'idProofNumber', placeholder: 'Aadhaar / PAN number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-gray-700">{f.label}</label>
                  <input value={(checkinForm as any)[f.key]}
                    onChange={e => setCheckinForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowCheckin(false); setCheckinForm({ studentId: '', visitorName: '', visitorPhone: '', relation: '', purpose: '', idProofType: 'Aadhaar', idProofNumber: '' }) }}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => checkinMutation.mutate()}
                disabled={checkinMutation.isPending || !checkinForm.visitorName}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                {checkinMutation.isPending ? 'Checking in...' : 'Check In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
