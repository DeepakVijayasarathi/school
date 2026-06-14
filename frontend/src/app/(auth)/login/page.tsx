'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Eye, EyeOff, Loader2, Shield, Sparkles, GraduationCap, Zap, Lock } from 'lucide-react'

const loginSchema = z.object({
  tenantSlug: z.string().min(1, 'School ID is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type LoginForm = z.infer<typeof loginSchema>

const FEATURES = [
  { icon: Shield,         text: 'Secure & Encrypted' },
  { icon: GraduationCap, text: 'Multi-role Access'   },
  { icon: Zap,           text: 'Real-time Updates'   },
]

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold tracking-wide uppercase"
        style={{ color: 'var(--text-3)' }}>{label}</label>
      {children}
      {error && <p className="text-[11px] flex items-center gap-1" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

export default function LoginPage() {
  const [showPass, setShowPass]   = useState(false)
  const [twoFaMode, setTwoFaMode] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [twoFaCode, setTwoFaCode] = useState('')
  const [loading, setLoading]     = useState(false)
  const [mounted, setMounted]     = useState(false)
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
        tenantSlug: data.tenantSlug.trim(),
        email:      data.email.trim(),
        password:   data.password,
      })
      if (res.data.requiresTwoFa) {
        setTempToken(res.data.accessToken)
        setTwoFaMode(true)
        toast('Enter your 2FA code to continue')
        return
      }
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken)
      toast.success(`Welcome, ${res.data.user.fullName}!`)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Invalid credentials. Please try again.')
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
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* Blank frame while mounting (avoids hydration flash) */
  if (!mounted) return (
    <div className="min-h-screen" style={{ background: '#080c12' }} />
  )

  return (
    <div
      className="min-h-screen flex overflow-hidden"
      style={{ background: '#080c12' }}
    >
      {/* ── Left panel — branding ───────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col items-start justify-between p-14 overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#0f1117 0%,#080c12 100%)' }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.06) 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
          aria-hidden="true"
        />

        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%)', filter: 'blur(40px)' }}
          aria-hidden="true" />
        <div className="absolute bottom-1/4 right-0 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(139,92,246,.12) 0%,transparent 70%)', filter: 'blur(40px)' }}
          aria-hidden="true" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 20px rgba(99,102,241,.45)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-[15px] leading-none tracking-tight">SchoolKart</p>
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mt-0.5"
                style={{ color: 'rgba(255,255,255,.3)' }}>ERP Platform</p>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6 max-w-[400px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(99,102,241,.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" aria-hidden="true" />
            All-in-one school management
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight"
            style={{ color: 'rgba(255,255,255,.93)' }}>
            Manage your school<br />
            <span style={{
              background: 'linear-gradient(90deg,#6366f1,#a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>effortlessly.</span>
          </h1>

          <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,.38)' }}>
            Students, fees, attendance, exams, HR and more —<br />
            all in one beautifully integrated platform.
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 pt-2">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-medium"
                style={{ background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.08)' }}>
                <Icon className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat strip */}
        <div className="relative z-10 flex items-center gap-8">
          {[['10K+','Students managed'],['99.9%','Uptime SLA'],['50+','Integrated modules']].map(([n, l]) => (
            <div key={l}>
              <p className="text-[20px] font-extrabold text-white leading-none">{n}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 relative"
        style={{ background: '#f6f7fb' }}>

        {/* Decorative corner arc */}
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none" aria-hidden="true"
          style={{ background: 'radial-gradient(circle at top right,rgba(99,102,241,.06) 0%,transparent 70%)' }} />

        <div className="w-full max-w-[380px] anim-fade-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,.35)' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <p className="font-bold text-[14px]" style={{ color: 'var(--text-1)' }}>SchoolKart ERP</p>
          </div>

          {/* Card */}
          <div className="card p-7 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
                  <Lock className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                </div>
                <div className="w-px h-6" style={{ background: 'var(--border)' }} />
                <span className="text-[11px] font-semibold tracking-widest uppercase"
                  style={{ color: 'var(--text-3)' }}>Secure Sign In</span>
              </div>
              <h2 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
                {twoFaMode ? 'Two-factor auth' : 'Welcome back'}
              </h2>
              <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>
                {twoFaMode
                  ? 'Enter the 6-digit code from your authenticator app.'
                  : 'Sign in to your school management portal.'}
              </p>
            </div>

            {/* ─── Login form ─── */}
            {!twoFaMode ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" suppressHydrationWarning>
                <Field label="School ID" error={errors.tenantSlug?.message}>
                  <input
                    {...register('tenantSlug')}
                    placeholder="your-school-name"
                    suppressHydrationWarning
                    className="input-base focus-ring"
                  />
                </Field>

                <Field label="Email address" error={errors.email?.message}>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="admin@school.com"
                    suppressHydrationWarning
                    className="input-base focus-ring"
                  />
                </Field>

                <Field label="Password" error={errors.password?.message}>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      suppressHydrationWarning
                      className="input-base focus-ring"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus-ring rounded-md p-0.5"
                      style={{ color: 'var(--text-4)' }}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <div className="flex justify-end">
                  <a href="/forgot-password"
                    className="text-[12px] font-medium transition-colors hover:underline"
                    style={{ color: 'var(--brand)' }}>
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  suppressHydrationWarning
                  className="btn btn-primary w-full"
                  style={{ paddingTop: '0.625rem', paddingBottom: '0.625rem' }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            ) : (
              /* ─── 2FA form ─── */
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-8 h-10 flex items-end justify-center border-b-2 transition-colors"
                      style={{ borderColor: twoFaCode[i] ? 'var(--brand)' : 'var(--border-2)' }}>
                      <span className="text-xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>
                        {twoFaCode[i] ?? ''}
                      </span>
                    </div>
                  ))}
                </div>

                <input
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  suppressHydrationWarning
                  className="input-base focus-ring text-center tracking-[0.25em] font-mono text-lg"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                />

                <button
                  onClick={onTwoFa}
                  disabled={loading || twoFaCode.length !== 6}
                  className="btn btn-primary w-full"
                  style={{ paddingTop: '0.625rem', paddingBottom: '0.625rem' }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Verifying…' : 'Verify Code'}
                </button>

                <button
                  onClick={() => setTwoFaMode(false)}
                  className="btn btn-ghost w-full text-[13px]"
                >
                  ← Back to login
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] mt-5" style={{ color: 'var(--text-4)' }}>
            © {year} SchoolKart ERP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
