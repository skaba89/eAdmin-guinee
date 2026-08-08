'use client'

import { FormEvent, useState } from 'react'
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store/app-store'

const GUINEA_RED = '#CE1126'
const GUINEA_YELLOW = '#FCD116'
const GUINEA_GREEN = '#009460'

export function LoginPage() {
  const { login, navigate, loginError } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password) return

    setIsSubmitting(true)
    try {
      await login(email, password)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-[#071E3A] lg:grid lg:grid-cols-[46%_54%]">
      <div className="absolute top-0 left-0 right-0 h-1.5 z-50 flex">
        <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
        <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
        <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
      </div>

      <section
        className="hidden lg:flex relative items-center justify-center overflow-hidden px-12"
        style={{
          background: `
            radial-gradient(ellipse at 15% 15%, rgba(59,125,216,0.42) 0%, transparent 52%),
            radial-gradient(ellipse at 85% 20%, rgba(200,164,92,0.24) 0%, transparent 48%),
            radial-gradient(ellipse at 50% 85%, rgba(0,148,96,0.18) 0%, transparent 50%),
            linear-gradient(160deg, #071E3A 0%, #0B2E58 42%, #143D6B 72%, #0B2E58 100%)
          `,
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
          style={{ backgroundImage: "url('/guinea-hero-conakry.png')" }}
        />
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(252,209,22,0.9) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-lg text-center text-white"
        >
          <div className="mx-auto mb-8 relative w-fit">
            <div className="absolute -inset-5 rounded-full bg-[#FCD116]/10 blur-xl" />
            <div className="absolute -inset-2 rounded-full border border-[#FCD116]/30" />
            <img
              src="/logo-256.png"
              alt="République de Guinée"
              className="relative z-10 h-28 w-28 object-contain drop-shadow-2xl"
            />
          </div>

          <h1 className="text-4xl font-bold tracking-tight">eAdmin Guinée</h1>
          <p className="mt-3 text-sm uppercase tracking-[0.28em] text-[#FCD116]/90 font-semibold">
            République de Guinée
          </p>

          <div className="mx-auto my-8 h-px max-w-xs bg-gradient-to-r from-transparent via-[#FCD116]/50 to-transparent" />

          <p className="text-lg font-medium text-white/90">Travail · Justice · Solidarité</p>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-white/55">
            Accès sécurisé à la plateforme nationale de modernisation administrative,
            de gestion documentaire et de services numériques aux citoyens.
          </p>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/55 backdrop-blur-md">
            <Shield className="h-4 w-4 text-[#FCD116]" aria-hidden="true" />
            Authentification centralisée · MFA · Journalisation de sécurité
          </div>
        </motion.div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 sm:px-8 lg:min-h-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(200,164,92,0.06),transparent_42%),radial-gradient(circle_at_90%_100%,rgba(11,46,88,0.05),transparent_45%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(200,164,92,0.05),transparent_42%),radial-gradient(circle_at_90%_100%,rgba(59,125,216,0.08),transparent_45%)]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="lg:hidden mb-8 text-center">
            <img src="/logo-128.png" alt="République de Guinée" className="mx-auto h-20 w-20 object-contain" />
            <h1 className="mt-3 text-2xl font-bold text-[#0B2E58] dark:text-white">eAdmin Guinée</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-[#009460] font-semibold">République de Guinée</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_28px_80px_rgba(11,46,88,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0B1F38]/95">
            <div className="flex h-1.5">
              <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
              <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
              <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
            </div>

            <div className="p-6 sm:p-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B2E58] shadow-lg">
                  <Lock className="h-5 w-5 text-[#FCD116]" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[#0B2E58] dark:text-white">Connexion sécurisée</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/45">
                  Utilisez le compte qui vous a été attribué par votre administration.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <AnimatePresence mode="wait">
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      role="alert"
                      className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{loginError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wide text-[#0B2E58] dark:text-white/75">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="username"
                      placeholder="prenom.nom@institution.gn"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11 pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wide text-[#0B2E58] dark:text-white/75">
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11 pl-10 pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !email.trim() || !password}
                  className="h-11 w-full bg-[#009460] font-semibold text-white hover:bg-[#007d51]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Vérification…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Se connecter
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="my-6 h-px bg-slate-200 dark:bg-white/10" />

              <div className="space-y-3 text-center">
                <button
                  type="button"
                  onClick={() => navigate('register')}
                  className="text-sm text-slate-500 transition hover:text-[#0B2E58] dark:text-white/45 dark:hover:text-white"
                >
                  Vous êtes citoyen ? <span className="font-semibold text-[#009460]">Créer un compte</span>
                </button>
                <p className="text-[11px] leading-5 text-slate-400 dark:text-white/30">
                  Les comptes agents, directions et administrateurs sont créés uniquement par une autorité habilitée.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-slate-400 dark:text-white/25">
            Aucun identifiant ou mot de passe de démonstration n’est intégré au navigateur.
          </p>
        </motion.div>
      </section>
    </div>
  )
}
