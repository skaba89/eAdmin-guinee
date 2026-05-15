'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Info, AlertTriangle, CheckCircle2, XCircle,
  Clock, CheckCheck, Trash2, Eye
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotificationsStore, type NotificationType, type NotificationCategory } from '@/store/notifications-store'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  demande: 'Demande',
  document: 'Document',
  courrier: 'Courrier',
  systeme: 'Système',
  securite: 'Sécurité',
  workflow: 'Workflow',
  signature: 'Signature',
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then

  if (diffMs < 0) return 'À l\'instant'

  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} jours`
  return new Date(isoDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── TYPE CONFIG ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Info; color: string; bgColor: string; borderColor: string }> = {
  info: { icon: Info, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/20', borderColor: 'border-l-sky-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-l-amber-500' },
  success: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-l-emerald-500' },
  error: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-l-red-500' },
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all')

  const notifications = useNotificationsStore((s) => s.notifications)
  const storeMarkAsRead = useNotificationsStore((s) => s.markAsRead)
  const storeMarkAllAsRead = useNotificationsStore((s) => s.markAllAsRead)
  const storeDeleteNotification = useNotificationsStore((s) => s.deleteNotification)
  const storeDeleteAllRead = useNotificationsStore((s) => s.deleteAllRead)
  const getUnreadCount = useNotificationsStore((s) => s.getUnreadCount)
  const getFiltered = useNotificationsStore((s) => s.getFiltered)

  const unreadCount = getUnreadCount()
  const filtered = getFiltered(typeFilter, 'all', activeTab)

  const typeCounts = {
    info: notifications.filter((n) => n.type === 'info').length,
    warning: notifications.filter((n) => n.type === 'warning').length,
    success: notifications.filter((n) => n.type === 'success').length,
    error: notifications.filter((n) => n.type === 'error').length,
  }

  const readCount = notifications.filter((n) => n.read).length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: notifications.length, icon: Bell, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
          { label: 'Non lues', value: unreadCount, icon: Info, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
          { label: 'Avertissements', value: typeCounts.warning, icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Erreurs', value: typeCounts.error, icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread' | 'read')}>
            <TabsList>
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="unread" className="gap-1">
                Non lues
                {unreadCount > 0 && (
                  <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-sky-500 text-white border-0">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read">Lues</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationType | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Avertissement</SelectItem>
              <SelectItem value="success">Succès</SelectItem>
              <SelectItem value="error">Erreur</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={storeMarkAllAsRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-red-600 hover:text-red-700" onClick={storeDeleteAllRead} disabled={readCount === 0}>
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer lues
          </Button>
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map((notif, i) => {
              const config = TYPE_CONFIG[notif.type]
              const TypeIcon = config.icon
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.03 }}
                  layout
                >
                  <Card className={`border-l-4 ${config.borderColor} ${!notif.read ? 'glass-card' : 'opacity-75'} hover:shadow-md transition-all`}>
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className={`p-2 rounded-lg ${config.bgColor} ${config.color} shrink-0 mt-0.5`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className={`text-sm font-medium ${!notif.read ? 'font-semibold' : ''}`}>{notif.title}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notif.read && (
                              <div className="h-2 w-2 rounded-full bg-brand dark:bg-primary" />
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              {CATEGORY_LABELS[notif.category] ?? notif.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(notif.date)}
                          </span>
                          <div className="flex items-center gap-1">
                            {!notif.read && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => storeMarkAsRead(notif.id)}>
                                <Eye className="h-3 w-3" />
                                Marquer comme lu
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 gap-1" onClick={() => storeDeleteNotification(notif.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Bell className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Aucune notification</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Vous êtes à jour ! Toutes les notifications ont été lues ou filtrées.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
