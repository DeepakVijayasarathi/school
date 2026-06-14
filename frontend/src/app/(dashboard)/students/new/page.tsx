'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { studentsApi, schoolApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Check, Save } from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Basic Info',     desc: 'Name, DOB, gender' },
  { id: 2, title: 'Academic',       desc: 'Class & previous school' },
  { id: 3, title: 'Guardian',       desc: 'Father, mother info' },
  { id: 4, title: 'Contact',        desc: 'Address & phone' },
  { id: 5, title: 'Medical',        desc: 'Health information' },
  { id: 6, title: 'Documents',      desc: 'Upload files' },
  { id: 7, title: 'Review',         desc: 'Confirm & submit' },
]

type FormData = {
  // Step 1
  firstName: string; lastName: string; gender: string; dateOfBirth: string
  bloodGroup: string; religion: string; caste: string; category: string; motherTongue: string; aadharNumber: string
  // Step 2
  academicYearId: string; classId: string; sectionId: string; previousSchool: string; previousClass: string
  // Step 3
  fatherName: string; fatherPhone: string; fatherOccupation: string; fatherEmail: string
  motherName: string; motherPhone: string; motherOccupation: string; motherEmail: string
  guardianName: string; guardianPhone: string; guardianRelation: string
  // Step 4
  address: string; city: string; state: string; pincode: string; phone: string; email: string
  // Step 5
  allergies: string; chronicConditions: string; medications: string; doctorName: string; doctorPhone: string
  // Step 6
  documentUrls: string[]
}

const initialData: FormData = {
  firstName: '', lastName: '', gender: '', dateOfBirth: '', bloodGroup: '',
  religion: '', caste: '', category: '', motherTongue: '', aadharNumber: '',
  academicYearId: '', classId: '', sectionId: '', previousSchool: '', previousClass: '',
  fatherName: '', fatherPhone: '', fatherOccupation: '', fatherEmail: '',
  motherName: '', motherPhone: '', motherOccupation: '', motherEmail: '',
  guardianName: '', guardianPhone: '', guardianRelation: 'father',
  address: '', city: '', state: '', pincode: '', phone: '', email: '',
  allergies: '', chronicConditions: '', medications: '', doctorName: '', doctorPhone: '',
  documentUrls: []
}

