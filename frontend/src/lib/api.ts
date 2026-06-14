import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

// SSR-safe storage helpers
const storage = {
  get: (key: string) => (typeof window !== 'undefined' ? localStorage.getItem(key) : null),
  set: (key: string, val: string) => { if (typeof window !== 'undefined') localStorage.setItem(key, val) },
  remove: (...keys: string[]) => { if (typeof window !== 'undefined') keys.forEach(k => localStorage.removeItem(k)) },
}

function clearAuthAndRedirect() {
  storage.remove('access_token', 'refresh_token')
  if (typeof window !== 'undefined') window.location.href = '/login'
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = storage.get('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const refreshToken = storage.get('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken })
        storage.set('access_token', data.accessToken)
        storage.set('refresh_token', data.refreshToken)

        queue.forEach((cb) => cb(data.accessToken))
        queue = []

        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        clearAuthAndRedirect()
      } finally {
        isRefreshing = false
      }
    }

    const message = (error.response?.data as any)?.error ?? error.message
    if (error.response?.status !== 401) toast.error(message)

    return Promise.reject(error)
  }
)

export const authApi = {
  login: (data: { tenantSlug: string; email?: string; phone?: string; password: string }) =>
    api.post('/auth/login', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (data: { tenantSlug: string; email?: string; phone?: string }) =>
    api.post('/auth/forgot-password', data),
  resetPassword: (data: { token: string; otp: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  setupTwoFa: () => api.post('/auth/2fa/setup'),
  enableTwoFa: (code: string) => api.post('/auth/2fa/enable', { code }),
  verifyTwoFa: (tempToken: string, code: string) =>
    api.post('/auth/2fa/verify', { tempToken, code }),
}

export const studentsApi = {
  list: (params?: Record<string, any>) => api.get('/students', { params }),
  get: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
  promote: (data: any) => api.post('/students/promote', data),
}

export const schoolApi = {
  getAcademicYears: () => api.get('/school/academic-years'),
  createAcademicYear: (data: any) => api.post('/school/academic-years', data),
  setCurrentYear: (id: string) => api.patch(`/school/academic-years/${id}/set-current`),
  getCampuses: () => api.get('/school/campuses'),
  createCampus: (data: any) => api.post('/school/campuses', data),
  getClasses: (campusId?: string) => api.get('/school/classes', { params: { campusId } }),
  createClass: (data: any) => api.post('/school/classes', data),
  getSections: (classId: string, academicYearId?: string) =>
    api.get('/school/sections', { params: { classId, academicYearId } }),
  createSection: (data: any) => api.post('/school/sections', data),
}

export const attendanceApi = {
  getStudents: (sectionId: string, date: string) =>
    api.get('/attendance/students', { params: { sectionId, date } }),
  markStudents: (data: any) => api.post('/attendance/students/mark', data),
  getStudentReport: (studentId: string, params?: any) =>
    api.get('/attendance/students/report', { params: { studentId, ...params } }),
  getStaff: (date: string) => api.get('/attendance/staff', { params: { date } }),
  markStaff: (data: any) => api.post('/attendance/staff/mark', data),
}

export const feesApi = {
  getCategories: () => api.get('/fees/categories'),
  createCategory: (data: any) => api.post('/fees/categories', data),
  getStructures: (params?: any) => api.get('/fees/structures', { params }),
  createStructure: (data: any) => api.post('/fees/structures', data),
  getStudentFees: (studentId: string, academicYearId?: string) =>
    api.get(`/fees/student/${studentId}`, { params: { academicYearId } }),
  assignFees: (studentId: string, academicYearId: string) =>
    api.post(`/fees/assign/${studentId}`, { academicYearId }),
  collectPayment: (data: any) => api.post('/fees/pay', data),
  getReceipts: (studentId: string) => api.get(`/fees/receipts/${studentId}`),
  getDues: (params?: any) => api.get('/fees/dues', { params }),
}

export const examsApi = {
  list: (academicYearId?: string) => api.get('/exams', { params: { academicYearId } }),
  create: (data: any) => api.post('/exams', data),
  getSchedule: (examId: string) => api.get(`/exams/${examId}/schedule`),
  addSchedule: (examId: string, data: any) => api.post(`/exams/${examId}/schedule`, data),
  getMarks: (scheduleId: string) => api.get(`/exams/schedule/${scheduleId}/marks`),
  saveMarks: (scheduleId: string, data: any) => api.post(`/exams/schedule/${scheduleId}/marks`, data),
  getResults: (examId: string, sectionId: string) =>
    api.get(`/exams/${examId}/results/${sectionId}`),
}

export const hrApi = {
  getEmployees: (params?: any) => api.get('/hr/employees', { params }),
  getEmployee: (id: string) => api.get(`/hr/employees/${id}`),
  createEmployee: (data: any) => api.post('/hr/employees', data),
  updateEmployee: (id: string, data: any) => api.put(`/hr/employees/${id}`, data),
  getSalary: (id: string) => api.get(`/hr/employees/${id}/salary`),
  setSalary: (id: string, data: any) => api.post(`/hr/employees/${id}/salary`, data),
  getPayrolls: (year?: number) => api.get('/hr/payroll', { params: { year } }),
  processPayroll: (data: any) => api.post('/hr/payroll/process', data),
  approvePayroll: (id: string) => api.post(`/hr/payroll/${id}/approve`),
  markPaid: (id: string) => api.post(`/hr/payroll/${id}/mark-paid`),
  getPayslips: (employeeId: string, year?: number) =>
    api.get(`/hr/payslips/${employeeId}`, { params: { year } }),
  getDepartments: () => api.get('/hr/departments'),
  createDepartment: (data: any) => api.post('/hr/departments', data),
}

export const libraryApi = {
  getBooks: (params?: any) => api.get('/library/books', { params }),
  getBook: (id: string) => api.get(`/library/books/${id}`),
  addBook: (data: any) => api.post('/library/books', data),
  updateBook: (id: string, data: any) => api.put(`/library/books/${id}`, data),
  issueBook: (data: any) => api.post('/library/issues', data),
  returnBook: (issueId: string) => api.post(`/library/issues/${issueId}/return`),
  getActiveIssues: (params?: any) => api.get('/library/issues/active', { params }),
  getIssueHistory: (params?: any) => api.get('/library/issues/history', { params }),
  getStats: () => api.get('/library/stats'),
}

export const transportApi = {
  getRoutes: () => api.get('/transport/routes'),
  getRoute: (id: string) => api.get(`/transport/routes/${id}`),
  createRoute: (data: any) => api.post('/transport/routes', data),
  addStop: (routeId: string, data: any) => api.post(`/transport/routes/${routeId}/stops`, data),
  getVehicles: () => api.get('/transport/vehicles'),
  createVehicle: (data: any) => api.post('/transport/vehicles', data),
  updateVehicle: (id: string, data: any) => api.put(`/transport/vehicles/${id}`, data),
  getStudentTransport: (params?: any) => api.get('/transport/students', { params }),
  assignTransport: (data: any) => api.post('/transport/students/assign', data),
  removeTransport: (studentId: string) => api.delete(`/transport/students/${studentId}`),
}

export const communicationApi = {
  getAnnouncements: (params?: any) => api.get('/communication/announcements', { params }),
  createAnnouncement: (data: any) => api.post('/communication/announcements', data),
  deleteAnnouncement: (id: string) => api.delete(`/communication/announcements/${id}`),
  sendSms: (data: any) => api.post('/communication/sms/send', data),
  smsBlast: (data: any) => api.post('/communication/sms/blast', data),
  sendEmail: (data: any) => api.post('/communication/email/send', data),
  sendWhatsApp: (data: any) => api.post('/communication/whatsapp/send', data),
  getLogs: (params?: any) => api.get('/communication/logs', { params }),
}

export const hostelApi = {
  getStats: () => api.get('/hostel/stats'),
  getHostels: () => api.get('/hostel'),
  createHostel: (data: any) => api.post('/hostel', data),
  getRooms: (hostelId: string) => api.get(`/hostel/${hostelId}/rooms`),
  createRoom: (hostelId: string, data: any) => api.post(`/hostel/${hostelId}/rooms`, data),
  getAllocations: (params?: any) => api.get('/hostel/allocations', { params }),
  allocateRoom: (data: any) => api.post('/hostel/allocations', data),
  vacateRoom: (id: string) => api.post(`/hostel/allocations/${id}/vacate`),
  getVisitors: (params?: any) => api.get('/hostel/visitors', { params }),
  checkInVisitor: (data: any) => api.post('/hostel/visitors', data),
  checkOutVisitor: (id: string) => api.post(`/hostel/visitors/${id}/checkout`),
  getComplaints: (params?: any) => api.get('/hostel/complaints', { params }),
  raiseComplaint: (data: any) => api.post('/hostel/complaints', data),
  updateComplaint: (id: string, data: any) => api.put(`/hostel/complaints/${id}`, data),
}

export const inventoryApi = {
  getStats: () => api.get('/inventory/stats'),
  getAssetCategories: () => api.get('/inventory/asset-categories'),
  createAssetCategory: (data: any) => api.post('/inventory/asset-categories', data),
  getAssets: (params?: any) => api.get('/inventory/assets', { params }),
  createAsset: (data: any) => api.post('/inventory/assets', data),
  updateAsset: (id: string, data: any) => api.put(`/inventory/assets/${id}`, data),
  getStock: (params?: any) => api.get('/inventory/stock', { params }),
  createStockItem: (data: any) => api.post('/inventory/stock', data),
  stockTransaction: (id: string, data: any) => api.post(`/inventory/stock/${id}/transaction`, data),
  getTransactions: (id: string) => api.get(`/inventory/stock/${id}/transactions`),
  getPurchaseOrders: (params?: any) => api.get('/inventory/purchase-orders', { params }),
  createPurchaseOrder: (data: any) => api.post('/inventory/purchase-orders', data),
  receiveOrder: (id: string) => api.post(`/inventory/purchase-orders/${id}/receive`),
  updateOrderStatus: (id: string, status: string) => api.patch(`/inventory/purchase-orders/${id}/status`, { status }),
}

export const reportsApi = {
  getOverview: () => api.get('/reports/overview'),
  getStudentReport: (params?: any) => api.get('/reports/students', { params }),
  getAttendanceReport: (params?: any) => api.get('/reports/attendance', { params }),
  getFeeReport: (params?: any) => api.get('/reports/fees', { params }),
  getExamReport: (params?: any) => api.get('/reports/exams', { params }),
  getHrReport: () => api.get('/reports/hr'),
  getLibraryReport: () => api.get('/reports/library'),
  getTransportReport: () => api.get('/reports/transport'),
}

export const accountingApi = {
  getGroups: () => api.get('/accounting/groups'),
  createGroup: (data: any) => api.post('/accounting/groups', data),
  getLedgers: (params?: any) => api.get('/accounting/ledgers', { params }),
  createLedger: (data: any) => api.post('/accounting/ledgers', data),
  getLedger: (id: string) => api.get(`/accounting/ledgers/${id}`),
  getVouchers: (params?: any) => api.get('/accounting/vouchers', { params }),
  createVoucher: (data: any) => api.post('/accounting/vouchers', data),
  getVoucher: (id: string) => api.get(`/accounting/vouchers/${id}`),
  postVoucher: (id: string) => api.post(`/accounting/vouchers/${id}/post`),
  getTrialBalance: (params?: any) => api.get('/accounting/trial-balance', { params }),
  getBalanceSheet: (params?: any) => api.get('/accounting/balance-sheet', { params }),
  getProfitLoss: (params?: any) => api.get('/accounting/profit-loss', { params }),
  getCashBook: (params?: any) => api.get('/accounting/cash-book', { params }),
  getDayBook: (params?: any) => api.get('/accounting/day-book', { params }),
  getLedgerStatement: (id: string, params?: any) => api.get(`/accounting/ledgers/${id}/statement`, { params }),
}

export const timetableApi = {
  getTemplates: () => api.get('/timetable/templates'),
  createTemplate: (data: any) => api.post('/timetable/templates', data),
  getSectionTimetable: (sectionId: string, academicYearId: string) =>
    api.get(`/timetable/section/${sectionId}`, { params: { academicYearId } }),
  getTeacherTimetable: (teacherId: string, academicYearId: string) =>
    api.get(`/timetable/teacher/${teacherId}`, { params: { academicYearId } }),
  saveEntries: (academicYearId: string, classId: string, data: any) =>
    api.post('/timetable/entries', data, { params: { academicYearId, classId } }),
  deleteEntry: (id: string) => api.delete(`/timetable/entries/${id}`),
  getClassTeachers: () => api.get('/timetable/class-teachers'),
  assignClassTeacher: (data: any) => api.post('/timetable/class-teachers', data),
  getLessonPlans: (params?: any) => api.get('/timetable/lesson-plans', { params }),
  createLessonPlan: (data: any) => api.post('/timetable/lesson-plans', data),
  getCalendar: (academicYearId: string) => api.get('/timetable/calendar', { params: { academicYearId } }),
  createCalendarEvent: (data: any) => api.post('/timetable/calendar', data),
}

export const admissionApi = {
  getInquiries: (params?: any) => api.get('/admissions/inquiries', { params }),
  createInquiry: (data: any) => api.post('/admissions/inquiries', data),
  getApplications: (params?: any) => api.get('/admissions/applications', { params }),
  getApplication: (id: string) => api.get(`/admissions/applications/${id}`),
  createApplication: (data: any) => api.post('/admissions/applications', data),
  updateStatus: (id: string, data: any) => api.patch(`/admissions/applications/${id}/status`, data),
  scheduleTest: (id: string, data: any) => api.post(`/admissions/applications/${id}/test`, data),
  getMeritList: (params?: any) => api.get('/admissions/merit-list', { params }),
  convertToStudent: (id: string) => api.post(`/admissions/applications/${id}/convert`),
  getAdmissionLetter: (id: string) => api.get(`/admissions/applications/${id}/letter`),
}

export const visitorApi = {
  getVisitors: (params?: any) => api.get('/visitor/check-ins', { params }),
  checkIn: (data: any) => api.post('/visitor/check-in', data),
  checkOut: (id: string) => api.post(`/visitor/check-out/${id}`),
  getGatePasses: (params?: any) => api.get('/visitor/gate-passes', { params }),
  createGatePass: (data: any) => api.post('/visitor/gate-passes', data),
  approveGatePass: (id: string) => api.post(`/visitor/gate-passes/${id}/action`, { action: 'approve' }),
  gatePassAction: (id: string, action: string, reason?: string) =>
    api.post(`/visitor/gate-passes/${id}/action`, { action, reason }),
  getCurrentlyInside: () => api.get('/visitor/currently-inside'),
}

export const parentPortalApi = {
  register: (data: any) => api.post('/parent-portal/register', data),
  getChildren: () => api.get('/parent-portal/children'),
  getChildDashboard: (studentId: string) => api.get(`/parent-portal/children/${studentId}/dashboard`),
  getChildAttendance: (studentId: string, params?: any) =>
    api.get(`/parent-portal/children/${studentId}/attendance`, { params }),
  getChildFees: (studentId: string) => api.get(`/parent-portal/children/${studentId}/fees`),
  getChildResults: (studentId: string) => api.get(`/parent-portal/children/${studentId}/results`),
  getPtmSchedule: () => api.get('/parent-portal/ptm'),
  bookPtm: (data: any) => api.post('/parent-portal/ptm/book', data),
  getMessages: () => api.get('/parent-portal/messages'),
  sendMessage: (data: any) => api.post('/parent-portal/messages', data),
}

export const parentsApi = {
  list: (params?: any) => api.get('/parents', { params }),
  get: (id: string) => api.get(`/parents/${id}`),
  create: (data: any) => api.post('/parents', data),
  update: (id: string, data: any) => api.put(`/parents/${id}`, data),
  linkStudent: (data: any) => api.post('/parents/link-student', data),
  unlinkStudent: (mappingId: string) => api.delete(`/parents/link-student/${mappingId}`),
}

export const homeworkApi = {
  list: (params?: any) => api.get('/homework', { params }),
  create: (data: any) => api.post('/homework', data),
  update: (id: string, data: any) => api.put(`/homework/${id}`, data),
  delete: (id: string) => api.delete(`/homework/${id}`),
}

export const exportApi = {
  students: (params?: any) => api.get('/export/students', { params, responseType: 'blob' }),
  attendance: (params?: any) => api.get('/export/attendance', { params, responseType: 'blob' }),
  fees: (params?: any) => api.get('/export/fees', { params, responseType: 'blob' }),
  payroll: (params?: any) => api.get('/export/payroll', { params, responseType: 'blob' }),
  reportCard: (studentId: string) => api.get(`/export/report-card/${studentId}`, { responseType: 'blob' }),
  hallTicket: (studentId: string, examId: string) =>
    api.get(`/export/hall-ticket/${studentId}/${examId}`, { responseType: 'blob' }),
}

export const onlineLearningApi = {
  // Courses
  getCourses: (params?: any) => api.get('/onlinelearning/courses', { params }),
  getCourse: (id: string) => api.get(`/onlinelearning/courses/${id}`),
  createCourse: (data: any) => api.post('/onlinelearning/courses', data),
  updateCourse: (id: string, data: any) => api.put(`/onlinelearning/courses/${id}`, data),
  // Live classes
  getLiveClasses: (params?: any) => api.get('/onlinelearning/live-classes', { params }),
  getCourseLiveClasses: (courseId: string) => api.get(`/onlinelearning/courses/${courseId}/live-classes`),
  scheduleLiveClass: (courseId: string, data: any) => api.post(`/onlinelearning/courses/${courseId}/live-classes`, data),
  startClass: (id: string) => api.post(`/onlinelearning/live-classes/${id}/start`),
  endClass: (id: string) => api.post(`/onlinelearning/live-classes/${id}/end`),
  joinClass: (id: string) => api.get(`/onlinelearning/live-classes/${id}/join`),
  // Videos
  getVideos: (courseId: string) => api.get(`/onlinelearning/courses/${courseId}/videos`),
  addVideo: (courseId: string, data: any) => api.post(`/onlinelearning/courses/${courseId}/videos`, data),
  updateProgress: (videoId: string, data: any) => api.post(`/onlinelearning/videos/${videoId}/progress`, data),
  // Assignments
  getAssignments: (courseId: string) => api.get(`/onlinelearning/courses/${courseId}/assignments`),
  createAssignment: (courseId: string, data: any) => api.post(`/onlinelearning/courses/${courseId}/assignments`, data),
  submitAssignment: (assignmentId: string, data: any) => api.post(`/onlinelearning/assignments/${assignmentId}/submit`, data),
  getSubmissions: (assignmentId: string) => api.get(`/onlinelearning/assignments/${assignmentId}/submissions`),
  gradeSubmission: (submissionId: string, data: any) => api.put(`/onlinelearning/submissions/${submissionId}/grade`, data),
  // Quizzes
  getQuizzes: (courseId: string) => api.get(`/onlinelearning/courses/${courseId}/quizzes`),
  createQuiz: (courseId: string, data: any) => api.post(`/onlinelearning/courses/${courseId}/quizzes`, data),
  getQuiz: (id: string) => api.get(`/onlinelearning/quizzes/${id}`),
  submitQuiz: (id: string, data: any) => api.post(`/onlinelearning/quizzes/${id}/attempt`, data),
  getQuizResults: (id: string) => api.get(`/onlinelearning/quizzes/${id}/results`),
}
