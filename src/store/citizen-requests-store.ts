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

// ─── DEMO SEED DATA ──────────────────────────────────────────────────────────
const now = new Date()
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString()
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString()

const DEMO_REQUESTS: CitizenRequest[] = [
  {
    id: 'demo-001',
    reference: 'GN-2026-100234',
    serviceId: 'ec-1',
    serviceName: "Extrait d'acte de naissance",
    category: 'État Civil',
    categoryId: 'etat-civil',
    citizenName: 'Diallo',
    citizenFirstName: 'Aminata',
    citizenNIN: 'NIN-2019-458723',
    citizenPhone: '+224 622 34 56 78',
    citizenEmail: 'citoyen@eadmin.gn',
    citizenAddress: 'Conakry, Commune de Kaloum',
    motif: "Demande d'extrait d'acte de naissance pour dossier d'emploi",
    documents: ["Carte d'identité", 'Acte de naissance original ou numéro d\'acte'],
    status: 'en_cours',
    assignedService: 'Mairie / Commune',
    assignedAgent: 'Mme. Fatoumata Bah',
    processingNotes: [
      { id: 'pn-001', author: 'Système', authorRole: 'Automate', text: 'Demande soumise avec succès. Référence: GN-2026-100234. Service compétent: Mairie / Commune', date: daysAgo(3), type: 'notification' },
      { id: 'pn-002', author: 'Mme. Fatoumata Bah', authorRole: 'Agent', text: 'Demande prise en charge. Vérification des pièces en cours.', date: daysAgo(2), type: 'note' },
    ],
    timeline: [
      { label: 'Soumission de la demande', status: 'completed', date: daysAgo(3) },
      { label: 'Vérification des pièces justificatives', status: 'current', date: daysAgo(2), agent: 'Mme. Fatoumata Bah' },
      { label: 'Traitement par le service compétent', status: 'pending' },
      { label: 'Validation par le responsable', status: 'pending' },
      { label: 'Document prêt', status: 'pending' },
      { label: 'Livraison / Retrait', status: 'pending' },
    ],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
    deliveryMode: 'guichet',
    deliveryLocation: 'Mairie de Kaloum',
  },
  {
    id: 'demo-002',
    reference: 'GN-2026-100567',
    serviceId: 'id-1',
    serviceName: "Carte d'identité nationale biométrique",
    category: 'Identification',
    categoryId: 'identification',
    citizenName: 'Condé',
    citizenFirstName: 'Ibrahim',
    citizenNIN: 'NIN-2017-123456',
    citizenPhone: '+224 666 78 90 12',
    citizenEmail: 'ibrahin.conde@email.com',
    citizenAddress: 'Conakry, Commune de Matam',
    motif: "Renouvellement de carte d'identité biométrique arrivée à expiration",
    documents: ["Extrait d'acte de naissance", 'Certificat de nationalité', "4 photos d'identité", 'Certificat de résidence', 'Témoin avec CNI valide'],
    status: 'validee',
    assignedService: 'Agence Nationale d\'Identification (ANIP)',
    assignedAgent: 'M. Mamadou Soumah',
    processingNotes: [
      { id: 'pn-003', author: 'Système', authorRole: 'Automate', text: 'Demande soumise avec succès. Référence: GN-2026-100567. Service compétent: ANIP', date: daysAgo(7), type: 'notification' },
      { id: 'pn-004', author: 'M. Mamadou Soumah', authorRole: 'Agent', text: 'Pièces vérifiées et conformes. En cours de production.', date: daysAgo(5), type: 'note' },
      { id: 'pn-005', author: 'M. Mamadou Soumah', authorRole: 'Agent', text: 'Demande validée par le responsable. Production de la CNI lancée.', date: daysAgo(2), type: 'decision' },
    ],
    timeline: [
      { label: 'Soumission de la demande', status: 'completed', date: daysAgo(7) },
      { label: 'Vérification des pièces justificatives', status: 'completed', date: daysAgo(5), agent: 'M. Mamadou Soumah' },
      { label: 'Traitement par le service compétent', status: 'completed', date: daysAgo(3), agent: 'M. Mamadou Soumah' },
      { label: 'Validation par le responsable', status: 'completed', date: daysAgo(2), agent: 'M. Mamadou Soumah' },
      { label: 'Document prêt', status: 'current' },
      { label: 'Livraison / Retrait', status: 'pending' },
    ],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(2),
    deliveryMode: 'guichet',
    deliveryLocation: 'Centre ANIP de Conakry',
  },
  {
    id: 'demo-003',
    reference: 'GN-2026-100890',
    serviceId: 'j-1',
    serviceName: 'Casier judiciaire',
    category: 'Justice & Légal',
    categoryId: 'justice',
    citizenName: 'Camara',
    citizenFirstName: 'Ousmane',
    citizenNIN: 'NIN-2020-789012',
    citizenPhone: '+224 655 12 34 56',
    citizenEmail: 'ousmane.camara@email.com',
    citizenAddress: 'Kindia, Préfecture de Kindia',
    motif: 'Casier judiciaire requis pour demande d\'emploi à la BCRG',
    documents: ["Carte d'identité nationale", "2 photos d'identité", 'Timbre fiscal'],
    status: 'soumise',
    assignedService: 'Ministère de la Justice',
    assignedAgent: '',
    processingNotes: [
      { id: 'pn-006', author: 'Système', authorRole: 'Automate', text: 'Demande soumise avec succès. Référence: GN-2026-100890. Service compétent: Ministère de la Justice', date: hoursAgo(4), type: 'notification' },
    ],
    timeline: [
      { label: 'Soumission de la demande', status: 'completed', date: hoursAgo(4) },
      { label: 'Vérification des pièces justificatives', status: 'pending' },
      { label: 'Traitement par le service compétent', status: 'pending' },
      { label: 'Validation par le responsable', status: 'pending' },
      { label: 'Document prêt', status: 'pending' },
      { label: 'Livraison / Retrait', status: 'pending' },
    ],
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
    deliveryMode: 'en_ligne',
  },
  {
    id: 'demo-004',
    reference: 'GN-2026-101123',
    serviceId: 'e-1',
    serviceName: 'Enregistrement entreprise (APIP)',
    category: 'Entreprise & Commerce',
    categoryId: 'entreprise',
    citizenName: 'Touré',
    citizenFirstName: 'Mariama',
    citizenNIN: 'NIN-2018-345678',
    citizenPhone: '+224 628 45 67 89',
    citizenEmail: 'mariama.toure@entreprise-gn.com',
    citizenAddress: 'Conakry, Commune de Dixinn',
    motif: "Création d'une SARL dans le secteur du commerce général",
    documents: ["Statuts de l'entreprise", "Pièce d'identité du gérant", 'Casier judiciaire du gérant', 'Attestation de siège social', 'Capital social minimum'],
    status: 'prete',
    assignedService: 'APIP — Agence de Promotion des Investissements Privés',
    assignedAgent: 'M. Alpha Diallo',
    processingNotes: [
      { id: 'pn-007', author: 'Système', authorRole: 'Automate', text: 'Demande soumise avec succès. Référence: GN-2026-101123. Service compétent: APIP', date: daysAgo(10), type: 'notification' },
      { id: 'pn-008', author: 'M. Alpha Diallo', authorRole: 'Agent', text: 'Dossier complet, vérification en cours.', date: daysAgo(8), type: 'note' },
      { id: 'pn-009', author: 'M. Alpha Diallo', authorRole: 'Agent', text: 'Dossier approuvé. Enregistrement RCCM en cours.', date: daysAgo(5), type: 'decision' },
      { id: 'pn-010', author: 'M. Alpha Diallo', authorRole: 'Agent', text: 'Document prêt ! Veuillez le récupérer au guichet APIP.', date: daysAgo(1), type: 'notification' },
    ],
    timeline: [
      { label: 'Soumission de la demande', status: 'completed', date: daysAgo(10) },
      { label: 'Vérification des pièces justificatives', status: 'completed', date: daysAgo(8), agent: 'M. Alpha Diallo' },
      { label: 'Traitement par le service compétent', status: 'completed', date: daysAgo(5), agent: 'M. Alpha Diallo' },
      { label: 'Validation par le responsable', status: 'completed', date: daysAgo(3), agent: 'M. Alpha Diallo' },
      { label: 'Document prêt', status: 'completed', date: daysAgo(1), agent: 'M. Alpha Diallo' },
      { label: 'Livraison / Retrait', status: 'current' },
    ],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
    deliveryMode: 'guichet',
    deliveryLocation: 'Guichet APIP, Conakry',
  },
  {
    id: 'demo-005',
    reference: 'GN-2026-101456',
    serviceId: 'ec-4',
    serviceName: 'Certificat de nationalité',
    category: 'État Civil',
    categoryId: 'etat-civil',
    citizenName: 'Diallo',
    citizenFirstName: 'Aminata',
    citizenNIN: 'NIN-2019-458723',
    citizenPhone: '+224 622 34 56 78',
    citizenEmail: 'citoyen@eadmin.gn',
    citizenAddress: 'Kankan, Préfecture de Kankan',
    motif: 'Certificat de nationalité pour inscription sur les listes électorales',
    documents: ["Carte d'identité nationale", "Extrait d'acte de naissance", "2 photos d'identité", 'Certificat de résidence'],
    status: 'pieces_complementaires',
    assignedService: 'Mairie / Commune',
    assignedAgent: 'Mme. Aissatou Sylla',
    processingNotes: [
      { id: 'pn-011', author: 'Système', authorRole: 'Automate', text: 'Demande soumise avec succès. Référence: GN-2026-101456. Service compétent: Mairie / Commune', date: daysAgo(5), type: 'notification' },
      { id: 'pn-012', author: 'Mme. Aissatou Sylla', authorRole: 'Agent', text: 'Certificat de résidence manquant. Veuillez fournir un certificat de résidence en cours de validité (moins de 3 mois).', date: daysAgo(3), type: 'info_complementaire' },
    ],
    timeline: [
      { label: 'Soumission de la demande', status: 'completed', date: daysAgo(5) },
      { label: 'Vérification des pièces justificatives', status: 'current', date: daysAgo(3), agent: 'Mme. Aissatou Sylla' },
      { label: 'Traitement par le service compétent', status: 'pending' },
      { label: 'Validation par le responsable', status: 'pending' },
      { label: 'Document prêt', status: 'pending' },
      { label: 'Livraison / Retrait', status: 'pending' },
    ],
    createdAt: daysAgo(5),
    updatedAt: daysAgo(3),
    deliveryMode: 'courrier',
  },
  {
    id: 'demo-006',
    reference: 'GN-2026-101789',
    serviceId: 'id-2',
    serviceName: 'Passeport biométrique',
    category: 'Identification',
    categoryId: 'identification',
    citizenName: 'Bah',
    citizenFirstName: 'Fatoumata',
    citizenNIN: 'NIN-2016-234567',
    citizenPhone: '+224 664 32 10 98',
    citizenEmail: 'fatoumata.bah@email.com',
    citizenAddress: 'Conakry, Commune de Ratoma',
    motif: 'Demande de passeport biométrique pour voyage professionnel en Europe',
    documents: ["Carte d'identité nationale", "Extrait d'acte de naissance", "4 photos d'identité récentes", 'Certificat de résidence', 'Ancien passeport (si renouvellement)'],
    status: 'livree',
    assignedService: 'Agence Nationale d\'Identification (ANIP)',
    assignedAgent: 'M. Ibrahima Keita',
    processingNotes: [
      { id: 'pn-013', author: 'Système', authorRole: 'Automate', text: 'Demande soumise avec succès. Référence: GN-2026-101789. Service compétent: ANIP', date: daysAgo(15), type: 'notification' },
      { id: 'pn-014', author: 'M. Ibrahima Keita', authorRole: 'Agent', text: 'Dossier complet et conforme.', date: daysAgo(13), type: 'note' },
      { id: 'pn-015', author: 'M. Ibrahima Keita', authorRole: 'Agent', text: 'Passeport produit et prêt pour retrait.', date: daysAgo(8), type: 'decision' },
      { id: 'pn-016', author: 'M. Ibrahima Keita', authorRole: 'Agent', text: 'Passeport biométrique remis au citoyen au guichet ANIP de Conakry.', date: daysAgo(5), type: 'notification' },
    ],
    timeline: [
      { label: 'Soumission de la demande', status: 'completed', date: daysAgo(15) },
      { label: 'Vérification des pièces justificatives', status: 'completed', date: daysAgo(13), agent: 'M. Ibrahima Keita' },
      { label: 'Traitement par le service compétent', status: 'completed', date: daysAgo(10), agent: 'M. Ibrahima Keita' },
      { label: 'Validation par le responsable', status: 'completed', date: daysAgo(9), agent: 'M. Ibrahima Keita' },
      { label: 'Document prêt', status: 'completed', date: daysAgo(8), agent: 'M. Ibrahima Keita' },
      { label: 'Livraison / Retrait', status: 'completed', date: daysAgo(5), agent: 'M. Ibrahima Keita' },
    ],
    createdAt: daysAgo(15),
    updatedAt: daysAgo(5),
    completedAt: daysAgo(5),
    deliveryMode: 'guichet',
    deliveryLocation: 'Guichet ANIP, Conakry',
  },
  {
    id: 'demo-007',
    reference: 'GN-2026-102012',
    serviceId: 'ed-1',
    serviceName: 'Attestation de scolarité',
    category: 'Éducation',
    categoryId: 'education',
    citizenName: 'Keita',
    citizenFirstName: 'Mamadou',
    citizenNIN: 'NIN-2021-890123',
    citizenPhone: '+224 677 56 78 90',
    citizenEmail: '',
    citizenAddress: 'Labé, Préfecture de Labé',
    motif: "Attestation de scolarité pour bourse d'étude",
    documents: ["Carte d'identité", "Certificat d'inscription", 'Dernier bulletin scolaire'],
    status: 'rejetee',
    assignedService: 'Ministère de l\'Éducation Nationale',
    assignedAgent: 'M. Cheick Sylla',
    processingNotes: [
      { id: 'pn-017', author: 'Système', authorRole: 'Automate', text: 'Demande soumise avec succès. Référence: GN-2026-102012. Service compétent: Ministère de l\'Éducation Nationale', date: daysAgo(6), type: 'notification' },
      { id: 'pn-018', author: 'M. Cheick Sylla', authorRole: 'Agent', text: 'Dernier bulletin scolaire non fourni. Demande incomplète, impossibilité de traiter le dossier.', date: daysAgo(4), type: 'decision' },
    ],
    timeline: [
      { label: 'Soumission de la demande', status: 'completed', date: daysAgo(6) },
      { label: 'Vérification des pièces justificatives', status: 'completed', date: daysAgo(4), agent: 'M. Cheick Sylla' },
      { label: 'Traitement par le service compétent', status: 'pending' },
      { label: 'Validation par le responsable', status: 'pending' },
      { label: 'Document prêt', status: 'pending' },
      { label: 'Livraison / Retrait', status: 'pending' },
    ],
    createdAt: daysAgo(6),
    updatedAt: daysAgo(4),
    deliveryMode: 'guichet',
  },
  {
    id: 'demo-008',
    reference: 'GN-2026-102345',
    serviceId: 's-1',
    serviceName: 'Certificat de vaccination',
    category: 'Santé',
    categoryId: 'sante',
    citizenName: 'Doubé',
    citizenFirstName: 'Aïssatou',
    citizenNIN: 'NIN-2022-456789',
    citizenPhone: '+224 620 11 22 33',
    citizenEmail: 'aissatou.doube@email.com',
    citizenAddress: 'N\'Zérékoré, Préfecture de N\'Zérékoré',
    motif: 'Certificat de vaccination international pour voyage',
    documents: ["Carte d'identité", 'Ancien carnet de vaccination (si disponible)'],
    status: 'soumise',
    assignedService: 'Ministère de la Santé',
    assignedAgent: '',
    processingNotes: [
      { id: 'pn-019', author: 'Système', authorRole: 'Automate', text: 'Demande soumise avec succès. Référence: GN-2026-102345. Service compétent: Ministère de la Santé', date: hoursAgo(2), type: 'notification' },
    ],
    timeline: [
      { label: 'Soumission de la demande', status: 'completed', date: hoursAgo(2) },
      { label: 'Vérification des pièces justificatives', status: 'pending' },
      { label: 'Traitement par le service compétent', status: 'pending' },
      { label: 'Validation par le responsable', status: 'pending' },
      { label: 'Document prêt', status: 'pending' },
      { label: 'Livraison / Retrait', status: 'pending' },
    ],
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
    deliveryMode: 'en_ligne',
  },
]

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
      requests: DEMO_REQUESTS,

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
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (version < 3) {
          // Force reset to demo data on upgrade
          return { requests: DEMO_REQUESTS }
        }
        return persistedState
      },
    }
  )
)
