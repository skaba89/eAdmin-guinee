import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type CourrierType = 'presidentiel' | 'primature' | 'interministeriel' | 'emanation' | 'urgent' | 'ordinaire'
export type CourrierStatus = 'en_attente' | 'en_cours' | 'vise' | 'traite' | 'archive' | 'rejete'
export type CourrierPriority = 'basse' | 'normale' | 'haute' | 'urgente'
export type CourrierDirection = 'entrant' | 'sortant' | 'interne'

export interface CourrierAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  fileData?: string  // base64
}

export interface CourrierNote {
  id: string
  text: string
  author: string
  authorRole: string
  date: string
  type: 'note' | 'visa' | 'transfert' | 'rejet'
}

export interface Courrier {
  id: string
  reference: string
  object: string
  type: CourrierType
  status: CourrierStatus
  priority: CourrierPriority
  direction: CourrierDirection
  from: string
  to: string
  date: string
  deadline?: string
  notes: CourrierNote[]
  attachments: CourrierAttachment[]
  assignedTo?: string
  assignedToRole?: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const now = new Date()
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString()
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString()

let referenceCounter = 12 // Start after demo data

function generateReference(): string {
  referenceCounter++
  return `COURR-2026-${String(referenceCounter).padStart(4, '0')}`
}

function generateId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── DEMO SEED DATA — 12 realistic Guinean administration courriers ──────────

const DEMO_COURRIERS: Courrier[] = [
  {
    id: 'c-demo-001',
    reference: 'COURR-2026-0001',
    object: 'Demande d\'audience auprès du Président de la République',
    type: 'presidentiel',
    status: 'en_cours',
    priority: 'urgente',
    direction: 'entrant',
    from: 'Ministère des Affaires Étrangères',
    to: 'Présidence de la République',
    date: daysAgo(2),
    deadline: daysAgo(-5),
    notes: [
      {
        id: 'n-001',
        text: 'Courrier reçu et enregistré au secrétariat général de la Présidence.',
        author: 'Mme Aminata Diallo',
        authorRole: 'Secrétaire',
        date: daysAgo(2),
        type: 'note',
      },
    ],
    attachments: [],
    assignedTo: 'M. Ibrahima Keita',
    assignedToRole: 'Directeur de Cabinet',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: 'c-demo-002',
    reference: 'COURR-2026-0002',
    object: 'Note de service — Réorganisation des directions ministérielles',
    type: 'primature',
    status: 'vise',
    priority: 'haute',
    direction: 'sortant',
    from: 'Primature — Services Généraux',
    to: 'Tous les Ministères',
    date: daysAgo(5),
    deadline: daysAgo(-10),
    notes: [
      {
        id: 'n-002',
        text: 'Note visée par le Chef du Cabinet du Premier Ministre.',
        author: 'M. Mamadou Bah',
        authorRole: 'Chef de Cabinet',
        date: daysAgo(4),
        type: 'visa',
      },
    ],
    attachments: [],
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
  },
  {
    id: 'c-demo-003',
    reference: 'COURR-2026-0003',
    object: 'Arrêté interministériel — Programme national d\'alphabétisation 2026',
    type: 'interministeriel',
    status: 'en_attente',
    priority: 'normale',
    direction: 'interne',
    from: 'Ministère de l\'Éducation Nationale',
    to: 'Ministère de l\'Action Sociale',
    date: daysAgo(7),
    notes: [
      {
        id: 'n-003',
        text: 'Projet d\'arrêté transmis pour concertation interministérielle.',
        author: 'Mme Fatoumata Camara',
        authorRole: 'Directrice de l\'Alphabétisation',
        date: daysAgo(7),
        type: 'note',
      },
    ],
    attachments: [],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: 'c-demo-004',
    reference: 'COURR-2026-0004',
    object: 'Émanation du Conseil des Ministres — Politique de décentralisation',
    type: 'emanation',
    status: 'traite',
    priority: 'haute',
    direction: 'sortant',
    from: 'Secrétariat Général du Gouvernement',
    to: 'Ministère de l\'Administration du Territoire',
    date: daysAgo(15),
    deadline: daysAgo(-3),
    notes: [
      {
        id: 'n-004',
        text: 'Émanation transmise au MATD pour mise en œuvre.',
        author: 'M. Sékou Touré',
        authorRole: 'Secrétaire Général',
        date: daysAgo(14),
        type: 'note',
      },
      {
        id: 'n-005',
        text: 'Mesures d\'application élaborées et transmises aux collectivités.',
        author: 'M. Lamine Condé',
        authorRole: 'Directeur de la Décentralisation',
        date: daysAgo(5),
        type: 'note',
      },
    ],
    attachments: [],
    assignedTo: 'M. Lamine Condé',
    assignedToRole: 'Directeur de la Décentralisation',
    createdAt: daysAgo(15),
    updatedAt: daysAgo(5),
  },
  {
    id: 'c-demo-005',
    reference: 'COURR-2026-0005',
    object: 'Communication urgente — Épidémie de fièvre de Lassa dans la préfecture de N\'Zérékoré',
    type: 'urgent',
    status: 'en_cours',
    priority: 'urgente',
    direction: 'entrant',
    from: 'Direction Préfectorale de la Santé — N\'Zérékoré',
    to: 'Ministère de la Santé et de l\'Hygiène Publique',
    date: daysAgo(1),
    deadline: daysAgo(-2),
    notes: [
      {
        id: 'n-006',
        text: 'Alerte reçue. Cellule de crise activée au niveau central.',
        author: 'Dr Aïssatou Doubé',
        authorRole: 'Directrice Nationale de la Santé',
        date: daysAgo(1),
        type: 'note',
      },
    ],
    attachments: [],
    assignedTo: 'Dr Aïssatou Doubé',
    assignedToRole: 'Directrice Nationale de la Santé',
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(6),
  },
  {
    id: 'c-demo-006',
    reference: 'COURR-2026-0006',
    object: 'Demande d\'autorisation de construction — Centre commercial de Kipé',
    type: 'ordinaire',
    status: 'en_attente',
    priority: 'normale',
    direction: 'entrant',
    from: 'Société Guinea Business Corp.',
    to: 'Direction de l\'Urbanisme — Commune de Ratoma',
    date: daysAgo(10),
    deadline: daysAgo(20),
    notes: [],
    attachments: [],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
  {
    id: 'c-demo-007',
    reference: 'COURR-2026-0007',
    object: 'Rapport d\'activité trimestriel — 1er trimestre 2026',
    type: 'ordinaire',
    status: 'traite',
    priority: 'basse',
    direction: 'interne',
    from: 'Direction des Ressources Humaines',
    to: 'Secrétariat Général — Ministère des Finances',
    date: daysAgo(20),
    notes: [
      {
        id: 'n-007',
        text: 'Rapport examiné et classé sans observation.',
        author: 'M. Abdoulaye Sow',
        authorRole: 'Secrétaire Général',
        date: daysAgo(18),
        type: 'note',
      },
    ],
    attachments: [],
    createdAt: daysAgo(20),
    updatedAt: daysAgo(18),
  },
  {
    id: 'c-demo-008',
    reference: 'COURR-2026-0008',
    object: 'Instruction présidentielle — Réforme du secteur minier',
    type: 'presidentiel',
    status: 'en_cours',
    priority: 'urgente',
    direction: 'sortant',
    from: 'Présidence de la République',
    to: 'Ministère des Mines et de la Géologie',
    date: daysAgo(3),
    deadline: daysAgo(-15),
    notes: [
      {
        id: 'n-008',
        text: 'Instruction reçue. Groupe de travail constitué pour la réforme.',
        author: 'M. Alpha Camara',
        authorRole: 'Ministre des Mines',
        date: daysAgo(2),
        type: 'note',
      },
      {
        id: 'n-009',
        text: 'Transféré à la Direction de la Planification Minière pour élaboration du projet.',
        author: 'M. Alpha Camara',
        authorRole: 'Ministre des Mines',
        date: daysAgo(1),
        type: 'transfert',
      },
    ],
    attachments: [],
    assignedTo: 'Mme Kadiatou Keita',
    assignedToRole: 'Directrice de la Planification Minière',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    id: 'c-demo-009',
    reference: 'COURR-2026-0009',
    object: 'Réclamation — Retard de traitement du dossier de retraite',
    type: 'ordinaire',
    status: 'rejete',
    priority: 'normale',
    direction: 'entrant',
    from: 'M. Ousmane Soumah — Ancien fonctionnaire',
    to: 'Caisse Nationale de Sécurité Sociale (CNSS)',
    date: daysAgo(12),
    notes: [
      {
        id: 'n-010',
        text: 'Dossier incomplet. Pièces justificatives manquantes : dernier bulletin de salaire et attestation d\'employeur.',
        author: 'Mme Mariama Touré',
        authorRole: 'Agent CNSS',
        date: daysAgo(10),
        type: 'note',
      },
      {
        id: 'n-011',
        text: 'Réclamation rejetée. Le requérant est invité à constituer un dossier complet.',
        author: 'M. Mamadou Diallo',
        authorRole: 'Directeur CNSS',
        date: daysAgo(8),
        type: 'rejet',
      },
    ],
    attachments: [],
    createdAt: daysAgo(12),
    updatedAt: daysAgo(8),
  },
  {
    id: 'c-demo-010',
    reference: 'COURR-2026-0010',
    object: 'Circulaire — Mise en œuvre du système eAdmin dans les administrations publiques',
    type: 'primature',
    status: 'en_cours',
    priority: 'haute',
    direction: 'sortant',
    from: 'Primature — Ministère de la Modernisation de l\'Administration',
    to: 'Tous les Départements Ministériels',
    date: daysAgo(6),
    deadline: daysAgo(-30),
    notes: [
      {
        id: 'n-012',
        text: 'Circulaire diffusée à l\'ensemble des départements ministériels. Suivi du déploiement en cours.',
        author: 'Mme Hawa Soumah',
        authorRole: 'Directrice de la Modernisation Administrative',
        date: daysAgo(5),
        type: 'note',
      },
    ],
    attachments: [],
    assignedTo: 'Mme Hawa Soumah',
    assignedToRole: 'Directrice de la Modernisation Administrative',
    createdAt: daysAgo(6),
    updatedAt: daysAgo(3),
  },
  {
    id: 'c-demo-011',
    reference: 'COURR-2026-0011',
    object: 'Convention de coopération — Partenariat Guinée-Union Européenne pour le projet Eau pour Tous',
    type: 'interministeriel',
    status: 'vise',
    priority: 'haute',
    direction: 'entrant',
    from: 'Délégation de l\'Union Européenne en Guinée',
    to: 'Ministère de l\'Eau et de l\'Assainissement',
    date: daysAgo(8),
    deadline: daysAgo(-20),
    notes: [
      {
        id: 'n-013',
        text: 'Convention visée par le Ministère des Finances (engagement budgétaire).',
        author: 'M. Thierno Sow',
        authorRole: 'Directeur du Budget',
        date: daysAgo(6),
        type: 'visa',
      },
      {
        id: 'n-014',
        text: 'Visa du Ministère de la Coopération obtenu. Envoi pour signature ministérielle.',
        author: 'Mme Aissatou Sylla',
        authorRole: 'Chef de Division Coopération',
        date: daysAgo(4),
        type: 'visa',
      },
    ],
    attachments: [],
    assignedTo: 'Mme Aissatou Sylla',
    assignedToRole: 'Chef de Division Coopération',
    createdAt: daysAgo(8),
    updatedAt: daysAgo(4),
  },
  {
    id: 'c-demo-012',
    reference: 'COURR-2026-0012',
    object: 'Archivage — Dossiers de la commission électorale nationale indépendante (CENI) — Législature 2020-2025',
    type: 'ordinaire',
    status: 'archive',
    priority: 'basse',
    direction: 'interne',
    from: 'Commission Électorale Nationale Indépendante',
    to: 'Archives Nationales de Guinée',
    date: daysAgo(30),
    notes: [
      {
        id: 'n-015',
        text: 'Dossiers transférés aux Archives Nationales conformément au délai réglementaire de conservation.',
        author: 'M. Ibrahima Bah',
        authorRole: 'Archiviste Principal',
        date: daysAgo(28),
        type: 'note',
      },
    ],
    attachments: [],
    archivedAt: daysAgo(28),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(28),
  },
]

// ─── STORE INTERFACE ─────────────────────────────────────────────────────────

interface CourriersStoreState {
  courriers: Courrier[]
  searchQuery: string
  filterType: CourrierType | 'all'
  filterStatus: CourrierStatus | 'all'
  filterPriority: CourrierPriority | 'all'
  filterDirection: CourrierDirection | 'all'

  addCourrier: (courrier: Omit<Courrier, 'id' | 'reference' | 'createdAt' | 'updatedAt' | 'notes' | 'attachments'>) => Courrier
  updateCourrier: (id: string, updates: Partial<Courrier>) => void
  deleteCourrier: (id: string) => void
  addNote: (courrierId: string, note: Omit<CourrierNote, 'id' | 'date'>) => void
  addAttachment: (courrierId: string, attachment: CourrierAttachment) => void
  removeAttachment: (courrierId: string, attachmentId: string) => void
  visaCourrier: (id: string, author: string, authorRole: string, note?: string) => void
  transferCourrier: (id: string, to: string, author: string, authorRole: string, note?: string) => void
  rejectCourrier: (id: string, author: string, authorRole: string, reason: string) => void
  archiveCourrier: (id: string) => void
  treatCourrier: (id: string) => void
  assignCourrier: (id: string, assignedTo: string, assignedToRole: string) => void

  setSearchQuery: (q: string) => void
  setFilterType: (t: CourrierType | 'all') => void
  setFilterStatus: (s: CourrierStatus | 'all') => void
  setFilterPriority: (p: CourrierPriority | 'all') => void
  setFilterDirection: (d: CourrierDirection | 'all') => void

  getFilteredCourriers: () => Courrier[]
  getCourrierById: (id: string) => Courrier | undefined
  getStats: () => {
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    urgentCount: number
    expiringCount: number
  }

  resetToDemoData: () => void
}

// ─── STORE ───────────────────────────────────────────────────────────────────

export const useCourriersStore = create<CourriersStoreState>()(
  persist(
    (set, get) => ({
      courriers: DEMO_COURRIERS,
      searchQuery: '',
      filterType: 'all',
      filterStatus: 'all',
      filterPriority: 'all',
      filterDirection: 'all',

      // ── CRUD ──────────────────────────────────────────────────────────────

      addCourrier: (courrierData) => {
        const id = generateId()
        const reference = generateReference()
        const nowIso = new Date().toISOString()

        const newCourrier: Courrier = {
          ...courrierData,
          id,
          reference,
          notes: [],
          attachments: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        }

        set((state) => ({ courriers: [newCourrier, ...state.courriers] }))
        return newCourrier
      },

      updateCourrier: (id, updates) => {
        set((state) => ({
          courriers: state.courriers.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          ),
        }))
      },

      deleteCourrier: (id) => {
        set((state) => ({
          courriers: state.courriers.filter((c) => c.id !== id),
        }))
      },

      // ── Notes & Attachments ───────────────────────────────────────────────

      addNote: (courrierId, note) => {
        const noteId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        set((state) => ({
          courriers: state.courriers.map((c) =>
            c.id === courrierId
              ? {
                  ...c,
                  notes: [
                    ...c.notes,
                    { ...note, id: noteId, date: new Date().toISOString() },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }))
      },

      addAttachment: (courrierId, attachment) => {
        set((state) => ({
          courriers: state.courriers.map((c) =>
            c.id === courrierId
              ? {
                  ...c,
                  attachments: [...c.attachments, attachment],
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }))
      },

      removeAttachment: (courrierId, attachmentId) => {
        set((state) => ({
          courriers: state.courriers.map((c) =>
            c.id === courrierId
              ? {
                  ...c,
                  attachments: c.attachments.filter((a) => a.id !== attachmentId),
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }))
      },

      // ── Workflow Actions ──────────────────────────────────────────────────

      visaCourrier: (id, author, authorRole, note) => {
        const noteId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const nowIso = new Date().toISOString()

        set((state) => ({
          courriers: state.courriers.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'vise' as CourrierStatus,
                  notes: [
                    ...c.notes,
                    {
                      id: noteId,
                      text: note || `Courrier visé par ${author} (${authorRole})`,
                      author,
                      authorRole,
                      date: nowIso,
                      type: 'visa' as const,
                    },
                  ],
                  updatedAt: nowIso,
                }
              : c
          ),
        }))
      },

      transferCourrier: (id, to, author, authorRole, note) => {
        const noteId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const nowIso = new Date().toISOString()

        set((state) => ({
          courriers: state.courriers.map((c) =>
            c.id === id
              ? {
                  ...c,
                  to,
                  status: 'en_cours' as CourrierStatus,
                  notes: [
                    ...c.notes,
                    {
                      id: noteId,
                      text: note || `Courrier transféré à ${to} par ${author} (${authorRole})`,
                      author,
                      authorRole,
                      date: nowIso,
                      type: 'transfert' as const,
                    },
                  ],
                  updatedAt: nowIso,
                }
              : c
          ),
        }))
      },

      rejectCourrier: (id, author, authorRole, reason) => {
        const noteId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const nowIso = new Date().toISOString()

        set((state) => ({
          courriers: state.courriers.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'rejete' as CourrierStatus,
                  notes: [
                    ...c.notes,
                    {
                      id: noteId,
                      text: reason,
                      author,
                      authorRole,
                      date: nowIso,
                      type: 'rejet' as const,
                    },
                  ],
                  updatedAt: nowIso,
                }
              : c
          ),
        }))
      },

      archiveCourrier: (id) => {
        const nowIso = new Date().toISOString()
        set((state) => ({
          courriers: state.courriers.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'archive' as CourrierStatus,
                  archivedAt: nowIso,
                  updatedAt: nowIso,
                }
              : c
          ),
        }))
      },

      treatCourrier: (id) => {
        const nowIso = new Date().toISOString()
        set((state) => ({
          courriers: state.courriers.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'traite' as CourrierStatus,
                  updatedAt: nowIso,
                }
              : c
          ),
        }))
      },

      assignCourrier: (id, assignedTo, assignedToRole) => {
        set((state) => ({
          courriers: state.courriers.map((c) =>
            c.id === id
              ? {
                  ...c,
                  assignedTo,
                  assignedToRole,
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }))
      },

      // ── Filters ───────────────────────────────────────────────────────────

      setSearchQuery: (q) => set({ searchQuery: q }),
      setFilterType: (t) => set({ filterType: t }),
      setFilterStatus: (s) => set({ filterStatus: s }),
      setFilterPriority: (p) => set({ filterPriority: p }),
      setFilterDirection: (d) => set({ filterDirection: d }),

      // ── Getters ───────────────────────────────────────────────────────────

      getFilteredCourriers: () => {
        const { courriers, searchQuery, filterType, filterStatus, filterPriority, filterDirection } = get()

        return courriers.filter((c) => {
          // Type filter
          if (filterType !== 'all' && c.type !== filterType) return false
          // Status filter
          if (filterStatus !== 'all' && c.status !== filterStatus) return false
          // Priority filter
          if (filterPriority !== 'all' && c.priority !== filterPriority) return false
          // Direction filter
          if (filterDirection !== 'all' && c.direction !== filterDirection) return false
          // Search query
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim()
            const matchesSearch =
              c.reference.toLowerCase().includes(q) ||
              c.object.toLowerCase().includes(q) ||
              c.from.toLowerCase().includes(q) ||
              c.to.toLowerCase().includes(q) ||
              (c.assignedTo && c.assignedTo.toLowerCase().includes(q))
            if (!matchesSearch) return false
          }
          return true
        })
      },

      getCourrierById: (id) => get().courriers.find((c) => c.id === id),

      getStats: () => {
        const { courriers } = get()
        const byType: Record<string, number> = {}
        const byStatus: Record<string, number> = {}
        let urgentCount = 0
        let expiringCount = 0

        const nowMs = Date.now()
        const threeDaysMs = 3 * 86400000

        courriers.forEach((c) => {
          // By type
          byType[c.type] = (byType[c.type] || 0) + 1
          // By status
          byStatus[c.status] = (byStatus[c.status] || 0) + 1
          // Urgent count
          if (c.priority === 'urgente') urgentCount++
          // Expiring count (deadline within 3 days and not yet treated/archived)
          if (
            c.deadline &&
            c.status !== 'traite' &&
            c.status !== 'archive' &&
            c.status !== 'rejete'
          ) {
            const deadlineMs = new Date(c.deadline).getTime()
            if (deadlineMs - nowMs <= threeDaysMs && deadlineMs - nowMs > 0) {
              expiringCount++
            }
          }
        })

        return { total: courriers.length, byType, byStatus, urgentCount, expiringCount }
      },

      // ── Reset ─────────────────────────────────────────────────────────────

      resetToDemoData: () => {
        referenceCounter = 12
        set({
          courriers: DEMO_COURRIERS,
          searchQuery: '',
          filterType: 'all',
          filterStatus: 'all',
          filterPriority: 'all',
          filterDirection: 'all',
        })
      },
    }),
    {
      name: 'eadmin-courriers-store',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version < 1) {
          // Reset to demo data on any pre-v1 structure
          return {
            courriers: DEMO_COURRIERS,
            searchQuery: '',
            filterType: 'all',
            filterStatus: 'all',
            filterPriority: 'all',
            filterDirection: 'all',
          }
        }
        return persistedState
      },
    }
  )
)
