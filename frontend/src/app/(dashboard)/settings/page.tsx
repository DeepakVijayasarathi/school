'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { User, Shield, Bell, Palette, Link, CreditCard, Eye, EyeOff, Check } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api as httpClient, authApi } from '@/lib/api'

const TABS = [
  { key: 'profile',      label: 'Profile',      icon: User },
  { key: 'security',     label: 'Security',     icon: Shield },
  { key: 'notifications',label: 'Notifications',icon: Bell },
  { key: 'branding',     label: 'Branding',     icon: Palette },
  { key: 'integrations', label: 'Integrations', icon: Link },
  { key: 'billing',      label: 'Billing',      icon: CreditCard },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your account and school preferences</p>
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-left transition-colors border-b border-gray-50 last:border-0',
                  tab === key ? 'bg-blue-50 text-blue-700 border-l-2 border-l-blue-600' : 'text-gray-600 hover:bg-gray-50'
                )}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  )
}

function ProfileSettings() {
  const user = useAuthStore(s => s.user)
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: '',
  })
  const [saved, setSaved] = useState(false)

  const save = () => {
    httpClient.put('/auth/profile', form)
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000) })
      .catch(() => {})
  }

  return (
    <Card title="Profile Information">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600">
          {user?.firstName?.[0]}
        </div>
        <div>
          <button className="text-sm text-blue-600 hover:underline">Change Photo</button>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG max 2MB</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { k: 'firstName', l: 'First Name' },
          { k: 'lastName', l: 'Last Name' },
          { k: 'email', l: 'Email', t: 'email' },
          { k: 'phone', l: 'Phone', t: 'tel' },
        ].map(f => (
          <div key={f.k}>
            <label className="text-sm font-medium text-gray-700">{f.l}</label>
            <input type={f.t ?? 'text'} value={(form as any)[f.k]}
              onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
        ))}
      </div>

      <button onClick={save}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
      </button>
    </Card>
  )
}

