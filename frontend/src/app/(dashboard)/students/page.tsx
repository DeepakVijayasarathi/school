'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { studentsApi, schoolApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import { Plus, Search, Download, Users, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import type { StudentList } from '@/types'

const STATUS_STYLE: Record<string, string> = {
  active:      'badge badge-active',
  inactive:    'badge badge-inactive',
  transferred: 'badge badge-draft',
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <div className="skeleton h-3 w-28 rounded-md" />
            <div className="skeleton h-2.5 w-20 rounded-md" />
          </div>
        </div>
      </td>
      {[24, 20, 14].map(w => (
        <td key={w} className="px-5 py-3.5 hidden sm:table-cell">
          <div className={`skeleton h-3 w-${w} rounded-md`} />
        </td>
      ))}
      <td className="px-5 py-3.5"><div className="skeleton h-5 w-16 rounded-full" /></td>
      <td className="px-5 py-3.5"><div className="skeleton h-3 w-8 rounded-md" /></td>
    </tr>
  )
}

function SelectFilter({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="input-base focus-ring"
      style={{ width: 'auto', minWidth: '120px' }}
    >
      {children}
    </select>
  )
}

export default function StudentsPage() {
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [status, setStatus]   = useState('')

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolApi.getClasses().then(r => r.data),
    staleTime: 300_000,
  })

  const { data: sections } = useQuery({
    queryKey: ['sections', classId],
    queryFn: () => schoolApi.getSections(classId).then(r => r.data),
    enabled: !!classId,
    staleTime: 300_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, classId, sectionId, status],
    queryFn: () =>
      studentsApi.list({ page, pageSize: 20, search: search || undefined, classId: classId || undefined, sectionId: sectionId || undefined, status: status || undefined })
        .then(r => r.data),
    placeholderData: prev => prev,
    staleTime: 60_000,
  })

  const totalPages = data?.totalPages ?? 1
  const startItem  = (page - 1) * 20 + 1
  const endItem    = Math.min(page * 20, data?.totalCount ?? 0)

  const pageNumbers = (() => {
    const total = Math.min(totalPages, 5)
    let start = 1
    if (totalPages > 5) {
      if (page <= 3) start = 1
      else if (page >= totalPages - 2) start = totalPages - 4
      else start = page - 2
    }
    return Array.from({ length: total }, (_, i) => start + i)
  })()

  return (
    <div className="space-y-5 anim-fade-up">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>Students</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            {data?.totalCount != null
              ? `${data.totalCount.toLocaleString()} students enrolled`
              : 'Loading…'}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="btn btn-secondary gap-2">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <Link href="/students/new" className="btn btn-primary gap-2">
            <Plus className="w-3.5 h-3.5" />
            Add Student
          </Link>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="card p-3.5 flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'var(--text-4)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or admission no…"
            className="input-base focus-ring"
            style={{ paddingLeft: '2.1rem' }}
          />
        </div>

        <SelectFilter value={classId} onChange={v => { setClassId(v); setSectionId(''); setPage(1) }}>
          <option value="">All Classes</option>
          {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectFilter>

        {classId && (
          <SelectFilter value={sectionId} onChange={v => { setSectionId(v); setPage(1) }}>
            <option value="">All Sections</option>
            {sections?.map((s: any) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
          </SelectFilter>
        )}

        <SelectFilter value={status} onChange={v => { setStatus(v); setPage(1) }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="transferred">Transferred</option>
        </SelectFilter>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th className="table-header text-left">Student</th>
                <th className="table-header text-left hidden sm:table-cell">Admission No</th>
                <th className="table-header text-left hidden sm:table-cell">Class</th>
                <th className="table-header text-left hidden md:table-cell">Gender</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : data?.items?.length
                  ? data.items.map((student: StudentList) => {
                      const initial = student.fullName?.[0]?.toUpperCase() ?? '?'
                      return (
                        <tr key={student.id} className="table-row-hover transition-colors">
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                                style={{ background: 'var(--brand-bg)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                                  {student.fullName}
                                </p>
                                <p className="text-[11px]" style={{ color: 'var(--text-4)' }}>
                                  DOB: {formatDate(student.dateOfBirth)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell hidden sm:table-cell">
                            <span className="font-mono text-[12px] px-2 py-0.5 rounded-md"
                              style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                              {student.admissionNumber}
                            </span>
                          </td>
                          <td className="table-cell hidden sm:table-cell text-[13px]" style={{ color: 'var(--text-2)' }}>
                            {student.className && (
                              <>
                                {student.className}
                                {student.sectionName && <span style={{ color: 'var(--text-4)' }}> — {student.sectionName}</span>}
                                {student.rollNumber  && <span className="text-[11px] ml-1" style={{ color: 'var(--text-4)' }}>#{student.rollNumber}</span>}
                              </>
                            )}
                          </td>
                          <td className="table-cell hidden md:table-cell text-[13px] capitalize" style={{ color: 'var(--text-2)' }}>
                            {student.gender}
                          </td>
                          <td className="table-cell">
                            <span className={cn(STATUS_STYLE[student.status?.toLowerCase()] ?? 'badge badge-draft')}>
                              {student.status}
                            </span>
                          </td>
                          <td className="table-cell">
                            <Link href={`/students/${student.id}`}
                              className="text-[12px] font-semibold transition-colors hover:underline underline-offset-2"
                              style={{ color: 'var(--brand)' }}>
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  : (
                    <tr>
                      <td colSpan={6} className="px-5 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <Users className="w-6 h-6" style={{ color: 'var(--text-4)' }} />
                          </div>
                          <div>
                            <p className="text-[14px] font-semibold" style={{ color: 'var(--text-2)' }}>No students found</p>
                            <p className="text-[12px] mt-1" style={{ color: 'var(--text-4)' }}>
                              {search || classId || status
                                ? 'Try adjusting your filters'
                                : 'Add your first student to get started'}
                            </p>
                          </div>
                          {!search && !classId && !status && (
                            <Link href="/students/new" className="btn btn-primary mt-1 gap-1.5">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <p className="text-[12px] order-2 sm:order-1" style={{ color: 'var(--text-3)' }}>
              Showing <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{startItem}–{endItem}</span>{' '}
              of <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{data.totalCount.toLocaleString()}</span> students
            </p>
            <div className="flex items-center gap-1 order-1 sm:order-2">
              <button
                disabled={!data.hasPreviousPage}
                onClick={() => setPage(p => p - 1)}
                className="btn btn-secondary gap-1"
                style={{ padding: '0.35rem 0.65rem', fontSize: '12px' }}
              >
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>

              {pageNumbers.map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn('w-7 h-7 text-[12px] rounded-lg transition-all font-medium')}
                  style={page === p
                    ? { background: 'var(--brand)', color: '#fff', border: 'none' }
                    : { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                  }
                >
                  {p}
                </button>
              ))}

              <button
                disabled={!data.hasNextPage}
                onClick={() => setPage(p => p + 1)}
                className="btn btn-secondary gap-1"
                style={{ padding: '0.35rem 0.65rem', fontSize: '12px' }}
              >
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
