import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error'
export type NotificationCategory = 'demande' | 'document' | 'courrier' | 'systeme' | 'securite' | 'workflow' | 'signature'

export interface AppNotification {
  id: string
  title: string
  message: string
  type: NotificationType
  category: NotificationCategory
  read: boolean
  date: string
  link?: string         // navigation link
  relatedId?: string    // related entity id
  priority: 'basse' | 'normale' | 'haute'
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const now = new Date()
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString()
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString()
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString()

// ─── DEMO SEED DATA — 15 realistic Guinea administration notifications ──────

const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-demo-001',
    title: 'Demande approuvée',
    message: 'Votre demande de certificat de nationalité a été approuvée par la Mairie de Kaloum. Vous pouvez retirer votre document au guichet.',
    type: 'success',
    category: 'demande',
    read: false,
    date: hoursAgo(2),
    link: '/service-requests',
    relatedId: 'req-demo-003',
    priority: 'normale',
  },
  {
    id: 'notif-demo-002',
    title: 'Courrier présidentiel reçu',
    message: 'Un courrier présidentiel de haute priorité a été reçu par la Présidence de la République. Traitement requis sous 48h.',
    type: 'warning',
    category: 'courrier',
    read: false,
    date: hoursAgo(5),
    link: '/courriers',
    relatedId: 'c-demo-001',
    priority: 'haute',
  },
  {
    id: 'notif-demo-003',
    title: 'Document prêt pour signature',
    message: 'L\'arrêté interministériel N°2026-015 est prêt pour la signature électronique du Ministre de l\'Éducation Nationale.',
    type: 'info',
    category: 'signature',
    read: false,
    date: daysAgo(1),
    link: '/signatures',
    relatedId: 'c-demo-003',
    priority: 'haute',
  },
  {
    id: 'notif-demo-004',
    title: 'Alerte de sécurité',
    message: 'Tentative de connexion non autorisée détectée depuis une adresse IP étrangère. Vérifiez vos paramètres de sécurité.',
    type: 'error',
    category: 'securite',
    read: false,
    date: daysAgo(1),
    link: '/settings',
    priority: 'haute',
  },
  {
    id: 'notif-demo-005',
    title: 'Mise à jour système disponible',
    message: 'La version 2.4.1 de la plateforme eAdmin est disponible. Mise à jour planifiée ce week-end de 02h à 06h.',
    type: 'info',
    category: 'systeme',
    read: true,
    date: daysAgo(2),
    link: '/settings',
    priority: 'normale',
  },
  {
    id: 'notif-demo-006',
    title: 'Workflow validé',
    message: 'Le workflow de traitement des passeports biométriques a été validé par le Directeur de l\'ANIP. Déploiement en cours.',
    type: 'success',
    category: 'workflow',
    read: true,
    date: daysAgo(3),
    link: '/workflow',
    relatedId: 'wf-demo-002',
    priority: 'normale',
  },
  {
    id: 'notif-demo-007',
    title: 'Document vérifié',
    message: 'Le dossier de demande de permis de construire — Centre commercial de Kipé a été vérifié et transmis au service d\'urbanisme.',
    type: 'success',
    category: 'document',
    read: false,
    date: daysAgo(3),
    link: '/ged',
    relatedId: 'c-demo-006',
    priority: 'normale',
  },
  {
    id: 'notif-demo-008',
    title: 'Courrier urgent — Alerte sanitaire',
    message: 'Communication urgente de la Direction Préfectorale de la Santé de N\'Zérékoré concernant une épidémie de fièvre de Lassa.',
    type: 'error',
    category: 'courrier',
    read: false,
    date: daysAgo(1),
    link: '/courriers',
    relatedId: 'c-demo-005',
    priority: 'haute',
  },
  {
    id: 'notif-demo-009',
    title: 'Demande rejetée',
    message: 'La réclamation N°REC-2026-0042 concernant le retard de traitement du dossier de retraite a été rejetée. Pièces manquantes.',
    type: 'error',
    category: 'demande',
    read: true,
    date: daysAgo(8),
    link: '/service-requests',
    relatedId: 'req-demo-010',
    priority: 'normale',
  },
  {
    id: 'notif-demo-010',
    title: 'Signature électronique requise',
    message: 'La convention de coopération Guinée-UE pour le projet Eau pour Tous nécessite votre signature électronique avant le 15 mars 2026.',
    type: 'warning',
    category: 'signature',
    read: false,
    date: daysAgo(4),
    link: '/signatures',
    relatedId: 'c-demo-011',
    priority: 'haute',
  },
  {
    id: 'notif-demo-011',
    title: 'Circulaire diffusée',
    message: 'La circulaire de mise en œuvre du système eAdministration a été diffusée à l\'ensemble des départements ministériels.',
    type: 'info',
    category: 'courrier',
    read: true,
    date: daysAgo(5),
    link: '/courriers',
    relatedId: 'c-demo-010',
    priority: 'normale',
  },
  {
    id: 'notif-demo-012',
    title: 'Maintenance programmée',
    message: 'Une maintenance technique du serveur de signatures électroniques est programmée ce vendredi de 22h à 02h. Service temporairement indisponible.',
    type: 'warning',
    category: 'systeme',
    read: true,
    date: daysAgo(6),
    link: '/settings',
    priority: 'basse',
  },
  {
    id: 'notif-demo-013',
    title: 'Nouveau document uploadé',
    message: 'M. Mamadou Soumah a uploadé le rapport d\'activité trimestriel T1-2026 dans le dossier du Ministère des Finances.',
    type: 'info',
    category: 'document',
    read: true,
    date: daysAgo(7),
    link: '/ged',
    relatedId: 'c-demo-007',
    priority: 'basse',
  },
  {
    id: 'notif-demo-014',
    title: 'Transfert de courrier',
    message: 'Le courrier N°COURR-2026-0008 a été transféré à la Direction de la Planification Minière par le Ministre des Mines.',
    type: 'info',
    category: 'workflow',
    read: false,
    date: daysAgo(1),
    link: '/courriers',
    relatedId: 'c-demo-008',
    priority: 'normale',
  },
  {
    id: 'notif-demo-015',
    title: 'Mot de passe expiré',
    message: 'Votre mot de passe arrivera à expiration dans 5 jours. Veuillez le mettre à jour pour maintenir l\'accès à la plateforme.',
    type: 'warning',
    category: 'securite',
    read: false,
    date: minutesAgo(30),
    link: '/settings',
    priority: 'haute',
  },
]

