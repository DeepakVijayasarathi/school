export interface User {
  id: string
  tenantId: string
  fullName: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  profilePicture?: string
  role: string
  permissions: string[]
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface AcademicYear {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
  isLocked: boolean
}

export interface Campus {
  id: string
  name: string
  code?: string
  city?: string
  phone?: string
  email?: string
}

export interface Class {
  id: string
  name: string
  numericLevel?: number
  campusId?: string
}

export interface Section {
  id: string
  name: string
  roomNumber?: string
  maxStrength: number
  classTeacher?: { id: string; firstName: string; lastName: string }
}

export interface StudentList {
  id: string
  admissionNumber: string
  fullName: string
  gender: string
  dateOfBirth: string
  className?: string
  sectionName?: string
  rollNumber?: string
  status: string
  profilePicture?: string
}

export interface StudentDetail {
  id: string
  admissionNumber: string
  firstName: string
  lastName?: string
  fullName: string
  gender: string
  dateOfBirth: string
  bloodGroup?: string
  religion?: string
  caste?: string
  category?: string
  nationality: string
  motherTongue?: string
  aadharNumber?: string
  profilePicture?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  status: string
  admissionDate: string
  leavingDate?: string
  previousSchool?: string
  previousClass?: string
  remarks?: string
  currentEnrollment?: {
    id: string
    academicYear: string
    className: string
    sectionName: string
    rollNumber?: string
    enrolledAt: string
  }
  guardians: Guardian[]
  documents: Document[]
}

export interface Guardian {
  id: string
  fullName: string
  phone: string
  email?: string
  occupation?: string
  relation: string
  isPrimary: boolean
  isPickup: boolean
}

export interface Document {
  id: string
  type: string
  name: string
  fileUrl: string
  verified: boolean
  uploadedAt: string
}

export interface AttendanceRecord {
  id: string
  admissionNumber: string
  fullName: string
  rollNumber?: string
  status: 'Present' | 'Absent' | 'Late' | 'HalfDay' | 'Excused' | 'NotMarked'
  remarks?: string
}

export interface FeeStructure {
  id: string
  name: string
  category: string
  amount: number
  frequency: string
  dueDay?: number
  isOptional: boolean
}

export interface StudentFee {
  id: string
  name: string
  category: string
  amount: number
  discountAmount: number
  finalAmount: number
  paidAmount: number
  pending: number
  dueDate?: string
  status: string
}

export interface Exam {
  id: string
  name: string
  type: string
  startDate?: string
  endDate?: string
  isPublished: boolean
}

export interface ExamResult {
  rank: number
  id: string
  admissionNumber: string
  fullName: string
  rollNumber?: string
  totalMaxMarks: number
  totalObtained: number
  percentage: number
  result: string
  subjects: SubjectResult[]
}

export interface SubjectResult {
  subject: string
  maxMarks: number
  passMarks: number
  obtainedMarks?: number
  isAbsent: boolean
  pass: boolean
}
