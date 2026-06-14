'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, X, TrendingUp, TrendingDown, DollarSign, Building2, Loader2, BookOpen } from 'lucide-react'

export default function AccountingPage() {
  const [tab, setTab] = useState('overview')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
        <p className="text-gray-500 text-sm">Double-entry bookkeeping, ledgers, and financial reports</p>
      </div>

      <div className="flex gap-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'vouchers', label: 'Vouchers' },
          { key: 'ledgers', label: 'Ledgers' },
          { key: 'trial-balance', label: 'Trial Balance' },
          { key: 'profit-loss', label: 'P&L' },
          { key: 'balance-sheet', label: 'Balance Sheet' },
          { key: 'cash-book', label: 'Cash Book' },
          { key: 'day-book', label: 'Day Book' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
              tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'vouchers' && <VouchersTab />}
      {tab === 'ledgers' && <LedgersTab />}
      {tab === 'trial-balance' && <TrialBalanceTab />}
      {tab === 'profit-loss' && <ProfitLossTab />}
      {tab === 'balance-sheet' && <BalanceSheetTab />}
      {tab === 'cash-book' && <CashBookTab />}
      {tab === 'day-book' && <DayBookTab />}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">₹{Number(value ?? 0).toLocaleString()}</p>
    </div>
  )
}

