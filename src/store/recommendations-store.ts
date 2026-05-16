// ═══════════════════════════════════════════════════════════════════════════════
// eAdministration Suite Guinea — Recommendations Store
// AI-driven service recommendations for citizens and agents
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/data/demo-accounts'

export type RecommendationType =
  | 'service_suggestion'    // Suggest a service the user might need
  | 'action_required'       // An action the user should take
  | 'document_reminder'     // Reminder about missing or expiring documents
  | 'process_optimization'  // Suggest a better way to do something
  | 'deadline_alert'        // Approaching deadline
  | 'service_upgrade'       // Suggest upgrading or updating a service

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'urgent'

export type RecommendationAudience = 'citoyen' | 'mairie' | 'agence' | 'ministere' | 'admin' | 'superadmin' | 'all'

export interface Recommendation {
  id: string
  type: RecommendationType
  priority: RecommendationPriority
  audience: RecommendationAudience[]
  title: string
  description: string
  actionLabel?: string       // Label for the CTA button
  actionPage?: string        // Page to navigate to on click
  actionServiceId?: string   // Service ID to pre-fill
  icon?: string              // Icon name (lucide)
  conditions?: string[]      // Conditions for showing (e.g., ['has_pending_request', 'no_cni'])
  category?: string          // Category tag
  serviceName?: string       // Related service name
  serviceId?: string         // Related service ID
  validUntil?: string        // When this recommendation expires
  isRead: boolean
  isDismissed: boolean
  createdAt: string
}

