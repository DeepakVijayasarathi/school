'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  LayoutDashboard, Users, UserCheck, BookOpen, ClipboardList, DollarSign,
  BarChart3, Settings, GraduationCap, Bus, Library, MessageSquare, FileText,
  LogOut, Building2, MonitorPlay, BedDouble, Package, ChevronLeft,
  Sparkles, Bell, CalendarDays, Clock, Landmark, UserPlus, ShieldCheck,
  ContactRound
} from 'lucide-react'

const sections = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-400', bg: 'bg-blue-500/15', permission: null },
    ],
  },
  {
    label: 'Academics',
    items: [
      { href: '/students',          label: 'Students',       icon: Users,          color: 'text-violet-400',  bg: 'bg-violet-500/15',  permission: 'student.view' },
      { href: '/admissions',        label: 'Admissions',     icon: UserPlus,       color: 'text-sky-400',     bg: 'bg-sky-500/15',     permission: 'admission.view' },
      { href: '/attendance',        label: 'Attendance',     icon: UserCheck,      color: 'text-emerald-400', bg: 'bg-emerald-500/15', permission: 'attendance.mark' },
      { href: '/timetable',         label: 'Timetable',      icon: Clock,          color: 'text-blue-400',    bg: 'bg-blue-500/15',    permission: 'timetable.view' },
      { href: '/academic-calendar', label: 'Calendar',       icon: CalendarDays,   color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15', permission: null },
      { href: '/exams',             label: 'Exams',          icon: ClipboardList,  color: 'text-amber-400',   bg: 'bg-amber-500/15',   permission: 'exam.view' },
      { href: '/fees',              label: 'Fees',           icon: DollarSign,     color: 'text-green-400',   bg: 'bg-green-500/15',   permission: 'fee.view' },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/online-learning', label: 'Online Learning', icon: MonitorPlay,   color: 'text-pink-400',   bg: 'bg-pink-500/15',   permission: null },
      { href: '/homework',        label: 'Homework',        icon: FileText,       color: 'text-orange-400', bg: 'bg-orange-500/15', permission: null },
      { href: '/library',         label: 'Library',         icon: Library,        color: 'text-cyan-400',   bg: 'bg-cyan-500/15',   permission: 'library.view' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/transport',          label: 'Transport',     icon: Bus,            color: 'text-indigo-400', bg: 'bg-indigo-500/15', permission: 'transport.view' },
      { href: '/hostel',             label: 'Hostel',        icon: BedDouble,      color: 'text-teal-400',   bg: 'bg-teal-500/15',   permission: 'hostel.view' },
      { href: '/inventory',          label: 'Inventory',     icon: Package,        color: 'text-rose-400',   bg: 'bg-rose-500/15',   permission: 'inventory.view' },
      { href: '/visitor-management', label: 'Visitors',      icon: ShieldCheck,    color: 'text-lime-400',   bg: 'bg-lime-500/15',   permission: 'visitor.view' },
      { href: '/communication',      label: 'Communication', icon: MessageSquare,  color: 'text-blue-300',   bg: 'bg-blue-400/15',   permission: null },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/hr',           label: 'HR & Payroll', icon: Users,         color: 'text-purple-400', bg: 'bg-purple-500/15', permission: 'hr.*' },
      { href: '/accounting',   label: 'Accounting',   icon: Landmark,      color: 'text-yellow-400', bg: 'bg-yellow-500/15', permission: 'accounting.*' },
      { href: '/reports',      label: 'Reports',      icon: BarChart3,     color: 'text-orange-400', bg: 'bg-orange-500/15', permission: 'report.view' },
      { href: '/parent-portal',label: 'Parent Portal',icon: ContactRound,  color: 'text-emerald-400',bg: 'bg-emerald-500/15',permission: 'parent.*' },
      { href: '/school-setup', label: 'School Setup', icon: Building2,     color: 'text-slate-400',  bg: 'bg-slate-500/15',  permission: 'school.*' },
      { href: '/settings',     label: 'Settings',     icon: Settings,      color: 'text-gray-400',   bg: 'bg-gray-500/15',   permission: null },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, hasPermission, clearAuth } = useAuthStore()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  return (
    <aside
      className={cn(
        'flex flex-col h-full relative transition-all duration-300 ease-in-out overflow-hidden',
        'bg-[#0a0f1e]',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
      style={{
        background: 'linear-gradient(180deg, #0d1526 0%, #080e1a 60%, #050a12 100%)',
      }}
    >
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-blue-600/5 rounded-full -translate-x-24 -translate-y-24 pointer-events-none" />
      <div className="absolute bottom-32 right-0 w-32 h-32 bg-violet-600/5 rounded-full translate-x-16 pointer-events-none" />

      {/* Logo area */}
      <div className={cn(
        'flex items-center border-b border-white/5 relative',
        collapsed ? 'justify-center px-0 py-4' : 'gap-3 px-5 py-4'
      )}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm tracking-wide">SchoolKart</p>
            <p className="text-[10px] text-blue-400/80 font-medium tracking-wider uppercase">
              ERP System
            </p>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={onToggle}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0 min-h-0">
        {sections.map((section) => {
          const visible = section.items.filter(
            item => !item.permission || hasPermission(item.permission)
          )
          if (!visible.length) return null

          return (
            <div key={section.label}>
              {!collapsed && (
                <div className="sidebar-section-label">{section.label}</div>
              )}
              {collapsed && <div className="h-2" />}

              {visible.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group flex items-center gap-3 mx-2 my-0.5 rounded-xl transition-all duration-150 relative',
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                      active
                        ? 'bg-blue-600/20 text-white'
                        : 'text-white/45 hover:text-white/85 hover:bg-white/5'
                    )}
                  >
                    {/* Active indicator */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full" />
                    )}

                    {/* Icon */}
                    <span className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                      active ? item.bg + ' ' + item.color : 'group-hover:' + item.bg
                    )}>
                      <item.icon className={cn('w-4 h-4', active ? item.color : '')} />
                    </span>

                    {!collapsed && (
                      <span className={cn('text-sm font-medium truncate', active ? 'text-white' : '')}>
                        {item.label}
                      </span>
                    )}

                    {/* Active dot for collapsed */}
                    {active && collapsed && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Bottom user section */}
      <div className="border-t border-white/5 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-all group cursor-pointer">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0a0f1e] rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/90 truncate">{user?.fullName ?? 'User'}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.role}</p>
            </div>
            <button
              onClick={clearAuth}
              className="text-white/25 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
              title="Sign out"
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
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border-2 border-[#0a0f1e] rounded-full" />
            </div>
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/70 hover:bg-white/5 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
