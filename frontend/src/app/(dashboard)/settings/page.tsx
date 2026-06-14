'use client'

import { useState } from 'react'
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
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your account and school preferences</p>
      </div>

      {/* Mobile tab selector */}
      <div className="sm:hidden">
        <button
          onClick={() => setMobileMenuOpen(m => !m)}
          className="flex items-center gap-2 w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
        >
          {activeTab && <activeTab.icon className="w-4 h-4" />}
          {activeTab?.label}
          <Menu className="w-4 h-4 ml-auto text-gray-400" />
        </button>
        {mobileMenuOpen && (
          <div className="mt-1 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setTab(key); setMobileMenuOpen(false) }}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-left transition-colors border-b border-gray-50 last:border-0',
                  tab === key ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                )}>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-left transition-colors border-b border-gray-50 last:border-0',
                  tab === key
                    ? 'bg-blue-50 text-blue-700 border-l-[3px] border-l-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                )}>
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
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
        <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
          {(form.firstName?.[0] ?? user?.fullName?.[0] ?? 'U').toUpperCase()}
        </div>
        <div>
          <button className="text-sm text-blue-600 hover:underline font-medium">Change Photo</button>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG max 2MB</p>
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
            <label className="text-sm font-medium text-gray-700">{f.l}</label>
            <input type={f.t ?? 'text'}
              value={(form as any)[f.k]}
              onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none transition-all" />
          </div>
        ))}
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
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
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [qrUri, setQrUri] = useState('')
  const [twoFaSetupCode, setTwoFaSetupCode] = useState('')

  const changePassword = () => {
    setMsg('')
    if (pwd.new !== pwd.confirm) { setMsg('Passwords do not match.'); return }
    if (pwd.new.length < 8)      { setMsg('Password must be at least 8 characters.'); return }
    authApi.changePassword({ currentPassword: pwd.current, newPassword: pwd.new })
      .then(() => { setMsg('Password changed successfully!'); setPwd({ current: '', new: '', confirm: '' }) })
      .catch((err: any) => setMsg(err?.response?.data?.error ?? 'Current password is incorrect.'))
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
              <label className="text-sm font-medium text-gray-700">{f.l}</label>
              <div className="relative mt-1">
                <input
                  type={(show as any)[f.k] ? 'text' : 'password'}
                  value={(pwd as any)[f.k]}
                  onChange={e => setPwd(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm pr-9 focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShow(p => ({ ...p, [f.k]: !(p as any)[f.k] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {(show as any)[f.k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {msg && (
            <p className={cn('text-sm', msg.includes('successfully') ? 'text-green-600' : 'text-red-500')}>{msg}</p>
          )}
          <button onClick={changePassword}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Change Password
          </button>
        </div>
      </Card>

      <Card title="Two-Factor Authentication" subtitle="Add an extra layer of security">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Authenticator App</p>
            <p className="text-xs text-gray-400 mt-0.5">Use Google Authenticator or Authy</p>
          </div>
          <button
            onClick={toggleTwoFa}
            className={cn('relative w-12 h-6 rounded-full transition-colors', twoFAEnabled ? 'bg-blue-600' : 'bg-gray-200')}
            role="switch" aria-checked={twoFAEnabled}
          >
            <span className={cn('absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform', twoFAEnabled && 'translate-x-6')} />
          </button>
        </div>
        {twoFAEnabled && qrUri && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-sm text-gray-600">Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUri)}`}
                alt="2FA QR Code"
                className="w-40 h-40 rounded-lg border border-gray-200"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={twoFaSetupCode}
                onChange={e => setTwoFaSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none"
              />
              <button
                onClick={enableTwoFa}
                disabled={twoFaSetupCode.length !== 6}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
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
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{s.device}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.ip} · {s.time}</p>
              </div>
              {s.current
                ? <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">Current</span>
                : <button className="text-xs text-red-500 hover:text-red-700 hover:underline">Revoke</button>
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
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch" aria-checked={value}
        className={cn('relative w-11 h-6 rounded-full transition-colors flex-shrink-0', value ? 'bg-blue-600' : 'bg-gray-200')}
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
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Attendance</h4>
          <Toggle label="SMS for Absence"   desc="Get SMS when a student is absent" value={prefs.attendanceSms}   onChange={v => upd('attendanceSms',   v)} />
          <Toggle label="Email for Absence"                                          value={prefs.attendanceEmail} onChange={v => upd('attendanceEmail', v)} />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fees</h4>
          <Toggle label="Fee Due SMS"   value={prefs.feesSms}   onChange={v => upd('feesSms',   v)} />
          <Toggle label="Fee Due Email" value={prefs.feesEmail} onChange={v => upd('feesEmail', v)} />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Results</h4>
          <Toggle label="Result SMS"   value={prefs.resultsSms}   onChange={v => upd('resultsSms',   v)} />
          <Toggle label="Result Email" value={prefs.resultsEmail} onChange={v => upd('resultsEmail', v)} />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Push Notifications</h4>
          <Toggle label="Homework Reminders"     value={prefs.homeworkPush}  onChange={v => upd('homeworkPush',  v)} />
          <Toggle label="Event Reminders"        value={prefs.eventsPush}    onChange={v => upd('eventsPush',    v)} />
          <Toggle label="General Notifications"  value={prefs.generalPush}   onChange={v => upd('generalPush',   v)} />
        </div>
      </div>
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
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
          <label className="text-sm font-medium text-gray-700">School Logo</label>
          <div className="mt-2 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <p className="text-gray-400 text-sm">Drag & drop logo here or click to upload</p>
            <p className="text-xs text-gray-300 mt-1">PNG, SVG recommended (min 200×200px)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.entries(colors) as [string, string][]).map(([k, v]) => (
            <div key={k}>
              <label className="text-sm font-medium text-gray-700 capitalize">{k} Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={v}
                  onChange={e => setColors(p => ({ ...p, [k]: e.target.value }))}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5" />
                <input value={v}
                  onChange={e => setColors(p => ({ ...p, [k]: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4 text-white text-center text-sm font-medium" style={{ background: colors.primary }}>
          Preview: {colors.primary}
        </div>

        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
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
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative mt-1">
        <input
          type={type === 'password' && !show ? 'password' : 'text'}
          placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm pr-9 focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none transition-all"
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
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
            <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="font-bold text-gray-900 text-lg">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
              <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{item.pct}% of {item.max}</p>
            </div>
          ))}
        </div>
        <button className="w-full py-2.5 border border-blue-500 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors">
          Upgrade to Premium
        </button>
      </Card>

      <Card title="Invoice History" subtitle="Download your past invoices">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="pb-2.5 text-left font-medium">Invoice</th>
                <th className="pb-2.5 text-left font-medium">Date</th>
                <th className="pb-2.5 text-left font-medium">Amount</th>
                <th className="pb-2.5 text-left font-medium">Status</th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(Array.isArray(data) ? data : []).slice(0, 6).map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 font-mono text-xs text-gray-600">{inv.invoiceNumber}</td>
                  <td className="py-2.5 text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="py-2.5 font-medium">₹{inv.totalAmount?.toLocaleString()}</td>
                  <td className="py-2.5">
                    <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-medium capitalize',
                      inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button className="text-xs text-blue-600 hover:underline font-medium">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data || !Array.isArray(data) || data.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-8">No invoices found</p>
          )}
        </div>
      </Card>
    </div>
  )
}
