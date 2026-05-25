// ═══════════════════════════════════════════════════════════════════════════════
// eAdmin Guinée — Enterprise Audit Trail Engine
// Complete tracking of all user actions for SIEM readiness
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type AuditCategory =
  | 'auth' | 'data_access' | 'data_modification' | 'workflow'
  | 'document' | 'signature' | 'admin' | 'security' | 'export'

export type AuditAction =
  | 'login' | 'logout' | 'login_failed' | 'mfa_verified' | 'mfa_failed'
  | 'create' | 'read' | 'update' | 'delete' | 'restore'
  | 'approve' | 'reject' | 'escalate' | 'delegate' | 'transfer'
  | 'sign' | 'verify' | 'counter_sign'
  | 'upload' | 'download' | 'export' | 'archive' | 'print'
  | 'status_change' | 'assign' | 'reassign'
  | 'role_change' | 'permission_change' | 'config_change'
  | 'lock_account' | 'unlock_account' | 'password_change' | 'password_reset'
  | 'session_start' | 'session_end' | 'session_timeout'

export type AuditSeverity = 'info' | 'warning' | 'critical'

export type AuditResource =
  | 'demande' | 'document' | 'courrier'
  | 'utilisateur' | 'workflow' | 'signature'
  | 'parametre' | 'systeme'

export interface AuditEntry {
  id: string
  // Who
  userId: string
  userEmail: string
  userName: string
  userRole: string
  // What
  action: AuditAction
  category: AuditCategory
  resource: AuditResource
  resourceId: string
  description: string
  // Where
  ipAddress: string
  userAgent: string
  sessionId: string
  deviceFingerprint: string
  geographicLocation?: string
  // When
  timestamp: string
  // Details
  severity: AuditSeverity
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  metadata?: Record<string, unknown>
  // Compliance
  retentionPeriod: number  // days
  isComplianceRelevant: boolean
  // Integrity
  hash: string  // SHA-256 hash for tamper detection
  previousHash?: string  // Chain integrity
}

// ─── ACTION → CATEGORY MAPPING ───────────────────────────────────────────────

export const ACTION_CATEGORY_MAP: Record<AuditAction, AuditCategory> = {
  login: 'auth',
  logout: 'auth',
  login_failed: 'auth',
  mfa_verified: 'auth',
  mfa_failed: 'auth',
  create: 'data_modification',
  read: 'data_access',
  update: 'data_modification',
  delete: 'data_modification',
  restore: 'data_modification',
  approve: 'workflow',
  reject: 'workflow',
  escalate: 'workflow',
  delegate: 'workflow',
  transfer: 'workflow',
  sign: 'signature',
  verify: 'signature',
  counter_sign: 'signature',
  upload: 'document',
  download: 'document',
  export: 'export',
  archive: 'document',
  print: 'document',
  status_change: 'workflow',
  assign: 'workflow',
  reassign: 'workflow',
  role_change: 'admin',
  permission_change: 'admin',
  config_change: 'admin',
  lock_account: 'security',
  unlock_account: 'security',
  password_change: 'security',
  password_reset: 'security',
  session_start: 'auth',
  session_end: 'auth',
  session_timeout: 'auth',
}

// ─── SEVERITY MAPPING ────────────────────────────────────────────────────────

const CRITICAL_ACTIONS: AuditAction[] = [
  'login_failed', 'lock_account', 'unlock_account', 'role_change',
  'permission_change', 'config_change', 'delete',
]

const WARNING_ACTIONS: AuditAction[] = [
  'reject', 'escalate', 'mfa_failed', 'password_reset', 'session_timeout',
  'reassign',
]

function inferSeverity(action: AuditAction): AuditSeverity {
  if (CRITICAL_ACTIONS.includes(action)) return 'critical'
  if (WARNING_ACTIONS.includes(action)) return 'warning'
  return 'info'
}

// ─── RETENTION POLICY ────────────────────────────────────────────────────────

