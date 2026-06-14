'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { studentsApi, schoolApi } from '@/lib/api'
import { formatDate, statusColor, cn } from '@/lib/utils'
import { Plus, Search, Filter, Download, UserCircle } from 'lucide-react'
import Link from 'next/link'
import type { StudentList } from '@/types'

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm">{data?.totalCount ?? 0} students total</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <Link
            href="/students/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Student
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or admission no..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={classId}
          onChange={(e) => { setClassId(e.target.value); setSectionId(''); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Classes</option>
          {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {classId && (
          <select
            value={sectionId}
            onChange={(e) => { setSectionId(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sections</option>
            {sections?.map((s: any) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
          </select>
        )}

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="transferred">Transferred</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admission No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.items?.map((student: StudentList) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm flex-shrink-0">
                        {student.fullName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(student.dateOfBirth)} ({new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear()} yrs)
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.admissionNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.className && `${student.className} - ${student.sectionName}`}
                    {student.rollNumber && <span className="text-gray-400 ml-1">#{student.rollNumber}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.gender}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full capitalize', statusColor(student.status))}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/students/${student.id}`} className="text-blue-600 hover:underline text-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!data?.items?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No students found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.totalCount)} of {data.totalCount}
            </p>
            <div className="flex gap-1">
              <button
                disabled={!data.hasPreviousPage}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                disabled={!data.hasNextPage}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
