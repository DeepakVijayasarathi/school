'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transportApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Bus, MapPin, Users, Navigation, Loader2, X } from 'lucide-react'

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all'

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
    enabled: tab === 'vehicles',
  })

  const { data: studentTransport, isLoading: stLoading } = useQuery({
    queryKey: ['student-transport', selectedRouteId],
    queryFn: () => transportApi.getStudentTransport({ routeId: selectedRouteId || undefined }).then(r => r.data),
    enabled: tab === 'students',
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport</h1>
          <p className="text-gray-500 text-sm">Route management and student transport</p>
        </div>
        <div className="flex gap-2">
          {tab === 'routes' && (
            <button onClick={() => setShowAddRoute(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200">
              <Plus className="w-4 h-4" /> Add Route
            </button>
          )}
          {tab === 'vehicles' && (
            <button onClick={() => setShowAddVehicle(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200">
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Routes', value: routesList.length, icon: Navigation, color: 'bg-blue-50 text-blue-600' },
          { label: 'Vehicles', value: vehiclesList.length, icon: Bus, color: 'bg-green-50 text-green-600' },
          { label: 'Students', value: stList.length, icon: Users, color: 'bg-purple-50 text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`${s.color} p-3 rounded-xl`}><s.icon className="w-5 h-5" /></div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['routes', 'vehicles', 'students'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {t}
          </button>
        ))}
      </div>

      {/* Routes tab */}
      {tab === 'routes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">All Routes</div>
            <div className="divide-y divide-gray-50">
              {routesLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 space-y-1.5">
                      <div className="skeleton h-3 w-32 rounded" />
                      <div className="skeleton h-2.5 w-48 rounded" />
                    </div>
                  ))
                : routesList.map((r: any) => (
                    <button key={r.id} onClick={() => setSelectedRouteId(r.id)}
                      className={cn('w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                        selectedRouteId === r.id && 'bg-blue-50 border-r-2 border-blue-600')}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{r.name}</p>
                        <span className="text-xs text-gray-400">{r.stopCount ?? 0} stops</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{r.startPoint} → {r.endPoint}</p>
                      {r.feeMonthly && <p className="text-xs text-blue-600 mt-0.5">₹{r.feeMonthly}/month</p>}
                    </button>
                  ))
              }
              {!routesList.length && !routesLoading && (
                <div className="px-4 py-12 text-center">
                  <Navigation className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No routes added yet</p>
                  <button onClick={() => setShowAddRoute(true)} className="mt-2 text-xs text-blue-600 hover:underline">Add first route</button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {!selectedRouteId ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <MapPin className="w-12 h-12 mb-3 text-gray-200" />
                <p className="text-sm">Select a route to view stops</p>
              </div>
            ) : routeDetail ? (
              <div>
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">{routeDetail.name}</h3>
                  <p className="text-sm text-gray-400">{routeDetail.startPoint} → {routeDetail.endPoint}{routeDetail.distanceKm ? ` · ${routeDetail.distanceKm}km` : ''}</p>
                </div>
                <div className="p-5">
                  {routeDetail.stops?.length ? (
                    <div className="relative">
                      {routeDetail.stops.map((stop: any, i: number) => (
                        <div key={stop.id} className="flex gap-4 mb-4">
                          <div className="flex flex-col items-center">
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                              i === 0 ? 'bg-green-500 text-white' :
                              i === routeDetail.stops.length - 1 ? 'bg-red-500 text-white' :
                              'bg-blue-100 text-blue-700')}>
                              {i + 1}
                            </div>
                            {i < routeDetail.stops.length - 1 && <div className="w-0.5 h-8 bg-gray-200 mt-1" />}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-medium text-gray-900">{stop.name}</p>
                            {stop.arrivalTime && <p className="text-xs text-gray-400">{stop.arrivalTime}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No stops added for this route</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicles tab */}
      {tab === 'vehicles' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50/70 border-b border-gray-100">
                <tr>
                  {['Registration', 'Type', 'Capacity', 'Driver', 'Phone', 'GPS'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehiclesLoading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                  : vehiclesList.map((v: any) => (
                      <tr key={v.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Bus className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium font-mono">{v.registration}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{v.vehicleType}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{v.capacity} seats</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{v.driverName ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{v.driverPhone ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold',
                            v.gpsDeviceId ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                            {v.gpsDeviceId ? 'Connected' : 'No GPS'}
                          </span>
                        </td>
                      </tr>
                    ))
                }
                {!vehiclesList.length && !vehiclesLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Bus className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No vehicles added yet</p>
                      <button onClick={() => setShowAddVehicle(true)} className="mt-2 text-xs text-blue-600 hover:underline">Add first vehicle</button>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <select value={selectedRouteId} onChange={e => setSelectedRouteId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
              <option value="">All Routes</option>
              {routesList.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50/70 border-b border-gray-100">
                <tr>
                  {['Student', 'Route', 'Stop', 'Vehicle', 'Pickup', 'Drop'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stLoading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                  : stList.map((st: any) => (
                      <tr key={st.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{st.studentName}</p>
                          <p className="text-xs text-gray-400">{st.admissionNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{st.route ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{st.stop ?? '—'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{st.vehicle ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{st.pickupTime ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{st.dropTime ?? '—'}</td>
                      </tr>
                    ))
                }
                {!stList.length && !stLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No student transport assignments</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Route Modal */}
      {showAddRoute && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Add Route</h3>
              <button onClick={() => setShowAddRoute(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Route Name <span className="text-red-500">*</span></label>
                <input value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. North Campus Route" className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Point</label>
                  <input value={routeForm.startPoint} onChange={e => setRouteForm(f => ({ ...f, startPoint: e.target.value }))}
                    placeholder="Origin stop" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">End Point</label>
                  <input value={routeForm.endPoint} onChange={e => setRouteForm(f => ({ ...f, endPoint: e.target.value }))}
                    placeholder="Final stop" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Fee (₹)</label>
                  <input type="number" min="0" value={routeForm.feeMonthly} onChange={e => setRouteForm(f => ({ ...f, feeMonthly: e.target.value }))}
                    placeholder="Optional" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Distance (km)</label>
                  <input type="number" min="0" value={routeForm.distanceKm} onChange={e => setRouteForm(f => ({ ...f, distanceKm: e.target.value }))}
                    placeholder="Optional" className={inputCls} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowAddRoute(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button
                onClick={() => addRouteMutation.mutate()}
                disabled={!routeForm.name.trim() || addRouteMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {addRouteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Add Vehicle</h3>
              <button onClick={() => setShowAddVehicle(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration No <span className="text-red-500">*</span></label>
                <input value={vehicleForm.registration} onChange={e => setVehicleForm(f => ({ ...f, registration: e.target.value }))}
                  placeholder="MH12AB1234" className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Type</label>
                  <select value={vehicleForm.vehicleType} onChange={e => setVehicleForm(f => ({ ...f, vehicleType: e.target.value }))} className={inputCls}>
                    {['Bus', 'Mini Bus', 'Van', 'Auto'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Capacity</label>
                  <input type="number" min="1" value={vehicleForm.capacity} onChange={e => setVehicleForm(f => ({ ...f, capacity: Number(e.target.value) }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Driver Name</label>
                <input value={vehicleForm.driverName} onChange={e => setVehicleForm(f => ({ ...f, driverName: e.target.value }))}
                  placeholder="Full name" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Driver Phone</label>
                  <input value={vehicleForm.driverPhone} onChange={e => setVehicleForm(f => ({ ...f, driverPhone: e.target.value }))}
                    placeholder="9876543210" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">License No</label>
                  <input value={vehicleForm.driverLicense} onChange={e => setVehicleForm(f => ({ ...f, driverLicense: e.target.value }))}
                    placeholder="License number" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">GPS Device ID</label>
                <input value={vehicleForm.gpsDeviceId} onChange={e => setVehicleForm(f => ({ ...f, gpsDeviceId: e.target.value }))}
                  placeholder="Optional" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowAddVehicle(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button
                onClick={() => addVehicleMutation.mutate()}
                disabled={!vehicleForm.registration || addVehicleMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {addVehicleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
