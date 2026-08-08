import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as authClient from '@/lib/auth-client'

export type UserRole = 'citizen' | 'mairie' | 'admin_general' | 'agence' | 'agent' | 'chef_service' | 'directeur' | 'ministre' | 'ministere' | 'super_admin'

export type AppPage =
  | 'landing' | 'about' | 'services' | 'solutions' | 'pricing'
  | 'contact' | 'blog' | 'faq' | 'demo'
  | 'login' | 'register'
  | 'dashboard' | 'ged' | 'courriers' | 'workflow' | 'signatures'
  | 'analytics' | 'admin' | 'users' | 'settings' | 'notifications'
  | 'audit-logs' | 'citizen-portal' | 'service-requests'
  | 'public-citizen-portal' | 'mairie-dashboard' | 'agence-dashboard'
  | 'agent-dashboard' | 'chef-service-dashboard' | 'ministre-dashboard'
  | 'birth-certificate-db'
  | 'ai-assistant'
  | 'mfa'

export interface UserInfo {
  id: string
  name: string
  email: string
  role: UserRole
  institution: string
  fonction: string
  avatar?: string
  phone?: string
  nin?: string
  mairie?: string
  agence?: string
}

/**
 * Kept only for backward-compatible rendering in the existing login page.
 * Production credentials must never be embedded in the browser bundle.
 * Demo users are provisioned server-side with backend/seed_demo.py.
 */
export const DEMO_ACCOUNTS: Record<string, { password: string; user: UserInfo }> = {}

export const ROLE_LABELS: Record<UserRole, string> = {
  citizen: 'Citoyen',
  mairie: 'Agent de Mairie',
  admin_general: 'Administrateur Général',
  agence: "Agent d'Agence",
  agent: 'Agent de Traitement',
  chef_service: 'Chef de Service',
  directeur: 'Directeur / DSI',
  ministre: 'Ministre',
  ministere: 'Agent Ministériel',
  super_admin: 'Super Administrateur',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  citizen: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  mairie: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  admin_general: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  agence: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  agent: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  chef_service: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  directeur: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  ministre: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  ministere: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  super_admin: 'bg-[#0B2E58] text-white dark:bg-[#3B7DD8] dark:text-white',
}

export const ROLE_DEFAULT_PAGE: Record<UserRole, AppPage> = {
  citizen: 'citizen-portal',
  mairie: 'mairie-dashboard',
  admin_general: 'dashboard',
  agence: 'agence-dashboard',
  agent: 'agent-dashboard',
  chef_service: 'chef-service-dashboard',
  directeur: 'dashboard',
  ministre: 'ministre-dashboard',
  ministere: 'dashboard',
  super_admin: 'dashboard',
}

function normalizeRole(frontendRole?: string, backendRole?: string): UserRole {
  const raw = (frontendRole || backendRole || '').trim().toLowerCase()
  const mapping: Record<string, UserRole> = {
    citoyen: 'citizen',
    citizen: 'citizen',
    agent: 'agent',
    mairie: 'mairie',
    agence: 'agence',
    admin: 'admin_general',
    admin_general: 'admin_general',
    chef_service: 'chef_service',
    directeur: 'directeur',
    ministre: 'ministre',
    ministere: 'ministere',
    superadmin: 'super_admin',
    super_admin: 'super_admin',
  }
  return mapping[raw] || 'citizen'
}

function mapBackendUser(backendUser: authClient.BackendUser): UserInfo {
  const role = normalizeRole(backendUser.frontend_role, backendUser.role)
  return {
    id: backendUser.id,
    name: backendUser.full_name,
    email: backendUser.email,
    role,
    institution: backendUser.institution || 'République de Guinée',
    fonction: ROLE_LABELS[role],
  }
}

