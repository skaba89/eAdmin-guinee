// ═══════════════════════════════════════════════════════════════════════════════
// eAdmin Guinée — Service Workflows Store
// Zustand store for managing service-specific workflows, validations,
// verification, and status transitions integrated with service configs
// and verification databases.
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import {
  getServiceConfig,
  type ServiceConfig,
  type ServiceFormField,
  type WorkflowStep,
} from './services-config'
import {
  verifyByServiceId,
  type VerificationResult,
} from './verification-databases'
import {
  useCitizenRequestsStore,
  type CitizenRequest,
  type RequestStatus,
} from '@/store/citizen-requests-store'

// ─── EXPORTED TYPES ──────────────────────────────────────────────────────────

export interface ServiceValidation {
  fieldId: string
  valid: boolean
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface WorkflowTransition {
  from: RequestStatus
  to: RequestStatus
  timestamp: string
  agent: string
  reason?: string
  automatic: boolean
}

export interface ServiceProcessingResult {
  serviceId: string
  requestId: string
  canProceed: boolean
  validations: ServiceValidation[]
  verificationResult?: VerificationResult
  nextStatus?: RequestStatus
  confidence: number
  explanation: string
  requiredActions: string[]
}

// ─── VALID STATUS TRANSITIONS MAP ────────────────────────────────────────────

const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  soumise: ['en_cours', 'rejetee'],
  en_cours: ['pieces_complementaires', 'validee', 'rejetee'],
  pieces_complementaires: ['en_cours', 'rejetee'],
  validee: ['prete', 'rejetee'],
  prete: ['livree'],
  livree: [],
  rejetee: [],
}

// ─── TERMINAL STATUSES ───────────────────────────────────────────────────────

const TERMINAL_STATUSES: RequestStatus[] = ['livree', 'rejetee']

// ─── HELPER: Clamp number to range ───────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ─── HELPER: Validate a single field value against its config ─────────────────

function validateField(
  field: ServiceFormField,
  value: any
): ServiceValidation | null {
  const fieldValue = value ?? ''

  // Required field check
  if (field.required) {
    if (
      fieldValue === '' ||
      fieldValue === undefined ||
      fieldValue === null ||
      (field.type === 'checkbox' && fieldValue !== true && fieldValue !== '1' && fieldValue !== 'on')
    ) {
      return {
        fieldId: field.id,
        valid: false,
        message: `Le champ "${field.label}" est obligatoire.`,
        severity: 'error',
      }
    }
  }

  // Skip further validation if the field is empty and not required
  if (
    fieldValue === '' ||
    fieldValue === undefined ||
    fieldValue === null
  ) {
    return null
  }

  // Pattern validation
  if (field.validation?.pattern) {
    const regex = new RegExp(field.validation.pattern)
    if (!regex.test(String(fieldValue))) {
      return {
        fieldId: field.id,
        valid: false,
        message: `Le champ "${field.label}" ne respecte pas le format attendu.`,
        severity: field.required ? 'error' : 'warning',
      }
    }
  }

  // Min length validation
  if (field.validation?.min !== undefined) {
    if (String(fieldValue).length < field.validation.min) {
      return {
        fieldId: field.id,
        valid: false,
        message: `Le champ "${field.label}" doit contenir au moins ${field.validation.min} caractères.`,
        severity: field.required ? 'error' : 'warning',
      }
    }
  }

  // Max length validation
  if (field.validation?.max !== undefined) {
    if (String(fieldValue).length > field.validation.max) {
      return {
        fieldId: field.id,
        valid: false,
        message: `Le champ "${field.label}" ne doit pas dépasser ${field.validation.max} caractères.`,
        severity: 'warning',
      }
    }
  }

  // Field is valid
  return null
}

// ─── STORE STATE INTERFACE ────────────────────────────────────────────────────

interface ServiceWorkflowsState {
  transitions: WorkflowTransition[]
  processingResults: Map<string, ServiceProcessingResult>
  isProcessing: boolean

  // Actions
  validateServiceForm: (
    serviceId: string,
    formData: Record<string, any>
  ) => ServiceValidation[]

  checkDocumentCompleteness: (
    request: CitizenRequest
  ) => { complete: boolean; missing: string[]; completenessPercent: number }

  processServiceRequest: (requestId: string) => ServiceProcessingResult

  executeWorkflowTransition: (
    requestId: string,
    targetStatus: RequestStatus,
    agent: string,
    reason?: string
  ) => boolean

  getNextAllowedStatuses: (requestId: string) => RequestStatus[]

  getServiceProcessingStats: (
    serviceId: string
  ) => {
    total: number
    autoProcessed: number
    manualProcessed: number
    avgConfidence: number
    avgProcessingTime: number
  }

  batchProcessRequests: (requestIds: string[]) => ServiceProcessingResult[]
}

