'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api as httpClient } from '@/lib/api'
import { Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react'

const api = (path: string, opts?: { method?: string; body?: string }) => {
  const method = (opts?.method?.toLowerCase() ?? 'get') as any
  const data   = opts?.body ? JSON.parse(opts.body) : undefined
  return httpClient({ method, url: `/school${path}`, data }).then((r: any) => r.data)
}

const TABS = [
  'School Info', 'Academic Years', 'Campus', 'Classes', 'Sections',
  'Subjects', 'Departments', 'Fee Config', 'Roles & Permissions', 'Subscription',
]

export default function SchoolSetupPage() {
  const [tab, setTab] = useState('School Info')

  return (
    <div className="space-y-5 anim-fade-up">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
          School Setup
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-3)' }}>
          Configure all aspects of your school
        </p>
      </div>

      {/* Tab strip */}
      <div className="flex overflow-x-auto gap-1 rounded-xl p-1.5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors"
            style={tab === t
              ? { background: 'var(--brand)', color: '#fff' }
              : { color: 'var(--text-3)', background: 'transparent' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'School Info'        && <SchoolInfoTab />}
      {tab === 'Academic Years'     && <AcademicYearsTab />}
      {tab === 'Campus'             && <CampusTab />}
      {tab === 'Classes'            && <ClassesTab />}
      {tab === 'Sections'           && <SectionsTab />}
      {tab === 'Subjects'           && <SubjectsTab />}
      {tab === 'Departments'        && <DepartmentsTab />}
      {tab === 'Fee Config'         && <FeeConfigTab />}
      {tab === 'Roles & Permissions'&& <RolesTab />}
      {tab === 'Subscription'       && <SubscriptionTab />}
    </div>
  )
}

// ── School Info ────────────────────────────────────────────────────────────────
function SchoolInfoTab() {
  const { data } = useQuery({ queryKey: ['school-info'], queryFn: () => api('/info') })
  const qc = useQueryClient()
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState<any>({})

  const save = useMutation({
    mutationFn: (d: any) => api('/info', { method: 'PUT', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school-info'] }); setEdit(false) },
  })

  const info = data ?? {}
  const field = (k: string, label: string, type = 'text') => (
    <div key={k}>
      <label className="text-[12px] font-semibold block mb-1" style={{ color: 'var(--text-2)' }}>{label}</label>
      {edit
        ? <input type={type} value={form[k] ?? info[k] ?? ''}
            onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))}
            className="input-base focus-ring w-full" />
        : <p className="text-[13px]" style={{ color: 'var(--text-1)' }}>{info[k] || '—'}</p>}
    </div>
  )

  return (
    <div className="card p-6 space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-[15px]" style={{ color: 'var(--text-1)' }}>School Information</h3>
        {edit ? (
          <div className="flex gap-2">
            <button onClick={() => setEdit(false)} className="btn btn-ghost text-[13px]">Cancel</button>
            <button onClick={() => save.mutate({ ...info, ...form })} className="btn btn-primary text-[13px]">Save</button>
          </div>
        ) : (
          <button onClick={() => setEdit(true)} className="btn btn-ghost gap-1 text-[13px]" style={{ color: 'var(--brand)' }}>
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {field('name', 'School Name')}
        {field('email', 'Email', 'email')}
        {field('phone', 'Phone', 'tel')}
        {field('website', 'Website', 'url')}
        {field('address', 'Address')}
        {field('city', 'City')}
        {field('state', 'State')}
        {field('pincode', 'Pincode')}
        {field('country', 'Country')}
        {field('timezone', 'Timezone')}
        {field('locale', 'Locale')}
        {field('currency', 'Currency')}
      </div>
    </div>
  )
}

// ── Generic CRUD table ─────────────────────────────────────────────────────────
function CrudTab({ endpoint, columns, createForm, title }: any) {
  const qc = useQueryClient()
  const [showAdd,  setShowAdd]  = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [formData, setFormData] = useState<any>({})

  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => api(`/${endpoint}`),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api(`/${endpoint}`, { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); setShowAdd(false); setFormData({}) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: any) => api(`/${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); setEditItem(null); setFormData({}) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/${endpoint}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [endpoint] }),
  })

  const items = Array.isArray(data) ? data : data?.items ?? []

  const openEdit = (item: any) => { setEditItem(item); setFormData({ ...item }) }
  const closeModal = () => { setShowAdd(false); setEditItem(null); setFormData({}) }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="font-bold text-[14px]" style={{ color: 'var(--text-1)' }}>{title}</h3>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary gap-1.5 text-[13px]">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--text-4)' }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-[13px]" style={{ color: 'var(--text-4)' }}>
          No {title.toLowerCase()} yet. Click Add to create one.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {columns.map((c: any) => (
                  <th key={c.key} className="table-header text-left">{c.label}</th>
                ))}
                <th className="table-header text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="table-row-hover transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  {columns.map((c: any) => (
                    <td key={c.key} className="table-cell text-[13px]" style={{ color: 'var(--text-1)' }}>
                      {c.render ? c.render(item[c.key]) : (item[c.key] ?? '—')}
                    </td>
                  ))}
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(item)}
                        className="btn btn-ghost w-7 h-7 p-0 rounded-lg flex items-center justify-center"
                        style={{ color: 'var(--brand)' }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(item.id)}
                        className="btn btn-ghost w-7 h-7 p-0 rounded-lg flex items-center justify-center"
                        style={{ color: 'var(--danger)' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal — rendered via portal so fixed positioning isn't clipped by layout transforms */}
      {(showAdd || editItem) && (
        <SchoolModal title={`${editItem ? 'Edit' : 'Add'} ${title}`} onClose={closeModal}>
          <div className="space-y-4">
            {createForm.map((f: any) => (
              <div key={f.key}>
                <label className="text-[12px] font-semibold block mb-1.5" style={{ color: 'var(--text-2)' }}>
                  {f.label}
                </label>
                <FormField
                  f={f}
                  value={formData[f.key]}
                  onChange={v => setFormData((p: any) => ({ ...p, [f.key]: v }))}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={closeModal} className="btn btn-ghost flex-1 py-2.5">Cancel</button>
            <button
              onClick={() => editItem
                ? updateMutation.mutate({ id: editItem.id, d: formData })
                : createMutation.mutate(formData)}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn btn-primary flex-1 py-2.5 gap-2">
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </SchoolModal>
      )}
    </div>
  )
}

// ── Portal modal — mounts at document.body to escape layout stacking contexts ──
function SchoolModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 60px rgba(0,0,0,.35)',
          animation: 'fadeUp .18s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <h3 className="font-bold text-[16px]" style={{ color: 'var(--text-1)' }}>{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}

// ── Form field — handles text/number/date inputs, API-loaded selects, static selects
function FormField({ f, value, onChange }: { f: any; value: any; onChange: (v: string) => void }) {
  // API-loaded dropdown
  const { data: options } = useQuery({
    queryKey: ['select-opts', f.optionsEndpoint],
    queryFn:  () => api(`/${f.optionsEndpoint}`),
    enabled:  f.type === 'select' && !!f.optionsEndpoint,
    staleTime: 60_000,
  })

  if (f.type === 'select') {
    // Static options list (no API call needed)
    const staticOpts: { value: string; label: string }[] | undefined = f.options
    const apiOpts = staticOpts
      ? staticOpts
      : (Array.isArray(options) ? options : (options as any)?.items ?? []).map((o: any) => ({
          value: o[f.optionValue ?? 'id'],
          label: o[f.optionLabel ?? 'name'],
        }))

    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value)}
        className="input-base focus-ring w-full"
        style={{ background: 'var(--bg)' }}>
        <option value="">— Select {f.label} —</option>
        {apiOpts.map((o: any) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }

  if (f.type === 'textarea') {
    return (
      <textarea value={value ?? ''} onChange={e => onChange(e.target.value)}
        rows={f.rows ?? 2} placeholder={f.placeholder ?? ''}
        className="input-base focus-ring w-full resize-none" />
    )
  }

  return (
    <input type={f.type ?? 'text'} value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={f.placeholder ?? ''}
      className="input-base focus-ring w-full" />
  )
}

// ── Tab definitions ────────────────────────────────────────────────────────────

function AcademicYearsTab() {
  return <CrudTab title="Academic Years" endpoint="academic-years"
    columns={[
      { key: 'name',      label: 'Name' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate',   label: 'End Date' },
      { key: 'isCurrent', label: 'Current', render: (v: any) => v ? '✓ Yes' : 'No' },
    ]}
    createForm={[
      { key: 'name',      label: 'Name (e.g. 2024-25)',  placeholder: '2024-25' },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'endDate',   label: 'End Date',   type: 'date' },
    ]} />
}

function CampusTab() {
  return <CrudTab title="Campus" endpoint="campuses"
    columns={[
      { key: 'name',    label: 'Name' },
      { key: 'code',    label: 'Code' },
      { key: 'city',    label: 'City' },
      { key: 'address', label: 'Address' },
    ]}
    createForm={[
      { key: 'name',    label: 'Campus Name', placeholder: 'Main Campus' },
      { key: 'code',    label: 'Code',        placeholder: 'MAIN' },
      { key: 'city',    label: 'City' },
      { key: 'state',   label: 'State' },
      { key: 'address', label: 'Address' },
      { key: 'phone',   label: 'Phone', type: 'tel' },
    ]} />
}

function ClassesTab() {
  return <CrudTab title="Classes" endpoint="classes"
    columns={[
      { key: 'name',         label: 'Class Name' },
      { key: 'campusName',   label: 'Campus' },
      { key: 'numericLevel', label: 'Order' },
    ]}
    createForm={[
      { key: 'campusId',     label: 'Campus', type: 'select',
        optionsEndpoint: 'campuses', optionLabel: 'name', optionValue: 'id' },
      { key: 'name',         label: 'Class Name', placeholder: 'Class 1' },
      { key: 'numericLevel', label: 'Display Order', type: 'number' },
    ]} />
}

function SectionsTab() {
  return <CrudTab title="Sections" endpoint="sections"
    columns={[
      { key: 'name',        label: 'Section' },
      { key: 'className',   label: 'Class' },
      { key: 'academicYear',label: 'Academic Year' },
      { key: 'maxStrength', label: 'Capacity' },
    ]}
    createForm={[
      { key: 'classId', label: 'Class', type: 'select',
        optionsEndpoint: 'classes', optionLabel: 'name', optionValue: 'id' },
      { key: 'academicYearId', label: 'Academic Year', type: 'select',
        optionsEndpoint: 'academic-years', optionLabel: 'name', optionValue: 'id' },
      { key: 'name',        label: 'Section Name', placeholder: 'A' },
      { key: 'maxStrength', label: 'Capacity',     type: 'number', placeholder: '40' },
    ]} />
}

function SubjectsTab() {
  return <CrudTab title="Subjects" endpoint="subjects"
    columns={[
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'type', label: 'Type' },
      { key: 'departmentName', label: 'Department' },
    ]}
    createForm={[
      { key: 'name', label: 'Subject Name', placeholder: 'Mathematics' },
      { key: 'code', label: 'Subject Code', placeholder: 'MATH101' },
      { key: 'type', label: 'Type', type: 'select', options: [
          { value: 'theory',     label: 'Theory' },
          { value: 'practical',  label: 'Practical' },
          { value: 'both',       label: 'Theory & Practical' },
        ],
      },
      { key: 'departmentId', label: 'Department (optional)', type: 'select',
        optionsEndpoint: 'departments', optionLabel: 'name', optionValue: 'id' },
    ]} />
}

function DepartmentsTab() {
  return <CrudTab title="Departments" endpoint="departments"
    columns={[
      { key: 'name',     label: 'Name' },
      { key: 'code',     label: 'Code' },
      { key: 'headName', label: 'Head' },
    ]}
    createForm={[
      { key: 'name', label: 'Department Name', placeholder: 'Science' },
      { key: 'code', label: 'Code',            placeholder: 'SCI' },
    ]} />
}

function FeeConfigTab() {
  return <CrudTab title="Fee Types" endpoint="fee-types"
    columns={[
      { key: 'name',      label: 'Fee Name' },
      { key: 'amount',    label: 'Default Amount' },
      { key: 'frequency', label: 'Frequency' },
      { key: 'category',  label: 'Category' },
    ]}
    createForm={[
      { key: 'name',   label: 'Fee Name', placeholder: 'Tuition Fee' },
      { key: 'amount', label: 'Amount (₹)', type: 'number', placeholder: '5000' },
      { key: 'frequency', label: 'Frequency', type: 'select', options: [
          { value: 'monthly',   label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'annual',    label: 'Annual' },
          { value: 'one_time',  label: 'One Time' },
        ],
      },
      { key: 'category', label: 'Category', type: 'select', options: [
          { value: 'tuition',   label: 'Tuition' },
          { value: 'transport', label: 'Transport' },
          { value: 'hostel',    label: 'Hostel' },
          { value: 'exam',      label: 'Exam' },
          { value: 'activity',  label: 'Activity' },
          { value: 'other',     label: 'Other' },
        ],
      },
      { key: 'description', label: 'Description (optional)', type: 'textarea' },
    ]} />
}

// ── Roles & Permissions ────────────────────────────────────────────────────────
function RolesTab() {
  const { data } = useQuery({ queryKey: ['roles'], queryFn: () => api('/roles') })
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="font-bold text-[14px]" style={{ color: 'var(--text-1)' }}>Roles & Permissions</h3>
        <button className="btn btn-primary gap-1 text-[13px]">
          <Plus className="w-4 h-4" /> Add Role
        </button>
      </div>
      <div>
        {(Array.isArray(data) ? data : data?.items ?? []).map((role: any) => (
          <div key={role.id} className="px-5 py-4 flex items-center justify-between table-row-hover transition-colors"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <p className="font-semibold text-[13px]" style={{ color: 'var(--text-1)' }}>{role.name}</p>
              {role.description && (
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-4)' }}>{role.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {(role.permissions ?? []).slice(0, 6).map((p: string) => (
                  <span key={p} className="badge badge-draft text-[10px]">{p}</span>
                ))}
                {(role.permissions ?? []).length > 6 && (
                  <span className="text-[11px]" style={{ color: 'var(--text-4)' }}>
                    +{role.permissions.length - 6} more
                  </span>
                )}
              </div>
            </div>
            <button className="btn btn-ghost text-[12px]" style={{ color: 'var(--brand)' }}>
              Edit Permissions
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Subscription ───────────────────────────────────────────────────────────────
function SubscriptionTab() {
  const { data }  = useQuery({ queryKey: ['subscription'], queryFn: () => httpClient.get('/subscription/current').then(r => r.data).catch(() => null) })
  const { data: plans } = useQuery({ queryKey: ['plans'],    queryFn: () => httpClient.get('/subscription/plans').then(r => r.data).catch(() => []) })

  return (
    <div className="space-y-5">
      {data && (
        <div className="rounded-2xl p-5 text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 24px rgba(99,102,241,.3)' }}>
          <p className="text-[12px] opacity-80">Current Plan</p>
          <p className="text-3xl font-bold mt-1">{data.planName}</p>
          <div className="flex flex-wrap gap-6 mt-3 text-[13px] opacity-90">
            <span>Students: {data.studentCount} / {data.maxStudents ?? '∞'}</span>
            <span>Staff: {data.employeeCount} / {data.maxEmployees ?? '∞'}</span>
            <span>Storage: {data.storageUsedGb} GB / {data.storageGb} GB</span>
          </div>
          <p className="mt-2 text-[12px] opacity-70">
            Valid until: {data.endDate ? new Date(data.endDate).toLocaleDateString() : 'No expiry'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(plans ?? []).map((plan: any) => (
          <div key={plan.id} className="card p-5 space-y-3"
            style={data?.planCode === plan.code
              ? { border: '2px solid var(--brand)', boxShadow: '0 0 0 4px var(--brand-bg)' }
              : {}}>
            {data?.planCode === plan.code && (
              <span className="badge badge-active text-[11px]">Current</span>
            )}
            <h3 className="font-bold text-[14px]" style={{ color: 'var(--text-1)' }}>{plan.name}</h3>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
              ₹{plan.priceMonthly?.toLocaleString()}
              <span className="text-[13px] font-normal" style={{ color: 'var(--text-3)' }}>/mo</span>
            </p>
            <ul className="space-y-1 text-[12px]" style={{ color: 'var(--text-3)' }}>
              {plan.maxStudents  && <li>Up to {plan.maxStudents.toLocaleString()} students</li>}
              {plan.maxEmployees && <li>Up to {plan.maxEmployees} staff</li>}
              <li>{plan.storageGb} GB storage</li>
            </ul>
            {data?.planCode !== plan.code && (
              <button className="w-full btn text-[13px] py-2"
                style={{ border: '1px solid var(--brand)', color: 'var(--brand)', background: 'transparent' }}>
                Upgrade
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
