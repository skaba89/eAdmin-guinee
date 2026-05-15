'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Moon, Sun, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { NAV_ITEMS, BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function PublicNav() {
  const { navigate, currentPage, theme, toggleTheme } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Smooth scroll to top on navigation
  const handleNavigate = useCallback((page: Parameters<typeof navigate>[0]) => {
    navigate(page)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [navigate])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] glass-nav-visible',
        scrolled && 'glass-nav-scrolled',
        // Always ensure text shadow for readability against any background
        '[&_span]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
      )}
    >
      {/* Guinea Tricolor Accent Line */}
      <div className="h-[3px] w-full flex shrink-0">
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
        <div className="flex-1 bg-[#009460]" />
      </div>

      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => handleNavigate('landing')}
            className="flex items-center gap-2.5 group"
            aria-label={`${BRAND.name} — Accueil`}
          >
            {/* Logo container with gold ring on hover */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-white/15 shadow-md transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(200,164,92,0.3)] group-hover:scale-105 group-hover:bg-white/20">
              <img
                src="/images/coat-of-arms.png"
                alt="Armories de la République de Guinée"
                className="h-8 w-8 object-contain"
              />
              {/* Gold border glow on hover */}
              <div className="absolute inset-0 rounded-xl ring-1 ring-[#C8A45C]/0 group-hover:ring-[#C8A45C]/40 transition-all duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] tracking-tight">
                eAdmin Suite
              </span>
              <span className="text-[10px] font-semibold leading-tight text-[#FCD116] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] tracking-wide uppercase">
                République de Guinée
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.public.map((item) => {
              const isActive = currentPage === item.page
              return (
                <button
                  key={item.page}
                  onClick={() => handleNavigate(item.page)}
                  className={cn(
                    'relative px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]',
                    isActive
                      ? 'text-white dark:text-[#FCD116]'
                      : 'text-white/80 hover:text-white dark:hover:text-white'
                  )}
                >
                  {/* Active indicator pill */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-lg bg-white/15 dark:bg-[#C8A45C]/[0.12]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {/* Gold underline on hover */}
                  <span className="relative">
                    {item.label}
                    <span
                      className={cn(
                        'absolute -bottom-0.5 left-0 h-[2px] rounded-full transition-all duration-300',
                        isActive
                          ? 'w-full bg-[#FCD116] dark:bg-[#D4B878]'
                          : 'w-0 bg-[#FCD116] group-hover:w-full'
                      )}
                    />
                  </span>
                  {/* Hover background */}
                  {!isActive && (
                    <span className="absolute inset-0 rounded-lg bg-transparent hover:bg-white/10 transition-colors duration-200" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2.5">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg hover:bg-muted/60 transition-colors duration-200"
              aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="h-4 w-4 text-[#FCD116]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="h-4 w-4 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {/* Connexion Button — outline with premium hover */}
            <Button
              variant="outline"
              onClick={() => handleNavigate('login')}
              className="h-9 px-4 text-sm font-medium rounded-lg border-white/30 text-white hover:bg-white/15 hover:border-white/50 hover:text-white bg-white/5 backdrop-blur-sm transition-all duration-300"
            >
              Connexion
            </Button>

            {/* Premium CTA — Demander une démo */}
            <button
              onClick={() => handleNavigate('demo')}
              className="btn-gold flex items-center gap-1.5 h-9 px-5 text-sm shadow-lg shadow-[#C8A45C]/30"
            >
              Demander une démo
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg"
              aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === 'dark' ? (
                  <motion.div
                    key="sun-m"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="h-4 w-4 text-[#FCD116]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon-m"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="h-4 w-4 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="h-9 w-9 rounded-lg text-white hover:bg-white/10"
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </nav>

      {/* Premium Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-[67px] bg-black/20 dark:bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />

            {/* Menu panel */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden glass-nav-mobile mx-3 mt-1 rounded-2xl overflow-hidden shadow-premium-lg"
            >
              {/* Guinea tricolor divider inside mobile menu */}
              <div className="h-[2px] w-full flex">
                <div className="flex-1 bg-[#CE1126]/60" />
                <div className="flex-1 bg-[#FCD116]/60" />
                <div className="flex-1 bg-[#009460]/60" />
              </div>

              <div className="px-3 py-3 space-y-0.5">
                {NAV_ITEMS.public.map((item, index) => {
                  const isActive = currentPage === item.page
                  return (
                    <motion.button
                      key={item.page}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: index * 0.04,
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onClick={() => handleNavigate(item.page)}
                      className={cn(
                        'flex items-center w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]',
                        isActive
                          ? 'text-white bg-white/15'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      )}
                    >
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#C8A45C] dark:bg-[#D4B878] shrink-0" />
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* CTA section */}
              <div className="px-3 pb-3 pt-1 space-y-2">
                <div className="h-px divider-premium" />
                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => handleNavigate('login')}
                    className="w-full h-11 rounded-xl font-medium border-white/30 text-white hover:bg-white/15 hover:border-white/50 bg-white/5 backdrop-blur-sm transition-all duration-300"
                  >
                    Connexion
                  </Button>
                  <button
                    onClick={() => handleNavigate('demo')}
                    className="btn-gold w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm shadow-lg shadow-[#C8A45C]/30"
                  >
                    Demander une démo
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
