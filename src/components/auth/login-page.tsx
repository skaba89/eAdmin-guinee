'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Shield, Users, Building2, IdCard, Scale, Fingerprint, Crown, ArrowRight, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAppStore, DEMO_ACCOUNTS, ROLE_LABELS, type UserRole } from '@/store/app-store'

// Guinea national colors
const GUINEA_RED = '#CE1126'
const GUINEA_YELLOW = '#FCD116'
const GUINEA_GREEN = '#009460'

// Role icon map for demo accounts
const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  citizen: Users,
  mairie: Building2,
  admin_general: Shield,
  agence: IdCard,
  ministere: Scale,
  super_admin: Crown,
}

const ROLE_ICON_COLORS: Record<UserRole, string> = {
  citizen: 'text-emerald-400',
  mairie: 'text-blue-400',
  admin_general: 'text-purple-400',
  agence: 'text-amber-400',
  ministere: 'text-red-400',
  super_admin: 'text-[#C8A45C]',
}

// Stagger animation variants
const containerStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const itemSlideUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
}

const itemFadeScale = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
}

// Floating gold particles component
function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.4 + 0.1,
    })),
    []
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: GUINEA_YELLOW,
            opacity: p.opacity,
            animation: `loginParticleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// Geometric dot grid overlay
function DotGridOverlay() {
  return (
    <div
      className="absolute inset-0 opacity-[0.04] pointer-events-none"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(200,164,92,0.8) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
  )
}

export function LoginPage() {
  const { login, navigate, loginError } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setIsSubmitting(true)
    setTimeout(() => {
      login(email, password)
      setIsSubmitting(false)
    }, 300)
  }

  const handleQuickLogin = (demoEmail: string) => {
    const account = DEMO_ACCOUNTS[demoEmail]
    if (account) {
      setEmail(demoEmail)
      setPassword(account.password)
      setTimeout(() => {
        login(demoEmail, account.password)
      }, 200)
    }
  }

  const demoAccounts = Object.entries(DEMO_ACCOUNTS)

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* ═══ FULL-WIDTH GUINEA TRICOLOR STRIPE AT TOP ═══ */}
      <div className="absolute top-0 left-0 right-0 h-1.5 z-50 flex">
        <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
        <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
        <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
      </div>

      {/* ═══ LEFT PANEL — GUINEA BRANDING ═══ */}
      <div
        className="hidden lg:flex lg:w-[46%] relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 15% 15%, rgba(59,125,216,0.45) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 20%, rgba(200,164,92,0.25) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 85%, rgba(0,148,96,0.2) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 70%, rgba(206,17,38,0.1) 0%, transparent 45%),
            radial-gradient(ellipse at 75% 60%, rgba(252,209,22,0.12) 0%, transparent 45%),
            radial-gradient(ellipse at 50% 40%, rgba(59,125,216,0.08) 0%, transparent 60%),
            linear-gradient(160deg, #071E3A 0%, #0B2E58 35%, #143D6B 70%, #0B2E58 100%)
          `,
        }}
      >
        {/* Background image — Palais du Peuple, Conakry */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
          style={{ backgroundImage: "url('/images/palais-du-peuple-full.jpg')" }}
        />
        {/* Decorative tricolor vertical stripes */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 flex flex-col z-20">
          <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
          <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
          <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
        </div>

        {/* Floating gold particles */}
        <FloatingParticles />

        {/* Geometric dot grid overlay */}
        <DotGridOverlay />

        {/* Subtle radial glow accents */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] pointer-events-none hidden sm:block"
          style={{ background: 'radial-gradient(circle, rgba(200,164,92,0.06) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] pointer-events-none hidden sm:block"
          style={{ background: 'radial-gradient(circle, rgba(0,148,96,0.05) 0%, transparent 70%)' }} />

        <div className="relative z-10 text-center space-y-8 max-w-md">
          {/* Guinea Shield Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Premium gold glow ring - outer pulse */}
              <div
                className="absolute -inset-5 rounded-full animate-glow-pulse"
                style={{
                  background: `radial-gradient(circle, ${GUINEA_YELLOW}20 0%, transparent 70%)`,
                  boxShadow: `0 0 40px ${GUINEA_YELLOW}15, 0 0 80px ${GUINEA_YELLOW}08`,
                }}
              />
              {/* Premium gold glow ring - inner ring */}
              <div
                className="absolute -inset-2 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, ${GUINEA_YELLOW}50, ${GUINEA_YELLOW}10, ${GUINEA_YELLOW}50, ${GUINEA_YELLOW}10, ${GUINEA_YELLOW}50)`,
                  opacity: 0.6,
                }}
              />
              <div className="absolute -inset-1.5 rounded-full bg-[#0B2E58]" />
              {/* Gold ring border */}
              <div
                className="absolute -inset-1 rounded-full"
                style={{
                  border: `2px solid ${GUINEA_YELLOW}40`,
                  boxShadow: `inset 0 0 8px ${GUINEA_YELLOW}15`,
                }}
              />
              <img
                src="/images/coat-of-arms-official.svg"
                alt="Armories de la République de Guinée"
                className="w-28 h-28 relative z-10 drop-shadow-2xl object-contain"
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-3xl font-bold mb-2.5 text-gradient-gold tracking-tight">
              eAdministration Suite
            </h1>
            <div className="flex items-center justify-center gap-2">
              <img src="/images/flag-guinea.svg" alt="Drapeau de la Guinée" className="h-5 w-7 object-contain" />
              <p className="text-lg font-semibold tracking-widest uppercase" style={{ color: `${GUINEA_YELLOW}CC` }}>
                République de Guinée
              </p>
              <img src="/images/flag-guinea.svg" alt="Drapeau de la Guinée" className="h-5 w-7 object-contain" />
            </div>
          </motion.div>

          {/* Guinea motto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Premium tricolor divider */}
            <div className="flex items-center gap-3 justify-center">
              <div className="h-px flex-1 divider-premium" />
              <span className="text-[10px] font-semibold tracking-[0.2em] text-white/30 uppercase">Devise nationale</span>
              <div className="h-px flex-1 divider-premium" />
            </div>

            {/* Three pillars of the motto — glass cards */}
            <div className="flex items-center justify-center gap-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md"
                  style={{
                    backgroundColor: GUINEA_RED + '18',
                    border: `1px solid ${GUINEA_RED}30`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px ${GUINEA_RED}10`,
                  }}
                >
                  <span className="text-xl" style={{ color: GUINEA_YELLOW }}>⚙</span>
                </div>
                <span className="text-[11px] font-bold text-white/80 tracking-wide">Travail</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md"
                  style={{
                    backgroundColor: GUINEA_YELLOW + '18',
                    border: `1px solid ${GUINEA_YELLOW}30`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px ${GUINEA_YELLOW}10`,
                  }}
                >
                  <span className="text-xl" style={{ color: GUINEA_YELLOW }}>⚖</span>
                </div>
                <span className="text-[11px] font-bold text-white/80 tracking-wide">Justice</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md"
                  style={{
                    backgroundColor: GUINEA_GREEN + '18',
                    border: `1px solid ${GUINEA_GREEN}30`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px ${GUINEA_GREEN}10`,
                  }}
                >
                  <span className="text-xl" style={{ color: GUINEA_YELLOW }}>🤝</span>
                </div>
                <span className="text-[11px] font-bold text-white/80 tracking-wide">Solidarité</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-[13px] text-white/40 leading-relaxed tracking-wide font-light"
          >
            Plateforme GovTech de nouvelle génération pour la modernisation
            de l&apos;administration publique de la République de Guinée.
            Sécurisée, souveraine et accessible à tous les citoyens.
          </motion.p>

          {/* Sovereignty badge — glass effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex items-center justify-center gap-2"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(200,164,92,0.06)',
                border: '1px solid rgba(200,164,92,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <Shield className="h-3 w-3" style={{ color: `${GUINEA_YELLOW}80` }} />
              <span className="text-[10px] text-white/35 font-medium tracking-wide">
                Données hébergées en souveraineté nationale — Conformité Loi L/2016/018/AN
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — LOGIN FORM ═══ */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative overflow-y-auto"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(200,164,92,0.03) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 100%, rgba(11,46,88,0.02) 0%, transparent 50%),
            linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)
          `,
        }}
      >
        {/* Dark mode right panel */}
        <div className="absolute inset-0 hidden dark:block"
          style={{
            background: `
              radial-gradient(ellipse at 50% 0%, rgba(200,164,92,0.03) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 100%, rgba(59,125,216,0.04) 0%, transparent 50%),
              linear-gradient(180deg, #0a1628 0%, #0d1b30 100%)
            `,
          }}
        />

        {/* Guinea tricolor stripe for mobile (replaces left panel) */}
        <div className="lg:hidden absolute top-1.5 left-4 right-4 h-1 flex rounded-full overflow-hidden z-20"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
          <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
          <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-6 mt-8 flex flex-col items-center gap-3 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-lg opacity-25 animate-glow-pulse" style={{ backgroundColor: GUINEA_YELLOW }} />
            <div className="absolute -inset-1 rounded-full" style={{ border: `1.5px solid ${GUINEA_YELLOW}30` }} />
            <img src="/images/coat-of-arms-official.svg" alt="Armories de la République de Guinée" className="w-16 h-16 relative z-10 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gradient-navy">eAdministration Suite</h1>
            <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: GUINEA_GREEN }}>Guinée</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative z-10"
        >
          {/* Login Card — glass-premium */}
          <div className="glass-premium rounded-xl overflow-hidden">
            {/* Tricolor header strip */}
            <div className="flex h-1.5 overflow-hidden">
              <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
              <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
              <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-center space-y-1.5"
              >
                <h2 className="text-[#0B2E58] dark:text-white text-xl font-bold tracking-tight">Connexion</h2>
                <p className="text-sm text-gray-400 dark:text-white/40 font-medium">
                  Accédez à votre espace de travail
                </p>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error message */}
                <AnimatePresence mode="wait">
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center gap-2.5 p-3 rounded-lg"
                      style={{
                        backgroundColor: GUINEA_RED + '08',
                        border: `1px solid ${GUINEA_RED}20`,
                      }}
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
                        style={{ backgroundColor: GUINEA_RED + '12' }}>
                        <AlertCircle className="h-3.5 w-3.5" style={{ color: GUINEA_RED }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: GUINEA_RED }}>{loginError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email field */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2"
                >
                  <Label className="text-[#0B2E58] dark:text-white/70 text-xs font-semibold tracking-wide uppercase">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 dark:text-white/25" />
                    <Input
                      type="email"
                      placeholder="votre@email.gn"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10 glass-input focus-ring-premium h-11 text-[#0B2E58] dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/25 text-sm font-medium"
                      required
                    />
                  </div>
                </motion.div>

                {/* Password field */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2"
                >
                  <Label className="text-[#0B2E58] dark:text-white/70 text-xs font-semibold tracking-wide uppercase">
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 dark:text-white/25" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 pr-10 glass-input focus-ring-premium h-11 text-[#0B2E58] dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/25 text-sm font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      {showPassword
                        ? <EyeOff className="h-4 w-4 text-gray-300 dark:text-white/30 hover:text-gray-500 dark:hover:text-white/60 transition-colors" />
                        : <Eye className="h-4 w-4 text-gray-300 dark:text-white/30 hover:text-gray-500 dark:hover:text-white/60 transition-colors" />
                      }
                    </button>
                  </div>
                </motion.div>

                {/* Submit button — Guinea tricolor gradient (btn-guinea) */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Button
                    type="submit"
                    disabled={isSubmitting || !email.trim() || !password.trim()}
                    className="w-full h-11 font-bold text-sm tracking-wide transition-all duration-300 disabled:opacity-50"
                    style={{
                      background: (isSubmitting || !email.trim() || !password.trim())
                        ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                        : `linear-gradient(90deg, ${GUINEA_GREEN} 0%, ${GUINEA_GREEN} 30%, ${GUINEA_YELLOW} 30%, ${GUINEA_YELLOW} 36%, ${GUINEA_GREEN} 36%, ${GUINEA_GREEN} 64%, ${GUINEA_YELLOW} 64%, ${GUINEA_YELLOW} 70%, ${GUINEA_GREEN} 70%)`,
                      backgroundSize: (isSubmitting || !email.trim() || !password.trim()) ? '100%' : '200% 100%',
                      color: '#FFFFFF',
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      boxShadow: (!isSubmitting && email.trim() && password.trim())
                        ? `0 4px 16px ${GUINEA_GREEN}35, 0 0 24px ${GUINEA_GREEN}15`
                        : 'none',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <span className="flex items-center gap-2">
                        Se connecter
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Premium divider */}
              <div className="divider-premium" />

              {/* Register link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.5 }}
                className="text-center"
              >
                <button
                  onClick={() => navigate('register')}
                  className="text-sm text-gray-400 dark:text-white/35 hover:text-[#0B2E58] dark:hover:text-white/70 transition-colors duration-300 font-medium"
                >
                  Pas encore de compte ?{' '}
                  <span className="font-semibold" style={{ color: GUINEA_GREEN }}>Créer un compte citoyen</span>
                </button>
              </motion.div>
            </div>
          </div>

          {/* ═══ DEMO ACCOUNTS SECTION ═══ */}
          <motion.div
            variants={containerStagger}
            initial="hidden"
            animate="visible"
            className="mt-6 space-y-3"
          >
            <motion.div variants={itemSlideUp} className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ backgroundColor: `${GUINEA_YELLOW}10`, border: `1px solid ${GUINEA_YELLOW}20` }}>
                <Fingerprint className="h-3.5 w-3.5" style={{ color: GUINEA_YELLOW }} />
              </div>
              <h3 className="text-sm font-semibold text-[#0B2E58] dark:text-white tracking-tight">Comptes de démonstration</h3>
              <span className="text-[10px] text-gray-300 dark:text-white/20 font-medium">— Cliquez pour connexion rapide</span>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.map(([emailKey, account]) => {
                const RoleIcon = ROLE_ICONS[account.user.role]
                const roleLabel = ROLE_LABELS[account.user.role]
                const roleColor = ROLE_ICON_COLORS[account.user.role]

                // Guinea-themed role colors
                const guineaRoleBorder: Record<UserRole, string> = {
                  citizen: GUINEA_GREEN,
                  mairie: GUINEA_RED,
                  admin_general: '#0B2E58',
                  agence: GUINEA_YELLOW,
                  ministere: '#8B5CF6',
                  super_admin: '#C8A45C',
                }

                return (
                  <motion.button
                    key={emailKey}
                    variants={itemFadeScale}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleQuickLogin(emailKey)}
                    className="card-interactive flex items-center gap-2.5 p-3 rounded-xl text-left group"
                    style={{
                      borderLeftWidth: '3px',
                      borderLeftColor: guineaRoleBorder[account.user.role],
                    }}
                  >
                    <div
                      className={`flex size-9 items-center justify-center rounded-lg shrink-0 ${roleColor}`}
                      style={{
                        backgroundColor: guineaRoleBorder[account.user.role] + '10',
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05)`,
                      }}
                    >
                      <RoleIcon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-semibold text-[#0B2E58] dark:text-white truncate tracking-tight">{account.user.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide"
                          style={{
                            backgroundColor: guineaRoleBorder[account.user.role] + '12',
                            color: guineaRoleBorder[account.user.role],
                            border: `1px solid ${guineaRoleBorder[account.user.role]}18`,
                          }}
                        >
                          {roleLabel}
                        </span>
                        <span className="text-[9px] text-gray-300 dark:text-white/20 truncate font-medium">{emailKey}</span>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-gray-200 dark:text-white/15 group-hover:text-[#0B2E58] dark:group-hover:text-white/50 transition-colors duration-300 shrink-0" />
                  </motion.button>
                )
              })}
            </div>

            <motion.p variants={itemSlideUp} className="text-[10px] text-gray-300 dark:text-white/20 text-center pt-1 font-medium">
              Mot de passe : <span className="font-mono text-gray-400 dark:text-white/40">demo123</span> • Super Admin : <span className="font-mono text-gray-400 dark:text-white/40">admin2026</span>
            </motion.p>
          </motion.div>

          {/* Bottom tricolor for mobile */}
          <div className="lg:hidden mt-6 flex h-1 rounded-full overflow-hidden">
            <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
            <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
            <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
