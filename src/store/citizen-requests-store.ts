import { create } from 'zustand'
import * as serviceRequestsApi from '@/lib/service-requests-api'

export type RequestStatus = 'soumise' | 'en_cours' | 'pieces_complementaires' | 'validee' | 'prete' | 'livree' | 'rejetee'

export interface UploadedDocument {
  id: string
  name: string
  type: string
  size: number
  data: string
  uploadedAt: string
  requiredDocName: string
  verified: boolean
  serverStored?: boolean
}

export interface GeneratedDocument {
  id: string
  title: string
  htmlContent: string
  generatedAt: string
  generatedBy: string
  fileName: string
}

export interface SatisfactionRating {
  rating: 1 | 2 | 3 | 4 | 5
  comment: string
  ratedAt: string
}

export interface AIPProcessingDetail {
  step: string
  status: 'success' | 'warning' | 'error' | 'info'
  message: string
  timestamp: string
  duration?: number
}

export interface AttachedFile {
  id: string
  name: string
  size: number
  type: string
  category: 'justificatif' | 'complement' | 'photo' | 'autre'
  uploadedAt: string
  verified: boolean
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

export interface CitizenRequest {
  id: string
  reference: string
  serviceId: string
  serviceName: string
  category: string
  categoryId: string
  citizenName: string
  citizenFirstName: string
  citizenNIN: string
  citizenPhone: string
  citizenEmail: string
  citizenAddress: string
  motif: string
  documents: string[]
  uploadedDocuments: UploadedDocument[]
  generatedDocument?: GeneratedDocument
  satisfaction?: SatisfactionRating
  status: RequestStatus
  assignedService: string
  assignedAgent: string
  processingNotes: ProcessingNote[]
  timeline: TimelineStep[]
  createdAt: string
  updatedAt: string
  completedAt?: string
  deadlineDays: number
  deadlineDate: string
  mairie?: string
  deliveryMode: 'en_ligne' | 'guichet' | 'courrier'
  deliveryLocation?: string
  documentUrl?: string
  aiProcessingStatus?: 'none' | 'ai_pending' | 'ai_processing' | 'ai_completed' | 'ai_failed' | 'ai_auto_validated' | 'ai_auto_rejected' | 'ai_assisted'
  aiConfidence?: number
  aiProcessingDate?: string
  aiProcessingDetails?: AIPProcessingDetail[]
  attachedFiles?: AttachedFile[]
  tenantId?: string
  institutionId?: string
  targetInstitutionId?: string
}

/** Indicative UI calendar only. Official SLA policy is server-side. */
export function GUINEAN_HOLIDAYS(year: number): string[] {
  const mm = (m: number, d: number) => `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const fixed = [
    mm(1, 1), mm(3, 8), mm(4, 3), mm(5, 1), mm(5, 25),
    mm(8, 15), mm(10, 2), mm(11, 1), mm(12, 25),
  ]
  const variable: Record<number, string[]> = {
    2026: [mm(3, 30), mm(6, 7), mm(9, 5)],
    2027: [mm(3, 19), mm(5, 27), mm(8, 26)],
  }
  return [...fixed, ...(variable[year] ?? [])]
}

export function isGuineanHoliday(date: Date): boolean {
  const year = date.getFullYear()
  const dateStr = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return GUINEAN_HOLIDAYS(year).includes(dateStr)
}

export function addBusinessDays(startDate: Date, days: number): Date {
  const date = new Date(startDate)
  let addedDays = 0
  while (addedDays < days) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) addedDays += 1
  }
  return date
}

export function getDeadlineDays(categoryId: string): number {
  const slaDays: Record<string, number> = {
    'etat-civil': 30,
    justice: 45,
    identification: 45,
    urbanisme: 45,
    entreprise: 30,
    education: 30,
    sante: 30,
    residence: 30,
  }
  return slaDays[categoryId] || 45
}

export function isDeadlineExceeded(req: CitizenRequest): boolean {
  if (req.status === 'livree' || req.status === 'rejetee') return false
  return new Date(req.deadlineDate) < new Date()
}

export function countRemainingBusinessDays(deadline: Date): number {
  const now = new Date()
  let remaining = 0
  const d = new Date(now)
  while (d < deadline) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) remaining += 1
    d.setDate(d.getDate() + 1)
  }
  return remaining
}

export function isDeadlineApproaching(req: CitizenRequest): boolean {
  if (req.status === 'livree' || req.status === 'rejetee') return false
  const remaining = countRemainingBusinessDays(new Date(req.deadlineDate))
  return remaining > 0 && remaining <= 5
}

export function isDeadlineCritical(req: CitizenRequest): boolean {
  if (req.status === 'livree' || req.status === 'rejetee') return false
  const remaining = countRemainingBusinessDays(new Date(req.deadlineDate))
  return remaining > 5 && remaining <= 10
}

function provisionalTimeline(): TimelineStep[] {
  return [
    { label: 'Soumission de la demande', status: 'completed' },
    { label: 'Vérification des pièces justificatives', status: 'pending' },
    { label: 'Traitement par le service compétent', status: 'pending' },
    { label: 'Validation par le responsable', status: 'pending' },
    { label: 'Document prêt', status: 'pending' },
    { label: 'Livraison / Retrait', status: 'pending' },
  ]
}

async function dataUrlToFile(document: UploadedDocument): Promise<File> {
  if (!document.data.startsWith('data:')) {
    throw new Error(`Le fichier ${document.name} n'est plus disponible localement.`)
  }
  const response = await fetch(document.data)
  const blob = await response.blob()
  return new File([blob], document.name, { type: document.type || blob.type })
}

