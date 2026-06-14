'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  LayoutDashboard, Users, UserCheck, ClipboardList, DollarSign,
  BarChart3, Settings, GraduationCap, Bus, Library, MessageSquare,
  FileText, LogOut, Building2, MonitorPlay, BedDouble, Package,
  ChevronLeft, CalendarDays, Clock, Landmark, UserPlus, ShieldCheck,
  ContactRound, X, Sparkles,
} from 'lucide-react'

const NAV = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1', permission: null },
    ],
  },
  {
    label: 'Academics',
    items: [
      { href: '/students',          label: 'Students',     icon: GraduationCap, color: '#6366f1', permission: 'student.view'   },
      { href: '/admissions',        label: 'Admissions',   icon: UserPlus,      color: '#0ea5e9', permission: 'admission.view'  },
      { href: '/attendance',        label: 'Attendance',   icon: UserCheck,     color: '#10b981', permission: 'attendance.mark' },
      { href: '/timetable',         label: 'Timetable',    icon: Clock,         color: '#8b5cf6', permission: 'timetable.view'  },
      { href: '/academic-calendar', label: 'Calendar',     icon: CalendarDays,  color: '#f59e0b', permission: null              },
      { href: '/exams',             label: 'Exams',        icon: ClipboardList, color: '#ef4444', permission: 'exam.view'       },
      { href: '/fees',              label: 'Fees',         icon: DollarSign,    color: '#16a34a', permission: 'fee.view'        },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/online-learning', label: 'Online Learning', icon: MonitorPlay, color: '#ec4899', permission: null            },
      { href: '/homework',        label: 'Homework',         icon: FileText,    color: '#f97316', permission: null            },
      { href: '/library',         label: 'Library',          icon: Library,     color: '#06b6d4', permission: 'library.view'  },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/transport',          label: 'Transport',      icon: Bus,          color: '#6366f1', permission: 'transport.view' },
      { href: '/hostel',             label: 'Hostel',         icon: BedDouble,    color: '#14b8a6', permission: 'hostel.view'    },
      { href: '/inventory',          label: 'Inventory',      icon: Package,      color: '#f43f5e', permission: 'inventory.view' },
      { href: '/visitor-management', label: 'Visitors',       icon: ShieldCheck,  color: '#84cc16', permission: 'visitor.view'   },
      { href: '/communication',      label: 'Communication',  icon: MessageSquare,color: '#3b82f6', permission: null             },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/hr',           label: 'HR & Payroll',  icon: Users,         color: '#a78bfa', permission: 'hr.*'         },
      { href: '/accounting',   label: 'Accounting',    icon: Landmark,      color: '#fbbf24', permission: 'accounting.*' },
      { href: '/reports',      label: 'Reports',       icon: BarChart3,     color: '#fb923c', permission: 'report.view'  },
      { href: '/parent-portal',label: 'Parent Portal', icon: ContactRound,  color: '#34d399', permission: 'parent.*'    },
      { href: '/school-setup', label: 'School Setup',  icon: Building2,     color: '#94a3b8', permission: 'school.*'    },
      { href: '/settings',     label: 'Settings',      icon: Settings,      color: '#94a3b8', permission: null           },
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

  const initials = (user?.fullName ?? 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside
      className={cn(
        'flex flex-col h-full relative transition-all duration-300 ease-in-out overflow-hidden select-none',
        collapsed ? 'w-16' : 'w-[240px]'
      )}
      style={{ background: 'linear-gradient(180deg,#0f1117 0%,#080c12 100%)' }}
    >
      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '20px 20px' }}
        aria-hidden="true"
      />

      {/* ── Logo bar ─────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center h-14 flex-shrink-0 border-b relative z-10',
        'border-white/[.06]',
        collapsed ? 'justify-center px-0' : 'px-4 gap-2.5'
      )}>
        {/* Logo mark */}
        <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,.4)' }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-[13px] tracking-tight leading-none">SchoolKart</p>
              <p className="text-[10px] font-medium tracking-widest uppercase mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>ERP Platform</p>
            </div>
            {onMobileClose && (
              <button onClick={onMobileClose}
                className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,.4)' }} aria-label="Close menu">
                <X className="w-4 h-4" />
              </button>
            )}
            <button onClick={onToggle}
              className="hidden lg:flex w-6 h-6 rounded-lg items-center justify-center transition-all hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,.3)' }} aria-label="Collapse sidebar">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {collapsed && (
          <button onClick={onToggle}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-md z-20 transition-all hover:scale-110"
            style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)' }}
            aria-label="Expand sidebar">
            <ChevronLeft className="w-3 h-3 rotate-180" />
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 relative z-10 min-h-0" style={{ scrollbarWidth: 'none' }} aria-label="Main navigation">
        {NAV.map((section) => {
          const visible = section.items.filter(item => !item.permission || hasPermission(item.permission))
          if (!visible.length) return null

          return (
            <div key={section.label} className="mb-1">
              {!collapsed
                ? <p className="nav-section-label">{section.label}</p>
                : <div className="h-3" />
              }

              {visible.map(({ href, label, icon: Icon, color }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    onClick={() => onMobileClose?.()}
                    className={cn(
                      'group flex items-center gap-2.5 mx-2 my-px rounded-lg transition-all duration-150 relative',
                      collapsed ? 'justify-center py-2.5 px-0' : 'px-2.5 py-2',
                      active
                        ? 'bg-white/10'
                        : 'hover:bg-white/[.055]'
                    )}
                  >
                    {/* Active indicator */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                        style={{ background: color }}
                        aria-hidden="true"
                      />
                    )}

                    {/* Icon container */}
                    <span
                      className={cn(
                        'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150',
                        active ? 'shadow-sm' : ''
                      )}
                      style={active
                        ? { background: `${color}22`, boxShadow: `0 0 0 1px ${color}33` }
                        : {}
                      }
                    >
                      <Icon
                        className="w-[15px] h-[15px] transition-colors"
                        style={{ color: active ? color : 'rgba(255,255,255,.38)' }}
                      />
                    </span>

                    {!collapsed && (
                      <span
                        className={cn('text-[13px] font-medium truncate transition-colors leading-none')}
                        style={{ color: active ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.42)' }}
                      >
                        {label}
                      </span>
                    )}

                    {/* Tooltip for collapsed */}
                    {collapsed && active && (
                      <span
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ background: color }}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* ── User footer ────────────────────────────────────────── */}
      <div className="flex-shrink-0 relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '10px' }}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-1 py-1.5 rounded-xl hover:bg-white/[.055] transition-colors cursor-default group">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                {initials}
              </div>
              <span className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full border-2"
                style={{ background: '#10b981', borderColor: '#0f1117' }} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate leading-tight" style={{ color: 'rgba(255,255,255,.88)' }}>
                {user?.fullName ?? 'User'}
              </p>
              <p className="text-[10px] capitalize truncate mt-0.5" style={{ color: 'rgba(255,255,255,.35)' }}>
                {user?.role}
              </p>
            </div>
            <button
              onClick={clearAuth}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/20"
              style={{ color: 'rgba(255,255,255,.25)' }}
              title="Sign out" aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                {initials}
              </div>
              <span className="absolute -bottom-px -right-px w-2 h-2 rounded-full border-2"
                style={{ background: '#10b981', borderColor: '#0f1117' }} aria-hidden="true" />
            </div>
            <button
              onClick={clearAuth}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/20"
              style={{ color: 'rgba(255,255,255,.2)' }}
              title="Sign out" aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
