import type { AppPage, UserRole } from '@/store/app-store'

const SPECIALIZED_PAGE_ROLES: Partial<Record<AppPage, readonly UserRole[]>> = {
  'mairie-dashboard': ['mairie', 'super_admin'],
  'agence-dashboard': ['agence', 'super_admin'],
  'agent-dashboard': ['agent', 'super_admin'],
  'chef-service-dashboard': ['chef_service', 'super_admin'],
  'ministre-dashboard': ['ministre', 'super_admin'],
}

/**
 * Specialized dashboards are role identities, not generic permission bundles.
 * A generic permission such as dashboard:view must never expose another role's
 * dedicated workspace. SUPER_ADMIN retains the explicit global override.
 */
export function canRoleSeeSpecializedPage(page: AppPage, role: UserRole | undefined): boolean {
  const allowedRoles = SPECIALIZED_PAGE_ROLES[page]
  if (!allowedRoles) return true
  if (!role) return false
  return allowedRoles.includes(role)
}

export function getSpecializedPageRoles(page: AppPage): readonly UserRole[] | undefined {
  return SPECIALIZED_PAGE_ROLES[page]
}
