'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useAppStore, ROLE_LABELS, type UserRole } from '@/store/app-store'
import { Sun, Moon, Bell, Search, Menu, Sparkles, User, Settings, FileText, Mail, GitBranch, BarChart3, Shield, Users, ScrollText, ClipboardCheck } from 'lucide-react'
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

export function AppHeader() {
  const { currentPage, theme, toggleTheme, user, logout, toggleSidebar, navigate } = useAppStore()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
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
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchSelect = (page: string) => {
    setSearchQuery('')
    setSearchOpen(false)
    navigate(page as typeof currentPage)
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">
            {PAGE_TITLES[currentPage] || 'eAdministration Suite'}
          </h1>
          <p className="text-xs text-muted-foreground">{user?.institution || 'DataSphere Innovation'} • {user ? ROLE_LABELS[(user.role || 'citizen') as UserRole] : ''}</p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-8">
        <div className="relative w-full" ref={searchContainerRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            ref={searchInputRef}
            placeholder="Rechercher documents, courriers, workflows..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 h-9"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => {
              if (searchQuery.trim()) setSearchOpen(true)
            }}
          />
          {/* Search Results Dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden z-50">
              {searchResults.map((item, idx) => (
                <button
                  key={item.page + idx}
                  className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleSearchSelect(item.page)}
                >
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchOpen && searchQuery.trim() && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg p-4 z-50">
              <p className="text-sm text-muted-foreground text-center">Aucun résultat pour &laquo;{searchQuery}&raquo;</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                  {notifCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">Nouveau courrier arrivé</span>
              <span className="text-xs text-muted-foreground">Courrier n°2024-1847 - Ministère des Finances</span>
              <span className="text-[10px] text-muted-foreground">Il y a 5 minutes</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">Workflow approuvé</span>
              <span className="text-xs text-muted-foreground">Demande de congé - Circuit validé</span>
              <span className="text-[10px] text-muted-foreground">Il y a 1 heure</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">Signature requise</span>
              <span className="text-xs text-muted-foreground">Arrêté n°2024-312 en attente de visa</span>
              <span className="text-[10px] text-muted-foreground">Il y a 3 heures</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center text-sm text-brand dark:text-primary justify-center"
              onClick={() => navigate('notifications')}
            >
              Voir toutes les notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-brand text-white text-xs dark:bg-primary">
                  {user?.name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden lg:block text-sm font-medium">{user?.name || 'Admin'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Préférences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400">
              <Sparkles className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mon profil</DialogTitle>
            <DialogDescription>Informations de votre compte utilisateur</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-brand text-white text-xl dark:bg-primary">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{user?.name}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {user?.role && (
                  <Badge className="mt-1" variant="outline">
                    {ROLE_LABELS[user.role as UserRole]}
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg border">
                <span className="text-xs text-muted-foreground w-28">Institution</span>
                <span className="text-sm font-medium">{user?.institution || '—'}</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border">
                <span className="text-xs text-muted-foreground w-28">Fonction</span>
                <span className="text-sm font-medium">{user?.fonction || '—'}</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border">
                <span className="text-xs text-muted-foreground w-28">Téléphone</span>
                <span className="text-sm font-medium">{user?.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border">
                <span className="text-xs text-muted-foreground w-28">NIN</span>
                <span className="text-sm font-medium">{user?.nin || '—'}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => navigate('settings')}>
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
