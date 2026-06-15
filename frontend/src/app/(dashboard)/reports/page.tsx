'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Users, DollarSign, BookOpen, Bus, Award, UserCheck, TrendingUp, Download, Loader2, BarChart3 } from 'lucide-react'

type ReportType = 'overview' | 'students' | 'attendance' | 'fees' | 'exams' | 'hr' | 'library' | 'transport'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Design-system aligned palette: brand, success, warning, danger, purple, cyan
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ReportsPage() {
  const [report, setReport] = useState<ReportType>('overview')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [attendanceType, setAttendanceType] = useState<'student' | 'staff'>('student')

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['report-overview'],
    queryFn: () => reportsApi.getOverview().then(r => r.data),
    enabled: report === 'overview',
  })

  const { data: studentReport, isLoading: studentLoading } = useQuery({
    queryKey: ['report-students'],
    queryFn: () => reportsApi.getStudentReport({}).then(r => r.data),
    enabled: report === 'students',
  })

  const { data: attendanceReport, isLoading: attendanceLoading } = useQuery({
    queryKey: ['report-attendance', attendanceType, dateRange],
    queryFn: () => reportsApi.getAttendanceReport({
      from: dateRange.from || undefined,
      to: dateRange.to || undefined,
      type: attendanceType,
    }).then(r => r.data),
    enabled: report === 'attendance',
  })

  const { data: feeReport, isLoading: feeLoading } = useQuery({
    queryKey: ['report-fees'],
    queryFn: () => reportsApi.getFeeReport({}).then(r => r.data),
    enabled: report === 'fees',
  })

  const { data: examReport, isLoading: examLoading } = useQuery({
    queryKey: ['report-exams'],
    queryFn: () => reportsApi.getExamReport({}).then(r => r.data),
    enabled: report === 'exams',
  })

  const { data: hrReport, isLoading: hrLoading } = useQuery({
    queryKey: ['report-hr'],
    queryFn: () => reportsApi.getHrReport().then(r => r.data),
    enabled: report === 'hr',
  })

  const { data: libraryReport, isLoading: libraryLoading } = useQuery({
    queryKey: ['report-library'],
    queryFn: () => reportsApi.getLibraryReport().then(r => r.data),
    enabled: report === 'library',
  })

  const { data: transportReport, isLoading: transportLoading } = useQuery({
    queryKey: ['report-transport'],
    queryFn: () => reportsApi.getTransportReport().then(r => r.data),
    enabled: report === 'transport',
  })

  const sidebarItems = [
    { id: 'overview' as ReportType, label: 'Overview', icon: BarChart3 },
    { id: 'students' as ReportType, label: 'Students', icon: Users },
    { id: 'attendance' as ReportType, label: 'Attendance', icon: UserCheck },
    { id: 'fees' as ReportType, label: 'Fee Collection', icon: DollarSign },
    { id: 'exams' as ReportType, label: 'Exam Results', icon: Award },
    { id: 'hr' as ReportType, label: 'HR & Payroll', icon: TrendingUp },
    { id: 'library' as ReportType, label: 'Library', icon: BookOpen },
    { id: 'transport' as ReportType, label: 'Transport', icon: Bus },
  ]

  const isLoading = overviewLoading || studentLoading || attendanceLoading ||
    feeLoading || examLoading || hrLoading || libraryLoading || transportLoading

  return (
    <div className="flex gap-5 h-full anim-fade-up">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0">
        <div className="card overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Reports</h2>
          </div>
          <nav className="p-2 space-y-0.5">
            {sidebarItems.map(item => (
              <button key={item.id} onClick={() => setReport(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition text-left"
                style={report === item.id
                  ? { background: 'var(--brand)', color: '#fff' }
                  : { color: 'var(--text-2)', background: 'transparent' }}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
              {sidebarItems.find(i => i.id === report)?.label} Report
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Analytics and insights</p>
          </div>
          <button className="btn btn-ghost flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--brand)' }} />
          </div>
        )}

        {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
        {report === 'overview' && overview && !overviewLoading && (
          <div className="space-y-5">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Students', value: overview.totalStudents, color: 'var(--brand)', bg: 'var(--brand-bg)' },
                { label: 'Total Employees', value: overview.totalEmployees, color: 'var(--brand)', bg: 'var(--brand-bg)' },
                { label: 'Fee This Month', value: formatCurrency(overview.feeCollectedThisMonth), color: 'var(--success)', bg: 'var(--success-bg)' },
                { label: 'Outstanding', value: formatCurrency(overview.totalOutstanding), color: 'var(--danger)', bg: 'var(--danger-bg)' },
              ].map(k => (
                <div key={k.label} className="rounded-2xl p-5" style={{ background: k.bg }}>
                  <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{k.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Today's attendance */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Today's Attendance</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={overview.todayAttendance?.map((d: any) => ({ name: d.status, value: d.count }))}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {overview.todayAttendance?.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Gender distribution */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Student Gender Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={overview.genderDistribution?.map((d: any) => ({ name: d.gender, count: d.count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── STUDENTS ────────────────────────────────────────────────────────── */}
        {report === 'students' && studentReport && !studentLoading && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {studentReport.byStatus?.map((s: any) => (
                <div key={s.status} className="card p-5">
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{s.count}</p>
                  <p className="text-sm mt-1 capitalize" style={{ color: 'var(--text-3)' }}>{s.status} students</p>
                </div>
              ))}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Monthly Admissions (Last 12 Months)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={studentReport.monthlyAdmissions?.map((d: any) => ({
                  name: `${MONTHS[d.month - 1]} ${d.year}`, count: d.count
                }))}>
                  <defs>
                    <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke={CHART_COLORS[0]} fill="url(#admGrad)" strokeWidth={2} name="Admissions" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ───────────────────────────────────────────────────────── */}
        {report === 'attendance' && !attendanceLoading && (
          <div className="space-y-5">
            {/* Controls */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                {(['student', 'staff'] as const).map(t => (
                  <button key={t} onClick={() => setAttendanceType(t)}
                    className="px-3 py-1.5 rounded-md text-sm font-medium capitalize transition"
                    style={attendanceType === t
                      ? { background: 'var(--surface)', color: 'var(--text-1)', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
                      : { color: 'var(--text-3)' }}>
                    {t}
                  </button>
                ))}
              </div>
              <input type="date" value={dateRange.from}
                onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
                className="input-base focus-ring px-3 py-1.5" />
              <span className="self-center" style={{ color: 'var(--text-4)' }}>to</span>
              <input type="date" value={dateRange.to}
                onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
                className="input-base focus-ring px-3 py-1.5" />
            </div>

            {attendanceReport && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Records', value: attendanceReport.total, color: 'var(--brand)', bg: 'var(--brand-bg)' },
                    { label: 'Present', value: attendanceReport.presentCount, color: 'var(--success)', bg: 'var(--success-bg)' },
                    { label: 'Attendance Rate', value: `${attendanceReport.attendanceRate}%`, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-5" style={{ background: s.bg }}>
                      <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Daily chart */}
                <div className="card p-5">
                  <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Daily Attendance Breakdown</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={Object.entries(
                      attendanceReport.daily?.reduce((acc: any, d: any) => {
                        const key = d.date
                        if (!acc[key]) acc[key] = { date: key }
                        acc[key][d.status] = d.count
                        return acc
                      }, {}) ?? {}
                    ).map(([_, v]) => v)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Present" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="Absent" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="Leave" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── FEE REPORT ───────────────────────────────────────────────────────── */}
        {report === 'fees' && feeReport && !feeLoading && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: 'var(--success-bg)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{formatCurrency(feeReport.totalCollected)}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--success)' }}>Total Collected (period)</p>
              </div>
              <div className="rounded-2xl p-5" style={{ background: 'var(--danger-bg)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>{formatCurrency(feeReport.totalOutstanding)}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--danger)' }}>Total Outstanding</p>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Monthly Fee Collection (Last 12 Months)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={feeReport.monthlyCollection?.map((d: any) => ({
                  name: `${MONTHS[d.month - 1]} ${d.year}`,
                  collected: d.collected,
                  transactions: d.transactions,
                }))}>
                  <defs>
                    <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="collected" stroke={CHART_COLORS[1]} fill="url(#feeGrad)" strokeWidth={2} name="Collected" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Payment Method Breakdown</h3>
              <div className="grid grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={feeReport.byMethod?.map((d: any) => ({ name: d.method, value: Number(d.amount) }))}
                      cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name }) => name}>
                      {feeReport.byMethod?.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {feeReport.byMethod?.map((m: any, i: number) => (
                    <div key={m.method} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-sm" style={{ color: 'var(--text-2)' }}>{m.method}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{formatCurrency(m.amount)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>{m.count} txns</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EXAM REPORT ────────────────────────────────────────────────────── */}
        {report === 'exams' && examReport && !examLoading && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Passed', value: examReport.passCount, color: 'var(--success)', bg: 'var(--success-bg)' },
                { label: 'Failed', value: examReport.failCount, color: 'var(--danger)', bg: 'var(--danger-bg)' },
                { label: 'Pass Rate', value: `${examReport.passRate}%`, color: 'var(--brand)', bg: 'var(--brand-bg)' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-5" style={{ background: s.bg }}>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Grade distribution */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Grade Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={examReport.gradeDist?.map((d: any) => ({ grade: d.grade, count: d.count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS[4]} radius={[6, 6, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Score distribution */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Score Distribution (%)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={examReport.scoreBuckets?.map((d: any) => ({
                    range: `${d.rangeStart}-${d.rangeStart + 9}%`, count: d.count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── HR REPORT ────────────────────────────────────────────────────────── */}
        {report === 'hr' && hrReport && !hrLoading && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {hrReport.byStatus?.map((s: any) => (
                <div key={s.status} className="card p-5">
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{s.count}</p>
                  <p className="text-sm mt-1 capitalize" style={{ color: 'var(--text-3)' }}>{s.status} employees</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* By department */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Staff by Department</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hrReport.byDept} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 6, 6, 0]} name="Employees" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Payroll trend */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Payroll Trend (Net)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={hrReport.payrollTrend?.map((p: any) => ({
                    name: `${MONTHS[p.month - 1]} ${p.year}`, net: p.totalNet, gross: p.totalGross
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="net" stroke={CHART_COLORS[1]} strokeWidth={2} name="Net Salary" />
                    <Line type="monotone" dataKey="gross" stroke={CHART_COLORS[0]} strokeWidth={2} strokeDasharray="5 5" name="Gross Salary" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By employment type */}
            <div className="card p-5">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--text-1)' }}>By Employment Type</h3>
              <div className="flex gap-4">
                {hrReport.byType?.map((t: any, i: number) => (
                  <div key={t.type} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                    <span className="text-sm" style={{ color: 'var(--text-2)' }}>{t.type}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LIBRARY REPORT ────────────────────────────────────────────────────── */}
        {report === 'library' && libraryReport && !libraryLoading && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Titles', value: libraryReport.totalBooks, color: 'var(--brand)', bg: 'var(--brand-bg)' },
                { label: 'Total Copies', value: libraryReport.totalCopies, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
                { label: 'Currently Issued', value: libraryReport.issued, color: 'var(--warning)', bg: 'var(--warning-bg)' },
                { label: 'Overdue', value: libraryReport.overdue, color: 'var(--danger)', bg: 'var(--danger-bg)' },
                { label: 'Fine Collected', value: formatCurrency(libraryReport.fineCollected), color: 'var(--success)', bg: 'var(--success-bg)' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TRANSPORT REPORT ──────────────────────────────────────────────────── */}
        {report === 'transport' && transportReport && !transportLoading && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Routes', value: transportReport.routes, color: 'var(--brand)', bg: 'var(--brand-bg)' },
                { label: 'Vehicles', value: transportReport.vehicles, color: 'var(--success)', bg: 'var(--success-bg)' },
                { label: 'Students Using Transport', value: transportReport.studentsUsingTransport, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-5" style={{ background: s.bg }}>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Students per Route</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={transportReport.byRoute?.map((r: any) => ({ routeId: r.routeId.slice(0, 8), students: r.studentCount }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="routeId" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="students" fill={CHART_COLORS[5]} radius={[6, 6, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
