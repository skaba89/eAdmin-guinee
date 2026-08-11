import type { UserInfo } from '@/store/app-store'
import type { CitizenRequest } from '@/store/citizen-requests-store'

const INSTITUTION_SCOPED_ROLES = new Set<UserInfo['role']>([
  'mairie',
  'agence',
  'agent',
  'admin_general',
  'chef_service',
  'directeur',
])

function normalizeScope(value?: string): string | null {
  const normalized = value?.trim()
  return normalized || null
}

/**
 * Defense-in-depth frontend filter for service requests already scoped by FastAPI
 * and PostgreSQL RLS. It never widens server visibility:
 * - SUPER_ADMIN keeps the global server result;
 * - MINISTRE keeps the current tenant result;
 * - operational roles must match the signed institution scope;
 * - CITOYEN must match the signed tenant and their own e-mail.
 *
 * Missing signed scope fails closed for every non-super-admin role.
 */
export function filterServiceRequestsBySignedScope(
  requests: CitizenRequest[],
  user: UserInfo | null,
): CitizenRequest[] {
  if (!user) return []
  if (user.role === 'super_admin') return requests

  const tenantId = normalizeScope(user.tenantId)
  if (!tenantId) return []

  const tenantScoped = requests.filter(
    (request) => normalizeScope(request.tenantId) === tenantId,
  )

  if (user.role === 'citizen') {
    const email = user.email.trim().toLowerCase()
    return tenantScoped.filter(
      (request) => request.citizenEmail.trim().toLowerCase() === email,
    )
  }

  if (user.role === 'ministre' || user.role === 'ministere') {
    return tenantScoped
  }

  if (INSTITUTION_SCOPED_ROLES.has(user.role)) {
    const institutionId = normalizeScope(user.institutionId)
    if (!institutionId) return []
    return tenantScoped.filter(
      (request) => normalizeScope(request.institutionId) === institutionId,
    )
  }

  return []
}

export function isServiceRequestWithinSignedScope(
  request: CitizenRequest,
  user: UserInfo | null,
): boolean {
  return filterServiceRequestsBySignedScope([request], user).length === 1
}
