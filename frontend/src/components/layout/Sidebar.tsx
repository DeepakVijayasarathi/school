'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  LayoutDashboard, Users, UserCheck, BookOpen, ClipboardList, DollarSign,
  BarChart3, Settings, GraduationCap, Bus, Library, MessageSquare, FileText,
  LogOut, Building2, MonitorPlay, BedDouble, Package, ChevronLeft,
  CalendarDays, Clock, Landmark, UserPlus, ShieldCheck, ContactRound, X,
} from 'lucide-react'

const sections = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard',         label: 'Dashboard',      icon: LayoutDashboard, activeClass: 'bg-blue-500/20 text-blue-300',    permission: null },
    ],
  },
  {
    label: 'Academics',
    items: [
      { href: '/students',          label: 'Students',       icon: Users,           activeClass: 'bg-violet-500/20 text-violet-300', permission: 'student.view' },
      { href: '/admissions',        label: 'Admissions',     icon: UserPlus,        activeClass: 'bg-sky-500/20 text-sky-300',       permission: 'admission.view' },
      { href: '/attendance',        label: 'Attendance',     icon: UserCheck,       activeClass: 'bg-emerald-500/20 text-emerald-300', permission: 'attendance.mark' },
      { href: '/timetable',         label: 'Timetable',      icon: Clock,           activeClass: 'bg-blue-500/20 text-blue-300',     permission: 'timetable.view' },
      { href: '/academic-calendar', label: 'Calendar',       icon: CalendarDays,    activeClass: 'bg-fuchsia-500/20 text-fuchsia-300', permission: null },
      { href: '/exams',             label: 'Exams',          icon: ClipboardList,   activeClass: 'bg-amber-500/20 text-amber-300',   permission: 'exam.view' },
      { href: '/fees',              label: 'Fees',           icon: DollarSign,      activeClass: 'bg-green-500/20 text-green-300',   permission: 'fee.view' },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/online-learning',   label: 'Online Learning', icon: MonitorPlay,    activeClass: 'bg-pink-500/20 text-pink-300',    permission: null },
      { href: '/homework',          label: 'Homework',        icon: FileText,        activeClass: 'bg-orange-500/20 text-orange-300', permission: null },
      { href: '/library',           label: 'Library',         icon: Library,         activeClass: 'bg-cyan-500/20 text-cyan-300',    permission: 'library.view' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/transport',          label: 'Transport',      icon: Bus,             activeClass: 'bg-indigo-500/20 text-indigo-300', permission: 'transport.view' },
      { href: '/hostel',             label: 'Hostel',         icon: BedDouble,       activeClass: 'bg-teal-500/20 text-teal-300',    permission: 'hostel.view' },
      { href: '/inventory',          label: 'Inventory',      icon: Package,         activeClass: 'bg-rose-500/20 text-rose-300',    permission: 'inventory.view' },
      { href: '/visitor-management', label: 'Visitors',       icon: ShieldCheck,     activeClass: 'bg-lime-500/20 text-lime-300',    permission: 'visitor.view' },
      { href: '/communication',      label: 'Communication',  icon: MessageSquare,   activeClass: 'bg-blue-400/20 text-blue-300',    permission: null },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/hr',            label: 'HR & Payroll',  icon: Users,          activeClass: 'bg-purple-500/20 text-purple-300', permission: 'hr.*' },
      { href: '/accounting',    label: 'Accounting',    icon: Landmark,       activeClass: 'bg-yellow-500/20 text-yellow-300', permission: 'accounting.*' },
      { href: '/reports',       label: 'Reports',       icon: BarChart3,      activeClass: 'bg-orange-500/20 text-orange-300', permission: 'report.view' },
      { href: '/parent-portal', label: 'Parent Portal', icon: ContactRound,   activeClass: 'bg-emerald-500/20 text-emerald-300', permission: 'parent.*' },
      { href: '/school-setup',  label: 'School Setup',  icon: Building2,      activeClass: 'bg-slate-500/20 text-slate-300',   permission: 'school.*' },
      { href: '/settings',      label: 'Settings',      icon: Settings,       activeClass: 'bg-gray-500/20 text-gray-300',     permission: null },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onMobileClose?: () => void
}

export function Sidebar({ collapsed, onToggle, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, hasPermission, clearAuth } = useAuthStore()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  return (
    <aside
      className={cn(
        'flex flex-col h-full relative transition-all duration-300 ease-in-out overflow-hidden select-none',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
      style={{ background: 'linear-gradient(180deg, #0d1526 0%, #080e1a 60%, #050a12 100%)' }}
    >
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-blue-600/5 rounded-full -translate-x-24 -translate-y-24 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-32 right-0 w-32 h-32 bg-violet-600/5 rounded-full translate-x-16 pointer-events-none" aria-hidden="true" />

      {/* Logo area */}
      <div className={cn(
        'flex items-center border-b border-white/5 relative flex-shrink-0',
        collapsed ? 'justify-center px-0 py-4' : 'gap-3 px-4 py-4'
      )}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm tracking-wide">SchoolKart</p>
              <p className="text-[10px] text-blue-400/80 font-medium tracking-wider uppercase">ERP System</p>
            </div>

            {/* Mobile close button */}
            {onMobileClose && (
              <button
                onClick={onMobileClose}
                className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Desktop collapse button */}
            <button
              onClick={onToggle}
              className="hidden lg:flex w-6 h-6 rounded-lg items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Collapsed expand button */}
        {collapsed && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#0d1526] border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 transition-all shadow-md z-10"
            aria-label="Expand sidebar"
          >
            <ChevronLeft className="w-3 h-3 rotate-180" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 min-h-0" aria-label="Main navigation">
        {sections.map((section) => {
          const visible = section.items.filter(
            item => !item.permission || hasPermission(item.permission)
          )
          if (!visible.length) return null

          return (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <p className="sidebar-section-label">{section.label}</p>
              )}
              {collapsed && <div className="h-3" />}

              {visible.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={() => onMobileClose?.()}
                    className={cn(
                      'group flex items-center gap-3 mx-2 my-0.5 rounded-xl transition-all duration-150 relative',
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 hover:text-white/80 hover:bg-white/[0.06]'
                    )}
                  >
                    {/* Active bar */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full" aria-hidden="true" />
                    )}

                    {/* Icon */}
                    <span className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150',
                      active ? item.activeClass : 'group-hover:bg-white/[0.08]'
                    )}>
                      <item.icon className={cn(
                        'w-4 h-4 transition-colors',
                        active
                          ? ''  // color set by activeClass on parent
                          : 'text-white/40 group-hover:text-white/70'
                      )} />
                    </span>

                    {!collapsed && (
                      <span className={cn(
                        'text-sm font-medium truncate transition-colors',
                        active ? 'text-white' : 'group-hover:text-white/85'
                      )}>
                        {item.label}
                      </span>
                    )}

                    {/* Active dot for collapsed mode */}
                    {active && collapsed && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" aria-hidden="true" />
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Bottom user section */}
      <div className="border-t border-white/5 p-3 flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-all group">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0a0f1e] rounded-full" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/90 truncate">{user?.fullName ?? 'User'}</p>
              <p className="text-[10px] text-white/40 truncate capitalize">{user?.role}</p>
            </div>
            <button
              onClick={clearAuth}
              className="text-white/25 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 flex-shrink-0"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border-2 border-[#0a0f1e] rounded-full" aria-hidden="true" />
            </div>
            <button
              onClick={clearAuth}
              className="text-white/20 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
