import type { UserInfo } from '@/store/app-store'

export type ServiceRequestPermission = 'process' | 'approve' | 'reject'

const SERVICE_REQUEST_PERMISSIONS: Record<UserInfo['role'], ReadonlySet<ServiceRequestPermission>> = {
  citizen: new Set(),
  mairie: new Set(['process']),
  agence: new Set(['process']),
  agent: new Set(['process']),
  admin_general: new Set(['process']),
  chef_service: new Set(['process', 'approve', 'reject']),
  directeur: new Set(['process', 'approve', 'reject']),
  ministre: new Set(['process', 'approve', 'reject']),
  // Legacy frontend role kept for compatibility with older sessions. The
  // backend no longer emits it, but ministerial supervision remains equivalent
  // to MINISTRE for request decisions until those sessions have expired.
  ministere: new Set(['process', 'approve', 'reject']),
  super_admin: new Set(['process', 'approve', 'reject']),
}

/**
 * Frontend affordance only. The FastAPI RBAC/ABAC/RLS checks remain the
 * authoritative security boundary for every mutation.
 */
export function hasServiceRequestPermission(
  user: UserInfo | null,
  permission: ServiceRequestPermission,
): boolean {
  if (!user) return false
  return SERVICE_REQUEST_PERMISSIONS[user.role]?.has(permission) === true
}

export function canProcessServiceRequest(user: UserInfo | null): boolean {
  return hasServiceRequestPermission(user, 'process')
}

export function canApproveServiceRequest(user: UserInfo | null): boolean {
  return hasServiceRequestPermission(user, 'approve')
}

export function canRejectServiceRequest(user: UserInfo | null): boolean {
  return hasServiceRequestPermission(user, 'reject')
}
