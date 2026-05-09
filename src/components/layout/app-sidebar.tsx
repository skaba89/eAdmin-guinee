'use client'

import { useAppStore, type AppPage } from '@/store/app-store'
import { NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FileText, Mail, GitBranch, PenTool,
  BarChart3, Users, Shield, UserCog, Settings, Bell,
  ScrollText, LogOut, ChevronLeft, ChevronRight, Sparkles,
  ClipboardCheck
} from 'lucide-react'

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, FileText, Mail, GitBranch, PenTool,
  BarChart3, Users, Shield, UserCog, Settings, Bell,
  ScrollText, Sparkles, ClipboardCheck,
}

export function AppSidebar() {
  const { currentPage, navigate, sidebarCollapsed, toggleSidebarCollapse, logout, user } = useAppStore()

  const navItem = (page: AppPage, label: string, icon?: string, section?: string) => {
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
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <div className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center shrink-0 shadow-lg shadow-brand/30">
          <Sparkles className="h-5 w-5 text-white" />
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
              <div className="text-[10px] text-muted-foreground">DataSphere Innovation</div>
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
            {NAV_ITEMS.app.map((item) => navItem(item.page, item.label, item.icon))}
          </div>
        </div>

        {/* Admin */}
        <div>
          {!sidebarCollapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-2">Administration</p>
          )}
          <div className="space-y-1">
            {NAV_ITEMS.admin.map((item) => navItem(item.page, item.label, item.icon))}
          </div>
        </div>
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
                <p className="text-[10px] text-muted-foreground truncate">{user?.role || 'Admin'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
