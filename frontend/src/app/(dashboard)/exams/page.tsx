'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { examsApi, schoolApi } from '@/lib/api'
import { formatDate, cn, statusColor } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, ClipboardList, X, Loader2 } from 'lucide-react'
import type { Exam, ExamResult } from '@/types'

const EXAM_TYPES = ['unit_test', 'half_yearly', 'annual', 'monthly', 'weekly', 'mock', 'practical']

export default function ExamsPage() {
  const [selectedExamId, setSelectedExamId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [classId, setClassId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'unit_test', academicYearId: '',
    startDate: '', endDate: '', passPercentage: '35',
  })
  const qc = useQueryClient()

  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examsApi.list().then((r) => r.data),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolApi.getClasses().then((r) => r.data),
  })

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => schoolApi.getAcademicYears().then((r) => r.data),
  })

  const { data: sections } = useQuery({
    queryKey: ['sections', classId],
    queryFn: () => schoolApi.getSections(classId).then((r) => r.data),
    enabled: !!classId,
  })

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['exam-results', selectedExamId, sectionId],
    queryFn: () => examsApi.getResults(selectedExamId, sectionId).then((r) => r.data),
    enabled: !!selectedExamId && !!sectionId,
  })

  const createMutation = useMutation({
    mutationFn: () => examsApi.create({
      name: form.name,
      type: form.type,
      academicYearId: form.academicYearId || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      passPercentage: Number(form.passPercentage),
    }),
    onSuccess: () => {
      toast.success('Exam created successfully')
      setShowCreate(false)
      setForm({ name: '', type: 'unit_test', academicYearId: '', startDate: '', endDate: '', passPercentage: '35' })
      qc.invalidateQueries({ queryKey: ['exams'] })
    },
    onError: () => toast.error('Failed to create exam'),
  })

  const canSubmit = form.name.trim().length > 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Exam Management</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{exams?.length ?? 0} exams</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary flex items-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Exam
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exams list */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Exams</h3>
          </div>
          <div style={{ borderTop: 'none' }}>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3 space-y-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="skeleton h-3.5 w-32 rounded" />
                  <div className="skeleton h-2.5 w-20 rounded" />
                </div>
              ))
              : exams?.map((exam: Exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedExamId(exam.id)}
                  className="w-full text-left px-4 py-3 transition relative"
                  style={{
                    backgroundColor: selectedExamId === exam.id ? 'var(--brand-bg)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedExamId !== exam.id) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedExamId !== exam.id) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {selectedExamId === exam.id && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full"
                      style={{ backgroundColor: 'var(--brand)' }}
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{exam.name}</p>
                    <span className={exam.isPublished ? 'badge-active' : 'badge-draft'}>
                      {exam.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-4)' }}>{exam.type?.replace(/_/g, ' ')}</p>
                  {exam.startDate && (
                    <p className="text-xs" style={{ color: 'var(--text-4)' }}>{formatDate(exam.startDate)}{exam.endDate ? ` – ${formatDate(exam.endDate)}` : ''}</p>
                  )}
                </button>
              ))}
            {!exams?.length && !isLoading && (
              <div className="px-4 py-12 text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-4)' }} />
                <p className="text-sm" style={{ color: 'var(--text-4)' }}>No exams yet</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-2 text-xs hover:underline"
                  style={{ color: 'var(--brand)' }}
                >
                  Create your first exam
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results view */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Results</h3>
            <div className="flex gap-2">
              <select
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSectionId('') }}
                className="input-base focus-ring"
                disabled={!selectedExamId}
              >
                <option value="">Select Class</option>
                {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {classId && (
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="input-base focus-ring"
                >
                  <option value="">Section</option>
                  {sections?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {!selectedExamId ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: 'var(--text-4)' }}>
              <ClipboardList className="w-12 h-12" />
              <p className="text-sm">Select an exam to view results</p>
            </div>
          ) : !sectionId ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-sm" style={{ color: 'var(--text-4)' }}>Select a class and section to view results</p>
            </div>
          ) : resultsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} />
            </div>
          ) : results?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="table-cell text-left">Rank</th>
                    <th className="table-cell text-left">Student</th>
                    <th className="table-cell text-right">Total</th>
                    <th className="table-cell text-right">%</th>
                    <th className="table-cell text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {(results as ExamResult[]).map((r) => (
                    <tr key={r.id} className="table-row-hover">
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          'w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold',
                          r.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                          r.rank === 2 ? 'bg-gray-300 text-gray-700' :
                          r.rank === 3 ? 'bg-orange-400 text-orange-900' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {r.rank}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium" style={{ color: 'var(--text-1)' }}>{r.fullName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>{r.admissionNumber}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-medium">{r.totalObtained}</span>
                        <span style={{ color: 'var(--text-4)' }}>/{r.totalMaxMarks}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">{r.percentage}%</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusColor(r.result))}>{r.result}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-4)' }}>No results for this section</div>
          )}
        </div>
      </div>

      {/* Create Exam Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}
        >
          <div className="card w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Create New Exam</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="btn btn-ghost w-7 h-7 flex items-center justify-center rounded-lg transition-all p-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>
                  Exam Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Unit Test 1 - Term 1"
                  className="input-base focus-ring w-full"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-base focus-ring w-full">
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Pass % (min)</label>
                  <input
                    type="number" min="1" max="100"
                    value={form.passPercentage}
                    onChange={e => setForm(f => ({ ...f, passPercentage: e.target.value }))}
                    className="input-base focus-ring w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Academic Year</label>
                <select value={form.academicYearId} onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))} className="input-base focus-ring w-full">
                  <option value="">Select academic year</option>
                  {academicYears?.map((y: any) => (
                    <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (Current)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input-base focus-ring w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="input-base focus-ring w-full" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowCreate(false)}
                className="btn btn-ghost flex-1 py-2.5 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
                className="btn btn-primary flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
