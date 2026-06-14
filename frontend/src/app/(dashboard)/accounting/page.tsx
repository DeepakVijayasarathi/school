'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Plus, X, TrendingUp, TrendingDown, DollarSign, Building2 } from 'lucide-react'

const api = (path: string, options?: RequestInit) =>
  fetch(`/api/accounting${path}`, { headers: { 'Content-Type': 'application/json' }, ...options }).then(r => r.json())

export default function AccountingPage() {
  const [tab, setTab] = useState('overview')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
        <p className="text-gray-500 text-sm">Double-entry bookkeeping, ledgers, and financial reports</p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 overflow-x-auto">
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
            className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">₹{Number(value ?? 0).toLocaleString()}</p>
    </div>
  )
}

function OverviewTab() {
  const today = new Date().toISOString().split('T')[0]
  const { data: pl } = useQuery({
    queryKey: ['pl-overview'],
    queryFn: () => api('/reports/profit-loss'),
  })
  const { data: cashBook } = useQuery({
    queryKey: ['cash-book-overview'],
    queryFn: () => api('/reports/cash-book'),
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Income Groups</h3>
            {pl.pl.filter((p: any) => p.nature === 'income').map((g: any) => (
              <div key={g.groupName} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{g.groupName}</span>
                <span className="font-medium text-green-700">₹{g.total?.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Expense Groups</h3>
            {pl.pl.filter((p: any) => p.nature === 'expense').map((g: any) => (
              <div key={g.groupName} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
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

  const { data, isLoading } = useQuery({
    queryKey: ['vouchers', typeFilter, page],
    queryFn: () => api(`/vouchers?page=${page}&pageSize=20${typeFilter ? `&type=${typeFilter}` : ''}`),
  })

  const [voucherType, setVoucherType] = useState('payment')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [narration, setNarration] = useState('')
  const [entries, setEntries] = useState([
    { ledgerId: '', entryType: 'debit', amount: '', narration: '' },
    { ledgerId: '', entryType: 'credit', amount: '', narration: '' },
  ])

  const { data: ledgers } = useQuery({
    queryKey: ['ledgers'],
    queryFn: () => api('/ledgers'),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api('/vouchers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vouchers'] }); setShowCreate(false) }
  })

  const postMutation = useMutation({
    mutationFn: (id: string) => api(`/vouchers/${id}/post`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vouchers'] })
  })

  const totalDebit = entries.filter(e => e.entryType === 'debit').reduce((sum, e) => sum + (+e.amount || 0), 0)
  const totalCredit = entries.filter(e => e.entryType === 'credit').reduce((sum, e) => sum + (+e.amount || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const addEntry = () => setEntries(prev => [...prev, { ledgerId: '', entryType: 'credit', amount: '', narration: '' }])
  const removeEntry = (i: number) => setEntries(prev => prev.filter((_, idx) => idx !== i))
  const updateEntry = (i: number, field: string, value: string) =>
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))

  const handleCreate = () => {
    if (!isBalanced) return
    createMutation.mutate({
      voucherType,
      date,
      narration,
      entries: entries.map(e => ({ ...e, amount: parseFloat(e.amount) }))
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'payment', 'receipt', 'journal', 'contra'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={cn('px-3 py-1.5 text-sm border rounded-lg capitalize', typeFilter === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50')}>
              {t || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Voucher
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Voucher No', 'Type', 'Date', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.items?.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{v.voucherNumber}</td>
                  <td className="px-4 py-3 text-sm capitalize">{v.voucherType}</td>
                  <td className="px-4 py-3 text-sm">{new Date(v.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-medium">₹{v.totalAmount?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize font-medium',
                      v.isPosted ? 'bg-green-100 text-green-700' : v.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>
                      {v.isPosted ? 'Posted' : v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {!v.isPosted && v.status !== 'cancelled' && (
                      <button onClick={() => postMutation.mutate(v.id)}
                        className="text-xs text-blue-600 hover:underline">Post</button>
                    )}
                    <button className="text-xs text-gray-500 hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Voucher Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Create Voucher</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select value={voucherType} onChange={e => setVoucherType(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {['payment', 'receipt', 'journal', 'contra'].map(t => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Narration</label>
                <input value={narration} onChange={e => setNarration(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>

            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                <div className="col-span-5">Ledger</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-3">Amount</div>
                <div className="col-span-2"></div>
              </div>
              {entries.map((entry, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2 border-t border-gray-50">
                  <div className="col-span-5">
                    <select value={entry.ledgerId} onChange={e => updateEntry(i, 'ledgerId', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm">
                      <option value="">Select Ledger</option>
                      {ledgers?.map?.((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <select value={entry.entryType} onChange={e => updateEntry(i, 'entryType', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm">
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" value={entry.amount} onChange={e => updateEntry(i, 'amount', e.target.value)}
                      placeholder="0.00" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right" />
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
              <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                <button onClick={addEntry} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Line
                </button>
                <div className="flex gap-6 text-sm">
                  <span className={cn('font-medium', totalDebit === totalCredit ? 'text-green-600' : 'text-gray-600')}>
                    Dr: ₹{totalDebit.toLocaleString()}
                  </span>
                  <span className={cn('font-medium', totalDebit === totalCredit ? 'text-green-600' : 'text-gray-600')}>
                    Cr: ₹{totalCredit.toLocaleString()}
                  </span>
                  {!isBalanced && <span className="text-red-500 text-xs font-medium">NOT BALANCED</span>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!isBalanced || createMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                {createMutation.isPending ? 'Creating...' : 'Create Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LedgersTab() {
  const { data: groups } = useQuery({ queryKey: ['account-groups'], queryFn: () => api('/account-groups') })
  const { data: ledgers } = useQuery({ queryKey: ['ledgers'], queryFn: () => api('/ledgers') })
  const [selectedGroupId, setSelectedGroupId] = useState('')

  const filtered = ledgers?.filter((l: any) => !selectedGroupId || l.accountGroupId === selectedGroupId)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSelectedGroupId('')}
          className={cn('px-3 py-1.5 text-sm border rounded-lg', !selectedGroupId ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200')}>
          All
        </button>
        {groups?.map?.((g: any) => (
          <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
            className={cn('px-3 py-1.5 text-sm border rounded-lg capitalize', selectedGroupId === g.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200')}>
            {g.name} ({g.nature})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Ledger Name', 'Code', 'Group', 'Nature', 'Opening Balance', 'Type'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered?.map?.((l: any) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{l.name}</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{l.code}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{l.groupName}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize font-medium',
                    l.nature === 'assets' ? 'bg-blue-50 text-blue-700' :
                    l.nature === 'income' ? 'bg-green-50 text-green-700' :
                    l.nature === 'expense' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700')}>
                    {l.nature}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">₹{l.openingBalance?.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.openingBalanceType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TrialBalanceTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['trial-balance'],
    queryFn: () => api('/reports/trial-balance'),
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold">Trial Balance</h3>
        {data && (
          <span className={cn('text-sm font-medium', data.isBalanced ? 'text-green-600' : 'text-red-600')}>
            {data.isBalanced ? 'Balanced ✓' : 'Not Balanced ✗'}
          </span>
        )}
      </div>
      {isLoading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Ledger', 'Group', 'Nature', 'Debit', 'Credit', 'Net Balance'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.rows?.map((r: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm font-medium">{r.ledgerName}</td>
                <td className="px-4 py-2 text-sm text-gray-500">{r.groupName}</td>
                <td className="px-4 py-2 text-xs capitalize text-gray-400">{r.nature}</td>
                <td className="px-4 py-2 text-sm text-blue-600">₹{r.totalDebit?.toLocaleString()}</td>
                <td className="px-4 py-2 text-sm text-orange-600">₹{r.totalCredit?.toLocaleString()}</td>
                <td className={cn('px-4 py-2 text-sm font-medium', r.netBalance >= 0 ? 'text-green-700' : 'text-red-700')}>
                  ₹{Math.abs(r.netBalance)?.toLocaleString()} {r.netBalance < 0 ? '(Cr)' : '(Dr)'}
                </td>
              </tr>
            ))}
          </tbody>
          {data && (
            <tfoot className="bg-gray-50 border-t font-semibold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm">Total</td>
                <td className="px-4 py-3 text-sm text-blue-700">₹{data.grandDebit?.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-orange-700">₹{data.grandCredit?.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm"></td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  )
}

function ProfitLossTab() {
  const { data } = useQuery({ queryKey: ['profit-loss'], queryFn: () => api('/reports/profit-loss') })

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-sm text-green-600 font-medium">Total Income</p>
            <p className="text-2xl font-bold text-green-700">₹{data.totalIncome?.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-sm text-red-600 font-medium">Total Expense</p>
            <p className="text-2xl font-bold text-red-700">₹{data.totalExpense?.toLocaleString()}</p>
          </div>
          <div className={cn('rounded-xl p-4 text-center', (data.netProfit ?? 0) >= 0 ? 'bg-blue-50' : 'bg-orange-50')}>
            <p className={cn('text-sm font-medium', (data.netProfit ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600')}>Net {(data.netProfit ?? 0) >= 0 ? 'Profit' : 'Loss'}</p>
            <p className={cn('text-2xl font-bold', (data.netProfit ?? 0) >= 0 ? 'text-blue-700' : 'text-orange-700')}>
              ₹{Math.abs(data.netProfit ?? 0)?.toLocaleString()}
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['income', 'expense'].map(nature => (
          <div key={nature} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold capitalize">{nature}</h3>
            </div>
            {data?.pl?.filter((p: any) => p.nature === nature).map((g: any) => (
              <div key={g.groupName}>
                <div className={cn('px-4 py-2 flex justify-between text-sm font-medium',
                  nature === 'income' ? 'text-green-700' : 'text-red-700')}>
                  <span>{g.groupName}</span>
                  <span>₹{g.total?.toLocaleString()}</span>
                </div>
                {g.items.map((item: any) => (
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
  const { data } = useQuery({ queryKey: ['balance-sheet'], queryFn: () => api('/reports/balance-sheet') })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {['assets', 'liabilities', 'capital'].map(nature => (
        <div key={nature} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold capitalize">{nature}</h3>
          </div>
          {data?.sheet?.filter((s: any) => s.nature === nature).map((g: any) => (
            <div key={g.groupName}>
              <div className="px-4 py-2 flex justify-between text-sm font-medium text-gray-800 bg-gray-50">
                <span>{g.groupName}</span>
                <span>₹{g.total?.toLocaleString()}</span>
              </div>
              {g.items.map((item: any) => (
                <div key={item.ledgerName} className="px-8 py-1 flex justify-between text-xs text-gray-600">
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
  const { data } = useQuery({ queryKey: ['cash-book'], queryFn: () => api('/reports/cash-book') })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b flex justify-between items-center">
        <h3 className="font-semibold">{data?.ledger?.name ?? 'Cash Book'}</h3>
        <span className="text-sm font-medium text-gray-500">Balance: ₹{data?.closingBalance?.toLocaleString()}</span>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {['Date', 'Voucher', 'Type', 'Narration', 'Debit', 'Credit', 'Balance'].map(h => (
              <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data?.rows?.map((r: any, i: number) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm">{new Date(r.date).toLocaleDateString()}</td>
              <td className="px-4 py-2 text-xs font-mono">{r.voucherNumber}</td>
              <td className="px-4 py-2 text-xs capitalize">{r.voucherType}</td>
              <td className="px-4 py-2 text-sm text-gray-600 max-w-[200px] truncate">{r.narration}</td>
              <td className="px-4 py-2 text-sm text-blue-600">{r.debit > 0 ? `₹${r.debit.toLocaleString()}` : ''}</td>
              <td className="px-4 py-2 text-sm text-orange-600">{r.credit > 0 ? `₹${r.credit.toLocaleString()}` : ''}</td>
              <td className="px-4 py-2 text-sm font-medium">₹{r.balance?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DayBookTab() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const { data, refetch } = useQuery({
    queryKey: ['day-book', date],
    queryFn: () => api(`/reports/day-book?date=${date}`),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        <span className="text-sm text-gray-500">{data?.totalVouchers ?? 0} vouchers • ₹{data?.totalAmount?.toLocaleString() ?? 0}</span>
      </div>
      <div className="space-y-3">
        {data?.vouchers?.map?.((v: any) => (
          <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-gray-500">{v.voucherNumber}</span>
                <span className="text-xs capitalize bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{v.voucherType}</span>
              </div>
              <span className="text-sm font-semibold">₹{v.totalAmount?.toLocaleString()}</span>
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
        {!data?.vouchers?.length && (
          <div className="bg-white rounded-xl p-12 text-center text-gray-400">No vouchers for this date.</div>
        )}
      </div>
    </div>
  )
}
