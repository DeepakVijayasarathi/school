'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrApi } from '@/lib/api'
import { formatDate, formatCurrency, statusColor, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Users, DollarSign, CheckCircle, Clock, Loader2 } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function HRPage() {
  const [tab, setTab] = useState<'employees' | 'payroll'>('employees')
  const [search, setSearch] = useState('')
  const [processForm, setProcessForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), workingDays: 26 })
  const [showProcess, setShowProcess] = useState(false)
  const qc = useQueryClient()

  const { data: employees, isLoading: empLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: () => hrApi.getEmployees({ search: search || undefined, pageSize: 50 }).then(r => r.data),
  })

  const { data: payrolls, isLoading: payrollLoading } = useQuery({
    queryKey: ['payrolls', processForm.year],
    queryFn: () => hrApi.getPayrolls(processForm.year).then(r => r.data),
    enabled: tab === 'payroll',
  })

  const processMutation = useMutation({
    mutationFn: () => hrApi.processPayroll({ month: processForm.month, year: processForm.year, workingDays: processForm.workingDays }),
    onSuccess: (data) => {
      toast.success(`Payroll processed for ${MONTHS[processForm.month - 1]} ${processForm.year}. Net: ${formatCurrency(data.data.totalNet)}`)
      setShowProcess(false)
      qc.invalidateQueries({ queryKey: ['payrolls'] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrApi.approvePayroll(id),
    onSuccess: () => { toast.success('Payroll approved'); qc.invalidateQueries({ queryKey: ['payrolls'] }) },
  })

  const paidMutation = useMutation({
    mutationFn: (id: string) => hrApi.markPaid(id),
    onSuccess: () => { toast.success('Payroll marked as paid'); qc.invalidateQueries({ queryKey: ['payrolls'] }) },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR & Payroll</h1>
          <p className="text-gray-500 text-sm">Manage employees and salary processing</p>
        </div>
        {tab === 'employees' && (
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
        {tab === 'payroll' && (
          <button
            onClick={() => setShowProcess(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <DollarSign className="w-4 h-4" /> Process Payroll
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['employees', 'payroll'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-md text-sm font-medium capitalize transition',
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'employees' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or employee code..."
              className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {empLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Employee', 'Code', 'Designation', 'Department', 'Joining Date', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees?.items?.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-sm">
                          {emp.fullName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{emp.fullName}</p>
                          <p className="text-xs text-gray-400">{emp.email ?? emp.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{emp.employeeCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.designation ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.department ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(emp.joiningDate)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium capitalize', statusColor(emp.status))}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!employees?.items?.length && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No employees found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'payroll' && (
        <div className="space-y-4">
          {/* Year selector */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500">Year:</span>
            {[new Date().getFullYear() - 1, new Date().getFullYear()].map(y => (
              <button
                key={y}
                onClick={() => setProcessForm(p => ({ ...p, year: y }))}
                className={cn('px-3 py-1.5 rounded-lg text-sm border',
                  processForm.year === y ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Payroll table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Month', 'Gross', 'Deductions', 'Net', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
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
                        <button
                          onClick={() => approveMutation.mutate(p.id)}
                          disabled={approveMutation.isPending}
                          className="px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                          Approve
                        </button>
                      )}
                      {p.status === 'approved' && (
                        <button
                          onClick={() => paidMutation.mutate(p.id)}
                          disabled={paidMutation.isPending}
                          className="px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!payrolls?.length && !payrollLoading && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No payrolls processed yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process payroll modal */}
      {showProcess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Process Payroll</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Month</label>
                <select
                  value={processForm.month}
                  onChange={e => setProcessForm(p => ({ ...p, month: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Year</label>
                <input
                  type="number"
                  value={processForm.year}
                  onChange={e => setProcessForm(p => ({ ...p, year: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Working Days</label>
                <input
                  type="number"
                  value={processForm.workingDays}
                  onChange={e => setProcessForm(p => ({ ...p, workingDays: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowProcess(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => processMutation.mutate()}
                disabled={processMutation.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
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
