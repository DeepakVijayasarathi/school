'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Plus, Edit2, Trash2, Check, X, Settings } from 'lucide-react'

const api = (path: string, opts?: RequestInit) =>
  fetch(`/api/school-setup${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(r => r.json())

const TABS = [
  'School Info', 'Academic Years', 'Campus', 'Classes', 'Sections',
  'Subjects', 'Departments', 'Fee Config', 'Roles & Permissions', 'Subscription'
]

export default function SchoolSetupPage() {
  const [tab, setTab] = useState('School Info')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Setup</h1>
        <p className="text-gray-500 text-sm">Configure all aspects of your school</p>
      </div>

      <div className="flex overflow-x-auto gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1.5">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'School Info' && <SchoolInfoTab />}
      {tab === 'Academic Years' && <AcademicYearsTab />}
      {tab === 'Campus' && <CampusTab />}
      {tab === 'Classes' && <ClassesTab />}
      {tab === 'Sections' && <SectionsTab />}
      {tab === 'Subjects' && <SubjectsTab />}
      {tab === 'Departments' && <DepartmentsTab />}
      {tab === 'Fee Config' && <FeeConfigTab />}
      {tab === 'Roles & Permissions' && <RolesTab />}
      {tab === 'Subscription' && <SubscriptionTab />}
    </div>
  )
}

function SchoolInfoTab() {
  const { data } = useQuery({ queryKey: ['school-info'], queryFn: () => api('/info') })
  const qc = useQueryClient()
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState<any>({})

  const save = useMutation({
    mutationFn: (d: any) => api('/info', { method: 'PUT', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school-info'] }); setEdit(false) }
  })

  const info = data ?? {}
  const f = (k: string, label: string, type = 'text') => (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {edit ? (
        <input type={type} value={form[k] ?? info[k] ?? ''} onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))}
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
      ) : (
        <p className="mt-1 text-sm text-gray-900">{info[k] || '—'}</p>
      )}
    </div>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">School Information</h3>
        {edit ? (
          <div className="flex gap-2">
            <button onClick={() => setEdit(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">Cancel</button>
            <button onClick={() => save.mutate({ ...info, ...form })}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Save</button>
          </div>
        ) : (
          <button onClick={() => setEdit(true)} className="flex items-center gap-1 text-sm text-blue-600"><Edit2 className="w-4 h-4" /> Edit</button>
        )}
      </div>

      {edit && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400">
          School Logo — Drag & drop or click to upload
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {f('name', 'School Name')}
        {f('code', 'School Code')}
        {f('email', 'Email', 'email')}
        {f('phone', 'Phone', 'tel')}
        {f('website', 'Website', 'url')}
        {f('registrationNumber', 'Registration Number')}
        {f('affiliation', 'Board / Affiliation')}
        {f('medium', 'Medium of Instruction')}
        {f('foundedYear', 'Founded Year', 'number')}
        {f('motto', 'School Motto')}
        {f('address', 'Address')}
        {f('city', 'City')}
        {f('state', 'State')}
        {f('pincode', 'Pincode')}
      </div>
    </div>
  )
}

function CrudTab({ endpoint, columns, createForm, title }: any) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [formData, setFormData] = useState<any>({})

  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => api(`/${endpoint}`),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api(`/${endpoint}`, { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); setShowAdd(false); setFormData({}) }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: any) => api(`/${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); setEditItem(null); setFormData({}) }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/${endpoint}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [endpoint] })
  })

  const items = Array.isArray(data) ? data : data?.items ?? []

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Loading...</div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map((c: any) => <th key={c.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{c.label}</th>)}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {columns.map((c: any) => (
                  <td key={c.key} className="px-4 py-3 text-sm">{item[c.key] ?? '—'}</td>
                ))}
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => { setEditItem(item); setFormData(item) }}
                    className="text-blue-600 hover:text-blue-700"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteMutation.mutate(item.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(showAdd || editItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editItem ? 'Edit' : 'Add'} {title}</h3>
              <button onClick={() => { setShowAdd(false); setEditItem(null); setFormData({}) }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {createForm.map((f: any) => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-gray-700">{f.label}</label>
                  <input type={f.type ?? 'text'}
                    value={formData[f.key] ?? ''}
                    onChange={e => setFormData((p: any) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowAdd(false); setEditItem(null) }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button
                onClick={() => editItem ? updateMutation.mutate({ id: editItem.id, d: formData }) : createMutation.mutate(formData)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                {editItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AcademicYearsTab() {
  return <CrudTab title="Academic Years" endpoint="academic-years"
    columns={[{ key: 'name', label: 'Name' }, { key: 'startDate', label: 'Start' }, { key: 'endDate', label: 'End' }, { key: 'isCurrent', label: 'Current' }]}
    createForm={[{ key: 'name', label: 'Name (e.g. 2024-25)' }, { key: 'startDate', label: 'Start Date', type: 'date' }, { key: 'endDate', label: 'End Date', type: 'date' }]} />
}

function CampusTab() {
  return <CrudTab title="Campus" endpoint="campuses"
    columns={[{ key: 'name', label: 'Name' }, { key: 'code', label: 'Code' }, { key: 'address', label: 'Address' }]}
    createForm={[{ key: 'name', label: 'Campus Name' }, { key: 'code', label: 'Code' }, { key: 'address', label: 'Address' }, { key: 'phone', label: 'Phone' }]} />
}

function ClassesTab() {
  return <CrudTab title="Classes" endpoint="classes"
    columns={[{ key: 'name', label: 'Name' }, { key: 'code', label: 'Code' }, { key: 'displayOrder', label: 'Order' }]}
    createForm={[{ key: 'name', label: 'Class Name (e.g. Class 1)' }, { key: 'code', label: 'Code' }, { key: 'displayOrder', label: 'Display Order', type: 'number' }]} />
}

function SectionsTab() {
  return <CrudTab title="Sections" endpoint="sections"
    columns={[{ key: 'name', label: 'Name' }, { key: 'className', label: 'Class' }, { key: 'capacity', label: 'Capacity' }]}
    createForm={[{ key: 'classId', label: 'Class ID' }, { key: 'name', label: 'Section Name (e.g. A)' }, { key: 'capacity', label: 'Capacity', type: 'number' }]} />
}

function SubjectsTab() {
  return <CrudTab title="Subjects" endpoint="subjects"
    columns={[{ key: 'name', label: 'Name' }, { key: 'code', label: 'Code' }, { key: 'type', label: 'Type' }]}
    createForm={[{ key: 'name', label: 'Subject Name' }, { key: 'code', label: 'Code' }, { key: 'type', label: 'Type (theory/practical)' }]} />
}

function DepartmentsTab() {
  return <CrudTab title="Departments" endpoint="departments"
    columns={[{ key: 'name', label: 'Name' }, { key: 'code', label: 'Code' }, { key: 'headName', label: 'Head' }]}
    createForm={[{ key: 'name', label: 'Department Name' }, { key: 'code', label: 'Code' }]} />
}

function FeeConfigTab() {
  return <CrudTab title="Fee Types" endpoint="fee-types"
    columns={[{ key: 'name', label: 'Name' }, { key: 'amount', label: 'Default Amount' }, { key: 'frequency', label: 'Frequency' }]}
    createForm={[{ key: 'name', label: 'Fee Name' }, { key: 'amount', label: 'Amount', type: 'number' }, { key: 'frequency', label: 'Frequency (monthly/quarterly/annual)' }]} />
}

function RolesTab() {
  const { data } = useQuery({ queryKey: ['roles'], queryFn: () => api('/roles') })
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold">Roles & Permissions</h3>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Role</button>
      </div>
      <div className="divide-y">
        {(Array.isArray(data) ? data : data?.items ?? []).map((role: any) => (
          <div key={role.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
            <div>
              <p className="font-medium text-sm">{role.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{role.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {(role.permissions ?? []).slice(0, 5).map((p: string) => (
                  <span key={p} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{p}</span>
                ))}
                {(role.permissions ?? []).length > 5 && (
                  <span className="text-xs text-gray-400">+{role.permissions.length - 5} more</span>
                )}
              </div>
            </div>
            <button className="text-blue-600 text-sm hover:underline">Edit Permissions</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SubscriptionTab() {
  const { data } = useQuery({ queryKey: ['subscription'], queryFn: () => fetch('/api/subscription/current').then(r => r.json()) })
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: () => fetch('/api/subscription/plans').then(r => r.json()) })

  return (
    <div className="space-y-5">
      {data && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <p className="text-sm opacity-80">Current Plan</p>
          <p className="text-3xl font-bold mt-1">{data.planName}</p>
          <div className="flex gap-6 mt-3 text-sm opacity-90">
            <span>Students: {data.studentCount} / {data.maxStudents ?? 'Unlimited'}</span>
            <span>Employees: {data.employeeCount} / {data.maxEmployees ?? 'Unlimited'}</span>
            <span>Storage: {data.storageUsedGb} GB / {data.storageGb} GB</span>
          </div>
          <p className="mt-2 text-sm opacity-70">Valid until: {data.endDate ? new Date(data.endDate).toLocaleDateString() : 'No expiry'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(plans ?? []).map((plan: any) => (
          <div key={plan.id} className={cn('bg-white rounded-xl border p-5 space-y-3',
            data?.planCode === plan.code ? 'border-blue-500 shadow-md' : 'border-gray-100')}>
            {data?.planCode === plan.code && (
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Current</span>
            )}
            <h3 className="font-bold text-gray-900">{plan.name}</h3>
            <p className="text-2xl font-bold">₹{plan.priceMonthly?.toLocaleString()}<span className="text-sm font-normal text-gray-500">/mo</span></p>
            <ul className="space-y-1 text-xs text-gray-600">
              {plan.maxStudents && <li>Up to {plan.maxStudents.toLocaleString()} students</li>}
              {plan.maxEmployees && <li>Up to {plan.maxEmployees} staff</li>}
              <li>{plan.storageGb} GB storage</li>
            </ul>
            {data?.planCode !== plan.code && (
              <button className="w-full py-2 border border-blue-500 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50">
                Upgrade
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
