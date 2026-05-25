'use client'

import { useEffect, useState } from 'react'
import { GUINEA_COLORS, DESIGN_TOKENS } from '@/lib/design-system'

// ═══════════════════════════════════════════════════════════════════════════════
// Skeleton Loader — Premium loading states with pulse animation
// ═══════════════════════════════════════════════════════════════════════════════

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
    avatar: 'rounded-full h-10 w-10',
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: '',
  }

  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={{ width, height }}
      role="status"
      aria-label="Chargement..."
    >
      <span className="sr-only">Chargement...</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skeleton Dashboard — Full dashboard loading state
// ═══════════════════════════════════════════════════════════════════════════════

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width="200px" height="28px" />
          <Skeleton variant="text" width="300px" height="16px" />
        </div>
        <Skeleton variant="rectangular" width="120px" height="40px" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width="80px" height="14px" />
              <Skeleton variant="circular" width="36px" height="36px" />
            </div>
            <Skeleton variant="text" width="60px" height="28px" />
            <Skeleton variant="text" width="100px" height="12px" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <Skeleton variant="text" width="160px" height="20px" />
          <Skeleton variant="rectangular" height="250px" />
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <Skeleton variant="text" width="160px" height="20px" />
          <Skeleton variant="rectangular" height="250px" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width="140px" height="20px" />
          <Skeleton variant="rectangular" width="100px" height="36px" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton variant="avatar" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="50%" height="14px" />
                <Skeleton variant="text" width="30%" height="12px" />
              </div>
              <Skeleton variant="rectangular" width="80px" height="28px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Animated Counter — KPI card number animation
// ═══════════════════════════════════════════════════════════════════════════════

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startTime = performance.now()
    const startValue = displayValue

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue + (value - startValue) * eased

      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  const formattedValue = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString('fr-FR')

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{formattedValue}{suffix}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI Card — Premium metric display inspired by Stripe
// ═══════════════════════════════════════════════════════════════════════════════

interface KPICardProps {
  title: string
  value: number
  change?: number
  changeLabel?: string
  prefix?: string
  suffix?: string
  icon?: React.ReactNode
  color?: 'primary' | 'accent' | 'warning' | 'error' | 'info'
  decimals?: number
}

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  prefix = '',
  suffix = '',
  icon,
  color = 'primary',
  decimals = 0,
}: KPICardProps) {
  const colorMap = {
    primary: { bg: 'bg-red-50 dark:bg-red-950/30', icon: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    accent: { bg: 'bg-green-50 dark:bg-green-950/30', icon: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', icon: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    error: { bg: 'bg-red-50 dark:bg-red-950/30', icon: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    info: { bg: 'bg-blue-50 dark:bg-blue-950/30', icon: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  }

  const c = colorMap[color]

  return (
    <div className={`rounded-xl border ${c.border} bg-white dark:bg-gray-800 p-6 transition-shadow hover:shadow-lg`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        {icon && (
          <div className={`rounded-lg ${c.bg} p-2.5 ${c.icon}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          className="text-3xl font-bold text-gray-900 dark:text-white"
        />
      </div>
      {change !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center text-sm font-medium ${
            change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
          {changeLabel && (
            <span className="text-sm text-gray-400 dark:text-gray-500">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Workflow Progress Bar — Visual step-by-step progress
// ═══════════════════════════════════════════════════════════════════════════════

interface WorkflowStep {
  label: string
  status: 'completed' | 'current' | 'pending' | 'rejected'
  date?: string
}

interface WorkflowProgressProps {
  steps: WorkflowStep[]
  className?: string
}

export function WorkflowProgress({ steps, className = '' }: WorkflowProgressProps) {
  const statusColors = {
    completed: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-600 dark:text-green-400', line: 'bg-green-500' },
    current: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', line: 'bg-blue-200 dark:bg-blue-800' },
    pending: { bg: 'bg-gray-300 dark:bg-gray-600', border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-400 dark:text-gray-500', line: 'bg-gray-200 dark:bg-gray-700' },
    rejected: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-600 dark:text-red-400', line: 'bg-red-200 dark:bg-red-800' },
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const colors = statusColors[step.status]
          const isLast = index === steps.length - 1

          return (
            <div key={index} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${colors.border} ${colors.bg} transition-all`}>
                  {step.status === 'completed' ? (
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step.status === 'rejected' ? (
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : step.status === 'current' ? (
                    <div className="h-3 w-3 rounded-full bg-white dark:bg-gray-900" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-white dark:bg-gray-900" />
                  )}
                </div>
                <span className={`mt-1.5 text-xs font-medium ${colors.text} text-center max-w-[80px]`}>
                  {step.label}
                </span>
                {step.date && (
                  <span className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                    {step.date}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1 mt-[-20px] ${colors.line} transition-all`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Notification Badge — Unread count indicator
// ═══════════════════════════════════════════════════════════════════════════════

interface NotificationBadgeProps {
  count: number
  max?: number
  className?: string
}

export function NotificationBadge({ count, max = 99, className = '' }: NotificationBadgeProps) {
  if (count <= 0) return null

  const displayCount = count > max ? `${max}+` : count

  return (
    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-600 rounded-full ${className}`}>
      {displayCount}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Status Badge — Colored status indicator
// ═══════════════════════════════════════════════════════════════════════════════

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    pending: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', label: 'En attente' },
    in_progress: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', label: 'En cours' },
    approved: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500', label: 'Approuvé' },
    rejected: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', label: 'Rejeté' },
    signed: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-emerald-600', label: 'Signé' },
    draft: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', dot: 'bg-gray-400', label: 'Brouillon' },
    active: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500', label: 'Actif' },
    inactive: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', dot: 'bg-gray-400', label: 'Inactif' },
  }

  const config = statusConfig[status] || statusConfig.draft

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }

  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  }

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses[size]} ${className}`}>
      <span className={`rounded-full ${config.dot} ${dotSizes[size]}`} />
      {config.label}
    </span>
  )
}
