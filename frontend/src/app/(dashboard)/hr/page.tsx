'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrApi } from '@/lib/api'
import { formatDate, formatCurrency, statusColor, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, DollarSign, Loader2, X, Users } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Use design-system badge classes instead of hardcoded Tailwind colors
const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-draft',
  approved: 'badge-active',
  paid: 'badge-active',
  cancelled: 'badge-inactive',
}

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'probation']
const inputCls = 'input-base focus-ring'

const emptyEmp = {
  firstName: '', lastName: '', phone: '', email: '',
  designation: '', departmentId: '', joiningDate: '',
  employmentType: 'full_time', gender: '', address: '',
}

export default function HRPage() {
  const [tab, setTab] = useState<'employees' | 'payroll'>('employees')
  const [search, setSearch] = useState('')
  const [processForm, setProcessForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), workingDays: 26 })
  const [showProcess, setShowProcess] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [empForm, setEmpForm] = useState({ ...emptyEmp })
  const qc = useQueryClient()

  const { data: employees, isLoading: empLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: () => hrApi.getEmployees({ search: search || undefined, pageSize: 50 }).then(r => r.data),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => hrApi.getDepartments().then(r => r.data),
  })

  const { data: payrolls, isLoading: payrollLoading } = useQuery({
    queryKey: ['payrolls', processForm.year],
    queryFn: () => hrApi.getPayrolls(processForm.year).then(r => r.data),
    enabled: tab === 'payroll',
  })

  const addMutation = useMutation({
    mutationFn: () => hrApi.createEmployee({
      firstName: empForm.firstName,
      lastName: empForm.lastName || undefined,
      phone: empForm.phone,
      email: empForm.email || undefined,
      designation: empForm.designation || undefined,
      departmentId: empForm.departmentId || undefined,
      joiningDate: empForm.joiningDate || undefined,
      employmentType: empForm.employmentType,
      gender: empForm.gender || undefined,
      address: empForm.address || undefined,
    }),
    onSuccess: () => {
      toast.success('Employee added successfully')
      setShowAdd(false)
      setEmpForm({ ...emptyEmp })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: () => toast.error('Failed to add employee'),
  })

  const processMutation = useMutation({
    mutationFn: () => hrApi.processPayroll({ month: processForm.month, year: processForm.year, workingDays: processForm.workingDays }),
    onSuccess: (data) => {
      toast.success(`Payroll processed. Net: ${formatCurrency(data.data.totalNet)}`)
      setShowProcess(false)
      qc.invalidateQueries({ queryKey: ['payrolls'] })
    },
    onError: () => toast.error('Failed to process payroll'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrApi.approvePayroll(id),
    onSuccess: () => { toast.success('Payroll approved'); qc.invalidateQueries({ queryKey: ['payrolls'] }) },
    onError: () => toast.error('Failed to approve payroll'),
  })

  const paidMutation = useMutation({
    mutationFn: (id: string) => hrApi.markPaid(id),
    onSuccess: () => { toast.success('Payroll marked as paid'); qc.invalidateQueries({ queryKey: ['payrolls'] }) },
    onError: () => toast.error('Failed to mark payroll as paid'),
  })

  const canSubmitEmp = empForm.firstName.trim() && empForm.phone.trim()

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>HR & Payroll</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Manage employees and salary processing</p>
        </div>
        {tab === 'employees' && (
          <button
            onClick={() => setShowAdd(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
        {tab === 'payroll' && (
          <button
            onClick={() => setShowProcess(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" /> Process Payroll
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-2)' }}>
        {(['employees', 'payroll'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
              tab === t
                ? 'shadow'
                : '')}
            style={tab === t
              ? { background: 'var(--surface)', color: 'var(--text-1)' }
              : { color: 'var(--text-3)' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'employees' && (
        <div className="card overflow-hidden">
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or employee code..."
              className="input-base focus-ring w-full max-w-sm" />
          </div>

          {empLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    {['Employee', 'Code', 'Designation', 'Department', 'Joining Date', 'Status'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees?.items?.map((emp: any) => (
                    <tr key={emp.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-sm flex-shrink-0"
                            style={{ background: 'var(--brand-bg)', color: 'var(--brand)', border: '1px solid var(--brand-bg)' }}>
                            {emp.fullName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{emp.fullName}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-4)' }}>{emp.email ?? emp.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-mono" style={{ color: 'var(--text-2)' }}>{emp.employeeCode}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{emp.designation ?? '—'}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{emp.department ?? '—'}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{formatDate(emp.joiningDate)}</td>
                      <td className="table-cell">
                        <span className={cn(statusColor(emp.status), 'text-xs px-2.5 py-1 rounded-full font-semibold capitalize')}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!employees?.items?.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <Users className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-4)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-4)' }}>No employees found</p>
                        <button onClick={() => setShowAdd(true)} className="mt-2 text-xs hover:underline" style={{ color: 'var(--brand)' }}>Add first employee</button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>Year:</span>
            {[new Date().getFullYear() - 1, new Date().getFullYear()].map(y => (
              <button key={y} onClick={() => setProcessForm(p => ({ ...p, year: y }))}
                className="px-3 py-1.5 rounded-lg text-sm border transition-all"
                style={processForm.year === y
                  ? { background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }
                  : { borderColor: 'var(--border)', color: 'var(--text-2)', background: 'transparent' }}>
                {y}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr>
                    {['Month', 'Gross', 'Deductions', 'Net', 'Status', 'Actions'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payrolls?.map((p: any) => (
                    <tr key={p.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="table-cell font-medium" style={{ color: 'var(--text-1)' }}>{MONTHS[p.month - 1]} {p.year}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{formatCurrency(p.totalGross ?? 0)}</td>
                      <td className="table-cell" style={{ color: 'var(--danger)' }}>{formatCurrency(p.totalDeductions ?? 0)}</td>
                      <td className="table-cell font-semibold" style={{ color: 'var(--success)' }}>{formatCurrency(p.totalNet ?? 0)}</td>
                      <td className="table-cell">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium capitalize', STATUS_BADGE[p.status] ?? 'badge-draft')}>
                          {p.status}
                        </span>
                      </td>
                      <td className="table-cell flex gap-2">
                        {p.status === 'draft' && (
                          <button onClick={() => approveMutation.mutate(p.id)} disabled={approveMutation.isPending}
                            className="px-2.5 py-1 text-xs rounded-lg transition-colors"
                            style={{ background: 'var(--brand-bg)', color: 'var(--brand)' }}>Approve</button>
                        )}
                        {p.status === 'approved' && (
                          <button onClick={() => paidMutation.mutate(p.id)} disabled={paidMutation.isPending}
                            className="px-2.5 py-1 text-xs rounded-lg transition-colors"
                            style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Mark Paid</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!payrolls?.length && !payrollLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-4)' }}>
                        No payrolls processed for {processForm.year} yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAdd && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Add New Employee</h3>
              <button onClick={() => { setShowAdd(false); setEmpForm({ ...emptyEmp }) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                    First Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input value={empForm.firstName} onChange={e => setEmpForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name" className={inputCls} autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Last Name</label>
                  <input value={empForm.lastName} onChange={e => setEmpForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                    Phone <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Email</label>
                  <input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@school.com" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Designation</label>
                  <input value={empForm.designation} onChange={e => setEmpForm(f => ({ ...f, designation: e.target.value }))}
                    placeholder="e.g. Science Teacher" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Department</label>
                  <select value={empForm.departmentId} onChange={e => setEmpForm(f => ({ ...f, departmentId: e.target.value }))} className={inputCls}>
                    <option value="">Select department</option>
                    {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Joining Date</label>
                  <input type="date" value={empForm.joiningDate} onChange={e => setEmpForm(f => ({ ...f, joiningDate: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Employment Type</label>
                  <select value={empForm.employmentType} onChange={e => setEmpForm(f => ({ ...f, employmentType: e.target.value }))} className={inputCls}>
                    {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Gender</label>
                <select value={empForm.gender} onChange={e => setEmpForm(f => ({ ...f, gender: e.target.value }))} className={inputCls}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowAdd(false); setEmpForm({ ...emptyEmp }) }}
                className="btn btn-ghost flex-1">
                Cancel
              </button>
              <button
                onClick={() => addMutation.mutate()}
                disabled={!canSubmitEmp || addMutation.isPending}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Employee
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Process Payroll Modal */}
      {showProcess && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Process Payroll</h3>
              <button onClick={() => setShowProcess(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Month</label>
                <select value={processForm.month} onChange={e => setProcessForm(p => ({ ...p, month: Number(e.target.value) }))} className={inputCls}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Year</label>
                <input type="number" value={processForm.year} onChange={e => setProcessForm(p => ({ ...p, year: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Working Days</label>
                <input type="number" value={processForm.workingDays} onChange={e => setProcessForm(p => ({ ...p, workingDays: Number(e.target.value) }))} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowProcess(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => processMutation.mutate()} disabled={processMutation.isPending}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                {processMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Process
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
