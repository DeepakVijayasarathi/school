'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feesApi, studentsApi } from '@/lib/api'
import { formatCurrency, formatDate, statusColor, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { DollarSign, AlertCircle, CheckCircle, Search, Loader2 } from 'lucide-react'
import type { StudentFee } from '@/types'

export default function FeesPage() {
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [collectingFeeId, setCollectingFeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const qc = useQueryClient()

  const { data: students } = useQuery({
    queryKey: ['students-search', studentSearch],
    queryFn: () => studentsApi.list({ search: studentSearch, pageSize: 10 }).then((r) => r.data),
    enabled: studentSearch.length > 2,
  })

  const { data: studentFees } = useQuery({
    queryKey: ['student-fees', selectedStudentId],
    queryFn: () => feesApi.getStudentFees(selectedStudentId).then((r) => r.data),
    enabled: !!selectedStudentId,
  })

  const { data: dues, isLoading: duesLoading } = useQuery({
    queryKey: ['fees-dues'],
    queryFn: () => feesApi.getDues({ daysOverdue: 0 }).then((r) => r.data),
  })

  const payMutation = useMutation({
    mutationFn: (feeId: string) =>
      feesApi.collectPayment({
        studentFeeId: feeId,
        amount: Number(amount),
        method,
        transactionId: null,
        chequeNumber: null,
        chequeDate: null,
        bankName: null,
        notes: null,
      }),
    onSuccess: (data) => {
      toast.success(`Payment recorded! Receipt: ${data.data.receiptNumber}`)
      setCollectingFeeId('')
      setAmount('')
      qc.invalidateQueries({ queryKey: ['student-fees', selectedStudentId] })
      qc.invalidateQueries({ queryKey: ['fees-dues'] })
    },
  })

  const summary = studentFees?.summary

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fees Management</h1>
        <p className="text-gray-500 text-sm">Collect fees and view payment history</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Students with dues', value: dues?.length ?? 0, icon: AlertCircle, color: 'text-red-500 bg-red-50' },
          { label: 'Total pending', value: formatCurrency(dues?.reduce((s: number, d: any) => s + d.pending, 0) ?? 0), icon: DollarSign, color: 'text-orange-500 bg-orange-50' },
          { label: 'Today collected', value: formatCurrency(0), icon: CheckCircle, color: 'text-green-500 bg-green-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`${s.color} p-3 rounded-xl`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student fee lookup */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Student Fee Details</h3>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search student by name or admission no..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {students?.items && studentSearch.length > 2 && (
            <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
              {students.items.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedStudentId(s.id); setStudentSearch('') }}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition"
                >
                  <p className="text-sm font-medium">{s.fullName}</p>
                  <p className="text-xs text-gray-400">{s.admissionNumber} · {s.className} {s.sectionName}</p>
                </button>
              ))}
            </div>
          )}

          {selectedStudentId && studentFees && (
            <div className="space-y-3">
              {summary && (
                <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-lg p-3">
                  <div className="text-center">
                    <p className="text-sm font-bold">{formatCurrency(summary.totalAmount)}</p>
                    <p className="text-xs text-gray-400">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-green-600">{formatCurrency(summary.paidAmount)}</p>
                    <p className="text-xs text-gray-400">Paid</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-red-600">{formatCurrency(summary.pendingAmount)}</p>
                    <p className="text-xs text-gray-400">Pending</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {studentFees.fees?.map((fee: StudentFee) => (
                  <div key={fee.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{fee.name}</p>
                        <p className="text-xs text-gray-400">{fee.category}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium capitalize', statusColor(fee.status))}>
                        {fee.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-gray-400">Due: </span>
                        <span className="font-medium text-red-600">{formatCurrency(fee.pending)}</span>
                      </div>
                      {fee.pending > 0 && (
                        <button
                          onClick={() => setCollectingFeeId(collectingFeeId === fee.id ? '' : fee.id)}
                          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Collect
                        </button>
                      )}
                    </div>

                    {collectingFeeId === fee.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={`Max: ${fee.pending}`}
                            max={fee.pending}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none"
                          >
                            {['Cash', 'Online', 'UPI', 'Card', 'Cheque'].map((m) => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => payMutation.mutate(fee.id)}
                          disabled={!amount || payMutation.isPending}
                          className="w-full py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-60"
                        >
                          {payMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fee dues list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Fee Dues</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {duesLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : dues?.map((due: any, i: number) => (
              <div
                key={i}
                className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedStudentId(due.studentId ?? '')}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{due.studentName}</p>
                  <p className="text-xs text-gray-400">{due.admissionNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{formatCurrency(due.pending)}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColor(due.status))}>
                    {due.status}
                  </span>
                </div>
              </div>
            ))}
            {!duesLoading && !dues?.length && (
              <div className="px-5 py-12 text-center text-gray-400 text-sm">No pending dues</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
