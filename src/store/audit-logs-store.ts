import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'logout'
  | 'approve' | 'reject'
  | 'archive' | 'export' | 'download' | 'upload'
  | 'sign' | 'verify'
  | 'transfer' | 'assign'
  | 'status_change'

export type AuditResource =
  | 'demande' | 'document' | 'courrier'
  | 'utilisateur' | 'workflow' | 'signature'
  | 'parametre' | 'systeme'

export type AuditSeverity = 'info' | 'warning' | 'critical'

export interface AuditLog {
  id: string
  action: AuditAction
  resource: AuditResource
  resourceId?: string
  description: string
  severity: AuditSeverity
  userId?: string
  userName?: string
  userRole?: string
  ipAddress?: string
  timestamp: string
  details?: Record<string, string>
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// Fixed dates spread across Jan–Mar 2026
const dateAt = (year: number, month: number, day: number, hour = 9, min = 0) =>
  new Date(year, month - 1, day, hour, min).toISOString()

// ─── DEMO SEED DATA — 20 realistic Guinea administration audit logs ─────────

const DEMO_LOGS: AuditLog[] = [
  {
    id: 'audit-demo-001',
    action: 'login',
    resource: 'utilisateur',
    description: 'Connexion réussie de Sékou Condé au tableau de bord administrateur',
    severity: 'info',
    userId: 'demo-admin-1',
    userName: 'Sékou Condé',
    userRole: 'admin',
    ipAddress: '196.125.34.12',
    timestamp: dateAt(2026, 1, 5, 8, 15),
    details: { navigateur: 'Chrome 121', systeme: 'Windows 11', lieu: 'Conakry, Kaloum' },
  },
  {
    id: 'audit-demo-002',
    action: 'create',
    resource: 'demande',
    resourceId: 'req-demo-003',
    description: 'Nouvelle demande de certificat de nationalité soumise par Aminata Diallo',
    severity: 'info',
    userId: 'demo-citizen-1',
    userName: 'Aminata Diallo',
    userRole: 'citoyen',
    ipAddress: '154.120.78.4',
    timestamp: dateAt(2026, 1, 8, 10, 30),
    details: { type_demande: 'Certificat de nationalité', mairie: 'Mairie de Kaloum' },
  },
  {
    id: 'audit-demo-003',
    action: 'approve',
    resource: 'demande',
    resourceId: 'req-demo-003',
    description: 'Demande de certificat de nationalité approuvée par Mme Fatoumata Bah',
    severity: 'info',
    userId: 'demo-mairie-1',
    userName: 'Mme Fatoumata Bah',
    userRole: 'mairie',
    ipAddress: '196.125.34.56',
    timestamp: dateAt(2026, 1, 10, 14, 45),
    details: { decision: 'Approuvé', motif: 'Dossier complet et conforme' },
  },
  {
    id: 'audit-demo-004',
    action: 'upload',
    resource: 'document',
    resourceId: 'doc-demo-012',
    description: 'Upload du rapport d\'activité trimestriel T1-2026 par Mamadou Soumah',
    severity: 'info',
    userId: 'demo-agence-1',
    userName: 'Mamadou Soumah',
    userRole: 'agence',
    ipAddress: '196.125.40.22',
    timestamp: dateAt(2026, 1, 15, 11, 20),
    details: { nom_fichier: 'rapport-T1-2026.pdf', taille: '2.4 Mo', format: 'PDF' },
  },
  {
    id: 'audit-demo-005',
    action: 'verify',
    resource: 'document',
    resourceId: 'doc-demo-012',
    description: 'Vérification et validation du rapport d\'activité trimestriel T1-2026',
    severity: 'info',
    userId: 'demo-admin-1',
    userName: 'Sékou Condé',
    userRole: 'admin',
    ipAddress: '196.125.34.12',
    timestamp: dateAt(2026, 1, 16, 9, 0),
    details: { statut_verification: 'Conforme', verifier_par: 'Direction du Contrôle' },
  },
  {
    id: 'audit-demo-006',
    action: 'transfer',
    resource: 'courrier',
    resourceId: 'c-demo-008',
    description: 'Courrier présidentiel N°COURR-2026-0008 transféré à la Direction de la Planification Minière',
    severity: 'warning',
    userId: 'demo-ministere-1',
    userName: 'Alpha Camara',
    userRole: 'ministere',
    ipAddress: '196.125.50.8',
    timestamp: dateAt(2026, 1, 20, 16, 30),
    details: { reference: 'COURR-2026-0008', expediteur: 'Ministre des Mines', destinataire: 'Direction de la Planification Minière' },
  },
  {
    id: 'audit-demo-007',
    action: 'sign',
    resource: 'signature',
    resourceId: 'sig-demo-005',
    description: 'Convention de coopération Guinée-UE signée électroniquement par Dr. Alpha Diallo',
    severity: 'info',
    userId: 'demo-ministere-1',
    userName: 'Dr. Alpha Diallo',
    userRole: 'ministere',
    ipAddress: '196.125.50.15',
    timestamp: dateAt(2026, 2, 3, 10, 0),
    details: { type_signature: 'Électronique', document: 'Convention Guinée-UE — Projet Eau pour Tous', certificate: 'CNIE-2026-ABCD' },
  },
  {
    id: 'audit-demo-008',
    action: 'login',
    resource: 'utilisateur',
    description: 'Tentative de connexion échouée — identifiants invalides pour le compte ministere@eadmin.gn',
    severity: 'warning',
    userId: 'demo-ministere-1',
    userName: 'Dr. Alpha Diallo',
    userRole: 'ministere',
    ipAddress: '45.33.67.89',
    timestamp: dateAt(2026, 2, 5, 3, 12),
    details: { raison: 'Mot de passe incorrect', tentative: '2/5', localisation: 'IP étrangère — hors Guinée' },
  },
  {
    id: 'audit-demo-009',
    action: 'reject',
    resource: 'demande',
    resourceId: 'req-demo-010',
    description: 'Réclamation N°REC-2026-0042 rejetée par le Directeur CNSS — dossier incomplet',
    severity: 'warning',
    userId: 'demo-mairie-1',
    userName: 'Mamadou Diallo',
    userRole: 'mairie',
    ipAddress: '196.125.34.78',
    timestamp: dateAt(2026, 2, 8, 15, 30),
    details: { reference: 'REC-2026-0042', motif: 'Pièces justificatives manquantes', pieces_manquantes: 'Dernier bulletin de salaire, attestation employeur' },
  },
  {
    id: 'audit-demo-010',
    action: 'update',
    resource: 'parametre',
    resourceId: 'param-securite',
    description: 'Modification des paramètres de sécurité — politique de mots de passe renforcée',
    severity: 'warning',
    userId: 'demo-superadmin-1',
    userName: 'Amadou Oury Bah',
    userRole: 'superadmin',
    ipAddress: '196.125.1.1',
    timestamp: dateAt(2026, 2, 12, 9, 45),
    details: { parametre: 'Politique mots de passe', ancien: '8 caractères min', nouveau: '12 caractères min + caractères spéciaux' },
  },
  {
    id: 'audit-demo-011',
    action: 'create',
    resource: 'courrier',
    resourceId: 'c-demo-001',
    description: 'Courrier présidentiel enregistré — Demande d\'audience auprès du Président de la République',
    severity: 'info',
    userId: 'demo-mairie-1',
    userName: 'Mme Aminata Diallo',
    userRole: 'mairie',
    ipAddress: '196.125.34.45',
    timestamp: dateAt(2026, 2, 18, 8, 0),
    details: { reference: 'COURR-2026-0001', type: 'Présidentiel', priorite: 'Urgente' },
  },
  {
    id: 'audit-demo-012',
    action: 'download',
    resource: 'document',
    resourceId: 'doc-demo-015',
    description: 'Téléchargement du décret présidentiel sur la réforme du secteur minier',
    severity: 'info',
    userId: 'demo-ministere-1',
    userName: 'Alpha Camara',
    userRole: 'ministere',
    ipAddress: '196.125.50.8',
    timestamp: dateAt(2026, 2, 20, 14, 10),
    details: { document: 'Décret réforme minière 2026', format: 'PDF', taille: '1.8 Mo' },
  },
  {
    id: 'audit-demo-013',
    action: 'status_change',
    resource: 'courrier',
    resourceId: 'c-demo-005',
    description: 'Statut du courrier d\'alerte sanitaire modifié — Cellule de crise activée',
    severity: 'critical',
    userId: 'demo-admin-1',
    userName: 'Dr Aïssatou Doubé',
    userRole: 'admin',
    ipAddress: '196.125.60.3',
    timestamp: dateAt(2026, 2, 25, 7, 30),
    details: { reference: 'COURR-2026-0005', ancien_statut: 'En attente', nouveau_statut: 'En cours — Cellule de crise', urgence: 'Épidémie fièvre de Lassa — N\'Zérékoré' },
  },
  {
    id: 'audit-demo-014',
    action: 'export',
    resource: 'demande',
    description: 'Export massif des demandes de documents d\'état civil — 1er trimestre 2026',
    severity: 'info',
    userId: 'demo-admin-1',
    userName: 'Sékou Condé',
    userRole: 'admin',
    ipAddress: '196.125.34.12',
    timestamp: dateAt(2026, 3, 1, 16, 0),
    details: { periode: 'Janvier — Mars 2026', nombre_demandes: '1 247', format: 'XLSX', taille: '340 Ko' },
  },
  {
    id: 'audit-demo-015',
    action: 'archive',
    resource: 'courrier',
    resourceId: 'c-demo-012',
    description: 'Archivage des dossiers CENI — Législature 2020-2025 transférés aux Archives Nationales',
    severity: 'info',
    userId: 'demo-mairie-1',
    userName: 'Ibrahima Bah',
    userRole: 'mairie',
    ipAddress: '196.125.34.90',
    timestamp: dateAt(2026, 3, 3, 11, 15),
    details: { reference: 'COURR-2026-0012', nombre_dossiers: '234', destination: 'Archives Nationales de Guinée' },
  },
  {
    id: 'audit-demo-016',
    action: 'assign',
    resource: 'courrier',
    resourceId: 'c-demo-010',
    description: 'Circulaire eAdmin assignée à Mme Hawa Soumah pour suivi du déploiement',
    severity: 'info',
    userId: 'demo-admin-1',
    userName: 'Sékou Condé',
    userRole: 'admin',
    ipAddress: '196.125.34.12',
    timestamp: dateAt(2026, 3, 5, 10, 0),
    details: { reference: 'COURR-2026-0010', assigne_a: 'Mme Hawa Soumah', role: 'Directrice de la Modernisation Administrative' },
  },
  {
    id: 'audit-demo-017',
    action: 'login',
    resource: 'utilisateur',
    description: 'Connexion suspecte détectée — Adresse IP non répertoriée tentant d\'accéder au compte superadmin',
    severity: 'critical',
    userId: 'demo-superadmin-1',
    userName: 'Amadou Oury Bah',
    userRole: 'superadmin',
    ipAddress: '103.72.88.201',
    timestamp: dateAt(2026, 3, 7, 2, 45),
    details: { type: 'Connexion non autorisée', localisation: 'Asie du Sud-Est', compteur_echecs: '5', action: 'Compte temporairement verrouillé' },
  },
  {
    id: 'audit-demo-018',
    action: 'delete',
    resource: 'document',
    resourceId: 'doc-demo-020',
    description: 'Suppression d\'un document obsolète — Ancien formulaire de demande de CNI (version 2019)',
    severity: 'warning',
    userId: 'demo-superadmin-1',
    userName: 'Amadou Oury Bah',
    userRole: 'superadmin',
    ipAddress: '196.125.1.1',
    timestamp: dateAt(2026, 3, 8, 14, 30),
    details: { document: 'Formulaire CNI v2019', raison: 'Remplacé par version 2026', supprime_par: 'Super Administrateur' },
  },
  {
    id: 'audit-demo-019',
    action: 'update',
    resource: 'workflow',
    resourceId: 'wf-demo-002',
    description: 'Workflow de traitement des passeports biométriques mis à jour — Ajout d\'une étape de vérification biométrique',
    severity: 'info',
    userId: 'demo-agence-1',
    userName: 'Mamadou Soumah',
    userRole: 'agence',
    ipAddress: '196.125.40.22',
    timestamp: dateAt(2026, 3, 10, 9, 15),
    details: { workflow: 'Passeports biométriques', modification: 'Ajout étape vérification biométrique', valide_par: 'Directeur ANIP' },
  },
  {
    id: 'audit-demo-020',
    action: 'logout',
    resource: 'utilisateur',
    description: 'Déconnexion de Mme Fatoumata Bah — Fin de session de travail à la Mairie de Kaloum',
    severity: 'info',
    userId: 'demo-mairie-1',
    userName: 'Mme Fatoumata Bah',
    userRole: 'mairie',
    ipAddress: '196.125.34.56',
    timestamp: dateAt(2026, 3, 10, 17, 30),
    details: { duree_session: '8h 15min', actions_session: '23', deconnexion: 'Normale' },
  },
]

// ─── STORE INTERFACE ─────────────────────────────────────────────────────────

interface AuditLogsStoreState {
  logs: AuditLog[]

  addLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void
  addLogs: (logs: Omit<AuditLog, 'id' | 'timestamp'>[]) => void
  clearLogs: () => void
  getFiltered: (opts: {
    action?: AuditAction | 'all'
    resource?: AuditResource | 'all'
    severity?: AuditSeverity | 'all'
    search?: string
    dateFrom?: string
    dateTo?: string
  }) => AuditLog[]
  getStats: () => {
    total: number
    today: number
    byAction: Record<string, number>
    byResource: Record<string, number>
    criticalCount: number
  }

  resetToDemoData: () => void
}

// ─── STORE ───────────────────────────────────────────────────────────────────

export const useAuditLogsStore = create<AuditLogsStoreState>()(
  persist(
    (set, get) => ({
      logs: DEMO_LOGS,

      // ── Ajouter un log ────────────────────────────────────────────────────

      addLog: (logData) => {
        const newLog: AuditLog = {
          ...logData,
          id: generateId(),
          timestamp: new Date().toISOString(),
        }
        set((state) => ({
          logs: [newLog, ...state.logs],
        }))
      },

      // ── Ajout par lot ─────────────────────────────────────────────────────

      addLogs: (logsData) => {
        const nowIso = new Date().toISOString()
        const newLogs: AuditLog[] = logsData.map((logData) => ({
          ...logData,
          id: generateId(),
          timestamp: nowIso,
        }))
        set((state) => ({
          logs: [...newLogs, ...state.logs],
        }))
      },

      // ── Purger les logs ───────────────────────────────────────────────────

      clearLogs: () => {
        set({ logs: [] })
      },

      // ── Filtrage avancé ───────────────────────────────────────────────────

      getFiltered: (opts) => {
        const { action = 'all', resource = 'all', severity = 'all', search = '', dateFrom, dateTo } = opts
        return get().logs.filter((log) => {
          if (action !== 'all' && log.action !== action) return false
          if (resource !== 'all' && log.resource !== resource) return false
          if (severity !== 'all' && log.severity !== severity) return false
          if (dateFrom && new Date(log.timestamp) < new Date(dateFrom)) return false
          if (dateTo && new Date(log.timestamp) > new Date(dateTo + 'T23:59:59')) return false
          if (search.trim()) {
            const q = search.toLowerCase().trim()
            const matchesSearch =
              log.description.toLowerCase().includes(q) ||
              (log.userName && log.userName.toLowerCase().includes(q)) ||
              (log.resourceId && log.resourceId.toLowerCase().includes(q)) ||
              (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
              (log.details && Object.values(log.details).some((v) => v.toLowerCase().includes(q)))
            if (!matchesSearch) return false
          }
          return true
        })
      },

      // ── Statistiques ──────────────────────────────────────────────────────

      getStats: () => {
        const { logs } = get()
        const byAction: Record<string, number> = {}
        const byResource: Record<string, number> = {}
        let today = 0
        let criticalCount = 0

        const todayStr = new Date().toISOString().slice(0, 10)

        logs.forEach((log) => {
          // By action
          byAction[log.action] = (byAction[log.action] || 0) + 1
          // By resource
          byResource[log.resource] = (byResource[log.resource] || 0) + 1
          // Today
          if (log.timestamp.slice(0, 10) === todayStr) today++
          // Critical
          if (log.severity === 'critical') criticalCount++
        })

        return { total: logs.length, today, byAction, byResource, criticalCount }
      },

      // ── Reset ─────────────────────────────────────────────────────────────

      resetToDemoData: () => {
        set({ logs: DEMO_LOGS })
      },
    }),
    {
      name: 'eadmin-audit-logs-store',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version < 1) {
          return { logs: DEMO_LOGS }
        }
        return persistedState
      },
    }
  )
)
