'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore, type AppPage } from '@/store/app-store'
import {
  Search, FilePlus, LayoutDashboard, Keyboard, X,
} from 'lucide-react'

interface ShortcutDef {
  key: string
  label: string
  description: string
  icon: React.ElementType
  action: () => void
}

export function useKeyboardShortcuts() {
  const { navigate } = useAppStore()
  const [showHelp, setShowHelp] = useState(false)

  const shortcuts: ShortcutDef[] = [
    {
      key: '⌘K',
      label: 'Recherche globale',
      description: 'Ouvrir la recherche globale',
      icon: Search,
      action: () => {
        // Trigger the search dialog via custom event
        window.dispatchEvent(new CustomEvent('eadmin:open-search'))
      },
    },
    {
      key: '⌘N',
      label: 'Nouvelle demande',
      description: 'Accéder au portail citoyen',
      icon: FilePlus,
      action: () => navigate('citizen-portal' as AppPage),
    },
    {
      key: '⌘D',
      label: 'Tableau de bord',
      description: 'Accéder au tableau de bord',
      icon: LayoutDashboard,
      action: () => navigate('dashboard' as AppPage),
    },
    {
      key: '⌘/',
      label: 'Raccourcis clavier',
      description: 'Afficher l\'aide des raccourcis',
      icon: Keyboard,
      action: () => setShowHelp(prev => !prev),
    },
  ]

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey

    // Ctrl/Cmd + K → Open search
    if (mod && e.key === 'k') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('eadmin:open-search'))
      return
    }

    // Ctrl/Cmd + N → New request (citizen portal)
    if (mod && e.key === 'n') {
      e.preventDefault()
      navigate('citizen-portal' as AppPage)
      return
    }

    // Ctrl/Cmd + D → Dashboard
    if (mod && e.key === 'd') {
      e.preventDefault()
      navigate('dashboard' as AppPage)
      return
    }

    // Ctrl/Cmd + / → Show keyboard shortcuts help
    if (mod && e.key === '/') {
      e.preventDefault()
      setShowHelp(prev => !prev)
      return
    }

    // Escape → Close any open dialog
    if (e.key === 'Escape') {
      setShowHelp(false)
      window.dispatchEvent(new CustomEvent('eadmin:close-dialogs'))
    }
  }, [navigate])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { showHelp, setShowHelp, shortcuts }
}

// ─── Keyboard Shortcuts Help Dialog ──────────────────────────────────────────
export function KeyboardShortcutsDialog({
  open,
  onClose,
  shortcuts,
}: {
  open: boolean
  onClose: () => void
  shortcuts: ShortcutDef[]
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-background rounded-xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-[#C8A45C]" />
            <h2 className="text-base font-semibold">Raccourcis clavier</h2>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Guinea tricolor accent */}
        <div className="flex h-0.5">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#009460]" />
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-1">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <shortcut.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{shortcut.label}</p>
                <p className="text-xs text-muted-foreground">{shortcut.description}</p>
              </div>
              <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Utilisez <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 font-mono text-[10px]">⌘</kbd> sur Mac ou <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 font-mono text-[10px]">Ctrl</kbd> sur Windows/Linux
          </p>
        </div>
      </div>
    </div>
  )
}
