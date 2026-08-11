import type { UserInfo } from '@/store/app-store'

export type FrontendRole = UserInfo['role']

/**
 * Mirrors backend RoleEnum.hierarchy_level().
 * `ministere` is a temporary legacy frontend alias treated as MINISTRE until
 * persisted pre-migration sessions have expired.
 */
export const FRONTEND_ROLE_LEVELS: Readonly<Record<FrontendRole, number>> = {
  citizen: 0,
  mairie: 2,
  agence: 2,
  agent: 2,
  admin_general: 3,
  chef_service: 4,
  directeur: 5,
  ministre: 6,
  ministere: 6,
  super_admin: 7,
}

const BACKEND_ROLE_TO_FRONTEND: Readonly<Record<string, FrontendRole>> = {
  CITOYEN: 'citizen',
  MAIRIE: 'mairie',
  AGENCE: 'agence',
  AGENT: 'agent',
  ADMIN: 'admin_general',
  CHEF_SERVICE: 'chef_service',
  DIRECTEUR: 'directeur',
  MINISTRE: 'ministre',
  SUPER_ADMIN: 'super_admin',
}

export function getFrontendRoleLevel(role: FrontendRole): number {
  return FRONTEND_ROLE_LEVELS[role]
}

/** Fail closed for an unknown backend role instead of guessing a privileged role. */
export function mapBackendRoleToFrontend(role: string): FrontendRole | null {
  return BACKEND_ROLE_TO_FRONTEND[role.trim().toUpperCase()] ?? null
}

export function isInstitutionScopedFrontendRole(role: FrontendRole): boolean {
  const level = getFrontendRoleLevel(role)
  return level >= 2 && level <= 5
}

export function isTenantWideFrontendRole(role: FrontendRole): boolean {
  return role === 'ministre' || role === 'ministere'
}

export function isGlobalFrontendRole(role: FrontendRole): boolean {
  return role === 'super_admin'
}
