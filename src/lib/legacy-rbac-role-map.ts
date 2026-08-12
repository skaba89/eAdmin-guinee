import type { UserRole } from '@/data/demo-accounts'
import type { FrontendRole } from '@/lib/frontend-role-authority'

/**
 * Transitional adapter for modules that still use the historical UserRole
 * vocabulary. Authentication already exposes canonical frontend roles; this
 * adapter must never reinterpret backend/unknown role strings as a privilege.
 */
const FRONTEND_TO_LEGACY_ROLE: Readonly<Record<FrontendRole, UserRole>> = {
  citizen: 'citoyen',
  mairie: 'mairie',
  agence: 'agence',
  agent: 'agent',
  admin_general: 'admin',
  chef_service: 'chef_service',
  directeur: 'directeur',
  ministre: 'ministre',
  ministere: 'ministere',
  super_admin: 'superadmin',
}

const LEGACY_ROLES = new Set<UserRole>([
  'citoyen',
  'mairie',
  'admin',
  'agence',
  'agent',
  'chef_service',
  'directeur',
  'ministre',
  'ministere',
  'superadmin',
])

export function mapFrontendRoleToLegacyRole(role: string): UserRole | null {
  const canonical = FRONTEND_TO_LEGACY_ROLE[role as FrontendRole]
  if (canonical) return canonical

  if (LEGACY_ROLES.has(role as UserRole)) {
    return role as UserRole
  }

  return null
}
