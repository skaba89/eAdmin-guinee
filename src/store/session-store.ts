import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/data/demo-accounts'

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
}

interface SessionState {
  sessions: SessionInfo[]
  currentSessionId: string | null
  mfaEnabledForUser: Record<string, boolean> // userId → mfaEnabled
  createSession: (user: { email: string; name: string; role: UserRole }) => SessionInfo
  updateActivity: () => void
  terminateSession: (id: string) => void
  terminateAllOtherSessions: () => void
  getCurrentSession: () => SessionInfo | null
  getActiveSessions: () => SessionInfo[]
  verifyMFA: (code: string) => boolean
  setMfaEnabled: (userId: string, enabled: boolean) => void
  isMfaRequired: (role: UserRole) => boolean
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

function generateSessionId(): string {
  return `sess-${Date.now()}-${++sessionCounter}`
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

      createSession: (user) => {
        const now = new Date().toISOString()
        const newSession: SessionInfo = {
          id: generateSessionId(),
          userId: user.email,
          userEmail: user.email,
          userName: user.name,
          userRole: user.role,
          loginAt: now,
          lastActivityAt: now,
          ipAddress: getSimulatedIP(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : getSimulatedUserAgent(),
          isActive: true,
          mfaVerified: false,
        }

        set((state) => ({
          sessions: [...state.sessions, newSession],
          currentSessionId: newSession.id,
        }))

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
          if (now - lastActivity < 30000) return // Skip if updated less than 30s ago
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
        const { currentSessionId } = get()
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === id ? { ...s, isActive: false } : s
          ),
          // If terminating current session, clear currentSessionId
          currentSessionId: id === currentSessionId ? null : state.currentSessionId,
        }))
      },

      terminateAllOtherSessions: () => {
        const { currentSessionId } = get()
        if (!currentSessionId) return

        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id !== currentSessionId ? { ...s, isActive: false } : s
          ),
        }))
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
        // Any 6-digit code works for demo, but '000000' is rejected as invalid
        if (code === '000000') return false
        if (!/^\d{6}$/.test(code)) return false

        const { currentSessionId } = get()
        if (!currentSessionId) return false

        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === currentSessionId ? { ...s, mfaVerified: true } : s
          ),
        }))

        return true
      },

      setMfaEnabled: (userId: string, enabled: boolean) => {
        set((state) => ({
          mfaEnabledForUser: { ...state.mfaEnabledForUser, [userId]: enabled },
        }))
      },

      isMfaRequired: (role: UserRole) => {
        // MFA required for admin, ministere, superadmin roles
        return role === 'admin' || role === 'ministere' || role === 'superadmin'
      },
    }),
    {
      name: 'eadmin-session-store',
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        mfaEnabledForUser: state.mfaEnabledForUser,
      }),
    }
  )
)
