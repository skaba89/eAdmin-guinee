import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type UserAccountStatus = 'actif' | 'inactif' | 'suspendu' | 'en_attente'

export interface UserAccount {
  id: string
  email: string
  name: string
  firstName?: string
  role: 'citizen' | 'mairie' | 'admin_general' | 'agence' | 'ministere' | 'super_admin'
  status: UserAccountStatus
  phone?: string
  nin?: string
  institution?: string
  mairie?: string
  agence?: string
  avatar?: string
  createdAt: string
  lastLogin?: string
  password: string // En production ce serait haché — ici c'est pour la démo
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const dateAt = (year: number, month: number, day: number, hour = 9, min = 0) =>
  new Date(year, month - 1, day, hour, min).toISOString()

// ─── DEMO SEED DATA — 12 utilisateurs réalistes ─────────────────────────────

const DEMO_USERS: UserAccount[] = [
  // ── 6 comptes de démo standards ──────────────────────────────────────────
  {
    id: 'user-demo-001',
    email: 'citoyen@eadmin.gn',
    name: 'Diallo',
    firstName: 'Amara',
    role: 'citizen',
    status: 'actif',
    phone: '+224 622 10 20 30',
    nin: 'NIN-2010-78432',
    createdAt: dateAt(2025, 11, 15, 10, 0),
    lastLogin: dateAt(2026, 3, 10, 8, 30),
    password: 'demo123',
  },
  {
    id: 'user-demo-002',
    email: 'mairie@eadmin.gn',
    name: 'Condé',
    firstName: 'Marie',
    role: 'mairie',
    status: 'actif',
    phone: '+224 621 55 44 33',
    nin: 'NIN-2008-12345',
    mairie: 'Mairie de Conakry',
    createdAt: dateAt(2025, 10, 1, 9, 0),
    lastLogin: dateAt(2026, 3, 10, 9, 15),
    password: 'demo123',
  },
  {
    id: 'user-demo-003',
    email: 'admin@eadmin.gn',
    name: 'Touré',
    firstName: 'Ibrahim',
    role: 'admin_general',
    status: 'actif',
    phone: '+224 620 11 22 33',
    nin: 'NIN-2006-56789',
    institution: 'Direction Générale de la Modernisation Administrative',
    createdAt: dateAt(2025, 9, 1, 8, 0),
    lastLogin: dateAt(2026, 3, 10, 7, 45),
    password: 'demo123',
  },
  {
    id: 'user-demo-004',
    email: 'agence@eadmin.gn',
    name: 'Camara',
    firstName: 'Fatoumata',
    role: 'agence',
    status: 'actif',
    phone: '+224 623 99 88 77',
    nin: 'NIN-2007-43210',
    agence: 'ANIP',
    createdAt: dateAt(2025, 10, 15, 10, 30),
    lastLogin: dateAt(2026, 3, 9, 16, 0),
    password: 'demo123',
  },
  {
    id: 'user-demo-005',
    email: 'ministere@eadmin.gn',
    name: 'Sow',
    firstName: 'Abdoulaye',
    role: 'ministere',
    status: 'actif',
    phone: '+224 625 33 22 11',
    nin: 'NIN-2005-98765',
    institution: 'MEF',
    createdAt: dateAt(2025, 8, 20, 11, 0),
    lastLogin: dateAt(2026, 3, 10, 10, 0),
    password: 'demo123',
  },
  {
    id: 'user-demo-006',
    email: 'superadmin@eadmin.gn',
    name: 'Diallo',
    firstName: 'Mamadou Bailo',
    role: 'super_admin',
    status: 'actif',
    phone: '+224 600 00 00 01',
    nin: 'NIN-2004-00001',
    institution: 'Présidence de la République',
    createdAt: dateAt(2025, 7, 1, 8, 0),
    lastLogin: dateAt(2026, 3, 10, 6, 30),
    password: 'admin2026',
  },

  // ── 6 utilisateurs supplémentaires — statuts variés ─────────────────────
  {
    id: 'user-demo-007',
    email: 'kadiatou.bah@eadmin.gn',
    name: 'Bah',
    firstName: 'Kadiatou',
    role: 'citizen',
    status: 'actif',
    phone: '+224 628 12 34 56',
    nin: 'NIN-2012-54321',
    createdAt: dateAt(2026, 1, 10, 14, 0),
    lastLogin: dateAt(2026, 3, 8, 11, 20),
    password: 'demo123',
  },
  {
    id: 'user-demo-008',
    email: 'ousmane.sylla@eadmin.gn',
    name: 'Sylla',
    firstName: 'Ousmane',
    role: 'mairie',
    status: 'inactif',
    phone: '+224 627 44 55 66',
    nin: 'NIN-2009-67890',
    mairie: 'Mairie de Kindia',
    createdAt: dateAt(2025, 12, 5, 9, 30),
    password: 'demo123',
  },
  {
    id: 'user-demo-009',
    email: 'aissatou.doumbouya@eadmin.gn',
    name: 'Doumbouya',
    firstName: 'Aïssatou',
    role: 'agence',
    status: 'suspendu',
    phone: '+224 626 77 88 99',
    nin: 'NIN-2011-13579',
    agence: 'DNE',
    createdAt: dateAt(2025, 11, 20, 15, 0),
    lastLogin: dateAt(2026, 1, 15, 10, 45),
    password: 'demo123',
  },
  {
    id: 'user-demo-010',
    email: 'mohamed.keita@eadmin.gn',
    name: 'Keita',
    firstName: 'Mohamed',
    role: 'citizen',
    status: 'en_attente',
    phone: '+224 624 55 66 77',
    nin: 'NIN-2015-24680',
    createdAt: dateAt(2026, 3, 1, 16, 30),
    password: 'demo123',
  },
  {
    id: 'user-demo-011',
    email: 'hawa.bangoura@eadmin.gn',
    name: 'Bangoura',
    firstName: 'Hawa',
    role: 'ministere',
    status: 'actif',
    phone: '+224 629 22 33 44',
    nin: 'NIN-2003-11223',
    institution: 'MESRS',
    createdAt: dateAt(2025, 9, 15, 10, 0),
    lastLogin: dateAt(2026, 3, 7, 14, 0),
    password: 'demo123',
  },
  {
    id: 'user-demo-012',
    email: 'ibrahima.soumah@eadmin.gn',
    name: 'Soumah',
    firstName: 'Ibrahima',
    role: 'admin_general',
    status: 'actif',
    phone: '+224 621 88 99 00',
    nin: 'NIN-2006-33445',
    institution: 'Direction Générale de la Modernisation Administrative',
    createdAt: dateAt(2025, 10, 20, 11, 30),
    lastLogin: dateAt(2026, 3, 9, 8, 0),
    password: 'demo123',
  },
]

// ─── STORE INTERFACE ─────────────────────────────────────────────────────────

interface UsersStoreState {
  users: UserAccount[]

