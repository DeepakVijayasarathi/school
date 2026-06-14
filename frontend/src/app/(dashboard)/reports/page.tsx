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
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16']

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
    <div className="flex gap-5 h-full">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Reports</h2>
          </div>
          <nav className="p-2 space-y-0.5">
            {sidebarItems.map(item => (
              <button key={item.id} onClick={() => setReport(item.id)}
                className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition text-left',
                  report === item.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
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
            <h1 className="text-2xl font-bold text-gray-900">
              {sidebarItems.find(i => i.id === report)?.label} Report
            </h1>
            <p className="text-gray-500 text-sm">Analytics and insights</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          </div>
        )}

        {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
        {report === 'overview' && overview && !overviewLoading && (
          <div className="space-y-5">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Students', value: overview.totalStudents, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Total Employees', value: overview.totalEmployees, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Fee This Month', value: formatCurrency(overview.feeCollectedThisMonth), color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Outstanding', value: formatCurrency(overview.totalOutstanding), color: 'text-red-600', bg: 'bg-red-50' },
              ].map(k => (
                <div key={k.label} className={`${k.bg} rounded-2xl p-5`}>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{k.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Today's attendance */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Today's Attendance</h3>
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
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Student Gender Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={overview.genderDistribution?.map((d: any) => ({ name: d.gender, count: d.count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
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
                <div key={s.status} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                  <p className="text-sm text-gray-500 mt-1 capitalize">{s.status} students</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Monthly Admissions (Last 12 Months)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={studentReport.monthlyAdmissions?.map((d: any) => ({
                  name: `${MONTHS[d.month - 1]} ${d.year}`, count: d.count
                }))}>
                  <defs>
                    <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#admGrad)" strokeWidth={2} name="Admissions" />
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
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(['student', 'staff'] as const).map(t => (
                  <button key={t} onClick={() => setAttendanceType(t)}
                    className={cn('px-3 py-1.5 rounded-md text-sm font-medium capitalize transition',
                      attendanceType === t ? 'bg-white shadow' : 'text-gray-500')}>
                    {t}
                  </button>
                ))}
              </div>
              <input type="date" value={dateRange.from}
                onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none" />
              <span className="text-gray-400 self-center">to</span>
              <input type="date" value={dateRange.to}
                onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none" />
            </div>

            {attendanceReport && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Records', value: attendanceReport.total, color: 'bg-blue-50 text-blue-700' },
                    { label: 'Present', value: attendanceReport.presentCount, color: 'bg-green-50 text-green-700' },
                    { label: 'Attendance Rate', value: `${attendanceReport.attendanceRate}%`, color: 'bg-purple-50 text-purple-700' },
                  ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-2xl p-5`}>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-sm mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Daily chart */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Daily Attendance Breakdown</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={Object.entries(
                      attendanceReport.daily?.reduce((acc: any, d: any) => {
                        const key = d.date
                        if (!acc[key]) acc[key] = { date: key }
                        acc[key][d.status] = d.count
                        return acc
                      }, {}) ?? {}
                    ).map(([_, v]) => v)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="Leave" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
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
              <div className="bg-green-50 rounded-2xl p-5">
                <p className="text-2xl font-bold text-green-700">{formatCurrency(feeReport.totalCollected)}</p>
                <p className="text-sm text-green-600 mt-1">Total Collected (period)</p>
              </div>
              <div className="bg-red-50 rounded-2xl p-5">
                <p className="text-2xl font-bold text-red-700">{formatCurrency(feeReport.totalOutstanding)}</p>
                <p className="text-sm text-red-600 mt-1">Total Outstanding</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Monthly Fee Collection (Last 12 Months)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={feeReport.monthlyCollection?.map((d: any) => ({
                  name: `${MONTHS[d.month - 1]} ${d.year}`,
                  collected: d.collected,
                  transactions: d.transactions,
                }))}>
                  <defs>
                    <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="collected" stroke="#10b981" fill="url(#feeGrad)" strokeWidth={2} name="Collected" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Payment Method Breakdown</h3>
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
                        <span className="text-sm text-gray-700">{m.method}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(m.amount)}</p>
                        <p className="text-xs text-gray-400">{m.count} txns</p>
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
                { label: 'Passed', value: examReport.passCount, color: 'bg-green-50 text-green-700' },
                { label: 'Failed', value: examReport.failCount, color: 'bg-red-50 text-red-700' },
                { label: 'Pass Rate', value: `${examReport.passRate}%`, color: 'bg-blue-50 text-blue-700' },
              ].map(s => (
                <div key={s.label} className={`${s.color} rounded-2xl p-5`}>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Grade distribution */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Grade Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={examReport.gradeDist?.map((d: any) => ({ grade: d.grade, count: d.count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Score distribution */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Score Distribution (%)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={examReport.scoreBuckets?.map((d: any) => ({
                    range: `${d.rangeStart}-${d.rangeStart + 9}%`, count: d.count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Students" />
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
                <div key={s.status} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                  <p className="text-sm text-gray-500 mt-1 capitalize">{s.status} employees</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* By department */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Staff by Department</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hrReport.byDept} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} name="Employees" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Payroll trend */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Payroll Trend (Net)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={hrReport.payrollTrend?.map((p: any) => ({
                    name: `${MONTHS[p.month - 1]} ${p.year}`, net: p.totalNet, gross: p.totalGross
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} name="Net Salary" />
                    <Line type="monotone" dataKey="gross" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Gross Salary" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By employment type */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-3">By Employment Type</h3>
              <div className="flex gap-4">
                {hrReport.byType?.map((t: any, i: number) => (
                  <div key={t.type} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                    <span className="text-sm text-gray-700">{t.type}</span>
                    <span className="text-sm font-bold text-gray-900">{t.count}</span>
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
                { label: 'Total Titles', value: libraryReport.totalBooks, color: 'bg-blue-50 text-blue-700' },
                { label: 'Total Copies', value: libraryReport.totalCopies, color: 'bg-indigo-50 text-indigo-700' },
                { label: 'Currently Issued', value: libraryReport.issued, color: 'bg-yellow-50 text-yellow-700' },
                { label: 'Overdue', value: libraryReport.overdue, color: 'bg-red-50 text-red-700' },
                { label: 'Fine Collected', value: formatCurrency(libraryReport.fineCollected), color: 'bg-green-50 text-green-700' },
              ].map(s => (
                <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs font-medium mt-0.5">{s.label}</p>
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
                { label: 'Routes', value: transportReport.routes, color: 'bg-blue-50 text-blue-700' },
                { label: 'Vehicles', value: transportReport.vehicles, color: 'bg-green-50 text-green-700' },
                { label: 'Students Using Transport', value: transportReport.studentsUsingTransport, color: 'bg-purple-50 text-purple-700' },
              ].map(s => (
                <div key={s.label} className={`${s.color} rounded-2xl p-5`}>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Students per Route</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={transportReport.byRoute?.map((r: any) => ({ routeId: r.routeId.slice(0, 8), students: r.studentCount }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="routeId" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="students" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
