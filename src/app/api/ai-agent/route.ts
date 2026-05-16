import ZAI from 'z-ai-web-dev-sdk'
import { NextRequest, NextResponse } from 'next/server'
import {
  getServiceRule,
  buildServiceSystemPrompt,
  getAllServiceRules,
  getRulesByCategory,
} from '@/lib/ai-service-rules'

// ─── Rate Limiter (in-memory) ──────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  windowStart: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 30 // max requests per minute per IP
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60_000 // 5 minutes

let lastCleanup = Date.now()

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }
  return 'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  // Periodic cleanup
  const now = Date.now()
  if (now - lastCleanup > RATE_LIMIT_CLEANUP_INTERVAL_MS) {
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key)
      }
    }
    lastCleanup = now
  }

  const entry = rateLimitMap.get(ip)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) }
  }

  entry.count++
  return { allowed: true, retryAfterMs: 0 }
}

// ─── Request Logging (in-memory) ───────────────────────────────────────────────

interface ProcessingLogEntry {
  timestamp: string
  action: string
  ip: string
  serviceId?: string
  processingTimeMs: number
  success: boolean
  error?: string
}

const processingLogs: ProcessingLogEntry[] = []
const MAX_LOGS = 100

function addLog(entry: ProcessingLogEntry) {
  processingLogs.push(entry)
  if (processingLogs.length > MAX_LOGS) {
    processingLogs.shift()
  }
}

function computeStats() {
  const total = processingLogs.length
  if (total === 0) {
    return {
      totalCalls: 0,
      successRate: 0,
      avgProcessingTimeMs: 0,
      callsPerAction: {},
    }
  }

  const successCount = processingLogs.filter((l) => l.success).length
  const totalTime = processingLogs.reduce((s, l) => s + l.processingTimeMs, 0)
  const callsPerAction: Record<string, number> = {}
  for (const log of processingLogs) {
    callsPerAction[log.action] = (callsPerAction[log.action] || 0) + 1
  }

  return {
    totalCalls: total,
    successRate: Math.round((successCount / total) * 100),
    avgProcessingTimeMs: Math.round(totalTime / total),
    callsPerAction,
  }
}

