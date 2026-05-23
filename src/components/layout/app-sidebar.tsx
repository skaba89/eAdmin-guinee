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
import { getAccessiblePages, canAccessPage } from '@/lib/rbac'
import type { UserInfo } from '@/store/app-store'

// ─── NAV ITEM DEFINITION ─────────────────────────────────────────────────────
interface NavItem {
  page: AppPage
  label: string
  icon: string
}

// ─── ALL PAGE METADATA (single source of truth for labels & icons) ───────────
const PAGE_META: Record<AppPage, { label: string; icon: string; section: 'main' | 'admin' }> = {
  // Main modules
  'citizen-portal': { label: 'Mon Portail', icon: 'Home', section: 'main' },
  'public-citizen-portal': { label: 'Services publics', icon: 'Briefcase', section: 'main' },
  'mairie-dashboard': { label: 'Tableau de bord Mairie', icon: 'LayoutDashboard', section: 'main' },
  'agence-dashboard': { label: 'Tableau de bord Agence', icon: 'LayoutDashboard', section: 'main' },
  'dashboard': { label: 'Tableau de bord', icon: 'LayoutDashboard', section: 'main' },
  'service-requests': { label: 'Demandes citoyennes', icon: 'ClipboardCheck', section: 'main' },
  'ged': { label: 'GED', icon: 'FileText', section: 'main' },
  'courriers': { label: 'Courriers', icon: 'Mail', section: 'main' },
  'workflow': { label: 'Workflows', icon: 'GitBranch', section: 'main' },
  'signatures': { label: 'Signatures', icon: 'PenTool', section: 'main' },
  'analytics': { label: 'Analytics', icon: 'BarChart3', section: 'main' },
  'birth-certificate-db': { label: 'Base État Civil', icon: 'BookOpen', section: 'main' },
  'ai-assistant': { label: 'Assistant IA', icon: 'Sparkles', section: 'main' },
  'settings': { label: 'Paramètres', icon: 'Settings', section: 'main' },
  'notifications': { label: 'Notifications', icon: 'Bell', section: 'main' },
  // Admin modules
  'admin': { label: 'Administration', icon: 'Shield', section: 'admin' },
  'users': { label: 'Utilisateurs', icon: 'UserCog', section: 'admin' },
  'audit-logs': { label: 'Audit Logs', icon: 'ScrollText', section: 'admin' },
  // Non-sidebar pages (public/auth)
  'landing': { label: 'Accueil', icon: 'Home', section: 'main' },
  'about': { label: 'À propos', icon: 'FileText', section: 'main' },
  'services': { label: 'Services', icon: 'Briefcase', section: 'main' },
  'solutions': { label: 'Solutions', icon: 'Sparkles', section: 'main' },
  'pricing': { label: 'Tarifs', icon: 'BarChart3', section: 'main' },
  'contact': { label: 'Contact', icon: 'Mail', section: 'main' },
  'blog': { label: 'Blog', icon: 'FileText', section: 'main' },
  'faq': { label: 'FAQ', icon: 'FileText', section: 'main' },
  'demo': { label: 'Démo', icon: 'LayoutDashboard', section: 'main' },
  'login': { label: 'Connexion', icon: 'LogOut', section: 'main' },
  'register': { label: 'Inscription', icon: 'Users', section: 'main' },
  'mfa': { label: 'MFA', icon: 'Shield', section: 'main' },
}

// Pages that should NOT appear in the sidebar
const HIDDEN_PAGES: AppPage[] = [
  'landing', 'about', 'services', 'solutions', 'pricing',
  'contact', 'blog', 'faq', 'demo', 'login', 'register', 'mfa',
  'public-citizen-portal', // accessed via citizen-portal tab
]

/**
 * Build navigation items dynamically from RBAC.
 * Only pages the user can access (via canAccessPage) appear in the sidebar.
 */
function buildNavItems(user: UserInfo | null): { main: NavItem[]; admin: NavItem[] } {
  const accessiblePages = getAccessiblePages(user)
  const main: NavItem[] = []
  const admin: NavItem[] = []

  for (const page of accessiblePages) {
    if (HIDDEN_PAGES.includes(page)) continue
    const meta = PAGE_META[page]
    if (!meta) continue
    const item: NavItem = { page, label: meta.label, icon: meta.icon }
    if (meta.section === 'admin') {
      admin.push(item)
    } else {
      main.push(item)
    }
  }

  return { main, admin }
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, FileText, Mail, GitBranch, PenTool,
  BarChart3, Users, Shield, UserCog, Settings, Bell,
  ScrollText, Sparkles, ClipboardCheck, Building2, Database,
  Fingerprint, Home, Briefcase, BookOpen,
}

