'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { libraryApi, studentsApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Search, BookOpen, RotateCcw, AlertTriangle, Loader2, X } from 'lucide-react'

const ISSUE_DAYS = 14
const inputCls = 'input-base focus-ring w-full'
const emptyBook = { title: '', author: '', isbn: '', category: '', publisher: '', rackNumber: '', totalCopies: '1', description: '' }

// Stat card bg/color pairs mapped from original Tailwind palettes → CSS vars
const STAT_CONFIGS = [
  { label: 'Total Titles',  key: 'totalBooks',   bg: 'var(--brand-bg)',   color: 'var(--brand)' },
  { label: 'Total Copies', key: 'totalCopies',  bg: 'var(--surface-2)',  color: 'var(--text-2)' },
  { label: 'Available',    key: 'available',    bg: 'var(--success-bg)', color: 'var(--success)' },
  { label: 'Issued',       key: 'issued',       bg: 'var(--warning-bg)', color: 'var(--warning)' },
  { label: 'Overdue',      key: 'overdue',      bg: 'var(--danger-bg)',  color: 'var(--danger)' },
]

export default function LibraryPage() {
  const [tab, setTab] = useState<'books' | 'issues' | 'return'>('books')
  const [search, setSearch] = useState('')
  const [issuingBookId, setIssuingBookId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const [showAddBook, setShowAddBook] = useState(false)
  const [bookForm, setBookForm] = useState({ ...emptyBook })
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

  const addBookMutation = useMutation({
    mutationFn: () => libraryApi.addBook({
      title: bookForm.title,
      author: bookForm.author || undefined,
      isbn: bookForm.isbn || undefined,
      category: bookForm.category || undefined,
      publisher: bookForm.publisher || undefined,
      rackNumber: bookForm.rackNumber || undefined,
      totalCopies: Number(bookForm.totalCopies) || 1,
      description: bookForm.description || undefined,
    }),
    onSuccess: () => {
      toast.success('Book added to library')
      setShowAddBook(false)
      setBookForm({ ...emptyBook })
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['library-stats'] })
    },
    onError: () => toast.error('Failed to add book'),
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
    onError: () => toast.error('Failed to issue book'),
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
    onError: () => toast.error('Failed to return book'),
  })

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Library</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Book management and issue/return</p>
        </div>
        {tab === 'books' && (
          <button onClick={() => setShowAddBook(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add Book
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {STAT_CONFIGS.map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{(stats as any)[s.key]}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-2)' }}>
        {(['books', 'issues', 'return'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-md text-sm font-medium capitalize transition"
            style={tab === t
              ? { background: 'var(--surface)', color: 'var(--text-1)', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }
              : { color: 'var(--text-3)' }}
          >
            {t === 'return' ? 'Return Book' : t}
          </button>
        ))}
      </div>

      {/* Books tab */}
      {tab === 'books' && (
        <div className="card overflow-hidden">
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, author, ISBN..."
                className="input-base focus-ring w-full pl-9"
              />
            </div>
          </div>
          {booksLoading ? (
            <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-4)' }}>
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    {['Book', 'Author', 'Category', 'Rack', 'Copies', 'Available', 'Action'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {books?.items?.map((b: any) => (
                    <tr key={b.id} className="table-row-hover">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-10 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--brand-bg)' }}>
                            <BookOpen className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--text-1)' }}>{b.title}</p>
                            <p className="text-xs" style={{ color: 'var(--text-4)' }}>{b.isbn ?? b.barcode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{b.author ?? '-'}</td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{b.category ?? '-'}</td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{b.rackNumber ?? '-'}</td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{b.totalCopies}</td>
                      <td className="table-cell">
                        <span className="text-sm font-semibold"
                          style={{ color: b.availableCopies > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {b.availableCopies}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => setIssuingBookId(issuingBookId === b.id ? '' : b.id)}
                          disabled={b.availableCopies === 0}
                          className="btn btn-primary px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Issue
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Issue panel */}
          {issuingBookId && (
            <div className="p-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--brand-bg)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--brand)' }}>Select student to issue book</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} />
                  <input
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search student..."
                    className="input-base focus-ring w-full pl-9"
                  />
                </div>
                {selectedStudentId && (
                  <button
                    onClick={() => issueMutation.mutate()}
                    disabled={issueMutation.isPending}
                    className="btn btn-primary px-4 py-2 text-sm disabled:opacity-60"
                    style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                  >
                    {issueMutation.isPending ? 'Issuing...' : `Issue to ${selectedStudentName}`}
                  </button>
                )}
              </div>
              {studentSearch_results?.items && studentSearch.length > 2 && !selectedStudentId && (
                <div className="mt-2 rounded-lg divide-y max-h-40 overflow-y-auto"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {studentSearch_results.items.map((s: any) => (
                    <button key={s.id}
                      onClick={() => { setSelectedStudentId(s.id); setSelectedStudentName(s.fullName); setStudentSearch('') }}
                      className="w-full text-left px-3 py-2 text-sm transition-colors"
                      style={{ color: 'var(--text-1)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      {s.fullName} <span style={{ color: 'var(--text-4)' }}>· {s.admissionNumber}</span>
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
        <div className="card overflow-hidden">
          {issuesLoading ? (
            <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-4)' }}>
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px]">
                <thead>
                  <tr>
                    {['Book', 'Borrower', 'Issue Date', 'Due Date', 'Overdue', 'Fine'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeIssues?.map((issue: any) => (
                    <tr key={issue.id} className={cn('table-row-hover')}
                      style={issue.isOverdue ? { background: 'var(--danger-bg)' } : {}}>
                      <td className="table-cell">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{issue.book.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>{issue.book.author}</p>
                      </td>
                      <td className="table-cell">
                        <p className="text-sm" style={{ color: 'var(--text-1)' }}>{issue.borrowerName}</p>
                        <p className="text-xs capitalize" style={{ color: 'var(--text-4)' }}>{issue.borrowerType}</p>
                      </td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{formatDate(issue.issueDate)}</td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{formatDate(issue.dueDate)}</td>
                      <td className="table-cell">
                        {issue.isOverdue ? (
                          <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--danger)' }}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {issue.overdueDays}d
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--success)' }}>On time</span>
                        )}
                      </td>
                      <td className="table-cell text-sm font-medium" style={{ color: 'var(--danger)' }}>
                        {issue.estimatedFine > 0 ? `₹${issue.estimatedFine}` : '-'}
                      </td>
                    </tr>
                  ))}
                  {!activeIssues?.length && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--text-4)' }}>No active issues</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Return tab */}
      {tab === 'return' && (
        <div className="card overflow-hidden">
          {issuesLoading ? (
            <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-4)' }}>
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr>
                    {['Book', 'Borrower', 'Due Date', 'Overdue', 'Action'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeIssues?.map((issue: any) => (
                    <tr key={issue.id} className="table-row-hover"
                      style={issue.isOverdue ? { background: 'var(--danger-bg)', opacity: 0.9 } : {}}>
                      <td className="table-cell text-sm font-medium" style={{ color: 'var(--text-1)' }}>{issue.book.title}</td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{issue.borrowerName}</td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-2)' }}>{formatDate(issue.dueDate)}</td>
                      <td className="table-cell text-sm">
                        {issue.isOverdue
                          ? <span className="font-medium" style={{ color: 'var(--danger)' }}>{issue.overdueDays}d late · ₹{issue.estimatedFine} fine</span>
                          : <span style={{ color: 'var(--success)' }}>On time</span>}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => returnMutation.mutate(issue.id)}
                          disabled={returnMutation.isPending}
                          className="btn btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-60"
                          style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Return
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!activeIssues?.length && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--text-4)' }}>No books currently issued</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Book Modal */}
      {showAddBook && (
        <AddBookModal
          bookForm={bookForm}
          setBookForm={setBookForm}
          isPending={addBookMutation.isPending}
          onClose={() => { setShowAddBook(false); setBookForm({ ...emptyBook }) }}
          onSubmit={() => addBookMutation.mutate()}
        />
      )}
    </div>
  )
}

function AddBookModal({ bookForm, setBookForm, isPending, onClose, onSubmit }: any) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,.3)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Add Book to Library</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{ color: 'var(--text-4)', border: '1px solid var(--border)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
              Title <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input value={bookForm.title} onChange={e => setBookForm((f: any) => ({ ...f, title: e.target.value }))}
              placeholder="Book title" className={inputCls} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Author</label>
              <input value={bookForm.author} onChange={e => setBookForm((f: any) => ({ ...f, author: e.target.value }))}
                placeholder="Author name" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>ISBN / Barcode</label>
              <input value={bookForm.isbn} onChange={e => setBookForm((f: any) => ({ ...f, isbn: e.target.value }))}
                placeholder="ISBN or barcode" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Category</label>
              <input value={bookForm.category} onChange={e => setBookForm((f: any) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Science, Maths" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Publisher</label>
              <input value={bookForm.publisher} onChange={e => setBookForm((f: any) => ({ ...f, publisher: e.target.value }))}
                placeholder="Publisher name" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Rack / Shelf</label>
              <input value={bookForm.rackNumber} onChange={e => setBookForm((f: any) => ({ ...f, rackNumber: e.target.value }))}
                placeholder="e.g. A-12" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>No. of Copies</label>
              <input type="number" min="1" value={bookForm.totalCopies}
                onChange={e => setBookForm((f: any) => ({ ...f, totalCopies: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Description</label>
            <textarea rows={2} value={bookForm.description}
              onChange={e => setBookForm((f: any) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description (optional)" className={inputCls + ' resize-none'} />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn btn-ghost flex-1 py-2.5">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={!bookForm.title.trim() || isPending}
            className="btn btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Book
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
