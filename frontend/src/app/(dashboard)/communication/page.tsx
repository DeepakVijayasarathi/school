'use client'

import { useState } from 'react'
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
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => communicationApi.deleteAnnouncement(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['announcements'] }) },
  })

  const smsMutation = useMutation({
    mutationFn: () => communicationApi.smsBlast(smsForm),
    onSuccess: (data) => {
      toast.success(`SMS sent to ${data.data.sent} recipients`)
      setSmsForm(p => ({ ...p, message: '' }))
      qc.invalidateQueries({ queryKey: ['notification-logs'] })
    },
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
  })

  const toggleChannel = (ch: string) =>
    setAnnouncementForm(p => ({
      ...p,
      channels: p.channels.includes(ch) ? p.channels.filter(c => c !== ch) : [...p.channels, ch],
    }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication</h1>
          <p className="text-gray-500 text-sm">Send messages, announcements and notifications</p>
        </div>
        {tab === 'announcements' && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['announcements', 'sms', 'email', 'logs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-md text-sm font-medium capitalize transition',
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {t}
          </button>
        ))}
      </div>

      {/* Announcements */}
      {tab === 'announcements' && (
        <div className="space-y-3">
          {annLoading ? (
            <div className="bg-white rounded-xl p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
          ) : announcements?.items?.length ? (
            announcements.items.map((a: any) => (
              <div key={a.id} className={cn('bg-white rounded-xl p-5 shadow-sm border', a.isPinned ? 'border-blue-200' : 'border-gray-100')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {a.isPinned && <Pin className="w-3.5 h-3.5 text-blue-500" />}
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">{a.audience}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{a.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-gray-400">{formatDate(a.publishAt)}</p>
                      <div className="flex gap-1">
                        {a.channels?.map((ch: string) => {
                          const Icon = CHANNEL_ICONS[ch] ?? Bell
                          return <Icon key={ch} className="w-3.5 h-3.5 text-gray-400" />
                        })}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteMutation.mutate(a.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No announcements yet</p>
              <p className="text-xs text-gray-400 mt-1">Create your first announcement to notify students and parents</p>
              <button onClick={() => setShowNew(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Announcement
              </button>
            </div>
          )}
        </div>
      )}

      {/* SMS */}
      {tab === 'sms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Send SMS Blast</h3>
            <div>
              <label className="text-sm font-medium text-gray-700">Audience</label>
              <select value={smsForm.audience} onChange={e => setSmsForm(p => ({ ...p, audience: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                {AUDIENCES.map(a => <option key={a} className="capitalize">{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                value={smsForm.message}
                onChange={e => setSmsForm(p => ({ ...p, message: e.target.value }))}
                rows={5}
                maxLength={160}
                placeholder="Type your SMS message (max 160 chars)..."
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{smsForm.message.length}/160 characters</p>
            </div>
            <button
              onClick={() => smsMutation.mutate()}
              disabled={smsMutation.isPending || !smsForm.message}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {smsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send SMS
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm">SMS Tips</h3>
            <ul className="text-sm text-gray-500 space-y-2">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 max-w-2xl space-y-4">
          <h3 className="font-semibold text-gray-800">Send Email</h3>
          <div>
            <label className="text-sm font-medium text-gray-700">Recipients (comma-separated emails)</label>
            <input
              value={emailForm.recipients}
              onChange={e => setEmailForm(p => ({ ...p, recipients: e.target.value }))}
              placeholder="email1@school.com, email2@school.com"
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Subject</label>
            <input
              value={emailForm.subject}
              onChange={e => setEmailForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Email subject"
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Body (HTML supported)</label>
            <textarea
              value={emailForm.body}
              onChange={e => setEmailForm(p => ({ ...p, body: e.target.value }))}
              rows={8}
              placeholder="Email body..."
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            />
          </div>
          <button
            onClick={() => emailMutation.mutate()}
            disabled={emailMutation.isPending || !emailForm.recipients || !emailForm.subject}
            className="py-2.5 px-6 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {emailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Email
          </button>
        </div>
      )}

      {/* Logs */}
      {tab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {logsLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Channel', 'Recipient', 'Subject / Body', 'Status', 'Sent At'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs?.items?.map((log: any) => {
                  const Icon = CHANNEL_ICONS[log.channel] ?? Bell
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm capitalize">{log.channel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{log.recipient}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {log.subject ?? log.body.slice(0, 60)}...
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium',
                          log.status === 'sent' ? 'bg-green-100 text-green-700' :
                          log.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700')}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{log.sentAt ? formatDate(log.sentAt) : '-'}</td>
                    </tr>
                  )
                })}
                {!logs?.items?.length && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No notification logs</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* New announcement modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">New Announcement</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <input value={announcementForm.title}
                  onChange={e => setAnnouncementForm(p => ({ ...p, title: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Content</label>
                <textarea value={announcementForm.content}
                  onChange={e => setAnnouncementForm(p => ({ ...p, content: e.target.value }))}
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Audience</label>
                  <select value={announcementForm.audience}
                    onChange={e => setAnnouncementForm(p => ({ ...p, audience: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                    {AUDIENCES.map(a => <option key={a} className="capitalize">{a}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={announcementForm.isPinned}
                      onChange={e => setAnnouncementForm(p => ({ ...p, isPinned: e.target.checked }))}
                      className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium text-gray-700">Pin announcement</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Send via</label>
                <div className="flex gap-2 flex-wrap">
                  {CHANNELS.map(ch => (
                    <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition',
                        announcementForm.channels.includes(ch)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowNew(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !announcementForm.title || !announcementForm.content}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