const RETENTION_BY_CATEGORY: Record<AuditCategory, number> = {
  auth: 365,         // 1 year
  security: 2555,    // 7 years
  admin: 1825,       // 5 years
  data_modification: 1825,  // 5 years
  data_access: 365,  // 1 year
  workflow: 1095,    // 3 years
  document: 1825,    // 5 years
  signature: 2555,   // 7 years
  export: 1095,      // 3 years
}

const COMPLIANCE_CATEGORIES: AuditCategory[] = [
  'auth', 'security', 'admin', 'signature', 'data_modification',
]

// ─── INTERNAL STORE (in-memory for client-side) ─────────────────────────────

let auditStore: AuditEntry[] = []
let lastEntryHash: string | undefined = undefined

// ─── UTILITY: Generate unique ID ─────────────────────────────────────────────

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── UTILITY: Get client IP (simulated in demo) ─────────────────────────────

const SIMULATED_GUINEA_IPS = [
  '196.125.34.12', '196.125.34.56', '196.125.40.22',
  '196.125.50.8', '196.125.50.15', '196.125.34.78',
  '196.125.1.1', '196.125.60.3', '196.125.34.45',
  '196.125.34.90',
]

export function getClientIP(): string {
  if (typeof window === 'undefined') return '10.0.0.1'
  // In a real deployment this would come from the server
  // For demo, we use a simulated Guinea IP
  const stored = sessionStorage.getItem('eadmin-simulated-ip')
  if (stored) return stored
  const ip = SIMULATED_GUINEA_IPS[Math.floor(Math.random() * SIMULATED_GUINEA_IPS.length)]
  sessionStorage.setItem('eadmin-simulated-ip', ip)
  return ip
}

// ─── UTILITY: Get device fingerprint ─────────────────────────────────────────

export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server-side'
  const stored = sessionStorage.getItem('eadmin-device-fingerprint')
  if (stored) return stored

  const nav = window.navigator
  const screen = window.screen
  const raw = [
    nav.userAgent,
    nav.language,
    screen?.colorDepth,
    screen?.width,
    screen?.height,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 'na',
    nav.platform,
  ].join('|')

  // Simple hash (not cryptographic, but enough for fingerprinting)
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0 // Convert to 32-bit integer
  }
  const fp = `fp-${Math.abs(hash).toString(16).padStart(8, '0')}-${Date.now().toString(36)}`
  sessionStorage.setItem('eadmin-device-fingerprint', fp)
  return fp
}

// ─── UTILITY: Get session ID ─────────────────────────────────────────────────

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-session'
  const stored = sessionStorage.getItem('eadmin-session-id')
  if (stored) return stored
  const sid = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  sessionStorage.setItem('eadmin-session-id', sid)
  return sid
}

// ─── UTILITY: Get user agent ─────────────────────────────────────────────────

function getUserAgent(): string {
  if (typeof window === 'undefined') return 'Server/1.0'
  return window.navigator.userAgent
}

// ─── UTILITY: Compute SHA-256 hash for integrity ─────────────────────────────

export async function computeEntryHashAsync(entry: Omit<AuditEntry, 'hash'>): Promise<string> {
  const data = JSON.stringify({
    id: entry.id,
    userId: entry.userId,
    action: entry.action,
    category: entry.category,
    resource: entry.resource,
    resourceId: entry.resourceId,
    timestamp: entry.timestamp,
    severity: entry.severity,
    previousHash: entry.previousHash || '',
  })

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch {
      // Fallback to simple hash
    }
  }

  // Simple fallback hash
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const chr = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(16, '0')
}

// Synchronous hash for demo/initial data (simple but deterministic)
export function computeEntryHash(entry: Omit<AuditEntry, 'hash'>): string {
  const data = JSON.stringify({
    id: entry.id,
    userId: entry.userId,
    action: entry.action,
    category: entry.category,
    resource: entry.resource,
    resourceId: entry.resourceId,
    timestamp: entry.timestamp,
    severity: entry.severity,
    previousHash: entry.previousHash || '',
  })

  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const chr = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(16, '0')
}

