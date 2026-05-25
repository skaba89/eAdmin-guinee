'use client'

import { cn } from '@/lib/utils'

// ─── SKELETON BASE ────────────────────────────────────────────────────────────
function SkeletonPulse({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-accent dark:bg-accent/50', className)}
      {...props}
    />
  )
}

// ─── CARD SKELETON ────────────────────────────────────────────────────────────
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border p-4 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <SkeletonPulse className="size-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-3/4 rounded" />
          <SkeletonPulse className="h-3 w-1/2 rounded" />
        </div>
      </div>
      <SkeletonPulse className="h-8 w-1/3 rounded" />
      <SkeletonPulse className="h-2 w-full rounded-full" />
    </div>
  )
}

// ─── TABLE SKELETON ───────────────────────────────────────────────────────────
function SkeletonTable({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="flex gap-4 border-b border-border bg-muted/30 p-3">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonPulse key={i} className="h-4 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 border-b border-border/50 p-3 last:border-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <SkeletonPulse
              key={colIdx}
              className={cn(
                'h-4 flex-1 rounded',
                colIdx === 0 && 'w-1/4',
                colIdx === columns - 1 && 'w-1/6',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── LIST SKELETON ────────────────────────────────────────────────────────────
function SkeletonList({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonPulse className="size-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonPulse className="h-3.5 w-3/4 rounded" />
            <SkeletonPulse className="h-3 w-1/2 rounded" />
          </div>
          <SkeletonPulse className="h-3 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}

// ─── TEXT SKELETON ────────────────────────────────────────────────────────────
function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse
          key={i}
          className={cn(
            'h-4 rounded',
            i === lines - 1 && 'w-2/3',
          )}
        />
      ))}
    </div>
  )
}

// ─── AVATAR SKELETON ──────────────────────────────────────────────────────────
function SkeletonAvatar({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeMap = { sm: 'size-8', md: 'size-10', lg: 'size-14' }
  return <SkeletonPulse className={cn('rounded-full', sizeMap[size], className)} />
}

// ─── DASHBOARD SKELETON ───────────────────────────────────────────────────────
function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-5 p-4 md:p-6', className)}>
      {/* Header */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-4">
          <SkeletonPulse className="size-14 rounded-xl" />
          <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-6 w-64 rounded" />
            <SkeletonPulse className="h-3 w-48 rounded" />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <SkeletonPulse className="size-8 rounded-lg" />
            <div className="space-y-1.5">
              <SkeletonPulse className="h-4 w-40 rounded" />
              <SkeletonPulse className="h-3 w-28 rounded" />
            </div>
          </div>
          <SkeletonPulse className="h-64 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <SkeletonPulse className="size-8 rounded-lg" />
            <div className="space-y-1.5">
              <SkeletonPulse className="h-4 w-40 rounded" />
              <SkeletonPulse className="h-3 w-28 rounded" />
            </div>
          </div>
          <SkeletonPulse className="h-64 w-full rounded-lg" />
        </div>
      </div>

      {/* Activity + actions row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border p-4 space-y-3">
          <SkeletonPulse className="h-5 w-48 rounded" />
          <SkeletonList items={6} />
        </div>
        <div className="rounded-xl border border-border p-4 space-y-3">
          <SkeletonPulse className="h-5 w-32 rounded" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonPulse key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export {
  SkeletonPulse,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonText,
  SkeletonAvatar,
  SkeletonDashboard,
}
