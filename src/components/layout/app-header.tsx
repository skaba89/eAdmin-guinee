'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useAppStore, ROLE_LABELS, type UserRole } from '@/store/app-store'
import {
  Sun, Moon, Bell, Search, Menu, Sparkles, User, Settings,
  FileText, Mail, GitBranch, BarChart3, Shield, Users,
  ScrollText, ClipboardCheck, LogOut, ChevronRight, Clock,
  AlertCircle, CheckCircle2, PenLine, Command,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Tableau de bord',
  ged: 'GED — Documents Officiels',
  courriers: 'Courrier Officiel Interministériel',
  workflow: 'Procédures Administratives Réglementaires',
  signatures: 'Signatures Électroniques',
  analytics: 'Analytics & Décisionnel',
  admin: 'Administration',
  users: 'Gestion des Utilisateurs',
  settings: 'Paramètres',
  notifications: 'Notifications',
  'audit-logs': 'Journal d\'Audit',
  'citizen-portal': 'Portail Citoyen',
  'service-requests': 'Traitement des Demandes Citoyennes',
  'mairie-dashboard': 'Tableau de bord — Mairie',
  'agence-dashboard': "Tableau de bord — Agence d'Identification",
  'ai-assistant': 'Assistant IA',
  'birth-certificate-db': 'Base de Données des Actes de Naissance',
}

// Searchable items across all sections
const SEARCH_ITEMS = [
  { label: 'Tableau de bord', page: 'dashboard' as const, icon: BarChart3, category: 'Navigation' },
  { label: 'Documents GED', page: 'ged' as const, icon: FileText, category: 'Navigation' },
  { label: 'Courriers', page: 'courriers' as const, icon: Mail, category: 'Navigation' },
  { label: 'Workflows', page: 'workflow' as const, icon: GitBranch, category: 'Navigation' },
  { label: 'Analytics', page: 'analytics' as const, icon: BarChart3, category: 'Navigation' },
  { label: 'Paramètres', page: 'settings' as const, icon: Settings, category: 'Navigation' },
  { label: 'Notifications', page: 'notifications' as const, icon: Bell, category: 'Navigation' },
  { label: 'Journal d\'Audit', page: 'audit-logs' as const, icon: ScrollText, category: 'Navigation' },
  { label: 'Utilisateurs', page: 'users' as const, icon: Users, category: 'Navigation' },
  { label: 'Administration', page: 'admin' as const, icon: Shield, category: 'Navigation' },
  { label: 'Demandes Citoyennes', page: 'service-requests' as const, icon: ClipboardCheck, category: 'Navigation' },
  { label: 'Portail Citoyen', page: 'citizen-portal' as const, icon: Users, category: 'Navigation' },
  { label: 'Signatures Électroniques', page: 'signatures' as const, icon: FileText, category: 'Navigation' },
]

// Premium notification data with icons and types
const NOTIFICATION_ITEMS = [
  {
    id: 1,
    title: 'Nouveau courrier arrivé',
    description: 'Courrier n°2024-1847 — Ministère des Finances',
    time: 'Il y a 5 min',
    type: 'mail' as const,
    read: false,
  },
  {
    id: 2,
    title: 'Workflow approuvé',
    description: 'Demande de congé — Circuit validé',
    time: 'Il y a 1 heure',
    type: 'success' as const,
    read: false,
  },
  {
    id: 3,
    title: 'Signature requise',
    description: 'Arrêté n°2024-312 en attente de visa',
    time: 'Il y a 3 heures',
    type: 'signature' as const,
    read: true,
  },
  {
    id: 4,
    title: 'Alerte de sécurité',
    description: 'Tentative de connexion depuis un nouvel appareil',
    time: 'Il y a 5 heures',
    type: 'alert' as const,
    read: true,
  },
] as const

const NOTIFICATION_ICONS = {
  mail: Mail,
  success: CheckCircle2,
  signature: PenLine,
  alert: AlertCircle,
} as const

const NOTIFICATION_COLORS = {
  mail: 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
  success: 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
  signature: 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
  alert: 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/40',
} as const

