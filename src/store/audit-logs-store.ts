import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type AuditEntry,
  type AuditAction,
  type AuditCategory,
  type AuditResource,
  type AuditSeverity,
  computeEntryHash,
  getAuditStats as getEngineAuditStats,
  getComplianceReport as getEngineComplianceReport,
  queryAuditTrail,
  loadAuditEntries,
  CATEGORY_LABELS,
  ACTION_CATEGORY_MAP,
} from '@/lib/audit-trail'

// Re-export types for backward compatibility
export type { AuditAction, AuditSeverity }
export type { AuditEntry as AuditLog }

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// Fixed dates spread across Jan–Mar 2026
const dateAt = (year: number, month: number, day: number, hour = 9, min = 0) =>
  new Date(year, month - 1, day, hour, min).toISOString()

// ─── DEMO SEED DATA — 20 realistic Guinea administration audit logs ─────────
// Converted to the new AuditEntry format with full tracking fields

const ACTION_TO_CATEGORY: Record<string, AuditCategory> = {
  login: 'auth',
  logout: 'auth',
  login_failed: 'auth',
  create: 'data_modification',
  read: 'data_access',
  update: 'data_modification',
  delete: 'data_modification',
  approve: 'workflow',
  reject: 'workflow',
  upload: 'document',
  download: 'document',
  verify: 'signature',
  sign: 'signature',
  transfer: 'workflow',
  archive: 'document',
  export: 'export',
  assign: 'workflow',
  status_change: 'workflow',
}

function buildDemoEntry(
  id: string,
  action: AuditAction,
  resource: AuditResource,
  description: string,
  severity: AuditSeverity,
  userId: string,
  userName: string,
  userRole: string,
  ipAddress: string,
  timestamp: string,
  resourceId?: string,
  details?: Record<string, string>,
  previousHash?: string,
): AuditEntry {
  const category = ACTION_TO_CATEGORY[action] || 'data_access'
  const retentionPeriod = category === 'security' ? 2555 : category === 'admin' ? 1825 : category === 'signature' ? 2555 : category === 'data_modification' ? 1825 : category === 'document' ? 1825 : category === 'workflow' ? 1095 : category === 'export' ? 1095 : 365
  const isComplianceRelevant = ['auth', 'security', 'admin', 'signature', 'data_modification'].includes(category)
  const sessionId = `sess-demo-${userId.replace('demo-', '')}`
  const deviceFingerprint = `fp-${userId.replace(/[^a-z0-9]/g, '').slice(0, 8)}-${ipAddress.replace(/\./g, '').slice(0, 6)}`
  const userEmail = userId.includes('admin') ? 'admin@eadmin.gn'
    : userId.includes('citizen') ? 'citoyen@eadmin.gn'
    : userId.includes('mairie') ? 'mairie@eadmin.gn'
    : userId.includes('agence') ? 'agence@eadmin.gn'
    : userId.includes('ministere') ? 'ministere@eadmin.gn'
    : 'superadmin@eadmin.gn'

  const entry: Omit<AuditEntry, 'hash'> = {
    id,
    userId,
    userEmail,
    userName,
    userRole,
    action,
    category,
    resource,
    resourceId: resourceId || '',
    description,
    ipAddress,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
    sessionId,
    deviceFingerprint,
    geographicLocation: ipAddress.startsWith('196.125') ? 'Conakry, Guinée' : 'Hors Guinée',
    timestamp,
    severity,
    previousValue: undefined,
    newValue: details ? { ...details } : undefined,
    metadata: details ? { ...details } : undefined,
    retentionPeriod,
    isComplianceRelevant,
    previousHash,
  }

  const hash = computeEntryHash(entry)
  return { ...entry, hash }
}

