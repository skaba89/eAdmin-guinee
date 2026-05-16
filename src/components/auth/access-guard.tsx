'use client'

import { useAppStore, type AppPage } from '@/store/app-store'
import { canAccessPage, getDefaultPage, getRLSScopeDescription } from '@/lib/rbac'
import { useSessionStore } from '@/store/session-store'
import { useAuditLogsStore } from '@/store/audit-logs-store'
import { useMemo, useRef, useCallback, useEffect } from 'react'
import { Shield, Lock, ArrowLeft, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import * as rbacModule from '@/lib/rbac'

// Roles that require MFA verification
const MFA_REQUIRED_ROLES = ['admin', 'ministere', 'superadmin']

// Session timeout: 8 hours in milliseconds
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000

/**
 * AccessGuard - Wraps page content and enforces RBAC page-level access,
 * MFA verification for admin+ roles, and session timeout.
 * Uses proper Zustand selectors to avoid infinite re-render loops.
 */
export function AccessGuard({ page, children }: { page: AppPage; children: React.ReactNode }) {
  const { user, navigate } = useAppStore()
  // Use selectors to subscribe only to what we need, avoiding full-store re-renders
  const currentSessionId = useSessionStore(state => state.currentSessionId)
  const sessions = useSessionStore(state => state.sessions)
  const updateActivity = useSessionStore(state => state.updateActivity)
  const loggedRef = useRef(false)

  // Derive currentSession from selector values (not from getCurrentSession() method)
  const currentSession = useMemo(() => {
    if (!currentSessionId) return null
    return sessions.find(s => s.id === currentSessionId && s.isActive) || null
  }, [currentSessionId, sessions])

  const guardState = useMemo(() => {
    if (!user) return 'ok'

    // 1. Check RBAC page access
    if (!canAccessPage(user, page)) {
      return 'denied'
    }

    // 2. Check MFA verification for admin+ roles
    if (MFA_REQUIRED_ROLES.includes(user.role)) {
      if (currentSession && !currentSession.mfaVerified) {
        return 'mfa'
      }
    }

    // 3. Check session timeout (8 hours)
    if (currentSession) {
      const loginTime = new Date(currentSession.loginAt).getTime()
      const now = Date.now()
      if (now - loginTime > SESSION_TIMEOUT_MS) {
        return 'expired'
      }
    }

    return 'ok'
  }, [user, page, currentSession])

  // Handle side effects (navigation + audit logging) via callbacks
  const handleDeniedLog = useCallback(() => {
    if (user && !loggedRef.current) {
      loggedRef.current = true
      useAuditLogsStore.getState().addActionLog(
        { email: user.email, name: user.name, role: user.role },
        'modification',
        'session',
        `Tentative d'accès non autorisé à la page « ${page} » — rôle: ${user.role}`
      )
    }
  }, [user, page])

  const handleExpiredLog = useCallback(() => {
    if (user && !loggedRef.current) {
      loggedRef.current = true
      useAuditLogsStore.getState().addActionLog(
        { email: user.email, name: user.name, role: user.role },
        'déconnexion',
        'session',
        `Session expirée après 8h — déconnexion automatique`
      )
    }
  }, [user])

  // Reset loggedRef when page changes
  if (loggedRef.current && guardState === 'ok') {
    loggedRef.current = false
  }

  // Side effects must run in useEffect to avoid setState-during-render errors
  useEffect(() => {
    if (guardState === 'ok') {
      updateActivity()
    }
  }, [guardState, updateActivity])

  useEffect(() => {
    if (guardState === 'denied') {
      handleDeniedLog()
    }
  }, [guardState, handleDeniedLog])

  useEffect(() => {
    if (guardState === 'mfa') {
      navigate('mfa')
    }
  }, [guardState, navigate])

  useEffect(() => {
    if (guardState === 'expired') {
      handleExpiredLog()
    }
  }, [guardState, handleExpiredLog])

  if (guardState === 'denied') {
    return <AccessDeniedPage page={page} />
  }

  if (guardState === 'mfa') {
    return null
  }

  if (guardState === 'expired') {
    return <SessionExpiredPage />
  }

  return <>{children}</>
}

/**
 * Session Expired Page — shown when the session is older than 8 hours
 */
function SessionExpiredPage() {
  const { logout } = useAppStore()

  const handleReLogin = () => {
    logout()
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
          <Clock className="h-10 w-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Session expirée</h2>
        <p className="text-muted-foreground mb-2">
          Votre session a dépassé la durée maximale de 8 heures.
        </p>
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Pour des raisons de sécurité, vous devez vous reconnecter après 8 heures d&apos;activité continue.
          </p>
        </div>
        <Button
          onClick={handleReLogin}
          className="bg-[#CE1126] hover:bg-[#CE1126]/90 text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Se reconnecter
        </Button>
      </motion.div>
    </div>
  )
}

/**
 * Access Denied Page — shown when a user tries to access an unauthorized page
 */
function AccessDeniedPage({ page }: { page: AppPage }) {
  const { user, navigate } = useAppStore()
  const defaultPage = getDefaultPage(user)

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <Lock className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Accès refusé</h2>
        <p className="text-muted-foreground mb-2">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        <div className="bg-muted/50 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2 justify-center text-sm">
            <Shield className="h-4 w-4 text-[#CE1126]" />
            <span className="text-muted-foreground">
              Rôle : <span className="font-medium text-foreground">{user?.role || 'Inconnu'}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              Portée : <span className="font-medium text-foreground">{getRLSScopeDescription(user)}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            La politique de sécurité RBAC/RLS interdit l&apos;accès à la page « {page} » pour votre rôle.
            Contactez votre administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
          </p>
        </div>
        <Button
          onClick={() => navigate(defaultPage)}
          className="bg-[#CE1126] hover:bg-[#CE1126]/90 text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à mon espace
        </Button>
      </motion.div>
    </div>
  )
}

