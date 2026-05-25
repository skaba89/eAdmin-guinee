'use client'

import { useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { auditLog, type AuditAction, type AuditCategory, type AuditResource } from '@/lib/audit-trail'
import { useAuditLogsStore } from '@/store/audit-logs-store'

/**
 * useAuditTrail — React hook for tracking user actions throughout the application.
 *
 * Usage:
 *   const { track } = useAuditTrail()
 *   track('login', 'auth', 'utilisateur', 'sess-123', 'User logged in')
 *   track('update', 'data_modification', 'demande', 'req-456', 'Updated request', {
 *     severity: 'warning',
 *     previousValue: { status: 'pending' },
 *     newValue: { status: 'approved' },
 *   })
 */
export function useAuditTrail() {
  const user = useAppStore((s) => s.user)

  const track = useCallback(
    (
      action: AuditAction,
      category: AuditCategory,
      resource: AuditResource,
      resourceId: string,
      description: string,
      options?: {
        severity?: 'info' | 'warning' | 'critical'
        previousValue?: Record<string, unknown>
        newValue?: Record<string, unknown>
        metadata?: Record<string, unknown>
        isComplianceRelevant?: boolean
      }
    ) => {
      if (!user) return

      const entry = auditLog({
        action,
        category,
        resource,
        resourceId,
        description,
        severity: options?.severity || 'info',
        previousValue: options?.previousValue,
        newValue: options?.newValue,
        metadata: options?.metadata,
        isComplianceRelevant: options?.isComplianceRelevant,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
      })

      // Add to the Zustand store
      useAuditLogsStore.getState().addLogFromEntry(entry)
    },
    [user]
  )

  return { track }
}
