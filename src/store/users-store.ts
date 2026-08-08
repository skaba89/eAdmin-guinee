import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  /**
   * Transitional form compatibility only. Passwords are never persisted in this
   * store; account creation must be sent to the backend administration API.
   */
  password?: string
}

function generateId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const dateAt = (year: number, month: number, day: number, hour = 9, min = 0) =>
  new Date(year, month - 1, day, hour, min).toISOString()

const DEMO_USERS: UserAccount[] = [
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
  },
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
  },
]

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

function stripPassword<T extends { password?: string }>(value: T): Omit<T, 'password'> {
  const { password: _password, ...safeValue } = value
  return safeValue
}

export const useUsersStore = create<UsersStoreState>()(
  persist(
    (set, get) => ({
      users: DEMO_USERS,

      addUser: (userData) => {
        const safeUserData = stripPassword(userData)
        const newUser: UserAccount = {
          ...safeUserData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ users: [...state.users, newUser] }))
        return newUser
      },

      updateUser: (id, updates) => {
        const safeUpdates = stripPassword(updates)
        set((state) => ({
          users: state.users.map((user) => user.id === id ? { ...user, ...safeUpdates } : user),
        }))
      },

      deleteUser: (id) => set((state) => ({ users: state.users.filter((user) => user.id !== id) })),
      deleteMultiple: (ids) => {
        const idSet = new Set(ids)
        set((state) => ({ users: state.users.filter((user) => !idSet.has(user.id)) }))
      },
      suspendUser: (id) => set((state) => ({
        users: state.users.map((user) => user.id === id ? { ...user, status: 'suspendu' as const } : user),
      })),
      activateUser: (id) => set((state) => ({
        users: state.users.map((user) => user.id === id ? { ...user, status: 'actif' as const } : user),
      })),
      changeRole: (id, role) => set((state) => ({
        users: state.users.map((user) => user.id === id ? { ...user, role } : user),
      })),
      changeMultipleRoles: (ids, role) => {
        const idSet = new Set(ids)
        set((state) => ({
          users: state.users.map((user) => idSet.has(user.id) ? { ...user, role } : user),
        }))
      },
      suspendMultiple: (ids) => {
        const idSet = new Set(ids)
        set((state) => ({
          users: state.users.map((user) => idSet.has(user.id) ? { ...user, status: 'suspendu' as const } : user),
        }))
      },
      recordLogin: (id) => set((state) => ({
        users: state.users.map((user) => user.id === id ? { ...user, lastLogin: new Date().toISOString() } : user),
      })),
      getUserById: (id) => get().users.find((user) => user.id === id),
      getUserByEmail: (email) => get().users.find((user) => user.email.toLowerCase() === email.toLowerCase()),
      getFilteredUsers: (search = '', role = 'all', status = 'all') => get().users.filter((user) => {
        if (role !== 'all' && user.role !== role) return false
        if (status !== 'all' && user.status !== status) return false
        if (!search.trim()) return true
        const query = search.toLowerCase().trim()
        return Boolean(
          user.email.toLowerCase().includes(query) ||
          user.name.toLowerCase().includes(query) ||
          user.firstName?.toLowerCase().includes(query) ||
          user.phone?.includes(query) ||
          user.nin?.toLowerCase().includes(query) ||
          user.institution?.toLowerCase().includes(query) ||
          user.mairie?.toLowerCase().includes(query) ||
          user.agence?.toLowerCase().includes(query)
        )
      }),
      getStats: () => {
        const users = get().users
        const byRole: Record<string, number> = {}
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        let active = 0
        let recentLogins = 0

        users.forEach((user) => {
          byRole[user.role] = (byRole[user.role] || 0) + 1
          if (user.status === 'actif') active += 1
          if (user.lastLogin && new Date(user.lastLogin) >= sevenDaysAgo) recentLogins += 1
        })

        return { total: users.length, active, byRole, recentLogins }
      },
      resetToDemoData: () => set({ users: DEMO_USERS }),
    }),
    {
      name: 'eadmin-users-store',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return { users: DEMO_USERS }
        }
        const state = persistedState as { users?: UserAccount[] }
        const users = Array.isArray(state.users)
          ? state.users.map((user) => stripPassword(user))
          : DEMO_USERS
        return { ...state, users }
      },
    }
  )
)