// ─── STORE INTERFACE ─────────────────────────────────────────────────────────

interface NotificationsStoreState {
  notifications: AppNotification[]

  addNotification: (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  deleteAllRead: () => void
  getUnreadCount: () => number
  getByCategory: (cat: NotificationCategory) => AppNotification[]
  getFiltered: (
    type?: NotificationType | 'all',
    category?: NotificationCategory | 'all',
    readFilter?: 'all' | 'read' | 'unread'
  ) => AppNotification[]

  resetToDemoData: () => void
}

// ─── STORE ───────────────────────────────────────────────────────────────────

export const useNotificationsStore = create<NotificationsStoreState>()(
  persist(
    (set, get) => ({
      notifications: DEMO_NOTIFICATIONS,

      // ── Ajouter une notification ──────────────────────────────────────────

      addNotification: (notifData) => {
        const newNotif: AppNotification = {
          ...notifData,
          id: generateId(),
          date: new Date().toISOString(),
          read: false,
        }
        set((state) => ({
          notifications: [newNotif, ...state.notifications],
        }))
      },

      // ── Marquer comme lu ──────────────────────────────────────────────────

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }))
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }))
      },

      // ── Suppression ───────────────────────────────────────────────────────

      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      deleteAllRead: () => {
        set((state) => ({
          notifications: state.notifications.filter((n) => !n.read),
        }))
      },

      // ── Getters ───────────────────────────────────────────────────────────

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length
      },

      getByCategory: (cat) => {
        return get().notifications.filter((n) => n.category === cat)
      },

      getFiltered: (type = 'all', category = 'all', readFilter = 'all') => {
        return get().notifications.filter((n) => {
          if (type !== 'all' && n.type !== type) return false
          if (category !== 'all' && n.category !== category) return false
          if (readFilter === 'read' && !n.read) return false
          if (readFilter === 'unread' && n.read) return false
          return true
        })
      },

      // ── Reset ─────────────────────────────────────────────────────────────

      resetToDemoData: () => {
        set({ notifications: DEMO_NOTIFICATIONS })
      },
    }),
    {
      name: 'eadmin-notifications-store',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version < 1) {
          return { notifications: DEMO_NOTIFICATIONS }
        }
        return persistedState
      },
    }
  )
)
