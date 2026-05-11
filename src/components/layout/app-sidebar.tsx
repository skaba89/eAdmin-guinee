'use client'

import { useAppStore, ROLE_LABELS, ROLE_COLORS, type AppPage, type UserRole } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FileText, Mail, GitBranch, PenTool,
  BarChart3, Users, Shield, UserCog, Settings, Bell,
  ScrollText, LogOut, ChevronLeft, ChevronRight, Sparkles,
  ClipboardCheck, Building2, Database, Fingerprint,
  Home, Briefcase, BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── NAV ITEM DEFINITION ─────────────────────────────────────────────────────
interface NavItem {
  page: AppPage
  label: string
  icon: string
}

// ─── ROLE-BASED NAVIGATION ───────────────────────────────────────────────────
const ROLE_NAV: Record<UserRole, { main: NavItem[]; admin?: NavItem[] }> = {
  citizen: {
    main: [
      { page: 'citizen-portal', label: 'Mon Portail', icon: 'Home' },
      { page: 'service-requests', label: 'Mes demandes', icon: 'ClipboardCheck' },
      { page: 'public-citizen-portal', label: 'Services publics', icon: 'Briefcase' },
      { page: 'ai-assistant', label: 'Assistant IA', icon: 'Sparkles' },
      { page: 'settings', label: 'Paramètres', icon: 'Settings' },
    ],
  },
  mairie: {
    main: [
      { page: 'mairie-dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
      { page: 'service-requests', label: 'Demandes citoyennes', icon: 'ClipboardCheck' },
      { page: 'ged', label: 'GED', icon: 'FileText' },
      { page: 'courriers', label: 'Courriers', icon: 'Mail' },
      { page: 'ai-assistant', label: 'Assistant IA', icon: 'Sparkles' },
      { page: 'settings', label: 'Paramètres', icon: 'Settings' },
    ],
  },
  admin_general: {
    main: [
      { page: 'dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
      { page: 'service-requests', label: 'Demandes citoyennes', icon: 'ClipboardCheck' },
      { page: 'ged', label: 'Documents (GED)', icon: 'FileText' },
      { page: 'courriers', label: 'Courriers', icon: 'Mail' },
      { page: 'workflow', label: 'Workflows', icon: 'GitBranch' },
      { page: 'signatures', label: 'Signatures', icon: 'PenTool' },
      { page: 'analytics', label: 'Analytics', icon: 'BarChart3' },
      { page: 'citizen-portal', label: 'Portail Citoyen', icon: 'Users' },
      { page: 'ai-assistant', label: 'Assistant IA', icon: 'Sparkles' },
    ],
    admin: [
      { page: 'admin', label: 'Administration', icon: 'Shield' },
      { page: 'users', label: 'Utilisateurs', icon: 'UserCog' },
      { page: 'notifications', label: 'Notifications', icon: 'Bell' },
      { page: 'audit-logs', label: 'Audit Logs', icon: 'ScrollText' },
      { page: 'settings', label: 'Paramètres', icon: 'Settings' },
    ],
  },
  agence: {
    main: [
      { page: 'agence-dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
      { page: 'service-requests', label: 'Demandes citoyennes', icon: 'ClipboardCheck' },
      { page: 'ged', label: 'GED', icon: 'FileText' },
      { page: 'ai-assistant', label: 'Assistant IA', icon: 'Sparkles' },
      { page: 'settings', label: 'Paramètres', icon: 'Settings' },
    ],
  },
  ministere: {
    main: [
      { page: 'dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
      { page: 'ged', label: 'GED', icon: 'FileText' },
      { page: 'courriers', label: 'Courriers', icon: 'Mail' },
      { page: 'workflow', label: 'Workflows', icon: 'GitBranch' },
      { page: 'signatures', label: 'Signatures', icon: 'PenTool' },
      { page: 'ai-assistant', label: 'Assistant IA', icon: 'Sparkles' },
      { page: 'settings', label: 'Paramètres', icon: 'Settings' },
    ],
  },
  super_admin: {
    main: [
      { page: 'dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
      { page: 'service-requests', label: 'Demandes citoyennes', icon: 'ClipboardCheck' },
      { page: 'ged', label: 'Documents (GED)', icon: 'FileText' },
      { page: 'courriers', label: 'Courriers', icon: 'Mail' },
      { page: 'workflow', label: 'Workflows', icon: 'GitBranch' },
      { page: 'signatures', label: 'Signatures', icon: 'PenTool' },
      { page: 'analytics', label: 'Analytics', icon: 'BarChart3' },
      { page: 'citizen-portal', label: 'Portail Citoyen', icon: 'Users' },
      { page: 'mairie-dashboard', label: 'Espace Mairie', icon: 'Building2' },
      { page: 'agence-dashboard', label: 'Espace Agence', icon: 'Fingerprint' },
      { page: 'ai-assistant', label: 'Assistant IA', icon: 'Sparkles' },
    ],
    admin: [
      { page: 'admin', label: 'Administration', icon: 'Shield' },
      { page: 'users', label: 'Utilisateurs', icon: 'UserCog' },
      { page: 'notifications', label: 'Notifications', icon: 'Bell' },
      { page: 'audit-logs', label: 'Audit Logs', icon: 'ScrollText' },
      { page: 'settings', label: 'Paramètres', icon: 'Settings' },
    ],
  },
}

// Role-specific extra nav items
const ROLE_EXTRA_NAV: Partial<Record<UserRole, NavItem[]>> = {
  mairie: [
    { page: 'birth-certificate-db', label: 'Base État Civil', icon: 'BookOpen' },
  ],
  admin_general: [
    { page: 'birth-certificate-db', label: 'Base État Civil', icon: 'BookOpen' },
  ],
  ministere: [
    { page: 'birth-certificate-db', label: 'Base État Civil', icon: 'BookOpen' },
  ],
  super_admin: [
    { page: 'birth-certificate-db', label: 'Base État Civil', icon: 'BookOpen' },
  ],
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, FileText, Mail, GitBranch, PenTool,
  BarChart3, Users, Shield, UserCog, Settings, Bell,
  ScrollText, Sparkles, ClipboardCheck, Building2, Database,
  Fingerprint, Home, Briefcase, BookOpen,
}

export function AppSidebar() {
  const { currentPage, navigate, sidebarCollapsed, toggleSidebarCollapse, logout, user } = useAppStore()

  const userRole = (user?.role || 'citizen') as UserRole
  const navConfig = ROLE_NAV[userRole] || ROLE_NAV.citizen
  const extraNav = ROLE_EXTRA_NAV[userRole] || []

  const navItem = (page: AppPage, label: string, icon?: string) => {
    const IconComponent = icon ? ICON_MAP[icon] : null
    const isActive = currentPage === page
    return (
      <button
        key={page}
        onClick={() => navigate(page)}
        className={cn(
          'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          'hover:bg-brand/8 dark:hover:bg-white/8',
          isActive
            ? 'bg-brand text-white shadow-md shadow-brand/20 dark:bg-primary dark:text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {IconComponent && (
          <IconComponent className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-white dark:text-primary-foreground')} />
        )}
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="whitespace-nowrap overflow-hidden"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    )
  }

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen sticky top-0 flex flex-col border-r border-border bg-sidebar text-sidebar-foreground z-40"
    >
      {/* Logo — République de Guinée */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-lg shadow-brand/30">
          <img src="/logo.svg" alt="Guinée" className="h-9 w-9" />
        </div>
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <div className="font-bold text-sm leading-tight text-brand dark:text-primary">eAdmin Suite</div>
              <div className="text-[10px] text-muted-foreground">République de Guinée</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Main modules */}
        <div>
          {!sidebarCollapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-2">Modules</p>
          )}
          <div className="space-y-1">
            {navConfig.main.map((item) => navItem(item.page, item.label, item.icon))}
          </div>
        </div>

        {/* Extra nav items (e.g., Birth certificate database for mairie/admin) */}
        {extraNav.length > 0 && (
          <div>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-2">Accès rapide</p>
            )}
            <div className="space-y-1">
              {extraNav.map((item) => navItem(item.page, item.label, item.icon))}
            </div>
          </div>
        )}

        {/* Admin section */}
        {navConfig.admin && navConfig.admin.length > 0 && (
          <div>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-2">Administration</p>
            )}
            <div className="space-y-1">
              {navConfig.admin.map((item) => navItem(item.page, item.label, item.icon))}
            </div>
          </div>
        )}
      </div>

      {/* User */}
      <div className="border-t border-border p-3 shrink-0">
        <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
          <div className="h-8 w-8 rounded-full bg-brand/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-brand dark:text-primary">
              {user?.name?.charAt(0) || 'A'}
            </span>
          </div>
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-xs font-medium truncate">{user?.name || 'Utilisateur'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-semibold leading-relaxed ${ROLE_COLORS[userRole]}`}>
                    {ROLE_LABELS[userRole]}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout button */}
        {!sidebarCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full mt-2 justify-start gap-2 text-muted-foreground hover:text-red-500 h-8 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </Button>
        )}
        {sidebarCollapsed && (
          <button
            onClick={logout}
            className="w-full mt-2 flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebarCollapse}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center shadow-md hover:bg-accent transition-colors z-50"
      >
        {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </motion.aside>
  )
}