// Build demo entries with hash chain
function buildDemoLogs(): AuditEntry[] {
  const rawEntries: Parameters<typeof buildDemoEntry>[] = [
    ['audit-demo-001', 'login', 'utilisateur', 'Connexion réussie de Sékou Condé au tableau de bord administrateur', 'info', 'demo-admin-1', 'Sékou Condé', 'admin', '196.125.34.12', dateAt(2026, 1, 5, 8, 15), undefined, { navigateur: 'Chrome 121', systeme: 'Windows 11', lieu: 'Conakry, Kaloum' }],
    ['audit-demo-002', 'create', 'demande', 'Nouvelle demande de certificat de nationalité soumise par Aminata Diallo', 'info', 'demo-citizen-1', 'Aminata Diallo', 'citoyen', '154.120.78.4', dateAt(2026, 1, 8, 10, 30), 'req-demo-003', { type_demande: 'Certificat de nationalité', mairie: 'Mairie de Kaloum' }],
    ['audit-demo-003', 'approve', 'demande', 'Demande de certificat de nationalité approuvée par Mme Fatoumata Bah', 'info', 'demo-mairie-1', 'Mme Fatoumata Bah', 'mairie', '196.125.34.56', dateAt(2026, 1, 10, 14, 45), 'req-demo-003', { decision: 'Approuvé', motif: 'Dossier complet et conforme' }],
    ['audit-demo-004', 'upload', 'document', "Upload du rapport d'activité trimestriel T1-2026 par Mamadou Soumah", 'info', 'demo-agence-1', 'Mamadou Soumah', 'agence', '196.125.40.22', dateAt(2026, 1, 15, 11, 20), 'doc-demo-012', { nom_fichier: 'rapport-T1-2026.pdf', taille: '2.4 Mo', format: 'PDF' }],
    ['audit-demo-005', 'verify', 'document', "Vérification et validation du rapport d'activité trimestriel T1-2026", 'info', 'demo-admin-1', 'Sékou Condé', 'admin', '196.125.34.12', dateAt(2026, 1, 16, 9, 0), 'doc-demo-012', { statut_verification: 'Conforme', verifier_par: 'Direction du Contrôle' }],
    ['audit-demo-006', 'transfer', 'courrier', 'Courrier présidentiel N°COURR-2026-0008 transféré à la Direction de la Planification Minière', 'warning', 'demo-ministere-1', 'Alpha Camara', 'ministere', '196.125.50.8', dateAt(2026, 1, 20, 16, 30), 'c-demo-008', { reference: 'COURR-2026-0008', expediteur: 'Ministre des Mines', destinataire: 'Direction de la Planification Minière' }],
    ['audit-demo-007', 'sign', 'signature', 'Convention de coopération Guinée-UE signée électroniquement par Dr. Alpha Diallo', 'info', 'demo-ministere-1', 'Dr. Alpha Diallo', 'ministere', '196.125.50.15', dateAt(2026, 2, 3, 10, 0), 'sig-demo-005', { type_signature: 'Électronique', document: 'Convention Guinée-UE — Projet Eau pour Tous', certificate: 'CNIE-2026-ABCD' }],
    ['audit-demo-008', 'login_failed', 'utilisateur', "Tentative de connexion échouée — identifiants invalides pour le compte ministere@eadmin.gn", 'warning', 'demo-ministere-1', 'Dr. Alpha Diallo', 'ministere', '45.33.67.89', dateAt(2026, 2, 5, 3, 12), undefined, { raison: 'Mot de passe incorrect', tentative: '2/5', localisation: 'IP étrangère — hors Guinée' }],
    ['audit-demo-009', 'reject', 'demande', 'Réclamation N°REC-2026-0042 rejetée par le Directeur CNSS — dossier incomplet', 'warning', 'demo-mairie-1', 'Mamadou Diallo', 'mairie', '196.125.34.78', dateAt(2026, 2, 8, 15, 30), 'req-demo-010', { reference: 'REC-2026-0042', motif: 'Pièces justificatives manquantes', pieces_manquantes: 'Dernier bulletin de salaire, attestation employeur' }],
    ['audit-demo-010', 'update', 'parametre', 'Modification des paramètres de sécurité — politique de mots de passe renforcée', 'warning', 'demo-superadmin-1', 'Amadou Oury Bah', 'superadmin', '196.125.1.1', dateAt(2026, 2, 12, 9, 45), 'param-securite', { parametre: 'Politique mots de passe', ancien: '8 caractères min', nouveau: '12 caractères min + caractères spéciaux' }],
    ['audit-demo-011', 'create', 'courrier', "Courrier présidentiel enregistré — Demande d'audience auprès du Président de la République", 'info', 'demo-mairie-1', 'Mme Aminata Diallo', 'mairie', '196.125.34.45', dateAt(2026, 2, 18, 8, 0), 'c-demo-001', { reference: 'COURR-2026-0001', type: 'Présidentiel', priorite: 'Urgente' }],
    ['audit-demo-012', 'download', 'document', 'Téléchargement du décret présidentiel sur la réforme du secteur minier', 'info', 'demo-ministere-1', 'Alpha Camara', 'ministere', '196.125.50.8', dateAt(2026, 2, 20, 14, 10), 'doc-demo-015', { document: 'Décret réforme minière 2026', format: 'PDF', taille: '1.8 Mo' }],
    ['audit-demo-013', 'status_change', 'courrier', "Statut du courrier d'alerte sanitaire modifié — Cellule de crise activée", 'critical', 'demo-admin-1', 'Dr Aïssatou Doubé', 'admin', '196.125.60.3', dateAt(2026, 2, 25, 7, 30), 'c-demo-005', { reference: 'COURR-2026-0005', ancien_statut: 'En attente', nouveau_statut: 'En cours — Cellule de crise', urgence: "Épidémie fièvre de Lassa — N'Zérékoré" }],
    ['audit-demo-014', 'export', 'demande', "Export massif des demandes de documents d'état civil — 1er trimestre 2026", 'info', 'demo-admin-1', 'Sékou Condé', 'admin', '196.125.34.12', dateAt(2026, 3, 1, 16, 0), undefined, { periode: 'Janvier — Mars 2026', nombre_demandes: '1 247', format: 'XLSX', taille: '340 Ko' }],
    ['audit-demo-015', 'archive', 'courrier', 'Archivage des dossiers CENI — Législature 2020-2025 transférés aux Archives Nationales', 'info', 'demo-mairie-1', 'Ibrahima Bah', 'mairie', '196.125.34.90', dateAt(2026, 3, 3, 11, 15), 'c-demo-012', { reference: 'COURR-2026-0012', nombre_dossiers: '234', destination: 'Archives Nationales de Guinée' }],
    ['audit-demo-016', 'assign', 'courrier', 'Circulaire eAdmin assignée à Mme Hawa Soumah pour suivi du déploiement', 'info', 'demo-admin-1', 'Sékou Condé', 'admin', '196.125.34.12', dateAt(2026, 3, 5, 10, 0), 'c-demo-010', { reference: 'COURR-2026-0010', assigne_a: 'Mme Hawa Soumah', role: 'Directrice de la Modernisation Administrative' }],
    ['audit-demo-017', 'login_failed', 'utilisateur', "Connexion suspecte détectée — Adresse IP non répertoriée tentant d'accéder au compte superadmin", 'critical', 'demo-superadmin-1', 'Amadou Oury Bah', 'superadmin', '103.72.88.201', dateAt(2026, 3, 7, 2, 45), undefined, { type: 'Connexion non autorisée', localisation: 'Asie du Sud-Est', compteur_echecs: '5', action: 'Compte temporairement verrouillé' }],
    ['audit-demo-018', 'delete', 'document', "Suppression d'un document obsolète — Ancien formulaire de demande de CNI (version 2019)", 'warning', 'demo-superadmin-1', 'Amadou Oury Bah', 'superadmin', '196.125.1.1', dateAt(2026, 3, 8, 14, 30), 'doc-demo-020', { document: 'Formulaire CNI v2019', raison: 'Remplacé par version 2026', supprime_par: 'Super Administrateur' }],
    ['audit-demo-019', 'update', 'workflow', "Workflow de traitement des passeports biométriques mis à jour — Ajout d'une étape de vérification biométrique", 'info', 'demo-agence-1', 'Mamadou Soumah', 'agence', '196.125.40.22', dateAt(2026, 3, 10, 9, 15), 'wf-demo-002', { workflow: 'Passeports biométriques', modification: 'Ajout étape vérification biométrique', valide_par: 'Directeur ANIP' }],
    ['audit-demo-020', 'logout', 'utilisateur', 'Déconnexion de Mme Fatoumata Bah — Fin de session de travail à la Mairie de Kaloum', 'info', 'demo-mairie-1', 'Mme Fatoumata Bah', 'mairie', '196.125.34.56', dateAt(2026, 3, 10, 17, 30), undefined, { duree_session: '8h 15min', actions_session: '23', deconnexion: 'Normale' }],
  ]

  const entries: AuditEntry[] = []
  let prevHash: string | undefined = undefined

  for (const params of rawEntries) {
    const entry = buildDemoEntry(
      params[0], params[1], params[2], params[3], params[4],
      params[5], params[6], params[7], params[8], params[9],
      params[10], params[11], prevHash
    )
    entries.push(entry)
    prevHash = entry.hash
  }

  return entries
}

