'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Lock, Eye, EyeOff, Shield, Users, Building2, IdCard, Scale, Fingerprint, Crown, ArrowRight, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppStore, DEMO_ACCOUNTS, ROLE_LABELS, ROLE_COLORS, type UserRole } from '@/store/app-store'

// Guinea tricolor
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
    // Small delay for UX
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
      // Auto-submit after a small delay for visual feedback
      setTimeout(() => {
        login(demoEmail, account.password)
      }, 200)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white/10 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 translate-x-1/3 translate-y-1/3" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl relative z-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── LEFT: BRANDING & DEMO ACCOUNTS ─────────────────────────────── */}
          <div className="space-y-6">
            {/* Branding */}
            <div className="text-center lg:text-left">
              {/* Guinea tricolor bar */}
              <div className="flex gap-0 mb-6 rounded-lg overflow-hidden">
                <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_RED }} />
                <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_YELLOW }} />
                <div className="flex-1 h-2" style={{ backgroundColor: GUINEA_GREEN }} />
              </div>

              <div className="flex items-center gap-3 justify-center lg:justify-start mb-4">
                <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-lg flex items-center justify-center border border-white/20 shadow-xl">
                  <Sparkles className="h-7 w-7 text-[#C8A45C]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">eAdministration Suite</h1>
                  <p className="text-xs text-white/50">DataSphere Innovation — République de Guinée</p>
                </div>
              </div>
              <p className="text-sm text-white/60 max-w-md mx-auto lg:mx-0">
                La plateforme GovTech de nouvelle génération pour la modernisation de l&apos;administration publique guinéenne
              </p>
            </div>

            {/* Demo accounts section */}
            <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-[#C8A45C]" />
                  <CardTitle className="text-sm font-semibold text-white">Comptes de démonstration</CardTitle>
                </div>
                <CardDescription className="text-white/40 text-xs">
                  Cliquez sur un compte pour vous connecter automatiquement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(DEMO_ACCOUNTS).map(([emailKey, account]) => {
                  const RoleIcon = ROLE_ICONS[account.user.role]
                  const roleLabel = ROLE_LABELS[account.user.role]
                  const roleColor = ROLE_ICON_COLORS[account.user.role]

                  return (
                    <motion.button
                      key={emailKey}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleQuickLogin(emailKey)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all duration-200 text-left group"
                    >
                      <div className={`flex size-10 items-center justify-center rounded-xl bg-white/10 shrink-0 ${roleColor}`}>
                        <RoleIcon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-white truncate">{account.user.name}</p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${ROLE_COLORS[account.user.role]}`}>
                            {roleLabel}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 truncate">{emailKey}</p>
                        <p className="text-[10px] text-white/30 truncate">{account.user.institution}</p>
                      </div>
                      <ArrowRight className="size-4 text-white/20 group-hover:text-white/60 transition-colors shrink-0" />
                    </motion.button>
                  )
                })}

                <div className="pt-2 mt-2 border-t border-white/10">
                  <p className="text-[10px] text-white/30 text-center">
                    Mot de passe par défaut : <span className="text-white/50 font-mono">demo123</span> • Super Admin : <span className="text-white/50 font-mono">admin2026</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── RIGHT: LOGIN FORM ─────────────────────────────────────────── */}
          <div className="flex items-center">
            <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl w-full">
              <CardHeader className="text-center">
                {/* Guinea tricolor accent */}
                <div className="flex gap-0 mb-4 -mx-6 -mt-6 rounded-t-lg overflow-hidden">
                  <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_RED }} />
                  <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_YELLOW }} />
                  <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_GREEN }} />
                </div>
                <CardTitle className="text-white text-xl">Connexion</CardTitle>
                <CardDescription className="text-white/50">Accédez à votre espace de travail</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Error message */}
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-300">{loginError}</p>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        type="email"
                        placeholder="votre@email.gn"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-[#C8A45C]/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-[#C8A45C]/50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPassword
                          ? <EyeOff className="h-4 w-4 text-white/40 hover:text-white/60 transition-colors" />
                          : <Eye className="h-4 w-4 text-white/40 hover:text-white/60 transition-colors" />
                        }
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !email.trim() || !password.trim()}
                    className="w-full bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] font-semibold h-11"
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-4 w-4 border-2 border-[#0B2E58]/30 border-t-[#0B2E58] rounded-full"
                      />
                    ) : (
                      'Se connecter'
                    )}
                  </Button>
                </form>

                <Separator className="my-4 bg-white/10" />

                <div className="text-center space-y-2">
                  <button
                    onClick={() => navigate('register')}
                    className="text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    Pas encore de compte ? <span className="text-[#C8A45C] font-medium">Créer un compte citoyen</span>
                  </button>
                </div>

                {/* Sovereignty badge */}
                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-white/30">
                  <Shield className="h-3 w-3" />
                  <span>Données hébergées en souveraineté nationale — Conformité Loi L/2016/018/AN</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