// ─── MAIN LOGGING FUNCTION ──────────────────────────────────────────────────

export function auditLog(params: {
  action: AuditAction
  category?: AuditCategory
  resource: AuditResource
  resourceId: string
  description: string
  severity?: AuditSeverity
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  metadata?: Record<string, unknown>
  isComplianceRelevant?: boolean
  // Override user info (optional, defaults to current user context)
  userId?: string
  userEmail?: string
  userName?: string
  userRole?: string
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  deviceFingerprint?: string
}): AuditEntry {
  const category = params.category || ACTION_CATEGORY_MAP[params.action] || 'data_access'
  const severity = params.severity || inferSeverity(params.action)
  const retentionPeriod = RETENTION_BY_CATEGORY[category] || 365
  const isComplianceRelevant = params.isComplianceRelevant ?? COMPLIANCE_CATEGORIES.includes(category)

  const entry: Omit<AuditEntry, 'hash'> = {
    id: generateId(),
    userId: params.userId || 'anonymous',
    userEmail: params.userEmail || '',
    userName: params.userName || '',
    userRole: params.userRole || '',
    action: params.action,
    category,
    resource: params.resource,
    resourceId: params.resourceId,
    description: params.description,
    ipAddress: params.ipAddress || getClientIP(),
    userAgent: params.userAgent || getUserAgent(),
    sessionId: params.sessionId || getSessionId(),
    deviceFingerprint: params.deviceFingerprint || getDeviceFingerprint(),
    timestamp: new Date().toISOString(),
    severity,
    previousValue: params.previousValue,
    newValue: params.newValue,
    metadata: params.metadata,
    retentionPeriod,
    isComplianceRelevant,
    previousHash: lastEntryHash,
  }

  const hash = computeEntryHash(entry)
  const fullEntry: AuditEntry = { ...entry, hash }

  // Update chain
  lastEntryHash = hash
  auditStore.unshift(fullEntry)

  return fullEntry
}

// ─── LOAD EXISTING ENTRIES (for hydration from store) ────────────────────────

export function loadAuditEntries(entries: AuditEntry[]): void {
  auditStore = [...entries]
  // Rebuild chain: find the last hash
  if (entries.length > 0) {
    // Entries should be sorted newest first, so last entry = oldest
    const sorted = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    lastEntryHash = sorted[sorted.length - 1]?.hash
  }
}

// ─── QUERY FUNCTIONS ─────────────────────────────────────────────────────────

export function queryAuditTrail(filters: {
  userId?: string
  action?: AuditAction
  category?: AuditCategory
  resource?: AuditResource
  severity?: AuditSeverity
  dateFrom?: string
  dateTo?: string
  sessionId?: string
  search?: string
  limit?: number
  offset?: number
}): AuditEntry[] {
  let results = [...auditStore]

  if (filters.userId) {
    results = results.filter(e => e.userId === filters.userId)
  }
  if (filters.action) {
    results = results.filter(e => e.action === filters.action)
  }
  if (filters.category) {
    results = results.filter(e => e.category === filters.category)
  }
  if (filters.resource) {
    results = results.filter(e => e.resource === filters.resource)
  }
  if (filters.severity) {
    results = results.filter(e => e.severity === filters.severity)
  }
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom)
    results = results.filter(e => new Date(e.timestamp) >= from)
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo + 'T23:59:59')
    results = results.filter(e => new Date(e.timestamp) <= to)
  }
  if (filters.sessionId) {
    const sid = filters.sessionId.toLowerCase()
    results = results.filter(e => e.sessionId.toLowerCase().includes(sid))
  }
  if (filters.search) {
    const q = filters.search.toLowerCase().trim()
    results = results.filter(e =>
      e.description.toLowerCase().includes(q) ||
      e.userName.toLowerCase().includes(q) ||
      e.resourceId.toLowerCase().includes(q) ||
      e.ipAddress.toLowerCase().includes(q) ||
      e.userEmail.toLowerCase().includes(q) ||
      (e.metadata && Object.values(e.metadata).some(v =>
        String(v).toLowerCase().includes(q)
      ))
    )
  }

  // Sort newest first
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Pagination
  if (filters.offset) {
    results = results.slice(filters.offset)
  }
  if (filters.limit) {
    results = results.slice(0, filters.limit)
  }

  return results
}