// ─── GUINEA TRICOLOR STRIPE ──────────────────────────────────────────────────
function GuineaTricolor({ className }: { className?: string }) {
  return (
    <div className={cn('flex w-full h-[3px] shrink-0', className)}>
      <div className="flex-1 bg-[#CE1126]" />
      <div className="flex-1 bg-[#FCD116]" />
      <div className="flex-1 bg-[#009460]" />
    </div>
  )
}

// ─── SECTION LABEL ───────────────────────────────────────────────────────────
function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return null
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C8A45C]/80 dark:text-[#D4B878]/70 px-4 mb-2 select-none"
    >
      {children}
    </motion.p>
  )
}

// ─── PREMIUM NAV ITEM ────────────────────────────────────────────────────────
function PremiumNavItem({
  page,
  label,
  icon,
  isActive,
  collapsed,
  onClick,
}: {
  page: AppPage
  label: string
  icon?: string
  isActive: boolean
  collapsed: boolean
  onClick: () => void
}) {
  const IconComponent = icon ? ICON_MAP[icon] : null

  return (
    <motion.button
      key={page}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex items-center w-full rounded-lg text-sm font-medium transition-all duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
        collapsed ? 'justify-center px-2 py-2.5 mx-auto' : 'gap-3 px-3 py-2.5',
        isActive
          ? 'text-white dark:text-white'
          : 'text-white/75 dark:text-white/65 hover:text-white/95 dark:hover:text-white/90'
      )}
    >
      {/* Active background with gradient */}
      {isActive && (
        <motion.div
          layoutId="activeNavBg"
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #0B2E58 0%, #153d6e 50%, #1a4a82 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(11,46,88,0.35)',
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}

      {/* Hover glow background */}
      {!isActive && (
        <div className="absolute inset-0 rounded-lg bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      {/* Left gold accent bar for active state */}
      {isActive && (
        <motion.div
          layoutId="activeGoldBar"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
          style={{ background: 'linear-gradient(180deg, #D4B878, #C8A45C, #D4B878)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      {/* Icon */}
      <span className={cn('relative z-10 shrink-0', collapsed && 'mx-auto')}>
        {IconComponent && (
          <IconComponent
            className={cn(
              'h-[18px] w-[18px] transition-all duration-300',
              isActive
                ? 'text-[#C8A45C] dark:text-[#D4B878]'
                : 'text-white/65 dark:text-white/55 group-hover:text-white/90 dark:group-hover:text-white/80'
            )}
            style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(200,164,92,0.4))' } : undefined}
          />
        )}
      </span>

      {/* Label text */}
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={cn(
              'relative z-10 whitespace-nowrap overflow-hidden transition-all duration-200',
              isActive && 'font-semibold'
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Subtle inner glow on active */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 50%, rgba(200,164,92,0.06) 0%, transparent 70%)',
          }}
        />
      )}
    </motion.button>
  )
}

// ─── MAIN SIDEBAR COMPONENT ──────────────────────────────────────────────────
export function AppSidebar() {
  const { currentPage, navigate, sidebarCollapsed, toggleSidebarCollapse, logout, user } = useAppStore()

  const userRole = (user?.role || 'citizen') as UserRole
  const { main: navItems, admin: adminItems } = buildNavItems(user)

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'h-screen sticky top-0 flex flex-col z-40 overflow-hidden',
        'border-r border-white/[0.06] dark:border-white/[0.04]'
      )}
      style={{
        background: 'linear-gradient(180deg, #071d38 0%, #0a2744 25%, #0d3258 60%, #0f3a66 100%)',
      }}
    >
      {/* Glass overlay for premium depth */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 40%, rgba(0,0,0,0.05) 100%)',
          backdropFilter: 'blur(1px)',
        }}
      />

      {/* Top Guinea Tricolor */}
      <GuineaTricolor />

      {/* ═══ LOGO SECTION ═══ */}
      <div className="relative z-10 flex items-center gap-3 px-4 h-[68px] border-b border-white/[0.06] shrink-0">
        <div
          className={cn(
            'h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0',
            'ring-[1.5px] ring-[#C8A45C]/40 dark:ring-[#D4B878]/30',
            'shadow-[0_0_12px_rgba(200,164,92,0.15),0_2px_8px_rgba(0,0,0,0.3)]'
          )}
        >
          <img
            src="/logo-128.png"
            alt="Armories de la République de Guinée"
            className="h-10 w-10 object-contain"
          />
        </div>
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="font-bold text-[13px] leading-tight text-white tracking-wide">
                eAdmin Guinée
              </div>
              <div className="text-[10px] text-[#C8A45C]/80 dark:text-[#D4B878]/70 tracking-wider font-medium mt-0.5">
                République de Guinée
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ NAVIGATION ═══ */}
      <div className="relative z-10 flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-thin">
        {/* Main modules */}
        <div>
          <SectionLabel collapsed={sidebarCollapsed}>Modules</SectionLabel>
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <PremiumNavItem
                key={item.page}
                page={item.page}
                label={item.label}
                icon={item.icon}
                isActive={currentPage === item.page}
                collapsed={sidebarCollapsed}
                onClick={() => navigate(item.page)}
              />
            ))}
          </div>
        </div>

        {/* Admin section */}
        {adminItems.length > 0 && (
          <div>
            <SectionLabel collapsed={sidebarCollapsed}>Administration</SectionLabel>
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <PremiumNavItem
                  key={item.page}
                  page={item.page}
                  label={item.label}
                  icon={item.icon}
                  isActive={currentPage === item.page}
                  collapsed={sidebarCollapsed}
                  onClick={() => navigate(item.page)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM TRICOLOR STRIPE ═══ */}
      <div className="relative z-10">
        <GuineaTricolor />
      </div>

      {/* ═══ USER SECTION ═══ */}
      <div className="relative z-10 border-t border-white/[0.06] p-3 shrink-0">
        <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
          {/* Premium avatar with gradient */}
          <div
            className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
              'ring-[1.5px] ring-[#C8A45C]/30 dark:ring-[#D4B878]/25',
              'shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
            )}
            style={{
              background: 'linear-gradient(135deg, #0B2E58 0%, #1a4a82 60%, #2a5a94 100%)',
            }}
          >
            <span className="text-[11px] font-bold text-[#C8A45C] dark:text-[#D4B878]">
              {user?.name?.charAt(0) || 'A'}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-xs font-semibold text-white/90 truncate">
                  {user?.name || 'Utilisateur'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={cn(
                      'inline-flex items-center px-1.5 py-[1px] rounded text-[8px] font-bold uppercase tracking-wider',
                      'bg-[#C8A45C]/15 text-[#C8A45C] dark:bg-[#D4B878]/15 dark:text-[#D4B878]',
                      'border border-[#C8A45C]/20 dark:border-[#D4B878]/15'
                    )}
                  >
                    {ROLE_LABELS[userRole]}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout button */}
        <AnimatePresence mode="wait">
          {!sidebarCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className={cn(
                  'w-full mt-3 justify-start gap-2 h-8 text-xs rounded-lg',
                  'text-white/40 hover:text-red-400 hover:bg-red-500/10',
                  'transition-all duration-300'
                )}
              >
                <LogOut className="h-3.5 w-3.5" />
                Déconnexion
              </Button>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={logout}
              title="Déconnexion"
              className={cn(
                'w-full mt-3 flex items-center justify-center p-2 rounded-lg',
                'text-white/40 hover:text-red-400 hover:bg-red-500/10',
                'transition-all duration-300'
              )}
            >
              <LogOut className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ COLLAPSE TOGGLE BUTTON ═══ */}
      <motion.button
        onClick={toggleSidebarCollapse}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'absolute -right-3.5 top-20 h-7 w-7 rounded-full flex items-center justify-center z-50',
          'bg-[#0B2E58] dark:bg-[#0d3258]',
          'border-2 border-[#C8A45C]/40 dark:border-[#D4B878]/30',
          'shadow-[0_2px_8px_rgba(0,0,0,0.3),0_0_12px_rgba(200,164,92,0.15)]',
          'hover:border-[#C8A45C]/70 dark:hover:border-[#D4B878]/60',
          'hover:shadow-[0_2px_12px_rgba(0,0,0,0.4),0_0_18px_rgba(200,164,92,0.25)]',
          'transition-all duration-300'
        )}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3 w-3 text-[#C8A45C] dark:text-[#D4B878]" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-[#C8A45C] dark:text-[#D4B878]" />
        )}
      </motion.button>
    </motion.aside>
  )
}
