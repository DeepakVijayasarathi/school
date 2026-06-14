import { cn } from '@/lib/utils'

interface SkeletonProps { className?: string }

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton rounded-lg', className)} />
}

export function SkeletonMetricCard() {
  return (
    <div className="rounded-2xl p-5 bg-white border border-gray-100 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-24 h-8 rounded" />
        <Skeleton className="w-32 h-4 rounded" />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="w-3/4 h-4 rounded" />
        <Skeleton className="w-1/2 h-3 rounded" />
      </div>
      <Skeleton className="w-16 h-5 rounded-full" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={cn('h-4 rounded', j === 0 ? 'w-8' : j === cols - 1 ? 'w-16' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}
