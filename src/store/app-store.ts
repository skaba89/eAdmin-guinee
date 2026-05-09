import { create } from 'zustand'

export type AppPage = 
  | 'landing'
  | 'about'
  | 'services'
  | 'solutions'
  | 'pricing'
  | 'contact'
  | 'blog'
  | 'faq'
  | 'demo'
  | 'login'
  | 'register'
  | 'mfa'
  | 'forgot-password'
  | 'dashboard'
  | 'ged'
  | 'courriers'
  | 'workflow'
  | 'signatures'
  | 'analytics'
  | 'admin'
  | 'users'
  | 'settings'
  | 'notifications'
  | 'audit-logs'
  | 'citizen-portal'

interface AppState {
  currentPage: AppPage
  isAuth: boolean
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  user: {
    name: string
    email: string
    role: string
    institution: string
    avatar?: string
  } | null
  navigate: (page: AppPage) => void
  setAuth: (auth: boolean) => void
  toggleTheme: () => void
  toggleSidebar: () => void
  toggleSidebarCollapse: () => void
  login: (email: string, password: string) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'landing',
  isAuth: false,
  theme: 'light',
  sidebarOpen: true,
  sidebarCollapsed: false,
  user: null,
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
  login: (email: string, _password: string) => {
    set({
      isAuth: true,
      currentPage: 'dashboard',
      user: {
        name: 'Amadou Diallo',
        email: email,
        role: 'Directeur Général',
        institution: "Ministère de l'Administration Territoriale",
      }
    })
  },
  logout: () => set({
    isAuth: false,
    currentPage: 'landing',
    user: null,
  }),
}))
