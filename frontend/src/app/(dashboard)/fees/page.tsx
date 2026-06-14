'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feesApi, studentsApi } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { DollarSign, AlertCircle, CheckCircle2, Search, Loader2, X } from 'lucide-react'
import type { StudentFee } from '@/types'

const STATUS: Record<string, string> = {
  paid:    'badge badge-paid',
  partial: 'badge badge-partial',
  pending: 'badge badge-pending',
  overdue: 'badge badge-overdue',
}

export default function FeesPage() {
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [collectingFeeId, setCollectingFeeId]     = useState('')
  const [amount, setAmount]                         = useState('')
  const [method, setMethod]                         = useState('Cash')
  const qc = useQueryClient()

  const { data: students } = useQuery({
    queryKey: ['students-search', studentSearch],
    queryFn: () => studentsApi.list({ search: studentSearch, pageSize: 10 }).then(r => r.data),
    enabled: studentSearch.length > 2,
    staleTime: 30_000,
  })

  const { data: studentFees } = useQuery({
    queryKey: ['student-fees', selectedStudentId],
    queryFn: () => feesApi.getStudentFees(selectedStudentId).then(r => r.data),
    enabled: !!selectedStudentId,
  })

  const { data: dues, isLoading: duesLoading } = useQuery({
    queryKey: ['fees-dues'],
    queryFn: () => feesApi.getDues({ daysOverdue: 0 }).then(r => r.data),
  })

  const payMutation = useMutation({
    mutationFn: (feeId: string) =>
      feesApi.collectPayment({
        studentFeeId: feeId,
        amount: Number(amount),
        method,
        transactionId: null, chequeNumber: null, chequeDate: null, bankName: null, notes: null,
      }),
    onSuccess: (data) => {
      toast.success(`Payment recorded! Receipt: ${data.data.receiptNumber}`)
      setCollectingFeeId('')
      setAmount('')
      qc.invalidateQueries({ queryKey: ['student-fees', selectedStudentId] })
      qc.invalidateQueries({ queryKey: ['fees-dues'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Payment failed. Please try again.')
    },
  })

  const summary = studentFees?.summary
  const totalPending = dues?.reduce((s: number, d: any) => s + d.pending, 0) ?? 0

  const STATS = [
    { label: 'Students with dues',  value: dues?.length ?? 0,          icon: AlertCircle,  bg: 'var(--danger-bg)',  color: 'var(--danger)'  },
    { label: 'Total pending',        value: formatCurrency(totalPending), icon: DollarSign,   bg: 'var(--warning-bg)', color: 'var(--warning)' },
    { label: 'Today collected',      value: formatCurrency(0),           icon: CheckCircle2, bg: 'var(--success-bg)', color: 'var(--success)' },
  ]

  return (
    <div className="space-y-5 anim-fade-up">

      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
          Fees Management
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-3)' }}>
          Collect fees and track payment history
        </p>
      </div>

      {/* ── Summary stats ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: s.bg }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold leading-none truncate" style={{ color: 'var(--text-1)' }}>
                {s.value}
              </p>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Student fee lookup */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-[14px]" style={{ color: 'var(--text-1)' }}>Student Fee Details</h3>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: 'var(--text-4)' }} />
            <input
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="Search student by name or admission no…"
              className="input-base focus-ring"
              style={{ paddingLeft: '2.1rem' }}
            />
          </div>

          {/* Suggestions */}
          {students?.items && studentSearch.length > 2 && (
            <div className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
              {students.items.map((s: any) => (
                <button key={s.id}
                  onClick={() => { setSelectedStudentId(s.id); setStudentSearch('') }}
                  className="w-full text-left px-4 py-2.5 transition-colors hover:bg-[var(--brand-bg)]"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{s.fullName}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {s.admissionNumber} · {s.className} {s.sectionName}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Selected student fees */}
          {selectedStudentId && studentFees && (
            <div className="space-y-3">
              {/* Summary bar */}
              {summary && (
                <div className="grid grid-cols-3 gap-2 rounded-xl p-3"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {[
                    { label: 'Total',   value: summary.totalAmount,   color: 'var(--text-1)'  },
                    { label: 'Paid',    value: summary.paidAmount,    color: 'var(--success)' },
                    { label: 'Pending', value: summary.pendingAmount, color: 'var(--danger)'  },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <p className="text-[13px] font-bold" style={{ color: item.color }}>
                        {formatCurrency(item.value)}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-4)' }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Fee items */}
              <div className="space-y-2">
                {studentFees.fees?.map((fee: StudentFee) => (
                  <div key={fee.id} className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--border)' }}>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                            {fee.name}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{fee.category}</p>
                        </div>
                        <span className={cn(STATUS[fee.status?.toLowerCase()] ?? 'badge badge-draft')}>
                          {fee.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[13px]" style={{ color: 'var(--text-3)' }}>
                          Due: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(fee.pending)}</strong>
                        </span>
                        {fee.pending > 0 && (
                          <button
                            onClick={() => setCollectingFeeId(collectingFeeId === fee.id ? '' : fee.id)}
                            className={cn('btn gap-1', collectingFeeId === fee.id ? 'btn-ghost' : 'btn-primary')}
                            style={{ fontSize: '11px', padding: '0.3rem 0.75rem' }}
                          >
                            {collectingFeeId === fee.id ? <><X className="w-3 h-3" />Cancel</> : 'Collect'}
                          </button>
                        )}
                      </div>
                    </div>

                    {collectingFeeId === fee.id && (
                      <div className="px-4 py-3 space-y-2.5"
                        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder={`Max: ${fee.pending}`}
                            max={fee.pending}
                            className="input-base focus-ring flex-1"
                            style={{ fontSize: '13px', padding: '0.4rem 0.6rem' }}
                          />
                          <select
                            value={method}
                            onChange={e => setMethod(e.target.value)}
                            className="input-base focus-ring"
                            style={{ width: 'auto', fontSize: '13px', padding: '0.4rem 0.6rem' }}
                          >
                            {['Cash', 'Online', 'UPI', 'Card', 'Cheque'].map(m => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => payMutation.mutate(fee.id)}
                          disabled={!amount || payMutation.isPending}
                          className="btn w-full gap-2"
                          style={{
                            background: 'var(--success)', color: '#fff',
                            fontSize: '13px', padding: '0.5rem',
                            opacity: (!amount || payMutation.isPending) ? 0.6 : 1,
                          }}
                        >
                          {payMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {payMutation.isPending ? 'Processing…' : 'Confirm Payment'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!selectedStudentId && studentSearch.length <= 2 && (
            <div className="flex flex-col items-center py-10 gap-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <Search className="w-5 h-5" style={{ color: 'var(--text-4)' }} />
              </div>
              <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
                Search for a student to view their fees
              </p>
            </div>
          )}
        </div>

        {/* Fee dues list */}
        <div className="card overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <h3 className="font-bold text-[14px]" style={{ color: 'var(--text-1)' }}>Fee Dues</h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
              {dues?.length ?? 0} students with pending dues
            </p>
          </div>

          <div className="overflow-y-auto flex-1" style={{ maxHeight: '420px' }}>
            {duesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-4)' }} />
              </div>
            ) : dues?.length ? (
              dues.map((due: any, i: number) => (
                <button
                  key={i}
                  className="w-full text-left px-5 py-3.5 flex items-center justify-between transition-colors hover:bg-[var(--brand-bg)]"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onClick={() => setSelectedStudentId(due.studentId ?? '')}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                      {due.studentName}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {due.admissionNumber}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
                      {formatCurrency(due.pending)}
                    </p>
                    <span className={cn(STATUS[due.status?.toLowerCase()] ?? 'badge badge-draft', 'mt-1')}>
                      {due.status}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center py-16 gap-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--success-bg)', border: '1px solid #bbf7d0' }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--success)' }} />
                </div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No pending dues</p>
                <p className="text-[11px]" style={{ color: 'var(--text-4)' }}>All students are up to date</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