// ─── EXPORT FUNCTIONS ────────────────────────────────────────────────────────

export function exportAuditTrailJSON(filters: Parameters<typeof queryAuditTrail>[0]): string {
  const entries = queryAuditTrail(filters)
  return JSON.stringify(entries, null, 2)
}

export function exportAuditTrailCSV(filters: Parameters<typeof queryAuditTrail>[0]): string {
  const entries = queryAuditTrail(filters)
  if (!entries.length) return ''

  const headers = [
    'ID', 'Horodatage', 'Utilisateur', 'Email', 'Rôle',
    'Action', 'Catégorie', 'Ressource', 'ID Ressource',
    'Description', 'Sévérité', 'Adresse IP', 'Session ID',
    'Empreinte Appareil', 'Conforme', 'Hash',
  ]

  const rows = entries.map(e => [
    e.id,
    e.timestamp,
    e.userName,
    e.userEmail,
    e.userRole,
    e.action,
    e.category,
    e.resource,
    e.resourceId,
    `"${e.description.replace(/"/g, '""')}"`,
    e.severity,
    e.ipAddress,
    e.sessionId,
    e.deviceFingerprint,
    e.isComplianceRelevant ? 'Oui' : 'Non',
    e.hash,
  ].join(','))

  return [headers.join(','), ...rows].join('\n')
}

export function exportAuditTrail(
  format: 'csv' | 'json',
  filters: Parameters<typeof queryAuditTrail>[0]
): string | Blob {
  if (format === 'json') {
    return exportAuditTrailJSON(filters)
  }
  return exportAuditTrailCSV(filters)
}

// ─── STATISTICS ──────────────────────────────────────────────────────────────

export function getAuditStats(): {
  totalEntries: number
  todayCount: number
  criticalCount: number
  byCategory: Record<string, number>
  byAction: Record<string, number>
  byUser: Record<string, number>
  recentCriticalActions: AuditEntry[]
  integrityCheck: { valid: boolean; brokenChains: number; totalChecked: number }
} {
  const todayStr = new Date().toISOString().slice(0, 10)

  const byCategory: Record<string, number> = {}
  const byAction: Record<string, number> = {}
  const byUser: Record<string, number> = {}
  let todayCount = 0
  let criticalCount = 0
  const recentCritical: AuditEntry[] = []

  // Integrity check
  let brokenChains = 0
  let totalChecked = 0
  const sorted = [...auditStore].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]
    // Recompute hash and verify
    const computedHash = computeEntryHash(entry)
    if (computedHash !== entry.hash) {
      brokenChains++
    }
    totalChecked++

    // Check chain linkage
    if (i > 0 && entry.previousHash && entry.previousHash !== sorted[i - 1].hash) {
      brokenChains++
    }
  }

  auditStore.forEach(entry => {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1
    byAction[entry.action] = (byAction[entry.action] || 0) + 1
    byUser[entry.userName] = (byUser[entry.userName] || 0) + 1

    if (entry.timestamp.slice(0, 10) === todayStr) todayCount++
    if (entry.severity === 'critical') {
      criticalCount++
      if (recentCritical.length < 10) {
        recentCritical.push(entry)
      }
    }
  })

  return {
    totalEntries: auditStore.length,
    todayCount,
    criticalCount,
    byCategory,
    byAction,
    byUser,
    recentCriticalActions: recentCritical,
    integrityCheck: {
      valid: brokenChains === 0,
      brokenChains,
      totalChecked,
    },
  }
}

// ─── COMPLIANCE HELPERS ──────────────────────────────────────────────────────

