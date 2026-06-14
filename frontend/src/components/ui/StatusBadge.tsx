import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  active:      'bg-green-100 text-green-800',
  inactive:    'bg-gray-100 text-gray-600',
  suspended:   'bg-red-100 text-red-700',
  pending:     'bg-yellow-100 text-yellow-800',
  paid:        'bg-green-100 text-green-800',
  partial:     'bg-blue-100 text-blue-800',
  overdue:     'bg-red-100 text-red-700',
  waived:      'bg-purple-100 text-purple-800',
  present:     'bg-green-100 text-green-700',
  absent:      'bg-red-100 text-red-700',
  late:        'bg-yellow-100 text-yellow-800',
  halfday:     'bg-orange-100 text-orange-700',
  excused:     'bg-blue-100 text-blue-700',
  pass:        'bg-green-100 text-green-700',
  fail:        'bg-red-100 text-red-700',
  approved:    'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-600',
  draft:       'bg-gray-100 text-gray-600',
  published:   'bg-blue-100 text-blue-700',
  boys:        'bg-blue-100 text-blue-700',
  girls:       'bg-pink-100 text-pink-700',
  mixed:       'bg-purple-100 text-purple-700',
  open:        'bg-yellow-100 text-yellow-800',
  resolved:    'bg-green-100 text-green-700',
  'in-progress':'bg-blue-100 text-blue-700',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, '-')
  const style = STATUS_STYLES[normalized] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', style, className)}>
      {status}
    </span>
  )
}
