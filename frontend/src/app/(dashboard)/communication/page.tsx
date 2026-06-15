'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communicationApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Send, Bell, MessageSquare, Mail, Phone, Pin, Trash2, Plus, Loader2 } from 'lucide-react'

const CHANNELS = ['app', 'sms', 'email', 'whatsapp', 'push'] as const
const AUDIENCES = ['all', 'students', 'parents', 'staff'] as const

const CHANNEL_ICONS: Record<string, any> = {
  sms: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  app: Bell,
  push: Bell,
}

export default function CommunicationPage() {
  const [tab, setTab] = useState<'announcements' | 'sms' | 'email' | 'logs'>('announcements')
  const [showNew, setShowNew] = useState(false)
  const [announcementForm, setAnnouncementForm] = useState({
    title: '', content: '', audience: 'all', channels: ['app'] as string[], isPinned: false,
  })
  const [smsForm, setSmsForm] = useState({ audience: 'all', message: '' })
  const [emailForm, setEmailForm] = useState({ recipients: '', subject: '', body: '' })
  const qc = useQueryClient()

  const { data: announcements, isLoading: annLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => communicationApi.getAnnouncements({ pageSize: 50 }).then(r => r.data),
    enabled: tab === 'announcements',
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['notification-logs'],
    queryFn: () => communicationApi.getLogs({ pageSize: 100 }).then(r => r.data),
    enabled: tab === 'logs',
  })

  const createMutation = useMutation({
    mutationFn: () => communicationApi.createAnnouncement(announcementForm),
    onSuccess: () => {
      toast.success('Announcement posted')
      setShowNew(false)
      setAnnouncementForm({ title: '', content: '', audience: 'all', channels: ['app'], isPinned: false })
      qc.invalidateQueries({ queryKey: ['announcements'] })
    },
    onError: () => toast.error('Failed to post announcement'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => communicationApi.deleteAnnouncement(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['announcements'] }) },
    onError: () => toast.error('Failed to delete announcement'),
  })

  const smsMutation = useMutation({
    mutationFn: () => communicationApi.smsBlast(smsForm),
    onSuccess: (data) => {
      toast.success(`SMS sent to ${data.data.sent} recipients`)
      setSmsForm(p => ({ ...p, message: '' }))
      qc.invalidateQueries({ queryKey: ['notification-logs'] })
    },
    onError: () => toast.error('Failed to send SMS'),
  })

  const emailMutation = useMutation({
    mutationFn: () => communicationApi.sendEmail({
      recipients: emailForm.recipients.split(',').map(e => e.trim()),
      subject: emailForm.subject,
      body: emailForm.body,
    }),
    onSuccess: () => {
      toast.success('Emails sent')
      setEmailForm({ recipients: '', subject: '', body: '' })
    },
    onError: () => toast.error('Failed to send email'),
  })

  const toggleChannel = (ch: string) =>
    setAnnouncementForm(p => ({
      ...p,
      channels: p.channels.includes(ch) ? p.channels.filter(c => c !== ch) : [...p.channels, ch],
    }))

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Communication</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Send messages, announcements and notifications</p>
        </div>
        {tab === 'announcements' && (
          <button onClick={() => setShowNew(true)}
            className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-2)' }}>
        {(['announcements', 'sms', 'email', 'logs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-md text-sm font-medium capitalize transition"
            style={tab === t
              ? { background: 'var(--surface)', color: 'var(--text-1)', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
              : { color: 'var(--text-3)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Announcements */}
      {tab === 'announcements' && (
        <div className="space-y-3">
          {annLoading ? (
            <div className="card p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-4)' }} />
            </div>
          ) : announcements?.items?.length ? (
            announcements.items.map((a: any) => (
              <div key={a.id} className="card p-5"
                style={a.isPinned ? { borderColor: 'var(--brand)' } : undefined}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {a.isPinned && <Pin className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />}
                      <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>{a.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{a.audience}</span>
                    </div>
                    <p className="text-sm line-clamp-2" style={{ color: 'var(--text-2)' }}>{a.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs" style={{ color: 'var(--text-4)' }}>{formatDate(a.publishAt)}</p>
                      <div className="flex gap-1">
                        {a.channels?.map((ch: string) => {
                          const Icon = CHANNEL_ICONS[ch] ?? Bell
                          return <Icon key={ch} className="w-3.5 h-3.5" style={{ color: 'var(--text-4)' }} />
                        })}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteMutation.mutate(a.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="card p-12 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>No announcements yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Create your first announcement to notify students and parents</p>
              <button onClick={() => setShowNew(true)}
                className="btn btn-primary mt-4 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Announcement
              </button>
            </div>
          )}
        </div>
      )}

      {/* SMS */}
      {tab === 'sms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Send SMS Blast</h3>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Audience</label>
              <select value={smsForm.audience} onChange={e => setSmsForm(p => ({ ...p, audience: e.target.value }))}
                className="mt-1 input-base focus-ring w-full">
                {AUDIENCES.map(a => <option key={a} className="capitalize">{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Message</label>
              <textarea
                value={smsForm.message}
                onChange={e => setSmsForm(p => ({ ...p, message: e.target.value }))}
                rows={5}
                maxLength={160}
                placeholder="Type your SMS message (max 160 chars)..."
                className="mt-1 input-base focus-ring w-full resize-none"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>{smsForm.message.length}/160 characters</p>
            </div>
            <button
              onClick={() => smsMutation.mutate()}
              disabled={smsMutation.isPending || !smsForm.message}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {smsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send SMS
            </button>
          </div>

          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--surface-2)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-2)' }}>SMS Tips</h3>
            <ul className="text-sm space-y-2" style={{ color: 'var(--text-3)' }}>
              <li>• Keep messages under 160 characters for single SMS</li>
              <li>• Use "all" to reach all guardians and staff</li>
              <li>• Messages go to primary guardian contacts</li>
              <li>• SMS requires Twilio configuration</li>
            </ul>
          </div>
        </div>
      )}

      {/* Email */}
      {tab === 'email' && (
        <div className="card p-5 max-w-2xl space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Send Email</h3>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Recipients (comma-separated emails)</label>
            <input
              value={emailForm.recipients}
              onChange={e => setEmailForm(p => ({ ...p, recipients: e.target.value }))}
              placeholder="email1@school.com, email2@school.com"
              className="mt-1 input-base focus-ring w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Subject</label>
            <input
              value={emailForm.subject}
              onChange={e => setEmailForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Email subject"
              className="mt-1 input-base focus-ring w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Body (HTML supported)</label>
            <textarea
              value={emailForm.body}
              onChange={e => setEmailForm(p => ({ ...p, body: e.target.value }))}
              rows={8}
              placeholder="Email body..."
              className="mt-1 input-base focus-ring w-full resize-none font-mono"
            />
          </div>
          <button
            onClick={() => emailMutation.mutate()}
            disabled={emailMutation.isPending || !emailForm.recipients || !emailForm.subject}
            className="btn btn-primary flex items-center gap-2"
          >
            {emailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Email
          </button>
        </div>
      )}

      {/* Logs */}
      {tab === 'logs' && (
        <div className="card overflow-hidden">
          {logsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-4)' }} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    {['Channel', 'Recipient', 'Subject / Body', 'Status', 'Sent At'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs?.items?.map((log: any) => {
                    const Icon = CHANNEL_ICONS[log.channel] ?? Bell
                    return (
                      <tr key={log.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" style={{ color: 'var(--text-4)' }} />
                            <span className="text-sm capitalize" style={{ color: 'var(--text-1)' }}>{log.channel}</span>
                          </div>
                        </td>
                        <td className="table-cell font-mono" style={{ color: 'var(--text-2)' }}>{log.recipient}</td>
                        <td className="table-cell max-w-xs truncate" style={{ color: 'var(--text-2)' }}>
                          {log.subject ?? log.body.slice(0, 60)}...
                        </td>
                        <td className="table-cell">
                          <span className={cn('text-xs px-2 py-1 rounded-full font-medium',
                            log.status === 'sent' ? 'badge-active' :
                            log.status === 'failed' ? 'badge-inactive' :
                            'badge-pending')}>
                            {log.status}
                          </span>
                        </td>
                        <td className="table-cell" style={{ color: 'var(--text-4)' }}>{log.sentAt ? formatDate(log.sentAt) : '-'}</td>
                      </tr>
                    )
                  })}
                  {!logs?.items?.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--text-4)' }}>No notification logs</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New announcement modal */}
      {showNew && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-1)' }}>New Announcement</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Title</label>
                <input value={announcementForm.title}
                  onChange={e => setAnnouncementForm(p => ({ ...p, title: e.target.value }))}
                  className="mt-1 input-base focus-ring w-full" />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Content</label>
                <textarea value={announcementForm.content}
                  onChange={e => setAnnouncementForm(p => ({ ...p, content: e.target.value }))}
                  rows={4}
                  className="mt-1 input-base focus-ring w-full resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Audience</label>
                  <select value={announcementForm.audience}
                    onChange={e => setAnnouncementForm(p => ({ ...p, audience: e.target.value }))}
                    className="mt-1 input-base focus-ring w-full">
                    {AUDIENCES.map(a => <option key={a} className="capitalize">{a}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={announcementForm.isPinned}
                      onChange={e => setAnnouncementForm(p => ({ ...p, isPinned: e.target.checked }))}
                      className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Pin announcement</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-2)' }}>Send via</label>
                <div className="flex gap-2 flex-wrap">
                  {CHANNELS.map(ch => (
                    <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition"
                      style={announcementForm.channels.includes(ch)
                        ? { background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }
                        : { background: 'transparent', color: 'var(--text-2)', borderColor: 'var(--border)' }}>
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowNew(false)}
                className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !announcementForm.title || !announcementForm.content}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Post
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
