import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RequestStatus = 'soumise' | 'en_cours' | 'pieces_complementaires' | 'validee' | 'prete' | 'livree' | 'rejetee'

export interface CitizenRequest {
  id: string
  reference: string
  serviceId: string
  serviceName: string
  category: string
  categoryId: string
  // Citoyen
  citizenName: string
  citizenFirstName: string
  citizenNIN: string
  citizenPhone: string
  citizenEmail: string
  citizenAddress: string
  // Demande
  motif: string
  documents: string[]
  // Traitement
  status: RequestStatus
  assignedService: string
  assignedAgent: string
  processingNotes: ProcessingNote[]
  timeline: TimelineStep[]
  // Dates
  createdAt: string
  updatedAt: string
  completedAt?: string
  // Livraison
  deliveryMode: 'en_ligne' | 'guichet' | 'courrier'
  deliveryLocation?: string
  documentUrl?: string
}

export interface ProcessingNote {
  id: string
  author: string
  authorRole: string
  text: string
  date: string
  type: 'note' | 'decision' | 'info_complementaire' | 'notification'
}

export interface TimelineStep {
  label: string
  status: 'completed' | 'current' | 'pending'
  date?: string
  agent?: string
}

const SERVICE_ENTITY_MAP: Record<string, string> = {
  'etat-civil': 'Mairie / Commune',
  'justice': 'Ministère de la Justice',
  'identification': 'Agence Nationale d\'Identification (ANIP)',
  'urbanisme': 'Direction de l\'Urbanisme',
  'entreprise': 'APIP — Agence de Promotion des Investissements Privés',
  'education': 'Ministère de l\'Éducation Nationale',
  'sante': 'Ministère de la Santé',
  'residence': 'Mairie / Commune',
}

function generateReference(): string {
  return `GN-2026-${String(Math.floor(100000 + Math.random() * 900000))}`
}

function generateTimeline(category: string): TimelineStep[] {
  return [
    { label: 'Soumission de la demande', status: 'completed' },
    { label: 'Vérification des pièces justificatives', status: 'pending' },
    { label: 'Traitement par le service compétent', status: 'pending' },
    { label: 'Validation par le responsable', status: 'pending' },
    { label: 'Document prêt', status: 'pending' },
    { label: 'Livraison / Retrait', status: 'pending' },
  ]
}

interface CitizenRequestsState {
  requests: CitizenRequest[]
  addRequest: (req: Omit<CitizenRequest, 'id' | 'reference' | 'status' | 'timeline' | 'processingNotes' | 'updatedAt' | 'assignedService' | 'assignedAgent'>) => CitizenRequest
  updateRequestStatus: (id: string, status: RequestStatus, note?: string) => void
  addProcessingNote: (id: string, note: Omit<ProcessingNote, 'id' | 'date'>) => void
  advanceTimeline: (id: string) => void
  assignRequest: (id: string, agent: string) => void
  completeRequest: (id: string, deliveryMode: CitizenRequest['deliveryMode'], deliveryLocation?: string) => void
  getRequestById: (id: string) => CitizenRequest | undefined
  getRequestByReference: (ref: string) => CitizenRequest | undefined
  getRequestsByCategory: (categoryId: string) => CitizenRequest[]
  getRequestsByStatus: (status: RequestStatus) => CitizenRequest[]
}

export const useCitizenRequestsStore = create<CitizenRequestsState>()(
  persist(
    (set, get) => ({
      requests: [],

      addRequest: (req) => {
        const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const reference = generateReference()
        const now = new Date().toISOString()
        const assignedService = SERVICE_ENTITY_MAP[req.categoryId] || 'Administration Générale'

        const newRequest: CitizenRequest = {
          ...req,
          id,
          reference,
          status: 'soumise',
          assignedService,
          assignedAgent: '',
          timeline: generateTimeline(req.categoryId),
          processingNotes: [{
            id: `note-${Date.now()}`,
            author: 'Système',
            authorRole: 'Automate',
            text: `Demande soumise avec succès. Référence: ${reference}. Service compétent: ${assignedService}`,
            date: now,
            type: 'notification',
          }],
          updatedAt: now,
        }

        set((state) => ({ requests: [newRequest, ...state.requests] }))
        return newRequest
      },

      updateRequestStatus: (id, status, note) => {
        set((state) => ({
          requests: state.requests.map(r =>
            r.id === id
              ? {
                  ...r,
                  status,
                  updatedAt: new Date().toISOString(),
                  completedAt: status === 'livree' ? new Date().toISOString() : r.completedAt,
                  processingNotes: note
                    ? [...r.processingNotes, {
                        id: `note-${Date.now()}`,
                        author: 'Agent traitant',
                        authorRole: 'Agent',
                        text: note,
                        date: new Date().toISOString(),
                        type: 'decision' as const,
                      }]
                    : r.processingNotes,
                }
              : r
          ),
        }))
      },

      addProcessingNote: (id, note) => {
        set((state) => ({
          requests: state.requests.map(r =>
            r.id === id
              ? {
                  ...r,
                  updatedAt: new Date().toISOString(),
                  processingNotes: [...r.processingNotes, {
                    ...note,
                    id: `note-${Date.now()}`,
                    date: new Date().toISOString(),
                  }],
                }
              : r
          ),
        }))
      },

      advanceTimeline: (id) => {
        set((state) => ({
          requests: state.requests.map(r => {
            if (r.id !== id) return r
            const currentIdx = r.timeline.findIndex(s => s.status === 'current')
            const completedIdx = r.timeline.findIndex(s => s.status === 'completed')
            // If no current, first pending becomes current
            if (currentIdx === -1) {
              const firstPending = r.timeline.findIndex(s => s.status === 'pending')
              if (firstPending === -1) return r
              const newTimeline = r.timeline.map((step, i) =>
                i === firstPending ? { ...step, status: 'current' as const, date: new Date().toISOString() } : step
              )
              return { ...r, timeline: newTimeline, updatedAt: new Date().toISOString() }
            }
            // Complete current, advance next
            const newTimeline = r.timeline.map((step, i) => {
              if (i === currentIdx) return { ...step, status: 'completed' as const, date: new Date().toISOString() }
              if (i === currentIdx + 1 && step.status === 'pending') return { ...step, status: 'current' as const }
              return step
            })
            return { ...r, timeline: newTimeline, updatedAt: new Date().toISOString() }
          }),
        }))
      },

      assignRequest: (id, agent) => {
        set((state) => ({
          requests: state.requests.map(r =>
            r.id === id
              ? { ...r, assignedAgent: agent, updatedAt: new Date().toISOString() }
              : r
          ),
        }))
      },

      completeRequest: (id, deliveryMode, deliveryLocation) => {
        set((state) => ({
          requests: state.requests.map(r =>
            r.id === id
              ? {
                  ...r,
                  status: 'livree' as const,
                  deliveryMode,
                  deliveryLocation,
                  completedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  timeline: r.timeline.map(step => ({
                    ...step,
                    status: 'completed' as const,
                    date: step.date || new Date().toISOString(),
                  })),
                }
              : r
          ),
        }))
      },

      getRequestById: (id) => get().requests.find(r => r.id === id),
      getRequestByReference: (ref) => get().requests.find(r => r.reference === ref || r.reference.includes(ref)),
      getRequestsByCategory: (categoryId) => get().requests.filter(r => r.categoryId === categoryId),
      getRequestsByStatus: (status) => get().requests.filter(r => r.status === status),
    }),
    {
      name: 'citizen-requests-storage',
    }
  )
)
