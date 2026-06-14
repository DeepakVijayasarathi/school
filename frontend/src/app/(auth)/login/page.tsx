'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Eye, EyeOff, GraduationCap, Loader2 } from 'lucide-react'

const loginSchema = z.object({
  tenantSlug: z.string().min(1, 'School ID is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

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
      // Error handled by axios interceptor
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4" />
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">SchoolKart</h1>
          <p className="text-gray-500 mt-1">School Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!twoFaMode ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" suppressHydrationWarning>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School ID</label>
                  <input
                    {...register('tenantSlug')}
                    placeholder="your-school-name"
                    suppressHydrationWarning
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                  {errors.tenantSlug && <p className="text-red-500 text-xs mt-1">{errors.tenantSlug.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email or Phone</label>
                  <input
                    {...register('email')}
                    placeholder="email@school.com"
                    suppressHydrationWarning
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      suppressHydrationWarning
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div className="flex justify-end">
                  <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  suppressHydrationWarning
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Two-Factor Authentication</h2>
              <p className="text-gray-500 text-sm mb-6">Enter the 6-digit code from your authenticator app.</p>
              <div className="space-y-4">
                <input
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  suppressHydrationWarning
                  className="w-full px-3 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={onTwoFa}
                  disabled={loading || twoFaCode.length !== 6}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify
                </button>
                <button onClick={() => setTwoFaMode(false)} className="w-full text-sm text-gray-500 hover:text-gray-700">
                  Back to login
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © {year} SchoolKart. All rights reserved.
        </p>
      </div>
    </div>
  )
}