/**
 * PermissionGate - Conditionally renders children based on a permission check.
 * Used for button-level and component-level access control.
 */
export function PermissionGate({
  permission,
  requireAny,
  fallback,
  children,
}: {
  permission: string | string[]
  requireAny?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const { user } = useAppStore()

  if (!user) return fallback || null

  const perms = Array.isArray(permission) ? permission : [permission]

  const allowed = requireAny
    ? rbacModule.hasAnyPermission(user, perms as rbacModule.Permission[])
    : perms.every(p => rbacModule.hasPermission(user, p as rbacModule.Permission))

  if (!allowed) return fallback || null
  return <>{children}</>
}

/**
 * HabilitationGate - Conditionally renders children based on service habilitation.
 * Checks if the user's institution has access to a specific service.
 */
export function HabilitationGate({
  serviceId,
  fallback,
  children,
}: {
  serviceId: string
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const { user } = useAppStore()

  if (!user) return fallback || null

  // Import dynamically to avoid circular deps — use the function inline
  const { canAccessService } = require('@/lib/rbac')
  if (!canAccessService(user, serviceId)) return fallback || null

  return <>{children}</>
}

/**
 * Hook to get RBAC functions for use in components
 */
export function useRBAC() {
  const { user } = useAppStore()

  return {
    user,
    hasPermission: (perm: string) => {
      if (!user) return false
      return rbacModule.hasPermission(user, perm as rbacModule.Permission)
    },
    canAccessPage: (page: AppPage) => canAccessPage(user, page),
    canViewRequest: (request: any) => {
      if (!user) return false
      return rbacModule.canViewRequest(user, request)
    },
    canProcessRequest: (request: any) => {
      if (!user) return false
      return rbacModule.canProcessRequest(user, request)
    },
    canDeleteRequest: (request: any) => {
      if (!user) return false
      return rbacModule.canDeleteRequest(user, request)
    },
    filterRequests: (requests: any[]) => {
      if (!user) return []
      return rbacModule.filterRequestsByRLS(requests, user)
    },
    filterOwnRequests: (requests: any[]) => {
      if (!user) return []
      return rbacModule.filterOwnRequests(requests, user)
    },
    scopeDescription: getRLSScopeDescription(user),
  }
}
