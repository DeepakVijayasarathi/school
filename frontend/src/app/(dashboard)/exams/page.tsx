'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { examsApi, schoolApi } from '@/lib/api'
import { formatDate, cn, statusColor } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, ClipboardList, X, Loader2 } from 'lucide-react'
import type { Exam, ExamResult } from '@/types'

const EXAM_TYPES = ['unit_test', 'half_yearly', 'annual', 'monthly', 'weekly', 'mock', 'practical']

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all'

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
          <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
          <p className="text-gray-500 text-sm">{exams?.length ?? 0} exams</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" /> Create Exam
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exams list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Exams</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3 space-y-1.5">
                  <div className="skeleton h-3.5 w-32 rounded" />
                  <div className="skeleton h-2.5 w-20 rounded" />
                </div>
              ))
              : exams?.map((exam: Exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedExamId(exam.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-gray-50 transition relative',
                    selectedExamId === exam.id && 'bg-blue-50'
                  )}
                >
                  {selectedExamId === exam.id && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-blue-500 rounded-full" />
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{exam.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', exam.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                      {exam.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{exam.type?.replace('_', ' ')}</p>
                  {exam.startDate && (
                    <p className="text-xs text-gray-400">{formatDate(exam.startDate)}{exam.endDate ? ` – ${formatDate(exam.endDate)}` : ''}</p>
                  )}
                </button>
              ))}
            {!exams?.length && !isLoading && (
              <div className="px-4 py-12 text-center">
                <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No exams yet</p>
                <button onClick={() => setShowCreate(true)} className="mt-2 text-xs text-blue-600 hover:underline">Create your first exam</button>
              </div>
            )}
          </div>
        </div>

        {/* Results view */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Results</h3>
            <div className="flex gap-2">
              <select
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSectionId('') }}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                disabled={!selectedExamId}
              >
                <option value="">Select Class</option>
                {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {classId && (
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">Section</option>
                  {sections?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {!selectedExamId ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300 gap-3">
              <ClipboardList className="w-12 h-12" />
              <p className="text-sm text-gray-400">Select an exam to view results</p>
            </div>
          ) : !sectionId ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-sm text-gray-400">Select a class and section to view results</p>
            </div>
          ) : resultsLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : results?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Rank</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Student</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Total</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">%</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(results as ExamResult[]).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
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
                        <p className="font-medium text-gray-900">{r.fullName}</p>
                        <p className="text-xs text-gray-400">{r.admissionNumber}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-medium">{r.totalObtained}</span>
                        <span className="text-gray-400">/{r.totalMaxMarks}</span>
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
            <div className="flex items-center justify-center h-64 text-sm text-gray-400">No results for this section</div>
          )}
        </div>
      </div>

      {/* Create Exam Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Create New Exam</h3>
              <button onClick={() => setShowCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Exam Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Unit Test 1 - Term 1"
                  className={inputCls}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Pass % (min)</label>
                  <input
                    type="number" min="1" max="100"
                    value={form.passPercentage}
                    onChange={e => setForm(f => ({ ...f, passPercentage: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Academic Year</label>
                <select value={form.academicYearId} onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))} className={inputCls}>
                  <option value="">Select academic year</option>
                  {academicYears?.map((y: any) => (
                    <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (Current)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
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