function OverviewTab() {
  const { data: pl } = useQuery({
    queryKey: ['pl-overview'],
    queryFn: () => accountingApi.getProfitLoss().then(r => r.data),
  })
  const { data: cashBook } = useQuery({
    queryKey: ['cash-book-overview'],
    queryFn: () => accountingApi.getCashBook().then(r => r.data),
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Cash Balance" value={cashBook?.closingBalance} icon={DollarSign} color="bg-green-500" />
        <StatCard label="Total Income" value={pl?.totalIncome} icon={TrendingUp} color="bg-blue-500" />
        <StatCard label="Total Expense" value={pl?.totalExpense} icon={TrendingDown} color="bg-red-500" />
        <StatCard label="Net Profit" value={pl?.netProfit} icon={Building2} color="bg-purple-500" />
      </div>

      {pl?.pl && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Income Groups</h3>
            {pl.pl.filter((p: any) => p.nature === 'income').map((g: any) => (
              <div key={g.groupName} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{g.groupName}</span>
                <span className="font-medium text-green-700">₹{g.total?.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Expense Groups</h3>
            {pl.pl.filter((p: any) => p.nature === 'expense').map((g: any) => (
              <div key={g.groupName} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{g.groupName}</span>
                <span className="font-medium text-red-700">₹{g.total?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function VouchersTab() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [voucherType, setVoucherType] = useState('payment')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [narration, setNarration] = useState('')
  const [entries, setEntries] = useState([
    { ledgerId: '', entryType: 'debit', amount: '', narration: '' },
    { ledgerId: '', entryType: 'credit', amount: '', narration: '' },
  ])

  const { data, isLoading } = useQuery({
    queryKey: ['vouchers', typeFilter, page],
    queryFn: () => accountingApi.getVouchers({ page, pageSize: 20, type: typeFilter || undefined }).then(r => r.data),
  })

  const { data: ledgersData } = useQuery({
    queryKey: ['ledgers-list'],
    queryFn: () => accountingApi.getLedgers().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => accountingApi.createVoucher(payload),
    onSuccess: () => {
      toast.success('Voucher created')
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      setShowCreate(false)
      setNarration('')
      setEntries([
        { ledgerId: '', entryType: 'debit', amount: '', narration: '' },
        { ledgerId: '', entryType: 'credit', amount: '', narration: '' },
      ])
    },
    onError: () => toast.error('Failed to create voucher'),
  })

  const postMutation = useMutation({
    mutationFn: (id: string) => accountingApi.postVoucher(id),
    onSuccess: () => {
      toast.success('Voucher posted')
      qc.invalidateQueries({ queryKey: ['vouchers'] })
    },
    onError: () => toast.error('Failed to post voucher'),
  })

  const totalDebit = entries.filter(e => e.entryType === 'debit').reduce((s, e) => s + (+e.amount || 0), 0)
  const totalCredit = entries.filter(e => e.entryType === 'credit').reduce((s, e) => s + (+e.amount || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const addEntry = () => setEntries(p => [...p, { ledgerId: '', entryType: 'credit', amount: '', narration: '' }])
  const removeEntry = (i: number) => setEntries(p => p.filter((_, idx) => idx !== i))
  const updateEntry = (i: number, field: string, value: string) =>
    setEntries(p => p.map((e, idx) => idx === i ? { ...e, [field]: value } : e))

  const handleCreate = () => {
    if (!isBalanced) return
    createMutation.mutate({ voucherType, date, narration, entries: entries.map(e => ({ ...e, amount: parseFloat(e.amount) })) })
  }

  const ledgers = (ledgersData as any[]) ?? []
  const items = (data as any)?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {['', 'payment', 'receipt', 'journal', 'contra'].map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(1) }}
              className={cn('px-3 py-1.5 text-sm border rounded-xl capitalize transition-colors',
                typeFilter === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50')}>
              {t || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200">
          <Plus className="w-4 h-4" /> New Voucher
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                {['Voucher No', 'Type', 'Date', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="skeleton h-3 w-20 rounded" /></td>
                      ))}
                    </tr>
                  ))
                : items.map((v: any) => (
                    <tr key={v.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{v.voucherNumber}</td>
                      <td className="px-4 py-3 text-sm capitalize text-gray-600">{v.voucherType}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(v.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{v.totalAmount?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2.5 py-1 rounded-full capitalize font-semibold',
                          v.isPosted ? 'bg-green-100 text-green-700' :
                          v.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>
                          {v.isPosted ? 'Posted' : v.status ?? 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-3">
                        {!v.isPosted && v.status !== 'cancelled' && (
                          <button onClick={() => postMutation.mutate(v.id)}
                            disabled={postMutation.isPending}
                            className="text-xs text-blue-600 hover:underline font-medium">Post</button>
                        )}
                      </td>
                    </tr>
                  ))
              }
              {!isLoading && !items.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No vouchers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Voucher Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-semibold text-gray-900">Create Voucher</h3>
              <button onClick={() => { setShowCreate(false); setNarration(''); setVoucherType('payment'); setDate(new Date().toISOString().split('T')[0]); setEntries([{ ledgerId: '', entryType: 'debit', amount: '', narration: '' }, { ledgerId: '', entryType: 'credit', amount: '', narration: '' }]) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select value={voucherType} onChange={e => setVoucherType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30">
                    {['payment', 'receipt', 'journal', 'contra'].map(t => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Narration</label>
                  <input value={narration} onChange={e => setNarration(e.target.value)}
                    placeholder="Description" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <div className="bg-gray-50/70 grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-5">Ledger</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-3">Amount</div>
                  <div className="col-span-2" />
                </div>
                {entries.map((entry, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2 border-t border-gray-50">
                    <div className="col-span-5">
                      <select value={entry.ledgerId} onChange={e => updateEntry(i, 'ledgerId', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm">
                        <option value="">Select Ledger</option>
                        {ledgers.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <select value={entry.entryType} onChange={e => updateEntry(i, 'entryType', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm">
                        <option value="debit">Debit</option>
                        <option value="credit">Credit</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input type="number" value={entry.amount} onChange={e => updateEntry(i, 'amount', e.target.value)}
                        placeholder="0.00" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right" />
                    </div>
                    <div className="col-span-2 flex items-center justify-end">
                      {entries.length > 2 && (
                        <button onClick={() => removeEntry(i)} className="text-red-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
                  <button onClick={addEntry} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Line
                  </button>
                  <div className="flex gap-6 text-sm">
                    <span className={cn('font-medium', isBalanced ? 'text-green-600' : 'text-gray-600')}>Dr: ₹{totalDebit.toLocaleString()}</span>
                    <span className={cn('font-medium', isBalanced ? 'text-green-600' : 'text-gray-600')}>Cr: ₹{totalCredit.toLocaleString()}</span>
                    {!isBalanced && <span className="text-red-500 text-xs font-semibold">NOT BALANCED</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => { setShowCreate(false); setNarration(''); setVoucherType('payment'); setDate(new Date().toISOString().split('T')[0]); setEntries([{ ledgerId: '', entryType: 'debit', amount: '', narration: '' }, { ledgerId: '', entryType: 'credit', amount: '', narration: '' }]) }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={handleCreate} disabled={!isBalanced || createMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:bg-blue-700">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LedgersTab() {
  const { data: groupsData } = useQuery({ queryKey: ['account-groups'], queryFn: () => accountingApi.getGroups().then(r => r.data) })
  const { data: ledgersData, isLoading } = useQuery({ queryKey: ['ledgers-list'], queryFn: () => accountingApi.getLedgers().then(r => r.data) })
  const [selectedGroupId, setSelectedGroupId] = useState('')

  const groups = (groupsData as any[]) ?? []
  const ledgers = (ledgersData as any[]) ?? []
  const filtered = selectedGroupId ? ledgers.filter((l: any) => l.accountGroupId === selectedGroupId) : ledgers

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSelectedGroupId('')}
          className={cn('px-3 py-1.5 text-sm border rounded-xl transition-colors', !selectedGroupId ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50')}>
          All
        </button>
        {groups.map((g: any) => (
          <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
            className={cn('px-3 py-1.5 text-sm border rounded-xl capitalize transition-colors', selectedGroupId === g.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50')}>
            {g.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                {['Ledger Name', 'Code', 'Group', 'Nature', 'Opening Balance', 'Type'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-3 w-20 rounded" /></td>
                    ))}</tr>
                  ))
                : filtered.map((l: any) => (
                    <tr key={l.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{l.name}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{l.code ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{l.groupName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2.5 py-1 rounded-full capitalize font-semibold',
                          l.nature === 'assets' ? 'bg-blue-100 text-blue-700' :
                          l.nature === 'income' ? 'bg-green-100 text-green-700' :
                          l.nature === 'expense' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700')}>
                          {l.nature}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">₹{l.openingBalance?.toLocaleString() ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{l.openingBalanceType ?? '—'}</td>
                    </tr>
                  ))
              }
              {!isLoading && !filtered.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No ledgers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TrialBalanceTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['trial-balance'],
    queryFn: () => accountingApi.getTrialBalance().then(r => r.data),
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Trial Balance</h3>
        {data && (
          <span className={cn('text-sm font-semibold px-3 py-1 rounded-full',
            data.isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
            {data.isBalanced ? 'Balanced ✓' : 'Not Balanced ✗'}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                {['Ledger', 'Group', 'Nature', 'Debit', 'Credit', 'Net Balance'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data?.rows as any[])?.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{r.ledgerName}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">{r.groupName}</td>
                  <td className="px-4 py-2.5 text-xs capitalize text-gray-400">{r.nature}</td>
                  <td className="px-4 py-2.5 text-sm text-blue-600 font-medium">₹{r.totalDebit?.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-sm text-orange-600 font-medium">₹{r.totalCredit?.toLocaleString()}</td>
                  <td className={cn('px-4 py-2.5 text-sm font-semibold', r.netBalance >= 0 ? 'text-green-700' : 'text-red-700')}>
                    ₹{Math.abs(r.netBalance)?.toLocaleString()} {r.netBalance < 0 ? '(Cr)' : '(Dr)'}
                  </td>
                </tr>
              ))}
            </tbody>
            {data && (
              <tfoot className="bg-gray-50/70 border-t border-gray-100 font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm text-gray-700">Total</td>
                  <td className="px-4 py-3 text-sm text-blue-700">₹{data.grandDebit?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-orange-700">₹{data.grandCredit?.toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}

function ProfitLossTab() {
  const { data, isLoading } = useQuery({ queryKey: ['profit-loss'], queryFn: () => accountingApi.getProfitLoss().then(r => r.data) })

  if (isLoading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <p className="text-sm text-green-600 font-medium">Total Income</p>
            <p className="text-2xl font-bold text-green-700">₹{data.totalIncome?.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 text-center">
            <p className="text-sm text-red-600 font-medium">Total Expense</p>
            <p className="text-2xl font-bold text-red-700">₹{data.totalExpense?.toLocaleString()}</p>
          </div>
          <div className={cn('rounded-2xl p-4 text-center', (data.netProfit ?? 0) >= 0 ? 'bg-blue-50' : 'bg-orange-50')}>
            <p className={cn('text-sm font-medium', (data.netProfit ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600')}>
              Net {(data.netProfit ?? 0) >= 0 ? 'Profit' : 'Loss'}
            </p>
            <p className={cn('text-2xl font-bold', (data.netProfit ?? 0) >= 0 ? 'text-blue-700' : 'text-orange-700')}>
              ₹{Math.abs(data.netProfit ?? 0)?.toLocaleString()}
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['income', 'expense'].map(nature => (
          <div key={nature} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70">
              <h3 className="font-semibold text-gray-900 capitalize">{nature}</h3>
            </div>
            {data?.pl?.filter((p: any) => p.nature === nature).map((g: any) => (
              <div key={g.groupName}>
                <div className={cn('px-4 py-2 flex justify-between text-sm font-semibold',
                  nature === 'income' ? 'text-green-700 bg-green-50/30' : 'text-red-700 bg-red-50/30')}>
                  <span>{g.groupName}</span>
                  <span>₹{g.total?.toLocaleString()}</span>
                </div>
                {g.items?.map((item: any) => (
                  <div key={item.ledgerName} className="px-8 py-1 flex justify-between text-xs text-gray-600 border-t border-gray-50">
                    <span>{item.ledgerName}</span>
                    <span>₹{item.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function BalanceSheetTab() {
  const { data, isLoading } = useQuery({ queryKey: ['balance-sheet'], queryFn: () => accountingApi.getBalanceSheet().then(r => r.data) })

  if (isLoading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {['assets', 'liabilities', 'capital'].map(nature => (
        <div key={nature} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 capitalize">{nature}</h3>
          </div>
          {data?.sheet?.filter((s: any) => s.nature === nature).map((g: any) => (
            <div key={g.groupName}>
              <div className="px-4 py-2 flex justify-between text-sm font-semibold text-gray-800 bg-gray-50/50">
                <span>{g.groupName}</span>
                <span>₹{g.total?.toLocaleString()}</span>
              </div>
              {g.items?.map((item: any) => (
                <div key={item.ledgerName} className="px-8 py-1.5 flex justify-between text-xs text-gray-600 border-t border-gray-50">
                  <span>{item.ledgerName}</span>
                  <span>₹{item.balance?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function CashBookTab() {
  const { data, isLoading } = useQuery({ queryKey: ['cash-book'], queryFn: () => accountingApi.getCashBook().then(r => r.data) })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">{(data as any)?.ledger?.name ?? 'Cash Book'}</h3>
        <span className="text-sm font-semibold text-gray-700">Balance: ₹{(data as any)?.closingBalance?.toLocaleString() ?? 0}</span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                {['Date', 'Voucher', 'Type', 'Narration', 'Debit', 'Credit', 'Balance'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data as any)?.rows?.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-4 py-2.5 text-sm text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{r.voucherNumber}</td>
                  <td className="px-4 py-2.5 text-xs capitalize text-gray-500">{r.voucherType}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 max-w-[200px] truncate" title={r.narration}>{r.narration}</td>
                  <td className="px-4 py-2.5 text-sm text-blue-600 font-medium">{r.debit > 0 ? `₹${r.debit.toLocaleString()}` : ''}</td>
                  <td className="px-4 py-2.5 text-sm text-orange-600 font-medium">{r.credit > 0 ? `₹${r.credit.toLocaleString()}` : ''}</td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">₹{r.balance?.toLocaleString()}</td>
                </tr>
              ))}
              {!(data as any)?.rows?.length && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No cash book entries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DayBookTab() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const { data, isLoading } = useQuery({
    queryKey: ['day-book', date],
    queryFn: () => accountingApi.getDayBook({ date }).then(r => r.data),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" />
        {!isLoading && (
          <span className="text-sm text-gray-500">
            {(data as any)?.totalVouchers ?? 0} vouchers · ₹{(data as any)?.totalAmount?.toLocaleString() ?? 0}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-3">
          {(data as any)?.vouchers?.map((v: any) => (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-500">{v.voucherNumber}</span>
                  <span className="text-xs capitalize bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{v.voucherType}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">₹{v.totalAmount?.toLocaleString()}</span>
              </div>
              {v.narration && <p className="text-sm text-gray-500 mb-2">{v.narration}</p>}
              <div className="space-y-1">
                {v.entries?.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs text-gray-600">
                    <span className={cn('font-medium', e.entryType === 'debit' ? 'text-blue-600' : 'text-orange-600')}>
                      {e.ledgerName}
                    </span>
                    <span>{e.entryType === 'debit' ? 'Dr' : 'Cr'} ₹{e.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!(data as any)?.vouchers?.length && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No vouchers for this date</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
