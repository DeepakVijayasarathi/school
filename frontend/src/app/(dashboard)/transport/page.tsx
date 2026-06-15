'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transportApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Bus, MapPin, Users, Navigation, Loader2, X } from 'lucide-react'

const inputCls = 'input-base focus-ring'

const emptyRoute = { name: '', startPoint: '', endPoint: '', feeMonthly: '', distanceKm: '' }
const emptyVehicle = { registration: '', vehicleType: 'Bus', capacity: 40, driverName: '', driverPhone: '', driverLicense: '', gpsDeviceId: '' }

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="skeleton h-3 w-24 rounded" /></td>
      ))}
    </tr>
  )
}

export default function TransportPage() {
  const [tab, setTab] = useState<'routes' | 'vehicles' | 'students'>('routes')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [routeForm, setRouteForm] = useState({ ...emptyRoute })
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ ...emptyVehicle })
  const qc = useQueryClient()

  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: () => transportApi.getRoutes().then(r => r.data),
  })

  const { data: routeDetail } = useQuery({
    queryKey: ['route', selectedRouteId],
    queryFn: () => transportApi.getRoute(selectedRouteId).then(r => r.data),
    enabled: !!selectedRouteId,
  })

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => transportApi.getVehicles().then(r => r.data),
  })

  const { data: studentTransport, isLoading: stLoading } = useQuery({
    queryKey: ['student-transport', selectedRouteId],
    queryFn: () => transportApi.getStudentTransport({ routeId: selectedRouteId || undefined }).then(r => r.data),
  })

  const addRouteMutation = useMutation({
    mutationFn: () => transportApi.createRoute({
      name: routeForm.name,
      startPoint: routeForm.startPoint || undefined,
      endPoint: routeForm.endPoint || undefined,
      feeMonthly: routeForm.feeMonthly ? Number(routeForm.feeMonthly) : undefined,
      distanceKm: routeForm.distanceKm ? Number(routeForm.distanceKm) : undefined,
    }),
    onSuccess: () => {
      toast.success('Route added')
      setShowAddRoute(false)
      setRouteForm({ ...emptyRoute })
      qc.invalidateQueries({ queryKey: ['routes'] })
    },
    onError: () => toast.error('Failed to add route'),
  })

  const addVehicleMutation = useMutation({
    mutationFn: () => transportApi.createVehicle(vehicleForm),
    onSuccess: () => {
      toast.success('Vehicle added')
      setShowAddVehicle(false)
      setVehicleForm({ ...emptyVehicle })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
    },
    onError: () => toast.error('Failed to add vehicle'),
  })

  const routesList = (routes as any[]) ?? []
  const vehiclesList = (vehicles as any[]) ?? []
  const stList = (studentTransport as any[]) ?? []

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Transport</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Route management and student transport</p>
        </div>
        <div className="flex gap-2">
          {tab === 'routes' && (
            <button onClick={() => setShowAddRoute(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Add Route
            </button>
          )}
          {tab === 'vehicles' && (
            <button onClick={() => setShowAddVehicle(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Routes', value: routesList.length, icon: Navigation, iconStyle: { background: 'var(--brand-bg)', color: 'var(--brand)' } },
          { label: 'Vehicles', value: vehiclesList.length, icon: Bus, iconStyle: { background: 'var(--success-bg)', color: 'var(--success)' } },
          { label: 'Students', value: stList.length, icon: Users, iconStyle: { background: 'var(--surface-2)', color: 'var(--text-2)' } },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl" style={s.iconStyle}><s.icon className="w-5 h-5" /></div>
            <div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-4)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-2)' }}>
        {(['routes', 'vehicles', 'students'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
              tab === t ? 'bg-white shadow' : 'hover:opacity-80')}
            style={{ color: tab === t ? 'var(--text-1)' : 'var(--text-3)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Routes tab */}
      {tab === 'routes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 font-semibold text-sm" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>All Routes</div>
            <div style={{ borderColor: 'var(--border)' }} className="divide-y">
              {routesLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 space-y-1.5">
                      <div className="skeleton h-3 w-32 rounded" />
                      <div className="skeleton h-2.5 w-48 rounded" />
                    </div>
                  ))
                : routesList.map((r: any) => (
                    <button key={r.id} onClick={() => setSelectedRouteId(r.id)}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{
                        background: selectedRouteId === r.id ? 'var(--brand-bg)' : undefined,
                        borderRight: selectedRouteId === r.id ? '2px solid var(--brand)' : undefined,
                      }}
                      onMouseEnter={e => { if (selectedRouteId !== r.id) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                      onMouseLeave={e => { if (selectedRouteId !== r.id) (e.currentTarget as HTMLElement).style.background = '' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{r.name}</p>
                        <span className="text-xs" style={{ color: 'var(--text-4)' }}>{r.stopCount ?? 0} stops</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{r.startPoint} → {r.endPoint}</p>
                      {r.feeMonthly && <p className="text-xs mt-0.5" style={{ color: 'var(--brand)' }}>₹{r.feeMonthly}/month</p>}
                    </button>
                  ))
              }
              {!routesList.length && !routesLoading && (
                <div className="px-4 py-12 text-center">
                  <Navigation className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--border)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-4)' }}>No routes added yet</p>
                  <button onClick={() => setShowAddRoute(true)} className="mt-2 text-xs hover:underline" style={{ color: 'var(--brand)' }}>Add first route</button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 card overflow-hidden p-0">
            {!selectedRouteId ? (
              <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-4)' }}>
                <MapPin className="w-12 h-12 mb-3" style={{ color: 'var(--border)' }} />
                <p className="text-sm">Select a route to view stops</p>
              </div>
            ) : routeDetail ? (
              <div>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>{routeDetail.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-4)' }}>{routeDetail.startPoint} → {routeDetail.endPoint}{routeDetail.distanceKm ? ` · ${routeDetail.distanceKm}km` : ''}</p>
                </div>
                <div className="p-5">
                  {routeDetail.stops?.length ? (
                    <div className="relative">
                      {routeDetail.stops.map((stop: any, i: number) => (
                        <div key={stop.id} className="flex gap-4 mb-4">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{
                                background: i === 0 ? 'var(--success)' :
                                  i === routeDetail.stops.length - 1 ? 'var(--danger)' :
                                  'var(--brand)',
                              }}>
                              {i + 1}
                            </div>
                            {i < routeDetail.stops.length - 1 && <div className="w-0.5 h-8 mt-1" style={{ background: 'var(--border)' }} />}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{stop.name}</p>
                            {stop.arrivalTime && <p className="text-xs" style={{ color: 'var(--text-4)' }}>{stop.arrivalTime}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--border)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-4)' }}>No stops added for this route</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicles tab */}
      {tab === 'vehicles' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  {['Registration', 'Type', 'Capacity', 'Driver', 'Phone', 'GPS'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehiclesLoading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                  : vehiclesList.map((v: any) => (
                      <tr key={v.id} className="table-row-hover">
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <Bus className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                            <span className="text-sm font-medium font-mono" style={{ color: 'var(--text-1)' }}>{v.registration}</span>
                          </div>
                        </td>
                        <td className="table-cell" style={{ color: 'var(--text-2)' }}>{v.vehicleType}</td>
                        <td className="table-cell" style={{ color: 'var(--text-2)' }}>{v.capacity} seats</td>
                        <td className="table-cell" style={{ color: 'var(--text-2)' }}>{v.driverName ?? '—'}</td>
                        <td className="table-cell" style={{ color: 'var(--text-2)' }}>{v.driverPhone ?? '—'}</td>
                        <td className="table-cell">
                          <span className={v.gpsDeviceId ? 'badge-active' : 'badge-inactive'}>
                            {v.gpsDeviceId ? 'Connected' : 'No GPS'}
                          </span>
                        </td>
                      </tr>
                    ))
                }
                {!vehiclesList.length && !vehiclesLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Bus className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--border)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-4)' }}>No vehicles added yet</p>
                      <button onClick={() => setShowAddVehicle(true)} className="mt-2 text-xs hover:underline" style={{ color: 'var(--brand)' }}>Add first vehicle</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Students tab */}
      {tab === 'students' && (
        <div className="card overflow-hidden p-0">
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <select value={selectedRouteId} onChange={e => setSelectedRouteId(e.target.value)}
              className="input-base focus-ring" style={{ width: 'auto' }}>
              <option value="">All Routes</option>
              {routesList.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  {['Student', 'Route', 'Stop', 'Vehicle', 'Pickup', 'Drop'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stLoading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                  : stList.map((st: any) => (
                      <tr key={st.id} className="table-row-hover">
                        <td className="table-cell">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{st.studentName}</p>
                          <p className="text-xs" style={{ color: 'var(--text-4)' }}>{st.admissionNumber}</p>
                        </td>
                        <td className="table-cell" style={{ color: 'var(--text-2)' }}>{st.route ?? '—'}</td>
                        <td className="table-cell" style={{ color: 'var(--text-2)' }}>{st.stop ?? '—'}</td>
                        <td className="table-cell font-mono" style={{ color: 'var(--text-2)' }}>{st.vehicle ?? '—'}</td>
                        <td className="table-cell" style={{ color: 'var(--text-2)' }}>{st.pickupTime ?? '—'}</td>
                        <td className="table-cell" style={{ color: 'var(--text-2)' }}>{st.dropTime ?? '—'}</td>
                      </tr>
                    ))
                }
                {!stList.length && !stLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Users className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--border)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-4)' }}>No student transport assignments</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Route Modal */}
      {showAddRoute && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Add Route</h3>
              <button onClick={() => { setShowAddRoute(false); setRouteForm({ ...emptyRoute }) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Route Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. North Campus Route" className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Start Point</label>
                  <input value={routeForm.startPoint} onChange={e => setRouteForm(f => ({ ...f, startPoint: e.target.value }))}
                    placeholder="Origin stop" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>End Point</label>
                  <input value={routeForm.endPoint} onChange={e => setRouteForm(f => ({ ...f, endPoint: e.target.value }))}
                    placeholder="Final stop" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Monthly Fee (₹)</label>
                  <input type="number" min="0" value={routeForm.feeMonthly} onChange={e => setRouteForm(f => ({ ...f, feeMonthly: e.target.value }))}
                    placeholder="Optional" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Distance (km)</label>
                  <input type="number" min="0" value={routeForm.distanceKm} onChange={e => setRouteForm(f => ({ ...f, distanceKm: e.target.value }))}
                    placeholder="Optional" className={inputCls} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowAddRoute(false); setRouteForm({ ...emptyRoute }) }} className="btn btn-ghost flex-1">Cancel</button>
              <button
                onClick={() => addRouteMutation.mutate()}
                disabled={!routeForm.name.trim() || addRouteMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {addRouteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Route
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Add Vehicle</h3>
              <button onClick={() => { setShowAddVehicle(false); setVehicleForm({ ...emptyVehicle }) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Registration No <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input value={vehicleForm.registration} onChange={e => setVehicleForm(f => ({ ...f, registration: e.target.value }))}
                  placeholder="MH12AB1234" className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Vehicle Type</label>
                  <select value={vehicleForm.vehicleType} onChange={e => setVehicleForm(f => ({ ...f, vehicleType: e.target.value }))} className={inputCls}>
                    {['Bus', 'Mini Bus', 'Van', 'Auto'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Capacity</label>
                  <input type="number" min="1" value={vehicleForm.capacity} onChange={e => setVehicleForm(f => ({ ...f, capacity: Number(e.target.value) }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Driver Name</label>
                <input value={vehicleForm.driverName} onChange={e => setVehicleForm(f => ({ ...f, driverName: e.target.value }))}
                  placeholder="Full name" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Driver Phone</label>
                  <input value={vehicleForm.driverPhone} onChange={e => setVehicleForm(f => ({ ...f, driverPhone: e.target.value }))}
                    placeholder="9876543210" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>License No</label>
                  <input value={vehicleForm.driverLicense} onChange={e => setVehicleForm(f => ({ ...f, driverLicense: e.target.value }))}
                    placeholder="License number" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>GPS Device ID</label>
                <input value={vehicleForm.gpsDeviceId} onChange={e => setVehicleForm(f => ({ ...f, gpsDeviceId: e.target.value }))}
                  placeholder="Optional" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowAddVehicle(false); setVehicleForm({ ...emptyVehicle }) }} className="btn btn-ghost flex-1">Cancel</button>
              <button
                onClick={() => addVehicleMutation.mutate()}
                disabled={!vehicleForm.registration || addVehicleMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {addVehicleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Vehicle
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
