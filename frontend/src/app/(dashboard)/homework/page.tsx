'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schoolApi, homeworkApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, FileText, X, Loader2, BookOpen, Calendar, ChevronRight } from 'lucide-react'

const inputCls = 'input-base focus-ring w-full'

const emptyHW = {
  title: '', description: '', subject: '',
  classId: '', sectionId: '', dueDate: '',
  submissionType: 'written', maxMarks: '',
}

// Map status values to badge classes from the design system
const STATUS_BADGE: Record<string, string> = {
  active: 'badge-active',
  submitted: 'badge-paid',
  overdue: 'badge-overdue',
  graded: 'badge-draft',
}

function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-4 w-48 rounded" />
      <div className="skeleton h-3 w-32 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-24 rounded" />
    </div>
  )
}

export default function HomeworkPage() {
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...emptyHW })
  const qc = useQueryClient()

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolApi.getClasses().then(r => r.data),
  })

  const { data: sections } = useQuery({
    queryKey: ['sections', form.classId],
    queryFn: () => schoolApi.getSections(form.classId).then(r => r.data),
    enabled: !!form.classId,
  })

  const { data: filterSections } = useQuery({
    queryKey: ['sections-filter', classId],
    queryFn: () => schoolApi.getSections(classId).then(r => r.data),
    enabled: !!classId,
  })

  const { data: homeworkList, isLoading } = useQuery({
    queryKey: ['homework', classId, sectionId],
    queryFn: () => homeworkApi.list({
      ...(classId && { classId }),
      ...(sectionId && { sectionId }),
    }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => homeworkApi.create({
      title: form.title,
      description: form.description || undefined,
      subject: form.subject || undefined,
      classId: form.classId || undefined,
      sectionId: form.sectionId || undefined,
      dueDate: form.dueDate || undefined,
      submissionType: form.submissionType,
      maxMarks: form.maxMarks ? Number(form.maxMarks) : undefined,
    }),
    onSuccess: () => {
      toast.success('Homework assigned successfully')
      setShowAdd(false)
      setForm({ ...emptyHW })
      qc.invalidateQueries({ queryKey: ['homework'] })
    },
    onError: () => toast.error('Failed to assign homework'),
  })

  const hw = homeworkList?.items ?? []
  const canSubmit = form.title.trim() && form.dueDate

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Homework</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Assign and track student homework</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Assign Homework
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={classId} onChange={e => { setClassId(e.target.value); setSectionId('') }}
          className="input-base focus-ring px-3 py-2 text-sm">
          <option value="">All Classes</option>
          {(classes as any[])?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {classId && (
          <select value={sectionId} onChange={e => setSectionId(e.target.value)}
            className="input-base focus-ring px-3 py-2 text-sm">
            <option value="">All Sections</option>
            {(filterSections as any[])?.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
          </select>
        )}
      </div>

      {/* Homework list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : hw.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(hw as any[]).map(item => (
            <div key={item.id} className="card p-4 hover:shadow-md transition-all cursor-pointer group"
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--warning-bg)' }}>
                  <FileText className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                </div>
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold capitalize flex-shrink-0',
                  STATUS_BADGE[item.status] ?? 'badge-inactive')}>
                  {item.status ?? 'active'}
                </span>
              </div>
              <p className="text-sm font-semibold mb-1 line-clamp-1" style={{ color: 'var(--text-1)' }}>{item.title}</p>
              {item.subject && <p className="text-xs font-medium mb-1" style={{ color: 'var(--brand)' }}>{item.subject}</p>}
              {item.description && <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--text-3)' }}>{item.description}</p>}
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-4)' }}>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}
                </div>
                <div className="flex items-center gap-1 transition-colors group-hover:text-[var(--brand)]">
                  <span className="text-xs">Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
              {(item.className || item.sectionName) && (
                <div className="mt-2 pt-2 flex items-center gap-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <BookOpen className="w-3 h-3" style={{ color: 'var(--text-4)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-4)' }}>{item.className}{item.sectionName ? ` – ${item.sectionName}` : ''}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--warning-bg)' }}>
            <FileText className="w-8 h-8" style={{ color: 'var(--warning)', opacity: 0.5 }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>No homework assigned yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Assign homework to classes and track submissions</p>
          <button onClick={() => setShowAdd(true)}
            className="btn btn-primary mt-4 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Assign Homework
          </button>
        </div>
      )}

      {/* Assign Homework Modal */}
      {showAdd && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}
        >
          <div className="card w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Assign Homework</h3>
              <button
                onClick={() => { setShowAdd(false); setForm({ ...emptyHW }) }}
                className="btn btn-ghost w-7 h-7 flex items-center justify-center p-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                  Title <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Chapter 5 - Exercise 3" className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Subject</label>
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="e.g. Mathematics" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                    Due Date <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Class</label>
                  <select value={form.classId} onChange={e => { setForm(f => ({ ...f, classId: e.target.value, sectionId: '' })) }} className={inputCls}>
                    <option value="">All Classes</option>
                    {(classes as any[])?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Section</label>
                  <select value={form.sectionId} onChange={e => setForm(f => ({ ...f, sectionId: e.target.value }))} className={inputCls} disabled={!form.classId}>
                    <option value="">All Sections</option>
                    {(sections as any[])?.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Submission Type</label>
                  <select value={form.submissionType} onChange={e => setForm(f => ({ ...f, submissionType: e.target.value }))} className={inputCls}>
                    <option value="written">Written</option>
                    <option value="online">Online</option>
                    <option value="project">Project</option>
                    <option value="practical">Practical</option>
                    <option value="none">No Submission</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Max Marks</label>
                  <input type="number" min="0" value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))}
                    placeholder="Optional" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Description / Instructions</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Homework instructions for students..." className={inputCls + ' resize-none'} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => { setShowAdd(false); setForm({ ...emptyHW }) }}
                className="btn btn-ghost flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
                className="btn btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Assign
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
