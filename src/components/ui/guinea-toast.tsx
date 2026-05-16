'use client'

import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useGuineaToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback: return no-op functions if used outside provider
    return { addToast: () => {}, removeToast: () => {}, toasts: [] as Toast[] }
  }
  return ctx
}

// ─── Color & Icon config per type ────────────────────────────────────────────
const TOAST_CONFIG: Record<ToastType, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  success: {
    bg: 'bg-[#009460]/10 dark:bg-[#009460]/15',
    border: 'border-[#009460]/30',
    icon: CheckCircle2,
    iconColor: 'text-[#009460]',
  },
  error: {
    bg: 'bg-[#CE1126]/10 dark:bg-[#CE1126]/15',
    border: 'border-[#CE1126]/30',
    icon: XCircle,
    iconColor: 'text-[#CE1126]',
  },
  warning: {
    bg: 'bg-[#FCD116]/10 dark:bg-[#FCD116]/15',
    border: 'border-[#FCD116]/30',
    icon: AlertTriangle,
    iconColor: 'text-[#FCD116]',
  },
  info: {
    bg: 'bg-[#0B2E58]/10 dark:bg-[#3B7DD8]/15',
    border: 'border-[#0B2E58]/30 dark:border-[#3B7DD8]/30',
    icon: Info,
    iconColor: 'text-[#0B2E58] dark:text-[#3B7DD8]',
  },
}

// ─── Single Toast Item ───────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config = TOAST_CONFIG[toast.type]
  const Icon = config.icon
  const duration = toast.duration ?? 4000

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, duration)
    return () => clearTimeout(timer)
  }, [toast.id, duration, onRemove])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`
        toast-enter pointer-events-auto w-80 max-w-[calc(100vw-2rem)]
        rounded-lg border shadow-lg backdrop-blur-sm
        ${config.bg} ${config.border}
        overflow-hidden
      `}
    >
      {/* Tricolor accent bar */}
      <div className="flex h-0.5">
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
        <div className="flex-1 bg-[#009460]" />
      </div>

      <div className="flex items-start gap-3 p-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="shrink-0 h-5 w-5 rounded flex items-center justify-center hover:bg-foreground/5 transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Toast Provider ──────────────────────────────────────────────────────────
export function GuineaToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Toast container - fixed bottom right */}
      <div className="fixed bottom-4 right-4 z-[9997] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