interface AppState {
  currentPage: AppPage
  isAuth: boolean
  mfaRequired: boolean
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  user: UserInfo | null
  loginError: string | null
  navigate: (page: AppPage) => void
  setAuth: (auth: boolean) => void
  toggleTheme: () => void
  toggleSidebar: () => void
  toggleSidebarCollapse: () => void
  login: (email: string, password: string) => Promise<boolean>
  verifyMfa: (code: string) => Promise<boolean>
  restoreSession: () => Promise<boolean>
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentPage: 'landing' as AppPage,
      isAuth: false,
      mfaRequired: false,
      theme: 'light' as const,
      sidebarOpen: true,
      sidebarCollapsed: false,
      user: null,
      loginError: null,

      navigate: (page) => set({ currentPage: page }),
      setAuth: (auth) => set({ isAuth: auth }),
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light'
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', newTheme === 'dark')
        }
        return { theme: newTheme }
      }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      login: async (email: string, password: string) => {
        set({ loginError: null, isAuth: false, mfaRequired: false })

        try {
          const tokens = await authClient.login(email, password)
          const claims = authClient.decodeJwtPayload(tokens.access_token)
          const backendUser = await authClient.getCurrentUser(tokens.access_token)
          const user = mapBackendUser(backendUser)

          if (claims.mfa_required === true && claims.mfa_verified !== true) {
            authClient.storePendingTokens(tokens)
            set({
              isAuth: false,
              mfaRequired: true,
              currentPage: 'mfa',
              user,
              loginError: null,
            })
            return true
          }

          authClient.storeActiveTokens(tokens)
          set({
            isAuth: true,
            mfaRequired: false,
            currentPage: ROLE_DEFAULT_PAGE[user.role],
            user,
            loginError: null,
          })
          return true
        } catch (error) {
          authClient.clearAuthTokens()
          set({
            isAuth: false,
            mfaRequired: false,
            user: null,
            loginError: error instanceof Error ? error.message : 'Connexion impossible.',
          })
          return false
        }
      },

      verifyMfa: async (code: string) => {
        const pendingToken = authClient.getPendingAccessToken()
        if (!pendingToken) {
          set({
            loginError: 'Session MFA expirée. Veuillez vous reconnecter.',
            isAuth: false,
            mfaRequired: false,
            currentPage: 'login',
            user: null,
          })
          return false
        }

        try {
          const tokens = await authClient.verifyMfa(pendingToken, code)
          const backendUser = await authClient.getCurrentUser(tokens.access_token)
          const user = mapBackendUser(backendUser)
          authClient.storeActiveTokens(tokens)

          set({
            isAuth: true,
            mfaRequired: false,
            user,
            currentPage: ROLE_DEFAULT_PAGE[user.role],
            loginError: null,
          })
          return true
        } catch (error) {
          set({
            loginError: error instanceof Error ? error.message : 'Code MFA invalide.',
          })
          return false
        }
      },

      restoreSession: async () => {
        const activeToken = authClient.getActiveAccessToken()
        if (activeToken) {
          try {
            const backendUser = await authClient.getCurrentUser(activeToken)
            const user = mapBackendUser(backendUser)
            set({
              isAuth: true,
              mfaRequired: false,
              user,
              currentPage: get().currentPage === 'landing'
                ? ROLE_DEFAULT_PAGE[user.role]
                : get().currentPage,
              loginError: null,
            })
            return true
          } catch {
            authClient.clearAuthTokens()
          }
        }

        const pendingToken = authClient.getPendingAccessToken()
        if (pendingToken) {
          try {
            const backendUser = await authClient.getCurrentUser(pendingToken)
            set({
              isAuth: false,
              mfaRequired: true,
              user: mapBackendUser(backendUser),
              currentPage: 'mfa',
              loginError: null,
            })
            return true
          } catch {
            authClient.clearAuthTokens()
          }
        }

        return false
      },

      logout: () => {
        const accessToken = authClient.getActiveAccessToken() || authClient.getPendingAccessToken()
        void authClient.logout(accessToken)
        authClient.clearAuthTokens()
        set({
          isAuth: false,
          mfaRequired: false,
          currentPage: 'landing' as AppPage,
          user: null,
          loginError: null,
        })
      },
    }),
    {
      name: 'eadmin-app-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