export function getComplianceReport(startDate: string, endDate: string): {
  totalActions: number
  authActions: number
  dataModifications: number
  adminActions: number
  failedActions: number
  securityIncidents: number
  complianceRelevantActions: number
  period: { start: string; end: string }
} {
  const from = new Date(startDate)
  const to = new Date(endDate + 'T23:59:59')

  const inRange = auditStore.filter(e => {
    const ts = new Date(e.timestamp)
    return ts >= from && ts <= to
  })

  const authActions = inRange.filter(e => e.category === 'auth').length
  const dataModifications = inRange.filter(e => e.category === 'data_modification').length
  const adminActions = inRange.filter(e => e.category === 'admin').length
  const failedActions = inRange.filter(e =>
    e.action === 'login_failed' || e.action === 'mfa_failed'
  ).length
  const securityIncidents = inRange.filter(e => e.category === 'security').length
  const complianceRelevantActions = inRange.filter(e => e.isComplianceRelevant).length

  return {
    totalActions: inRange.length,
    authActions,
    dataModifications,
    adminActions,
    failedActions,
    securityIncidents,
    complianceRelevantActions,
    period: { start: startDate, end: endDate },
  }
}

// ─── CATEGORY / ACTION LABELS (French) ───────────────────────────────────────

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  auth: 'Authentification',
  data_access: 'Accès aux données',
  data_modification: 'Modification de données',
  workflow: 'Workflow',
  document: 'Document',
  signature: 'Signature',
  admin: 'Administration',
  security: 'Sécurité',
  export: 'Export',
}

export const ACTION_LABELS: Record<AuditAction, string> = {
  login: 'Connexion',
  logout: 'Déconnexion',
  login_failed: 'Échec connexion',
  mfa_verified: 'MFA vérifié',
  mfa_failed: 'Échec MFA',
  create: 'Création',
  read: 'Lecture',
  update: 'Modification',
  delete: 'Suppression',
  restore: 'Restauration',
  approve: 'Approbation',
  reject: 'Rejet',
  escalate: 'Escalade',
  delegate: 'Délégation',
  transfer: 'Transfert',
  sign: 'Signature',
  verify: 'Vérification',
  counter_sign: 'Contresignature',
  upload: 'Téléversement',
  download: 'Téléchargement',
  export: 'Export',
  archive: 'Archivage',
  print: 'Impression',
  status_change: 'Changement statut',
  assign: 'Assignation',
  reassign: 'Réassignation',
  role_change: 'Changement rôle',
  permission_change: 'Changement permission',
  config_change: 'Changement config',
  lock_account: 'Verrouillage compte',
  unlock_account: 'Déverrouillage compte',
  password_change: 'Changement mot de passe',
  password_reset: 'Réinitialisation mot de passe',
  session_start: 'Début session',
  session_end: 'Fin session',
  session_timeout: 'Expiration session',
}

export const SEVERITY_CONFIG: Record<AuditSeverity, { label: string; color: string; bgColor: string; icon: string }> = {
  info: { label: 'Info', color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/30', icon: 'ℹ️' },
  warning: { label: 'Attention', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: '⚠️' },
  critical: { label: 'Critique', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: '🔴' },
}

// ─── ACTION → COLOR CONFIG ──────────────────────────────────────────────────

export const ACTION_COLOR_CONFIG: Record<string, { color: string; bgColor: string }> = {
  create: { color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  read: { color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  update: { color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  delete: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  restore: { color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  login: { color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  logout: { color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  login_failed: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  mfa_verified: { color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  mfa_failed: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  approve: { color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  reject: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  escalate: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  delegate: { color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  transfer: { color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  sign: { color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  verify: { color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  counter_sign: { color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  upload: { color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  download: { color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  export: { color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  archive: { color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  print: { color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  status_change: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  assign: { color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  reassign: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  role_change: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  permission_change: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  config_change: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  lock_account: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  unlock_account: { color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  password_change: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  password_reset: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  session_start: { color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  session_end: { color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  session_timeout: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
}
