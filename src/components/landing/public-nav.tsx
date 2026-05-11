'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Menu, X, Moon, Sun } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { NAV_ITEMS, BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function PublicNav() {
  const { navigate, currentPage, theme, toggleTheme } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on page change
  const handleNavigate = (page: Parameters<typeof navigate>[0]) => {
    navigate(page)
    setMobileOpen(false)
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'glass-card shadow-lg'
          : 'bg-transparent'
      )}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => handleNavigate('landing')}
            className="flex items-center gap-2 group"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden bg-[#0B2E58] dark:bg-primary">
              <img src="/logo-128.png" alt="Armories de la République de Guinée" className="h-9 w-9 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold leading-tight text-[#0B2E58] dark:text-foreground">
                eAdmin Suite
              </span>
              <span className="text-[10px] font-medium leading-tight text-[#C8A45C] dark:text-gold">
                République de Guinée
              </span>
            </div>
          </button>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.public.map((item) => (
              <button
                key={item.page}
                onClick={() => handleNavigate(item.page)}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  currentPage === item.page
                    ? 'text-[#0B2E58] dark:text-foreground bg-[#0B2E58]/5 dark:bg-primary/10'
                    : 'text-muted-foreground hover:text-[#0B2E58] dark:hover:text-foreground hover:bg-muted'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleNavigate('login')}
              className="h-9 text-sm"
            >
              Connexion
            </Button>
            <Button
              onClick={() => handleNavigate('demo')}
              className="h-9 text-sm bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-primary dark:hover:bg-primary/90 text-white"
            >
              Demander une démo
            </Button>
          </div>

          {/* Mobile Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="h-9 w-9"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden glass-card border-t"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_ITEMS.public.map((item) => (
                <button
                  key={item.page}
                  onClick={() => handleNavigate(item.page)}
                  className={cn(
                    'block w-full text-left px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                    currentPage === item.page
                      ? 'text-[#0B2E58] dark:text-foreground bg-[#0B2E58]/5 dark:bg-primary/10'
                      : 'text-muted-foreground hover:text-[#0B2E58] dark:hover:text-foreground hover:bg-muted'
                  )}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-3 mt-3 border-t space-y-2">
                <Button
                  variant="outline"
                  onClick={() => handleNavigate('login')}
                  className="w-full h-10"
                >
                  Connexion
                </Button>
                <Button
                  onClick={() => handleNavigate('demo')}
                  className="w-full h-10 bg-[#0B2E58] hover:bg-[#0B2E58]/90 dark:bg-primary dark:hover:bg-primary/90 text-white"
                >
                  Demander une démo
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
