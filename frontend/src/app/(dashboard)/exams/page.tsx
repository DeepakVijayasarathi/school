'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { examsApi, schoolApi } from '@/lib/api'
import { formatDate, cn, statusColor } from '@/lib/utils'
import { Plus, ClipboardList, Eye } from 'lucide-react'
import Link from 'next/link'
import type { Exam, ExamResult } from '@/types'

export default function ExamsPage() {
  const [selectedExamId, setSelectedExamId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [classId, setClassId] = useState('')

  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examsApi.list().then((r) => r.data),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolApi.getClasses().then((r) => r.data),
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
          <p className="text-gray-500 text-sm">{exams?.length ?? 0} exams</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Create Exam
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exams list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Exams</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-gray-400">Loading...</div>
            ) : exams?.map((exam: Exam) => (
              <button
                key={exam.id}
                onClick={() => setSelectedExamId(exam.id)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-gray-50 transition',
                  selectedExamId === exam.id && 'bg-blue-50 border-r-2 border-blue-600'
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{exam.name}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', exam.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                    {exam.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{exam.type}</p>
                {exam.startDate && (
                  <p className="text-xs text-gray-400">{formatDate(exam.startDate)} – {exam.endDate ? formatDate(exam.endDate) : ''}</p>
                )}
              </button>
            ))}
            {!exams?.length && !isLoading && (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">No exams found</div>
            )}
          </div>
        </div>

        {/* Results view */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Results</h3>
            <div className="flex gap-2">
              <select
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSectionId('') }}
                className="px-2 py-1 border border-gray-200 rounded-lg text-sm outline-none"
                disabled={!selectedExamId}
              >
                <option value="">Select Class</option>
                {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {classId && (
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-lg text-sm outline-none"
                >
                  <option value="">Select Section</option>
                  {sections?.map((s: any) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {!selectedExamId ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
              <p>Select an exam to view results</p>
            </div>
          ) : !sectionId ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <p>Select a class and section to view results</p>
            </div>
          ) : resultsLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">Loading results...</div>
          ) : results?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Rank</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Student</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">Total</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">%</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">Result</th>
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
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusColor(r.result))}>
                          {r.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No results found for this section
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
