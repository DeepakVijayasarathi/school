'use client'

import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Users, DollarSign, UserCheck, TrendingUp,
  ArrowUpRight, AlertCircle, Activity, Sparkles, GraduationCap,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { SkeletonMetricCard } from '@/components/ui/SkeletonCard'

// ── Custom tooltip ─────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', boxShadow: 'var(--shadow-md)' }}>
      <p style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 5 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-2)' }}>{p.name}:</span>
          <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>
            {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </span>
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

// ── Metric card ────────────────────────────────────────────────
function MetricCard({ label, value, sub, trend, trendLabel, gradClass, icon: Icon, delay = 0 }: {
  label: string; value: string | number; sub?: string
  trend?: 'up' | 'down'; trendLabel?: string
  gradClass: string; icon: any; delay?: number
}) {
  return (
    <div
      className={cn('relative rounded-2xl p-5 overflow-hidden text-white cursor-default anim-fade-up card-hover', gradClass)}
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}
    >
      <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute right-3 bottom-2 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trendLabel && (
            <div className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/15">
              {trendLabel}
            </div>
          )}
        </div>
        <p className="text-[28px] font-extrabold tracking-tight leading-none">{value}</p>
        <p className="text-[13px] text-white/75 font-medium mt-1.5">{label}</p>
        {sub && <p className="text-[11px] text-white/45 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Stat row ──────────────────────────────────────────────────
function StatRow({ icon: Icon, iconBg, title, value, valueStyle }: {
  icon: any; iconBg: string; title: string; value: any; valueStyle?: React.CSSProperties
}) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}>
        <Icon className="w-4 h-4" style={{ color: iconBg.replace('1)', '.7)').replace('0.1', '1') }} />
      </div>
      <span className="text-[13px] flex-1" style={{ color: 'var(--text-2)' }}>{title}</span>
      <span className="text-[13px] font-bold" style={valueStyle ?? { color: 'var(--text-1)' }}>{value}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['report-overview'],
    queryFn: () => reportsApi.getOverview().then(r => r.data),
    staleTime: 60_000,
  })

  const { data: attendanceReport } = useQuery({
    queryKey: ['report-attendance-dash'],
    queryFn: () => reportsApi.getAttendanceReport({ type: 'student' }).then(r => r.data),
    staleTime: 60_000,
  })

  const { data: feeReport } = useQuery({
    queryKey: ['report-fees-dash'],
    queryFn: () => reportsApi.getFeeReport({}).then(r => r.data),
    staleTime: 60_000,
  })

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

  const monthlyFee = (feeReport?.monthlyCollection ?? []).slice(-6).map((d: any) => ({
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.month - 1],
    collected: d.collected,
  }))

  const collected   = feeReport?.totalCollected   ?? 0
  const outstanding = feeReport?.totalOutstanding ?? 0
  const feeDonut    = [
    { name: 'Collected',   value: collected   },
    { name: 'Outstanding', value: outstanding },
  ]
  const DONUT_COLORS = ['#10b981', '#f43f5e']

  const todayPresent = overview?.todayAttendance?.find((d: any) => d.status === 'Present')?.count ?? 0
  const todayAbsent  = overview?.todayAttendance?.find((d: any) => d.status === 'Absent')?.count ?? 0
  const todayTotal   = todayPresent + todayAbsent
  const todayRate    = todayTotal > 0 ? Math.round(todayPresent / todayTotal * 100) : 0

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const METRICS = [
    { label: 'Total Students',   value: overview?.totalStudents ?? '—',                          sub: 'Across all classes',    trendLabel: '+12%', gradClass: 'grad-violet',  icon: GraduationCap, delay: 0   },
    { label: 'Fee Collected',    value: formatCurrency(overview?.feeCollectedThisMonth ?? 0),     sub: 'This month',            trendLabel: '+8%',  gradClass: 'grad-emerald', icon: DollarSign,    delay: 75  },
    { label: 'Present Today',    value: `${todayRate}%`,                                          sub: `${todayPresent} of ${todayTotal}`, trendLabel: `${todayPresent}`, gradClass: 'grad-sky', icon: UserCheck, delay: 150 },
    { label: 'Outstanding Dues', value: formatCurrency(overview?.totalOutstanding ?? 0),          sub: 'Pending fee dues',      trendLabel: 'Action needed', gradClass: 'grad-rose', icon: AlertCircle, delay: 225 },
  ]

  return (
    <div className="space-y-6 max-w-screen-xl pb-6">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 anim-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 anim-float" style={{ color: '#f59e0b' }} />
            <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>{todayStr}</span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight leading-tight" style={{ color: 'var(--text-1)' }}>
            {getGreeting()},{' '}
            <span className="text-brand-gradient">{user?.fullName?.split(' ')[0] ?? 'Admin'}</span>
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>
            Here's what's happening in your school today.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="card px-5 py-3 text-center">
            <p className="text-[22px] font-extrabold leading-none" style={{ color: 'var(--text-1)' }}>{todayRate}%</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>Attendance Today</p>
          </div>
          <div className="card px-5 py-3 text-center">
            <p className="text-[22px] font-extrabold leading-none" style={{ color: 'var(--text-1)' }}>{overview?.totalStudents ?? '—'}</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>Students Enrolled</p>
          </div>
        </div>
      </div>

      {/* ── Metric cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading
          ? [0,1,2,3].map(i => <SkeletonMetricCard key={i} />)
          : METRICS.map(m => <MetricCard key={m.label} {...m} />)
        }
      </div>

      {/* ── Charts row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Attendance area */}
        <div className="card xl:col-span-2 p-6 anim-fade-up delay-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-[15px]" style={{ color: 'var(--text-1)' }}>Attendance Trend</h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>Last 7 days breakdown</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#6366f1' }} />Present
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#f43f5e' }} />Absent
              </span>
            </div>
          </div>
          {weeklyAttendance.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyAttendance} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Present" stroke="#6366f1" strokeWidth={2.5} fill="url(#gP)" name="Present" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Absent"  stroke="#f43f5e" strokeWidth={2}   fill="url(#gA)" name="Absent"  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-4)' }}>
              <Activity className="w-9 h-9" />
              <p className="text-[13px]">No attendance data yet</p>
            </div>
          )}
        </div>

        {/* Fee donut */}
        <div className="card p-6 anim-fade-up delay-300">
          <h2 className="font-bold text-[15px]" style={{ color: 'var(--text-1)' }}>Fee Status</h2>
          <p className="text-[12px] mt-0.5 mb-4" style={{ color: 'var(--text-3)' }}>Total collection overview</p>

          <div className="relative">
            <ResponsiveContainer width="100%" height={145}>
              <PieChart>
                <Pie data={feeDonut} cx="50%" cy="50%" innerRadius={48} outerRadius={65}
                  dataKey="value" strokeWidth={0} paddingAngle={4}>
                  {feeDonut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-[20px] font-extrabold" style={{ color: 'var(--text-1)' }}>
                  {collected + outstanding > 0 ? Math.round(collected / (collected + outstanding) * 100) : 0}%
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>paid</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {[
              { label: 'Collected',    value: formatCurrency(collected),   bg: 'var(--success-bg)', color: 'var(--success)' },
              { label: 'Outstanding',  value: formatCurrency(outstanding), bg: 'var(--danger-bg)',  color: 'var(--danger)'  },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ background: item.bg }}>
                <span className="text-[12px] font-medium" style={{ color: item.color }}>{item.label}</span>
                <span className="text-[12px] font-bold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Monthly bar */}
        <div className="card xl:col-span-2 p-6 anim-fade-up delay-300">
          <h2 className="font-bold text-[15px]" style={{ color: 'var(--text-1)' }}>Monthly Fee Collections</h2>
          <p className="text-[12px] mt-0.5 mb-4" style={{ color: 'var(--text-3)' }}>Revenue over last 6 months</p>
          {monthlyFee.length > 0 ? (
            <ResponsiveContainer width="100%" height={165}>
              <BarChart data={monthlyFee} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={28}>
                <defs>
                  <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="collected" fill="url(#bG)" radius={[6, 6, 0, 0]} name="Collected" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[165px] flex items-center justify-center" style={{ color: 'var(--text-4)' }}>
              <p className="text-[13px]">No fee data yet</p>
            </div>
          )}
        </div>

        {/* School overview */}
        <div className="card p-6 anim-fade-up delay-400">
          <h2 className="font-bold text-[15px] mb-3" style={{ color: 'var(--text-1)' }}>School Overview</h2>
          <div className="[&>*:last-child]:border-0">
            <StatRow icon={GraduationCap} iconBg="rgba(99,102,241,.1)"  title="Students"       value={overview?.totalStudents ?? '—'} />
            <StatRow icon={Users}         iconBg="rgba(139,92,246,.1)"  title="Staff"           value={overview?.totalEmployees ?? '—'} />
            <StatRow icon={UserCheck}     iconBg="rgba(16,185,129,.1)"  title="Present today"   value={todayPresent} valueStyle={{ color: 'var(--success)' }} />
            <StatRow icon={AlertCircle}   iconBg="rgba(239,68,68,.1)"   title="Absent today"    value={todayAbsent}  valueStyle={{ color: 'var(--danger)' }} />
            <StatRow icon={DollarSign}    iconBg="rgba(22,163,74,.1)"   title="This month fees" value={formatCurrency(overview?.feeCollectedThisMonth ?? 0)} valueStyle={{ color: 'var(--success)' }} />
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────── */}
      <div className="anim-fade-up delay-400">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Add Student',     href: '/students/new', gradClass: 'grad-violet',  icon: GraduationCap },
            { label: 'Mark Attendance', href: '/attendance',   gradClass: 'grad-emerald', icon: UserCheck },
            { label: 'Collect Fee',     href: '/fees',         gradClass: 'grad-sky',     icon: DollarSign },
            { label: 'View Reports',    href: '/reports',      gradClass: 'grad-amber',   icon: TrendingUp },
          ].map(a => (
            <a key={a.href} href={a.href}
              className="group flex items-center gap-3 p-4 card card-hover cursor-pointer">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-white', a.gradClass)}>
                <a.icon className="w-4 h-4" />
              </div>
              <span className="text-[13px] font-semibold flex-1" style={{ color: 'var(--text-1)' }}>{a.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-colors group-hover:text-[var(--brand)]"
                style={{ color: 'var(--text-4)' }} />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
