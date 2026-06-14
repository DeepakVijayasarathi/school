'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { parentPortalApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Search, Users, MessageSquare, X, Loader2, Phone, Mail } from 'lucide-react'

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all'

const emptyParent = {
  firstName: '', lastName: '', phone: '', email: '',
  gender: '', occupation: '', address: '', portalEnabled: true,
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="skeleton w-9 h-9 rounded-full" /><div className="space-y-1.5"><div className="skeleton h-3 w-28 rounded" /><div className="skeleton h-2.5 w-20 rounded" /></div></div></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-24 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-16 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-5 w-16 rounded-full" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-8 rounded" /></td>
    </tr>
  )
}

export default function ParentPortalPage() {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...emptyParent })
  const [selected, setSelected] = useState<any>(null)
  const [tab, setTab] = useState<'parents' | 'messages'>('parents')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['parents', search],
    queryFn: () => parentPortalApi.getChildren ?
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/parents?search=${search}&pageSize=50`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      }).then(r => r.json()) : Promise.resolve({ items: [], total: 0 }),
  })

  const createMutation = useMutation({
    mutationFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/parents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        phone: form.phone,
        email: form.email || undefined,
        gender: form.gender || undefined,
        occupation: form.occupation || undefined,
        address: form.address || undefined,
        portalEnabled: form.portalEnabled,
      }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => {
      toast.success('Parent added successfully')
      setShowAdd(false)
      setForm({ ...emptyParent })
      qc.invalidateQueries({ queryKey: ['parents'] })
    },
    onError: () => toast.error('Failed to add parent'),
  })

  const parents = data?.items ?? []
  const canSubmit = form.firstName.trim() && form.phone.trim()

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
          <p className="text-gray-500 text-sm">{data?.total ?? 0} parents registered</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" /> Add Parent
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['parents', 'messages'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {t === 'messages' ? 'Messages' : 'Parents'}
          </button>
        ))}
      </div>

      {tab === 'parents' && (
        <>
          {/* Search */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-gray-50/70 border-b border-gray-100">
                  <tr>
                    {['Parent', 'Phone', 'Children', 'Portal', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                    : parents.map((p: any) => (
                      <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-600 font-semibold text-sm border border-emerald-100 flex-shrink-0">
                              {p.fullName?.[0] ?? p.firstName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{p.fullName ?? `${p.firstName} ${p.lastName ?? ''}`.trim()}</p>
                              <p className="text-xs text-gray-400 truncate">{p.email ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.children?.length ?? 0} children</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', p.portalEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                            {p.portalEnabled ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelected(p)} className="text-xs text-blue-600 hover:underline font-medium">View</button>
                        </td>
                      </tr>
                    ))
                  }
                  {!isLoading && !parents.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No parents registered yet</p>
                        <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-blue-600 hover:underline">Add first parent</button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'messages' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Parent Messages</p>
          <p className="text-xs text-gray-400 mt-1">Select a parent to view or send messages</p>
        </div>
      )}

      {/* Parent Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSelected(null)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Parent Details</h3>
              <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {selected.fullName?.[0] ?? selected.firstName?.[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selected.fullName ?? `${selected.firstName} ${selected.lastName ?? ''}`.trim()}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', selected.portalEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {selected.portalEnabled ? 'Portal Active' : 'Portal Disabled'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{selected.phone}</span>
                </div>
                {selected.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{selected.email}</span>
                  </div>
                )}
              </div>

              {selected.children?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Linked Children</p>
                  <div className="space-y-2">
                    {selected.children.map((c: any) => (
                      <div key={c.studentId} className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.studentName}</p>
                          <p className="text-xs text-gray-500 capitalize">{c.relation}</p>
                        </div>
                        {c.isPrimary && <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Primary</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="w-full py-2.5 border border-blue-300 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors">
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Parent Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Add Parent / Guardian</h3>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name" className={inputCls} autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className={inputCls}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
                  <input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
                    placeholder="e.g. Engineer" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Home address" className={inputCls} />
              </div>
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-3 py-3">
                <input type="checkbox" id="portalEnabled" checked={form.portalEnabled}
                  onChange={e => setForm(f => ({ ...f, portalEnabled: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-600" />
                <label htmlFor="portalEnabled" className="text-sm text-gray-700">Enable parent portal access</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Parent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
