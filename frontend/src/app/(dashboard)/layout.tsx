'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Bell, ChevronRight, Menu, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/students':          'Students',
  '/admissions':        'Admissions',
  '/attendance':        'Attendance',
  '/timetable':         'Timetable',
  '/academic-calendar': 'Academic Calendar',
  '/exams':             'Exams',
  '/fees':              'Fees',
  '/online-learning':   'Online Learning',
  '/homework':          'Homework',
  '/library':           'Library',
  '/transport':         'Transport',
  '/hostel':            'Hostel',
  '/inventory':         'Inventory',
  '/visitor-management':'Visitor Management',
  '/communication':     'Communication',
  '/hr':                'HR & Payroll',
  '/accounting':        'Accounting',
  '/reports':           'Reports',
  '/parent-portal':     'Parent Portal',
  '/school-setup':      'School Setup',
  '/settings':          'Settings',
}

function useBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((seg, i) => ({
    label: seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hasHydrated, setHasHydrated] = useState(false)
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const breadcrumb = useBreadcrumb()

  const initials = (user?.fullName ?? 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    useAuthStore.persist.rehydrate()
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, hasHydrated, router])

  useEffect(() => {
    const el = document.getElementById('main-scroll')
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 4)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    const base = Object.entries(PAGE_TITLES).find(([k]) => pathname === k || pathname.startsWith(k + '/'))?.[1]
    document.title = base ? `${base} · SchoolKart ERP` : 'SchoolKart ERP'
  }, [pathname])

  if (!hasHydrated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 16px rgba(99,102,241,.35)' }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
      </div>
    </div>
  )
  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden backdrop-blur-sm"
          style={{ background: 'rgba(9,12,20,.55)' }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto transition-transform duration-300 flex-shrink-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header
          className={cn(
            'h-14 flex items-center px-4 gap-3 flex-shrink-0 z-20 transition-all duration-200',
          )}
          style={scrolled
            ? { background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(16px) saturate(180%)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }
            : { background: 'transparent' }
          }
        >
          {/* Mobile hamburger */}
          <button
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-95 btn btn-secondary"
            style={{ padding: 0 }}
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" style={{ color: 'var(--text-2)' }} />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-0.5 min-w-0 flex-1 overflow-hidden" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <div key={crumb.href} className="flex items-center gap-0.5 min-w-0">
                {i > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-4)' }} />}
                <span
                  className={cn(
                    'text-[13px] truncate px-1 py-0.5 rounded-md transition-colors',
                    crumb.isLast
                      ? 'font-semibold'
                      : 'cursor-pointer hover:bg-[var(--surface-2)]'
                  )}
                  style={{ color: crumb.isLast ? 'var(--text-1)' : 'var(--text-3)' }}
                  onClick={() => !crumb.isLast && router.push(crumb.href)}
                  role={!crumb.isLast ? 'button' : undefined}
                  tabIndex={!crumb.isLast ? 0 : undefined}
                  onKeyDown={e => e.key === 'Enter' && !crumb.isLast && router.push(crumb.href)}
                >
                  {crumb.label}
                </span>
              </div>
            ))}
          </nav>


          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification bell */}
            <button
              className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-95 btn btn-secondary"
              style={{ padding: 0 }}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" style={{ color: 'var(--text-2)' }} />
            </button>

            {/* Divider */}
            <div className="w-px h-5" style={{ background: 'var(--border)' }} aria-hidden="true" />

            {/* User chip */}
            <div className="flex items-center gap-2 cursor-default">
              <div className="text-right hidden md:block">
                <p className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--text-1)' }}>
                  {user?.fullName}
                </p>
                <p className="text-[10px] capitalize" style={{ color: 'var(--text-3)' }}>{user?.role}</p>
              </div>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 2px 8px rgba(99,102,241,.3)' }}
                role="button"
                tabIndex={0}
                aria-label="User menu"
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-scroll" className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