  addUser: (user: Omit<UserAccount, 'id' | 'createdAt'>) => UserAccount
  updateUser: (id: string, updates: Partial<UserAccount>) => void
  deleteUser: (id: string) => void
  deleteMultiple: (ids: string[]) => void
  suspendUser: (id: string) => void
  activateUser: (id: string) => void
  changeRole: (id: string, role: UserAccount['role']) => void
  changeMultipleRoles: (ids: string[], role: UserAccount['role']) => void
  suspendMultiple: (ids: string[]) => void
  recordLogin: (id: string) => void

  getUserById: (id: string) => UserAccount | undefined
  getUserByEmail: (email: string) => UserAccount | undefined
  getFilteredUsers: (
    search?: string,
    role?: UserAccount['role'] | 'all',
    status?: UserAccountStatus | 'all'
  ) => UserAccount[]
  getStats: () => {
    total: number
    active: number
    byRole: Record<string, number>
    recentLogins: number
  }

  resetToDemoData: () => void
}

// ─── STORE ───────────────────────────────────────────────────────────────────

export const useUsersStore = create<UsersStoreState>()(
  persist(
    (set, get) => ({
      users: DEMO_USERS,

      // ── Ajouter un utilisateur ───────────────────────────────────────────

      addUser: (userData) => {
        const newUser: UserAccount = {
          ...userData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          users: [...state.users, newUser],
        }))
        return newUser
      },

      // ── Mettre à jour un utilisateur ─────────────────────────────────────

      updateUser: (id, updates) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
        }))
      },

      // ── Supprimer un utilisateur ─────────────────────────────────────────

      deleteUser: (id) => {
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
        }))
      },

      // ── Suppression multiple ─────────────────────────────────────────────

      deleteMultiple: (ids) => {
        const idSet = new Set(ids)
        set((state) => ({
          users: state.users.filter((u) => !idSet.has(u.id)),
        }))
      },

      // ── Suspendre un utilisateur ─────────────────────────────────────────

      suspendUser: (id) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id ? { ...u, status: 'suspendu' as UserAccountStatus } : u
          ),
        }))
      },

      // ── Activer un utilisateur ───────────────────────────────────────────

      activateUser: (id) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id ? { ...u, status: 'actif' as UserAccountStatus } : u
          ),
        }))
      },

      // ── Changer le rôle ──────────────────────────────────────────────────

      changeRole: (id, role) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, role } : u)),
        }))
      },

      // ── Changement de rôle multiple ──────────────────────────────────────

      changeMultipleRoles: (ids, role) => {
        const idSet = new Set(ids)
        set((state) => ({
          users: state.users.map((u) => (idSet.has(u.id) ? { ...u, role } : u)),
        }))
      },

      // ── Suspension multiple ──────────────────────────────────────────────

      suspendMultiple: (ids) => {
        const idSet = new Set(ids)
        set((state) => ({
          users: state.users.map((u) =>
            idSet.has(u.id) ? { ...u, status: 'suspendu' as UserAccountStatus } : u
          ),
        }))
      },

      // ── Enregistrer une connexion ────────────────────────────────────────

      recordLogin: (id) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id ? { ...u, lastLogin: new Date().toISOString() } : u
          ),
        }))
      },

      // ── Recherche par identifiant ────────────────────────────────────────

      getUserById: (id) => {
        return get().users.find((u) => u.id === id)
      },

      // ── Recherche par email ──────────────────────────────────────────────

      getUserByEmail: (email) => {
        return get().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      },

      // ── Filtrage avancé ──────────────────────────────────────────────────

      getFilteredUsers: (search = '', role = 'all', status = 'all') => {
        return get().users.filter((u) => {
          if (role !== 'all' && u.role !== role) return false
          if (status !== 'all' && u.status !== status) return false
          if (search.trim()) {
            const q = search.toLowerCase().trim()
            const matchesSearch =
              u.email.toLowerCase().includes(q) ||
              u.name.toLowerCase().includes(q) ||
              (u.firstName && u.firstName.toLowerCase().includes(q)) ||
              (u.phone && u.phone.includes(q)) ||
              (u.nin && u.nin.toLowerCase().includes(q)) ||
              (u.institution && u.institution.toLowerCase().includes(q)) ||
              (u.mairie && u.mairie.toLowerCase().includes(q)) ||
              (u.agence && u.agence.toLowerCase().includes(q))
            if (!matchesSearch) return false
          }
          return true
        })
      },

      // ── Statistiques ─────────────────────────────────────────────────────

      getStats: () => {
        const { users } = get()
        const byRole: Record<string, number> = {}
        let active = 0
        let recentLogins = 0

        // Connexions dans les 7 derniers jours
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        users.forEach((u) => {
          byRole[u.role] = (byRole[u.role] || 0) + 1
          if (u.status === 'actif') active++
          if (u.lastLogin && new Date(u.lastLogin) >= sevenDaysAgo) recentLogins++
        })

        return { total: users.length, active, byRole, recentLogins }
      },

      // ── Réinitialiser les données de démo ────────────────────────────────

      resetToDemoData: () => {
        set({ users: DEMO_USERS })
      },
    }),
    {
      name: 'eadmin-users-store',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version < 1) {
          return { users: DEMO_USERS }
        }
        return persistedState
      },
    }
  )
)