// ─── STORE DEFINITION ────────────────────────────────────────────────────────

export const useServiceWorkflowsStore = create<ServiceWorkflowsState>()(
  (set, get) => ({
    transitions: [],
    processingResults: new Map(),
    isProcessing: false,

    // ─── validateServiceForm ──────────────────────────────────────────────
    validateServiceForm: (serviceId, formData) => {
      const config = getServiceConfig(serviceId)
      if (!config) {
        return [
          {
            fieldId: '_global',
            valid: false,
            message: `Service "${serviceId}" non trouvé dans la configuration.`,
            severity: 'error' as const,
          },
        ]
      }

      const validations: ServiceValidation[] = []

      for (const field of config.formFields) {
        // Check dependsOn condition — skip validation if condition not met
        if (field.dependsOn) {
          const dependsOnValue = formData[field.dependsOn.fieldId]
          if (dependsOnValue !== field.dependsOn.value) {
            continue
          }
        }

        const value = formData[field.id]
        const result = validateField(field, value)
        if (result) {
          validations.push(result)
        }
      }

      // If no errors found, add a global success validation
      const hasErrors = validations.some((v) => v.severity === 'error')
      if (!hasErrors && validations.length === 0) {
        validations.push({
          fieldId: '_global',
          valid: true,
          message: 'Tous les champs du formulaire sont valides.',
          severity: 'info',
        })
      }

      return validations
    },

    // ─── checkDocumentCompleteness ───────────────────────────────────────
    checkDocumentCompleteness: (request) => {
      const config = getServiceConfig(request.serviceId)
      if (!config) {
        return {
          complete: false,
          missing: ['Configuration du service introuvable'],
          completenessPercent: 0,
        }
      }

      // Determine required documents from the request's documents array
      // (which was populated from the service config at creation time)
      const requiredDocs = request.documents || []
      const attachedFileNames = request.attachedFiles.map((f) =>
        f.name.replace(/\.pdf$/i, '').replace(/_/g, ' ').toLowerCase()
      )

      const missing: string[] = []

      for (const doc of requiredDocs) {
        const docLower = doc.toLowerCase()
        const isAttached = attachedFileNames.some(
          (fileName) =>
            fileName.includes(docLower) ||
            docLower.includes(fileName) ||
            levenshteinSimilarity(fileName, docLower) > 0.6
        )
        if (!isAttached) {
          missing.push(doc)
        }
      }

      const total = requiredDocs.length || 1
      const provided = total - missing.length
      const completenessPercent = Math.round((provided / total) * 100)

      return {
        complete: missing.length === 0,
        missing,
        completenessPercent,
      }
    },

    // ─── processServiceRequest ───────────────────────────────────────────
    processServiceRequest: (requestId) => {
      const citizenStore = useCitizenRequestsStore.getState()
      const request = citizenStore.requests.find((r) => r.id === requestId)

      if (!request) {
        const result: ServiceProcessingResult = {
          serviceId: '',
          requestId,
          canProceed: false,
          validations: [
            {
              fieldId: '_global',
              valid: false,
              message: `Demande "${requestId}" introuvable.`,
              severity: 'error',
            },
          ],
          confidence: 0,
          explanation: 'Demande introuvable dans le système.',
          requiredActions: ['Vérifier l\'identifiant de la demande'],
        }
        set((state) => {
          const newResults = new Map(state.processingResults)
          newResults.set(requestId, result)
          return { processingResults: newResults }
        })
        return result
      }

      const config = getServiceConfig(request.serviceId)
      if (!config) {
        const result: ServiceProcessingResult = {
          serviceId: request.serviceId,
          requestId,
          canProceed: false,
          validations: [
            {
              fieldId: '_global',
              valid: false,
              message: `Configuration du service "${request.serviceId}" introuvable.`,
              severity: 'error',
            },
          ],
          confidence: 0,
          explanation: 'Configuration du service non disponible.',
          requiredActions: ['Contacter l\'administrateur système'],
        }
        set((state) => {
          const newResults = new Map(state.processingResults)
          newResults.set(requestId, result)
          return { processingResults: newResults }
        })
        return result
      }

      // Run form validation using the request's available data
      const formData: Record<string, any> = {
        nom: request.citizenName,
        prenom: request.citizenFirstName,
        nin: request.citizenNIN,
        telephone: request.citizenPhone,
        adresse: request.citizenAddress,
      }
      const validations = get().validateServiceForm(request.serviceId, formData)

      // Run verification against the appropriate database
      let verificationResult: VerificationResult | undefined
      if (config.verificationDb) {
        verificationResult = verifyByServiceId(
          request.serviceId,
          request.citizenNIN,
          { name: request.citizenName, firstName: request.citizenFirstName }
        )
      }

      // Check document completeness
      const docCheck = get().checkDocumentCompleteness(request)

      // ─── Confidence calculation ───────────────────────────────────────
      let confidence = 50 // Base confidence

      // Verification DB adjustments
      if (verificationResult) {
        if (verificationResult.found) {
          confidence += 20
        } else {
          confidence -= 20
        }

        if (verificationResult.confidence > 80) {
          confidence += 10
        }
      }

      // Document completeness adjustment
      if (docCheck.complete) {
        confidence += 10
      } else {
        confidence -= 15
      }

      // Auto-eligible service bonus
      if (config.isAutoEligible) {
        confidence += 5
      } else {
        confidence -= 10
      }

      // Clamp to 0-100
      confidence = clamp(confidence, 0, 100)

      // ─── Determine canProceed, nextStatus, explanation, requiredActions ─
      const hasValidationErrors = validations.some(
        (v) => v.severity === 'error'
      )
      const canProceed = !hasValidationErrors && confidence >= 40

      let nextStatus: RequestStatus | undefined
      const explanationParts: string[] = []
      const requiredActions: string[] = []

      // Determine next status based on current status and processing result
      const currentStatus = request.status

      if (currentStatus === 'soumise') {
        if (canProceed && confidence >= 70 && config.isAutoEligible && docCheck.complete) {
          nextStatus = 'validee'
          explanationParts.push(
            'Service éligible au traitement automatique avec haute confiance.'
          )
          explanationParts.push(
            `Vérification base de données: ${verificationResult?.found ? 'concordance trouvée' : 'aucune concordance'}.`
          )
          explanationParts.push(
            `Documents: ${docCheck.complete ? 'complets' : `incomplets (${docCheck.completenessPercent}%)`}.`
          )
        } else if (canProceed) {
          nextStatus = 'en_cours'
          explanationParts.push(
            'Le dossier peut passer en traitement. Révision manuelle recommandée.'
          )
          if (!config.isAutoEligible) {
            explanationParts.push(
              'Ce service nécessite une intervention humaine (non éligible au traitement automatique).'
            )
          }
          if (!docCheck.complete) {
            explanationParts.push(
              `Documents incomplets: ${docCheck.missing.join(', ')}.`
            )
          }
        } else {
          if (!docCheck.complete) {
            nextStatus = 'pieces_complementaires'
            explanationParts.push(
              'Des pièces complémentaires sont nécessaires pour continuer le traitement.'
            )
            requiredActions.push(...docCheck.missing.map((d) => `Fournir: ${d}`))
          }
          if (hasValidationErrors) {
            explanationParts.push(
              'Des erreurs de validation empêchent la poursuite du traitement.'
            )
            requiredActions.push('Corriger les erreurs du formulaire')
          }
          if (confidence < 40) {
            explanationParts.push(
              `Niveau de confiance trop bas (${confidence}%) pour poursuivre.`
            )
            requiredActions.push('Vérifier les informations fournies')
          }
        }
      } else if (currentStatus === 'en_cours') {
        if (confidence >= 70 && docCheck.complete) {
          nextStatus = 'validee'
          explanationParts.push(
            'Traitement terminé avec succès. Le dossier peut être validé.'
          )
        } else if (!docCheck.complete) {
          nextStatus = 'pieces_complementaires'
          explanationParts.push(
            'Des pièces complémentaires sont requises pour continuer.'
          )
          requiredActions.push(...docCheck.missing.map((d) => `Fournir: ${d}`))
        } else {
          explanationParts.push(
            `Traitement en cours. Confiance actuelle: ${confidence}%.`
          )
        }
      } else if (currentStatus === 'pieces_complementaires') {
        if (docCheck.complete && canProceed) {
          nextStatus = 'en_cours'
          explanationParts.push(
            'Toutes les pièces complémentaires ont été reçues. Reprise du traitement.'
          )
        } else {
          explanationParts.push(
            'En attente des pièces complémentaires.'
          )
          requiredActions.push(...docCheck.missing.map((d) => `Fournir: ${d}`))
        }
      } else if (currentStatus === 'validee') {
        nextStatus = 'prete'
        explanationParts.push(
          'Dossier validé. Le document peut être produit.'
        )
      } else if (currentStatus === 'prete') {
        nextStatus = 'livree'
        explanationParts.push(
          'Document prêt. Peut être livré au citoyen.'
        )
      } else if (TERMINAL_STATUSES.includes(currentStatus)) {
        explanationParts.push(
          `La demande est dans un état terminal (${currentStatus}). Aucune action supplémentaire possible.`
        )
      }

      // Build overall explanation if still empty
      if (explanationParts.length === 0) {
        explanationParts.push(
          `Traitement de la demande pour le service "${config.serviceName}". Confiance: ${confidence}%.`
        )
      }

      const result: ServiceProcessingResult = {
        serviceId: request.serviceId,
        requestId,
        canProceed,
        validations,
        verificationResult,
        nextStatus,
        confidence,
        explanation: explanationParts.join(' '),
        requiredActions,
      }

      // Cache the result
      set((state) => {
        const newResults = new Map(state.processingResults)
        newResults.set(requestId, result)
        return { processingResults: newResults }
      })

      return result
    },

    // ─── executeWorkflowTransition ───────────────────────────────────────
    executeWorkflowTransition: (requestId, targetStatus, agent, reason) => {
      const citizenStore = useCitizenRequestsStore.getState()
      const request = citizenStore.requests.find((r) => r.id === requestId)

      if (!request) {
        return false
      }

      const currentStatus = request.status

      // Check if the transition is valid
      const allowedTransitions = VALID_TRANSITIONS[currentStatus]
      if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
        return false
      }

      // Check if current status is terminal
      if (TERMINAL_STATUSES.includes(currentStatus)) {
        return false
      }

      // Record the transition
      const transition: WorkflowTransition = {
        from: currentStatus,
        to: targetStatus,
        timestamp: new Date().toISOString(),
        agent,
        reason,
        automatic: agent === 'system' || agent === 'Système',
      }

      set((state) => ({
        transitions: [...state.transitions, transition],
      }))

      // Update the request status in the citizen-requests-store
      useCitizenRequestsStore
        .getState()
        .updateRequestStatus(
          requestId,
          targetStatus,
          reason || `Transition: ${currentStatus} → ${targetStatus} par ${agent}`
        )

      return true
    },

    // ─── getNextAllowedStatuses ──────────────────────────────────────────
    getNextAllowedStatuses: (requestId) => {
      const citizenStore = useCitizenRequestsStore.getState()
      const request = citizenStore.requests.find((r) => r.id === requestId)

      if (!request) {
        return []
      }

      const config = getServiceConfig(request.serviceId)

      // Get base allowed transitions from the transition map
      const baseAllowed = VALID_TRANSITIONS[request.status] || []

      // If no service config, return base transitions
      if (!config) {
        return baseAllowed
      }

      // Further filter based on workflow steps defined in service config
      // A status is allowed if there exists a workflow step whose requiredStatus
      // matches the target status or if it's a standard flow transition
      const workflowStepStatuses = config.workflowSteps.map(
        (step) => step.requiredStatus
      )

      // Map between service config workflow statuses and our RequestStatus values
      // The workflow steps use their own status strings; we allow transitions
      // that are in our VALID_TRANSITIONS map regardless
      return baseAllowed
    },

    // ─── getServiceProcessingStats ───────────────────────────────────────
    getServiceProcessingStats: (serviceId) => {
      const citizenStore = useCitizenRequestsStore.getState()
      const serviceRequests = citizenStore.requests.filter(
        (r) => r.serviceId === serviceId
      )

      const total = serviceRequests.length
      let autoProcessed = 0
      let manualProcessed = 0
      let totalConfidence = 0
      let confidenceCount = 0
      let totalProcessingTime = 0
      let processingTimeCount = 0

      for (const request of serviceRequests) {
        // Count auto-processed vs manual
        if (
          request.aiProcessingStatus === 'ai_auto_validated' ||
          request.aiProcessingStatus === 'ai_auto_rejected'
        ) {
          autoProcessed++
        } else if (
          request.aiProcessingStatus === 'ai_assisted' ||
          request.aiProcessingStatus === 'ai_completed'
        ) {
          manualProcessed++
        }

        // Accumulate confidence
        if (request.aiConfidence !== undefined) {
          totalConfidence += request.aiConfidence
          confidenceCount++
        }

        // Calculate processing time from createdAt to completedAt or updatedAt
        if (request.completedAt) {
          const created = new Date(request.createdAt).getTime()
          const completed = new Date(request.completedAt).getTime()
          const hours = (completed - created) / (1000 * 60 * 60)
          totalProcessingTime += hours
          processingTimeCount++
        }
      }

      const avgConfidence =
        confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0
      const avgProcessingTime =
        processingTimeCount > 0
          ? Math.round((totalProcessingTime / processingTimeCount) * 10) / 10
          : 0

      return {
        total,
        autoProcessed,
        manualProcessed,
        avgConfidence,
        avgProcessingTime,
      }
    },

    // ─── batchProcessRequests ────────────────────────────────────────────
    batchProcessRequests: (requestIds) => {
      set({ isProcessing: true })

      const results: ServiceProcessingResult[] = []

      for (const requestId of requestIds) {
        const result = get().processServiceRequest(requestId)
        results.push(result)
      }

      set({ isProcessing: false })

      return results
    },
  })
)

// ─── UTILITY: Levenshtein-based similarity for fuzzy doc matching ────────────

function levenshteinSimilarity(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const maxLen = Math.max(a.length, b.length)
  return 1 - matrix[b.length][a.length] / maxLen
}
