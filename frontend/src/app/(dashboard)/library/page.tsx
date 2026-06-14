'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { libraryApi, studentsApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Search, BookOpen, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react'

const ISSUE_DAYS = 14

export default function LibraryPage() {
  const [tab, setTab] = useState<'books' | 'issues' | 'return'>('books')
  const [search, setSearch] = useState('')
  const [issuingBookId, setIssuingBookId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const [returnId, setReturnId] = useState('')
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['library-stats'],
    queryFn: () => libraryApi.getStats().then(r => r.data),
  })

  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['books', search],
    queryFn: () => libraryApi.getBooks({ search: search || undefined, pageSize: 50 }).then(r => r.data),
    enabled: tab === 'books',
  })

  const { data: activeIssues, isLoading: issuesLoading } = useQuery({
    queryKey: ['active-issues'],
    queryFn: () => libraryApi.getActiveIssues().then(r => r.data),
    enabled: tab === 'issues' || tab === 'return',
  })

  const { data: studentSearch_results } = useQuery({
    queryKey: ['students-search', studentSearch],
    queryFn: () => studentsApi.list({ search: studentSearch, pageSize: 8 }).then(r => r.data),
    enabled: studentSearch.length > 2,
  })

  const issueMutation = useMutation({
    mutationFn: () => libraryApi.issueBook({
      bookId: issuingBookId,
      studentId: selectedStudentId,
      dueDate: new Date(Date.now() + ISSUE_DAYS * 86400000).toISOString().split('T')[0],
    }),
    onSuccess: () => {
      toast.success(`Book issued to ${selectedStudentName}`)
      setIssuingBookId('')
      setSelectedStudentId('')
      setSelectedStudentName('')
      setStudentSearch('')
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['active-issues'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
    },
  })

  const returnMutation = useMutation({
    mutationFn: (issueId: string) => libraryApi.returnBook(issueId),
    onSuccess: (data) => {
      toast.success(data.data.fineAmount > 0
        ? `Book returned. Fine: ₹${data.data.fineAmount}`
        : 'Book returned successfully')
      qc.invalidateQueries({ queryKey: ['active-issues'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
    },
  })

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Library</h1>
          <p className="text-gray-500 text-sm">Book management and issue/return</p>
        </div>
        {tab === 'books' && (
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Book
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Titles', value: stats.totalBooks, color: 'bg-blue-50 text-blue-700' },
            { label: 'Total Copies', value: stats.totalCopies, color: 'bg-indigo-50 text-indigo-700' },
            { label: 'Available', value: stats.available, color: 'bg-green-50 text-green-700' },
            { label: 'Issued', value: stats.issued, color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Overdue', value: stats.overdue, color: 'bg-red-50 text-red-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['books', 'issues', 'return'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-md text-sm font-medium capitalize transition',
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
          >
            {t === 'return' ? 'Return Book' : t}
          </button>
        ))}
      </div>

      {/* Books tab */}
      {tab === 'books' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, author, ISBN..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {booksLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Book', 'Author', 'Category', 'Rack', 'Copies', 'Available', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {books?.items?.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-10 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{b.title}</p>
                          <p className="text-xs text-gray-400">{b.isbn ?? b.barcode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.author ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.category ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.rackNumber ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.totalCopies}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-semibold', b.availableCopies > 0 ? 'text-green-600' : 'text-red-500')}>
                        {b.availableCopies}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setIssuingBookId(issuingBookId === b.id ? '' : b.id)}
                        disabled={b.availableCopies === 0}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Issue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Issue panel */}
          {issuingBookId && (
            <div className="border-t border-gray-100 p-4 bg-blue-50">
              <p className="text-sm font-medium text-blue-800 mb-3">Select student to issue book</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search student..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white"
                  />
                </div>
                {selectedStudentId && (
                  <button
                    onClick={() => issueMutation.mutate()}
                    disabled={issueMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-60"
                  >
                    {issueMutation.isPending ? 'Issuing...' : `Issue to ${selectedStudentName}`}
                  </button>
                )}
              </div>
              {studentSearch_results?.items && studentSearch.length > 2 && !selectedStudentId && (
                <div className="mt-2 bg-white border border-gray-200 rounded-lg divide-y max-h-40 overflow-y-auto">
                  {studentSearch_results.items.map((s: any) => (
                    <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setSelectedStudentName(s.fullName); setStudentSearch('') }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                      {s.fullName} <span className="text-gray-400">· {s.admissionNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Issues tab */}
      {tab === 'issues' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {issuesLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Book', 'Borrower', 'Issue Date', 'Due Date', 'Overdue', 'Fine'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeIssues?.map((issue: any) => (
                  <tr key={issue.id} className={cn('hover:bg-gray-50', issue.isOverdue && 'bg-red-50')}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{issue.book.title}</p>
                      <p className="text-xs text-gray-400">{issue.book.author}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{issue.borrowerName}</p>
                      <p className="text-xs text-gray-400 capitalize">{issue.borrowerType}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(issue.issueDate)}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(issue.dueDate)}</td>
                    <td className="px-4 py-3">
                      {issue.isOverdue ? (
                        <span className="flex items-center gap-1 text-red-600 text-sm">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {issue.overdueDays}d
                        </span>
                      ) : <span className="text-green-600 text-sm">On time</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">
                      {issue.estimatedFine > 0 ? `₹${issue.estimatedFine}` : '-'}
                    </td>
                  </tr>
                ))}
                {!activeIssues?.length && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No active issues</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Return tab */}
      {tab === 'return' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Book', 'Borrower', 'Due Date', 'Overdue', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeIssues?.map((issue: any) => (
                <tr key={issue.id} className={cn('hover:bg-gray-50', issue.isOverdue && 'bg-red-50/50')}>
                  <td className="px-4 py-3 text-sm font-medium">{issue.book.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{issue.borrowerName}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(issue.dueDate)}</td>
                  <td className="px-4 py-3 text-sm">
                    {issue.isOverdue
                      ? <span className="text-red-600 font-medium">{issue.overdueDays}d late · ₹{issue.estimatedFine} fine</span>
                      : <span className="text-green-600">On time</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => returnMutation.mutate(issue.id)}
                      disabled={returnMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Return
                    </button>
                  </td>
                </tr>
              ))}
              {!activeIssues?.length && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No books currently issued</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