// ─── Timeout helper ────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Délai d'attente dépassé (${ms}ms) pour l'action "${label}". Veuillez réessayer.`))
    }, ms)
    promise.then(
      (val) => {
        clearTimeout(timer)
        resolve(val)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

// ─── NIN Validation ────────────────────────────────────────────────────────────

function validateNIN(nin: string): { valid: boolean; format: string; details: string } {
  if (!nin || typeof nin !== 'string') {
    return {
      valid: false,
      format: 'inconnu',
      details: 'NIN non fourni ou format invalide.',
    }
  }

  const trimmed = nin.trim()

  // Guinea NIN: 11-13 alphanumeric characters, typically starts with GN or digits
  const gnPattern = /^GN[A-Za-z0-9]{9,11}$/
  const numericPattern = /^[0-9]{11,13}$/
  const alphanumericPattern = /^[A-Za-z0-9]{11,13}$/

  if (gnPattern.test(trimmed)) {
    return {
      valid: true,
      format: 'GN-prefix',
      details: `NIN au format GN valide (${trimmed.length} caractères). Format standard guinéen avec préfixe GN.`,
    }
  }

  if (numericPattern.test(trimmed)) {
    return {
      valid: true,
      format: 'numeric',
      details: `NIN numérique valide (${trimmed.length} chiffres). Format national guinéen.`,
    }
  }

  if (alphanumericPattern.test(trimmed)) {
    return {
      valid: true,
      format: 'alphanumeric',
      details: `NIN alphanumérique valide (${trimmed.length} caractères). Format accepté par le système guinéen.`,
    }
  }

  // Invalid cases
  if (trimmed.length < 11) {
    return {
      valid: false,
      format: 'too_short',
      details: `NIN trop court (${trimmed.length} caractères). Le NIN guinéen doit contenir entre 11 et 13 caractères alphanumériques.`,
    }
  }

  if (trimmed.length > 13) {
    return {
      valid: false,
      format: 'too_long',
      details: `NIN trop long (${trimmed.length} caractères). Le NIN guinéen doit contenir entre 11 et 13 caractères alphanumériques.`,
    }
  }

  return {
    valid: false,
    format: 'invalid_chars',
    details: `NIN contient des caractères non valides. Le NIN guinéen doit être composé de 11 à 13 caractères alphanumériques (éventuellement précédé de GN).`,
  }
}

// ─── Error response helper ─────────────────────────────────────────────────────

function structuredError(error: unknown, action: string) {
  const message =
    error instanceof Error ? error.message : String(error || 'Erreur interne du serveur IA')

  const isTimeout = message.includes('Délai d\'attente dépassé')
  const suggestion = isTimeout
    ? 'Réessayez dans quelques instants. Si le problème persiste, contactez le support technique.'
    : 'Vérifiez les données envoyées et réessayez. Si le problème persiste, contactez le support technique.'

  return {
    success: false,
    error: message,
    action,
    suggestion,
    timestamp: new Date().toISOString(),
  }
}

// ─── Main POST Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const ip = getClientIP(request)
  let action = 'unknown'
  let serviceId: string | undefined

  // ── Rate limiting ──
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez réessayer dans quelques secondes.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) },
      }
    )
  }

  // ── Parse body ──
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Corps de requête JSON invalide.' },
      { status: 400 }
    )
  }

  action = body.action || 'unknown'
  const data = body.data || {}

  // ── Route to actions ──
  try {
    switch (action) {
      // ─────────────────────────────────────────────────────────────────────────
      // 1. PROCESS-REQUEST (original, enhanced with error recovery + timeout)
      // ─────────────────────────────────────────────────────────────────────────
      case 'process-request': {
        const { request: citizenRequest, systemPrompt } = data

        if (!citizenRequest) {
          return NextResponse.json(
            { error: 'Données de demande manquantes (champ "request" requis).' },
            { status: 400 }
          )
        }

        serviceId = citizenRequest.serviceId

        let finalSystemPrompt = systemPrompt

        if (!finalSystemPrompt && citizenRequest.serviceId) {
          finalSystemPrompt = buildServiceSystemPrompt(citizenRequest.serviceId)
        }

        if (!finalSystemPrompt) {
          finalSystemPrompt = `Tu es un agent IA autonome de l'administration guinéenne. Tu analyses les demandes de services publics et détermines si elles doivent être automatiquement validées, si des pièces complémentaires sont nécessaires, ou si elles doivent être rejetées. Réponds UNIQUEMENT en JSON valide avec ce format: { "decision": "validee" | "pieces_complementaires" | "rejetee" | "escaladee", "confidence": 0-100, "reason": "explication courte en français", "missingDocs": ["doc1", "doc2"], "estimatedDays": nombre, "needsHumanReview": true/false }`
        }

        const serviceRule = citizenRequest.serviceId
          ? getServiceRule(citizenRequest.serviceId)
          : null
        const additionalContext = serviceRule
          ? `

INFORMATIONS SUPPLÉMENTAIRES DU MOTEUR DE RÈGLES:
- Complexité du service: ${serviceRule.complexity}
- Politique d'auto-approbation: ${serviceRule.autoApproval}
- Confiance maximum sans validation humaine: ${serviceRule.maxConfidenceWithoutHuman}%
- Délai de traitement estimé: ${serviceRule.estimatedProcessingDays} jours
- Niveau de priorité: ${serviceRule.priorityLevel} (1=urgent, 2=normal, 3=basse)
- Nécessite signature superviseur: ${serviceRule.requiresSupervisorSignature ? 'OUI' : 'NON'}
- Critères d'éligibilité: ${serviceRule.eligibilityCriteria.join(', ')}
- Motifs de rejet courants: ${serviceRule.rejectionReasons.join('; ')}
- Déclencheurs d'escalade: ${serviceRule.escalationTriggers.join('; ')}`
          : ''

        try {
          const zai = await ZAI.create()
          const completion = await withTimeout(
            zai.chat.completions.create({
              messages: [
                {
                  role: 'system',
                  content: finalSystemPrompt + additionalContext,
                },
                {
                  role: 'user',
                  content: `Analyse cette demande de service public guinéen:
Service: ${citizenRequest.serviceName} (ID: ${citizenRequest.serviceId || 'N/A'})
Catégorie: ${citizenRequest.category}
Citoyen: ${citizenRequest.citizenFirstName} ${citizenRequest.citizenName}
NIN: ${citizenRequest.citizenNIN || 'Non fourni'}
Motif: ${citizenRequest.motif}
Documents requis: ${citizenRequest.documents?.join(', ') || 'N/A'}
Documents fournis: ${citizenRequest.attachedFiles?.length || 0} fichier(s)
Statut actuel: ${citizenRequest.status}
${serviceRule ? `Documents requis spécifiques: ${serviceRule.requiredDocuments.join(', ')}` : ''}

Prends ta décision en te basant sur les règles du service et l'exhaustivité du dossier.`,
                },
              ],
            }),
            30_000,
            'process-request'
          )

          const aiResponse = completion.choices[0]?.message?.content || ''
          const processingTime = Date.now() - startTime
          addLog({ timestamp: new Date().toISOString(), action, ip, serviceId, processingTimeMs: processingTime, success: true })

          return NextResponse.json({ success: true, aiResponse, model: completion.model })
        } catch (aiError) {
          const processingTime = Date.now() - startTime
          addLog({
            timestamp: new Date().toISOString(),
            action,
            ip,
            serviceId,
            processingTimeMs: processingTime,
            success: false,
            error: aiError instanceof Error ? aiError.message : String(aiError),
          })
          return NextResponse.json(structuredError(aiError, action), { status: 500 })
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 2. CHAT (enhanced with stats awareness, Guinea admin, maxMessages, better error handling)
      // ─────────────────────────────────────────────────────────────────────────
      case 'chat': {
        const { message, history, maxMessages } = data

        if (!message || typeof message !== 'string') {
          return NextResponse.json(
            { error: 'Le champ "message" est requis et doit être une chaîne de caractères.' },
            { status: 400 }
          )
        }

        const limit = typeof maxMessages === 'number' && maxMessages > 0 ? maxMessages : 6

        // Gather current stats for awareness
        const stats = computeStats()

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          {
            role: 'system',
            content: `Tu es l'assistant virtuel de la plateforme eAdministration Suite de la République de Guinée. Tu aides les citoyens et les agents administratifs avec leurs questions sur les démarches administratives, les services publics, et l'utilisation de la plateforme.

Tu es professionnel, courtois, et précis. Tu réponds en français. Tu connais les 28 services publics guinéens répartis en 10 catégories:

1. ÉTAT CIVIL (6 services): Acte de naissance, Acte de mariage, Acte de décès, Certificat de nationalité, Acte de reconnaissance, Changement de nom
2. JUSTICE (3 services): Casier judiciaire, Certificat de non-poursuite, Légalisation de documents
3. IDENTIFICATION (3 services): Carte d'identité nationale, Passeport biométrique, Permis de conduire
4. URBANISME (3 services): Permis de construire, Certificat de conformité, Titre foncier
5. ENTREPRISE (2 services): Enregistrement entreprise, Registre de commerce
6. ÉDUCATION (3 services): Bourse d'étude, Duplicata diplôme, Équivalence de diplôme
7. SANTÉ (2 services): Carnet de vaccination, Carte d'assuré social
8. RÉSIDENCE (2 services): Certificat de résidence, Attestation de domicile
9. FISCALITÉ (2 services): Attestation fiscale, Déclaration d'impôts
10. SOCIAL (2 services): Allocations familiales, Pension de retraite

STRUCTURE ADMINISTRATIVE DE LA GUINÉE:
- Présidence de la République
- Gouvernement (Premier ministre et ministères)
- Ministères clés: Justice, Intérieur (MATD), Éducation, Santé, Urbanisme, Finances/DGI, Affaires sociales
- Collectivités locales: 5 communes de Conakry (Kaloum, Dixinn, Matam, Ratoma, Matoto)
- Agences spécialisées: ANIP (identification), APIP (promotion investissement), CNSS (sécurité sociale), DGMA
- Système judiciaire: Cour Suprême, Cours d'Appel, Tribunaux de Première Instance, Justices de Paix
- Décentralisation: 8 régions administratives, 33 préfectures, 303 sous-préfectures

INFORMATIONS SYSTÈME EN TEMPS RÉEL:
- Statistiques de traitement: ${stats.totalCalls} requêtes traitées, taux de réussite ${stats.successRate}%, temps moyen ${stats.avgProcessingTimeMs}ms
- Services les plus demandés: ${Object.entries(stats.callsPerAction).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(', ') || 'Aucune donnée'}

Tu peux guider les citoyens sur les documents à fournir, les délais de traitement, les frais éventuels, et les démarches à suivre. Tu connais les règles spécifiques de chaque service guinéen. Si une question dépasse tes compétences, oriente vers l'institution appropriée.`,
          },
        ]

        if (history && Array.isArray(history)) {
          const validHistory = history.filter(
            (msg: any) =>
              msg &&
              typeof msg === 'object' &&
              typeof msg.role === 'string' &&
              typeof msg.content === 'string' &&
              (msg.role === 'user' || msg.role === 'assistant')
          )
          for (const msg of validHistory.slice(-limit)) {
            messages.push({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
            })
          }
        }

        messages.push({
          role: 'user',
          content: message,
        })

        try {
          const zai = await ZAI.create()
          const completion = await withTimeout(
            zai.chat.completions.create({ messages }),
            30_000,
            'chat'
          )

          const processingTime = Date.now() - startTime
          addLog({ timestamp: new Date().toISOString(), action, ip, processingTimeMs: processingTime, success: true })

          return NextResponse.json({
            success: true,
            message: completion.choices[0]?.message?.content,
            model: completion.model,
          })
        } catch (aiError) {
          const processingTime = Date.now() - startTime
          addLog({
            timestamp: new Date().toISOString(),
            action,
            ip,
            processingTimeMs: processingTime,
            success: false,
            error: aiError instanceof Error ? aiError.message : String(aiError),
          })
          return NextResponse.json(structuredError(aiError, action), { status: 500 })
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 3. TEST (enhanced with error recovery)
      // ─────────────────────────────────────────────────────────────────────────
      case 'test': {
        try {
          const zai = await ZAI.create()
          const completion = await withTimeout(
            zai.chat.completions.create({
              messages: [
                {
                  role: 'system',
                  content: 'Réponds brièvement en français. Tu es un assistant de test.',
                },
                {
                  role: 'user',
                  content: 'Confirme que tu es opérationnel en une phrase courte.',
                },
              ],
            }),
            30_000,
            'test'
          )

          const processingTime = Date.now() - startTime
          addLog({ timestamp: new Date().toISOString(), action, ip, processingTimeMs: processingTime, success: true })

          return NextResponse.json({
            success: true,
            message: completion.choices[0]?.message?.content,
            model: completion.model,
          })
        } catch (aiError) {
          const processingTime = Date.now() - startTime
          addLog({
            timestamp: new Date().toISOString(),
            action,
            ip,
            processingTimeMs: processingTime,
            success: false,
            error: aiError instanceof Error ? aiError.message : String(aiError),
          })
          return NextResponse.json(structuredError(aiError, action), { status: 500 })
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 4. LOGS — return last 100 server-side processing logs
      // ─────────────────────────────────────────────────────────────────────────
      case 'logs': {
        const processingTime = Date.now() - startTime
        addLog({ timestamp: new Date().toISOString(), action, ip, processingTimeMs: processingTime, success: true })

        return NextResponse.json({
          success: true,
          logs: processingLogs.slice(-MAX_LOGS),
          total: processingLogs.length,
        })
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 5. STATS — return processing statistics
      // ─────────────────────────────────────────────────────────────────────────
      case 'stats': {
        const processingTime = Date.now() - startTime
        addLog({ timestamp: new Date().toISOString(), action, ip, processingTimeMs: processingTime, success: true })

        const stats = computeStats()
        return NextResponse.json({
          success: true,
          stats,
        })
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 6. BATCH-PROCESS — process up to 10 requests sequentially
      // ─────────────────────────────────────────────────────────────────────────
      case 'batch-process': {
        const { requests } = data

        if (!Array.isArray(requests)) {
          return NextResponse.json(
            { error: 'Le champ "requests" doit être un tableau.' },
            { status: 400 }
          )
        }

        if (requests.length === 0) {
          return NextResponse.json(
            { error: 'Le tableau "requests" ne peut pas être vide.' },
            { status: 400 }
          )
        }

        if (requests.length > 10) {
          return NextResponse.json(
            { error: 'Maximum 10 requêtes par traitement par lot.' },
            { status: 400 }
          )
        }

        const results: Array<{
          requestId: number
          success: boolean
          decision?: string
          confidence?: number
          reason?: string
          error?: string
        }> = []

        for (let i = 0; i < requests.length; i++) {
          const req = requests[i]
          const requestStartTime = Date.now()

          try {
            const citizenRequest = req.request || req
            const servicePrompt = req.systemPrompt
            const reqServiceId = citizenRequest.serviceId

            let finalSystemPrompt = servicePrompt
            if (!finalSystemPrompt && reqServiceId) {
              finalSystemPrompt = buildServiceSystemPrompt(reqServiceId)
            }

            if (!finalSystemPrompt) {
              finalSystemPrompt = `Tu es un agent IA autonome de l'administration guinéenne. Tu analyses les demandes de services publics et détermines si elles doivent être automatiquement validées, si des pièces complémentaires sont nécessaires, ou si elles doivent être rejetées. Réponds UNIQUEMENT en JSON valide avec ce format: { "decision": "validee" | "pieces_complementaires" | "rejetee" | "escaladee", "confidence": 0-100, "reason": "explication courte en français", "missingDocs": ["doc1", "doc2"], "estimatedDays": nombre, "needsHumanReview": true/false }`
            }

            const serviceRule = reqServiceId ? getServiceRule(reqServiceId) : null
            const additionalContext = serviceRule
              ? `

INFORMATIONS SUPPLÉMENTAIRES DU MOTEUR DE RÈGLES:
- Complexité du service: ${serviceRule.complexity}
- Politique d'auto-approbation: ${serviceRule.autoApproval}
- Confiance maximum sans validation humaine: ${serviceRule.maxConfidenceWithoutHuman}%
- Délai de traitement estimé: ${serviceRule.estimatedProcessingDays} jours
- Niveau de priorité: ${serviceRule.priorityLevel} (1=urgent, 2=normal, 3=basse)
- Nécessite signature superviseur: ${serviceRule.requiresSupervisorSignature ? 'OUI' : 'NON'}
- Critères d'éligibilité: ${serviceRule.eligibilityCriteria.join(', ')}
- Motifs de rejet courants: ${serviceRule.rejectionReasons.join('; ')}
- Déclencheurs d'escalade: ${serviceRule.escalationTriggers.join('; ')}`
              : ''

            const zai = await ZAI.create()
            const completion = await withTimeout(
              zai.chat.completions.create({
                messages: [
                  {
                    role: 'system',
                    content: finalSystemPrompt + additionalContext,
                  },
                  {
                    role: 'user',
                    content: `Analyse cette demande de service public guinéen:
Service: ${citizenRequest.serviceName || 'N/A'} (ID: ${reqServiceId || 'N/A'})
Catégorie: ${citizenRequest.category || 'N/A'}
Citoyen: ${citizenRequest.citizenFirstName || ''} ${citizenRequest.citizenName || ''}
NIN: ${citizenRequest.citizenNIN || 'Non fourni'}
Motif: ${citizenRequest.motif || 'N/A'}
Documents requis: ${citizenRequest.documents?.join(', ') || 'N/A'}
Documents fournis: ${citizenRequest.attachedFiles?.length || 0} fichier(s)
Statut actuel: ${citizenRequest.status || 'N/A'}
${serviceRule ? `Documents requis spécifiques: ${serviceRule.requiredDocuments.join(', ')}` : ''}

Prends ta décision en te basant sur les règles du service et l'exhaustivité du dossier.`,
                  },
                ],
              }),
              30_000,
              `batch-process[${i}]`
            )

            const aiResponse = completion.choices[0]?.message?.content || ''

            // Try to parse AI response as JSON for structured result
            let parsedDecision: string | undefined
            let parsedConfidence: number | undefined
            let parsedReason: string | undefined

            try {
              const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                parsedDecision = parsed.decision
                parsedConfidence = parsed.confidence
                parsedReason = parsed.reason
              }
            } catch {
              // AI response not JSON — use raw
            }

            const requestTime = Date.now() - requestStartTime
            addLog({
              timestamp: new Date().toISOString(),
              action: 'batch-process-item',
              ip,
              serviceId: reqServiceId,
              processingTimeMs: requestTime,
              success: true,
            })

            results.push({
              requestId: i,
              success: true,
              decision: parsedDecision || 'indeterminé',
              confidence: parsedConfidence ?? 0,
              reason: parsedReason || aiResponse,
            })
          } catch (itemError) {
            const requestTime = Date.now() - requestStartTime
            addLog({
              timestamp: new Date().toISOString(),
              action: 'batch-process-item',
              ip,
              serviceId: req?.request?.serviceId || req?.serviceId,
              processingTimeMs: requestTime,
              success: false,
              error: itemError instanceof Error ? itemError.message : String(itemError),
            })

            results.push({
              requestId: i,
              success: false,
              error: itemError instanceof Error ? itemError.message : String(itemError),
            })
          }
        }

        const totalProcessingTime = Date.now() - startTime
        addLog({
          timestamp: new Date().toISOString(),
          action,
          ip,
          processingTimeMs: totalProcessingTime,
          success: results.some((r) => r.success),
        })

        return NextResponse.json({
          success: true,
          results,
          totalProcessed: results.length,
          successCount: results.filter((r) => r.success).length,
          failureCount: results.filter((r) => !r.success).length,
        })
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 7. VERIFY-NIN — validate Guinea National Identification Number
      // ─────────────────────────────────────────────────────────────────────────
      case 'verify-nin': {
        const { nin } = data

        if (!nin || typeof nin !== 'string') {
          return NextResponse.json(
            { error: 'Le champ "nin" est requis et doit être une chaîne de caractères.' },
            { status: 400 }
          )
        }

        const result = validateNIN(nin)
        const processingTime = Date.now() - startTime
        addLog({ timestamp: new Date().toISOString(), action, ip, processingTimeMs: processingTime, success: true })

        return NextResponse.json({
          success: true,
          valid: result.valid,
          format: result.format,
          details: result.details,
        })
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 8. GET-RULES — query service rules
      // ─────────────────────────────────────────────────────────────────────────
      case 'get-rules': {
        const { serviceId: queryServiceId, category } = data

        if (queryServiceId) {
          // Return specific rule
          const rule = getServiceRule(queryServiceId)
          if (!rule) {
            const processingTime = Date.now() - startTime
            addLog({ timestamp: new Date().toISOString(), action, ip, serviceId: queryServiceId, processingTimeMs: processingTime, success: false, error: 'Service non trouvé' })
            return NextResponse.json(
              { error: `Service "${queryServiceId}" non trouvé dans le moteur de règles.` },
              { status: 404 }
            )
          }
          const processingTime = Date.now() - startTime
          addLog({ timestamp: new Date().toISOString(), action, ip, serviceId: queryServiceId, processingTimeMs: processingTime, success: true })
          return NextResponse.json({ success: true, rule })
        }

        if (category) {
          // Return all rules in category
          const rules = getRulesByCategory(category)
          if (rules.length === 0) {
            const processingTime = Date.now() - startTime
            addLog({ timestamp: new Date().toISOString(), action, ip, processingTimeMs: processingTime, success: false, error: 'Catégorie non trouvée' })
            return NextResponse.json(
              { error: `Aucun service trouvé dans la catégorie "${category}".` },
              { status: 404 }
            )
          }
          const processingTime = Date.now() - startTime
          addLog({ timestamp: new Date().toISOString(), action, ip, processingTimeMs: processingTime, success: true })
          return NextResponse.json({ success: true, category, rules, count: rules.length })
        }

        // Return all rules summary
        const allRules = getAllServiceRules()
        const summary = allRules.map((r) => ({
          serviceId: r.serviceId,
          serviceName: r.serviceName,
          category: r.category,
          complexity: r.complexity,
          autoApproval: r.autoApproval,
          estimatedProcessingDays: r.estimatedProcessingDays,
          priorityLevel: r.priorityLevel,
        }))

        const categoriesMap: Record<string, number> = {}
        for (const r of allRules) {
          categoriesMap[r.category] = (categoriesMap[r.category] || 0) + 1
        }

        const processingTime = Date.now() - startTime
        addLog({ timestamp: new Date().toISOString(), action, ip, processingTimeMs: processingTime, success: true })

        return NextResponse.json({
          success: true,
          totalServices: allRules.length,
          categories: categoriesMap,
          rules: summary,
        })
      }

      // ─────────────────────────────────────────────────────────────────────────
      // DEFAULT — unknown action
      // ─────────────────────────────────────────────────────────────────────────
      default: {
        const processingTime = Date.now() - startTime
        addLog({
          timestamp: new Date().toISOString(),
          action,
          ip,
          processingTimeMs: processingTime,
          success: false,
          error: 'Action non reconnue',
        })
        return NextResponse.json(
          {
            error: 'Action non reconnue',
            availableActions: [
              'process-request',
              'chat',
              'test',
              'logs',
              'stats',
              'batch-process',
              'verify-nin',
              'get-rules',
            ],
          },
          { status: 400 }
        )
      }
    }
  } catch (error: any) {
    // Top-level catch-all (should not normally be reached due to per-action try/catch)
    const processingTime = Date.now() - startTime
    addLog({
      timestamp: new Date().toISOString(),
      action,
      ip,
      serviceId,
      processingTimeMs: processingTime,
      success: false,
      error: error.message || String(error),
    })
    console.error('AI Agent error (unhandled):', error)
    return NextResponse.json(structuredError(error, action), { status: 500 })
  }
}
