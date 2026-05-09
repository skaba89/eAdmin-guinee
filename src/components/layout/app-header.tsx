'use client'

import { useAppStore } from '@/store/app-store'
import { Sun, Moon, Bell, Search, Menu, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
}

export function AppHeader() {
  const { currentPage, theme, toggleTheme, user, logout, toggleSidebar } = useAppStore()

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
          <p className="text-xs text-muted-foreground">{user?.institution || 'DataSphere Innovation'}</p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher documents, courriers, workflows..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 h-9"
          />
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
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                5
              </Badge>
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
            <DropdownMenuItem className="text-center text-sm text-brand dark:text-primary justify-center">
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
            <DropdownMenuItem>Mon profil</DropdownMenuItem>
            <DropdownMenuItem>Préférences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400">
              <Sparkles className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
