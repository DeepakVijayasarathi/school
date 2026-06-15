'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { parentsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Search, Users, MessageSquare, X, Loader2, Phone, Mail } from 'lucide-react'

const inputCls = 'input-base focus-ring w-full'

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
    queryFn: () => parentsApi.list({ search: search || undefined, pageSize: 50 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => parentsApi.create({
      firstName: form.firstName,
      lastName: form.lastName || undefined,
      phone: form.phone,
      email: form.email || undefined,
      gender: form.gender || undefined,
      occupation: form.occupation || undefined,
      address: form.address || undefined,
      portalEnabled: form.portalEnabled,
    }),
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
    <div className="space-y-5 anim-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Parent Portal</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{data?.total ?? 0} parents registered</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Parent
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-2)' }}>
        {(['parents', 'messages'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
              tab === t ? 'shadow' : '')}
            style={tab === t
              ? { background: 'var(--surface)', color: 'var(--text-1)' }
              : { color: 'var(--text-3)' }}>
            {t === 'messages' ? 'Messages' : 'Parents'}
          </button>
        ))}
      </div>

      {tab === 'parents' && (
        <>
          {/* Search */}
          <div className="card p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="input-base focus-ring w-full pl-9 pr-3 py-2 text-sm" />
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr>
                    {['Parent', 'Phone', 'Children', 'Portal', 'Action'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                    : parents.map((p: any) => (
                      <tr key={p.id} className="table-row-hover">
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-sm flex-shrink-0"
                              style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--border)' }}>
                              {p.fullName?.[0] ?? p.firstName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{p.fullName ?? `${p.firstName} ${p.lastName ?? ''}`.trim()}</p>
                              <p className="text-xs truncate" style={{ color: 'var(--text-4)' }}>{p.email ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{p.phone}</td>
                        <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{p.children?.length ?? 0} children</td>
                        <td className="table-cell">
                          <span className={p.portalEnabled ? 'badge-active' : 'badge-inactive'}>
                            {p.portalEnabled ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <button onClick={() => setSelected(p)}
                            className="text-xs font-medium hover:underline"
                            style={{ color: 'var(--brand)' }}>View</button>
                        </td>
                      </tr>
                    ))
                  }
                  {!isLoading && !parents.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <Users className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-4)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-4)' }}>No parents registered yet</p>
                        <button onClick={() => setShowAdd(true)}
                          className="mt-2 text-xs hover:underline"
                          style={{ color: 'var(--brand)' }}>Add first parent</button>
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
        <div className="card p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>Parent Messages</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Select a parent to view or send messages</p>
        </div>
      )}

      {/* Parent Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,.30)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto shadow-2xl"
            style={{ background: 'var(--surface)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 sticky top-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Parent Details</h3>
              <button onClick={() => setSelected(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'var(--text-4)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
                  style={{ background: 'linear-gradient(135deg, var(--success-bg), var(--success))' }}>
                  {selected.fullName?.[0] ?? selected.firstName?.[0]}
                </div>
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-1)' }}>{selected.fullName ?? `${selected.firstName} ${selected.lastName ?? ''}`.trim()}</p>
                  <span className={selected.portalEnabled ? 'badge-active' : 'badge-inactive'}>
                    {selected.portalEnabled ? 'Portal Active' : 'Portal Disabled'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--surface-2)' }}>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
                  <span style={{ color: 'var(--text-2)' }}>{selected.phone}</span>
                </div>
                {selected.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
                    <span style={{ color: 'var(--text-2)' }}>{selected.email}</span>
                  </div>
                )}
              </div>

              {selected.children?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Linked Children</p>
                  <div className="space-y-2">
                    {selected.children.map((c: any) => (
                      <div key={c.studentId} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                        style={{ background: 'var(--brand-bg)' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{c.studentName}</p>
                          <p className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{c.relation}</p>
                        </div>
                        {c.isPrimary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: 'var(--brand)', color: '#fff' }}>Primary</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-ghost w-full py-2.5 text-sm" style={{ color: 'var(--brand)', borderColor: 'var(--brand)' }}>
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Parent Modal */}
      {showAdd && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col rounded-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Add Parent / Guardian</h3>
              <button onClick={() => { setShowAdd(false); setForm({ ...emptyParent }) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'var(--text-4)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                    First Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name" className={inputCls} autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Last Name</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                  Phone <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Gender</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className={inputCls}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Occupation</label>
                  <input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
                    placeholder="e.g. Engineer" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Home address" className={inputCls} />
              </div>
              <div className="flex items-center gap-3 rounded-xl px-3 py-3"
                style={{ background: 'var(--brand-bg)' }}>
                <input type="checkbox" id="portalEnabled" checked={form.portalEnabled}
                  onChange={e => setForm(f => ({ ...f, portalEnabled: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[var(--brand)]" />
                <label htmlFor="portalEnabled" className="text-sm" style={{ color: 'var(--text-2)' }}>Enable parent portal access</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowAdd(false); setForm({ ...emptyParent }) }}
                className="btn btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
                className="btn btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Parent
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
