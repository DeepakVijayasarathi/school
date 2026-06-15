'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/api'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Package, Tag, ShoppingCart, TrendingDown, Plus, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Loader2, RotateCcw } from 'lucide-react'

const inputCls = 'input-base focus-ring'

type Tab = 'assets' | 'stock' | 'orders'

// Map condition → badge class
const CONDITION_BADGE: Record<string, string> = {
  good: 'badge-active',
  fair: 'badge-pending',
  poor: 'badge-draft',
  disposed: 'badge-inactive',
}

// Map order status → badge class
const ORDER_STATUS_BADGE: Record<string, string> = {
  draft: 'badge-draft',
  ordered: 'badge-pending',
  received: 'badge-active',
  cancelled: 'badge-inactive',
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
    onSuccess: () => { toast.success('Asset added'); setShowAddAsset(false); setAssetForm({ categoryId: '', name: '', serialNumber: '', brand: '', model: '', location: '', purchasePrice: 0, purchaseDate: '' }); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['inventory-stats'] }) },
    onError: () => toast.error('Failed to add asset'),
  })

  const addStockMutation = useMutation({
    mutationFn: () => inventoryApi.createStockItem(stockForm),
    onSuccess: () => { toast.success('Stock item added'); setShowAddStock(false); setStockForm({ categoryId: '', name: '', unit: 'pcs', minimumStock: 5, unitPrice: 0, supplier: '' }); qc.invalidateQueries({ queryKey: ['stock'] }) },
    onError: () => toast.error('Failed to add stock item'),
  })

  const txMutation = useMutation({
    mutationFn: () => inventoryApi.stockTransaction(showTxModal!.id, txForm),
    onSuccess: (data) => {
      toast.success(`Stock updated. Current: ${data.data.currentStock}`)
      setShowTxModal(null)
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['inventory-stats'] })
    },
    onError: () => toast.error('Failed to update stock'),
  })

  const receiveOrderMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.receiveOrder(id),
    onSuccess: () => { toast.success('Order received, stock updated'); qc.invalidateQueries({ queryKey: ['purchase-orders'] }); qc.invalidateQueries({ queryKey: ['stock'] }) },
    onError: () => toast.error('Failed to receive order'),
  })

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'stock', label: 'Stock', icon: Tag },
    { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
  ]

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Inventory</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Assets, stock management &amp; purchase orders</p>
        </div>
        <div className="flex gap-2">
          {tab === 'assets' && (
            <button onClick={() => setShowAddAsset(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Add Asset
            </button>
          )}
          {tab === 'stock' && (
            <button onClick={() => setShowAddStock(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Assets', value: stats.totalAssets, bg: 'var(--brand-bg)', color: 'var(--brand)' },
            { label: 'Asset Value', value: formatCurrency(stats.assetValue), bg: 'var(--surface-2)', color: 'var(--text-2)' },
            { label: 'Stock Items', value: stats.totalStockItems, bg: 'var(--success-bg)', color: 'var(--success)' },
            { label: 'Low Stock', value: stats.lowStockAlerts, bg: stats.lowStockAlerts > 0 ? 'var(--danger-bg)' : 'var(--success-bg)', color: stats.lowStockAlerts > 0 ? 'var(--danger)' : 'var(--success)' },
            { label: 'Pending Orders', value: stats.pendingOrders, bg: 'var(--warning-bg)', color: 'var(--warning)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg, color: s.color }}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-2)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition"
            style={tab === t.id
              ? { background: 'var(--surface)', color: 'var(--text-1)', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
              : { color: 'var(--text-3)' }}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ASSETS ──────────────────────────────────────────────────────────── */}
      {tab === 'assets' && (
        <div className="card overflow-hidden p-0">
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <input value={assetSearch} onChange={e => setAssetSearch(e.target.value)}
              placeholder="Search by name or asset code..."
              className={`${inputCls} max-w-sm`} />
          </div>
          {assetsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr>
                    {['Asset', 'Code', 'Category', 'Location', 'Purchase', 'Condition', 'Assigned To'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets?.items?.map((a: any) => (
                    <tr key={a.id} className="table-row-hover">
                      <td className="table-cell">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{a.name}</p>
                        {a.brand && <p className="text-xs" style={{ color: 'var(--text-4)' }}>{a.brand} {a.model}</p>}
                        {a.serialNumber && <p className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>S/N: {a.serialNumber}</p>}
                      </td>
                      <td className="table-cell font-mono" style={{ color: 'var(--brand)' }}>{a.assetCode}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{a.categoryName || '-'}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{a.location || '-'}</td>
                      <td className="table-cell">
                        <p className="text-sm" style={{ color: 'var(--text-1)' }}>{formatCurrency(a.purchasePrice)}</p>
                        {a.purchaseDate && <p className="text-xs" style={{ color: 'var(--text-4)' }}>{formatDate(a.purchaseDate)}</p>}
                      </td>
                      <td className="table-cell">
                        <span className={cn('text-xs px-2 py-1 rounded-full capitalize', CONDITION_BADGE[a.condition] ?? 'badge-inactive')}>
                          {a.condition}
                        </span>
                      </td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{a.assignedToName || '-'}</td>
                    </tr>
                  ))}
                  {!assets?.items?.length && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-4)' }}>No assets found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STOCK ───────────────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="card overflow-hidden p-0">
          <div className="p-4 flex gap-3 items-center" style={{ borderBottom: '1px solid var(--border)' }}>
            <input value={stockSearch} onChange={e => setStockSearch(e.target.value)}
              placeholder="Search stock items..."
              className={`${inputCls} max-w-sm`} />
            <label className="flex items-center gap-2 text-sm cursor-pointer ml-2" style={{ color: 'var(--text-2)' }}>
              <input type="checkbox" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)}
                className="w-4 h-4" style={{ accentColor: 'var(--danger)' }} />
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
              Low stock only
            </label>
          </div>
          {stockLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px]">
                <thead>
                  <tr>
                    {['Item', 'Category', 'Stock', 'Min Stock', 'Unit Price', 'Stock Value', 'Supplier', 'Actions'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stock?.map((s: any) => (
                    <tr key={s.id} className="table-row-hover"
                      style={s.isLow ? { background: 'var(--danger-bg)' } : undefined}>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          {s.isLow && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--danger)' }} />}
                          <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{s.name}</p>
                        </div>
                        {s.itemCode && <p className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>{s.itemCode}</p>}
                      </td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{s.categoryName || '-'}</td>
                      <td className="table-cell">
                        <span className="text-sm font-bold" style={{ color: s.isLow ? 'var(--danger)' : 'var(--text-1)' }}>
                          {s.currentStock} {s.unit}
                        </span>
                      </td>
                      <td className="table-cell" style={{ color: 'var(--text-3)' }}>{s.minimumStock} {s.unit}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{formatCurrency(s.unitPrice)}</td>
                      <td className="table-cell font-medium" style={{ color: 'var(--text-1)' }}>{formatCurrency(s.stockValue)}</td>
                      <td className="table-cell" style={{ color: 'var(--text-2)' }}>{s.supplier || '-'}</td>
                      <td className="table-cell">
                        <div className="flex gap-1">
                          <button onClick={() => { setShowTxModal({ id: s.id, name: s.name }); setTxForm({ type: 'in', quantity: 1, reason: '' }) }}
                            className="p-1.5 rounded-lg transition"
                            style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.75'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                            title="Stock In">
                            <ArrowDownCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setShowTxModal({ id: s.id, name: s.name }); setTxForm({ type: 'out', quantity: 1, reason: '' }) }}
                            className="p-1.5 rounded-lg transition"
                            style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.75'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                            title="Stock Out">
                            <ArrowUpCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!stock?.length && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ color: 'var(--text-4)' }}>No stock items found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PURCHASE ORDERS ─────────────────────────────────────────────────── */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {ordersLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} /></div>
          ) : orders?.map((po: any) => (
            <div key={po.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold font-mono" style={{ color: 'var(--text-1)' }}>{po.poNumber}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize', ORDER_STATUS_BADGE[po.status] ?? 'badge-inactive')}>
                      {po.status}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{po.supplier}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: 'var(--text-4)' }}>
                    <span>Ordered: {formatDate(po.orderDate)}</span>
                    {po.expectedDate && <span>Expected: {formatDate(po.expectedDate)}</span>}
                    {po.receivedDate && <span style={{ color: 'var(--success)' }}>Received: {formatDate(po.receivedDate)}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{formatCurrency(po.totalAmount)}</p>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>{po.items?.length ?? 0} items</p>
                  {po.status === 'ordered' && (
                    <button onClick={() => receiveOrderMutation.mutate(po.id)}
                      disabled={receiveOrderMutation.isPending}
                      className="btn btn-primary mt-2 text-xs px-3 py-1.5">
                      Mark Received
                    </button>
                  )}
                </div>
              </div>
              {/* Line items */}
              {po.items?.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-4)' }}>
                    <span>Item</span><span>Qty</span><span>Unit Price</span><span>Total</span>
                  </div>
                  {po.items.map((item: any) => (
                    <div key={item.id} className="grid grid-cols-4 gap-2 text-sm py-1">
                      <span style={{ color: 'var(--text-1)' }}>{item.itemName}</span>
                      <span style={{ color: 'var(--text-2)' }}>{item.quantity}</span>
                      <span style={{ color: 'var(--text-2)' }}>{formatCurrency(item.unitPrice)}</span>
                      <span className="font-medium" style={{ color: 'var(--text-1)' }}>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!orders?.length && !ordersLoading && (
            <div className="card p-12 text-center" style={{ color: 'var(--text-4)' }}>No purchase orders yet</div>
          )}
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddAsset && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Add Asset</h3>
            </div>
            <div className="px-6 py-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Category</label>
                <select value={assetForm.categoryId} onChange={e => setAssetForm(p => ({ ...p, categoryId: e.target.value }))}
                  className={`mt-1 ${inputCls}`}>
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
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{f.label}</label>
                  <input value={(assetForm as any)[f.key]}
                    onChange={e => setAssetForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={`mt-1 ${inputCls}`} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Purchase Price</label>
                  <input type="number" value={assetForm.purchasePrice}
                    onChange={e => setAssetForm(p => ({ ...p, purchasePrice: Number(e.target.value) }))}
                    className={`mt-1 ${inputCls}`} />
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Purchase Date</label>
                  <input type="date" value={assetForm.purchaseDate}
                    onChange={e => setAssetForm(p => ({ ...p, purchaseDate: e.target.value }))}
                    className={`mt-1 ${inputCls}`} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowAddAsset(false); setAssetForm({ categoryId: '', name: '', serialNumber: '', brand: '', model: '', location: '', purchasePrice: 0, purchaseDate: '' }) }}
                className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => addAssetMutation.mutate()}
                disabled={addAssetMutation.isPending || !assetForm.name}
                className="btn btn-primary flex-1">
                {addAssetMutation.isPending ? 'Adding...' : 'Add Asset'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Stock Item Modal */}
      {showAddStock && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Add Stock Item</h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Category</label>
                <select value={stockForm.categoryId} onChange={e => setStockForm(p => ({ ...p, categoryId: e.target.value }))}
                  className={`mt-1 ${inputCls}`}>
                  <option value="">Select category (optional)</option>
                  {assetCategories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {[
                { label: 'Name', key: 'name', placeholder: 'e.g. A4 Printer Paper' },
                { label: 'Supplier', key: 'supplier', placeholder: 'Supplier name (optional)' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{f.label}</label>
                  <input value={(stockForm as any)[f.key]}
                    onChange={e => setStockForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={`mt-1 ${inputCls}`} />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Unit</label>
                  <select value={stockForm.unit} onChange={e => setStockForm(p => ({ ...p, unit: e.target.value }))}
                    className={`mt-1 ${inputCls}`}>
                    {['pcs', 'kg', 'litre', 'box', 'ream', 'pack'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Min Stock</label>
                  <input type="number" value={stockForm.minimumStock}
                    onChange={e => setStockForm(p => ({ ...p, minimumStock: Number(e.target.value) }))}
                    className={`mt-1 ${inputCls}`} />
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Unit Price ₹</label>
                  <input type="number" value={stockForm.unitPrice}
                    onChange={e => setStockForm(p => ({ ...p, unitPrice: Number(e.target.value) }))}
                    className={`mt-1 ${inputCls}`} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowAddStock(false); setStockForm({ categoryId: '', name: '', unit: 'pcs', minimumStock: 5, unitPrice: 0, supplier: '' }) }}
                className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => addStockMutation.mutate()}
                disabled={addStockMutation.isPending || !stockForm.name}
                className="btn btn-primary flex-1">
                {addStockMutation.isPending ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Stock Transaction Modal */}
      {showTxModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Stock Transaction</h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{showTxModal.name}</p>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Type</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['in', 'out', 'adjustment'].map(t => (
                    <button key={t} onClick={() => setTxForm(p => ({ ...p, type: t }))}
                      className="py-2 rounded-lg text-sm font-medium capitalize border transition"
                      style={txForm.type === t
                        ? { background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }
                        : { background: 'var(--surface)', color: 'var(--text-2)', borderColor: 'var(--border)' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                  {txForm.type === 'adjustment' ? 'New Stock Level' : 'Quantity'}
                </label>
                <input type="number" value={txForm.quantity}
                  onChange={e => setTxForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                  className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Reason</label>
                <input value={txForm.reason} onChange={e => setTxForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="e.g. Received from supplier, Distributed to class"
                  className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowTxModal(null); setTxForm({ type: 'in', quantity: 1, reason: '' }) }}
                className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => txMutation.mutate()}
                disabled={txMutation.isPending}
                className="btn btn-primary flex-1">
                {txMutation.isPending ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
