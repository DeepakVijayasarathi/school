'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, X, TrendingUp, TrendingDown, DollarSign, Building2, Loader2, BookOpen } from 'lucide-react'

export default function AccountingPage() {
  const [tab, setTab] = useState('overview')

  return (
    <div className="space-y-5 anim-fade-up">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Accounting</h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Double-entry bookkeeping, ledgers, and financial reports</p>
      </div>

      <div className="card flex gap-1 p-1.5 overflow-x-auto">
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
            className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors"
            style={tab === t.key
              ? { background: 'var(--brand)', color: '#fff' }
              : { color: 'var(--text-3)' }}
            onMouseEnter={e => { if (tab !== t.key) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { if (tab !== t.key) (e.currentTarget as HTMLButtonElement).style.background = '' }}>
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

function StatCard({ label, value, icon: Icon, bg, iconColor }: { label: string; value: any; icon: any; bg: string; iconColor: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>₹{Number(value ?? 0).toLocaleString()}</p>
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
        <StatCard label="Cash Balance" value={cashBook?.closingBalance} icon={DollarSign} bg="var(--success-bg)" iconColor="var(--success)" />
        <StatCard label="Total Income" value={pl?.totalIncome} icon={TrendingUp} bg="var(--brand-bg)" iconColor="var(--brand)" />
        <StatCard label="Total Expense" value={pl?.totalExpense} icon={TrendingDown} bg="var(--danger-bg)" iconColor="var(--danger)" />
        <StatCard label="Net Profit" value={pl?.netProfit} icon={Building2} bg="var(--surface-2)" iconColor="var(--text-2)" />
      </div>

      {pl?.pl && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-1)' }}>Income Groups</h3>
            {pl.pl.filter((p: any) => p.nature === 'income').map((g: any) => (
              <div key={g.groupName} className="flex justify-between text-sm py-1.5"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-2)' }}>{g.groupName}</span>
                <span className="font-medium" style={{ color: 'var(--success)' }}>₹{g.total?.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-1)' }}>Expense Groups</h3>
            {pl.pl.filter((p: any) => p.nature === 'expense').map((g: any) => (
              <div key={g.groupName} className="flex justify-between text-sm py-1.5"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-2)' }}>{g.groupName}</span>
                <span className="font-medium" style={{ color: 'var(--danger)' }}>₹{g.total?.toLocaleString()}</span>
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

  const resetForm = () => {
    setNarration('')
    setVoucherType('payment')
    setDate(new Date().toISOString().split('T')[0])
    setEntries([
      { ledgerId: '', entryType: 'debit', amount: '', narration: '' },
      { ledgerId: '', entryType: 'credit', amount: '', narration: '' },
    ])
  }

  const createMutation = useMutation({
    mutationFn: (payload: any) => accountingApi.createVoucher(payload),
    onSuccess: () => {
      toast.success('Voucher created')
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      setShowCreate(false)
      resetForm()
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
              className="px-3 py-1.5 text-sm rounded-xl capitalize transition-colors"
              style={typeFilter === t
                ? { border: '1px solid var(--brand)', background: 'var(--brand-bg)', color: 'var(--brand)' }
                : { border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              {t || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Voucher
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                {['Voucher No', 'Type', 'Date', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="table-cell"><div className="skeleton h-3 w-20 rounded" /></td>
                      ))}
                    </tr>
                  ))
                : items.map((v: any) => (
                    <tr key={v.id} className="table-row-hover">
                      <td className="table-cell font-mono text-sm" style={{ color: 'var(--text-2)' }}>{v.voucherNumber}</td>
                      <td className="table-cell text-sm capitalize" style={{ color: 'var(--text-3)' }}>{v.voucherType}</td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-3)' }}>{new Date(v.date).toLocaleDateString()}</td>
                      <td className="table-cell text-sm font-semibold" style={{ color: 'var(--text-1)' }}>₹{v.totalAmount?.toLocaleString()}</td>
                      <td className="table-cell">
                        <span className={cn(
                          v.isPosted ? 'badge-active' :
                          v.status === 'cancelled' ? 'badge-inactive' : 'badge-draft')}>
                          {v.isPosted ? 'Posted' : v.status ?? 'Draft'}
                        </span>
                      </td>
                      <td className="table-cell flex gap-3">
                        {!v.isPosted && v.status !== 'cancelled' && (
                          <button onClick={() => postMutation.mutate(v.id)}
                            disabled={postMutation.isPending}
                            className="btn btn-ghost text-xs">Post</button>
                        )}
                      </td>
                    </tr>
                  ))
              }
              {!isLoading && !items.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <BookOpen className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--border)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-4)' }}>No vouchers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Voucher Modal */}
      {showCreate && (
        <VoucherModal
          voucherType={voucherType}
          date={date}
          narration={narration}
          entries={entries}
          ledgers={ledgers}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          isBalanced={isBalanced}
          isPending={createMutation.isPending}
          onClose={() => { setShowCreate(false); resetForm() }}
          onSetVoucherType={setVoucherType}
          onSetDate={setDate}
          onSetNarration={setNarration}
          onAddEntry={addEntry}
          onRemoveEntry={removeEntry}
          onUpdateEntry={updateEntry}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

function VoucherModal({
  voucherType, date, narration, entries, ledgers,
  totalDebit, totalCredit, isBalanced, isPending,
  onClose, onSetVoucherType, onSetDate, onSetNarration,
  onAddEntry, onRemoveEntry, onUpdateEntry, onSubmit,
}: any) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,.3)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Create Voucher</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{ color: 'var(--text-4)', border: '1px solid var(--border)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Type</label>
              <select value={voucherType} onChange={e => onSetVoucherType(e.target.value)}
                className="input-base focus-ring w-full mt-1">
                {['payment', 'receipt', 'journal', 'contra'].map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Date</label>
              <input type="date" value={date} onChange={e => onSetDate(e.target.value)}
                className="input-base focus-ring w-full mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Narration</label>
              <input value={narration} onChange={e => onSetNarration(e.target.value)}
                placeholder="Description" className="input-base focus-ring w-full mt-1" />
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
              style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
              <div className="col-span-5">Ledger</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Amount</div>
              <div className="col-span-2" />
            </div>
            {entries.map((entry: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2"
                style={{ borderTop: '1px solid var(--border)' }}>
                <div className="col-span-5">
                  <select value={entry.ledgerId} onChange={e => onUpdateEntry(i, 'ledgerId', e.target.value)}
                    className="input-base focus-ring w-full">
                    <option value="">Select Ledger</option>
                    {ledgers.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <select value={entry.entryType} onChange={e => onUpdateEntry(i, 'entryType', e.target.value)}
                    className="input-base focus-ring w-full">
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <input type="number" value={entry.amount} onChange={e => onUpdateEntry(i, 'amount', e.target.value)}
                    placeholder="0.00" className="input-base focus-ring w-full text-right" />
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  {entries.length > 2 && (
                    <button onClick={() => onRemoveEntry(i)} style={{ color: 'var(--danger)' }}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="px-4 py-2.5 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={onAddEntry} className="btn btn-ghost text-sm flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Line
              </button>
              <div className="flex gap-6 text-sm">
                <span className="font-medium" style={{ color: isBalanced ? 'var(--success)' : 'var(--text-3)' }}>Dr: ₹{totalDebit.toLocaleString()}</span>
                <span className="font-medium" style={{ color: isBalanced ? 'var(--success)' : 'var(--text-3)' }}>Cr: ₹{totalCredit.toLocaleString()}</span>
                {!isBalanced && <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>NOT BALANCED</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={onSubmit} disabled={!isBalanced || isPending}
            className="btn btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Voucher
          </button>
        </div>
      </div>
    </div>,
    document.body
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
          className="px-3 py-1.5 text-sm rounded-xl transition-colors"
          style={!selectedGroupId
            ? { border: '1px solid var(--brand)', background: 'var(--brand-bg)', color: 'var(--brand)' }
            : { border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          All
        </button>
        {groups.map((g: any) => (
          <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
            className="px-3 py-1.5 text-sm rounded-xl capitalize transition-colors"
            style={selectedGroupId === g.id
              ? { border: '1px solid var(--brand)', background: 'var(--brand-bg)', color: 'var(--brand)' }
              : { border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            {g.name}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                {['Ledger Name', 'Code', 'Group', 'Nature', 'Opening Balance', 'Type'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="skeleton h-3 w-20 rounded" /></td>
                    ))}</tr>
                  ))
                : filtered.map((l: any) => (
                    <tr key={l.id} className="table-row-hover">
                      <td className="table-cell text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{l.name}</td>
                      <td className="table-cell text-xs font-mono" style={{ color: 'var(--text-3)' }}>{l.code ?? '—'}</td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{l.groupName ?? '—'}</td>
                      <td className="table-cell">
                        <span className={cn('text-xs px-2.5 py-1 rounded-full capitalize font-semibold',
                          l.nature === 'assets' ? 'badge-pending' :
                          l.nature === 'income' ? 'badge-active' :
                          l.nature === 'expense' ? 'badge-inactive' : 'badge-draft')}>
                          {l.nature}
                        </span>
                      </td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>₹{l.openingBalance?.toLocaleString() ?? 0}</td>
                      <td className="table-cell text-xs" style={{ color: 'var(--text-4)' }}>{l.openingBalanceType ?? '—'}</td>
                    </tr>
                  ))
              }
              {!isLoading && !filtered.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-4)' }}>No ledgers found</td></tr>
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
    <div className="card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Trial Balance</h3>
        {data && (
          <span className={cn('text-sm font-semibold px-3 py-1 rounded-full',
            data.isBalanced ? 'badge-active' : 'badge-inactive')}>
            {data.isBalanced ? 'Balanced ✓' : 'Not Balanced ✗'}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                {['Ledger', 'Group', 'Nature', 'Debit', 'Credit', 'Net Balance'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.rows as any[])?.map((r: any, i: number) => (
                <tr key={i} className="table-row-hover">
                  <td className="table-cell text-sm font-medium" style={{ color: 'var(--text-1)' }}>{r.ledgerName}</td>
                  <td className="table-cell text-sm" style={{ color: 'var(--text-3)' }}>{r.groupName}</td>
                  <td className="table-cell text-xs capitalize" style={{ color: 'var(--text-4)' }}>{r.nature}</td>
                  <td className="table-cell text-sm font-medium" style={{ color: 'var(--brand)' }}>₹{r.totalDebit?.toLocaleString()}</td>
                  <td className="table-cell text-sm font-medium" style={{ color: 'var(--warning)' }}>₹{r.totalCredit?.toLocaleString()}</td>
                  <td className="table-cell text-sm font-semibold"
                    style={{ color: r.netBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    ₹{Math.abs(r.netBalance)?.toLocaleString()} {r.netBalance < 0 ? '(Cr)' : '(Dr)'}
                  </td>
                </tr>
              ))}
            </tbody>
            {data && (
              <tfoot style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Total</td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--brand)' }}>₹{data.grandDebit?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--warning)' }}>₹{data.grandCredit?.toLocaleString()}</td>
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

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} />
    </div>
  )

  const netPositive = (data?.netProfit ?? 0) >= 0

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--success-bg)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>Total Income</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>₹{data.totalIncome?.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--danger-bg)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>Total Expense</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>₹{data.totalExpense?.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl p-4 text-center"
            style={{ background: netPositive ? 'var(--brand-bg)' : 'var(--warning-bg)' }}>
            <p className="text-sm font-medium" style={{ color: netPositive ? 'var(--brand)' : 'var(--warning)' }}>
              Net {netPositive ? 'Profit' : 'Loss'}
            </p>
            <p className="text-2xl font-bold" style={{ color: netPositive ? 'var(--brand)' : 'var(--warning)' }}>
              ₹{Math.abs(data.netProfit ?? 0)?.toLocaleString()}
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['income', 'expense'].map(nature => (
          <div key={nature} className="card overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <h3 className="font-semibold capitalize" style={{ color: 'var(--text-1)' }}>{nature}</h3>
            </div>
            {data?.pl?.filter((p: any) => p.nature === nature).map((g: any) => (
              <div key={g.groupName}>
                <div className="px-4 py-2 flex justify-between text-sm font-semibold"
                  style={{
                    color: nature === 'income' ? 'var(--success)' : 'var(--danger)',
                    background: nature === 'income' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    opacity: 0.85,
                  }}>
                  <span>{g.groupName}</span>
                  <span>₹{g.total?.toLocaleString()}</span>
                </div>
                {g.items?.map((item: any) => (
                  <div key={item.ledgerName} className="px-8 py-1 flex justify-between text-xs"
                    style={{ color: 'var(--text-2)', borderTop: '1px solid var(--border)' }}>
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

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} />
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {['assets', 'liabilities', 'capital'].map(nature => (
        <div key={nature} className="card overflow-hidden">
          <div className="px-4 py-3" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-semibold capitalize" style={{ color: 'var(--text-1)' }}>{nature}</h3>
          </div>
          {data?.sheet?.filter((s: any) => s.nature === nature).map((g: any) => (
            <div key={g.groupName}>
              <div className="px-4 py-2 flex justify-between text-sm font-semibold"
                style={{ color: 'var(--text-1)', background: 'var(--surface-2)' }}>
                <span>{g.groupName}</span>
                <span>₹{g.total?.toLocaleString()}</span>
              </div>
              {g.items?.map((item: any) => (
                <div key={item.ledgerName} className="px-8 py-1.5 flex justify-between text-xs"
                  style={{ color: 'var(--text-2)', borderTop: '1px solid var(--border)' }}>
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
    <div className="card overflow-hidden">
      <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>{(data as any)?.ledger?.name ?? 'Cash Book'}</h3>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Balance: ₹{(data as any)?.closingBalance?.toLocaleString() ?? 0}</span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                {['Date', 'Voucher', 'Type', 'Narration', 'Debit', 'Credit', 'Balance'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data as any)?.rows?.map((r: any, i: number) => (
                <tr key={i} className="table-row-hover">
                  <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{new Date(r.date).toLocaleDateString()}</td>
                  <td className="table-cell text-xs font-mono" style={{ color: 'var(--text-3)' }}>{r.voucherNumber}</td>
                  <td className="table-cell text-xs capitalize" style={{ color: 'var(--text-3)' }}>{r.voucherType}</td>
                  <td className="table-cell text-sm max-w-[200px] truncate" style={{ color: 'var(--text-2)' }} title={r.narration}>{r.narration}</td>
                  <td className="table-cell text-sm font-medium" style={{ color: 'var(--brand)' }}>{r.debit > 0 ? `₹${r.debit.toLocaleString()}` : ''}</td>
                  <td className="table-cell text-sm font-medium" style={{ color: 'var(--warning)' }}>{r.credit > 0 ? `₹${r.credit.toLocaleString()}` : ''}</td>
                  <td className="table-cell text-sm font-semibold" style={{ color: 'var(--text-1)' }}>₹{r.balance?.toLocaleString()}</td>
                </tr>
              ))}
              {!(data as any)?.rows?.length && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-4)' }}>No cash book entries</td></tr>
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
          className="input-base focus-ring" />
        {!isLoading && (
          <span className="text-sm" style={{ color: 'var(--text-3)' }}>
            {(data as any)?.totalVouchers ?? 0} vouchers · ₹{(data as any)?.totalAmount?.toLocaleString() ?? 0}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {(data as any)?.vouchers?.map((v: any) => (
            <div key={v.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono" style={{ color: 'var(--text-3)' }}>{v.voucherNumber}</span>
                  <span className="text-xs capitalize px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{v.voucherType}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>₹{v.totalAmount?.toLocaleString()}</span>
              </div>
              {v.narration && <p className="text-sm mb-2" style={{ color: 'var(--text-3)' }}>{v.narration}</p>}
              <div className="space-y-1">
                {v.entries?.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs" style={{ color: 'var(--text-2)' }}>
                    <span className="font-medium"
                      style={{ color: e.entryType === 'debit' ? 'var(--brand)' : 'var(--warning)' }}>
                      {e.ledgerName}
                    </span>
                    <span>{e.entryType === 'debit' ? 'Dr' : 'Cr'} ₹{e.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!(data as any)?.vouchers?.length && (
            <div className="card p-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--border)' }} />
              <p className="text-sm" style={{ color: 'var(--text-4)' }}>No vouchers for this date</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