const DEMO_LOGS: AuditEntry[] = buildDemoLogs()

// ─── STORE INTERFACE ─────────────────────────────────────────────────────────

interface AuditLogsStoreState {
  logs: AuditEntry[]

  // Core CRUD
  addLog: (log: Omit<AuditEntry, 'id' | 'timestamp' | 'hash' | 'previousHash'>) => void
  addLogFromEntry: (entry: AuditEntry) => void
  addLogs: (logs: Omit<AuditEntry, 'id' | 'timestamp' | 'hash' | 'previousHash'>[]) => void
  clearLogs: () => void

  // Filtering
  getFiltered: (opts: {
    action?: AuditAction | 'all'
    category?: AuditCategory | 'all'
    resource?: AuditResource | 'all'
    severity?: AuditSeverity | 'all'
    search?: string
    dateFrom?: string
    dateTo?: string
    sessionId?: string
  }) => AuditEntry[]

  // Statistics
  getStats: () => {
    total: number
    today: number
    byAction: Record<string, number>
    byResource: Record<string, number>
    byCategory: Record<string, number>
    criticalCount: number
  }

  // Integrity check
  checkIntegrity: () => { valid: boolean; brokenChains: number; totalChecked: number }

  // Compliance report
  getComplianceReport: (startDate: string, endDate: string) => ReturnType<typeof getEngineComplianceReport>

  // Reset
  resetToDemoData: () => void
}

// ─── STORE ───────────────────────────────────────────────────────────────────

export const useAuditLogsStore = create<AuditLogsStoreState>()(
  persist(
    (set, get) => ({
      logs: DEMO_LOGS,

      // ── Add a log (auto-generates hash chain) ────────────────────────────

      addLog: (logData) => {
        const currentLogs = get().logs
        const previousHash = currentLogs.length > 0 ? currentLogs[0].hash : undefined

        const entryWithoutHash: Omit<AuditEntry, 'hash'> = {
          ...logData,
          id: generateId(),
          timestamp: new Date().toISOString(),
          previousHash,
        }

        const hash = computeEntryHash(entryWithoutHash)
        const newLog: AuditEntry = { ...entryWithoutHash, hash }

        set((state) => ({
          logs: [newLog, ...state.logs],
        }))

        // Sync with audit-trail engine
        try { loadAuditEntries(get().logs) } catch { /* noop */ }
      },

      // ── Add from pre-built entry (from audit-trail engine) ──────────────

      addLogFromEntry: (entry: AuditEntry) => {
        set((state) => ({
          logs: [entry, ...state.logs],
        }))

        // Sync with audit-trail engine
        try { loadAuditEntries(get().logs) } catch { /* noop */ }
      },

      // ── Batch add ──────────────────────────────────────────────────────

      addLogs: (logsData) => {
        const currentLogs = get().logs
        let prevHash = currentLogs.length > 0 ? currentLogs[0].hash : undefined

        const nowIso = new Date().toISOString()
        const newLogs: AuditEntry[] = logsData.map((logData) => {
          const entryWithoutHash: Omit<AuditEntry, 'hash'> = {
            ...logData,
            id: generateId(),
            timestamp: nowIso,
            previousHash: prevHash,
          }
          const hash = computeEntryHash(entryWithoutHash)
          prevHash = hash
          return { ...entryWithoutHash, hash }
        })

        set((state) => ({
          logs: [...newLogs, ...state.logs],
        }))

        // Sync with audit-trail engine
        try { loadAuditEntries(get().logs) } catch { /* noop */ }
      },

      // ── Clear all logs ─────────────────────────────────────────────────

      clearLogs: () => {
        set({ logs: [] })
      },

      // ── Advanced filtering ─────────────────────────────────────────────

      getFiltered: (opts) => {
        const {
          action = 'all',
          category = 'all',
          resource = 'all',
          severity = 'all',
          search = '',
          dateFrom,
          dateTo,
          sessionId,
        } = opts

        return get().logs.filter((log) => {
          if (action !== 'all' && log.action !== action) return false
          if (category !== 'all' && log.category !== category) return false
          if (resource !== 'all' && log.resource !== resource) return false
          if (severity !== 'all' && log.severity !== severity) return false
          if (dateFrom && new Date(log.timestamp) < new Date(dateFrom)) return false
          if (dateTo && new Date(log.timestamp) > new Date(dateTo + 'T23:59:59')) return false
          if (sessionId && !log.sessionId.toLowerCase().includes(sessionId.toLowerCase())) return false
          if (search.trim()) {
            const q = search.toLowerCase().trim()
            const matchesSearch =
              log.description.toLowerCase().includes(q) ||
              (log.userName && log.userName.toLowerCase().includes(q)) ||
              (log.resourceId && log.resourceId.toLowerCase().includes(q)) ||
              (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
              (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
              (log.metadata && Object.values(log.metadata).some((v) => String(v).toLowerCase().includes(q)))
            if (!matchesSearch) return false
          }
          return true
        })
      },

      // ── Statistics ──────────────────────────────────────────────────────

      getStats: () => {
        const { logs } = get()
        const byAction: Record<string, number> = {}
        const byResource: Record<string, number> = {}
        const byCategory: Record<string, number> = {}
        let today = 0
        let criticalCount = 0

        const todayStr = new Date().toISOString().slice(0, 10)

        logs.forEach((log) => {
          byAction[log.action] = (byAction[log.action] || 0) + 1
          byResource[log.resource] = (byResource[log.resource] || 0) + 1
          byCategory[log.category] = (byCategory[log.category] || 0) + 1
          if (log.timestamp.slice(0, 10) === todayStr) today++
          if (log.severity === 'critical') criticalCount++
        })

        return { total: logs.length, today, byAction, byResource, byCategory, criticalCount }
      },

      // ── Integrity check ────────────────────────────────────────────────

      checkIntegrity: () => {
        const { logs } = get()
        const sorted = [...logs].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )

        let brokenChains = 0
        let totalChecked = 0

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

        return {
          valid: brokenChains === 0,
          brokenChains,
          totalChecked,
        }
      },

      // ── Compliance report ──────────────────────────────────────────────

      getComplianceReport: (startDate: string, endDate: string) => {
        // Sync the engine store first
        try { loadAuditEntries(get().logs) } catch { /* noop */ }
        return getEngineComplianceReport(startDate, endDate)
      },

      // ── Reset to demo data ─────────────────────────────────────────────

      resetToDemoData: () => {
        const fresh = buildDemoLogs()
        set({ logs: fresh })
        try { loadAuditEntries(fresh) } catch { /* noop */ }
      },
    }),
    {
      name: 'eadmin-audit-logs-store',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          // Rebuild from demo data with new format
          return { logs: buildDemoLogs() }
        }
        return persistedState
      },
    }
  )
)