export default function NewStudentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialData)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => schoolApi.getAcademicYears().then((r) => r.data),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolApi.getClasses().then((r) => r.data),
  })

  const { data: sections } = useQuery({
    queryKey: ['sections', formData.classId],
    queryFn: () => schoolApi.getSections(formData.classId).then((r) => r.data),
    enabled: !!formData.classId,
  })

  const mutation = useMutation({
    mutationFn: (data: any) => studentsApi.create(data).then((r) => r.data),
    onSuccess: (data) => router.push(`/students/${data.id}`),
  })

  const update = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const validateStep = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (step === 1) {
      if (!formData.firstName) newErrors.firstName = 'First name is required'
      if (!formData.gender) newErrors.gender = 'Gender is required'
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
    }
    if (step === 2) {
      if (!formData.academicYearId) newErrors.academicYearId = 'Academic year is required'
      if (!formData.classId) newErrors.classId = 'Class is required'
      if (!formData.sectionId) newErrors.sectionId = 'Section is required'
    }
    if (step === 3) {
      if (!formData.fatherName && !formData.motherName) newErrors.fatherName = 'At least one guardian is required'
      if (!formData.fatherPhone && !formData.motherPhone && !formData.guardianPhone)
        newErrors.guardianPhone = 'At least one contact phone is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const next = () => { if (validateStep()) setStep(s => Math.min(7, s + 1)) }
  const prev = () => setStep(s => Math.max(1, s - 1))

  const handleSubmit = () => {
    if (!validateStep()) return

    // Blood group display values ("A+") don't match .NET enum names ("APositive") — map them
    const BLOOD_GROUP: Record<string, string> = {
      'A+': 'APositive',  'A-': 'ANegative',
      'B+': 'BPositive',  'B-': 'BNegative',
      'AB+': 'ABPositive','AB-': 'ABNegative',
      'O+': 'OPositive',  'O-': 'ONegative',
    }

    const primaryGuardian = {
      firstName:  formData.fatherName || formData.guardianName || formData.motherName,
      lastName:   '',
      phone:      formData.fatherPhone || formData.guardianPhone || formData.motherPhone,
      email:      formData.fatherEmail || formData.motherEmail || undefined,
      occupation: formData.fatherOccupation || formData.motherOccupation || undefined,
      relation:   formData.fatherName ? 'Father' : formData.motherName ? 'Mother' : 'Guardian',
      isPickup:   true,
    }

    // Send only the fields CreateStudentRequest expects — no stray keys that confuse the binder
    mutation.mutate({
      firstName:      formData.firstName,
      lastName:       formData.lastName       || undefined,
      gender:         formData.gender,
      dateOfBirth:    formData.dateOfBirth,
      bloodGroup:     formData.bloodGroup ? BLOOD_GROUP[formData.bloodGroup] : undefined,
      religion:       formData.religion       || undefined,
      caste:          formData.caste          || undefined,
      category:       formData.category       || undefined,
      motherTongue:   formData.motherTongue   || undefined,
      aadharNumber:   formData.aadharNumber   || undefined,
      address:        formData.address        || undefined,
      city:           formData.city           || undefined,
      state:          formData.state          || undefined,
      pincode:        formData.pincode        || undefined,
      admissionDate:  new Date().toISOString().split('T')[0],
      previousSchool: formData.previousSchool || undefined,
      previousClass:  formData.previousClass  || undefined,
      academicYearId: formData.academicYearId,
      classId:        formData.classId,
      sectionId:      formData.sectionId,
      primaryGuardian,
    })
  }

  const inp = (field: keyof FormData, label: string, type = 'text', required = false) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={formData[field] as string}
        onChange={e => update(field, e.target.value)}
        className={cn(
          'px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500',
          errors[field] ? 'border-red-400 focus:ring-red-500' : 'border-gray-200'
        )}
      />
      {errors[field] && <p className="text-xs text-red-500">{errors[field]}</p>}
    </div>
  )

  const sel = (field: keyof FormData, label: string, options: {value: string; label: string}[], required = false) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={formData[field] as string}
        onChange={e => update(field, e.target.value)}
        className={cn(
          'px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500',
          errors[field] ? 'border-red-400' : 'border-gray-200'
        )}
      >
        <option value="">Select...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {errors[field] && <p className="text-xs text-red-500">{errors[field]}</p>}
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
        <p className="text-gray-500 text-sm">Complete the multi-step form to admit a student.</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button
              onClick={() => step > s.id && setStep(s.id)}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0 transition-colors',
                step === s.id ? 'bg-blue-600 text-white' :
                step > s.id ? 'bg-green-500 text-white cursor-pointer' :
                'bg-gray-200 text-gray-500'
              )}
            >
              {step > s.id ? <Check className="w-4 h-4" /> : s.id}
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-1 mx-1', step > s.id ? 'bg-green-500' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Step {step}: {STEPS[step - 1].title}</h2>
          <p className="text-sm text-gray-500">{STEPS[step - 1].desc}</p>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inp('firstName', 'First Name', 'text', true)}
            {inp('lastName', 'Last Name')}
            {sel('gender', 'Gender', [{value:'Male',label:'Male'},{value:'Female',label:'Female'},{value:'Other',label:'Other'}], true)}
            {inp('dateOfBirth', 'Date of Birth', 'date', true)}
            {sel('bloodGroup', 'Blood Group', ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({value:v,label:v})))}
            {inp('religion', 'Religion')}
            {inp('caste', 'Caste')}
            {sel('category', 'Category', ['General','OBC','SC','ST','EWS'].map(v => ({value:v,label:v})))}
            {inp('motherTongue', 'Mother Tongue')}
            {inp('aadharNumber', 'Aadhar Number')}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sel('academicYearId', 'Academic Year', (academicYears ?? []).map((y: any) => ({value:y.id,label:y.name})), true)}
            {sel('classId', 'Class', (classes ?? []).map((c: any) => ({value:c.id,label:c.name})), true)}
            {sel('sectionId', 'Section', (sections ?? []).map((s: any) => ({value:s.id,label:`Section ${s.name}`})), true)}
            {inp('previousSchool', 'Previous School')}
            {inp('previousClass', 'Previous Class')}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Father's Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inp('fatherName', 'Father\'s Full Name')}
                {inp('fatherPhone', 'Phone', 'tel')}
                {inp('fatherEmail', 'Email', 'email')}
                {inp('fatherOccupation', 'Occupation')}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Mother's Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inp('motherName', 'Mother\'s Full Name')}
                {inp('motherPhone', 'Phone', 'tel')}
                {inp('motherEmail', 'Email', 'email')}
                {inp('motherOccupation', 'Occupation')}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">{inp('address', 'Address')}</div>
            {inp('city', 'City')}
            {inp('state', 'State')}
            {inp('pincode', 'Pincode')}
            {inp('phone', 'Contact Phone', 'tel')}
            {inp('email', 'Contact Email', 'email')}
          </div>
        )}

        {step === 5 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inp('allergies', 'Known Allergies')}
            {inp('chronicConditions', 'Chronic Conditions')}
            {inp('medications', 'Current Medications')}
            {inp('doctorName', 'Family Doctor Name')}
            {inp('doctorPhone', 'Doctor Phone', 'tel')}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Upload required documents (birth certificate, transfer certificate, photos, etc.)</p>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
              <p className="text-gray-400 text-sm">Document upload feature — connect to your file storage (S3/Cloudinary)</p>
              <p className="text-xs text-gray-300 mt-1">Accepted: PDF, JPG, PNG (max 5MB each)</p>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3">Review Student Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Name:</div><div className="font-medium">{formData.firstName} {formData.lastName}</div>
                <div className="text-gray-500">Gender:</div><div className="font-medium">{formData.gender}</div>
                <div className="text-gray-500">DOB:</div><div className="font-medium">{formData.dateOfBirth}</div>
                <div className="text-gray-500">Blood Group:</div><div className="font-medium">{formData.bloodGroup || '—'}</div>
                <div className="text-gray-500">Father:</div><div className="font-medium">{formData.fatherName} ({formData.fatherPhone})</div>
                <div className="text-gray-500">Mother:</div><div className="font-medium">{formData.motherName} ({formData.motherPhone})</div>
                <div className="text-gray-500">Address:</div><div className="font-medium">{formData.city}, {formData.state}</div>
              </div>
            </div>
            {mutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                Failed to submit. Please try again.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prev}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          {step < 7 ? (
            <button
              onClick={next}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              <Check className="w-4 h-4" /> {mutation.isPending ? 'Submitting...' : 'Submit Admission'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
