'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Bell, Search, ChevronRight, Command, Menu } from 'lucide-react'

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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
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

  useEffect(() => {
    useAuthStore.persist.rehydrate()
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, hasHydrated, router])

  // Track scroll for topbar shadow
  useEffect(() => {
    const el = document.getElementById('main-scroll')
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 4)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile sidebar on route change + update document title
  useEffect(() => {
    setMobileOpen(false)
    const base = Object.entries(PAGE_TITLES).find(([k]) => pathname === k || pathname.startsWith(k + '/'))?.[1]
    document.title = base ? `${base} · SchoolKart ERP` : 'SchoolKart ERP'
  }, [pathname])

  if (!hasHydrated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f1f5f9' }}>
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f1f5f9' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static column on desktop */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto transition-transform duration-300 ease-in-out flex-shrink-0',
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

        {/* Top bar */}
        <header
          className={cn(
            'h-14 flex items-center px-4 gap-3 flex-shrink-0 z-20 transition-all duration-200',
            scrolled
              ? 'bg-white/90 backdrop-blur-md border-b border-gray-200/70 shadow-sm'
              : 'bg-transparent'
          )}
        >
          {/* Mobile hamburger */}
          <button
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 active:scale-95 transition-all shadow-sm flex-shrink-0"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <div key={crumb.href} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                <span
                  className={cn(
                    'text-sm truncate',
                    crumb.isLast
                      ? 'font-semibold text-gray-800'
                      : 'text-gray-400 hover:text-gray-600 cursor-pointer transition-colors'
                  )}
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

          {/* Search trigger */}
          <button
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-gray-600 transition-all shadow-sm group min-w-[150px] xl:min-w-[200px]"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            <span className="flex-1 text-left truncate">Search...</span>
            <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 rounded-md text-[10px] font-medium text-gray-400 flex-shrink-0">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification bell */}
            <button
              className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 active:scale-95 transition-all shadow-sm"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" aria-hidden="true" />
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2 pl-1">
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.fullName}</p>
                <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
              </div>
              <div
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-blue-200 cursor-pointer hover:shadow-md active:scale-95 transition-all flex-shrink-0"
                role="button"
                tabIndex={0}
                aria-label="User menu"
              >
                {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-scroll" className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