function SecuritySettings() {
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' })
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [msg, setMsg] = useState('')

  const changePassword = () => {
    if (pwd.new !== pwd.confirm) { setMsg('Passwords do not match.'); return }
    if (pwd.new.length < 8) { setMsg('Password must be at least 8 characters.'); return }
    authApi.changePassword({ currentPassword: pwd.current, newPassword: pwd.new })
      .then(() => setMsg('Password changed successfully!'))
      .catch(() => setMsg('Current password is incorrect.'))
  }

  return (
    <div className="space-y-4">
      <Card title="Change Password">
        <div className="space-y-3 max-w-md">
          {([
            { k: 'current', l: 'Current Password' },
            { k: 'new', l: 'New Password' },
            { k: 'confirm', l: 'Confirm New Password' },
          ] as const).map(f => (
            <div key={f.k}>
              <label className="text-sm font-medium text-gray-700">{f.l}</label>
              <div className="relative mt-1">
                <input type={(show as any)[f.k] ? 'text' : 'password'}
                  value={(pwd as any)[f.k]}
                  onChange={e => setPwd(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm pr-9" />
                <button onClick={() => setShow(p => ({ ...p, [f.k]: !(p as any)[f.k] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {(show as any)[f.k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {msg && <p className={cn('text-sm', msg.includes('successfully') ? 'text-green-600' : 'text-red-500')}>{msg}</p>}
          <button onClick={changePassword} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
            Change Password
          </button>
        </div>
      </Card>

      <Card title="Two-Factor Authentication">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Authenticator App</p>
            <p className="text-xs text-gray-400 mt-0.5">Use Google Authenticator or similar app for 2FA</p>
          </div>
          <button
            onClick={() => setTwoFAEnabled(!twoFAEnabled)}
            className={cn('relative w-12 h-6 rounded-full transition-colors', twoFAEnabled ? 'bg-blue-600' : 'bg-gray-200')}>
            <span className={cn('absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform', twoFAEnabled && 'translate-x-6')} />
          </button>
        </div>
        {twoFAEnabled && (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="w-32 h-32 bg-gray-200 rounded mx-auto mb-2 flex items-center justify-center text-gray-400 text-xs">
              QR Code Here
            </div>
            <p className="text-xs text-gray-500">Scan with your authenticator app</p>
          </div>
        )}
      </Card>

      <Card title="Login History">
        <div className="space-y-2">
          {[
            { device: 'Chrome on Windows', ip: '192.168.1.1', time: '2 hours ago', current: true },
            { device: 'Safari on iPhone', ip: '192.168.1.5', time: 'Yesterday', current: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium">{s.device}</p>
                <p className="text-xs text-gray-400">{s.ip} • {s.time}</p>
              </div>
              {s.current ? (
                <span className="text-xs text-green-600 font-medium">Current Session</span>
              ) : (
                <button className="text-xs text-red-500 hover:underline">Revoke</button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: any) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className={cn('relative w-11 h-6 rounded-full transition-colors', value ? 'bg-blue-600' : 'bg-gray-200')}>
        <span className={cn('absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform', value && 'translate-x-5')} />
      </button>
    </div>
  )
}

function NotificationSettings() {
  const [prefs, setPrefs] = useState({
    attendanceSms: true, attendanceEmail: false,
    feesSms: true, feesEmail: true,
    resultsSms: true, resultsEmail: true,
    homeworkPush: true, eventsPush: true, generalPush: true,
  })
  const upd = (k: keyof typeof prefs, v: boolean) => setPrefs(p => ({ ...p, [k]: v }))

  return (
    <Card title="Notification Preferences">
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Attendance</h4>
          <Toggle label="SMS for Absence" desc="Get SMS when a student is absent" value={prefs.attendanceSms} onChange={(v: boolean) => upd('attendanceSms', v)} />
          <Toggle label="Email for Absence" value={prefs.attendanceEmail} onChange={(v: boolean) => upd('attendanceEmail', v)} />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Fees</h4>
          <Toggle label="Fee Due SMS" value={prefs.feesSms} onChange={(v: boolean) => upd('feesSms', v)} />
          <Toggle label="Fee Due Email" value={prefs.feesEmail} onChange={(v: boolean) => upd('feesEmail', v)} />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Results</h4>
          <Toggle label="Result SMS" value={prefs.resultsSms} onChange={(v: boolean) => upd('resultsSms', v)} />
          <Toggle label="Result Email" value={prefs.resultsEmail} onChange={(v: boolean) => upd('resultsEmail', v)} />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Push Notifications</h4>
          <Toggle label="Homework Reminders" value={prefs.homeworkPush} onChange={(v: boolean) => upd('homeworkPush', v)} />
          <Toggle label="Event Reminders" value={prefs.eventsPush} onChange={(v: boolean) => upd('eventsPush', v)} />
          <Toggle label="General Notifications" value={prefs.generalPush} onChange={(v: boolean) => upd('generalPush', v)} />
        </div>
      </div>
      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Save Preferences</button>
    </Card>
  )
}

function BrandingSettings() {
  const [colors, setColors] = useState({ primary: '#2563eb', secondary: '#1e40af', accent: '#dbeafe' })

  return (
    <Card title="School Branding">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">School Logo</label>
          <div className="mt-2 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <p className="text-gray-400 text-sm">Drag & drop logo here or click to upload</p>
            <p className="text-xs text-gray-300 mt-1">PNG, SVG recommended (min 200×200px)</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {Object.entries(colors).map(([k, v]) => (
            <div key={k}>
              <label className="text-sm font-medium text-gray-700 capitalize">{k} Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={v} onChange={e => setColors(p => ({ ...p, [k]: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                <input value={v} onChange={e => setColors(p => ({ ...p, [k]: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: colors.primary }} className="rounded-xl p-4 text-white text-center text-sm">
          Preview: Primary Color → {colors.primary}
        </div>

        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Save Branding</button>
      </div>
    </Card>
  )
}

function IntegField({ label, placeholder, type = 'text', value, onChange }: any) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative mt-1">
        <input type={type === 'password' && !show ? 'password' : 'text'}
          placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm pr-9" />
        {type === 'password' && (
          <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

function IntegrationSettings() {
  const [twilio, setTwilio] = useState({ accountSid: '', authToken: '', fromNumber: '' })
  const [smtp, setSmtp] = useState({ host: '', port: '587', user: '', password: '' })
  const [whatsapp, setWhatsapp] = useState({ token: '', phoneNumberId: '' })
  const [bbb, setBbb] = useState({ url: '', secret: '' })
  const [s3, setS3] = useState({ bucket: '', region: '', accessKey: '', secretKey: '' })

  return (
    <div className="space-y-4">
      {[
        {
          title: 'Twilio (SMS)',
          fields: [
            { k: 'accountSid', l: 'Account SID', p: 'ACxxxxxxxx' },
            { k: 'authToken', l: 'Auth Token', p: '...', t: 'password' },
            { k: 'fromNumber', l: 'From Number', p: '+1234567890' },
          ],
          state: twilio, setState: setTwilio
        },
        {
          title: 'SMTP (Email)',
          fields: [
            { k: 'host', l: 'SMTP Host', p: 'smtp.gmail.com' },
            { k: 'port', l: 'Port', p: '587' },
            { k: 'user', l: 'Username / Email' },
            { k: 'password', l: 'Password', t: 'password' },
          ],
          state: smtp, setState: setSmtp
        },
        {
          title: 'WhatsApp Business API',
          fields: [
            { k: 'token', l: 'Access Token', t: 'password' },
            { k: 'phoneNumberId', l: 'Phone Number ID' },
          ],
          state: whatsapp, setState: setWhatsapp
        },
        {
          title: 'BigBlueButton (Online Classes)',
          fields: [
            { k: 'url', l: 'BBB URL', p: 'https://bbb.yourserver.com/' },
            { k: 'secret', l: 'Shared Secret', t: 'password' },
          ],
          state: bbb, setState: setBbb
        },
        {
          title: 'AWS S3 (File Storage)',
          fields: [
            { k: 'bucket', l: 'Bucket Name' },
            { k: 'region', l: 'Region', p: 'ap-south-1' },
            { k: 'accessKey', l: 'Access Key ID' },
            { k: 'secretKey', l: 'Secret Access Key', t: 'password' },
          ],
          state: s3, setState: setS3
        },
      ].map(({ title, fields, state, setState }) => (
        <Card key={title} title={title}>
          <div className="grid grid-cols-2 gap-4">
            {fields.map((f: any) => (
              <IntegField key={f.k} label={f.l} placeholder={f.p} type={f.t}
                value={(state as any)[f.k]}
                onChange={(v: string) => setState((p: any) => ({ ...p, [f.k]: v }))} />
            ))}
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Save {title}</button>
        </Card>
      ))}
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
      <Card title="Current Plan">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-80">You are on</p>
          <p className="text-2xl font-bold mt-0.5">Standard Plan</p>
          <p className="text-sm opacity-80 mt-2">₹2,499/month · Next billing: 01 Jul 2025</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="font-bold text-gray-900">847</p>
            <p className="text-xs text-gray-500">Students</p>
            <div className="h-1 bg-gray-200 rounded mt-1"><div className="h-1 bg-blue-500 rounded" style={{ width: '42%' }} /></div>
            <p className="text-xs text-gray-400 mt-0.5">42% of 2,000</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="font-bold text-gray-900">68</p>
            <p className="text-xs text-gray-500">Staff</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="font-bold text-gray-900">8.2 GB</p>
            <p className="text-xs text-gray-500">Storage</p>
          </div>
        </div>
        <button className="w-full py-2 border border-blue-500 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50">
          Upgrade to Premium
        </button>
      </Card>

      <Card title="Invoice History">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase">
            <tr>
              <th className="pb-2 text-left">Invoice</th>
              <th className="pb-2 text-left">Date</th>
              <th className="pb-2 text-left">Amount</th>
              <th className="pb-2 text-left">Status</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(Array.isArray(data) ? data : []).slice(0, 6).map((inv: any) => (
              <tr key={inv.id}>
                <td className="py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                <td className="py-2">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                <td className="py-2">₹{inv.totalAmount?.toLocaleString()}</td>
                <td className="py-2">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize',
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                    {inv.status}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <button className="text-xs text-blue-600 hover:underline">Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
