'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'
import { GraduationCap, Loader2, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react'

const requestSchema = z.object({
  tenantSlug: z.string().min(1, 'School ID is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

const resetSchema = z.object({
  otp: z.string().length(6, 'Code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RequestForm = z.infer<typeof requestSchema>
type ResetForm = z.infer<typeof resetSchema>

const inputClass = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all bg-gray-50/50 placeholder:text-gray-400'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [token, setToken] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const requestForm = useForm<RequestForm>({ resolver: zodResolver(requestSchema) })
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) })

  const onRequest = async (data: RequestForm) => {
    setLoading(true)
    try {
      const res = await authApi.forgotPassword({ tenantSlug: data.tenantSlug.trim(), email: data.email.trim() })
      setToken(res.data.token)
      if (res.data.otp) {
        setOtp(res.data.otp)
        toast.success(`Your reset code is: ${res.data.otp}`)
      } else {
        toast.success('Reset code sent to your email.')
      }
      setStep('reset')
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'No account found with those details.')
    } finally {
      setLoading(false)
    }
  }

  const onReset = async (data: ResetForm) => {
    setLoading(true)
    try {
      await authApi.resetPassword({ token, otp: data.otp, newPassword: data.newPassword })
      toast.success('Password reset successfully! Please log in.')
      router.push('/login')
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e2d4a 50%, #0f172a 100%)' }}
    >
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-2xl shadow-blue-500/30"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #4f46e5)' }}
          >
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SchoolKart ERP</h1>
          <p className="text-slate-400 text-sm mt-1">Password Recovery</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          <div className="p-7">
            {step === 'request' ? (
              <>
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <KeyRound className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Forgot Password?</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Enter your school ID and email to get a reset code.</p>
                </div>

                <form onSubmit={requestForm.handleSubmit(onRequest)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">School ID</label>
                    <input
                      {...requestForm.register('tenantSlug')}
                      placeholder="your-school-name"
                      className={inputClass}
                    />
                    {requestForm.formState.errors.tenantSlug && (
                      <p className="text-red-500 text-xs">{requestForm.formState.errors.tenantSlug.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      {...requestForm.register('email')}
                      type="email"
                      placeholder="admin@school.com"
                      className={inputClass}
                    />
                    {requestForm.formState.errors.email && (
                      <p className="text-red-500 text-xs">{requestForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] shadow-md"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #4f46e5)' }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Send Reset Code
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                    <KeyRound className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Enter Reset Code</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {otp
                      ? `Your code is shown in the notification above.`
                      : 'Check your email for the 6-digit reset code.'}
                  </p>
                </div>

                <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Reset Code</label>
                    <input
                      {...resetForm.register('otp')}
                      placeholder="000000"
                      maxLength={6}
                      className={inputClass + ' text-center tracking-widest font-mono text-lg'}
                      defaultValue={otp}
                    />
                    {resetForm.formState.errors.otp && (
                      <p className="text-red-500 text-xs">{resetForm.formState.errors.otp.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative">
                      <input
                        {...resetForm.register('newPassword')}
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={inputClass + ' pr-10'}
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {resetForm.formState.errors.newPassword && (
                      <p className="text-red-500 text-xs">{resetForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <div className="relative">
                      <input
                        {...resetForm.register('confirmPassword')}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={inputClass + ' pr-10'}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {resetForm.formState.errors.confirmPassword && (
                      <p className="text-red-500 text-xs">{resetForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] shadow-md"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #4f46e5)' }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Reset Password
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors"
                  >
                    Try a different email
                  </button>
                </form>
              </>
            )}

            <button
              onClick={() => router.push('/login')}
              className="mt-5 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
