import type { UserInfo } from '@/store/app-store'
import { getFrontendRoleLevel } from '@/lib/frontend-role-authority'

export type ServiceRequestPermission = 'process' | 'approve' | 'reject'

const REQUEST_PERMISSION_MIN_LEVEL: Readonly<Record<ServiceRequestPermission, number>> = {
  process: 2,
  approve: 4,
  reject: 4,
}

/**
 * Frontend affordance only. Thresholds mirror the backend request permission
 * matrix; FastAPI RBAC/ABAC/RLS remains authoritative for every mutation.
 */
export function hasServiceRequestPermission(
  user: UserInfo | null,
  permission: ServiceRequestPermission,
): boolean {
  if (!user) return false
  return getFrontendRoleLevel(user.role) >= REQUEST_PERMISSION_MIN_LEVEL[permission]
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
