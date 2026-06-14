'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transportApi, studentsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Bus, MapPin, Users, Search, Navigation, Loader2 } from 'lucide-react'

export default function TransportPage() {
  const [tab, setTab] = useState<'routes' | 'vehicles' | 'students'>('routes')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ registration: '', vehicleType: 'Bus', capacity: 40, driverName: '', driverPhone: '', driverLicense: '', gpsDeviceId: '' })
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

  const addVehicleMutation = useMutation({
    mutationFn: () => transportApi.createVehicle(vehicleForm),
    onSuccess: () => {
      toast.success('Vehicle added')
      setShowAddVehicle(false)
      setVehicleForm({ registration: '', vehicleType: 'Bus', capacity: 40, driverName: '', driverPhone: '', driverLicense: '', gpsDeviceId: '' })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport</h1>
          <p className="text-gray-500 text-sm">Route management and student transport</p>
        </div>
        <div className="flex gap-2">
          {tab === 'vehicles' && (
            <button onClick={() => setShowAddVehicle(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          )}
          {tab === 'routes' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Route
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Routes', value: routes?.length ?? 0, icon: Navigation, color: 'bg-blue-50 text-blue-600' },
          { label: 'Vehicles', value: vehicles?.length ?? 0, icon: Bus, color: 'bg-green-50 text-green-600' },
          { label: 'Students', value: studentTransport?.length ?? 0, icon: Users, color: 'bg-purple-50 text-purple-600' },
        ].map(s => (
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

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['routes', 'vehicles', 'students'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-md text-sm font-medium capitalize transition',
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {t}
          </button>
        ))}
      </div>

      {/* Routes tab */}
      {tab === 'routes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Route list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">All Routes</div>
            <div className="divide-y divide-gray-50">
              {routesLoading ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : routes?.map((r: any) => (
                <button key={r.id} onClick={() => setSelectedRouteId(r.id)}
                  className={cn('w-full text-left px-4 py-3 hover:bg-gray-50 transition',
                    selectedRouteId === r.id && 'bg-blue-50 border-r-2 border-blue-600')}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{r.name}</p>
                    <span className="text-xs text-gray-400">{r.stopCount} stops</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{r.startPoint} → {r.endPoint}</p>
                  {r.feeMonthly && <p className="text-xs text-blue-600 mt-0.5">₹{r.feeMonthly}/month</p>}
                </button>
              ))}
              {!routes?.length && !routesLoading && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No routes added yet</div>
              )}
            </div>
          </div>

          {/* Route detail */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {!selectedRouteId ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <MapPin className="w-12 h-12 mb-3 opacity-30" />
                <p>Select a route to view stops</p>
              </div>
            ) : routeDetail ? (
              <div>
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">{routeDetail.name}</h3>
                  <p className="text-sm text-gray-400">{routeDetail.startPoint} → {routeDetail.endPoint} · {routeDetail.distanceKm}km</p>
                </div>
                <div className="p-5">
                  <div className="relative">
                    {routeDetail.stops?.map((stop: any, i: number) => (
                      <div key={stop.id} className="flex gap-4 mb-4">
                        <div className="flex flex-col items-center">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                            i === 0 ? 'bg-green-500 text-white' :
                            i === routeDetail.stops.length - 1 ? 'bg-red-500 text-white' :
                            'bg-blue-100 text-blue-700')}>
                            {i + 1}
                          </div>
                          {i < routeDetail.stops.length - 1 && (
                            <div className="w-0.5 h-8 bg-gray-200 mt-1" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium text-gray-900">{stop.name}</p>
                          {stop.arrivalTime && <p className="text-xs text-gray-400">{stop.arrivalTime}</p>}
                        </div>
                      </div>
                    ))}
                    {!routeDetail.stops?.length && (
                      <p className="text-sm text-gray-400">No stops added for this route</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Vehicles tab */}
      {tab === 'vehicles' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {vehiclesLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Registration', 'Type', 'Capacity', 'Driver', 'Phone', 'GPS'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehicles?.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium font-mono">{v.registration}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.vehicleType}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.capacity} seats</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.driverName ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.driverPhone ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full', v.gpsDeviceId ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {v.gpsDeviceId ? 'Connected' : 'No GPS'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!vehicles?.length && !vehiclesLoading && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No vehicles added yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Students tab */}
      {tab === 'students' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <select
              value={selectedRouteId}
              onChange={e => setSelectedRouteId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Routes</option>
              {routes?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {stLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Student', 'Route', 'Stop', 'Vehicle', 'Pickup', 'Drop'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {studentTransport?.map((st: any) => (
                  <tr key={st.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{st.studentName}</p>
                      <p className="text-xs text-gray-400">{st.admissionNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{st.route}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{st.stop ?? '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{st.vehicle ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{st.pickupTime ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{st.dropTime ?? '-'}</td>
                  </tr>
                ))}
                {!studentTransport?.length && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No student transport assignments</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add vehicle modal */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Add Vehicle</h3>
            <div className="space-y-3">
              {[
                { label: 'Registration No', key: 'registration', placeholder: 'MH12AB1234' },
                { label: 'Driver Name', key: 'driverName', placeholder: 'Full name' },
                { label: 'Driver Phone', key: 'driverPhone', placeholder: '9876543210' },
                { label: 'Driver License', key: 'driverLicense', placeholder: 'License number' },
                { label: 'GPS Device ID', key: 'gpsDeviceId', placeholder: 'Optional' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-gray-700">{f.label}</label>
                  <input
                    value={(vehicleForm as any)[f.key]}
                    onChange={e => setVehicleForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select value={vehicleForm.vehicleType} onChange={e => setVehicleForm(p => ({ ...p, vehicleType: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                    {['Bus', 'Mini Bus', 'Van', 'Auto'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Capacity</label>
                  <input type="number" value={vehicleForm.capacity}
                    onChange={e => setVehicleForm(p => ({ ...p, capacity: Number(e.target.value) }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddVehicle(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => addVehicleMutation.mutate()}
                disabled={addVehicleMutation.isPending || !vehicleForm.registration}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                {addVehicleMutation.isPending ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
