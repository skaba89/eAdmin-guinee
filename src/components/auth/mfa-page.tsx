'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, Loader2, ArrowLeft, RefreshCw, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { useSessionStore } from '@/store/session-store'
import { toast } from 'sonner'

// ─── Guinea tricolor bar ────────────────────────────────────────────────────
function GuineaTricolor({ className }: { className?: string }) {
  return (
    <div className={`flex ${className || ''}`}>
      <div className="flex-1 bg-[#CE1126]" />
      <div className="flex-1 bg-[#FCD116]" />
      <div className="flex-1 bg-[#009460]" />
    </div>
  )
}

const MFA_TIMEOUT_SECONDS = 5 * 60 // 5 minutes

export function MfaPage() {
  const { user, logout, navigate } = useAppStore()
  const sessionStore = useSessionStore()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(MFA_TIMEOUT_SECONDS)
  const [codeSent, setCodeSent] = useState(true)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derived state: resend is available when time runs out
  const resendAvailable = timeLeft <= 0

  // Countdown timer — only uses setInterval callback for setTimeLeft
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleInputChange = (index: number, value: string) => {
    // Only accept digits
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError('')

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newCode.every(d => d !== '')) {
      handleVerify(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      const newCode = [...code]
      newCode[index - 1] = ''
      setCode(newCode)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode)
      inputRefs.current[5]?.focus()
      handleVerify(pastedData)
    } else if (pastedData.length > 0) {
      const newCode = [...code]
      for (let i = 0; i < pastedData.length; i++) {
        newCode[i] = pastedData[i]
      }
      setCode(newCode)
      const nextIndex = Math.min(pastedData.length, 5)
      inputRefs.current[nextIndex]?.focus()
    }
  }

  const handleVerify = useCallback(async (codeStr?: string) => {
    const fullCode = codeStr || code.join('')

    if (fullCode.length !== 6) {
      setError('Veuillez entrer les 6 chiffres du code')
      return
    }

    setIsLoading(true)
    setError('')

    // Small delay for UX feel
    await new Promise(r => setTimeout(r, 800))

    const success = sessionStore.verifyMFA(fullCode)
    setIsLoading(false)

    if (success) {
      toast.success('Vérification réussie', {
        description: 'Authentification multi-facteurs confirmée',
      })

      // Navigate to the default page based on role
      const ROLE_DEFAULT_PAGE: Record<string, string> = {
        citoyen: 'citizen-portal',
        mairie: 'service-requests',
        admin: 'admin',
        agence: 'service-requests',
        ministere: 'dashboard',
        superadmin: 'dashboard',
      }
      const defaultPage = (user?.role && ROLE_DEFAULT_PAGE[user.role]) || 'dashboard'
      navigate(defaultPage as any)
    } else {
      setError('Code invalide. Veuillez réessayer.')
      toast.error('Code invalide', {
        description: 'Le code saisi n\'est pas valide',
      })
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }, [code, sessionStore, user, navigate])

  const handleResend = () => {
    setTimeLeft(MFA_TIMEOUT_SECONDS)
    setCodeSent(true)
    setCode(['', '', '', '', '', ''])
    setError('')
    inputRefs.current[0]?.focus()
    // Restart the timer
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    toast.success('Code renvoyé', {
      description: 'Un nouveau code a été envoyé',
    })
  }

  const handleLogout = () => {
    logout()
    navigate('login')
  }

  // Masked email for display
  const maskedEmail = user?.email
    ? user.email.replace(/^(.{1})(.*)(@.*)$/, (_, first, middle, domain) =>
        `${first}${'*'.repeat(Math.min(middle.length, 5))}${domain}`
      )
    : 'n***@gov.gn'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#0d3a6e] to-[#0B2E58] p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-white/10 bg-white/[0.08] backdrop-blur-xl overflow-hidden shadow-2xl">
          <GuineaTricolor className="h-1.5" />

          <CardHeader className="text-center pt-6 pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-[#C8A45C] to-[#E0C98A] flex items-center justify-center shadow-xl shadow-[#C8A45C]/20"
            >
              <Shield className="h-8 w-8 text-[#0B2E58]" />
            </motion.div>

            <CardTitle className="text-xl text-white font-bold">
              Vérification en deux étapes
            </CardTitle>
            <CardDescription className="text-white/50 mt-1">
              Authentification multi-facteurs requise
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2 pb-6 space-y-5">
            {/* Simulated code sent message */}
            <AnimatePresence>
              {codeSent && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[#009460]/15 border border-[#009460]/20"
                >
                  <Lock className="h-4 w-4 text-[#009460] shrink-0" />
                  <p className="text-sm text-[#009460]/80">
                    Code envoyé à <span className="font-medium">{maskedEmail}</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User info */}
            <div className="text-center">
              <p className="text-sm text-white/40">
                Connecté en tant que <span className="text-white/70 font-medium">{user?.name}</span>
              </p>
              <p className="text-xs text-white/25 mt-0.5">
                {user?.role} — {user?.institution}
              </p>
            </div>

            {/* Code input */}
            <div className="space-y-2">
              <p className="text-sm text-white/60 text-center">
                Entrez le code à 6 chiffres
              </p>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="h-14 w-12 rounded-xl bg-white/[0.08] border border-white/[0.12] text-center text-xl font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-[#C8A45C]/50 focus:ring-1 focus:ring-[#C8A45C]/30 transition-all duration-200 input-premium"
                    placeholder="·"
                  />
                ))}
              </div>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[#CE1126]/15 border border-[#CE1126]/20"
                >
                  <Lock className="h-4 w-4 text-[#CE1126] shrink-0" />
                  <p className="text-sm text-[#CE1126]/80">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer and resend */}
            <div className="text-center space-y-2">
              {!resendAvailable ? (
                <p className="text-sm text-white/30">
                  Code expire dans <span className="text-[#FCD116] font-mono font-medium">{formatTime(timeLeft)}</span>
                </p>
              ) : (
                <p className="text-sm text-[#CE1126]/70">
                  Code expiré
                </p>
              )}

              <button
                onClick={handleResend}
                disabled={!resendAvailable}
                className="inline-flex items-center gap-1.5 text-sm text-[#C8A45C] hover:text-[#E0C98A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Renvoyer le code
              </button>
            </div>

            {/* Verify button */}
            <Button
              onClick={() => handleVerify()}
              disabled={isLoading || code.some(d => d === '')}
              className="w-full btn-gold rounded-xl h-12 text-sm font-semibold"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vérification...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Vérifier
                </span>
              )}
            </Button>

            {/* Demo hint */}
            <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <p className="text-[10px] text-white/25 text-center">
                💡 Démo : tout code à 6 chiffres est accepté, sauf 000000
              </p>
            </div>

            {/* Logout link */}
            <div className="text-center pt-1">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-[#CE1126] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Se déconnecter
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom branding */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-[#C8A45C] to-[#E0C98A] flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-[#0B2E58]" />
            </div>
            <span className="text-sm font-semibold text-white/30">eAdmin Suite</span>
          </div>
          <div className="flex justify-center gap-1.5">
            <span className="w-6 h-0.5 bg-[#CE1126]/30 rounded-full" />
            <span className="w-6 h-0.5 bg-[#FCD116]/30 rounded-full" />
            <span className="w-6 h-0.5 bg-[#009460]/30 rounded-full" />
          </div>
          <p className="text-[10px] text-white/10 mt-2">
            République de Guinée — Sécurité & Souveraineté numérique
          </p>
        </div>
      </motion.div>
    </div>
  )
}
