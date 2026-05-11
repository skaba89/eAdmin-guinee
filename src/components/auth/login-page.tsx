'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Shield, Users, Building2, IdCard, Scale, Fingerprint, Crown, ArrowRight, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAppStore, DEMO_ACCOUNTS, ROLE_LABELS, ROLE_COLORS, type UserRole } from '@/store/app-store'

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

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* ═══ FULL-WIDTH GUINEA TRICOLOR STRIPE AT TOP ═══ */}
      <div className="absolute top-0 left-0 right-0 h-2 z-50 flex">
        <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
        <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
        <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
      </div>

      {/* ═══ LEFT PANEL — GUINEA BRANDING ═══ */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col items-center justify-center p-12"
        style={{ background: 'linear-gradient(160deg, #0B2E58 0%, #134A8E 40%, #0B2E58 100%)' }}>

        {/* Decorative tricolor vertical stripes */}
        <div className="absolute left-0 top-0 bottom-0 w-2 flex flex-col">
          <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
          <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
          <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
        </div>

        {/* Subtle background pattern — Guinea map outline hint */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full" style={{ backgroundColor: GUINEA_RED }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full" style={{ backgroundColor: GUINEA_GREEN }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full" style={{ backgroundColor: GUINEA_YELLOW }} />
        </div>

        <div className="relative z-10 text-center space-y-8 max-w-md">
          {/* Guinea Shield Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Glow ring around logo */}
              <div className="absolute inset-0 rounded-full blur-xl opacity-30" style={{ backgroundColor: GUINEA_YELLOW }} />
              <img
                src="/logo.svg"
                alt="eAdministration Guinea"
                className="w-28 h-28 relative z-10 drop-shadow-2xl"
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-white mb-2">
              eAdministration Suite
            </h1>
            <p className="text-lg font-medium" style={{ color: GUINEA_YELLOW }}>
              Guinée
            </p>
          </motion.div>

          {/* Guinea motto */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="space-y-3"
          >
            {/* Tricolor divider */}
            <div className="flex items-center gap-3 justify-center">
              <div className="h-px flex-1" style={{ backgroundColor: GUINEA_RED, opacity: 0.4 }} />
              <span className="text-xs font-semibold tracking-widest text-white/40 uppercase">Devise nationale</span>
              <div className="h-px flex-1" style={{ backgroundColor: GUINEA_GREEN, opacity: 0.4 }} />
            </div>

            {/* Three pillars of the motto */}
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: GUINEA_RED + '20', border: `1px solid ${GUINEA_RED}40` }}>
                  <span className="text-lg" style={{ color: GUINEA_YELLOW }}>⚙</span>
                </div>
                <span className="text-xs font-bold text-white/80">Travail</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: GUINEA_YELLOW + '20', border: `1px solid ${GUINEA_YELLOW}40` }}>
                  <span className="text-lg" style={{ color: GUINEA_YELLOW }}>⚖</span>
                </div>
                <span className="text-xs font-bold text-white/80">Justice</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: GUINEA_GREEN + '20', border: `1px solid ${GUINEA_GREEN}40` }}>
                  <span className="text-lg" style={{ color: GUINEA_YELLOW }}>🤝</span>
                </div>
                <span className="text-xs font-bold text-white/80">Solidarité</span>
              </div>
            </div>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-sm text-white/50 leading-relaxed"
          >
            Plateforme GovTech de nouvelle génération pour la modernisation
            de l&apos;administration publique de la République de Guinée.
            Sécurisée, souveraine et accessible à tous les citoyens.
          </motion.p>

          {/* Sovereignty badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex items-center justify-center gap-2 text-[10px] text-white/30"
          >
            <Shield className="h-3 w-3" />
            <span>Données hébergées en souveraineté nationale — Conformité Loi L/2016/018/AN</span>
          </motion.div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — LOGIN FORM ═══ */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#0a1628] relative">
        {/* Guinea tricolor stripe for mobile (replaces left panel) */}
        <div className="lg:hidden absolute top-2 left-4 right-4 h-1.5 flex rounded-full overflow-hidden shadow-md">
          <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
          <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
          <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-6 mt-8 flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-lg opacity-20" style={{ backgroundColor: GUINEA_YELLOW }} />
            <img src="/logo.svg" alt="eAdministration Guinea" className="w-16 h-16 relative z-10" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#0B2E58] dark:text-white">eAdministration Suite</h1>
            <p className="text-sm font-medium" style={{ color: GUINEA_GREEN }}>Guinée</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Login Card */}
          <Card className="border-gray-200 dark:border-white/10 shadow-xl dark:bg-white/5 dark:backdrop-blur-xl">
            {/* Tricolor header strip */}
            <div className="flex h-1.5 rounded-t-lg overflow-hidden">
              <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
              <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
              <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
            </div>

            <CardHeader className="text-center pb-2">
              <CardTitle className="text-[#0B2E58] dark:text-white text-xl font-bold">Connexion</CardTitle>
              <CardDescription className="text-gray-500 dark:text-white/50">
                Accédez à votre espace de travail
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error message */}
                {loginError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg border"
                    style={{ backgroundColor: GUINEA_RED + '10', borderColor: GUINEA_RED + '30' }}
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" style={{ color: GUINEA_RED }} />
                    <p className="text-sm" style={{ color: GUINEA_RED }}>{loginError}</p>
                  </motion.div>
                )}

                {/* Email field */}
                <div className="space-y-2">
                  <Label className="text-[#0B2E58] dark:text-white/80 text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
                    <Input
                      type="email"
                      placeholder="votre@email.gn"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10 bg-gray-50 dark:bg-white/10 border-gray-200 dark:border-white/10 text-[#0B2E58] dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:border-[#C8A45C]/50 focus:ring-[#C8A45C]/20"
                      required
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <Label className="text-[#0B2E58] dark:text-white/80 text-sm font-medium">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-gray-50 dark:bg-white/10 border-gray-200 dark:border-white/10 text-[#0B2E58] dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:border-[#C8A45C]/50 focus:ring-[#C8A45C]/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword
                        ? <EyeOff className="h-4 w-4 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors" />
                        : <Eye className="h-4 w-4 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors" />
                      }
                    </button>
                  </div>
                </div>

                {/* Submit button — Guinea Green with gold text */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !email.trim() || !password.trim()}
                  className="w-full font-semibold h-11 text-white shadow-lg transition-all duration-200"
                  style={{
                    background: isSubmitting || !email.trim() || !password.trim()
                      ? '#6b7280'
                      : `linear-gradient(135deg, ${GUINEA_GREEN}, ${GUINEA_GREEN}dd)`,
                    boxShadow: (!isSubmitting && email.trim() && password.trim())
                      ? `0 4px 14px ${GUINEA_GREEN}40`
                      : 'none'
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
              </form>

              <Separator className="bg-gray-200 dark:bg-white/10" />

              {/* Register link */}
              <div className="text-center">
                <button
                  onClick={() => navigate('register')}
                  className="text-sm text-gray-500 dark:text-white/50 hover:text-[#0B2E58] dark:hover:text-white/80 transition-colors"
                >
                  Pas encore de compte ?{' '}
                  <span className="font-medium" style={{ color: GUINEA_GREEN }}>Créer un compte citoyen</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* ═══ DEMO ACCOUNTS SECTION ═══ */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4" style={{ color: GUINEA_YELLOW }} />
              <h3 className="text-sm font-semibold text-[#0B2E58] dark:text-white">Comptes de démonstration</h3>
              <span className="text-[10px] text-gray-400 dark:text-white/30">— Cliquez pour connexion rapide</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(DEMO_ACCOUNTS).map(([emailKey, account]) => {
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
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuickLogin(emailKey)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:shadow-md transition-all duration-200 text-left group"
                    style={{ borderLeftWidth: '3px', borderLeftColor: guineaRoleBorder[account.user.role] }}
                  >
                    <div className={`flex size-9 items-center justify-center rounded-lg bg-gray-50 dark:bg-white/10 shrink-0 ${roleColor}`}>
                      <RoleIcon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-semibold text-[#0B2E58] dark:text-white truncate">{account.user.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold"
                          style={{ backgroundColor: guineaRoleBorder[account.user.role] + '15', color: guineaRoleBorder[account.user.role] }}>
                          {roleLabel}
                        </span>
                        <span className="text-[9px] text-gray-400 dark:text-white/30 truncate">{emailKey}</span>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-gray-300 dark:text-white/20 group-hover:text-[#0B2E58] dark:group-hover:text-white/60 transition-colors shrink-0" />
                  </motion.button>
                )
              })}
            </div>

            <p className="text-[10px] text-gray-400 dark:text-white/30 text-center pt-1">
              Mot de passe : <span className="font-mono text-gray-500 dark:text-white/50">demo123</span> • Super Admin : <span className="font-mono text-gray-500 dark:text-white/50">admin2026</span>
            </p>
          </div>

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
