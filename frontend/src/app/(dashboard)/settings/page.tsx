'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { User, Shield, Bell, Palette, Link, CreditCard, Eye, EyeOff, Check, Loader2, Menu } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api as httpClient, authApi } from '@/lib/api'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'profile',       label: 'Profile',       icon: User },
  { key: 'security',      label: 'Security',      icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'branding',      label: 'Branding',      icon: Palette },
  { key: 'integrations',  label: 'Integrations',  icon: Link },
  { key: 'billing',       label: 'Billing',       icon: CreditCard },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const activeTab = TABS.find(t => t.key === tab)

  return (
    <div className="space-y-5 max-w-5xl anim-fade-up">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Manage your account and school preferences</p>
      </div>

      {/* Mobile tab selector */}
      <div className="sm:hidden">
        <button
          onClick={() => setMobileMenuOpen(m => !m)}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
        >
          {activeTab && <activeTab.icon className="w-4 h-4" />}
          {activeTab?.label}
          <Menu className="w-4 h-4 ml-auto" style={{ color: 'var(--text-4)' }} />
        </button>
        {mobileMenuOpen && (
          <div className="mt-1 rounded-xl overflow-hidden shadow-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setTab(key); setMobileMenuOpen(false) }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-left transition-colors"
                style={tab === key
                  ? { background: 'var(--brand-bg)', color: 'var(--brand)', borderBottom: '1px solid var(--border)' }
                  : { color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-5">
        {/* Sidebar — desktop only */}
        <div className="hidden sm:block w-48 flex-shrink-0">
          <div className="card overflow-hidden sticky top-6" style={{ padding: 0 }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-left transition-colors"
                style={tab === key
                  ? { background: 'var(--brand-bg)', color: 'var(--brand)', borderLeft: '3px solid var(--brand)', borderBottom: '1px solid var(--border)' }
                  : { color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === 'profile'       && <ProfileSettings />}
          {tab === 'security'      && <SecuritySettings />}
          {tab === 'notifications' && <NotificationSettings />}
          {tab === 'branding'      && <BrandingSettings />}
          {tab === 'integrations'  && <IntegrationSettings />}
          {tab === 'billing'       && <BillingSettings />}
        </div>
      </div>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 space-y-5">
      <div>
        <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function ProfileSettings() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    email:     user?.email     ?? '',
    phone:     (user as any)?.phone ?? '',
  })

  const saveMutation = useMutation({
    mutationFn: () => httpClient.put('/auth/profile', form),
    onSuccess: (res) => {
      if (user && accessToken && refreshToken)
        setAuth({ ...user, firstName: form.firstName, lastName: form.lastName, fullName: `${form.firstName} ${form.lastName}`.trim(), email: form.email }, accessToken, refreshToken)
      toast.success('Profile updated successfully')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  return (
    <Card title="Profile Information" subtitle="Update your personal details">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--brand), #6366f1cc)' }}>
          {(form.firstName?.[0] ?? user?.fullName?.[0] ?? 'U').toUpperCase()}
        </div>
        <div>
          <button className="text-sm font-medium hover:underline" style={{ color: 'var(--brand)' }}>Change Photo</button>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>JPG, PNG max 2MB</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { k: 'firstName', l: 'First Name' },
          { k: 'lastName',  l: 'Last Name'  },
          { k: 'email',     l: 'Email',  t: 'email' },
          { k: 'phone',     l: 'Phone',  t: 'tel'   },
        ].map(f => (
          <div key={f.k}>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{f.l}</label>
            <input type={f.t ?? 'text'}
              value={(form as any)[f.k]}
              onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
              className="input-base focus-ring w-full mt-1" />
          </div>
        ))}
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="btn btn-primary flex items-center gap-2"
      >
        {saveMutation.isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          : saveMutation.isSuccess
            ? <><Check className="w-4 h-4" /> Saved!</>
            : 'Save Changes'
        }
      </button>
    </Card>
  )
}

function SecuritySettings() {
  const [show, setShow]   = useState({ current: false, new: false, confirm: false })
  const [pwd, setPwd]     = useState({ current: '', new: '', confirm: '' })
  const [msg, setMsg]     = useState('')
  const [msgIsSuccess, setMsgIsSuccess] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [qrUri, setQrUri] = useState('')
  const [twoFaSetupCode, setTwoFaSetupCode] = useState('')

  const changePassword = () => {
    setMsg('')
    if (pwd.new !== pwd.confirm) { setMsg('Passwords do not match.'); setMsgIsSuccess(false); return }
    if (pwd.new.length < 8)      { setMsg('Password must be at least 8 characters.'); setMsgIsSuccess(false); return }
    authApi.changePassword({ currentPassword: pwd.current, newPassword: pwd.new })
      .then(() => { setMsg('Password changed successfully!'); setMsgIsSuccess(true); setPwd({ current: '', new: '', confirm: '' }) })
      .catch((err: any) => { setMsg(err?.response?.data?.error ?? 'Current password is incorrect.'); setMsgIsSuccess(false) })
  }

  const toggleTwoFa = async () => {
    if (!twoFAEnabled) {
      try {
        const res = await authApi.setupTwoFa()
        setQrUri(res.data.uri)
        setTwoFAEnabled(true)
      } catch {
        toast.error('Failed to set up 2FA')
      }
    } else {
      setTwoFAEnabled(false)
      setQrUri('')
      setTwoFaSetupCode('')
    }
  }

  const enableTwoFa = async () => {
    try {
      await authApi.enableTwoFa(twoFaSetupCode)
      toast.success('Two-factor authentication enabled!')
      setQrUri('')
      setTwoFaSetupCode('')
    } catch {
      toast.error('Invalid verification code')
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Change Password" subtitle="Use a strong password at least 8 characters">
        <div className="space-y-3 max-w-md">
          {([
            { k: 'current', l: 'Current Password' },
            { k: 'new',     l: 'New Password'     },
            { k: 'confirm', l: 'Confirm New Password' },
          ] as const).map(f => (
            <div key={f.k}>
              <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{f.l}</label>
              <div className="relative mt-1">
                <input
                  type={(show as any)[f.k] ? 'text' : 'password'}
                  value={(pwd as any)[f.k]}
                  onChange={e => setPwd(p => ({ ...p, [f.k]: e.target.value }))}
                  className="input-base focus-ring w-full pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShow(p => ({ ...p, [f.k]: !(p as any)[f.k] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-4)' }}
                >
                  {(show as any)[f.k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {msg && (
            <p className="text-sm" style={{ color: msgIsSuccess ? 'var(--success)' : 'var(--danger)' }}>{msg}</p>
          )}
          <button onClick={changePassword} className="btn btn-primary">
            Change Password
          </button>
        </div>
      </Card>

      <Card title="Two-Factor Authentication" subtitle="Add an extra layer of security">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Authenticator App</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>Use Google Authenticator or Authy</p>
          </div>
          <button
            onClick={toggleTwoFa}
            className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
            style={{ background: twoFAEnabled ? 'var(--brand)' : 'var(--border)' }}
            role="switch" aria-checked={twoFAEnabled}
          >
            <span className={cn('absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform', twoFAEnabled && 'translate-x-6')} />
          </button>
        </div>
        {twoFAEnabled && qrUri && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface-2)' }}>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUri)}`}
                alt="2FA QR Code"
                className="w-40 h-40 rounded-lg"
                style={{ border: '1px solid var(--border)' }}
              />
            </div>
            <div className="flex gap-2">
              <input
                value={twoFaSetupCode}
                onChange={e => setTwoFaSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="input-base focus-ring flex-1 font-mono tracking-widest text-center"
              />
              <button
                onClick={enableTwoFa}
                disabled={twoFaSetupCode.length !== 6}
                className="btn btn-primary disabled:opacity-50"
              >
                Verify
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card title="Login History" subtitle="Recent sign-in activity on your account">
        <div className="space-y-0">
          {[
            { device: 'Chrome on Windows', ip: '192.168.1.1', time: '2 hours ago', current: true },
            { device: 'Safari on iPhone',  ip: '192.168.1.5', time: 'Yesterday',   current: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-3" style={{ borderBottom: i < 1 ? '1px solid var(--border)' : 'none' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{s.device}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{s.ip} · {s.time}</p>
              </div>
              {s.current
                ? <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ color: 'var(--success)', background: 'var(--success-bg)' }}>Current</span>
                : <button className="text-xs hover:underline" style={{ color: 'var(--danger)' }}>Revoke</button>
              }
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{label}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch" aria-checked={value}
        className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
        style={{ background: value ? 'var(--brand)' : 'var(--border)' }}
      >
        <span className={cn('absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform', value && 'translate-x-5')} />
      </button>
    </div>
  )
}

function NotificationSettings() {
  const [prefs, setPrefs] = useState({
    attendanceSms: true,  attendanceEmail: false,
    feesSms: true,        feesEmail: true,
    resultsSms: true,     resultsEmail: true,
    homeworkPush: true,   eventsPush: true,   generalPush: true,
  })
  const upd = (k: keyof typeof prefs, v: boolean) => setPrefs(p => ({ ...p, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: () => httpClient.post('/notification-preferences', prefs),
    onSuccess: () => toast.success('Notification preferences saved'),
    onError:   () => toast.error('Failed to save preferences'),
  })

  return (
    <Card title="Notification Preferences" subtitle="Choose how you receive alerts">
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Attendance</h4>
          <Toggle label="SMS for Absence"   desc="Get SMS when a student is absent" value={prefs.attendanceSms}   onChange={v => upd('attendanceSms',   v)} />
          <Toggle label="Email for Absence"                                          value={prefs.attendanceEmail} onChange={v => upd('attendanceEmail', v)} />
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Fees</h4>
          <Toggle label="Fee Due SMS"   value={prefs.feesSms}   onChange={v => upd('feesSms',   v)} />
          <Toggle label="Fee Due Email" value={prefs.feesEmail} onChange={v => upd('feesEmail', v)} />
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Results</h4>
          <Toggle label="Result SMS"   value={prefs.resultsSms}   onChange={v => upd('resultsSms',   v)} />
          <Toggle label="Result Email" value={prefs.resultsEmail} onChange={v => upd('resultsEmail', v)} />
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Push Notifications</h4>
          <Toggle label="Homework Reminders"     value={prefs.homeworkPush}  onChange={v => upd('homeworkPush',  v)} />
          <Toggle label="Event Reminders"        value={prefs.eventsPush}    onChange={v => upd('eventsPush',    v)} />
          <Toggle label="General Notifications"  value={prefs.generalPush}   onChange={v => upd('generalPush',   v)} />
        </div>
      </div>
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="btn btn-primary flex items-center gap-2"
      >
        {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Preferences'}
      </button>
    </Card>
  )
}

function BrandingSettings() {
  const [colors, setColors] = useState({ primary: '#2563eb', secondary: '#1e40af', accent: '#dbeafe' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await httpClient.put('/school/branding', colors)
      toast.success('Branding saved')
    } catch {
      toast.error('Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="School Branding" subtitle="Customize your school's visual identity">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>School Logo</label>
          <div className="mt-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-[color:var(--brand)]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <p className="text-sm" style={{ color: 'var(--text-4)' }}>Drag & drop logo here or click to upload</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-4)', opacity: 0.7 }}>PNG, SVG recommended (min 200×200px)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.entries(colors) as [string, string][]).map(([k, v]) => (
            <div key={k}>
              <label className="text-sm font-medium capitalize" style={{ color: 'var(--text-2)' }}>{k} Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={v}
                  onChange={e => setColors(p => ({ ...p, [k]: e.target.value }))}
                  className="w-9 h-9 rounded-lg cursor-pointer p-0.5"
                  style={{ border: '1px solid var(--border)' }} />
                <input value={v}
                  onChange={e => setColors(p => ({ ...p, [k]: e.target.value }))}
                  className="input-base focus-ring flex-1 font-mono" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4 text-white text-center text-sm font-medium" style={{ background: colors.primary }}>
          Preview: {colors.primary}
        </div>

        <button onClick={save} disabled={saving} className="btn btn-primary flex items-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Branding'}
        </button>
      </div>
    </Card>
  )
}

function IntegField({ label, placeholder, type = 'text', value, onChange }: {
  label: string; placeholder?: string; type?: string; value: string; onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{label}</label>
      <div className="relative mt-1">
        <input
          type={type === 'password' && !show ? 'password' : 'text'}
          placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          className="input-base focus-ring w-full pr-9"
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--text-4)' }}>
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

function IntegrationSettings() {
  const [twilio,   setTwilio]   = useState({ accountSid: '', authToken: '', fromNumber: '' })
  const [smtp,     setSmtp]     = useState({ host: '', port: '587', user: '', password: '' })
  const [whatsapp, setWhatsapp] = useState({ token: '', phoneNumberId: '' })
  const [bbb,      setBbb]      = useState({ url: '', secret: '' })
  const [s3,       setS3]       = useState({ bucket: '', region: '', accessKey: '', secretKey: '' })

  const sections = [
    { title: 'Twilio (SMS)',              endpoint: '/integrations/twilio',   fields: [{ k: 'accountSid', l: 'Account SID', p: 'ACxxxxxxxx' }, { k: 'authToken', l: 'Auth Token', t: 'password' }, { k: 'fromNumber', l: 'From Number', p: '+1234567890' }], state: twilio, setState: setTwilio },
    { title: 'SMTP (Email)',              endpoint: '/integrations/smtp',     fields: [{ k: 'host', l: 'SMTP Host', p: 'smtp.gmail.com' }, { k: 'port', l: 'Port', p: '587' }, { k: 'user', l: 'Username' }, { k: 'password', l: 'Password', t: 'password' }], state: smtp, setState: setSmtp },
    { title: 'WhatsApp Business API',     endpoint: '/integrations/whatsapp', fields: [{ k: 'token', l: 'Access Token', t: 'password' }, { k: 'phoneNumberId', l: 'Phone Number ID' }], state: whatsapp, setState: setWhatsapp },
    { title: 'BigBlueButton',             endpoint: '/integrations/bbb',      fields: [{ k: 'url', l: 'BBB URL', p: 'https://bbb.example.com/' }, { k: 'secret', l: 'Shared Secret', t: 'password' }], state: bbb, setState: setBbb },
    { title: 'AWS S3 (File Storage)',     endpoint: '/integrations/s3',       fields: [{ k: 'bucket', l: 'Bucket Name' }, { k: 'region', l: 'Region', p: 'ap-south-1' }, { k: 'accessKey', l: 'Access Key ID' }, { k: 'secretKey', l: 'Secret Access Key', t: 'password' }], state: s3, setState: setS3 },
  ]

  return (
    <div className="space-y-4">
      {sections.map(({ title, endpoint, fields, state, setState }) => {
        const [saving, setSaving] = useState(false)
        const save = async () => {
          setSaving(true)
          try { await httpClient.post(endpoint, state); toast.success(`${title} settings saved`) }
          catch { toast.error(`Failed to save ${title}`) }
          finally { setSaving(false) }
        }
        return (
          <Card key={title} title={title}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f: any) => (
                <IntegField key={f.k} label={f.l} placeholder={f.p} type={f.t}
                  value={(state as any)[f.k]}
                  onChange={(v: string) => setState((p: any) => ({ ...p, [f.k]: v }))} />
              ))}
            </div>
            <button onClick={save} disabled={saving} className="btn btn-primary flex items-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : `Save ${title}`}
            </button>
          </Card>
        )
      })}
    </div>
  )
}

function BillingSettings() {
  const { data } = useQuery({
    queryKey: ['billing'],
    queryFn: () => httpClient.get('/subscription/invoices').then(r => r.data).catch(() => []),
  })

  return (
    <div className="space-y-4">
      <Card title="Current Plan" subtitle="Your active subscription and usage">
        <div className="rounded-xl p-5 text-white" style={{ background: 'linear-gradient(135deg, var(--brand), #4f46e5)' }}>
          <p className="text-sm opacity-80">You are on</p>
          <p className="text-2xl font-bold mt-0.5">Standard Plan</p>
          <p className="text-sm opacity-70 mt-2">₹2,499/month · Next billing: 01 Jul 2026</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Students', value: '847', max: '2,000', pct: 42 },
            { label: 'Staff',    value: '68',  max: '200',   pct: 34 },
            { label: 'Storage',  value: '8.2 GB', max: '50 GB', pct: 16 },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)' }}>
              <p className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>{item.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{item.label}</p>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: 'var(--brand)' }} />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>{item.pct}% of {item.max}</p>
            </div>
          ))}
        </div>
        <button className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ border: '1px solid var(--brand)', color: 'var(--brand)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Upgrade to Premium
        </button>
      </Card>

      <Card title="Invoice History" subtitle="Download your past invoices">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
                <th className="pb-2.5 text-left font-medium">Invoice</th>
                <th className="pb-2.5 text-left font-medium">Date</th>
                <th className="pb-2.5 text-left font-medium">Amount</th>
                <th className="pb-2.5 text-left font-medium">Status</th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(data) ? data : []).slice(0, 6).map((inv: any) => (
                <tr key={inv.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="py-2.5 font-mono text-xs" style={{ color: 'var(--text-3)' }}>{inv.invoiceNumber}</td>
                  <td className="py-2.5" style={{ color: 'var(--text-3)' }}>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="py-2.5 font-medium" style={{ color: 'var(--text-1)' }}>₹{inv.totalAmount?.toLocaleString()}</td>
                  <td className="py-2.5">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize"
                      style={inv.status === 'paid'
                        ? { color: 'var(--success)', background: 'var(--success-bg)' }
                        : { color: 'var(--warning)', background: 'var(--warning-bg)' }
                      }>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button className="text-xs font-medium hover:underline" style={{ color: 'var(--brand)' }}>Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data || !Array.isArray(data) || data.length === 0) && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-4)' }}>No invoices found</p>
          )}
        </div>
      </Card>
    </div>
  )
}
