'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Eye, EyeOff, GraduationCap, Loader2, Shield, Zap, Users } from 'lucide-react'

const loginSchema = z.object({
  tenantSlug: z.string().min(1, 'School ID is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

const features = [
  { icon: Shield, label: 'Secure & encrypted' },
  { icon: Zap,    label: 'Real-time updates' },
  { icon: Users,  label: 'Multi-role access' },
]

function InputField({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs flex items-center gap-1">{error}</p>}
    </div>
  )
}

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const [twoFaMode, setTwoFaMode] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [twoFaCode, setTwoFaCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const year = new Date().getFullYear()
  const router = useRouter()
  const { setAuth } = useAuthStore()

  useEffect(() => { setMounted(true) }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const inputClass = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all bg-gray-50/50 placeholder:text-gray-400'

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login({
        tenantSlug: data.tenantSlug,
        email: data.email || undefined,
        phone: data.phone || undefined,
        password: data.password,
      })

      if (res.data.requiresTwoFa) {
        setTempToken(res.data.accessToken)
        setTwoFaMode(true)
        toast('Please enter your 2FA code')
        return
      }

      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken)
      toast.success(`Welcome, ${res.data.user.fullName}!`)
      router.push('/dashboard')
    } catch {
      // handled by axios interceptor
    } finally {
      setLoading(false)
    }
  }

  const onTwoFa = async () => {
    setLoading(true)
    try {
      const res = await authApi.verifyTwoFa(tempToken, twoFaCode)
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken)
      toast.success('Logged in successfully!')
      router.push('/dashboard')
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }} />
  )

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e2d4a 50%, #0f172a 100%)' }}
    >
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="w-full max-w-sm relative">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-2xl shadow-blue-500/30"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #4f46e5)' }}>
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SchoolKart ERP</h1>
          <p className="text-slate-400 text-sm mt-1">School Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          <div className="p-7">
            {!twoFaMode ? (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Welcome back</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Sign in to your school portal</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" suppressHydrationWarning>
                  <InputField label="School ID" error={errors.tenantSlug?.message}>
                    <input
                      {...register('tenantSlug')}
                      placeholder="your-school-name"
                      suppressHydrationWarning
                      className={inputClass}
                    />
                  </InputField>

                  <InputField label="Email" error={errors.email?.message}>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="admin@school.com"
                      suppressHydrationWarning
                      className={inputClass}
                    />
                  </InputField>

                  <InputField label="Password" error={errors.password?.message}>
                    <div className="relative">
                      <input
                        {...register('password')}
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        suppressHydrationWarning
                        className={inputClass + ' pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPass ? 'Hide password' : 'Show password'}
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </InputField>

                  <div className="flex justify-end">
                    <a href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    suppressHydrationWarning
                    className="w-full py-2.5 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] shadow-md shadow-blue-200"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #4f46e5)' }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Sign In
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Two-Factor Auth</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Enter the 6-digit code from your authenticator app.</p>
                </div>

                <div className="space-y-4">
                  <input
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000 000"
                    suppressHydrationWarning
                    className="w-full px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none bg-gray-50/50 transition-all"
                  />
                  <button
                    onClick={onTwoFa}
                    disabled={loading || twoFaCode.length !== 6}
                    className="w-full py-2.5 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #4f46e5)' }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Verify Code
                  </button>
                  <button
                    onClick={() => setTwoFaMode(false)}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
                  >
                    Back to login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-slate-500 text-xs">
              <Icon className="w-3 h-3 text-slate-400" />
              {label}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          © {year} SchoolKart. All rights reserved.
        </p>
      </div>
    </div>
  )
}