interface RecommendationsState {
  recommendations: Recommendation[]
  addRecommendation: (rec: Omit<Recommendation, 'id' | 'isRead' | 'isDismissed' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  dismiss: (id: string) => void
  dismissAll: () => void
  getRecommendationsForUser: (role: UserRole, email: string, conditions?: string[]) => Recommendation[]
  getUnreadCount: (role: UserRole) => number
  getActiveRecommendations: (role: UserRole, email: string) => Recommendation[]
  generatePersonalizedRecommendations: (role: UserRole, email: string, existingRequestServiceIds: string[]) => void
}

// ─── RECOMMENDATION TEMPLATES BY ROLE ──────────────────────────────────────────

const CITIZEN_RECOMMENDATIONS: Omit<Recommendation, 'id' | 'isRead' | 'isDismissed' | 'createdAt'>[] = [
  {
    type: 'service_suggestion',
    priority: 'high',
    audience: ['citoyen'],
    title: 'Obtenez votre Carte d\'Identité Nationale Biométrique',
    description: 'La CNI biométrique est le document d\'identité principal en Guinée. Elle est requise pour la plupart des démarches administratives, l\'ouverture de compte bancaire et les voyaux. Si vous n\'en avez pas encore, nous vous recommandons vivement d\'en faire la demande.',
    actionLabel: 'Demander ma CNI',
    actionPage: 'citizen-portal',
    actionServiceId: 'id-1',
    icon: 'CreditCard',
    category: 'identification',
    serviceName: "Carte d'identité nationale biométrique",
    serviceId: 'id-1',
  },
  {
    type: 'service_suggestion',
    priority: 'medium',
    audience: ['citoyen'],
    title: 'Certificat de résidence : un justificatif essentiel',
    description: 'Le certificat de résidence est fréquemment demandé pour les inscriptions scolaires, les démarches bancaires et les demandes d\'emploi. Si vous avez récemment déménagé ou si votre certificat a plus de 3 mois, pensez à le renouveler dès maintenant.',
    actionLabel: 'Demander un certificat',
    actionPage: 'citizen-portal',
    actionServiceId: 'r-1',
    icon: 'Home',
    category: 'residence',
    serviceName: 'Certificat de résidence',
    serviceId: 'r-1',
  },
  {
    type: 'service_suggestion',
    priority: 'medium',
    audience: ['citoyen'],
    title: 'Casier judiciaire : souvent requis pour l\'emploi',
    description: 'De nombreux employeurs au Guinea exigent un extrait de casier judiciaire. Si vous êtes en recherche d\'emploi ou que vous prévoyez de postuler, anticiper cette démarche vous fera gagner un temps précieux. Le casier judiciaire est délivré par le Ministère de la Justice.',
    actionLabel: 'Demander mon casier',
    actionPage: 'citizen-portal',
    actionServiceId: 'j-1',
    icon: 'Shield',
    category: 'justice',
    serviceName: 'Casier judiciaire',
    serviceId: 'j-1',
  },
  {
    type: 'service_suggestion',
    priority: 'low',
    audience: ['citoyen'],
    title: 'Certificat de vaccination pour vos voyages',
    description: 'Si vous prévoyez de voyager à l\'international, un certificat de vaccination est obligatoire pour entrer dans de nombreux pays. Vérifiez que votre carnet est à jour et demandez votre certificat officiel avant votre départ.',
    actionLabel: 'Demander un certificat',
    actionPage: 'citizen-portal',
    actionServiceId: 's-1',
    icon: 'Syringe',
    category: 'sante',
    serviceName: 'Certificat de vaccination',
    serviceId: 's-1',
  },
  {
    type: 'service_suggestion',
    priority: 'medium',
    audience: ['citoyen'],
    title: 'Créez votre entreprise en ligne',
    description: 'L\'APIP facilite la création d\'entreprise en Guinée. SARL, SASU, ou autre forme juridique, la procédure est simplifiée et se fait en ligne. Bénéficiez d\'un accompagnement pour enregistrer votre entreprise et obtenir votre RCCM rapidement.',
    actionLabel: 'Enregistrer mon entreprise',
    actionPage: 'citizen-portal',
    actionServiceId: 'e-1',
    icon: 'Building2',
    category: 'entreprise',
    serviceName: 'Enregistrement entreprise (APIP)',
    serviceId: 'e-1',
  },
  {
    type: 'document_reminder',
    priority: 'high',
    audience: ['citoyen'],
    title: 'Vérifiez la validité de vos documents',
    description: 'Certains documents administratifs ont une durée de validité limitée. Vérifiez que votre certificat de résidence, votre certificat de vaccination et autres documents ne sont pas expirés. Un document expiré peut retarder vos démarches.',
    actionLabel: 'Voir mes demandes',
    actionPage: 'citizen-portal',
    icon: 'FileCheck',
    category: 'general',
  },
  {
    type: 'process_optimization',
    priority: 'low',
    audience: ['citoyen'],
    title: 'Préparez vos pièces justificatives à l\'avance',
    description: 'La majorité des demandes rejetées le sont en raison de pièces justificatives manquantes ou non conformes. Avant de soumettre une demande, assurez-vous d\'avoir tous les documents requis au bon format (PDF, photos aux normes ICAO).',
    actionLabel: 'Voir les services',
    actionPage: 'citizen-portal',
    icon: 'ListChecks',
    category: 'general',
  },
  {
    type: 'service_suggestion',
    priority: 'medium',
    audience: ['citoyen'],
    title: 'Passeport biométrique : planifiez à l\'avance',
    description: 'La demande de passeport biométrique nécessite plusieurs documents (CNI, extrait d\'acte de naissance, photos). Le traitement prend environ 2 semaines. Si vous prévoyez un voyage, anticipez votre demande pour éviter tout stress de dernière minute.',
    actionLabel: 'Demander un passeport',
    actionPage: 'citizen-portal',
    actionServiceId: 'id-2',
    icon: 'Plane',
    category: 'identification',
    serviceName: 'Passeport biométrique',
    serviceId: 'id-2',
  },
  {
    type: 'service_suggestion',
    priority: 'low',
    audience: ['citoyen'],
    title: 'Attestation de scolarité pour les étudiants',
    description: 'Si vous êtes étudiant, l\'attestation de scolarité est souvent requise pour les bourses, les inscriptions dans d\'autres établissements ou les demandes de logement. Demandez-la en ligne en quelques clics.',
    actionLabel: 'Demander une attestation',
    actionPage: 'citizen-portal',
    actionServiceId: 'ed-1',
    icon: 'GraduationCap',
    category: 'education',
    serviceName: 'Attestation de scolarité',
    serviceId: 'ed-1',
  },
  {
    type: 'service_suggestion',
    priority: 'medium',
    audience: ['citoyen'],
    title: 'Carte d\'assurance maladie : protégez-vous',
    description: 'La carte d\'assurance maladie vous couvre en cas de besoin médical. Si vous êtes salarié, demandeur d\'emploi ou travailleur indépendant, vous pouvez bénéficier de la couverture maladie. La demande se fait en ligne.',
    actionLabel: 'Demander ma carte',
    actionPage: 'citizen-portal',
    actionServiceId: 'so-1',
    icon: 'Heart',
    category: 'social',
    serviceName: "Carte d'assurance maladie",
    serviceId: 'so-1',
  },
]

const AGENT_RECOMMENDATIONS: Omit<Recommendation, 'id' | 'isRead' | 'isDismissed' | 'createdAt'>[] = [
  {
    type: 'action_required',
    priority: 'urgent',
    audience: ['mairie', 'agence'],
    title: 'Demandes en attente de traitement',
    description: 'Vous avez des demandes en attente dans votre file de traitement. Les délais réglementaires exigent un traitement sous 72 heures pour les demandes standards et 24 heures pour les demandes urgentes. Priorisez les demandes les plus anciennes.',
    actionLabel: 'Traiter les demandes',
    actionPage: 'service-requests',
    icon: 'Clock',
    category: 'processing',
  },
  {
    type: 'process_optimization',
    priority: 'medium',
    audience: ['mairie', 'agence'],
    title: 'Utilisez l\'agent IA pour accélérer le traitement',
    description: 'L\'agent IA peut pré-valider automatiquement les dossiers complets et détecter les pièces manquantes. Utilisez-le pour les demandes simples et concentrez-vous sur les cas complexes nécessitant votre expertise humaine.',
    actionLabel: 'Configurer l\'agent IA',
    actionPage: 'ai-agent',
    icon: 'Bot',
    category: 'ai',
  },
  {
    type: 'action_required',
    priority: 'high',
    audience: ['mairie', 'agence'],
    title: 'Demandes nécessitant des pièces complémentaires',
    description: 'Certaines demandes sont en attente de pièces complémentaires depuis plus de 48 heures. Les citoyens n\'ont pas encore répondu. Relancez-les pour éviter que leurs demandes soient archivées.',
    actionLabel: 'Voir les demandes',
    actionPage: 'service-requests',
    icon: 'FileQuestion',
    category: 'processing',
  },
  {
    type: 'service_upgrade',
    priority: 'low',
    audience: ['mairie', 'agence'],
    title: 'Améliorez vos statistiques de traitement',
    description: 'Votre taux de traitement dans les délais est bon, mais pourrait être amélioré. L\'utilisation de l\'agent IA pour les pré-validations et la signature électronique pour les approbations peut réduire le temps de traitement de 40%.',
    actionLabel: 'Voir les analytics',
    actionPage: 'analytics',
    icon: 'TrendingUp',
    category: 'optimization',
  },
]

const SUPERVISION_RECOMMENDATIONS: Omit<Recommendation, 'id' | 'isRead' | 'isDismissed' | 'createdAt'>[] = [
  {
    type: 'action_required',
    priority: 'high',
    audience: ['ministere', 'admin'],
    title: 'Tableau de bord de supervision disponible',
    description: 'Consultez le tableau de bord pour avoir une vue d\'ensemble des performances de chaque service. Identifiez les goulots d\'étranglement, les services en retard et les taux de satisfaction citoyen.',
    actionLabel: 'Voir le tableau de bord',
    actionPage: 'dashboard',
    icon: 'LayoutDashboard',
    category: 'supervision',
  },
  {
    type: 'process_optimization',
    priority: 'medium',
    audience: ['ministere', 'admin'],
    title: 'Optimisez la répartition des habilitations',
    description: 'Certains services ont des files d\'attente plus longues que d\'autres. En ajustant les habilitations des agents, vous pouvez mieux répartir la charge de travail et réduire les délais de traitement pour les citoyens.',
    actionLabel: 'Gérer les habilitations',
    actionPage: 'admin',
    icon: 'Key',
    category: 'habilitation',
  },
  {
    type: 'deadline_alert',
    priority: 'medium',
    audience: ['ministere'],
    title: 'Rapport mensuel à valider',
    description: 'Le rapport mensuel d\'activité est disponible pour validation. Il inclut les statistiques de traitement, les délais moyens, les taux de rejet et les recommandations d\'amélioration pour chaque service.',
    actionLabel: 'Voir les rapports',
    actionPage: 'analytics',
    icon: 'FileBarChart',
    category: 'reporting',
  },
  {
    type: 'service_upgrade',
    priority: 'low',
    audience: ['admin', 'superadmin'],
    title: 'Mettez à jour les habilitations des agents',
    description: 'Les habilitations des agents déterminent quels services ils peuvent traiter. Assurez-vous que chaque agent a les habilitations adéquates pour son poste. Un agent sur-habilité est un risque de sécurité, un agent sous-habilité est un goulot d\'étranglement.',
    actionLabel: 'Configurer les habilitations',
    actionPage: 'admin',
    icon: 'UserCog',
    category: 'habilitation',
  },
]

let nextRecId = 0

export const useRecommendationsStore = create<RecommendationsState>()(
  persist(
    (set, get) => ({
      recommendations: [],

      addRecommendation: (rec) => {
        const newRec: Recommendation = {
          ...rec,
          id: `rec-${++nextRecId}-${Date.now()}`,
          isRead: false,
          isDismissed: false,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          recommendations: [newRec, ...state.recommendations],
        }))
      },

      markAsRead: (id) => {
        set((state) => ({
          recommendations: state.recommendations.map(r =>
            r.id === id ? { ...r, isRead: true } : r
          ),
        }))
      },

      dismiss: (id) => {
        set((state) => ({
          recommendations: state.recommendations.map(r =>
            r.id === id ? { ...r, isDismissed: true } : r
          ),
        }))
      },

      dismissAll: () => {
        set((state) => ({
          recommendations: state.recommendations.map(r => ({ ...r, isDismissed: true })),
        }))
      },

      getRecommendationsForUser: (role, email, conditions) => {
        const all = get().recommendations
        return all.filter(r => {
          if (r.isDismissed) return false
          if (!r.audience.includes(role) && !r.audience.includes('all')) return false
          if (r.validUntil && new Date(r.validUntil) < new Date()) return false
          if (r.conditions && conditions && !r.conditions.every(c => conditions.includes(c))) return false
          return true
        })
      },

      getUnreadCount: (role) => {
        return get().recommendations.filter(r =>
          !r.isRead && !r.isDismissed &&
          (r.audience.includes(role) || r.audience.includes('all'))
        ).length
      },

      getActiveRecommendations: (role, email) => {
        return get().recommendations.filter(r => {
          if (r.isDismissed) return false
          if (!r.audience.includes(role) && !r.audience.includes('all')) return false
          if (r.validUntil && new Date(r.validUntil) < new Date()) return false
          return true
        }).slice(0, 10)
      },

      generatePersonalizedRecommendations: (role, email, existingRequestServiceIds) => {
        const now = new Date()

        // Select templates based on role
        const templates = role === 'citoyen'
          ? CITIZEN_RECOMMENDATIONS
          : (role === 'mairie' || role === 'agence')
            ? AGENT_RECOMMENDATIONS
            : SUPERVISION_RECOMMENDATIONS

        // For citizens, filter out services they already have active requests for
        const filteredTemplates = role === 'citoyen'
          ? templates.filter(t => !t.serviceId || !existingRequestServiceIds.includes(t.serviceId))
          : templates

        // Check which recommendations already exist
        const existingIds = new Set(
          get().recommendations.filter(r => !r.isDismissed).map(r => r.title)
        )

        const newRecs: Recommendation[] = filteredTemplates
          .filter(t => !existingIds.has(t.title))
          .map((t, idx) => ({
            ...t,
            id: `rec-auto-${role}-${idx}-${Date.now()}`,
            isRead: false,
            isDismissed: false,
            createdAt: now.toISOString(),
          }))

        if (newRecs.length > 0) {
          set((state) => ({
            recommendations: [...newRecs, ...state.recommendations],
          }))
        }
      },
    }),
    {
      name: 'eadmin-recommendations',
      version: 1,
      partialize: (state) => ({
        recommendations: state.recommendations.slice(0, 50), // Limit stored recs
      }),
    }
  )
)