export function AppHeader() {
  const { currentPage, theme, toggleTheme, user, logout, toggleSidebar, navigate } = useAppStore()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Profile dialog
  const [profileOpen, setProfileOpen] = useState(false)

  // Notification count derived from a realistic state
  const [notifCount] = useState(() => Math.floor(Math.random() * 3) + 3) // 3-5

  // Filter search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return SEARCH_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    ).slice(0, 6)
  }, [searchQuery])

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setSearchFocused(true)
        if (searchQuery.trim()) setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchFocused(false)
        searchInputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery])

  const handleSearchSelect = (page: string) => {
    setSearchQuery('')
    setSearchOpen(false)
    setSearchFocused(false)
    navigate(page as typeof currentPage)
  }

  const pageTitle = PAGE_TITLES[currentPage] || 'eAdministration Suite'

  // Detect macOS for shortcut display
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 bg-background/90 dark:bg-background/85 backdrop-blur-xl border-b border-border/50">
      {/* Premium bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand/10 to-transparent" />

      {/* LEFT: Menu + Page Title */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {/* Brand-colored dot indicator */}
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-gradient-to-br from-gold to-brand shadow-[0_0_6px_rgba(200,164,92,0.4)]" />
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate text-foreground">
              {pageTitle}
            </h1>
          </div>
          {/* Breadcrumb-style subtitle */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-muted-foreground/80 truncate max-w-[140px] sm:max-w-none">
              {user?.institution || 'République de Guinée'}
            </span>
            <span className="text-muted-foreground/40 text-[8px]">●</span>
            <span className="text-[11px] text-gold/80 font-medium truncate">
              {user ? ROLE_LABELS[(user.role || 'citizen') as UserRole] : ''}
            </span>
          </div>
        </div>
      </div>

      {/* CENTER: Premium Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-lg mx-6 lg:mx-8">
        <div className="relative w-full" ref={searchContainerRef}>
          {/* Search input with glass effect */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10 pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder="Rechercher documents, courriers, workflows..."
              className={`
                pl-10 pr-16 h-9 rounded-full
                bg-muted/40 dark:bg-muted/30
                border border-border/50
                backdrop-blur-sm
                text-sm
                placeholder:text-muted-foreground/50
                transition-all duration-300 ease-out
                focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold/30
                focus-visible:bg-background/80 dark:focus-visible:bg-background/60
                hover:bg-muted/60
              `}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => {
                setSearchFocused(true)
                if (searchQuery.trim()) setSearchOpen(true)
              }}
              onBlur={() => setSearchFocused(false)}
            />
            {/* Keyboard shortcut indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none select-none">
              <kbd className="hidden lg:inline-flex items-center gap-0.5 h-5 px-1.5 rounded-md border border-border/60 bg-muted/50 text-[10px] text-muted-foreground/60 font-mono">
                {isMac ? (
                  <span className="text-[9px]">⌘</span>
                ) : (
                  <span className="text-[9px]">Ctrl</span>
                )}
                <span>K</span>
              </kbd>
            </div>
          </div>

          {/* Premium Search Results Dropdown */}
          <AnimatePresence>
            {searchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute top-full left-0 right-0 mt-2 bg-background/95 dark:bg-popover/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden z-50"
              >
                <div className="p-1">
                  {searchResults.map((item, idx) => (
                    <button
                      key={item.page + idx}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-all duration-150 text-left group"
                      onClick={() => handleSearchSelect(item.page)}
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-brand/8 dark:bg-brand/10 text-brand dark:text-primary shrink-0 group-hover:bg-brand/12 transition-colors">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-brand dark:group-hover:text-primary transition-colors">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground/60">{item.category}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {searchOpen && searchQuery.trim() && searchResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-background/95 dark:bg-popover/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-xl p-6 z-50"
              >
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Search className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm">Aucun résultat pour &laquo;{searchQuery}&raquo;</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Premium Theme Toggle with smooth transition */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 overflow-hidden"
          onClick={toggleTheme}
        >
          <AnimatePresence mode="wait" initial={false}>
            {theme === 'light' ? (
              <motion.div
                key="moon"
                initial={{ y: -16, opacity: 0, rotate: -90 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 16, opacity: 0, rotate: 90 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <Moon className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="sun"
                initial={{ y: -16, opacity: 0, rotate: 90 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 16, opacity: 0, rotate: -90 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <Sun className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        {/* Premium Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                  <span className="absolute inline-flex h-4 w-4 rounded-full bg-red-500 opacity-40 animate-ping" />
                  <span className="relative inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {notifCount}
                  </span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl border-border/60 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
                <Badge variant="secondary" className="h-5 text-[10px] font-medium bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-0">
                  {notifCount} nouvelles
                </Badge>
              </div>
            </div>
            {/* Notification items */}
            <div className="max-h-80 overflow-y-auto">
              {NOTIFICATION_ITEMS.map((notif, idx) => {
                const NotifIcon = NOTIFICATION_ICONS[notif.type]
                const colorClass = NOTIFICATION_COLORS[notif.type]
                return (
                  <DropdownMenuItem
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer rounded-none hover:bg-muted/40 transition-colors ${idx < NOTIFICATION_ITEMS.length - 1 ? 'border-b border-border/30' : ''}`}
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 mt-0.5 ${colorClass}`}>
                      <NotifIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{notif.title}</p>
                        {!notif.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{notif.description}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground/40" />
                        <span className="text-[10px] text-muted-foreground/50">{notif.time}</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </div>
            {/* See all link */}
            <div className="border-t border-border/50 bg-muted/10">
              <DropdownMenuItem
                className="text-center text-sm text-brand dark:text-primary justify-center py-2.5 font-medium hover:bg-muted/30 cursor-pointer rounded-none"
                onClick={() => navigate('notifications')}
              >
                Voir toutes les notifications
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Premium User Avatar / Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 px-2 h-9 rounded-lg hover:bg-muted/60"
            >
              <div className="relative">
                <Avatar className="h-7 w-7 ring-2 ring-border/50 ring-offset-1 ring-offset-background">
                  <AvatarFallback className="bg-brand text-white text-[11px] font-semibold dark:bg-primary dark:text-primary-foreground">
                    {user?.name?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                {/* Online / role indicator dot */}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <span className="hidden lg:block text-sm font-medium max-w-[120px] truncate">{user?.name || 'Admin'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 p-0 rounded-xl border-border/60 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
            {/* User info header */}
            <div className="px-4 py-3.5 border-b border-border/50 bg-gradient-to-r from-brand/5 to-gold/5 dark:from-brand/10 dark:to-gold/5">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-border/50">
                  <AvatarFallback className="bg-brand text-white text-sm font-semibold dark:bg-primary dark:text-primary-foreground">
                    {user?.name?.split(' ').map(n => n[0]).join('') || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{user?.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  {user?.role && (
                    <Badge className="mt-1 h-4 text-[9px] px-1.5 font-medium bg-brand/10 text-brand dark:bg-primary/15 dark:text-primary border-0 hover:bg-brand/15">
                      {ROLE_LABELS[user.role as UserRole]}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {/* Menu items */}
            <div className="p-1.5">
              <DropdownMenuItem
                onClick={() => setProfileOpen(true)}
                className="rounded-lg px-3 py-2 cursor-pointer gap-3"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Mon profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('settings')}
                className="rounded-lg px-3 py-2 cursor-pointer gap-3"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Préférences</span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator className="bg-border/50" />
            <div className="p-1.5">
              <DropdownMenuItem
                onClick={logout}
                className="rounded-lg px-3 py-2 cursor-pointer gap-3 text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-950/30 hover:!text-red-700 dark:hover:!text-red-300"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Déconnexion</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md rounded-xl border-border/60 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Mon profil</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Informations de votre compte utilisateur</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-brand/5 to-gold/5 dark:from-brand/10 dark:to-gold/5 border border-border/40">
              <Avatar className="h-16 w-16 ring-2 ring-border/50 ring-offset-2 ring-offset-background">
                <AvatarFallback className="bg-brand text-white text-xl font-semibold dark:bg-primary dark:text-primary-foreground">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{user?.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                {user?.role && (
                  <Badge className="mt-1.5" variant="outline">
                    {ROLE_LABELS[user.role as UserRole]}
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Institution', value: user?.institution },
                { label: 'Fonction', value: user?.fonction },
                { label: 'Téléphone', value: user?.phone },
                { label: 'NIN', value: user?.nin },
              ].map((field) => (
                <div
                  key={field.label}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-[11px] text-muted-foreground/70 w-24 shrink-0 font-medium uppercase tracking-wide">{field.label}</span>
                  <span className="text-sm font-medium truncate">{field.value || '—'}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('settings')}
                className="rounded-lg border-border/60 hover:bg-muted/60"
              >
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                Modifier les paramètres
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
