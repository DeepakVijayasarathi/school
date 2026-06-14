'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { studentsApi, api } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import {
  User, BookOpen, Calendar, DollarSign, Award, FileText,
  Heart, AlertTriangle, ArrowLeft, Edit, Phone, Mail, MapPin
} from 'lucide-react'

const TABS = [
  { key: 'profile',       label: 'Profile',       icon: User },
  { key: 'academic',      label: 'Academic',       icon: BookOpen },
  { key: 'attendance',    label: 'Attendance',     icon: Calendar },
  { key: 'fees',          label: 'Fees',           icon: DollarSign },
  { key: 'exams',         label: 'Exams',          icon: Award },
  { key: 'documents',     label: 'Documents',      icon: FileText },
  { key: 'medical',       label: 'Medical',        icon: Heart },
  { key: 'disciplinary',  label: 'Disciplinary',   icon: AlertTriangle },
]

const ATTENDANCE_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent:  'bg-red-100 text-red-700',
  late:    'bg-yellow-100 text-yellow-700',
  holiday: 'bg-gray-100 text-gray-400',
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('profile')

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.get(id).then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!student) return <div className="text-center py-20 text-gray-400">Student not found.</div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{student.fullName}</h1>
          <p className="text-sm text-gray-500">{student.admissionNumber}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Edit className="w-4 h-4" /> Edit
        </button>
      </div>

      {/* Student card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-5">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 flex-shrink-0">
          {student.fullName?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Class</p>
            <p className="font-semibold">{student.currentEnrollment?.className} - {student.currentEnrollment?.sectionName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Roll No</p>
            <p className="font-semibold">#{student.currentEnrollment?.rollNumber ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Gender</p>
            <p className="font-semibold">{student.gender}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Status</p>
            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full capitalize',
              student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
              {student.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1.5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              tab === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        {tab === 'profile' && <ProfileTab student={student} />}
        {tab === 'academic' && <AcademicTab student={student} />}
        {tab === 'attendance' && <AttendanceTab studentId={id} />}
        {tab === 'fees' && <FeesTab studentId={id} />}
        {tab === 'exams' && <ExamsTab studentId={id} />}
        {tab === 'documents' && <DocumentsTab student={student} />}
        {tab === 'medical' && <MedicalTab studentId={id} />}
        {tab === 'disciplinary' && <DisciplinaryTab studentId={id} />}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-gray-400 uppercase font-medium">{label}</p>
      <p className="text-sm text-gray-900">{value || '—'}</p>
    </div>
  )
}

function ProfileTab({ student }: { student: any }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Personal Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoRow label="Full Name" value={student.fullName} />
          <InfoRow label="Date of Birth" value={student.dateOfBirth ? formatDate(student.dateOfBirth) : null} />
          <InfoRow label="Gender" value={student.gender} />
          <InfoRow label="Blood Group" value={student.bloodGroup} />
          <InfoRow label="Religion" value={student.religion} />
          <InfoRow label="Caste" value={student.caste} />
          <InfoRow label="Category" value={student.category} />
          <InfoRow label="Mother Tongue" value={student.motherTongue} />
          <InfoRow label="Nationality" value={student.nationality} />
          <InfoRow label="Aadhar No" value={student.aadharNumber} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Address</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoRow label="Address" value={student.address} />
          <InfoRow label="City" value={student.city} />
          <InfoRow label="State" value={student.state} />
          <InfoRow label="Pincode" value={student.pincode} />
        </div>
      </section>

      {student.guardians?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Phone className="w-4 h-4" /> Guardians</h3>
          <div className="space-y-3">
            {student.guardians.map((g: any) => (
              <div key={g.id} className="border border-gray-100 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoRow label="Name" value={g.fullName} />
                <InfoRow label="Relation" value={g.relation} />
                <InfoRow label="Phone" value={g.phone} />
                <InfoRow label="Email" value={g.email} />
                <InfoRow label="Occupation" value={g.occupation} />
                {g.isPrimary && <span className="inline-block text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium w-fit">Primary</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AcademicTab({ student }: { student: any }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Enrollment History</h3>
      {student.enrollments?.length > 0 ? (
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Academic Year', 'Class', 'Section', 'Roll No', 'Enrolled At'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {student.enrollments.map((e: any) => (
              <tr key={e.id}>
                <td className="px-4 py-2">{e.academicYear}</td>
                <td className="px-4 py-2">{e.className}</td>
                <td className="px-4 py-2">{e.sectionName}</td>
                <td className="px-4 py-2">#{e.rollNumber}</td>
                <td className="px-4 py-2">{formatDate(e.enrolledAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-400 text-sm">No enrollment records found.</p>
      )}

      {student.previousSchool && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase font-medium">Previous School</p>
          <p className="text-sm text-gray-900 mt-1">{student.previousSchool} — Class {student.previousClass}</p>
        </div>
      )}
    </div>
  )
}

function AttendanceTab({ studentId }: { studentId: string }) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())

  const { data } = useQuery({
    queryKey: ['student-attendance', studentId, month, year],
    queryFn: () => api.get(`/parents/child/${studentId}/attendance`, { params: { month, year } }).then(r => r.data),
  })

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const calendarMap: Record<string, string> = {}
  data?.calendar?.forEach((c: any) => {
    calendarMap[c.date] = c.status
  })

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <select value={month} onChange={e => setMonth(+e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
          ))}
        </select>
        <input type="number" value={year} onChange={e => setYear(+e.target.value)}
          className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Present', value: data.present, color: 'bg-green-50 text-green-700' },
            { label: 'Absent',  value: data.absent,  color: 'bg-red-50 text-red-700' },
            { label: 'Late',    value: data.late,    color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Attendance', value: `${data.percentage}%`, color: 'bg-blue-50 text-blue-700' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-lg p-3 text-center', s.color)}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="h-10 border-t border-gray-50" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const status = calendarMap[dateStr]
            return (
              <div key={day}
                className={cn(
                  'h-10 border-t border-l border-gray-50 flex items-center justify-center text-sm font-medium',
                  ATTENDANCE_COLORS[status?.toLowerCase()] ?? ''
                )}>
                {day}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        {Object.entries(ATTENDANCE_COLORS).map(([status, cls]) => (
          <span key={status} className={cn('px-2 py-0.5 rounded-full capitalize', cls)}>{status}</span>
        ))}
      </div>
    </div>
  )
}

function FeesTab({ studentId }: { studentId: string }) {
  const { data } = useQuery({
    queryKey: ['student-fees', studentId],
    queryFn: () => api.get(`/parents/child/${studentId}/fees`).then(r => r.data),
  })

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">₹{data.totalDue?.toLocaleString()}</p>
            <p className="text-xs text-red-600 font-medium uppercase">Total Due</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">₹{data.totalPaid?.toLocaleString()}</p>
            <p className="text-xs text-green-600 font-medium uppercase">Total Paid</p>
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Fee Type', 'Amount', 'Paid', 'Balance', 'Due Date', 'Status'].map(h => (
              <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data?.records?.map((f: any) => (
            <tr key={f.id}>
              <td className="px-4 py-2">{f.feeTypeName}</td>
              <td className="px-4 py-2">₹{f.amount?.toLocaleString()}</td>
              <td className="px-4 py-2 text-green-600">₹{f.paidAmount?.toLocaleString()}</td>
              <td className="px-4 py-2 text-red-600">₹{(f.amount - f.paidAmount)?.toLocaleString()}</td>
              <td className="px-4 py-2">{f.dueDate ? formatDate(f.dueDate) : '—'}</td>
              <td className="px-4 py-2">
                <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize',
                  f.status === 'paid' ? 'bg-green-100 text-green-700' :
                  f.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>
                  {f.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExamsTab({ studentId }: { studentId: string }) {
  const { data } = useQuery({
    queryKey: ['student-results', studentId],
    queryFn: () => api.get(`/parents/child/${studentId}/results`).then(r => r.data),
  })

  return (
    <div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Exam', 'Subject', 'Max Marks', 'Obtained', 'Grade', 'Result'].map(h => (
              <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {Array.isArray(data) && data.map((r: any) => (
            <tr key={r.id}>
              <td className="px-4 py-2">{r.examName}</td>
              <td className="px-4 py-2">{r.subjectName}</td>
              <td className="px-4 py-2">{r.maxMarks}</td>
              <td className="px-4 py-2">{r.marksObtained}</td>
              <td className="px-4 py-2 font-semibold">{r.grade}</td>
              <td className="px-4 py-2">
                <span className={cn('text-xs px-2 py-0.5 rounded-full',
                  r.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {r.isPassed ? 'Pass' : 'Fail'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DocumentsTab({ student }: { student: any }) {
  return (
    <div className="space-y-3">
      {student.documents?.length > 0 ? student.documents.map((doc: any) => (
        <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium">{doc.name}</p>
              <p className="text-xs text-gray-400">{doc.type} • {formatDate(doc.uploadedAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {doc.verified && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Verified</span>}
            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View</a>
          </div>
        </div>
      )) : (
        <p className="text-gray-400 text-sm text-center py-8">No documents uploaded.</p>
      )}
    </div>
  )
}

function MedicalTab({ studentId }: { studentId: string }) {
  const { data } = useQuery({
    queryKey: ['student-medical', studentId],
    queryFn: () => fetch(`/api/students/${studentId}/medical`).then(r => r.json()).catch(() => null),
  })

  if (!data) return <p className="text-gray-400 text-sm text-center py-8">No medical records on file.</p>

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <InfoRow label="Blood Group" value={data.bloodGroup} />
      <InfoRow label="Height (cm)" value={data.heightCm?.toString()} />
      <InfoRow label="Weight (kg)" value={data.weightKg?.toString()} />
      <InfoRow label="Allergies" value={data.allergies?.join(', ')} />
      <InfoRow label="Chronic Conditions" value={data.chronicConditions?.join(', ')} />
      <InfoRow label="Current Medications" value={data.medications} />
      <InfoRow label="Doctor Name" value={data.doctorName} />
      <InfoRow label="Doctor Phone" value={data.doctorPhone} />
      <InfoRow label="Last Checkup" value={data.lastCheckupDate ? formatDate(data.lastCheckupDate) : null} />
    </div>
  )
}

function DisciplinaryTab({ studentId }: { studentId: string }) {
  const { data } = useQuery({
    queryKey: ['student-disciplinary', studentId],
    queryFn: () => fetch(`/api/students/${studentId}/disciplinary`).then(r => r.json()).catch(() => []),
  })

  return (
    <div className="space-y-3">
      {Array.isArray(data) && data.length > 0 ? data.map((d: any) => (
        <div key={d.id} className={cn('p-3 border rounded-lg',
          d.resolved ? 'border-gray-100 bg-gray-50' : 'border-red-100 bg-red-50')}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{d.actionTaken}</span>
            <span className="text-xs text-gray-500">{formatDate(d.incidentDate)}</span>
          </div>
          <p className="text-sm text-gray-600">{d.description}</p>
          {d.remarks && <p className="text-xs text-gray-400 mt-1">{d.remarks}</p>}
          {d.resolved && <span className="text-xs text-green-600 font-medium">Resolved</span>}
        </div>
      )) : (
        <p className="text-gray-400 text-sm text-center py-8">No disciplinary records.</p>
      )}
    </div>
  )
}
