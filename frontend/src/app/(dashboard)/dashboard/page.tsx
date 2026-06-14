'use client'

import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Users, DollarSign, UserCheck, TrendingUp, TrendingDown,
  ArrowUpRight, AlertCircle, Activity, Sparkles,
  GraduationCap,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { SkeletonMetricCard } from '@/components/ui/SkeletonCard'

// ── Custom tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#cbd5e1' }}>{p.name}:</span>
          <span style={{ color: 'white', fontWeight: 700 }}>{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, trend, trendLabel, gradient, icon: Icon, delay = 0 }: {
  label: string; value: string | number; sub?: string
  trend?: 'up' | 'down'; trendLabel?: string
  gradient: string; icon: any; delay?: number
}) {
  return (
    <div
      className={cn('relative rounded-2xl p-5 overflow-hidden text-white cursor-default animate-fade-in-up', gradient)}
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 8px 28px rgba(0,0,0,0.18)', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.22)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.18)' }}
    >
      {/* Background circles */}
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute right-4 bottom-2 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trendLabel && (
            <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-white/15">
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trendLabel}
            </div>
          )}
        </div>
        <div className="animate-number-pop" style={{ animationDelay: `${delay + 100}ms` }}>
          <p className="text-3xl font-bold tracking-tight leading-none">{value}</p>
          <p className="text-sm text-white/70 font-medium mt-1.5">{label}</p>
          {sub && <p className="text-xs text-white/45 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['report-overview'],
    queryFn: () => reportsApi.getOverview().then(r => r.data),
  })

  const { data: attendanceReport } = useQuery({
    queryKey: ['report-attendance-dash'],
    queryFn: () => reportsApi.getAttendanceReport({ type: 'student' }).then(r => r.data),
  })

  const { data: feeReport } = useQuery({
    queryKey: ['report-fees-dash'],
    queryFn: () => reportsApi.getFeeReport({}).then(r => r.data),
  })

  // Build 7-day attendance chart data
  const weeklyAttendance = (() => {
    const map: Record<string, any> = {}
    for (const d of attendanceReport?.daily ?? []) {
      if (!map[d.date]) map[d.date] = { date: d.date }
      map[d.date][d.status] = d.count
    }
    return Object.values(map)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .slice(-7)
      .map((d: any) => ({
        ...d,
        day: new Date(d.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }),
      }))
  })()

  // 6-month fee bar chart
  const monthlyFee = (feeReport?.monthlyCollection ?? []).slice(-6).map((d: any) => ({
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.month - 1],
    collected: d.collected,
  }))

  // Donut data
  const collected   = feeReport?.totalCollected ?? 0
  const outstanding = feeReport?.totalOutstanding ?? 0
  const feeDonut    = [
    { name: 'Collected',    value: collected    },
    { name: 'Outstanding',  value: outstanding  },
  ]
  const DONUT_COLORS = ['#10b981', '#f43f5e']

  const todayPresent = overview?.todayAttendance?.find((d: any) => d.status === 'Present')?.count ?? 0
  const todayAbsent  = overview?.todayAttendance?.find((d: any) => d.status === 'Absent')?.count ?? 0
  const todayTotal   = todayPresent + todayAbsent
  const todayRate    = todayTotal > 0 ? Math.round(todayPresent / todayTotal * 100) : 0

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 max-w-screen-xl pb-6">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-400" style={{ animation: 'float 3s ease-in-out infinite' }} />
            <span className="text-sm text-gray-400">{todayStr}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()},{' '}
            <span className="gradient-text">{user?.fullName?.split(' ')[0] ?? 'Admin'}</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Here's what's happening in your school today.</p>
        </div>

        <div className="flex gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 text-center" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <p className="text-2xl font-bold text-gray-900">{todayRate}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Attendance Today</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 text-center" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <p className="text-2xl font-bold text-gray-900">{overview?.totalStudents ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">Students Enrolled</p>
          </div>
        </div>
      </div>

      {/* ── Metric cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading ? (
          <>
            <SkeletonMetricCard />
            <SkeletonMetricCard />
            <SkeletonMetricCard />
            <SkeletonMetricCard />
          </>
        ) : (
          <>
            <MetricCard label="Total Students"   value={overview?.totalStudents ?? '—'}          sub="Across all classes"     trend="up"   trendLabel="+12%"             gradient="gradient-blue"   icon={GraduationCap} delay={0}   />
            <MetricCard label="Fee Collected"    value={formatCurrency(overview?.feeCollectedThisMonth ?? 0)} sub="This month" trend="up"   trendLabel="+8%"              gradient="gradient-green"  icon={DollarSign}    delay={75}  />
            <MetricCard label="Present Today"    value={`${todayRate}%`}                          sub={`${todayPresent} of ${todayTotal} students`} trend={todayRate >= 75 ? 'up' : 'down'} trendLabel={`${todayPresent} present`} gradient="gradient-purple" icon={UserCheck} delay={150} />
            <MetricCard label="Outstanding Dues" value={formatCurrency(overview?.totalOutstanding ?? 0)}     sub="Pending fee dues"      trend="down" trendLabel="Needs action"        gradient="gradient-rose"   icon={AlertCircle}   delay={225} />
          </>
        )}
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Attendance area chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up delay-200" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-900 text-base">Attendance Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 7 days breakdown</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Present</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Absent</span>
            </div>
          </div>
          {weeklyAttendance.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={weeklyAttendance} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Present" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gP)" name="Present" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Absent"  stroke="#f43f5e" strokeWidth={2}   fill="url(#gA)" name="Absent"  dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[210px] flex flex-col items-center justify-center gap-2 text-gray-300">
              <Activity className="w-10 h-10" />
              <p className="text-sm">No attendance data yet</p>
            </div>
          )}
        </div>

        {/* Fee donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up delay-300" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 className="font-bold text-gray-900 text-base mb-1">Fee Status</h2>
          <p className="text-xs text-gray-400 mb-5">Total collection overview</p>

          <div className="relative">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={feeDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={68}
                  dataKey="value" strokeWidth={0} paddingAngle={4}>
                  {feeDonut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {collected + outstanding > 0 ? Math.round(collected / (collected + outstanding) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-400">paid</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 mt-5">
            {[
              { label: 'Collected', value: formatCurrency(collected), color: '#10b981', bg: 'bg-emerald-50 text-emerald-600' },
              { label: 'Outstanding', value: formatCurrency(outstanding), color: '#f43f5e', bg: 'bg-rose-50 text-rose-600' },
            ].map(item => (
              <div key={item.label} className={cn('flex items-center justify-between rounded-xl px-3 py-2', item.bg)}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
                <span className="text-xs font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Monthly bar chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up delay-300" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 className="font-bold text-gray-900 text-base mb-1">Monthly Fee Collections</h2>
          <p className="text-xs text-gray-400 mb-5">Revenue over the last 6 months</p>
          {monthlyFee.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={monthlyFee} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={32}>
                <defs>
                  <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="collected" fill="url(#bG)" radius={[8, 8, 0, 0]} name="Collected" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[170px] flex items-center justify-center text-gray-300">
              <p className="text-sm">No fee data yet</p>
            </div>
          )}
        </div>

        {/* School stats panel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up delay-400" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 className="font-bold text-gray-900 text-base mb-4">School Overview</h2>
          <StatRowAlt icon={GraduationCap} bg="bg-blue-50 text-blue-500"    title="Students"   value={overview?.totalStudents ?? '—'} />
          <StatRowAlt icon={Users}         bg="bg-violet-50 text-violet-500" title="Staff"      value={overview?.totalEmployees ?? '—'} />
          <StatRowAlt icon={UserCheck}     bg="bg-emerald-50 text-emerald-500" title="Present today" value={`${todayPresent}`} valueColor="text-emerald-600" />
          <StatRowAlt icon={AlertCircle}   bg="bg-rose-50 text-rose-500"     title="Absent today"   value={`${todayAbsent}`}  valueColor="text-rose-600" />
          <StatRowAlt icon={DollarSign}    bg="bg-green-50 text-green-500"   title="This month fees" value={formatCurrency(overview?.feeCollectedThisMonth ?? 0)} valueColor="text-green-700" />
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────────── */}
      <div className="animate-fade-in-up delay-400">
        <p className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Add Student',     href: '/students/new', from: 'from-blue-500',   to: 'to-indigo-600',  icon: GraduationCap },
            { label: 'Mark Attendance', href: '/attendance',   from: 'from-emerald-500',to: 'to-teal-600',    icon: UserCheck },
            { label: 'Collect Fee',     href: '/fees',         from: 'from-violet-500', to: 'to-purple-600',  icon: DollarSign },
            { label: 'View Reports',    href: '/reports',      from: 'from-orange-500', to: 'to-amber-500',   icon: TrendingUp },
          ].map(a => (
            <a key={a.href} href={a.href}
              className="group flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all duration-200 cursor-pointer"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm', a.from, a.to)}>
                <a.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 flex-1">{a.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-blue-400 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatRowAlt({ icon: Icon, bg, title, value, valueColor = 'text-gray-900' }: any) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm text-gray-500 flex-1">{title}</span>
      <span className={cn('text-sm font-bold', valueColor)}>{value}</span>
    </div>
  )
}
