'use client'

import { useState, useEffect, useCallback } from 'react'
import { GUINEA_COLORS, DESIGN_TOKENS } from '@/lib/design-system'

// ═══════════════════════════════════════════════════════════════════════════════
// Theme Provider — Light/Dark/System mode with Guinea-branded dark theme
// ═══════════════════════════════════════════════════════════════════════════════

type Theme = 'light' | 'dark' | 'system'

interface ThemeProviderState {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

export function useTheme(): ThemeProviderState {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('eadmin-theme') as Theme) || 'system'
    }
    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  const resolveTheme = useCallback((t: Theme): 'light' | 'dark' => {
    if (t === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return 'light'
    }
    return t
  }, [])

  useEffect(() => {
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)

    // Apply to document
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
    root.style.colorScheme = resolved
  }, [theme, resolveTheme])

  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const resolved = resolveTheme('system')
      setResolvedTheme(resolved)
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
      root.style.colorScheme = resolved
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme, resolveTheme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('eadmin-theme', newTheme)
  }, [])

  return { theme, resolvedTheme, setTheme }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Theme Toggle Component
// ═══════════════════════════════════════════════════════════════════════════════

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }
    setTheme(next[theme])
  }

  return (
    <button
      onClick={cycleTheme}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
      aria-label={`Thème actuel: ${theme}. Cliquez pour changer.`}
      title={`Thème: ${theme === 'system' ? 'Système' : theme === 'dark' ? 'Sombre' : 'Clair'}`}
    >
      {/* Sun icon for light */}
      <svg
        className={`h-4 w-4 transition-all ${theme === 'light' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'} absolute`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      {/* Moon icon for dark */}
      <svg
        className={`h-4 w-4 transition-all ${theme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'} absolute`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
      {/* Monitor icon for system */}
      <svg
        className={`h-4 w-4 transition-all ${theme === 'system' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'} absolute`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </button>
  )
}
