'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { studentsApi, schoolApi } from '@/lib/api'
import { formatDate, statusColor, cn } from '@/lib/utils'
import { Plus, Search, Download, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { StudentList } from '@/types'

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-full" />
          <div className="space-y-1.5">
            <div className="skeleton h-3.5 w-28 rounded" />
            <div className="skeleton h-2.5 w-20 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-24 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-20 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-14 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-5 w-16 rounded-full" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-8 rounded" /></td>
    </tr>
  )
}

export default function StudentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [status, setStatus] = useState('')

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolApi.getClasses().then((r) => r.data),
  })

  const { data: sections } = useQuery({
    queryKey: ['sections', classId],
    queryFn: () => schoolApi.getSections(classId).then((r) => r.data),
    enabled: !!classId,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, classId, sectionId, status],
    queryFn: () =>
      studentsApi.list({ page, pageSize: 20, search: search || undefined, classId: classId || undefined, sectionId: sectionId || undefined, status: status || undefined })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const totalPages = data?.totalPages ?? 1
  const startItem = (page - 1) * 20 + 1
  const endItem = Math.min(page * 20, data?.totalCount ?? 0)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {data?.totalCount ? `${data.totalCount.toLocaleString()} students enrolled` : 'Loading...'}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <Link
            href="/students/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or admission no..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
          />
        </div>

        <select
          value={classId}
          onChange={(e) => { setClassId(e.target.value); setSectionId(''); setPage(1) }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-white text-gray-700"
        >
          <option value="">All Classes</option>
          {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {classId && (
          <select
            value={sectionId}
            onChange={(e) => { setSectionId(e.target.value); setPage(1) }}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-white text-gray-700"
          >
            <option value="">All Sections</option>
            {sections?.map((s: any) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
          </select>
        )}

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-white text-gray-700"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="transferred">Transferred</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Admission No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Gender</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : data?.items?.length
                  ? data.items.map((student: StudentList) => (
                    <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0 border border-blue-100">
                            {student.fullName?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{student.fullName}</p>
                            <p className="text-xs text-gray-400">
                              DOB: {formatDate(student.dateOfBirth)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                          {student.admissionNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {student.className && (
                          <span>{student.className}
                            {student.sectionName && <span className="text-gray-400"> — {student.sectionName}</span>}
                            {student.rollNumber && <span className="text-gray-400 ml-1 text-xs">#{student.rollNumber}</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize hidden sm:table-cell">{student.gender}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', statusColor(student.status))}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/students/${student.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline underline-offset-2"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                  : (
                    <tr>
                      <td colSpan={6} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                            <Users className="w-7 h-7 text-gray-300" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-500">No students found</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {search || classId || status
                                ? 'Try adjusting your filters'
                                : 'Add your first student to get started'}
                            </p>
                          </div>
                          {!search && !classId && !status && (
                            <Link
                              href="/students/new"
                              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Student
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500 order-2 sm:order-1">
              Showing <span className="font-medium text-gray-700">{startItem}–{endItem}</span> of <span className="font-medium text-gray-700">{data.totalCount.toLocaleString()}</span> students
            </p>
            <div className="flex items-center gap-1 order-1 sm:order-2">
              <button
                disabled={!data.hasPreviousPage}
                onClick={() => setPage(page - 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 bg-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-gray-50 hover:enabled:border-gray-300 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const p = totalPages <= 5
                  ? i + 1
                  : page <= 3
                    ? i + 1
                    : page >= totalPages - 2
                      ? totalPages - 4 + i
                      : page - 2 + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 text-sm rounded-lg border transition-all',
                      page === p
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    )}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                disabled={!data.hasNextPage}
                onClick={() => setPage(page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 bg-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-gray-50 hover:enabled:border-gray-300 transition-all"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
