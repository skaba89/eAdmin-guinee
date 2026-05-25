import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/data/demo-accounts'
import {
  createInitialJWTRotationState,
  shouldRotateToken,
  type JWTRotationState,
} from '@/lib/security'

export interface SessionInfo {
  id: string
  userId: string
  userEmail: string
  userName: string
  userRole: string
  loginAt: string
  lastActivityAt: string
  ipAddress: string
  userAgent: string
  isActive: boolean
  mfaVerified: boolean
  jwtRotation: JWTRotationState
}

// --- Security Configuration ---
const MAX_CONCURRENT_SESSIONS = 3
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000      // 8 hours
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000        // 30 minutes
const ACTIVITY_UPDATE_INTERVAL_MS = 30 * 1000       // 30 seconds

interface SessionState {
  sessions: SessionInfo[]
  currentSessionId: string | null
  mfaEnabledForUser: Record<string, boolean>
  mfaSecrets: Record<string, string>
  backupCodes: Record<string, string[]>
  tokenBlacklist: string[]           // Blacklisted JWT IDs
  securityEvents: SecurityEvent[]

  // Session management
  createSession: (user: { email: string; name: string; role: UserRole }) => SessionInfo
  updateActivity: () => void
  terminateSession: (id: string) => void
  terminateAllOtherSessions: () => void
  getCurrentSession: () => SessionInfo | null
  getActiveSessions: () => SessionInfo[]

  // MFA
  verifyMFA: (code: string) => boolean
  setMfaEnabled: (userId: string, enabled: boolean) => void
  setMfaSecret: (userId: string, secret: string) => void
  setBackupCodes: (userId: string, codes: string[]) => void
  useBackupCode: (userId: string, code: string) => void
  isMfaRequired: (role: UserRole) => boolean

  // JWT rotation
  rotateTokens: (sessionId: string) => JWTRotationState | null
  checkTokenRotation: (sessionId: string) => { access: boolean; refresh: boolean }
  blacklistToken: (jti: string) => void
  isTokenBlacklisted: (jti: string) => boolean

  // Session security
  detectIPChange: (sessionId: string, newIP: string) => { changed: boolean; previousIP: string | null }
  enforceSessionLimit: (userId: string) => SessionInfo[]
  checkSessionTimeout: (sessionId: string) => { expired: boolean; reason: string | null }
  checkInactivityTimeout: (sessionId: string) => boolean
  addSecurityEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => void
  getSecurityEvents: (userId?: string) => SecurityEvent[]
}

export interface SecurityEvent {
  id: string
  timestamp: string
  userId: string
  type: 'login' | 'logout' | 'mfa_enabled' | 'mfa_disabled' | 'mfa_verified' | 'mfa_failed' |
        'session_created' | 'session_terminated' | 'ip_change' | 'token_rotated' |
        'token_blacklisted' | 'session_limit_reached' | 'session_expired' | 'suspicious_activity'
  description: string
  ipAddress: string
  severity: 'info' | 'warning' | 'critical'
}

// Simulated IP addresses
const SIMULATED_IPS = [
  '196.125.43.21',
  '196.125.43.22',
  '196.125.43.25',
  '196.125.43.30',
  '10.0.0.1',
]

let sessionCounter = 0
let eventCounter = 0

function generateSessionId(): string {
  return `sess-${Date.now()}-${++sessionCounter}`
}

function generateEventId(): string {
  return `evt-${Date.now()}-${++eventCounter}`
}

function getSimulatedIP(): string {
  return SIMULATED_IPS[Math.floor(Math.random() * SIMULATED_IPS.length)]
}

