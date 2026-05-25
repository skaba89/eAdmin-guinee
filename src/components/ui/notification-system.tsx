'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Shield,
  GitBranch,
  Server,
  Info,
  CheckCheck,
  Trash2,
  X,
  ChevronDown,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useNotificationsStore, type NotificationCategory, type AppNotification } from '@/store/notifications-store'

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────
const categoryConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  securite: { label: 'Sécurité', icon: Shield, color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30' },
  workflow: { label: 'Workflow', icon: GitBranch, color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' },
  systeme: { label: 'Système', icon: Server, color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30' },
  info: { label: 'Info', icon: Info, color: 'text-[#0B2E58] bg-[#0B2E58]/10 dark:text-[#3B7DD8] dark:bg-[#3B7DD8]/20' },
  // Map existing store categories
  demande: { label: 'Demande', icon: Info, color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30' },
  document: { label: 'Document', icon: Info, color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30' },
  courrier: { label: 'Courrier', icon: Info, color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' },
  signature: { label: 'Signature', icon: Info, color: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30' },
}

function getCategoryConfig(category: NotificationCategory) {
  return categoryConfig[category] || categoryConfig.info
}

// ─── TYPE ICON ────────────────────────────────────────────────────────────────
const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCheck,
  warning: Shield,
  error: Shield,
}

// ─── TIME FORMATTING ──────────────────────────────────────────────────────────
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  if (diffHour < 24) return `Il y a ${diffHour}h`
  if (diffDay < 7) return `Il y a ${diffDay}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── NOTIFICATION ITEM ────────────────────────────────────────────────────────
function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: AppNotification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const config = getCategoryConfig(notification.category)
  const TypeIcon = typeIcons[notification.type] || Info
  const CatIcon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-muted/50 group ${!notification.read ? 'bg-muted/30' : ''}`}
    >
      {/* Category icon */}
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
        <CatIcon className="size-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${!notification.read ? 'text-[#0B2E58] dark:text-white' : 'text-muted-foreground'}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <div className="size-2 rounded-full bg-[#CE1126] shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">{formatTime(notification.date)}</span>
          {notification.priority === 'haute' && (
            <Badge className="text-[9px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 px-1 py-0">
              Urgent
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            onClick={() => onMarkRead(notification.id)}
            aria-label="Marquer comme lu"
          >
            <CheckCheck className="size-3.5 text-muted-foreground" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0"
          onClick={() => onDelete(notification.id)}
          aria-label="Supprimer"
        >
          <Trash2 className="size-3.5 text-muted-foreground hover:text-red-500" />
        </Button>
      </div>
    </motion.div>
  )
}

// ─── NOTIFICATION DROPDOWN ────────────────────────────────────────────────────
export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | NotificationCategory>('all')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
  } = useNotificationsStore()

  const unreadCount = getUnreadCount()

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.category === filter)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Category counts for filter badges
  const categoryCounts = notifications.reduce((acc, n) => {
    if (!n.read) {
      acc[n.category] = (acc[n.category] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative size-9 p-0 rounded-lg hover:bg-muted/80"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} non lues` : ''}`}
      >
        <Bell className="size-4.5 text-muted-foreground" />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-[#CE1126] text-[9px] font-bold text-white min-w-[18px] px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </Button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-12 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-premium-lg overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#0B2E58] dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge className="text-[10px] bg-[#CE1126] text-white border-0">{unreadCount} nouvelles</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    aria-label={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
                  >
                    {soundEnabled ? <Volume2 className="size-3.5 text-muted-foreground" /> : <VolumeX className="size-3.5 text-muted-foreground" />}
                  </Button>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0"
                      onClick={markAllAsRead}
                      aria-label="Tout marquer comme lu"
                    >
                      <CheckCheck className="size-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => setIsOpen(false)}
                    aria-label="Fermer"
                  >
                    <X className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Category filter */}
              <div className="flex gap-1 mt-2 overflow-x-auto pb-0.5">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-6 text-[10px] px-2 ${filter === 'all' ? 'bg-[#0B2E58] dark:bg-[#3B7DD8] text-white' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  Toutes
                </Button>
                {Object.entries(categoryConfig).map(([key, cfg]) => {
                  const count = categoryCounts[key] || 0
                  if (count === 0 && filter !== key) return null
                  return (
                    <Button
                      key={key}
                      variant={filter === key ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-6 text-[10px] px-2 gap-1 ${filter === key ? 'bg-[#0B2E58] dark:bg-[#3B7DD8] text-white' : ''}`}
                      onClick={() => setFilter(key as NotificationCategory)}
                    >
                      {cfg.label}
                      {count > 0 && <span className="size-3.5 rounded-full bg-[#CE1126] text-white text-[8px] flex items-center justify-center">{count}</span>}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Notification list */}
            <ScrollArea className="max-h-80">
              <div className="p-1">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Bell className="size-8 mb-2 opacity-30" />
                      <p className="text-xs">Aucune notification</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onMarkRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <div className="p-2 border-t border-border bg-muted/10">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-[#0B2E58] dark:hover:text-white"
                  onClick={() => {/* Navigate to full notifications page */}}
                >
                  Voir toutes les notifications
                  <ChevronDown className="size-3 ml-1" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationDropdown
