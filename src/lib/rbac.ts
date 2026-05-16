// ═══════════════════════════════════════════════════════════════════════════════
// eAdministration Suite Guinea — RBAC & RLS System
// Strict Role-Based Access Control + Row-Level Security
// ═══════════════════════════════════════════════════════════════════════════════

import type { UserRole } from '@/data/demo-accounts'
import type { UserInfo } from '@/store/app-store'
import type { AppPage } from '@/store/app-store'
import type { CitizenRequest } from '@/store/citizen-requests-store'

// ─── PERMISSION DEFINITIONS ──────────────────────────────────────────────────

export type Permission =
  | 'dashboard:view'
  | 'dashboard:view_all'
  | 'service-requests:view'
  | 'service-requests:view_own'
  | 'service-requests:view_assigned'
  | 'service-requests:view_all'
  | 'service-requests:create'
  | 'service-requests:process'
  | 'service-requests:approve'
  | 'service-requests:reject'
  | 'service-requests:delete'
  | 'citizen-portal:view'
  | 'citizen-portal:submit'
  | 'citizen-portal:view_own_requests'
  | 'ged:view'
  | 'ged:view_own'
  | 'ged:view_all'
  | 'ged:upload'
  | 'ged:delete'
  | 'ged:manage_classifications'
  | 'courriers:view'
  | 'courriers:view_own'
  | 'courriers:view_all'
  | 'courriers:create'
  | 'courriers:process'
  | 'workflow:view'
  | 'workflow:manage'
  | 'signatures:view'
  | 'signatures:sign'
  | 'signatures:manage'
  | 'analytics:view'
  | 'analytics:view_own'
  | 'analytics:view_all'
  | 'admin:access'
  | 'admin:manage_modules'
  | 'admin:manage_api_keys'
  | 'admin:system_health'
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'users:manage_roles'
  | 'settings:view'
  | 'settings:edit'
  | 'notifications:view'
  | 'notifications:manage'
  | 'audit-logs:view'
  | 'audit-logs:export'
  | 'ai-agent:view'
  | 'ai-agent:configure'
  | 'ai-agent:process'

// ─── ROLE → PERMISSIONS MAPPING ─────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  citoyen: [
    'citizen-portal:view',
    'citizen-portal:submit',
    'citizen-portal:view_own_requests',
    'service-requests:view_own',
    'service-requests:create',
    'ged:view_own',
  ],

  mairie: [
    'service-requests:view_assigned',
    'service-requests:process',
    'service-requests:approve',
    'service-requests:reject',
    'service-requests:create',
    'citizen-portal:view',
    'ged:view',
    'ged:view_own',
    'ged:upload',
    'courriers:view',
    'courriers:view_own',
    'courriers:create',
    'courriers:process',
    'analytics:view_own',
    'ai-agent:view',
    'notifications:view',
  ],

  agence: [
    'service-requests:view_assigned',
    'service-requests:process',
    'service-requests:approve',
    'service-requests:reject',
    'service-requests:create',
    'citizen-portal:view',
    'ged:view',
    'ged:view_own',
    'ged:upload',
    'analytics:view_own',
    'ai-agent:view',
    'notifications:view',
  ],

  ministere: [
    'dashboard:view',
    'service-requests:view_all',
    'service-requests:process',
    'service-requests:approve',
    'service-requests:reject',
    'service-requests:create',
    'citizen-portal:view',
    'ged:view',
    'ged:view_all',
    'ged:upload',
    'ged:manage_classifications',
    'courriers:view',
    'courriers:view_all',
    'courriers:create',
    'courriers:process',
    'workflow:view',
    'workflow:manage',
    'signatures:view',
    'signatures:sign',
    'analytics:view',
    'analytics:view_all',
    'ai-agent:view',
    'ai-agent:configure',
    'notifications:view',
    'notifications:manage',
    'settings:view',
    'settings:edit',
  ],

  admin: [
    'dashboard:view',
    'dashboard:view_all',
    'service-requests:view_all',
    'service-requests:process',
    'service-requests:approve',
    'service-requests:reject',
    'service-requests:delete',
    'service-requests:create',
    'citizen-portal:view',
    'ged:view',
    'ged:view_all',
    'ged:upload',
    'ged:delete',
    'ged:manage_classifications',
    'courriers:view',
    'courriers:view_all',
    'courriers:create',
    'courriers:process',
    'workflow:view',
    'workflow:manage',
    'signatures:view',
    'signatures:sign',
    'signatures:manage',
    'analytics:view',
    'analytics:view_all',
    'admin:access',
    'admin:manage_modules',
    'admin:manage_api_keys',
    'admin:system_health',
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'users:manage_roles',
    'settings:view',
    'settings:edit',
    'notifications:view',
    'notifications:manage',
    'audit-logs:view',
    'audit-logs:export',
    'ai-agent:view',
    'ai-agent:configure',
    'ai-agent:process',
  ],

  superadmin: [
    // SuperAdmin has ALL permissions
    'dashboard:view',
    'dashboard:view_all',
    'service-requests:view_own',
    'service-requests:view_assigned',
    'service-requests:view_all',
    'service-requests:create',
    'service-requests:process',
    'service-requests:approve',
    'service-requests:reject',
    'service-requests:delete',
    'citizen-portal:view',
    'citizen-portal:submit',
    'citizen-portal:view_own_requests',
    'ged:view',
    'ged:view_own',
    'ged:view_all',
    'ged:upload',
    'ged:delete',
    'ged:manage_classifications',
    'courriers:view',
    'courriers:view_own',
    'courriers:view_all',
    'courriers:create',
    'courriers:process',
    'workflow:view',
    'workflow:manage',
    'signatures:view',
    'signatures:sign',
    'signatures:manage',
    'analytics:view',
    'analytics:view_own',
    'analytics:view_all',
    'admin:access',
    'admin:manage_modules',
    'admin:manage_api_keys',
    'admin:system_health',
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'users:manage_roles',
    'settings:view',
    'settings:edit',
    'notifications:view',
    'notifications:manage',
    'audit-logs:view',
    'audit-logs:export',
    'ai-agent:view',
    'ai-agent:configure',
    'ai-agent:process',
  ],
}

// ─── PAGE ACCESS CONTROL ─────────────────────────────────────────────────────

export interface PageAccessRule {
  page: AppPage
  requiredPermissions: Permission[]
  requireAny?: boolean  // If true, user needs ANY of the permissions (OR). If false, needs ALL (AND).
}

const PAGE_ACCESS_RULES: PageAccessRule[] = [
  { page: 'dashboard', requiredPermissions: ['dashboard:view'] },
  { page: 'service-requests', requiredPermissions: ['service-requests:view_own', 'service-requests:view_assigned', 'service-requests:view_all'], requireAny: true },
  { page: 'citizen-portal', requiredPermissions: ['citizen-portal:view', 'citizen-portal:view_own_requests'], requireAny: true },
  { page: 'ged', requiredPermissions: ['ged:view'] },
  { page: 'courriers', requiredPermissions: ['courriers:view'] },
  { page: 'workflow', requiredPermissions: ['workflow:view'] },
  { page: 'signatures', requiredPermissions: ['signatures:view'] },
  { page: 'analytics', requiredPermissions: ['analytics:view'] },
  { page: 'admin', requiredPermissions: ['admin:access'] },
  { page: 'users', requiredPermissions: ['users:view'] },
  { page: 'settings', requiredPermissions: ['settings:view'] },
  { page: 'notifications', requiredPermissions: ['notifications:view'] },
  { page: 'audit-logs', requiredPermissions: ['audit-logs:view'] },
  { page: 'ai-agent', requiredPermissions: ['ai-agent:view'] },
]

// ─── INSTITUTION → SERVICE CATEGORY MAPPING (for RLS) ─────────────────────

export const INSTITUTION_CATEGORY_ACCESS: Record<string, string[]> = {
  'Mairie de Kaloum': ['etat-civil', 'residence'],
  'Mairie / Commune': ['etat-civil', 'residence'],
  "Agence Nationale d'Identification (ANIP)": ['identification'],
  'ANIP': ['identification'],
  'Ministère de la Justice': ['justice'],
  "Ministère de l'Administration Territoriale et de la Décentralisation": ['etat-civil', 'justice', 'identification', 'urbanisme', 'entreprise', 'education', 'sante', 'residence', 'fiscalite', 'social'],
  'Direction de l\'Urbanisme': ['urbanisme'],
  'APIP — Agence de Promotion des Investissements Privés': ['entreprise'],
  "Ministère de l'Éducation Nationale": ['education'],
  'Ministère de la Santé': ['sante'],
  'Présidence de la République — Service e-Gouvernement': ['etat-civil', 'justice', 'identification', 'urbanisme', 'entreprise', 'education', 'sante', 'residence', 'fiscalite', 'social'],
  'Direction Générale de la Modernisation Administrative': ['etat-civil', 'justice', 'identification', 'urbanisme', 'entreprise', 'education', 'sante', 'residence', 'fiscalite', 'social'],
  'Direction Générale des Impôts': ['fiscalite'],
  'Caisse Nationale de Sécurité Sociale': ['social'],
  'Portail Citoyen': [],
}

// ─── ASSIGNED SERVICE → INSTITUTION MAPPING ─────────────────────────────────

const ASSIGNED_SERVICE_TO_CATEGORIES: Record<string, string[]> = {
  'Mairie / Commune': ['etat-civil', 'residence'],
  'Ministère de la Justice': ['justice'],
  "Agence Nationale d'Identification (ANIP)": ['identification'],
  'Direction de l\'Urbanisme': ['urbanisme'],
  'APIP — Agence de Promotion des Investissements Privés': ['entreprise'],
  "Ministère de l'Éducation Nationale": ['education'],
  'Ministère de la Santé': ['sante'],
  'Direction Générale des Impôts': ['fiscalite'],
  'Caisse Nationale de Sécurité Sociale': ['social'],
}

// ─── CORE RBAC FUNCTIONS ────────────────────────────────────────────────────

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: UserInfo | null, permission: Permission): boolean {
  if (!user) return false
  const rolePerms = ROLE_PERMISSIONS[user.role]
  if (!rolePerms) return false
  return rolePerms.includes(permission)
}

/**
 * Check if a user has ANY of the given permissions
 */
export function hasAnyPermission(user: UserInfo | null, permissions: Permission[]): boolean {
  if (!user) return false
  return permissions.some(p => hasPermission(user, p))
}

/**
 * Check if a user has ALL of the given permissions
 */
export function hasAllPermissions(user: UserInfo | null, permissions: Permission[]): boolean {
  if (!user) return false
  return permissions.every(p => hasPermission(user, p))
}

/**
 * Check if a user can access a specific page
 */
export function canAccessPage(user: UserInfo | null, page: AppPage): boolean {
  if (!user) return false

  // SuperAdmin can access everything
  if (user.role === 'superadmin') return true

  const rule = PAGE_ACCESS_RULES.find(r => r.page === page)
  if (!rule) return true // Pages without rules are accessible to all authenticated users

  if (rule.requireAny) {
    return hasAnyPermission(user, rule.requiredPermissions)
  }
  return hasAllPermissions(user, rule.requiredPermissions)
}

/**
 * Get the list of pages a user can access
 */
export function getAccessiblePages(user: UserInfo | null): AppPage[] {
  if (!user) return []

  const allAppPages: AppPage[] = [
    'dashboard', 'ged', 'courriers', 'workflow', 'signatures',
    'analytics', 'admin', 'users', 'settings', 'notifications',
    'audit-logs', 'citizen-portal', 'service-requests', 'ai-agent',
  ]

  return allAppPages.filter(page => canAccessPage(user, page))
}

/**
 * Get the default page for a user if they try to access an unauthorized page
 */
export function getDefaultPage(user: UserInfo | null): AppPage {
  if (!user) return 'landing'

  const accessiblePages = getAccessiblePages(user)
  if (accessiblePages.length === 0) return 'landing'

  // Return the first accessible page based on role priority
  const roleDefaultPage: Record<UserRole, AppPage> = {
    citoyen: 'citizen-portal',
    mairie: 'service-requests',
    admin: 'admin',
    agence: 'service-requests',
    ministere: 'dashboard',
    superadmin: 'dashboard',
  }

  const defaultPage = roleDefaultPage[user.role]
  if (accessiblePages.includes(defaultPage)) return defaultPage
  return accessiblePages[0]
}

// ─── RLS (Row-Level Security) FUNCTIONS ─────────────────────────────────────

/**
 * Filter citizen requests based on user's RLS rules
 * - citoyen: sees only own requests (citizenEmail matches)
 * - mairie/agence: sees requests assigned to their institution categories
 * - ministere: sees all requests (oversight role)
 * - admin/superadmin: sees all requests
 */
export function filterRequestsByRLS(
  requests: CitizenRequest[],
  user: UserInfo | null
): CitizenRequest[] {
  if (!user) return []

  switch (user.role) {
    case 'citoyen': {
      // Citizen sees ONLY their own requests
      return requests.filter(r => r.citizenEmail === user.email)
    }

    case 'mairie': {
      // Mairie sees requests in their assigned categories (etat-civil, residence)
      const allowedCategories = getInstitutionCategories(user.institution)
      if (allowedCategories.length === 0) {
        // Fallback: mairie always sees etat-civil and residence
        return requests.filter(r =>
          r.categoryId === 'etat-civil' || r.categoryId === 'residence'
        )
      }
      return requests.filter(r => allowedCategories.includes(r.categoryId))
    }

    case 'agence': {
      // ANIP sees only identification requests
      const allowedCategories = getInstitutionCategories(user.institution)
      if (allowedCategories.length === 0) {
        return requests.filter(r => r.categoryId === 'identification')
      }
      return requests.filter(r => allowedCategories.includes(r.categoryId))
    }

    case 'ministere': {
      // Ministere has oversight — sees ALL requests
      return requests
    }

    case 'admin': {
      // Admin sees all requests
      return requests
    }

    case 'superadmin': {
      // SuperAdmin sees everything
      return requests
    }

    default:
      return []
  }
}

/**
 * Filter requests for the "Mes demandes" view (citizen's own requests only)
 */
export function filterOwnRequests(
  requests: CitizenRequest[],
  user: UserInfo | null
): CitizenRequest[] {
  if (!user) return []
  return requests.filter(r => r.citizenEmail === user.email)
}

/**
 * Filter requests assigned to a user's institution for processing
 */
export function filterAssignedRequests(
  requests: CitizenRequest[],
  user: UserInfo | null
): CitizenRequest[] {
  if (!user) return []

  // Map user institution to the assignedService field in requests
  const institutionServiceMap: Record<string, string[]> = {
    'Mairie de Kaloum': ['Mairie / Commune'],
    "Agence Nationale d'Identification (ANIP)": ["Agence Nationale d'Identification (ANIP)"],
    'Ministère de la Justice': ['Ministère de la Justice'],
    "Ministère de l'Administration Territoriale et de la Décentralisation": [
      'Mairie / Commune',
      'Ministère de la Justice',
      "Agence Nationale d'Identification (ANIP)",
      'Direction de l\'Urbanisme',
      'APIP — Agence de Promotion des Investissements Privés',
      "Ministère de l'Éducation Nationale",
      'Ministère de la Santé',
      'Direction Générale des Impôts',
      'Caisse Nationale de Sécurité Sociale',
    ],
    'Direction Générale de la Modernisation Administrative': [
      'Mairie / Commune',
      'Ministère de la Justice',
      "Agence Nationale d'Identification (ANIP)",
      'Direction de l\'Urbanisme',
      'APIP — Agence de Promotion des Investissements Privés',
      "Ministère de l'Éducation Nationale",
      'Ministère de la Santé',
      'Direction Générale des Impôts',
      'Caisse Nationale de Sécurité Sociale',
    ],
    'Présidence de la République — Service e-Gouvernement': [
      'Mairie / Commune',
      'Ministère de la Justice',
      "Agence Nationale d'Identification (ANIP)",
      'Direction de l\'Urbanisme',
      'APIP — Agence de Promotion des Investissements Privés',
      "Ministère de l'Éducation Nationale",
      'Ministère de la Santé',
      'Direction Générale des Impôts',
      'Caisse Nationale de Sécurité Sociale',
    ],
  }

  const allowedServices = institutionServiceMap[user.institution]

  if (!allowedServices) {
    // Fallback: try to match by category
    const allowedCategories = getInstitutionCategories(user.institution)
    return requests.filter(r => allowedCategories.includes(r.categoryId))
  }

  return requests.filter(r => allowedServices.includes(r.assignedService))
}

/**
 * Check if a user can view a specific request
 */
export function canViewRequest(user: UserInfo | null, request: CitizenRequest): boolean {
  if (!user) return false
  if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'ministere') return true

  if (user.role === 'citoyen') {
    return request.citizenEmail === user.email
  }

  if (user.role === 'mairie' || user.role === 'agence') {
    const allowedCategories = getInstitutionCategories(user.institution)
    return allowedCategories.includes(request.categoryId)
  }

  return false
}

/**
 * Check if a user can process (change status, add notes) a specific request
 */
export function canProcessRequest(user: UserInfo | null, request: CitizenRequest): boolean {
  if (!user) return false
  if (user.role === 'superadmin' || user.role === 'admin') return true
  if (user.role === 'citoyen') return false // Citizens cannot process requests
  if (user.role === 'ministere') return true // Oversight role can process

  if (user.role === 'mairie' || user.role === 'agence') {
    const allowedCategories = getInstitutionCategories(user.institution)
    return allowedCategories.includes(request.categoryId)
  }

  return false
}

/**
 * Check if a user can delete a request
 */
export function canDeleteRequest(user: UserInfo | null, _request: CitizenRequest): boolean {
  if (!user) return false
  return hasPermission(user, 'service-requests:delete')
}

// ─── DOCUMENT/FILE RLS ──────────────────────────────────────────────────────

export interface GedDocument {
  id: string
  title: string
  classification: 'public' | 'interne' | 'confidentiel' | 'secret'
  institution: string
  ownerId?: string
  categoryId?: string
}

/**
 * Filter documents based on user's clearance level and institution
 */
export function filterDocumentsByRLS<T extends GedDocument>(
  documents: T[],
  user: UserInfo | null
): T[] {
  if (!user) return []

  // Classification hierarchy: public < interne < confidentiel < secret
  const clearanceLevel: Record<UserRole, number> = {
    citoyen: 0,       // Can only see 'public'
    mairie: 1,        // Can see 'public' + 'interne'
    agence: 1,        // Can see 'public' + 'interne'
    ministere: 2,     // Can see 'public' + 'interne' + 'confidentiel'
    admin: 3,         // Can see everything including 'secret'
    superadmin: 3,    // Can see everything
  }

  const classificationLevel: Record<string, number> = {
    public: 0,
    interne: 1,
    confidentiel: 2,
    secret: 3,
  }

  const userClearance = clearanceLevel[user.role] ?? 0

  return documents.filter(doc => {
    const docLevel = classificationLevel[doc.classification] ?? 0

    // Clearance check
    if (docLevel > userClearance) return false

    // Institution check for non-public docs
    if (docLevel >= 1 && user.role !== 'superadmin' && user.role !== 'admin' && user.role !== 'ministere') {
      // Must match institution
      const allowedCategories = getInstitutionCategories(user.institution)
      if (doc.categoryId && !allowedCategories.includes(doc.categoryId)) return false
    }

    return true
  })
}

// ─── COURRIER RLS ────────────────────────────────────────────────────────────

export interface CourrierItem {
  id: string
  institution?: string
  categoryId?: string
  confidential?: boolean
  ownerId?: string
}

/**
 * Filter courriers based on user's role and institution
 */
export function filterCourriersByRLS<T extends CourrierItem>(
  courriers: T[],
  user: UserInfo | null
): T[] {
  if (!user) return []

  if (user.role === 'superadmin' || user.role === 'admin') return courriers
  if (user.role === 'ministere') return courriers // Oversight

  // Confidential courriers only for admin+ and ministere
  if (user.role === 'mairie' || user.role === 'agence') {
    return courriers.filter(c => !c.confidential)
  }

  // Citizens don't see courriers
  if (user.role === 'citoyen') return []

  return courriers
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

/**
 * Get the categories a given institution can access
 */
function getInstitutionCategories(institution: string): string[] {
  // Direct match
  if (INSTITUTION_CATEGORY_ACCESS[institution]) {
    return INSTITUTION_CATEGORY_ACCESS[institution]
  }

  // Partial match (e.g., "Mairie de ..." matches "Mairie")
  for (const [key, categories] of Object.entries(INSTITUTION_CATEGORY_ACCESS)) {
    if (institution.toLowerCase().includes(key.toLowerCase().split(' ')[0])) {
      return categories
    }
  }

  return []
}

/**
 * Get RLS scope description for a user (for UI display)
 */
export function getRLSScopeDescription(user: UserInfo | null): string {
  if (!user) return 'Aucun accès'

  switch (user.role) {
    case 'citoyen':
      return 'Vos demandes uniquement'
    case 'mairie':
      return 'Demandes État Civil & Résidence'
    case 'agence':
      return 'Demandes Identification (ANIP)'
    case 'ministere':
      return 'Toutes les demandes (supervision)'
    case 'admin':
      return 'Accès complet (administration)'
    case 'superadmin':
      return 'Accès total (super administrateur)'
    default:
      return 'Accès restreint'
  }
}

/**
 * Get the permission summary for a role
 */
export function getRolePermissionSummary(role: UserRole): {
  totalPermissions: number
  permissions: Permission[]
  scope: string
  dataAccess: string
} {
  const permissions = ROLE_PERMISSIONS[role] || []
  return {
    totalPermissions: permissions.length,
    permissions,
    scope: getRLSScopeDescription({ name: '', firstName: '', email: '', role, institution: '', fonction: '' }),
    dataAccess: role === 'citoyen' ? 'Données propres uniquement'
      : role === 'mairie' || role === 'agence' ? 'Données du service assigné'
      : role === 'ministere' ? 'Toutes les données (lecture + traitement)'
      : 'Accès complet',
  }
}

/**
 * Check if an action button should be shown based on permissions
 */
export function canShowAction(user: UserInfo | null, action: string, resource: string): boolean {
  if (!user) return false
  const permission = `${resource}:${action}` as Permission
  return hasPermission(user, permission)
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA ACCESS LOGGING — Audit trail for all data access attempts
// ═══════════════════════════════════════════════════════════════════════════════

export interface DataAccessLog {
  id: string
  userId: string
  userEmail: string
  userRole: string
  resource: 'requests' | 'documents' | 'courriers' | 'users' | 'workflows'
  resourceId: string
  action: 'read' | 'write' | 'delete' | 'export'
  timestamp: string
  allowed: boolean
  reason?: string
}

// In-memory access log store (not persisted to avoid memory bloat in localStorage)
const dataAccessLogs: DataAccessLog[] = []
const MAX_ACCESS_LOGS = 500

/**
 * Log a data access attempt
 */
export function logDataAccess(
  user: UserInfo | null,
  resource: DataAccessLog['resource'],
  resourceId: string,
  action: DataAccessLog['action'],
  allowed: boolean,
  reason?: string
): DataAccessLog {
  const log: DataAccessLog = {
    id: `dal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: user?.email || 'anonymous',
    userEmail: user?.email || 'anonymous',
    userRole: user?.role || 'unknown',
    resource,
    resourceId,
    action,
    timestamp: new Date().toISOString(),
    allowed,
    reason,
  }

  dataAccessLogs.unshift(log)
  // Trim old logs
  if (dataAccessLogs.length > MAX_ACCESS_LOGS) {
    dataAccessLogs.length = MAX_ACCESS_LOGS
  }

  return log
}

/**
 * Get data access logs, optionally filtered by userId
 */
export function getDataAccessLogs(userId?: string): DataAccessLog[] {
  if (userId) {
    return dataAccessLogs.filter(log => log.userId === userId)
  }
  return [...dataAccessLogs]
}

/**
 * Check if a data access is allowed and log it
 * Returns true if access is allowed, false otherwise
 */
export function checkDataAccess(
  user: UserInfo | null,
  resource: DataAccessLog['resource'],
  action: DataAccessLog['action'],
  resourceId?: string
): boolean {
  if (!user) {
    logDataAccess(null, resource, resourceId || 'unknown', action, false, 'Utilisateur non authentifié')
    return false
  }

  let allowed = false
  let reason: string | undefined

  switch (resource) {
    case 'requests': {
      if (action === 'read') {
        allowed = hasAnyPermission(user, ['service-requests:view_own', 'service-requests:view_assigned', 'service-requests:view_all'])
        if (!allowed) reason = 'Aucune permission de lecture des demandes'
      } else if (action === 'write') {
        allowed = hasAnyPermission(user, ['service-requests:process', 'service-requests:approve', 'service-requests:reject'])
        if (!allowed) reason = 'Aucune permission d\'écriture sur les demandes'
      } else if (action === 'delete') {
        allowed = hasPermission(user, 'service-requests:delete')
        if (!allowed) reason = 'Permission de suppression requise'
      } else if (action === 'export') {
        allowed = hasAnyPermission(user, ['service-requests:view_all', 'service-requests:view_assigned'])
        if (!allowed) reason = 'Permission d\'export requise'
      }
      break
    }
    case 'documents': {
      if (action === 'read') {
        allowed = hasAnyPermission(user, ['ged:view', 'ged:view_own', 'ged:view_all'])
        if (!allowed) reason = 'Aucune permission de lecture des documents'
      } else if (action === 'write') {
        allowed = hasPermission(user, 'ged:upload')
        if (!allowed) reason = 'Permission d\'upload requise'
      } else if (action === 'delete') {
        allowed = hasPermission(user, 'ged:delete')
        if (!allowed) reason = 'Permission de suppression requise'
      } else if (action === 'export') {
        allowed = hasAnyPermission(user, ['ged:view', 'ged:view_own'])
        if (!allowed) reason = 'Permission d\'export requise'
      }
      break
    }
    case 'courriers': {
      if (action === 'read') {
        allowed = hasAnyPermission(user, ['courriers:view', 'courriers:view_own', 'courriers:view_all'])
        if (!allowed) reason = 'Aucune permission de lecture des courriers'
      } else if (action === 'write') {
        allowed = hasAnyPermission(user, ['courriers:create', 'courriers:process'])
        if (!allowed) reason = 'Permission d\'écriture sur les courriers requise'
      } else if (action === 'delete') {
        allowed = false
        reason = 'Suppression des courriers non autorisée'
      } else if (action === 'export') {
        allowed = hasAnyPermission(user, ['courriers:view', 'courriers:view_all'])
        if (!allowed) reason = 'Permission d\'export requise'
      }
      break
    }
    case 'users': {
      if (action === 'read') {
        allowed = hasPermission(user, 'users:view')
        if (!allowed) reason = 'Permission de consultation des utilisateurs requise'
      } else if (action === 'write') {
        allowed = hasAnyPermission(user, ['users:edit', 'users:manage_roles'])
        if (!allowed) reason = 'Permission de modification des utilisateurs requise'
      } else if (action === 'delete') {
        allowed = hasPermission(user, 'users:delete')
        if (!allowed) reason = 'Permission de suppression requise'
      } else if (action === 'export') {
        allowed = hasPermission(user, 'users:view')
        if (!allowed) reason = 'Permission d\'export requise'
      }
      break
    }
    case 'workflows': {
      if (action === 'read') {
        allowed = hasPermission(user, 'workflow:view')
        if (!allowed) reason = 'Permission de lecture des workflows requise'
      } else if (action === 'write') {
        allowed = hasPermission(user, 'workflow:manage')
        if (!allowed) reason = 'Permission de gestion des workflows requise'
      } else {
        allowed = false
        reason = 'Action non autorisée sur les workflows'
      }
      break
    }
    default: {
      allowed = false
      reason = 'Ressource inconnue'
    }
  }

  logDataAccess(user, resource, resourceId || 'bulk', action, allowed, reason)
  return allowed
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT CLASSIFICATION ENFORCEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export type DocClassificationLevel = 'PUBLIC' | 'DIFFUSION LIMITÉE' | 'CONFIDENTIEL' | 'SECRET'

const CLASSIFICATION_LEVEL_MAP: Record<DocClassificationLevel, number> = {
  'PUBLIC': 0,
  'DIFFUSION LIMITÉE': 1,
  'CONFIDENTIEL': 2,
  'SECRET': 3,
}

/**
 * Get the maximum classification level a role can access
 */
export function getMaxClassificationLevel(role: UserRole): DocClassificationLevel {
  const roleClearance: Record<UserRole, number> = {
    citoyen: 0,       // PUBLIC only
    mairie: 1,        // up to DIFFUSION LIMITÉE
    agence: 1,        // up to DIFFUSION LIMITÉE
    ministere: 2,     // up to CONFIDENTIEL
    admin: 3,         // all including SECRET
    superadmin: 3,    // all including SECRET
  }

  const level = roleClearance[role] ?? 0
  const levels: DocClassificationLevel[] = ['PUBLIC', 'DIFFUSION LIMITÉE', 'CONFIDENTIEL', 'SECRET']
  return levels[Math.min(level, 3)]
}

/**
 * Check if a user can access a specific document classification
 */
export function canAccessClassification(user: UserInfo | null, classification: DocClassificationLevel): boolean {
  if (!user) return false

  const userMaxLevel = CLASSIFICATION_LEVEL_MAP[getMaxClassificationLevel(user.role)]
  const docLevel = CLASSIFICATION_LEVEL_MAP[classification]

  return docLevel <= userMaxLevel
}

/**
 * Get a human-readable label for the max classification a role can access
 */
export function getClassificationLabel(role: UserRole): string {
  const maxLevel = getMaxClassificationLevel(role)
  const labels: Record<DocClassificationLevel, string> = {
    'PUBLIC': 'Documents publics uniquement',
    'DIFFUSION LIMITÉE': 'Jusqu\'à Diffusion Limitée',
    'CONFIDENTIEL': 'Jusqu\'à Confidentiel',
    'SECRET': 'Accès complet (Secret inclus)',
  }
  return labels[maxLevel]
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN-LEVEL SECURITY — Field visibility per role
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the list of visible fields for a role on a given resource.
 * Fields not in this list should be hidden or redacted in the UI.
 */
export function getVisibleFields(userRole: UserRole, resource: 'requests' | 'documents' | 'courriers' | 'users'): string[] {
  // All possible fields per resource
  const ALL_REQUEST_FIELDS = [
    'id', 'reference', 'serviceId', 'serviceName', 'category', 'categoryId',
    'citizenName', 'citizenFirstName', 'citizenNIN', 'citizenPhone', 'citizenEmail', 'citizenAddress',
    'motif', 'documents', 'attachedFiles',
    'status', 'assignedService', 'assignedAgent', 'processingNotes',
    'timeline', 'createdAt', 'updatedAt', 'completedAt',
    'deliveryMode', 'deliveryLocation', 'documentUrl', 'producedDocument',
    'aiProcessingStatus', 'aiProcessingDate', 'aiConfidence', 'aiProcessingDetails',
  ]

  const ALL_DOCUMENT_FIELDS = [
    'id', 'reference', 'objet', 'type', 'institution', 'region', 'taille',
    'classification', 'statut', 'date', 'uploadedBy', 'createdAt',
  ]

  const ALL_COURRIER_FIELDS = [
    'id', 'reference', 'objet', 'type', 'expediteur', 'destinataire',
    'date', 'statut', 'priorite', 'classification', 'circuit',
    'delaiSLA', 'dateReception', 'notes',
  ]

  const ALL_USER_FIELDS = [
    'id', 'name', 'firstName', 'email', 'institution', 'role',
    'phone', 'address', 'nin', 'fonction', 'createdAt',
  ]

  switch (resource) {
    case 'requests': {
      if (userRole === 'admin' || userRole === 'superadmin') {
        return ALL_REQUEST_FIELDS // Admin sees everything
      }
      if (userRole === 'ministere') {
        // Ministere can see most fields but not citizen NIN/phone/address
        return ALL_REQUEST_FIELDS.filter(f =>
          !['citizenNIN', 'citizenPhone', 'citizenAddress'].includes(f)
        )
      }
      if (userRole === 'mairie' || userRole === 'agence') {
        // Agents can't see other citizens' sensitive data or internal processing notes
        return ALL_REQUEST_FIELDS.filter(f =>
          !['citizenNIN', 'citizenPhone', 'citizenAddress', 'aiProcessingDetails'].includes(f)
        )
      }
      if (userRole === 'citoyen') {
        // Citizens see their own data but NOT assignedAgent or processingNotes for others
        return ALL_REQUEST_FIELDS.filter(f =>
          !['assignedAgent', 'processingNotes', 'aiProcessingDetails'].includes(f)
        )
      }
      return ['id', 'reference', 'status', 'serviceName']
    }

    case 'documents': {
      if (userRole === 'admin' || userRole === 'superadmin') {
        return ALL_DOCUMENT_FIELDS
      }
      if (userRole === 'ministere') {
        return ALL_DOCUMENT_FIELDS
      }
      if (userRole === 'mairie' || userRole === 'agence') {
        // Can't see who uploaded or classification details of confidential docs
        return ALL_DOCUMENT_FIELDS.filter(f => f !== 'uploadedBy')
      }
      if (userRole === 'citoyen') {
        // Citizens only see public document info
        return ALL_DOCUMENT_FIELDS.filter(f =>
          !['uploadedBy', 'region'].includes(f)
        )
      }
      return ['id', 'reference', 'objet', 'type']
    }

    case 'courriers': {
      if (userRole === 'admin' || userRole === 'superadmin') {
        return ALL_COURRIER_FIELDS
      }
      if (userRole === 'ministere') {
        return ALL_COURRIER_FIELDS
      }
      if (userRole === 'mairie' || userRole === 'agence') {
        // Can't see notes or internal classification details
        return ALL_COURRIER_FIELDS.filter(f =>
          !['notes', 'delaiSLA'].includes(f)
        )
      }
      // Citizens don't see courriers at all
      return []
    }

    case 'users': {
      if (userRole === 'admin' || userRole === 'superadmin') {
        return ALL_USER_FIELDS
      }
      if (userRole === 'ministere') {
        return ALL_USER_FIELDS.filter(f =>
          !['nin', 'phone', 'address'].includes(f)
        )
      }
      // Other roles see very limited user info
      return ['id', 'name', 'firstName', 'email', 'role', 'institution']
    }

    default:
      return []
  }
}

/**
 * Get a description of the column-level security rules for a role
 */
export function getColumnSecurityDescription(role: UserRole): string {
  switch (role) {
    case 'citoyen':
      return 'Données personnelles visibles uniquement. Les notes de traitement et l\'agent assigné sont masqués.'
    case 'mairie':
      return 'Accès aux demandes État Civil & Résidence. Le NIN et les coordonnées des citoyens sont masqués.'
    case 'agence':
      return 'Accès aux demandes d\'identification. Le NIN et les coordonnées des citoyens sont masqués.'
    case 'ministere':
      return 'Accès de supervision à toutes les demandes. Les données sensibles (NIN, téléphone) sont masquées.'
    case 'admin':
      return 'Accès complet à tous les champs et données, y compris les notes internes et classifications.'
    case 'superadmin':
      return 'Accès total sans restriction — tous les champs et toutes les classifications.'
    default:
      return 'Accès minimal.'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE-LEVEL ACCESS CONTROL (Habilitation-based)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SERVICE → CATEGORY mapping for habilitation checks
 */
const SERVICE_TO_CATEGORY: Record<string, string> = {
  'ec-1': 'etat-civil', 'ec-2': 'etat-civil', 'ec-3': 'etat-civil',
  'ec-4': 'etat-civil', 'ec-5': 'etat-civil', 'ec-6': 'etat-civil',
  'j-1': 'justice', 'j-2': 'justice', 'j-3': 'justice',
  'id-1': 'identification', 'id-2': 'identification', 'id-3': 'identification',
  'u-1': 'urbanisme', 'u-2': 'urbanisme', 'u-3': 'urbanisme',
  'e-1': 'entreprise', 'e-2': 'entreprise',
  'ed-1': 'education', 'ed-2': 'education', 'ed-3': 'education',
  's-1': 'sante', 's-2': 'sante',
  'r-1': 'residence', 'r-2': 'residence',
  'fi-1': 'fiscalite', 'fi-2': 'fiscalite',
  'so-1': 'social', 'so-2': 'social',
}

/**
 * Check if a user can access a specific service based on their habilitation
 * Uses institution mapping for mairie/agence, full access for admin+
 */
export function canAccessService(user: UserInfo | null, serviceId: string): boolean {
  if (!user) return false

  // Citizens can access all services (they submit requests)
  if (user.role === 'citoyen') return true

  // Admin and superadmin can access everything
  if (user.role === 'superadmin' || user.role === 'admin') return true

  // Ministere has oversight — can access all services
  if (user.role === 'ministere') return true

  // For mairie and agence, check institution → category mapping
  if (user.role === 'mairie' || user.role === 'agence') {
    const serviceCategory = SERVICE_TO_CATEGORY[serviceId]
    if (!serviceCategory) return true // Unknown services are accessible by default

    const allowedCategories = getInstitutionCategories(user.institution)
    return allowedCategories.includes(serviceCategory)
  }

  return false
}

/**
 * Get the list of service IDs a user can access based on their habilitation
 */
export function getAccessibleServiceIds(user: UserInfo | null): string[] {
  if (!user) return []

  // Citizens can access all services
  if (user.role === 'citoyen') {
    return Object.keys(SERVICE_TO_CATEGORY)
  }

  // Admin, superadmin, ministere can access everything
  if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'ministere') {
    return Object.keys(SERVICE_TO_CATEGORY)
  }

  // For mairie and agence, filter by institution categories
  if (user.role === 'mairie' || user.role === 'agence') {
    const allowedCategories = getInstitutionCategories(user.institution)
    return Object.entries(SERVICE_TO_CATEGORY)
      .filter(([_, categoryId]) => allowedCategories.includes(categoryId))
      .map(([serviceId]) => serviceId)
  }

  return []
}

/**
 * Get the habilitation level description for a user on a specific service
 */
export function getServiceHabilitationLevel(user: UserInfo | null, serviceId: string): string {
  if (!user) return 'Aucun accès'

  if (user.role === 'superadmin') return 'Administration complète'
  if (user.role === 'admin') return 'Administration'
  if (user.role === 'ministere') return 'Supervision'
  if (user.role === 'citoyen') return 'Demande (citoyen)'

  if (user.role === 'mairie' || user.role === 'agence') {
    if (canAccessService(user, serviceId)) {
      return 'Traitement & Validation'
    }
    return 'Non habilité'
  }

  return 'Aucun accès'
}

/**
 * Filter requests by service habilitation (in addition to RLS)
 * This is an additional layer on top of filterRequestsByRLS
 */
export function filterRequestsByHabilitation(
  requests: CitizenRequest[],
  user: UserInfo | null
): CitizenRequest[] {
  if (!user) return []

  // First apply RLS
  const rlsFiltered = filterRequestsByRLS(requests, user)

  // For mairie/agence, also filter by service habilitation
  if (user.role === 'mairie' || user.role === 'agence') {
    const accessibleServiceIds = getAccessibleServiceIds(user)
    return rlsFiltered.filter(r =>
      accessibleServiceIds.includes(r.serviceId)
    )
  }

  return rlsFiltered
}