function normalizeText(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

async function resolveTargetInstitution(req: Pick<CitizenRequest, 'categoryId' | 'mairie' | 'citizenAddress' | 'targetInstitutionId'>): Promise<string> {
  if (req.targetInstitutionId) return req.targetInstitutionId

  const institutions = await serviceRequestsApi.listInstitutions()
  if (!institutions.length) {
    throw new Error('Aucune institution active n’est configurée pour recevoir cette demande.')
  }

  const mairieHint = normalizeText(req.mairie)
  const addressHint = normalizeText(req.citizenAddress)
  const communeMatch = addressHint.match(/commune de\s+([^,]+)/)
  const commune = communeMatch?.[1]?.trim() || ''

  if (mairieHint || commune) {
    const matches = institutions.filter((institution) => {
      const name = normalizeText(institution.name)
      return institution.type === 'mairie' && (
        (mairieHint && (name === mairieHint || name.includes(mairieHint.replace('mairie de ', '')))) ||
        (commune && name.includes(commune))
      )
    })
    if (matches.length === 1) return matches[0].id
  }

  const terms: Record<string, string[]> = {
    justice: ['justice'],
    identification: ['anip', 'identification'],
    urbanisme: ['urbanisme'],
    entreprise: ['apip', 'promotion des investissements'],
    education: ['education'],
    sante: ['sante'],
    residence: ['mairie'],
    'etat-civil': ['mairie'],
  }
  const wanted = terms[req.categoryId] || []
  const matches = institutions.filter((institution) => {
    const haystack = normalizeText(`${institution.name} ${institution.code || ''} ${institution.type}`)
    return wanted.some((term) => haystack.includes(normalizeText(term)))
  })

  if (matches.length === 1) return matches[0].id
  throw new Error(
    matches.length > 1
      ? 'Plusieurs institutions peuvent traiter cette démarche. Une sélection explicite est nécessaire.'
      : 'Aucune institution destinataire n’a pu être résolue pour cette démarche.',
  )
}

function replaceRequest(requests: CitizenRequest[], updated: CitizenRequest): CitizenRequest[] {
  const exists = requests.some((item) => item.id === updated.id)
  return exists
    ? requests.map((item) => item.id === updated.id ? updated : item)
    : [updated, ...requests]
}

type NewRequestInput = Omit<
  CitizenRequest,
  'id' | 'reference' | 'status' | 'timeline' | 'processingNotes' | 'updatedAt' |
  'assignedService' | 'assignedAgent' | 'deadlineDays' | 'deadlineDate'
>

export interface RequestSubmissionResult {
  request: CitizenRequest
  attachmentErrors: string[]
}

interface CitizenRequestsState {
  requests: CitizenRequest[]
  isLoading: boolean
  syncError: string | null
  hydrateRequests: () => Promise<void>
  addRequest: (req: NewRequestInput) => Promise<RequestSubmissionResult>
  updateRequestStatus: (id: string, status: RequestStatus, note?: string) => void
  addProcessingNote: (id: string, note: Omit<ProcessingNote, 'id' | 'date'>) => void
  advanceTimeline: (id: string) => void
  assignRequest: (id: string, agent: string) => void
  completeRequest: (id: string, deliveryMode: CitizenRequest['deliveryMode'], deliveryLocation?: string) => void
  getRequestById: (id: string) => CitizenRequest | undefined
  getRequestByReference: (ref: string) => CitizenRequest | undefined
  getRequestsByCategory: (categoryId: string) => CitizenRequest[]
  getRequestsByStatus: (status: RequestStatus) => CitizenRequest[]
  addUploadedDocument: (id: string, doc: UploadedDocument) => void
  removeUploadedDocument: (requestId: string, docId: string) => void
  verifyDocument: (requestId: string, docId: string) => void
  setGeneratedDocument: (id: string, doc: GeneratedDocument) => void
  rateRequest: (id: string, rating: SatisfactionRating) => void
  resetToDemoData: () => void
  checkAndRejectExpiredRequests: () => void
  aiAutoProcess: (id: string) => void
  aiAutoProcessAll: () => void
  updateRequestAIFields: (
    id: string,
    fields: Partial<Pick<CitizenRequest,
      'aiProcessingStatus' | 'aiConfidence' | 'aiProcessingDate' | 'aiProcessingDetails' |
      'status' | 'assignedAgent' | 'processingNotes' | 'timeline' | 'updatedAt'>>,
  ) => void
}

export const useCitizenRequestsStore = create<CitizenRequestsState>((set, get) => ({
  requests: [],
  isLoading: false,
  syncError: null,

  hydrateRequests: async () => {
    set({ isLoading: true, syncError: null })
    try {
      const requests = await serviceRequestsApi.listRequests()
      set({ requests, isLoading: false, syncError: null })
    } catch (error) {
      set({
        isLoading: false,
        syncError: error instanceof Error ? error.message : 'Synchronisation des demandes impossible.',
      })
    }
  },

  addRequest: async (req) => {
    set({ syncError: null })

    let mairie = req.mairie
    if ((req.categoryId === 'etat-civil' || req.categoryId === 'residence') && !mairie) {
      const match = req.citizenAddress.match(/Commune de\s+([^,]+)/i)
      if (match) mairie = `Mairie de ${match[1].trim()}`
    }

    // Resolve routing before creating anything. If routing is ambiguous, the
    // caller can safely retry because no server-side request exists yet.
    const targetInstitutionId = await resolveTargetInstitution({
      categoryId: req.categoryId,
      mairie,
      citizenAddress: req.citizenAddress,
      targetInstitutionId: req.targetInstitutionId,
    })

    const created = await serviceRequestsApi.createRequest({
      serviceId: req.serviceId,
      serviceName: req.serviceName,
      category: req.category,
      categoryId: req.categoryId,
      targetInstitutionId,
      citizenName: req.citizenName,
      citizenFirstName: req.citizenFirstName,
      citizenNIN: req.citizenNIN,
      citizenPhone: req.citizenPhone,
      citizenEmail: req.citizenEmail,
      citizenAddress: req.citizenAddress,
      motif: req.motif,
      documents: req.documents,
      mairie,
      deliveryMode: req.deliveryMode,
    })

    // From this point on the request exists officially. Never remove it from
    // memory or report a generic submission failure if a later attachment fails;
    // doing so would encourage duplicate citizen requests on retry.
    set((state) => ({
      requests: [created, ...state.requests.filter((item) => item.id !== created.id)],
      syncError: null,
    }))

    const attachmentErrors: string[] = []
    for (const document of req.uploadedDocuments || []) {
      if (document.serverStored) continue
      try {
        const file = await dataUrlToFile(document)
        await serviceRequestsApi.uploadAttachment(created.id, file, document.requiredDocName)
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'échec de transmission'
        attachmentErrors.push(`${document.name}: ${reason}`)
      }
    }

    await get().hydrateRequests()
    const refreshed = get().requests.find((item) => item.id === created.id) || created

    if (attachmentErrors.length) {
      set({
        syncError: `La demande ${created.reference} est enregistrée, mais ${attachmentErrors.length} pièce(s) n’ont pas été transmise(s).`,
      })
    }

    return { request: refreshed, attachmentErrors }
  },

  updateRequestStatus: (id, requestStatus, note) => {
    void serviceRequestsApi.updateStatus(id, requestStatus, note)
      .then((updated) => set((state) => ({ requests: replaceRequest(state.requests, updated) })))
      .catch((error) => set({ syncError: error instanceof Error ? error.message : 'Mise à jour impossible.' }))
  },

  addProcessingNote: (id, note) => {
    void serviceRequestsApi.addNote(id, note)
      .then((createdNote) => set((state) => ({
        requests: state.requests.map((item) => item.id === id
          ? { ...item, processingNotes: [...item.processingNotes, createdNote], updatedAt: new Date().toISOString() }
          : item),
      })))
      .catch((error) => set({ syncError: error instanceof Error ? error.message : 'Ajout de note impossible.' }))
  },

  advanceTimeline: () => {
    void get().hydrateRequests()
  },

  assignRequest: (id, agent) => {
    void serviceRequestsApi.assignRequest(id, agent)
      .then((updated) => set((state) => ({ requests: replaceRequest(state.requests, updated) })))
      .catch((error) => set({ syncError: error instanceof Error ? error.message : 'Affectation impossible.' }))
  },

  completeRequest: (id, deliveryMode, deliveryLocation) => {
    void serviceRequestsApi.completeRequest(id, deliveryMode, deliveryLocation)
      .then((updated) => set((state) => ({ requests: replaceRequest(state.requests, updated) })))
      .catch((error) => set({ syncError: error instanceof Error ? error.message : 'Livraison impossible.' }))
  },

  getRequestById: (id) => get().requests.find((item) => item.id === id),
  getRequestByReference: (reference) => get().requests.find(
    (item) => item.reference.toLowerCase() === reference.trim().toLowerCase(),
  ),
  getRequestsByCategory: (categoryId) => get().requests.filter((item) => item.categoryId === categoryId),
  getRequestsByStatus: (requestStatus) => get().requests.filter((item) => item.status === requestStatus),

  addUploadedDocument: (id, document) => {
    void dataUrlToFile(document)
      .then((file) => serviceRequestsApi.uploadAttachment(id, file, document.requiredDocName))
      .then((uploaded) => set((state) => ({
        requests: state.requests.map((item) => item.id === id
          ? { ...item, uploadedDocuments: [...item.uploadedDocuments, uploaded] }
          : item),
      })))
      .catch((error) => set({ syncError: error instanceof Error ? error.message : 'Upload impossible.' }))
  },

  removeUploadedDocument: (requestId, docId) => {
    void serviceRequestsApi.removeAttachment(requestId, docId)
      .then(() => set((state) => ({
        requests: state.requests.map((item) => item.id === requestId
          ? { ...item, uploadedDocuments: item.uploadedDocuments.filter((doc) => doc.id !== docId) }
          : item),
      })))
      .catch((error) => set({ syncError: error instanceof Error ? error.message : 'Suppression impossible.' }))
  },

  verifyDocument: (requestId, docId) => {
    void serviceRequestsApi.verifyAttachment(requestId, docId)
      .then(() => set((state) => ({
        requests: state.requests.map((item) => item.id === requestId
          ? {
              ...item,
              uploadedDocuments: item.uploadedDocuments.map((doc) => doc.id === docId ? { ...doc, verified: true } : doc),
            }
          : item),
      })))
      .catch((error) => set({ syncError: error instanceof Error ? error.message : 'Vérification impossible.' }))
  },

  setGeneratedDocument: (id, document) => {
    void serviceRequestsApi.saveGeneratedDocument(id, document)
      .then((updated) => set((state) => ({ requests: replaceRequest(state.requests, updated) })))
      .catch((error) => set({ syncError: error instanceof Error ? error.message : 'Enregistrement du document impossible.' }))
  },

  rateRequest: (id, rating) => {
    void serviceRequestsApi.rateRequest(id, rating)
      .then((updated) => set((state) => ({ requests: replaceRequest(state.requests, updated) })))
      .catch((error) => set({ syncError: error instanceof Error ? error.message : 'Évaluation impossible.' }))
  },

  resetToDemoData: () => {
    void get().hydrateRequests()
  },

  // Missed SLA => refresh/escalation signal, never automatic rejection.
  checkAndRejectExpiredRequests: () => {
    void get().hydrateRequests()
  },

  // Client AI can assist display only. It cannot modify official decisions.
  aiAutoProcess: (id) => {
    set((state) => ({
      requests: state.requests.map((item) => item.id === id
        ? { ...item, aiProcessingStatus: 'ai_assisted', aiProcessingDate: new Date().toISOString() }
        : item),
    }))
  },

  aiAutoProcessAll: () => {
    get().requests.forEach((item) => get().aiAutoProcess(item.id))
  },

  updateRequestAIFields: (id, fields) => {
    const {
      status: _status,
      assignedAgent: _assignedAgent,
      processingNotes: _processingNotes,
      timeline: _timeline,
      ...safeAiFields
    } = fields
    set((state) => ({
      requests: state.requests.map((item) => item.id === id
        ? { ...item, ...safeAiFields, updatedAt: item.updatedAt }
        : item),
    }))
  },
}))
