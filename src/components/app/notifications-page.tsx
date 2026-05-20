'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Info, AlertTriangle, CheckCircle2, XCircle,
  Clock, CheckCheck, Filter, Trash2, Eye, MoreHorizontal
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

interface Notification {
  id: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  description: string
  timestamp: string
  read: boolean
  category: string
}

const FAKE_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'info', title: 'Nouveau courrier arrivé', description: 'Courrier n°CE-2024-1852 du Ministère des Finances reçu ce matin', timestamp: 'Il y a 5 minutes', read: false, category: 'courriers' },
  { id: '2', type: 'warning', title: 'SLA en approche', description: 'Le courrier CE-2024-1847 approche de la date limite de traitement (2h restantes)', timestamp: 'Il y a 15 minutes', read: false, category: 'courriers' },
  { id: '3', type: 'success', title: 'Workflow approuvé', description: 'La demande de congé de Mme Diallo a été approuvée par la DRH', timestamp: 'Il y a 1 heure', read: false, category: 'workflows' },
  { id: '4', type: 'info', title: 'Signature requise', description: 'Arrêté n°2024-312 en attente de votre visa électronique', timestamp: 'Il y a 2 heures', read: false, category: 'signatures' },
  { id: '5', type: 'error', title: 'Échec de synchronisation', description: 'La connexion au service WhatsApp Business API a échoué', timestamp: 'Il y a 3 heures', read: false, category: 'système' },
  { id: '6', type: 'success', title: 'Document archivé', description: 'Rapport annuel 2024-DGE a été archivé avec succès', timestamp: 'Il y a 4 heures', read: true, category: 'ged' },
  { id: '7', type: 'info', title: 'Nouvel utilisateur inscrit', description: 'Moussa Keïta a rejoint la plateforme avec le rôle Agent', timestamp: 'Il y a 5 heures', read: true, category: 'utilisateurs' },
  { id: '8', type: 'warning', title: 'Espace de stockage', description: 'L\'espace de stockage a atteint 67% de la capacité totale', timestamp: 'Il y a 6 heures', read: true, category: 'système' },
  { id: '9', type: 'success', title: 'Budget approuvé', description: 'Le budget prévisionnel 2025 a été validé par le Directeur Général', timestamp: 'Il y a 8 heures', read: true, category: 'workflows' },
  { id: '10', type: 'info', title: 'Rappel de réunion', description: 'Conseil des ministres prévu demain à 10h00 au Palais du Peuple', timestamp: 'Il y a 10 heures', read: true, category: 'calendrier' },
  { id: '11', type: 'error', title: 'Erreur d\'import', description: 'L\'import du fichier utilisateurs.csv a échoué : format invalide ligne 23', timestamp: 'Hier à 16:30', read: true, category: 'système' },
  { id: '12', type: 'success', title: 'Convention signée', description: 'La convention de partenariat UNDP a été signée électroniquement', timestamp: 'Hier à 14:00', read: true, category: 'signatures' },
  { id: '13', type: 'warning', title: 'Mot de passe expiré', description: 'Le mot de passe de 3 utilisateurs expire dans les 7 prochains jours', timestamp: 'Hier à 09:00', read: true, category: 'sécurité' },
  { id: '14', type: 'info', title: 'Mise à jour système', description: 'La plateforme eAdministration sera mise à jour ce weekend (v2.4.1)', timestamp: 'Hier à 08:00', read: true, category: 'système' },
  { id: '15', type: 'success', title: 'Dossier citoyen livré', description: 'Le certificat de résidence DOSS-2024-4498 est prêt pour retrait', timestamp: 'Avant-hier', read: true, category: 'citoyen' },
]

const TYPE_CONFIG = {
  info: { icon: Info, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/20', borderColor: 'border-l-sky-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-l-amber-500' },
  success: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-l-emerald-500' },
  error: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-l-red-500' },
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState(FAKE_NOTIFICATIONS)
  const [typeFilter, setTypeFilter] = useState<string>('tous')
  const [activeTab, setActiveTab] = useState('toutes')

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const filtered = notifications.filter(n => {
    const matchTab = activeTab === 'toutes' || (activeTab === 'non_lues' && !n.read) || (activeTab === 'lues' && n.read)
    const matchType = typeFilter === 'tous' || n.type === typeFilter
    return matchTab && matchType
  })

  const unreadCount = notifications.filter(n => !n.read).length
  const typeCounts = {
    info: notifications.filter(n => n.type === 'info').length,
    warning: notifications.filter(n => n.type === 'warning').length,
    success: notifications.filter(n => n.type === 'success').length,
    error: notifications.filter(n => n.type === 'error').length,
  }

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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="toutes">Toutes</TabsTrigger>
              <TabsTrigger value="non_lues" className="gap-1">
                Non lues
                {unreadCount > 0 && (
                  <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-sky-500 text-white border-0">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="lues">Lues</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les types</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Avertissement</SelectItem>
              <SelectItem value="success">Succès</SelectItem>
              <SelectItem value="error">Erreur</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
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
                            <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notif.read && (
                              <div className="h-2 w-2 rounded-full bg-brand dark:bg-primary" />
                            )}
                            <Badge variant="outline" className="text-[10px]">{notif.category}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {notif.timestamp}
                          </span>
                          <div className="flex items-center gap-1">
                            {!notif.read && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => markAsRead(notif.id)}>
                                <Eye className="h-3 w-3" />
                                Marquer comme lu
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 gap-1" onClick={() => deleteNotification(notif.id)}>
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