function getSimulatedUserAgent(): string {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0',
  ]
  return agents[Math.floor(Math.random() * agents.length)]
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      mfaEnabledForUser: {},
      mfaSecrets: {},
      backupCodes: {},
      tokenBlacklist: [],
      securityEvents: [],

      createSession: (user) => {
        const now = new Date().toISOString()
        const ip = getSimulatedIP()

        // Enforce concurrent session limit
        const state = get()
        const userActiveSessions = state.sessions.filter(
          s => s.userId === user.email && s.isActive
        )

        if (userActiveSessions.length >= MAX_CONCURRENT_SESSIONS) {
          // Terminate the oldest session
          const sorted = [...userActiveSessions].sort(
            (a, b) => new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime()
          )
          const oldestSession = sorted[0]

          set(s => ({
            sessions: s.sessions.map(sess =>
              sess.id === oldestSession.id ? { ...sess, isActive: false } : sess
            ),
          }))

          get().addSecurityEvent({
            userId: user.email,
            type: 'session_limit_reached',
            description: `Limite de ${MAX_CONCURRENT_SESSIONS} sessions atteinte — session ${oldestSession.id.substring(0, 12)}... terminée`,
            ipAddress: ip,
            severity: 'warning',
          })
        }

        const newSession: SessionInfo = {
          id: generateSessionId(),
          userId: user.email,
          userEmail: user.email,
          userName: user.name,
          userRole: user.role,
          loginAt: now,
          lastActivityAt: now,
          ipAddress: ip,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : getSimulatedUserAgent(),
          isActive: true,
          mfaVerified: false,
          jwtRotation: createInitialJWTRotationState(),
        }

        set((state) => ({
          sessions: [...state.sessions, newSession],
          currentSessionId: newSession.id,
        }))

        get().addSecurityEvent({
          userId: user.email,
          type: 'session_created',
          description: `Nouvelle session créée depuis ${ip}`,
          ipAddress: ip,
          severity: 'info',
        })

        return newSession
      },

      updateActivity: () => {
        const { currentSessionId, sessions } = get()
        if (!currentSessionId) return

        // Throttle: only update if last activity was more than 30 seconds ago
        const currentSession = sessions.find(s => s.id === currentSessionId)
        if (currentSession) {
          const lastActivity = new Date(currentSession.lastActivityAt).getTime()
          const now = Date.now()
          if (now - lastActivity < ACTIVITY_UPDATE_INTERVAL_MS) return
        }

        set({
          sessions: sessions.map(s =>
            s.id === currentSessionId
              ? { ...s, lastActivityAt: new Date().toISOString() }
              : s
          ),
        })
      },

      terminateSession: (id) => {
        const { currentSessionId, sessions } = get()
        const session = sessions.find(s => s.id === id)

        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === id ? { ...s, isActive: false } : s
          ),
          currentSessionId: id === currentSessionId ? null : state.currentSessionId,
        }))

        if (session) {
          get().addSecurityEvent({
            userId: session.userId,
            type: 'session_terminated',
            description: `Session ${id.substring(0, 12)}... terminée`,
            ipAddress: session.ipAddress,
            severity: 'info',
          })
        }
      },

      terminateAllOtherSessions: () => {
        const { currentSessionId, sessions } = get()
        if (!currentSessionId) return

        const currentSession = sessions.find(s => s.id === currentSessionId)
        const otherSessions = sessions.filter(
          s => s.id !== currentSessionId && s.isActive
        )

        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id !== currentSessionId ? { ...s, isActive: false } : s
          ),
        }))

        if (currentSession) {
          otherSessions.forEach(s => {
            get().addSecurityEvent({
              userId: s.userId,
              type: 'session_terminated',
              description: `Session ${s.id.substring(0, 12)}... terminée (révocation globale)`,
              ipAddress: s.ipAddress,
              severity: 'warning',
            })
          })
        }
      },

      getCurrentSession: () => {
        const { currentSessionId, sessions } = get()
        if (!currentSessionId) return null
        return sessions.find(s => s.id === currentSessionId && s.isActive) || null
      },

      getActiveSessions: () => {
        const { currentSessionId, sessions } = get()
        return sessions.filter(s => s.isActive && s.userId === (sessions.find(cs => cs.id === currentSessionId)?.userId))
      },

      verifyMFA: (code: string) => {
        // Reject obviously invalid codes
        if (code === '000000') return false
        if (!/^\d{6}$/.test(code)) return false

        const { currentSessionId } = get()
        if (!currentSessionId) return false

        const session = get().sessions.find(s => s.id === currentSessionId)

        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === currentSessionId ? { ...s, mfaVerified: true } : s
          ),
        }))

        if (session) {
          get().addSecurityEvent({
            userId: session.userId,
            type: 'mfa_verified',
            description: 'Vérification MFA réussie',
            ipAddress: session.ipAddress,
            severity: 'info',
          })
        }

        return true
      },

      setMfaEnabled: (userId: string, enabled: boolean) => {
        set((state) => ({
          mfaEnabledForUser: { ...state.mfaEnabledForUser, [userId]: enabled },
        }))

        get().addSecurityEvent({
          userId,
          type: enabled ? 'mfa_enabled' : 'mfa_disabled',
          description: enabled ? 'MFA activé pour l\'utilisateur' : 'MFA désactivé pour l\'utilisateur',
          ipAddress: get().getCurrentSession()?.ipAddress || 'unknown',
          severity: enabled ? 'info' : 'warning',
        })
      },

      setMfaSecret: (userId: string, secret: string) => {
        set((state) => ({
          mfaSecrets: { ...state.mfaSecrets, [userId]: secret },
        }))
      },

      setBackupCodes: (userId: string, codes: string[]) => {
        set((state) => ({
          backupCodes: { ...state.backupCodes, [userId]: codes },
        }))
      },

      useBackupCode: (userId: string, code: string) => {
        set((state) => ({
          backupCodes: {
            ...state.backupCodes,
            [userId]: (state.backupCodes[userId] || []).filter(c => c !== code),
          },
        }))

        get().addSecurityEvent({
          userId,
          type: 'mfa_verified',
          description: 'Code de secours MFA utilisé',
          ipAddress: get().getCurrentSession()?.ipAddress || 'unknown',
          severity: 'warning',
        })
      },

      isMfaRequired: (role: UserRole) => {
        return role === 'directeur' || role === 'ministre' || role === 'admin' || role === 'ministere' || role === 'superadmin'
      },

      // --- JWT Rotation ---
      rotateTokens: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId)
        if (!session) return null

        const newRotation: JWTRotationState = {
          accessTokenGeneratedAt: Date.now(),
          refreshTokenGeneratedAt: Date.now(),
          lastRotationAt: Date.now(),
          rotationCount: session.jwtRotation.rotationCount + 1,
        }

        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, jwtRotation: newRotation } : s
          ),
        }))

        get().addSecurityEvent({
          userId: session.userId,
          type: 'token_rotated',
          description: `Rotation de tokens #${newRotation.rotationCount}`,
          ipAddress: session.ipAddress,
          severity: 'info',
        })

        return newRotation
      },

      checkTokenRotation: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId)
        if (!session) return { access: false, refresh: false }
        return shouldRotateToken(session.jwtRotation)
      },

      blacklistToken: (jti: string) => {
        set((state) => ({
          tokenBlacklist: [...state.tokenBlacklist, jti],
        }))

        get().addSecurityEvent({
          userId: get().getCurrentSession()?.userId || 'unknown',
          type: 'token_blacklisted',
          description: `Token ${jti.substring(0, 8)}... ajouté à la liste noire`,
          ipAddress: get().getCurrentSession()?.ipAddress || 'unknown',
          severity: 'warning',
        })
      },

      isTokenBlacklisted: (jti: string) => {
        return get().tokenBlacklist.includes(jti)
      },

      // --- Session Security ---
      detectIPChange: (sessionId: string, newIP: string) => {
        const session = get().sessions.find(s => s.id === sessionId)
        if (!session) return { changed: false, previousIP: null }

        const previousIP = session.ipAddress
        if (previousIP === newIP) return { changed: false, previousIP: null }

        // Update session IP
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, ipAddress: newIP } : s
          ),
        }))

        get().addSecurityEvent({
          userId: session.userId,
          type: 'ip_change',
          description: `Changement d'IP détecté : ${previousIP} → ${newIP}`,
          ipAddress: newIP,
          severity: 'warning',
        })

        return { changed: true, previousIP }
      },

      enforceSessionLimit: (userId: string) => {
        const userActiveSessions = get().sessions.filter(
          s => s.userId === userId && s.isActive
        )

        if (userActiveSessions.length <= MAX_CONCURRENT_SESSIONS) {
          return []
        }

        // Sort by login time, oldest first
        const sorted = [...userActiveSessions].sort(
          (a, b) => new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime()
        )

        const toTerminate = sorted.slice(0, sorted.length - MAX_CONCURRENT_SESSIONS)

        set((state) => ({
          sessions: state.sessions.map(s => {
            if (toTerminate.some(t => t.id === s.id)) {
              return { ...s, isActive: false }
            }
            return s
          }),
        }))

        toTerminate.forEach(s => {
          get().addSecurityEvent({
            userId: s.userId,
            type: 'session_limit_reached',
            description: `Session ${s.id.substring(0, 12)}... terminée (limite atteinte)`,
            ipAddress: s.ipAddress,
            severity: 'warning',
          })
        })

        return toTerminate
      },

      checkSessionTimeout: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId)
        if (!session) return { expired: false, reason: null }

        const loginTime = new Date(session.loginAt).getTime()
        const now = Date.now()

        // Check absolute session timeout
        if (now - loginTime > SESSION_TIMEOUT_MS) {
          get().addSecurityEvent({
            userId: session.userId,
            type: 'session_expired',
            description: `Session expirée après ${SESSION_TIMEOUT_MS / (60 * 60 * 1000)} heures`,
            ipAddress: session.ipAddress,
            severity: 'info',
          })

          set((state) => ({
            sessions: state.sessions.map(s =>
              s.id === sessionId ? { ...s, isActive: false } : s
            ),
          }))

          return { expired: true, reason: 'Session expirée (durée maximale atteinte)' }
        }

        // Check inactivity timeout
        const lastActivity = new Date(session.lastActivityAt).getTime()
        if (now - lastActivity > INACTIVITY_TIMEOUT_MS) {
          get().addSecurityEvent({
            userId: session.userId,
            type: 'session_expired',
            description: `Session expirée pour inactivité après ${INACTIVITY_TIMEOUT_MS / (60 * 1000)} minutes`,
            ipAddress: session.ipAddress,
            severity: 'info',
          })

          set((state) => ({
            sessions: state.sessions.map(s =>
              s.id === sessionId ? { ...s, isActive: false } : s
            ),
          }))

          return { expired: true, reason: 'Session expirée (inactivité prolongée)' }
        }

        return { expired: false, reason: null }
      },

      checkInactivityTimeout: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId)
        if (!session) return false

        const lastActivity = new Date(session.lastActivityAt).getTime()
        return Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS
      },

      addSecurityEvent: (event) => {
        const newEvent: SecurityEvent = {
          ...event,
          id: generateEventId(),
          timestamp: new Date().toISOString(),
        }

        set((state) => ({
          securityEvents: [newEvent, ...state.securityEvents].slice(0, 500), // Keep last 500 events
        }))
      },

      getSecurityEvents: (userId?: string) => {
        const events = get().securityEvents
        if (!userId) return events
        return events.filter(e => e.userId === userId)
      },
    }),
    {
      name: 'eadmin-session-store',
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        mfaEnabledForUser: state.mfaEnabledForUser,
        mfaSecrets: state.mfaSecrets,
        backupCodes: state.backupCodes,
        tokenBlacklist: state.tokenBlacklist,
        securityEvents: state.securityEvents.slice(0, 100), // Persist last 100 events
      }),
    }
  )
)
