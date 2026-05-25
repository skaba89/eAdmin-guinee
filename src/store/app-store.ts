import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'citizen' | 'mairie' | 'admin_general' | 'agence' | 'agent' | 'chef_service' | 'directeur' | 'ministre' | 'ministere' | 'super_admin'

export type AppPage = 
  | 'landing' | 'about' | 'services' | 'solutions' | 'pricing'
  | 'contact' | 'blog' | 'faq' | 'demo'
  | 'login' | 'register'
  | 'dashboard' | 'ged' | 'courriers' | 'workflow' | 'signatures'
  | 'analytics' | 'admin' | 'users' | 'settings' | 'notifications'
  | 'audit-logs' | 'citizen-portal' | 'service-requests'
  | 'public-citizen-portal' | 'mairie-dashboard' | 'agence-dashboard'
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

// DEMO ACCOUNTS
export const DEMO_ACCOUNTS: Record<string, { password: string; user: UserInfo }> = {
  'citoyen@eadmin.gn': {
    password: 'Eadmin2026!',
    user: {
      id: 'demo-citizen-1',
      name: 'Aminata Diallo',
      email: 'citoyen@eadmin.gn',
      role: 'citizen',
      institution: 'Citoyen',
      fonction: 'Citoyenne guinéenne',
      phone: '+224 622 34 56 78',
      nin: 'NIN-2019-458723',
    }
  },
  'mairie@eadmin.gn': {
    password: 'Eadmin2026!',
    user: {
      id: 'demo-mairie-1',
      name: 'Mme Fatoumata Bah',
      email: 'mairie@eadmin.gn',
      role: 'mairie',
      institution: 'Mairie de Kaloum',
      fonction: 'Secrétaire Générale de la Mairie',
      mairie: 'Mairie de Kaloum',
    }
  },
  'admin@eadmin.gn': {
    password: 'Eadmin2026!',
    user: {
      id: 'demo-admin-1',
      name: 'Sékou Condé',
      email: 'admin@eadmin.gn',
      role: 'admin_general',
      institution: "Ministère de l'Administration Territoriale",
      fonction: 'Directeur de la Modernisation Administrative',
    }
  },
  'agence@eadmin.gn': {
    password: 'Eadmin2026!',
    user: {
      id: 'demo-agence-1',
      name: 'M. Mamadou Soumah',
      email: 'agence@eadmin.gn',
      role: 'agence',
      institution: "Agence Nationale d'Identification (ANIP)",
      fonction: 'Chef de Service Passeports & CNI',
      agence: 'ANIP',
    }
  },
  'ministere@eadmin.gn': {
    password: 'Eadmin2026!',
    user: {
      id: 'demo-ministere-1',
      name: 'Dr. Alpha Diallo',
      email: 'ministere@eadmin.gn',
      role: 'ministere',
      institution: 'Ministère de la Justice',
      fonction: 'Secrétaire Général',
    }
  },
  'superadmin@eadmin.gn': {
    password: 'Eadmin2026!',
    user: {
      id: 'demo-superadmin-1',
      name: 'Amadou Oury Bah',
      email: 'superadmin@eadmin.gn',
      role: 'super_admin',
      institution: 'Primature — Gouvernement de la Guinée',
      fonction: 'Administrateur Système National',
    }
  },
  'agent@eadmin.gn': {
    password: 'demo2026',
    user: {
      id: 'demo-agent-1',
      name: 'Ibrahim Camara',
      email: 'agent@eadmin.gn',
      role: 'agent',
      institution: 'Mairie de Kaloum',
      fonction: 'Agent de Traitement — État Civil',
    }
  },
  'directeur@eadmin.gn': {
    password: 'demo2026',
    user: {
      id: 'demo-directeur-1',
      name: 'Mamadou Sylla',
      email: 'directeur@eadmin.gn',
      role: 'directeur',
      institution: 'Direction Générale de la Modernisation Administrative',
      fonction: "Directeur des Systèmes d'Information",
    }
  },
}

// Role labels for UI
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

// Role colors for badges
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

// Default page per role
export const ROLE_DEFAULT_PAGE: Record<UserRole, AppPage> = {
  citizen: 'citizen-portal',
  mairie: 'mairie-dashboard',
  admin_general: 'dashboard',
  agence: 'agence-dashboard',
  agent: 'service-requests',
  chef_service: 'service-requests',
  directeur: 'dashboard',
  ministre: 'dashboard',
  ministere: 'dashboard',
  super_admin: 'dashboard',
}

interface AppState {
  currentPage: AppPage
  isAuth: boolean
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
  login: (email: string, password: string) => boolean
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage: 'landing' as AppPage,
      isAuth: false,
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

      login: (email: string, password: string) => {
        const account = DEMO_ACCOUNTS[email]
        if (!account) {
          set({ loginError: 'Email non reconnu. Utilisez un des comptes démo ci-dessous.' })
          return false
        }
        if (password !== account.password) {
          set({ loginError: 'Mot de passe incorrect.' })
          return false
        }
        const defaultPage = ROLE_DEFAULT_PAGE[account.user.role]
        set({
          isAuth: true,
          currentPage: defaultPage,
          user: account.user,
          loginError: null,
        })
        return true
      },

      logout: () => set({
        isAuth: false,
        currentPage: 'landing' as AppPage,
        user: null,
        loginError: null,
      }),
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
