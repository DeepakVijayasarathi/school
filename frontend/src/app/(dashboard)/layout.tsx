'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Bell, Search, ChevronRight, Command } from 'lucide-react'

// Build breadcrumb from pathname
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
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const breadcrumb = useBreadcrumb()

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  // Track scroll for topbar shadow
  useEffect(() => {
    const el = document.getElementById('main-scroll')
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 4)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f1f5f9' }}>
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header
          className={cn(
            'h-14 flex items-center px-5 gap-4 flex-shrink-0 z-20 transition-all duration-200',
            scrolled
              ? 'bg-white/80 backdrop-blur-md border-b border-gray-200/70 shadow-sm'
              : 'bg-transparent'
          )}
        >
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 min-w-0 flex-1">
            {breadcrumb.map((crumb, i) => (
              <div key={crumb.href} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                <span
                  className={cn(
                    'text-sm truncate',
                    crumb.isLast
                      ? 'font-semibold text-gray-800'
                      : 'text-gray-400 hover:text-gray-600 cursor-pointer'
                  )}
                  onClick={() => !crumb.isLast && router.push(crumb.href)}
                >
                  {crumb.label}
                </span>
              </div>
            ))}
          </nav>

          {/* Search trigger */}
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-gray-600 transition-all shadow-sm group min-w-[180px]">
            <Search className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded-md text-[10px] font-medium text-gray-400">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2.5 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.fullName}</p>
                <p className="text-[10px] text-gray-400">{user?.role}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-blue-200 cursor-pointer hover:shadow-md transition-shadow">
                {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-scroll" className="flex-1 overflow-y-auto">
          <div className="p-6 animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
