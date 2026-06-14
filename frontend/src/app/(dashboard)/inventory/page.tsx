'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/api'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Package, Tag, ShoppingCart, TrendingDown, Plus, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Loader2, RotateCcw } from 'lucide-react'

type Tab = 'assets' | 'stock' | 'orders'

const CONDITION_COLORS: Record<string, string> = {
  good: 'bg-green-100 text-green-700',
  fair: 'bg-yellow-100 text-yellow-700',
  poor: 'bg-red-100 text-red-700',
  disposed: 'bg-gray-100 text-gray-500',
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  ordered: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('assets')
  const [assetSearch, setAssetSearch] = useState('')
  const [stockSearch, setStockSearch] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showAddStock, setShowAddStock] = useState(false)
  const [showTxModal, setShowTxModal] = useState<{ id: string; name: string } | null>(null)
  const [txForm, setTxForm] = useState({ type: 'in', quantity: 1, reason: '' })
  const [assetForm, setAssetForm] = useState({ categoryId: '', name: '', serialNumber: '', brand: '', model: '', location: '', purchasePrice: 0, purchaseDate: '' })
  const [stockForm, setStockForm] = useState({ categoryId: '', name: '', unit: 'pcs', minimumStock: 5, unitPrice: 0, supplier: '' })
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => inventoryApi.getStats().then(r => r.data),
  })

  const { data: assetCategories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => inventoryApi.getAssetCategories().then(r => r.data),
  })

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets', assetSearch],
    queryFn: () => inventoryApi.getAssets({ search: assetSearch || undefined, pageSize: 50 }).then(r => r.data),
    enabled: tab === 'assets',
  })

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ['stock', stockSearch, showLowStock],
    queryFn: () => inventoryApi.getStock({ search: stockSearch || undefined, lowStock: showLowStock || undefined }).then(r => r.data),
    enabled: tab === 'stock',
  })

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => inventoryApi.getPurchaseOrders({}).then(r => r.data),
    enabled: tab === 'orders',
  })

  const addAssetMutation = useMutation({
    mutationFn: () => inventoryApi.createAsset({ ...assetForm, purchaseDate: assetForm.purchaseDate || undefined }),
    onSuccess: () => { toast.success('Asset added'); setShowAddAsset(false); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['inventory-stats'] }) },
  })

  const addStockMutation = useMutation({
    mutationFn: () => inventoryApi.createStockItem(stockForm),
    onSuccess: () => { toast.success('Stock item added'); setShowAddStock(false); qc.invalidateQueries({ queryKey: ['stock'] }) },
  })

  const txMutation = useMutation({
    mutationFn: () => inventoryApi.stockTransaction(showTxModal!.id, txForm),
    onSuccess: (data) => {
      toast.success(`Stock updated. Current: ${data.data.currentStock}`)
      setShowTxModal(null)
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['inventory-stats'] })
    },
  })

  const receiveOrderMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.receiveOrder(id),
    onSuccess: () => { toast.success('Order received, stock updated'); qc.invalidateQueries({ queryKey: ['purchase-orders'] }); qc.invalidateQueries({ queryKey: ['stock'] }) },
  })

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'stock', label: 'Stock', icon: Tag },
    { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm">Assets, stock management & purchase orders</p>
        </div>
        <div className="flex gap-2">
          {tab === 'assets' && (
            <button onClick={() => setShowAddAsset(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Asset
            </button>
          )}
          {tab === 'stock' && (
            <button onClick={() => setShowAddStock(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Assets', value: stats.totalAssets, color: 'bg-blue-50 text-blue-700' },
            { label: 'Asset Value', value: formatCurrency(stats.assetValue), color: 'bg-indigo-50 text-indigo-700' },
            { label: 'Stock Items', value: stats.totalStockItems, color: 'bg-teal-50 text-teal-700' },
            { label: 'Low Stock', value: stats.lowStockAlerts, color: stats.lowStockAlerts > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700' },
            { label: 'Pending Orders', value: stats.pendingOrders, color: 'bg-orange-50 text-orange-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ASSETS ──────────────────────────────────────────────────────────── */}
      {tab === 'assets' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input value={assetSearch} onChange={e => setAssetSearch(e.target.value)}
              placeholder="Search by name or asset code..."
              className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {assetsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Asset', 'Code', 'Category', 'Location', 'Purchase', 'Condition', 'Assigned To'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets?.items?.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{a.name}</p>
                      {a.brand && <p className="text-xs text-gray-400">{a.brand} {a.model}</p>}
                      {a.serialNumber && <p className="text-xs text-gray-300 font-mono">S/N: {a.serialNumber}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-600">{a.assetCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.categoryName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.location || '-'}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-800">{formatCurrency(a.purchasePrice)}</p>
                      {a.purchaseDate && <p className="text-xs text-gray-400">{formatDate(a.purchaseDate)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full capitalize', CONDITION_COLORS[a.condition] ?? 'bg-gray-100')}>
                        {a.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.assignedToName || '-'}</td>
                  </tr>
                ))}
                {!assets?.items?.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No assets found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── STOCK ───────────────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex gap-3 items-center">
            <input value={stockSearch} onChange={e => setStockSearch(e.target.value)}
              placeholder="Search stock items..."
              className="max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-2">
              <input type="checkbox" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)}
                className="w-4 h-4 accent-red-500" />
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Low stock only
            </label>
          </div>
          {stockLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Item', 'Category', 'Stock', 'Min Stock', 'Unit Price', 'Stock Value', 'Supplier', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stock?.map((s: any) => (
                  <tr key={s.id} className={cn('hover:bg-gray-50', s.isLow && 'bg-red-50/40')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                      </div>
                      {s.itemCode && <p className="text-xs text-gray-400 font-mono">{s.itemCode}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.categoryName || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-bold', s.isLow ? 'text-red-600' : 'text-gray-900')}>
                        {s.currentStock} {s.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.minimumStock} {s.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(s.unitPrice)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{formatCurrency(s.stockValue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.supplier || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setShowTxModal({ id: s.id, name: s.name }); setTxForm({ type: 'in', quantity: 1, reason: '' }) }}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Stock In">
                          <ArrowDownCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setShowTxModal({ id: s.id, name: s.name }); setTxForm({ type: 'out', quantity: 1, reason: '' }) }}
                          className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100" title="Stock Out">
                          <ArrowUpCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!stock?.length && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No stock items found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── PURCHASE ORDERS ─────────────────────────────────────────────────── */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {ordersLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : orders?.map((po: any) => (
            <div key={po.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 font-mono">{po.poNumber}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize', ORDER_STATUS_COLORS[po.status] ?? 'bg-gray-100')}>
                      {po.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{po.supplier}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>Ordered: {formatDate(po.orderDate)}</span>
                    {po.expectedDate && <span>Expected: {formatDate(po.expectedDate)}</span>}
                    {po.receivedDate && <span className="text-green-600">Received: {formatDate(po.receivedDate)}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(po.totalAmount)}</p>
                  <p className="text-xs text-gray-400">{po.items?.length ?? 0} items</p>
                  {po.status === 'ordered' && (
                    <button onClick={() => receiveOrderMutation.mutate(po.id)}
                      disabled={receiveOrderMutation.isPending}
                      className="mt-2 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Mark Received
                    </button>
                  )}
                </div>
              </div>
              {/* Line items */}
              {po.items?.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 font-medium uppercase mb-1">
                    <span>Item</span><span>Qty</span><span>Unit Price</span><span>Total</span>
                  </div>
                  {po.items.map((item: any) => (
                    <div key={item.id} className="grid grid-cols-4 gap-2 text-sm py-1">
                      <span className="text-gray-800">{item.itemName}</span>
                      <span className="text-gray-600">{item.quantity}</span>
                      <span className="text-gray-600">{formatCurrency(item.unitPrice)}</span>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!orders?.length && !ordersLoading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">No purchase orders yet</div>
          )}
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Asset</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <select value={assetForm.categoryId} onChange={e => setAssetForm(p => ({ ...p, categoryId: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                  <option value="">Select category</option>
                  {assetCategories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {[
                { label: 'Name', key: 'name', placeholder: 'e.g. Dell Laptop' },
                { label: 'Serial Number', key: 'serialNumber', placeholder: 'Optional' },
                { label: 'Brand', key: 'brand', placeholder: 'Optional' },
                { label: 'Model', key: 'model', placeholder: 'Optional' },
                { label: 'Location', key: 'location', placeholder: 'e.g. Lab 1, Room 205' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-gray-700">{f.label}</label>
                  <input value={(assetForm as any)[f.key]}
                    onChange={e => setAssetForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Purchase Price</label>
                  <input type="number" value={assetForm.purchasePrice}
                    onChange={e => setAssetForm(p => ({ ...p, purchasePrice: Number(e.target.value) }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Purchase Date</label>
                  <input type="date" value={assetForm.purchaseDate}
                    onChange={e => setAssetForm(p => ({ ...p, purchaseDate: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddAsset(false)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => addAssetMutation.mutate()}
                disabled={addAssetMutation.isPending || !assetForm.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {addAssetMutation.isPending ? 'Adding...' : 'Add Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Item Modal */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Add Stock Item</h3>
            <div className="space-y-3">
              {[
                { label: 'Name', key: 'name', placeholder: 'e.g. A4 Printer Paper' },
                { label: 'Supplier', key: 'supplier', placeholder: 'Supplier name (optional)' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-gray-700">{f.label}</label>
                  <input value={(stockForm as any)[f.key]}
                    onChange={e => setStockForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Unit</label>
                  <select value={stockForm.unit} onChange={e => setStockForm(p => ({ ...p, unit: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                    {['pcs', 'kg', 'litre', 'box', 'ream', 'pack'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Min Stock</label>
                  <input type="number" value={stockForm.minimumStock}
                    onChange={e => setStockForm(p => ({ ...p, minimumStock: Number(e.target.value) }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Unit Price ₹</label>
                  <input type="number" value={stockForm.unitPrice}
                    onChange={e => setStockForm(p => ({ ...p, unitPrice: Number(e.target.value) }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddStock(false)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => addStockMutation.mutate()}
                disabled={addStockMutation.isPending || !stockForm.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {addStockMutation.isPending ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transaction Modal */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold mb-1">Stock Transaction</h3>
            <p className="text-sm text-gray-500 mb-4">{showTxModal.name}</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['in', 'out', 'adjustment'].map(t => (
                    <button key={t} onClick={() => setTxForm(p => ({ ...p, type: t }))}
                      className={cn('py-2 rounded-lg text-sm font-medium capitalize border transition',
                        txForm.type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {txForm.type === 'adjustment' ? 'New Stock Level' : 'Quantity'}
                </label>
                <input type="number" value={txForm.quantity}
                  onChange={e => setTxForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Reason</label>
                <input value={txForm.reason} onChange={e => setTxForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="e.g. Received from supplier, Distributed to class"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowTxModal(null)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => txMutation.mutate()}
                disabled={txMutation.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {txMutation.isPending ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
