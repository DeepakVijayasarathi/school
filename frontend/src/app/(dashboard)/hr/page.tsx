'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrApi } from '@/lib/api'
import { formatDate, formatCurrency, statusColor, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, DollarSign, Loader2, X, Users } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'probation']
const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all'

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
  })

  const paidMutation = useMutation({
    mutationFn: (id: string) => hrApi.markPaid(id),
    onSuccess: () => { toast.success('Payroll marked as paid'); qc.invalidateQueries({ queryKey: ['payrolls'] }) },
  })

  const canSubmitEmp = empForm.firstName.trim() && empForm.phone.trim()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR & Payroll</h1>
          <p className="text-gray-500 text-sm">Manage employees and salary processing</p>
        </div>
        {tab === 'employees' && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
        {tab === 'payroll' && (
          <button
            onClick={() => setShowProcess(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
          >
            <DollarSign className="w-4 h-4" /> Process Payroll
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['employees', 'payroll'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'employees' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or employee code..."
              className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
          </div>

          {empLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50/70 border-b border-gray-100">
                  <tr>
                    {['Employee', 'Code', 'Designation', 'Department', 'Joining Date', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees?.items?.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-semibold text-sm border border-indigo-100 flex-shrink-0">
                            {emp.fullName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{emp.fullName}</p>
                            <p className="text-xs text-gray-400 truncate">{emp.email ?? emp.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{emp.employeeCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.designation ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.department ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(emp.joiningDate)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold capitalize', statusColor(emp.status))}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!employees?.items?.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No employees found</p>
                        <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-blue-600 hover:underline">Add first employee</button>
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
            <span className="text-sm text-gray-500">Year:</span>
            {[new Date().getFullYear() - 1, new Date().getFullYear()].map(y => (
              <button key={y} onClick={() => setProcessForm(p => ({ ...p, year: y }))}
                className={cn('px-3 py-1.5 rounded-lg text-sm border transition-all',
                  processForm.year === y ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                {y}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-gray-50/70 border-b border-gray-100">
                  <tr>
                    {['Month', 'Gross', 'Deductions', 'Net', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payrolls?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-sm">{MONTHS[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(p.totalGross ?? 0)}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(p.totalDeductions ?? 0)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">{formatCurrency(p.totalNet ?? 0)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium capitalize', STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600')}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        {p.status === 'draft' && (
                          <button onClick={() => approveMutation.mutate(p.id)} disabled={approveMutation.isPending}
                            className="px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">Approve</button>
                        )}
                        {p.status === 'approved' && (
                          <button onClick={() => paidMutation.mutate(p.id)} disabled={paidMutation.isPending}
                            className="px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Mark Paid</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!payrolls?.length && !payrollLoading && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No payrolls processed for {processForm.year} yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Add New Employee</h3>
              <button onClick={() => { setShowAdd(false); setEmpForm({ ...emptyEmp }) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                  <input value={empForm.firstName} onChange={e => setEmpForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name" className={inputCls} autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <input value={empForm.lastName} onChange={e => setEmpForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
                  <input value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@school.com" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Designation</label>
                  <input value={empForm.designation} onChange={e => setEmpForm(f => ({ ...f, designation: e.target.value }))}
                    placeholder="e.g. Science Teacher" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                  <select value={empForm.departmentId} onChange={e => setEmpForm(f => ({ ...f, departmentId: e.target.value }))} className={inputCls}>
                    <option value="">Select department</option>
                    {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Joining Date</label>
                  <input type="date" value={empForm.joiningDate} onChange={e => setEmpForm(f => ({ ...f, joiningDate: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Employment Type</label>
                  <select value={empForm.employmentType} onChange={e => setEmpForm(f => ({ ...f, employmentType: e.target.value }))} className={inputCls}>
                    {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                <select value={empForm.gender} onChange={e => setEmpForm(f => ({ ...f, gender: e.target.value }))} className={inputCls}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => { setShowAdd(false); setEmpForm({ ...emptyEmp }) }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                onClick={() => addMutation.mutate()}
                disabled={!canSubmitEmp || addMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Payroll Modal */}
      {showProcess && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">Process Payroll</h3>
              <button onClick={() => setShowProcess(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Month</label>
                <select value={processForm.month} onChange={e => setProcessForm(p => ({ ...p, month: Number(e.target.value) }))} className={inputCls}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
                <input type="number" value={processForm.year} onChange={e => setProcessForm(p => ({ ...p, year: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Working Days</label>
                <input type="number" value={processForm.workingDays} onChange={e => setProcessForm(p => ({ ...p, workingDays: Number(e.target.value) }))} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowProcess(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={() => processMutation.mutate()} disabled={processMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                {processMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Process
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
