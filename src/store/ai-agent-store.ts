'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useCitizenRequestsStore, type CitizenRequest, type AIPProcessingDetail, type ProcessingNote, type RequestStatus } from '@/store/citizen-requests-store'
import { getServiceRule, makeAIDecision, type AIDecision, type AIDecisionContext } from '@/lib/ai-service-rules'
import { useNotificationsStore } from '@/store/notifications-store'
import { findBirthRecordByNIN, validateBirthRecord } from '@/data/birth-records-database'

// ═══ AI DECISION EXPLANATION ═══════════════════════════════════════════════════

export interface AIDecisionExplanation {
  factors: Array<{
    name: string
    weight: number
    score: number
    contribution: number  // weight * score
    description: string
  }>
  totalWeightedScore: number
  decisionThreshold: number
  reasoningChain: string[]  // step-by-step reasoning
}

// ═══ AI AGENT LOG ══════════════════════════════════════════════════════════════

export interface AIAgentLog {
  id: string
  requestId: string
  reference: string
  serviceName: string
  citizenName: string
  action: string
  result: 'success' | 'warning' | 'error' | 'escalade'
  details: string
  confidence: number
  timestamp: string
  processingTime: number  // ms
  realAI?: boolean  // whether this was processed by real AI
  serviceId?: string
  category?: string
  autoProcessed?: boolean  // processed by autonomous loop
  escalationReason?: string
  decisionExplanation?: AIDecisionExplanation
}

// ═══ AI AGENT STATS ════════════════════════════════════════════════════════════

export interface AIAgentStats {
  totalProcessed: number
  autoValidated: number
  autoRejected: number
  assistedReview: number
  escalated: number
  avgConfidence: number
  avgProcessingTime: number
  successRate: number
  autoProcessedCount: number
  manualProcessedCount: number
  pendingCount: number
}

// ═══ ESCALATION ITEM ═══════════════════════════════════════════════════════════

export interface EscalationItem {
  id: string
  requestId: string
  reference: string
  serviceName: string
  citizenName: string
  confidence: number
  reason: string
  timestamp: string
  serviceId: string
  category: string
}

// ═══ HOURLY STATS ══════════════════════════════════════════════════════════════

export interface HourlyStatsEntry {
  processed: number
  approved: number
  rejected: number
  escalated: number
}

// ═══ AI AGENT STATE ════════════════════════════════════════════════════════════

interface AIAgentState {
  isEnabled: boolean
  isProcessing: boolean
  realAIMode: boolean  // true = use z-ai-web-dev-sdk, false = simulated
  autoProcessDelay: number  // seconds between auto-processing cycles
  processingQueue: string[]  // request IDs
  logs: AIAgentLog[]
  stats: AIAgentStats
  confidenceThreshold: number  // 0-100, minimum confidence for auto-validation
  lastTestResult: string | null
  isTestingAI: boolean

  // Auto-processing
  isAutoProcessing: boolean  // autonomous loop active
  autoProcessIntervalId: number | null  // setInterval handle
  lastAutoProcessTime: string | null
  autoProcessCount: number  // total auto-processed requests

  // Escalation queue
  escalationQueue: EscalationItem[]

  // Service rules stats
  serviceRulesEnabled: boolean  // use the rules engine for decisions

  // Retry logic
  retryAttempts: Record<string, number>  // requestId → attempt count
  maxRetries: number  // default 3

  // Processing priority
  processingPriority: 'fifo' | 'urgency' | 'complexity' | 'age'

  // Activity log / heartbeat
  lastHeartbeat: string | null
  isHealthy: boolean

  // Batch statistics
  hourlyStats: Record<string, HourlyStatsEntry>  // keyed by hour like "2024-01-15T14"

  // Actions
  toggleEnabled: () => void
  toggleRealAIMode: () => void
  setAutoProcessDelay: (seconds: number) => void
  setConfidenceThreshold: (threshold: number) => void
  addToQueue: (requestId: string) => void
  processNext: () => void
  processNextWithRealAI: () => Promise<void>
  processAllQueued: () => void
  clearLogs: () => void
  getRecentLogs: (count: number) => AIAgentLog[]
  computeStats: () => AIAgentStats
  testAI: () => Promise<string>

  // Auto-processing actions
  startAutoProcessing: () => void
  stopAutoProcessing: () => void
  toggleAutoProcessing: () => void
  processNewRequests: () => number  // returns count of newly processed

  // Escalation actions
  resolveEscalation: (escalationId: string, action: 'approve' | 'reject' | 'request_docs', note?: string) => void
  clearEscalationQueue: () => void

  // Service rules
  toggleServiceRules: () => void
  processWithRulesEngine: (requestId: string) => AIDecision | null

  // Auto-start on page load
  initAutoProcessing: () => void

  // Retry logic
  retryFailedRequest: (requestId: string) => void

  // NIN verification
  verifyNIN: (nin: string) => { valid: boolean; details: string }

  // Duplicate detection
  detectDuplicates: (requestId: string) => CitizenRequest[]

  // Processing priority
  setProcessingPriority: (priority: string) => void

  // Health check
  checkHealth: () => { healthy: boolean; lastHeartbeat: string; nextCycle: string }

  // Hourly stats
  getHourlyStats: (hours: number) => Record<string, HourlyStatsEntry>

  // Decision explanation
  buildDecisionExplanation: (requestId: string, decision: AIDecision, rule: any) => AIDecisionExplanation

  // Priority sorting
  sortByPriority: (requests: CitizenRequest[]) => CitizenRequest[]
}

// ═══ HELPER: Compute stats from requests ══════════════════════════════════════

function computeStatsFromRequests(): AIAgentStats {
  const requests = useCitizenRequestsStore.getState().requests
  const aiProcessed = requests.filter(r => r.aiProcessingStatus && r.aiProcessingStatus !== 'none' && r.aiProcessingStatus !== 'ai_pending')

  const autoValidated = aiProcessed.filter(r => r.aiProcessingStatus === 'ai_auto_validated').length
  const autoRejected = aiProcessed.filter(r => r.aiProcessingStatus === 'ai_auto_rejected').length
  const assistedReview = aiProcessed.filter(r => r.aiProcessingStatus === 'ai_assisted').length

  const confidences = aiProcessed.filter(r => r.aiConfidence !== undefined).map(r => r.aiConfidence!)
  const avgConfidence = confidences.length > 0 ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : 0

  const processingTimes = aiProcessed
    .filter(r => r.aiProcessingDetails && r.aiProcessingDetails.length > 0)
    .map(r => r.aiProcessingDetails!.reduce((sum, d) => sum + (d.duration || 0), 0))
  const avgProcessingTime = processingTimes.length > 0 ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) : 0

  const successCount = autoValidated + assistedReview
  const totalCount = aiProcessed.length
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0

  // Pending requests count
  const pendingCount = requests.filter(r =>
    (r.status === 'soumise' || r.status === 'en_cours') &&
    (r.aiProcessingStatus === 'none' || r.aiProcessingStatus === undefined || r.aiProcessingStatus === 'ai_pending')
  ).length

  return {
    totalProcessed: aiProcessed.length,
    autoValidated,
    autoRejected,
    assistedReview,
    escalated: 0, // Will be computed from logs
    avgConfidence,
    avgProcessingTime,
    successRate,
    autoProcessedCount: 0, // Will be computed from logs
    manualProcessedCount: 0,
    pendingCount,
  }
}

// ═══ HELPER: Parse AI response ════════════════════════════════════════════════

/**
 * Parse the AI response to extract the decision JSON.
 */
function parseAIResponse(aiResponse: string): {
  decision: 'validee' | 'pieces_complementaires' | 'rejetee' | 'escaladee'
  confidence: number
  reason: string
  missingDocs: string[]
  estimatedDays?: number
  needsHumanReview?: boolean
} | null {
  try {
    let jsonStr = aiResponse

    // Remove markdown code blocks if present
    const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    // Try to find JSON object in the string
    const braceMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (braceMatch) {
      jsonStr = braceMatch[0]
    }

    const parsed = JSON.parse(jsonStr)

    const validDecisions = ['validee', 'pieces_complementaires', 'rejetee', 'escaladee']
    if (parsed.decision && validDecisions.includes(parsed.decision)) {
      return {
        decision: parsed.decision,
        confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 70,
        reason: parsed.reason || 'Analyse IA effectuée',
        missingDocs: Array.isArray(parsed.missingDocs) ? parsed.missingDocs : [],
        estimatedDays: typeof parsed.estimatedDays === 'number' ? parsed.estimatedDays : undefined,
        needsHumanReview: typeof parsed.needsHumanReview === 'boolean' ? parsed.needsHumanReview : undefined,
      }
    }
    return null
  } catch {
    return null
  }
}

// ═══ HELPER: Get current hour key ═════════════════════════════════════════════

function getCurrentHourKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}`
}

// ═══ HELPER: Send notification ════════════════════════════════════════════════

function sendNotification(
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string,
  relatedId?: string
) {
  try {
    useNotificationsStore.getState().addNotification({
      title,
      message,
      type,
      category: 'systeme',
      link: '/ai-assistant',
      relatedId,
      priority: 'normale',
    })
  } catch {
    // Notification store might not be available during SSR
  }
}

// ═══ MAIN STORE ═══════════════════════════════════════════════════════════════

export const useAIAgentStore = create<AIAgentState>()(
  persist(
    (set, get) => ({
      isEnabled: true,
      isProcessing: false,
      realAIMode: false,
      autoProcessDelay: 30,
      processingQueue: [],
      logs: [],
      stats: {
        totalProcessed: 0,
        autoValidated: 0,
        autoRejected: 0,
        assistedReview: 0,
        escalated: 0,
        avgConfidence: 0,
        avgProcessingTime: 0,
        successRate: 0,
        autoProcessedCount: 0,
        manualProcessedCount: 0,
        pendingCount: 0,
      },
      confidenceThreshold: 70,
      lastTestResult: null,
      isTestingAI: false,

      // Auto-processing state
      isAutoProcessing: false,
      autoProcessIntervalId: null,
      lastAutoProcessTime: null,
      autoProcessCount: 0,

      // Escalation queue
      escalationQueue: [],

      // Service rules
      serviceRulesEnabled: true,

      // Retry logic
      retryAttempts: {},
      maxRetries: 3,

      // Processing priority
      processingPriority: 'fifo',

      // Activity log / heartbeat
      lastHeartbeat: null,
      isHealthy: true,

      // Batch statistics
      hourlyStats: {},

      // ═══ BASIC ACTIONS ═══════════════════════════════════════════════════════

      toggleEnabled: () => set((state) => ({ isEnabled: !state.isEnabled })),

      toggleRealAIMode: () => set((state) => ({ realAIMode: !state.realAIMode })),

      setAutoProcessDelay: (seconds) => {
        set({ autoProcessDelay: seconds })
        // If auto-processing is active, restart with new delay
        const { isAutoProcessing } = get()
        if (isAutoProcessing) {
          get().stopAutoProcessing()
          get().startAutoProcessing()
        }
      },

      setConfidenceThreshold: (threshold) => set({ confidenceThreshold: threshold }),

      addToQueue: (requestId) => set((state) => {
        if (state.processingQueue.includes(requestId)) return state
        return { processingQueue: [...state.processingQueue, requestId] }
      }),

      // ═══ PROCESS NEXT ═══════════════════════════════════════════════════════

      processNext: () => {
        const { processingQueue, isProcessing, realAIMode, serviceRulesEnabled } = get()
        if (isProcessing || processingQueue.length === 0) return

        if (realAIMode) {
          get().processNextWithRealAI()
          return
        }

        const requestId = processingQueue[0]
        const requests = useCitizenRequestsStore.getState().requests
        const req = requests.find(r => r.id === requestId)

        if (!req) {
          set((state) => ({ processingQueue: state.processingQueue.slice(1) }))
          return
        }

        set({ isProcessing: true })

        const startTime = Date.now()

        // Use rules engine if enabled
        if (serviceRulesEnabled) {
          const decision = get().processWithRulesEngine(requestId)
          if (decision) {
            const processingTime = Date.now() - startTime
            const updatedReq = useCitizenRequestsStore.getState().getRequestById(requestId)

            const result: 'success' | 'warning' | 'error' | 'escalade' =
              decision.decision === 'validee' ? 'success' :
              decision.decision === 'escaladee' ? 'escalade' :
              decision.decision === 'pieces_complementaires' ? 'warning' : 'error'

            // Build decision explanation
            const rule = getServiceRule(req.serviceId)
            const decisionExplanation = rule ? get().buildDecisionExplanation(requestId, decision, rule) : undefined

            const newLog: AIAgentLog = {
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              requestId,
              reference: req.reference,
              serviceName: req.serviceName,
              citizenName: `${req.citizenFirstName} ${req.citizenName}`,
              action: `Traitement IA autonome (moteur de règles) de ${req.reference}`,
              result,
              details: decision.reason,
              confidence: decision.confidence,
              timestamp: new Date().toISOString(),
              processingTime,
              realAI: false,
              serviceId: req.serviceId,
              category: req.category,
              autoProcessed: true,
              escalationReason: decision.escalationReason,
              decisionExplanation,
            }

            // Send notification
            if (decision.decision === 'validee') {
              sendNotification('success', 'Demande auto-validée', `${req.reference} (${req.serviceName}) — Confiance: ${decision.confidence}%`, req.reference)
            } else if (decision.decision === 'escaladee') {
              sendNotification('warning', 'Demande escaladée', `${req.reference} (${req.serviceName}) — ${decision.escalationReason || decision.reason}`, req.reference)
            } else if (decision.decision === 'rejetee') {
              sendNotification('error', 'Demande rejetée', `${req.reference} (${req.serviceName}) — ${decision.reason}`, req.reference)
            }

            // Update hourly stats
            const hourKey = getCurrentHourKey()

            set((state) => ({
              isProcessing: false,
              processingQueue: state.processingQueue.slice(1),
              logs: [newLog, ...state.logs],
              stats: computeStatsFromRequests(),
              autoProcessCount: state.autoProcessCount + 1,
              lastAutoProcessTime: new Date().toISOString(),
              hourlyStats: {
                ...state.hourlyStats,
                [hourKey]: {
                  processed: (state.hourlyStats[hourKey]?.processed || 0) + 1,
                  approved: (state.hourlyStats[hourKey]?.approved || 0) + (decision.decision === 'validee' ? 1 : 0),
                  rejected: (state.hourlyStats[hourKey]?.rejected || 0) + (decision.decision === 'rejetee' ? 1 : 0),
                  escalated: (state.hourlyStats[hourKey]?.escalated || 0) + (decision.decision === 'escaladee' ? 1 : 0),
                },
              },
            }))
            return
          }
        }

        // Fallback to standard simulation
        useCitizenRequestsStore.getState().aiAutoProcess(requestId)

        const processingTime = Date.now() - startTime
        const updatedReq = useCitizenRequestsStore.getState().getRequestById(requestId)

        const result: 'success' | 'warning' | 'error' | 'escalade' =
          updatedReq?.aiProcessingStatus === 'ai_auto_validated' || updatedReq?.aiProcessingStatus === 'ai_completed' ? 'success' :
          updatedReq?.aiProcessingStatus === 'ai_assisted' ? 'escalade' :
          updatedReq?.aiProcessingStatus === 'ai_auto_rejected' || updatedReq?.aiProcessingStatus === 'ai_failed' ? 'error' : 'success'

        const newLog: AIAgentLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          requestId,
          reference: req.reference,
          serviceName: req.serviceName,
          citizenName: `${req.citizenFirstName} ${req.citizenName}`,
          action: `Traitement IA (simulé) de ${req.reference}`,
          result,
          details: updatedReq?.aiProcessingDetails?.map(d => `${d.step}: ${d.message}`).join(' | ') || 'Traitement effectué',
          confidence: updatedReq?.aiConfidence || 0,
          timestamp: new Date().toISOString(),
          processingTime,
          realAI: false,
          serviceId: req.serviceId,
          category: req.category,
          autoProcessed: true,
        }

        set((state) => ({
          isProcessing: false,
          processingQueue: state.processingQueue.slice(1),
          logs: [newLog, ...state.logs],
          stats: computeStatsFromRequests(),
          autoProcessCount: state.autoProcessCount + 1,
          lastAutoProcessTime: new Date().toISOString(),
        }))
      },

      // ═══ PROCESS NEXT WITH REAL AI ══════════════════════════════════════════

      processNextWithRealAI: async () => {
        const { processingQueue, serviceRulesEnabled, retryAttempts, maxRetries } = get()
        if (processingQueue.length === 0) return

        const requestId = processingQueue[0]
        const requests = useCitizenRequestsStore.getState().requests
        const req = requests.find(r => r.id === requestId)

        if (!req) {
          set((state) => ({ processingQueue: state.processingQueue.slice(1) }))
          return
        }

        set({ isProcessing: true })
        const startTime = Date.now()

        try {
          // Build context-aware prompt using service rules
          const { buildServiceSystemPrompt } = await import('@/lib/ai-service-rules')
          const systemPrompt = serviceRulesEnabled
            ? buildServiceSystemPrompt(req.serviceId)
            : `Tu es un agent IA autonome de l'administration guinéenne. Tu analyses les demandes de services publics et détermines si elles doivent être automatiquement validées, si des pièces complémentaires sont nécessaires, ou si elles doivent être rejetées.`

          const response = await fetch('/api/ai-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'process-request',
              data: {
                request: {
                  serviceName: req.serviceName,
                  category: req.category,
                  citizenFirstName: req.citizenFirstName,
                  citizenName: req.citizenName,
                  citizenNIN: req.citizenNIN,
                  motif: req.motif,
                  documents: req.documents,
                  attachedFiles: req.attachedFiles || [],
                  status: req.status,
                  serviceId: req.serviceId,
                },
                systemPrompt: serviceRulesEnabled ? systemPrompt : undefined,
              },
            }),
          })

          const result = await response.json()
          const processingTime = Date.now() - startTime

          if (result.success && result.aiResponse) {
            const aiDecision = parseAIResponse(result.aiResponse)

            if (aiDecision) {
              let newStatus: RequestStatus
              let aiStatus: CitizenRequest['aiProcessingStatus']
              let decisionStep: string

              if (aiDecision.decision === 'validee') {
                newStatus = 'validee'
                aiStatus = 'ai_auto_validated'
                decisionStep = 'Validation automatique'
              } else if (aiDecision.decision === 'pieces_complementaires') {
                newStatus = 'pieces_complementaires'
                aiStatus = 'ai_auto_rejected'
                decisionStep = 'Demande de compléments'
              } else if (aiDecision.decision === 'escaladee') {
                newStatus = 'en_cours'
                aiStatus = 'ai_assisted'
                decisionStep = 'Escalade vers agent humain'
              } else {
                newStatus = 'rejetee'
                aiStatus = 'ai_auto_rejected'
                decisionStep = 'Rejet automatique'
              }

              const confidence = aiDecision.confidence
              const now = new Date().toISOString()

              const details: AIPProcessingDetail[] = [
                {
                  step: 'Initialisation IA',
                  status: 'success',
                  message: `Agent IA réel prend en charge la demande ${req.reference}`,
                  timestamp: now,
                  duration: Math.round(processingTime * 0.1),
                },
                {
                  step: 'Analyse IA',
                  status: 'success',
                  message: `Analyse par modèle ${result.model || 'IA'} — ${aiDecision.reason}`,
                  timestamp: now,
                  duration: Math.round(processingTime * 0.7),
                },
                {
                  step: decisionStep,
                  status: aiDecision.decision === 'validee' ? 'success' : aiDecision.decision === 'escaladee' ? 'warning' : 'error',
                  message: `${decisionStep} — Confiance ${confidence}%. ${aiDecision.missingDocs.length > 0 ? `Documents manquants: ${aiDecision.missingDocs.join(', ')}` : ''}`,
                  timestamp: now,
                  duration: Math.round(processingTime * 0.2),
                },
              ]

              const aiNote: ProcessingNote = {
                id: `note-ai-real-${Date.now()}`,
                author: 'Agent IA Réel',
                authorRole: 'IA',
                text: `🤖 Traitement IA Réel: ${aiDecision.reason}. Confiance: ${confidence}%. Décision: ${aiDecision.decision}${aiDecision.missingDocs.length > 0 ? `. Documents manquants: ${aiDecision.missingDocs.join(', ')}` : ''}`,
                date: now,
                type: 'decision',
              }

              const newTimeline = (() => {
                const timeline = [...req.timeline]
                const statusProgress: Record<RequestStatus, number> = {
                  soumise: 0, en_cours: 2, pieces_complementaires: 1,
                  validee: 3, prete: 4, livree: 5, rejetee: 1,
                }
                const progress = statusProgress[newStatus]
                return timeline.map((step, i) => {
                  if (i < progress) return { ...step, status: 'completed' as const, date: step.date || now }
                  if (i === progress) return { ...step, status: 'current' as const, date: now }
                  return step
                })
              })()

              useCitizenRequestsStore.getState().updateRequestAIFields(requestId, {
                status: newStatus,
                timeline: newTimeline,
                updatedAt: now,
                assignedAgent: req.assignedAgent || 'Agent IA Réel',
                aiProcessingStatus: aiStatus,
                aiProcessingDate: now,
                aiConfidence: confidence,
                aiProcessingDetails: details,
                processingNotes: [...req.processingNotes, aiNote],
              })

              // If escalated, add to escalation queue
              if (aiDecision.decision === 'escaladee' || aiDecision.needsHumanReview) {
                const escalationItem: EscalationItem = {
                  id: `esc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  requestId,
                  reference: req.reference,
                  serviceName: req.serviceName,
                  citizenName: `${req.citizenFirstName} ${req.citizenName}`,
                  confidence,
                  reason: aiDecision.reason,
                  timestamp: now,
                  serviceId: req.serviceId,
                  category: req.category,
                }
                set((state) => ({
                  escalationQueue: [escalationItem, ...state.escalationQueue],
                }))
              }

              const logResult: 'success' | 'warning' | 'error' | 'escalade' =
                aiStatus === 'ai_auto_validated' ? 'success' :
                aiStatus === 'ai_assisted' ? 'escalade' : 'error'

              const newLog: AIAgentLog = {
                id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                requestId,
                reference: req.reference,
                serviceName: req.serviceName,
                citizenName: `${req.citizenFirstName} ${req.citizenName}`,
                action: `Traitement IA réel de ${req.reference}`,
                result: logResult,
                details: `${aiDecision.reason} | Modèle: ${result.model || 'N/A'}${aiDecision.missingDocs.length > 0 ? ` | Docs manquants: ${aiDecision.missingDocs.join(', ')}` : ''}`,
                confidence,
                timestamp: new Date().toISOString(),
                processingTime,
                realAI: true,
                serviceId: req.serviceId,
                category: req.category,
                autoProcessed: true,
                escalationReason: aiDecision.needsHumanReview ? 'Révision humaine requise' : undefined,
              }

              // Send notification
              if (aiDecision.decision === 'validee') {
                sendNotification('success', 'Demande auto-validée (IA)', `${req.reference} (${req.serviceName}) — Confiance: ${confidence}%`, req.reference)
              } else if (aiDecision.decision === 'escaladee') {
                sendNotification('warning', 'Demande escaladée (IA)', `${req.reference} (${req.serviceName}) — ${aiDecision.reason}`, req.reference)
              } else if (aiDecision.decision === 'rejetee') {
                sendNotification('error', 'Demande rejetée (IA)', `${req.reference} (${req.serviceName}) — ${aiDecision.reason}`, req.reference)
              }

              // Update hourly stats
              const hourKey = getCurrentHourKey()

              set((state) => ({
                isProcessing: false,
                processingQueue: state.processingQueue.slice(1),
                logs: [newLog, ...state.logs],
                stats: computeStatsFromRequests(),
                autoProcessCount: state.autoProcessCount + 1,
                lastAutoProcessTime: new Date().toISOString(),
                hourlyStats: {
                  ...state.hourlyStats,
                  [hourKey]: {
                    processed: (state.hourlyStats[hourKey]?.processed || 0) + 1,
                    approved: (state.hourlyStats[hourKey]?.approved || 0) + (aiDecision.decision === 'validee' ? 1 : 0),
                    rejected: (state.hourlyStats[hourKey]?.rejected || 0) + (aiDecision.decision === 'rejetee' ? 1 : 0),
                    escalated: (state.hourlyStats[hourKey]?.escalated || 0) + (aiDecision.decision === 'escaladee' ? 1 : 0),
                  },
                },
              }))
            } else {
              // Failed to parse, fall back to simulation
              useCitizenRequestsStore.getState().aiAutoProcess(requestId)
              const updatedReq = useCitizenRequestsStore.getState().getRequestById(requestId)
              const logResult: 'success' | 'warning' | 'error' | 'escalade' =
                updatedReq?.aiProcessingStatus === 'ai_auto_validated' || updatedReq?.aiProcessingStatus === 'ai_completed' ? 'success' :
                updatedReq?.aiProcessingStatus === 'ai_assisted' ? 'escalade' : 'error'

              const newLog: AIAgentLog = {
                id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                requestId,
                reference: req.reference,
                serviceName: req.serviceName,
                citizenName: `${req.citizenFirstName} ${req.citizenName}`,
                action: `Traitement IA (fallback) de ${req.reference}`,
                result: logResult,
                details: 'Réponse IA non parsable — fallback vers simulation',
                confidence: updatedReq?.aiConfidence || 0,
                timestamp: new Date().toISOString(),
                processingTime: Date.now() - startTime,
                realAI: false,
                serviceId: req.serviceId,
                category: req.category,
                autoProcessed: true,
              }

              set((state) => ({
                isProcessing: false,
                processingQueue: state.processingQueue.slice(1),
                logs: [newLog, ...state.logs],
                stats: computeStatsFromRequests(),
                autoProcessCount: state.autoProcessCount + 1,
                lastAutoProcessTime: new Date().toISOString(),
              }))
            }
          } else {
            // API error — retry with exponential backoff if under max retries
            const currentAttempt = retryAttempts[requestId] || 0
            if (currentAttempt < maxRetries) {
              const delayMs = Math.pow(2, currentAttempt) * 1000
              console.log(`[Agent IA] Tentative ${currentAttempt + 1}/${maxRetries} échouée pour ${req.reference}. Retry dans ${delayMs}ms`)

              set((state) => ({
                isProcessing: false,
                retryAttempts: { ...state.retryAttempts, [requestId]: currentAttempt + 1 },
              }))

              // Schedule retry
              setTimeout(() => {
                get().retryFailedRequest(requestId)
              }, delayMs)
              return
            }

            // Max retries exceeded — fall back
            useCitizenRequestsStore.getState().aiAutoProcess(requestId)
            const updatedReq = useCitizenRequestsStore.getState().getRequestById(requestId)
            const logResult: 'success' | 'warning' | 'error' | 'escalade' =
              updatedReq?.aiProcessingStatus === 'ai_auto_validated' || updatedReq?.aiProcessingStatus === 'ai_completed' ? 'success' :
              updatedReq?.aiProcessingStatus === 'ai_assisted' ? 'escalade' : 'error'

            const newLog: AIAgentLog = {
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              requestId,
              reference: req.reference,
              serviceName: req.serviceName,
              citizenName: `${req.citizenFirstName} ${req.citizenName}`,
              action: `Traitement IA (fallback) de ${req.reference}`,
              result: logResult,
              details: `Erreur API IA après ${maxRetries} tentatives — fallback: ${result.error || 'Erreur inconnue'}`,
              confidence: updatedReq?.aiConfidence || 0,
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              realAI: false,
              serviceId: req.serviceId,
              category: req.category,
              autoProcessed: true,
            }

            sendNotification('error', 'Traitement IA échoué', `${req.reference} — ${maxRetries} tentatives échouées, fallback simulation`, req.reference)

            set((state) => ({
              isProcessing: false,
              processingQueue: state.processingQueue.slice(1),
              logs: [newLog, ...state.logs],
              stats: computeStatsFromRequests(),
              autoProcessCount: state.autoProcessCount + 1,
              lastAutoProcessTime: new Date().toISOString(),
              retryAttempts: { ...state.retryAttempts, [requestId]: 0 }, // Reset
            }))
          }
        } catch (error: any) {
          // Network error — retry with exponential backoff if under max retries
          const currentAttempt = retryAttempts[requestId] || 0
          if (currentAttempt < maxRetries) {
            const delayMs = Math.pow(2, currentAttempt) * 1000
            console.log(`[Agent IA] Erreur réseau tentative ${currentAttempt + 1}/${maxRetries} pour ${req.reference}. Retry dans ${delayMs}ms`)

            set((state) => ({
              isProcessing: false,
              retryAttempts: { ...state.retryAttempts, [requestId]: currentAttempt + 1 },
            }))

            setTimeout(() => {
              get().retryFailedRequest(requestId)
            }, delayMs)
            return
          }

          // Max retries exceeded — fall back
          useCitizenRequestsStore.getState().aiAutoProcess(requestId)
          const updatedReq = useCitizenRequestsStore.getState().getRequestById(requestId)
          const logResult: 'success' | 'warning' | 'error' | 'escalade' =
            updatedReq?.aiProcessingStatus === 'ai_auto_validated' || updatedReq?.aiProcessingStatus === 'ai_completed' ? 'success' :
            updatedReq?.aiProcessingStatus === 'ai_assisted' ? 'escalade' : 'error'

          const newLog: AIAgentLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            requestId,
            reference: req.reference,
            serviceName: req.serviceName,
            citizenName: `${req.citizenFirstName} ${req.citizenName}`,
            action: `Traitement IA (fallback) de ${req.reference}`,
            result: logResult,
            details: `Erreur réseau IA après ${maxRetries} tentatives — fallback: ${error.message || 'Erreur inconnue'}`,
            confidence: updatedReq?.aiConfidence || 0,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            realAI: false,
            serviceId: req.serviceId,
            category: req.category,
            autoProcessed: true,
          }

          sendNotification('error', 'Traitement IA échoué', `${req.reference} — Erreur réseau après ${maxRetries} tentatives`, req.reference)

          set((state) => ({
            isProcessing: false,
            processingQueue: state.processingQueue.slice(1),
            logs: [newLog, ...state.logs],
            stats: computeStatsFromRequests(),
            autoProcessCount: state.autoProcessCount + 1,
            lastAutoProcessTime: new Date().toISOString(),
            retryAttempts: { ...state.retryAttempts, [requestId]: 0 }, // Reset
          }))
        }
      },

      // ═══ PROCESS ALL QUEUED ═════════════════════════════════════════════════

      processAllQueued: () => {
        const { processingQueue, realAIMode, serviceRulesEnabled } = get()

        // If queue is empty, add all pending requests
        if (processingQueue.length === 0) {
          const requests = useCitizenRequestsStore.getState().requests
          const pendingRequests = requests.filter(r =>
            (r.status === 'soumise' || r.status === 'en_cours') &&
            (r.aiProcessingStatus === 'none' || r.aiProcessingStatus === undefined || r.aiProcessingStatus === 'ai_pending')
          )

          const newQueue = pendingRequests.map(r => r.id)
          if (newQueue.length === 0) return

          set({ processingQueue: newQueue })

          if (realAIMode) {
            const processSequentially = async () => {
              for (let i = 0; i < newQueue.length; i++) {
                await get().processNextWithRealAI()
              }
            }
            processSequentially()
            return
          }

          // Process all with rules engine if enabled
          if (serviceRulesEnabled) {
            const newLogs: AIAgentLog[] = []
            const newEscalations: EscalationItem[] = []

            for (const reqId of newQueue) {
              const decision = get().processWithRulesEngine(reqId)
              const req = useCitizenRequestsStore.getState().getRequestById(reqId)
              if (decision && req) {
                const result: 'success' | 'warning' | 'error' | 'escalade' =
                  decision.decision === 'validee' ? 'success' :
                  decision.decision === 'escaladee' ? 'escalade' :
                  decision.decision === 'pieces_complementaires' ? 'warning' : 'error'

                // Build decision explanation
                const rule = getServiceRule(req.serviceId)
                const decisionExplanation = rule ? get().buildDecisionExplanation(reqId, decision, rule) : undefined

                newLogs.push({
                  id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  requestId: reqId,
                  reference: req.reference,
                  serviceName: req.serviceName,
                  citizenName: `${req.citizenFirstName} ${req.citizenName}`,
                  action: `Traitement IA autonome (moteur de règles) de ${req.reference}`,
                  result,
                  details: decision.reason,
                  confidence: decision.confidence,
                  timestamp: new Date().toISOString(),
                  processingTime: 200 + Math.floor(Math.random() * 800),
                  realAI: false,
                  serviceId: req.serviceId,
                  category: req.category,
                  autoProcessed: true,
                  escalationReason: decision.escalationReason,
                  decisionExplanation,
                })

                if (decision.decision === 'escaladee' || decision.needsHumanReview) {
                  newEscalations.push({
                    id: `esc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    requestId: reqId,
                    reference: req.reference,
                    serviceName: req.serviceName,
                    citizenName: `${req.citizenFirstName} ${req.citizenName}`,
                    confidence: decision.confidence,
                    reason: decision.reason,
                    timestamp: new Date().toISOString(),
                    serviceId: req.serviceId,
                    category: req.category,
                  })
                }
              }
            }

            set((state) => ({
              processingQueue: [],
              logs: [...newLogs, ...state.logs],
              stats: computeStatsFromRequests(),
              autoProcessCount: state.autoProcessCount + newLogs.length,
              lastAutoProcessTime: new Date().toISOString(),
              escalationQueue: [...newEscalations, ...state.escalationQueue],
            }))
            return
          }

          // Standard simulation
          useCitizenRequestsStore.getState().aiAutoProcessAll()
          const simRequests = newQueue.map(id => useCitizenRequestsStore.getState().getRequestById(id)).filter(Boolean) as CitizenRequest[]

          const simNewLogs = simRequests.map((req, idx) => {
            const updatedReq = useCitizenRequestsStore.getState().getRequestById(req.id)
            const result: 'success' | 'warning' | 'error' | 'escalade' =
              updatedReq?.aiProcessingStatus === 'ai_auto_validated' || updatedReq?.aiProcessingStatus === 'ai_completed' ? 'success' :
              updatedReq?.aiProcessingStatus === 'ai_assisted' ? 'escalade' :
              updatedReq?.aiProcessingStatus === 'ai_auto_rejected' || updatedReq?.aiProcessingStatus === 'ai_failed' ? 'error' : 'success'

            return {
              id: `log-${Date.now()}-${idx}`,
              requestId: req.id,
              reference: req.reference,
              serviceName: req.serviceName,
              citizenName: `${req.citizenFirstName} ${req.citizenName}`,
              action: `Traitement IA (simulé) de ${req.reference}`,
              result,
              details: updatedReq?.aiProcessingDetails?.map(d => `${d.step}: ${d.message}`).join(' | ') || 'Traitement effectué',
              confidence: updatedReq?.aiConfidence || 0,
              timestamp: new Date().toISOString(),
              processingTime: 500 + Math.floor(Math.random() * 1500),
              realAI: false,
              serviceId: req.serviceId,
              category: req.category,
              autoProcessed: true,
            } as AIAgentLog
          })

          set((state) => ({
            processingQueue: [],
            logs: [...simNewLogs, ...state.logs],
            stats: computeStatsFromRequests(),
            autoProcessCount: state.autoProcessCount + simNewLogs.length,
            lastAutoProcessTime: new Date().toISOString(),
          }))
          return
        }

        // Process existing queue
        if (realAIMode) {
          const processSequentially = async () => {
            const currentQueue = [...get().processingQueue]
            for (let i = 0; i < currentQueue.length; i++) {
              await get().processNextWithRealAI()
            }
          }
          processSequentially()
          return
        }

        useCitizenRequestsStore.getState().aiAutoProcessAll()
        const pendingRequests = processingQueue.map(id => useCitizenRequestsStore.getState().getRequestById(id)).filter(Boolean) as CitizenRequest[]

        const existingNewLogs = pendingRequests.map((req, idx) => {
          const updatedReq = useCitizenRequestsStore.getState().getRequestById(req.id)
          const result: 'success' | 'warning' | 'error' | 'escalade' =
            updatedReq?.aiProcessingStatus === 'ai_auto_validated' || updatedReq?.aiProcessingStatus === 'ai_completed' ? 'success' :
            updatedReq?.aiProcessingStatus === 'ai_assisted' ? 'escalade' :
            updatedReq?.aiProcessingStatus === 'ai_auto_rejected' || updatedReq?.aiProcessingStatus === 'ai_failed' ? 'error' : 'success'

          return {
            id: `log-${Date.now()}-${idx}`,
            requestId: req.id,
            reference: req.reference,
            serviceName: req.serviceName,
            citizenName: `${req.citizenFirstName} ${req.citizenName}`,
            action: `Traitement IA (simulé) de ${req.reference}`,
            result,
            details: updatedReq?.aiProcessingDetails?.map(d => `${d.step}: ${d.message}`).join(' | ') || 'Traitement effectué',
            confidence: updatedReq?.aiConfidence || 0,
            timestamp: new Date().toISOString(),
            processingTime: 500 + Math.floor(Math.random() * 1500),
            realAI: false,
            serviceId: req.serviceId,
            category: req.category,
            autoProcessed: true,
          } as AIAgentLog
        })

        set((state) => ({
          processingQueue: [],
          logs: [...existingNewLogs, ...state.logs],
          stats: computeStatsFromRequests(),
          autoProcessCount: state.autoProcessCount + existingNewLogs.length,
          lastAutoProcessTime: new Date().toISOString(),
        }))
      },

      clearLogs: () => set({ logs: [] }),

      getRecentLogs: (count) => {
        return get().logs.slice(0, count)
      },

      computeStats: () => {
        const stats = computeStatsFromRequests()
        // Add escalation count from logs
        const escalationCount = get().logs.filter(l => l.result === 'escalade').length
        const autoProcessedCount = get().logs.filter(l => l.autoProcessed).length
        const manualProcessedCount = get().logs.filter(l => !l.autoProcessed).length
        stats.escalated = escalationCount
        stats.autoProcessedCount = autoProcessedCount
        stats.manualProcessedCount = manualProcessedCount
        set({ stats })
        return stats
      },

      testAI: async () => {
        set({ isTestingAI: true })
        try {
          const response = await fetch('/api/ai-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'test', data: {} }),
          })
          const result = await response.json()

          if (result.success) {
            const testResult = `✅ IA opérationnelle — Modèle: ${result.model || 'N/A'} — "${result.message}"`
            set({ lastTestResult: testResult, isTestingAI: false })
            return testResult
          } else {
            const testResult = `❌ Erreur IA: ${result.error || 'Erreur inconnue'}`
            set({ lastTestResult: testResult, isTestingAI: false })
            return testResult
          }
        } catch (error: any) {
          const testResult = `❌ Service IA indisponible: ${error.message || 'Erreur réseau'}`
          set({ lastTestResult: testResult, isTestingAI: false })
          return testResult
        }
      },

      // ═══ AUTO-PROCESSING ═══════════════════════════════════════════════════

      startAutoProcessing: () => {
        const { isAutoProcessing, autoProcessDelay, isEnabled } = get()
        if (isAutoProcessing || !isEnabled) return

        const intervalMs = autoProcessDelay * 1000
        const intervalId = window.setInterval(() => {
          // Update heartbeat
          const heartbeatTime = new Date().toISOString()
          const { autoProcessDelay: currentDelay } = get()
          set({
            lastHeartbeat: heartbeatTime,
            isHealthy: true,
          })

          const count = get().processNewRequests()
          if (count > 0) {
            console.log(`[Agent IA Autonome] ${count} demande(s) traitée(s) automatiquement`)
          }
        }, intervalMs)

        set({
          isAutoProcessing: true,
          autoProcessIntervalId: intervalId,
          lastHeartbeat: new Date().toISOString(),
          isHealthy: true,
        })

        // Process immediately on start
        get().processNewRequests()
      },

      stopAutoProcessing: () => {
        const { autoProcessIntervalId } = get()
        if (autoProcessIntervalId) {
          window.clearInterval(autoProcessIntervalId)
        }
        set({
          isAutoProcessing: false,
          autoProcessIntervalId: null,
        })
      },

      toggleAutoProcessing: () => {
        const { isAutoProcessing } = get()
        if (isAutoProcessing) {
          get().stopAutoProcessing()
        } else {
          get().startAutoProcessing()
        }
      },

      processNewRequests: () => {
        const { isEnabled, isProcessing, processingPriority } = get()
        if (!isEnabled || isProcessing) return 0

        const requests = useCitizenRequestsStore.getState().requests
        let pendingRequests = requests.filter(r =>
          (r.status === 'soumise' || r.status === 'en_cours') &&
          (r.aiProcessingStatus === 'none' || r.aiProcessingStatus === undefined || r.aiProcessingStatus === 'ai_pending')
        )

        if (pendingRequests.length === 0) return 0

        // Sort by priority
        pendingRequests = get().sortByPriority(pendingRequests)

        // Process each pending request
        const { serviceRulesEnabled, realAIMode } = get()
        let processedCount = 0

        if (realAIMode) {
          // For real AI, add to queue and process one
          pendingRequests.forEach(r => get().addToQueue(r.id))
          if (get().processingQueue.length > 0) {
            get().processNextWithRealAI()
          }
          processedCount = pendingRequests.length
        } else if (serviceRulesEnabled) {
          // Use rules engine for all
          const newLogs: AIAgentLog[] = []
          const newEscalations: EscalationItem[] = []

          for (const req of pendingRequests) {
            const decision = get().processWithRulesEngine(req.id)
            if (decision) {
              const result: 'success' | 'warning' | 'error' | 'escalade' =
                decision.decision === 'validee' ? 'success' :
                decision.decision === 'escaladee' ? 'escalade' :
                decision.decision === 'pieces_complementaires' ? 'warning' : 'error'

              // Build decision explanation
              const rule = getServiceRule(req.serviceId)
              const decisionExplanation = rule ? get().buildDecisionExplanation(req.id, decision, rule) : undefined

              newLogs.push({
                id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                requestId: req.id,
                reference: req.reference,
                serviceName: req.serviceName,
                citizenName: `${req.citizenFirstName} ${req.citizenName}`,
                action: `Auto-traitement IA (moteur de règles) de ${req.reference}`,
                result,
                details: decision.reason,
                confidence: decision.confidence,
                timestamp: new Date().toISOString(),
                processingTime: 150 + Math.floor(Math.random() * 500),
                realAI: false,
                serviceId: req.serviceId,
                category: req.category,
                autoProcessed: true,
                escalationReason: decision.escalationReason,
                decisionExplanation,
              })

              if (decision.decision === 'escaladee' || decision.needsHumanReview) {
                newEscalations.push({
                  id: `esc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  requestId: req.id,
                  reference: req.reference,
                  serviceName: req.serviceName,
                  citizenName: `${req.citizenFirstName} ${req.citizenName}`,
                  confidence: decision.confidence,
                  reason: decision.reason,
                  timestamp: new Date().toISOString(),
                  serviceId: req.serviceId,
                  category: req.category,
                })
              }

              // Send notification
              if (decision.decision === 'validee') {
                sendNotification('success', 'Demande auto-validée', `${req.reference} (${req.serviceName}) — Confiance: ${decision.confidence}%`, req.reference)
              } else if (decision.decision === 'escaladee') {
                sendNotification('warning', 'Demande escaladée', `${req.reference} (${req.serviceName}) — ${decision.escalationReason || decision.reason}`, req.reference)
              } else if (decision.decision === 'rejetee') {
                sendNotification('error', 'Demande rejetée', `${req.reference} (${req.serviceName}) — ${decision.reason}`, req.reference)
              }

              processedCount++
            }
          }

          if (newLogs.length > 0) {
            const hourKey = getCurrentHourKey()
            const hourStatsUpdate: Record<string, HourlyStatsEntry> = {}

            // Count decisions for this batch
            const batchApproved = newLogs.filter(l => l.result === 'success').length
            const batchRejected = newLogs.filter(l => l.result === 'error').length
            const batchEscalated = newLogs.filter(l => l.result === 'escalade').length

            set((state) => {
              const existingHourStats = state.hourlyStats[hourKey] || { processed: 0, approved: 0, rejected: 0, escalated: 0 }
              return {
                logs: [...newLogs, ...state.logs],
                stats: computeStatsFromRequests(),
                autoProcessCount: state.autoProcessCount + newLogs.length,
                lastAutoProcessTime: new Date().toISOString(),
                escalationQueue: [...newEscalations, ...state.escalationQueue],
                hourlyStats: {
                  ...state.hourlyStats,
                  [hourKey]: {
                    processed: existingHourStats.processed + newLogs.length,
                    approved: existingHourStats.approved + batchApproved,
                    rejected: existingHourStats.rejected + batchRejected,
                    escalated: existingHourStats.escalated + batchEscalated,
                  },
                },
              }
            })
          }
        } else {
          // Standard simulation
          useCitizenRequestsStore.getState().aiAutoProcessAll()
          processedCount = pendingRequests.length

          const newLogs = pendingRequests.map((req, idx) => {
            const updatedReq = useCitizenRequestsStore.getState().getRequestById(req.id)
            const result: 'success' | 'warning' | 'error' | 'escalade' =
              updatedReq?.aiProcessingStatus === 'ai_auto_validated' || updatedReq?.aiProcessingStatus === 'ai_completed' ? 'success' :
              updatedReq?.aiProcessingStatus === 'ai_assisted' ? 'escalade' :
              updatedReq?.aiProcessingStatus === 'ai_auto_rejected' || updatedReq?.aiProcessingStatus === 'ai_failed' ? 'error' : 'success'

            return {
              id: `log-auto-${Date.now()}-${idx}`,
              requestId: req.id,
              reference: req.reference,
              serviceName: req.serviceName,
              citizenName: `${req.citizenFirstName} ${req.citizenName}`,
              action: `Auto-traitement IA (simulé) de ${req.reference}`,
              result,
              details: updatedReq?.aiProcessingDetails?.map(d => `${d.step}: ${d.message}`).join(' | ') || 'Traitement effectué',
              confidence: updatedReq?.aiConfidence || 0,
              timestamp: new Date().toISOString(),
              processingTime: 300 + Math.floor(Math.random() * 1000),
              realAI: false,
              serviceId: req.serviceId,
              category: req.category,
              autoProcessed: true,
            } as AIAgentLog
          })

          set((state) => ({
            logs: [...newLogs, ...state.logs],
            stats: computeStatsFromRequests(),
            autoProcessCount: state.autoProcessCount + newLogs.length,
            lastAutoProcessTime: new Date().toISOString(),
          }))
        }

        return processedCount
      },

      // ═══ ESCALATION ═════════════════════════════════════════════════════════

      resolveEscalation: (escalationId, action, note) => {
        const { escalationQueue } = get()
        const escalation = escalationQueue.find(e => e.id === escalationId)
        if (!escalation) return

        const now = new Date().toISOString()
        const noteText = note || (action === 'approve' ? 'Approuvé par l\'agent' : action === 'reject' ? 'Rejeté par l\'agent' : 'Documents complémentaires demandés')

        if (action === 'approve') {
          const reqStore = useCitizenRequestsStore.getState()
          reqStore.updateRequestStatus(escalation.requestId, 'validee', `Escalade résolue — ${noteText}`)
          reqStore.updateRequestAIFields(escalation.requestId, {
            aiProcessingStatus: 'ai_auto_validated',
            updatedAt: now,
          })
        } else if (action === 'reject') {
          const reqStore = useCitizenRequestsStore.getState()
          reqStore.updateRequestStatus(escalation.requestId, 'rejetee', `Escalade résolue — ${noteText}`)
          reqStore.updateRequestAIFields(escalation.requestId, {
            aiProcessingStatus: 'ai_auto_rejected',
            updatedAt: now,
          })
        } else {
          const reqStore = useCitizenRequestsStore.getState()
          reqStore.updateRequestStatus(escalation.requestId, 'pieces_complementaires', `Escalade résolue — ${noteText}`)
          reqStore.updateRequestAIFields(escalation.requestId, {
            updatedAt: now,
          })
        }

        // Log the resolution
        const newLog: AIAgentLog = {
          id: `log-esc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          requestId: escalation.requestId,
          reference: escalation.reference,
          serviceName: escalation.serviceName,
          citizenName: escalation.citizenName,
          action: `Résolution escalade: ${action === 'approve' ? 'Approuvé' : action === 'reject' ? 'Rejeté' : 'Docs complémentaires'} pour ${escalation.reference}`,
          result: action === 'approve' ? 'success' : action === 'reject' ? 'error' : 'warning',
          details: noteText,
          confidence: escalation.confidence,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          realAI: false,
          serviceId: escalation.serviceId,
          category: escalation.category,
          autoProcessed: false,
        }

        set((state) => ({
          escalationQueue: state.escalationQueue.filter(e => e.id !== escalationId),
          logs: [newLog, ...state.logs],
          stats: computeStatsFromRequests(),
        }))
      },

      clearEscalationQueue: () => set({ escalationQueue: [] }),

      // ═══ SERVICE RULES ENGINE ═══════════════════════════════════════════════

      toggleServiceRules: () => set((state) => ({ serviceRulesEnabled: !state.serviceRulesEnabled })),

      processWithRulesEngine: (requestId: string) => {
        const req = useCitizenRequestsStore.getState().requests.find(r => r.id === requestId)
        if (!req) return null

        const startTime = Date.now()
        const now = new Date().toISOString()

        // NIN verification — boost confidence if valid
        let ninBoost = 0
        const ninVerification = req.citizenNIN ? get().verifyNIN(req.citizenNIN) : null
        if (ninVerification?.valid) {
          ninBoost = 5
        }

        // Duplicate detection — reduce confidence if duplicates found
        const duplicates = get().detectDuplicates(requestId)
        let duplicatePenalty = 0
        if (duplicates.length > 0) {
          duplicatePenalty = 20
        }

        // Build decision context
        const providedDocs = (req.attachedFiles || []).filter(f => f.category === 'justificatif').length
        const ctx: AIDecisionContext = {
          serviceId: req.serviceId,
          serviceName: req.serviceName,
          category: req.category,
          providedDocs,
          requiredDocs: req.documents.length,
          attachedFiles: (req.attachedFiles || []).length,
          citizenNIN: req.citizenNIN,
          motif: req.motif,
          hasPriority: false,
          isComplete: providedDocs >= req.documents.length,
        }

        const decision = makeAIDecision(ctx)

        // Apply NIN boost and duplicate penalty
        decision.confidence = Math.min(100, Math.max(5, decision.confidence + ninBoost - duplicatePenalty))

        // Add duplicate info to reason if applicable
        if (duplicates.length > 0) {
          decision.reason += ` | ⚠️ ${duplicates.length} demande(s) en doublon détectée(s) — confiance réduite de 20 points`
        }

        // Build AI processing details
        const details: AIPProcessingDetail[] = [
          {
            step: 'Initialisation',
            status: 'success',
            message: `Moteur de règles IA prend en charge la demande ${req.reference} — Service: ${req.serviceName}`,
            timestamp: now,
            duration: Math.round((Date.now() - startTime) * 0.1),
          },
          {
            step: 'Vérification des pièces',
            status: ctx.isComplete ? 'success' : providedDocs > 0 ? 'warning' : 'error',
            message: ctx.isComplete
              ? `Toutes les pièces justificatives sont présentes (${providedDocs}/${req.documents.length})`
              : `Pièces partielles : ${providedDocs}/${req.documents.length} documents fournis`,
            timestamp: now,
            duration: Math.round((Date.now() - startTime) * 0.3),
          },
          {
            step: 'Vérification d\'identité',
            status: ninVerification?.valid ? 'success' : req.citizenNIN ? 'warning' : 'error',
            message: ninVerification?.valid
              ? `NIN vérifié : ${req.citizenNIN} — ${ninVerification.details}`
              : req.citizenNIN
                ? `NIN fourni mais non vérifiable : ${req.citizenNIN}`
                : 'NIN non disponible — vérification manuelle requise',
            timestamp: now,
            duration: Math.round((Date.now() - startTime) * 0.2),
          },
          {
            step: 'Détection de doublons',
            status: duplicates.length > 0 ? 'warning' : 'success',
            message: duplicates.length > 0
              ? `${duplicates.length} demande(s) en doublon détectée(s) pour ce citoyen`
              : 'Aucun doublon détecté',
            timestamp: now,
            duration: Math.round((Date.now() - startTime) * 0.15),
          },
          {
            step: decision.decision === 'validee' ? 'Validation automatique' :
                  decision.decision === 'escaladee' ? 'Escalade vers agent humain' :
                  decision.decision === 'pieces_complementaires' ? 'Demande de compléments' : 'Rejet automatique',
            status: decision.decision === 'validee' ? 'success' :
                    decision.decision === 'escaladee' ? 'warning' : 'error',
            message: decision.reason,
            timestamp: now,
            duration: Math.round((Date.now() - startTime) * 0.4),
          },
        ]

        // Map decision to status
        let newStatus: RequestStatus
        let aiStatus: CitizenRequest['aiProcessingStatus']

        switch (decision.decision) {
          case 'validee':
            newStatus = 'validee'
            aiStatus = 'ai_auto_validated'
            break
          case 'pieces_complementaires':
            newStatus = 'pieces_complementaires'
            aiStatus = 'ai_auto_rejected'
            break
          case 'rejetee':
            newStatus = 'rejetee'
            aiStatus = 'ai_auto_rejected'
            break
          case 'escaladee':
            newStatus = 'en_cours'
            aiStatus = 'ai_assisted'
            break
          default:
            newStatus = 'en_cours'
            aiStatus = 'ai_assisted'
        }

        // Build processing note
        const aiNote: ProcessingNote = {
          id: `note-rules-${Date.now()}`,
          author: 'Agent IA Autonome (Moteur de règles)',
          authorRole: 'IA',
          text: `🤖 Traitement IA autonome: ${decision.reason}. Confiance: ${decision.confidence}%. Décision: ${decision.decision}${decision.missingDocs.length > 0 ? `. Docs manquants: ${decision.missingDocs.join(', ')}` : ''}`,
          date: now,
          type: 'decision',
        }

        // Update timeline
        const newTimeline = (() => {
          const timeline = [...req.timeline]
          const statusProgress: Record<RequestStatus, number> = {
            soumise: 0, en_cours: 2, pieces_complementaires: 1,
            validee: 3, prete: 4, livree: 5, rejetee: 1,
          }
          const progress = statusProgress[newStatus]
          return timeline.map((step, i) => {
            if (i < progress) return { ...step, status: 'completed' as const, date: step.date || now }
            if (i === progress) return { ...step, status: 'current' as const, date: now }
            return step
          })
        })()

        // Update request using store actions
        useCitizenRequestsStore.getState().updateRequestAIFields(requestId, {
          status: newStatus,
          timeline: newTimeline,
          updatedAt: now,
          assignedAgent: req.assignedAgent || 'Agent IA Autonome',
          aiProcessingStatus: aiStatus,
          aiProcessingDate: now,
          aiConfidence: decision.confidence,
          aiProcessingDetails: details,
          processingNotes: [...req.processingNotes, aiNote],
        })

        return decision
      },

      // ═══ AUTO-START ON PAGE LOAD ═══════════════════════════════════════════

      initAutoProcessing: () => {
        const { isEnabled, isAutoProcessing } = get()
        if (isEnabled && !isAutoProcessing) {
          get().startAutoProcessing()
        }
      },

      // ═══ RETRY LOGIC ════════════════════════════════════════════════════════

      retryFailedRequest: (requestId: string) => {
        const { processingQueue, realAIMode, isProcessing } = get()
        // If the request is still in the queue, re-process it
        if (processingQueue.includes(requestId)) {
          if (realAIMode) {
            get().processNextWithRealAI()
          } else {
            get().processNext()
          }
        } else {
          // Add it back to the front of the queue
          set((state) => ({
            processingQueue: [requestId, ...state.processingQueue.filter(id => id !== requestId)],
          }))
          if (realAIMode) {
            get().processNextWithRealAI()
          } else {
            get().processNext()
          }
        }
      },

      // ═══ NIN VERIFICATION ═══════════════════════════════════════════════════

      verifyNIN: (nin: string): { valid: boolean; details: string } => {
        // Basic format validation for Guinea NIN (11-13 digits, alphanumeric)
        if (!nin || typeof nin !== 'string') {
          return { valid: false, details: 'NIN non fourni' }
        }

        const trimmed = nin.trim()

        // Check length: Guinea NIN is typically 11-13 alphanumeric characters
        if (trimmed.length < 11 || trimmed.length > 13) {
          return { valid: false, details: `Format invalide: ${trimmed.length} caractères (attendu: 11-13)` }
        }

        // Check alphanumeric format (may contain digits and letters)
        const ninPattern = /^[A-Za-z0-9]+$/
        if (!ninPattern.test(trimmed)) {
          return { valid: false, details: 'Format invalide: caractères non alphanumériques détectés' }
        }

        // ── Check against birth records database ──
        const birthRecord = findBirthRecordByNIN(trimmed)
        if (birthRecord) {
          if (birthRecord.status === 'cancelled') {
            return { valid: false, details: `NIN trouvé mais acte annulé — Motif: ${birthRecord.amendments?.[0]?.reason || 'Annulation administrative'}` }
          }
          return { valid: true, details: `NIN vérifié dans le registre d'état civil — ${birthRecord.firstName} ${birthRecord.lastName}, né(e) le ${new Date(birthRecord.dateOfBirth).toLocaleDateString('fr-FR')} à ${birthRecord.placeOfBirth}` }
        }

        // Also try NIN-YYYY-XXXXXX format (strip the NIN- prefix for lookup)
        const ninWithPrefix = /^NIN-\d{4}-\d{6}$/
        if (ninWithPrefix.test(trimmed)) {
          const yearPart = trimmed.split('-')[1]
          const year = parseInt(yearPart, 10)
          const currentYear = new Date().getFullYear()
          if (year < 1900 || year > currentYear) {
            return { valid: false, details: `Année invalide dans le NIN: ${year}` }
          }
          return { valid: true, details: `NIN valide (format NIN-YYYY-XXXXXX, année: ${year})` }
        }

        // Pure numeric NIN
        const numericNIN = /^\d{11,13}$/
        if (numericNIN.test(trimmed)) {
          return { valid: true, details: `NIN numérique valide (${trimmed.length} chiffres) — non trouvé dans le registre` }
        }

        // Alphanumeric NIN
        const alphanumericNIN = /^[A-Z0-9]{11,13}$/i
        if (alphanumericNIN.test(trimmed)) {
          return { valid: true, details: `NIN alphanumérique valide (${trimmed.length} caractères) — non trouvé dans le registre` }
        }

        return { valid: false, details: 'Format NIN non reconnu' }
      },

      // ═══ DUPLICATE DETECTION ════════════════════════════════════════════════

      detectDuplicates: (requestId: string): CitizenRequest[] => {
        const requests = useCitizenRequestsStore.getState().requests
        const currentReq = requests.find(r => r.id === requestId)
        if (!currentReq) return []

        return requests.filter(r => {
          // Skip self
          if (r.id === requestId) return false

          // Must be same service type
          if (r.serviceId !== currentReq.serviceId) return false

          // Check by NIN match
          if (currentReq.citizenNIN && r.citizenNIN && currentReq.citizenNIN === r.citizenNIN) {
            return true
          }

          // Check by name + approximate match (same first name + last name)
          const sameName = r.citizenName === currentReq.citizenName &&
                          r.citizenFirstName === currentReq.citizenFirstName
          if (sameName) {
            return true
          }

          return false
        })
      },

      // ═══ PROCESSING PRIORITY ════════════════════════════════════════════════

      setProcessingPriority: (priority: string) => {
        const validPriorities: Array<'fifo' | 'urgency' | 'complexity' | 'age'> = ['fifo', 'urgency', 'complexity', 'age']
        if (validPriorities.includes(priority as any)) {
          set({ processingPriority: priority as 'fifo' | 'urgency' | 'complexity' | 'age' })
        }
      },

      // ═══ HEALTH CHECK ═══════════════════════════════════════════════════════

      checkHealth: () => {
        const { lastHeartbeat, autoProcessDelay, isAutoProcessing } = get()
        const now = Date.now()

        // Check if heartbeat is within 2x autoProcessDelay
        let healthy = false
        let lastHB = lastHeartbeat || 'Jamais'
        let nextCycle = 'Inactif'

        if (lastHeartbeat) {
          const hbTime = new Date(lastHeartbeat).getTime()
          const maxAge = autoProcessDelay * 2 * 1000
          healthy = (now - hbTime) < maxAge
          lastHB = lastHeartbeat

          if (isAutoProcessing) {
            const nextTime = new Date(hbTime + autoProcessDelay * 1000)
            nextCycle = nextTime.toISOString()
          }
        } else {
          healthy = false
        }

        // Update health state
        set({ isHealthy: healthy })

        return {
          healthy,
          lastHeartbeat: lastHB,
          nextCycle,
        }
      },

      // ═══ HOURLY STATS ═══════════════════════════════════════════════════════

      getHourlyStats: (hours: number) => {
        const { hourlyStats } = get()
        const result: Record<string, HourlyStatsEntry> = {}
        const now = new Date()

        for (let i = 0; i < hours; i++) {
          const d = new Date(now.getTime() - i * 60 * 60 * 1000)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}`
          if (hourlyStats[key]) {
            result[key] = hourlyStats[key]
          }
        }

        return result
      },

      // ═══ HELPER: Sort requests by priority ═════════════════════════════════

      sortByPriority: (requests: CitizenRequest[]): CitizenRequest[] => {
        const { processingPriority } = get()

        const sorted = [...requests]

        switch (processingPriority) {
          case 'urgency': {
            // Process urgent services first (priorityLevel 1 = urgent)
            sorted.sort((a, b) => {
              const ruleA = getServiceRule(a.serviceId)
              const ruleB = getServiceRule(b.serviceId)
              const priorityA = ruleA?.priorityLevel ?? 2
              const priorityB = ruleB?.priorityLevel ?? 2
              return priorityA - priorityB  // Lower number = higher priority
            })
            break
          }
          case 'complexity': {
            // Process simple services first (faster resolution)
            const complexityOrder: Record<string, number> = { simple: 0, standard: 1, complexe: 2 }
            sorted.sort((a, b) => {
              const ruleA = getServiceRule(a.serviceId)
              const ruleB = getServiceRule(b.serviceId)
              const complexA = complexityOrder[ruleA?.complexity ?? 'standard'] ?? 1
              const complexB = complexityOrder[ruleB?.complexity ?? 'standard'] ?? 1
              return complexA - complexB  // Simpler first
            })
            break
          }
          case 'age': {
            // Process oldest requests first (FIFO with actual age)
            sorted.sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime()
              const dateB = new Date(b.createdAt).getTime()
              return dateA - dateB  // Oldest first
            })
            break
          }
          case 'fifo':
          default:
            // Keep original order (already FIFO)
            break
        }

        return sorted
      },

      // ═══ HELPER: Build decision explanation ════════════════════════════════

      buildDecisionExplanation: (
        requestId: string,
        decision: AIDecision,
        rule: ReturnType<typeof getServiceRule>
      ): AIDecisionExplanation => {
        const req = useCitizenRequestsStore.getState().requests.find(r => r.id === requestId)
        if (!req || !rule) {
          return {
            factors: [],
            totalWeightedScore: decision.confidence,
            decisionThreshold: 70,
            reasoningChain: ['Analyse basique effectuée'],
          }
        }

        const providedDocs = (req.attachedFiles || []).filter(f => f.category === 'justificatif').length
        const docRatio = rule.requiredDocuments.length > 0
          ? Math.min(providedDocs / rule.requiredDocuments.length, 1)
          : 1
        const isComplete = providedDocs >= rule.requiredDocuments.length

        const factors: AIDecisionExplanation['factors'] = []

        // Factor 1: Document completeness (40%)
        const docScore = docRatio * 100
        factors.push({
          name: 'Complétude documents',
          weight: 40,
          score: Math.round(docScore),
          contribution: Math.round(docScore * 0.4),
          description: `${providedDocs}/${rule.requiredDocuments.length} documents fournis. ${isComplete ? 'Dossier complet.' : 'Documents manquants.'}`,
        })

        // Factor 2: NIN availability (15%)
        const ninVerification = req.citizenNIN ? get().verifyNIN(req.citizenNIN) : null
        const ninScore = ninVerification?.valid ? 100 : req.citizenNIN ? 50 : 30
        factors.push({
          name: 'Vérification identité (NIN)',
          weight: 15,
          score: ninScore,
          contribution: Math.round(ninScore * 0.15),
          description: ninVerification?.valid
            ? `NIN vérifié: ${req.citizenNIN}`
            : req.citizenNIN
              ? `NIN fourni mais non vérifié: ${req.citizenNIN}`
              : 'NIN non disponible',
        })

        // Factor 3: Auto-approval policy (25%)
        let policyScore = 0
        let policyDesc = ''
        switch (rule.autoApproval) {
          case 'always':
            policyScore = 100
            policyDesc = 'Auto-approbation systématique'
            break
          case 'if_complete':
            policyScore = isComplete ? 90 : 40
            policyDesc = isComplete ? 'Dossier complet, auto-approbation possible' : 'Dossier incomplet, auto-approbation conditionnelle'
            break
          case 'never':
            policyScore = 20
            policyDesc = 'Validation humaine obligatoire'
            break
          case 'supervisor_only':
            policyScore = 30
            policyDesc = 'Approbation superviseur requise'
            break
        }
        factors.push({
          name: 'Politique auto-approbation',
          weight: 25,
          score: policyScore,
          contribution: Math.round(policyScore * 0.25),
          description: policyDesc,
        })

        // Factor 4: Service complexity (10%)
        let complexityScore = 0
        let complexityDesc = ''
        switch (rule.complexity) {
          case 'simple':
            complexityScore = 95
            complexityDesc = 'Service simple — traitement rapide possible'
            break
          case 'standard':
            complexityScore = 75
            complexityDesc = 'Service standard — vérifications nécessaires'
            break
          case 'complexe':
            complexityScore = 50
            complexityDesc = 'Service complexe — révision humaine souvent requise'
            break
        }
        factors.push({
          name: 'Complexité service',
          weight: 10,
          score: complexityScore,
          contribution: Math.round(complexityScore * 0.1),
          description: complexityDesc,
        })

        // Factor 5: Priority level (10%)
        let priorityScore = 0
        let priorityDesc = ''
        switch (rule.priorityLevel) {
          case 1:
            priorityScore = 90
            priorityDesc = 'Priorité urgente — traitement prioritaire'
            break
          case 2:
            priorityScore = 70
            priorityDesc = 'Priorité normale'
            break
          case 3:
            priorityScore = 50
            priorityDesc = 'Priorité basse — traitement différé possible'
            break
        }
        factors.push({
          name: 'Priorité',
          weight: 10,
          score: priorityScore,
          contribution: Math.round(priorityScore * 0.1),
          description: priorityDesc,
        })

        const totalWeightedScore = factors.reduce((sum, f) => sum + f.contribution, 0)

        // Build reasoning chain
        const reasoningChain: string[] = [
          `1. Service: ${rule.serviceName} (${rule.category}) — Complexité: ${rule.complexity}`,
          `2. Documents: ${providedDocs}/${rule.requiredDocuments.length} fournis ${isComplete ? '✅' : '❌'}`,
          `3. NIN: ${ninVerification?.valid ? 'Vérifié ✅' : req.citizenNIN ? 'Non vérifié ⚠️' : 'Absent ❌'}`,
          `4. Politique: ${rule.autoApproval} — Score: ${policyScore}`,
          `5. Confiance calculée: ${totalWeightedScore}% (seuil: 70%)`,
          `6. Décision: ${decision.decision} — ${decision.reason}`,
        ]

        // Add duplicate info to reasoning
        const duplicates = get().detectDuplicates(requestId)
        if (duplicates.length > 0) {
          reasoningChain.push(`7. ⚠️ ${duplicates.length} doublon(s) détecté(s) — confiance réduite`)
        }

        return {
          factors,
          totalWeightedScore,
          decisionThreshold: 70,
          reasoningChain,
        }
      },
    }),
    {
      name: 'ai-agent-store',
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        realAIMode: state.realAIMode,
        autoProcessDelay: state.autoProcessDelay,
        confidenceThreshold: state.confidenceThreshold,
        serviceRulesEnabled: state.serviceRulesEnabled,
        autoProcessCount: state.autoProcessCount,
        retryAttempts: state.retryAttempts,
        maxRetries: state.maxRetries,
        processingPriority: state.processingPriority,
        lastHeartbeat: state.lastHeartbeat,
      }),
    }
  )
)
