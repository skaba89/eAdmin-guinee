'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, Loader2, ArrowLeft, RefreshCw, LogOut, Key, AlertTriangle, Copy, Check, Smartphone, QrCode } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { useSessionStore } from '@/store/session-store'
import { toast } from 'sonner'
import {
  generateTOTPSecret,
  generateTOTPQRCodeURI,
  generateBackupCodes,
  verifyTOTPSync,
  ClientRateLimiter,
  detectSuspiciousActivity,
} from '@/lib/security'

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

// Rate limiter instance — 5 attempts, then 15-min lockout
const mfaRateLimiter = new ClientRateLimiter(5, 15 * 60 * 1000)

// MFA Setup Phase
type MFASetupPhase = 'idle' | 'setup' | 'verify-setup' | 'backup-codes' | 'verify'

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

  // MFA Setup state
  const [phase, setPhase] = useState<MFASetupPhase>('verify')
  const [totpSecret, setTotpSecret] = useState<string>('')
  const [qrCodeURI, setQrCodeURI] = useState<string>('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [setupCode, setSetupCode] = useState(['', '', '', '', '', ''])
  const setupInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [backupCodesRevealed, setBackupCodesRevealed] = useState(false)
  const resendAvailable = timeLeft === 0

  // Suspicious activity state
  const [suspiciousWarning, setSuspiciousWarning] = useState<string | null>(null)

  // Check for suspicious activity on mount
  useEffect(() => {
    const currentSession = sessionStore.getCurrentSession()
    if (currentSession) {
      const userSessions = sessionStore.sessions.filter(
        s => s.userId === currentSession.userId && s.isActive
      )
      const previousIPs = userSessions
        .filter(s => s.id !== currentSession.id)
        .map(s => s.ipAddress)

      const activity = detectSuspiciousActivity({
        ipAddress: currentSession.ipAddress,
        userAgent: currentSession.userAgent,
        loginTime: currentSession.loginAt,
        previousIPs,
      })

      if (activity.isSuspicious) {
        setSuspiciousWarning(
          `Activité suspecte détectée : ${activity.reasons.join(', ')} (score: ${activity.riskScore}/100)`
        )
      }
    }
  }, [sessionStore])

  // Countdown timer
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

  // Auto-focus first input on mount or phase change
  useEffect(() => {
    if (phase === 'verify') {
      inputRefs.current[0]?.focus()
    } else if (phase === 'verify-setup') {
      setupInputRefs.current[0]?.focus()
    }
  }, [phase])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleInputChange = (index: number, value: string, isSetup: boolean = false) => {
    if (value && !/^\d$/.test(value)) return

    const currentCode = isSetup ? setupCode : code
    const newCode = [...currentCode]
    newCode[index] = value

    if (isSetup) {
      setSetupCode(newCode)
    } else {
      setCode(newCode)
    }
    setError('')

    const refs = isSetup ? setupInputRefs : inputRefs

    // Move to next input
    if (value && index < 5) {
      refs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newCode.every(d => d !== '')) {
      if (isSetup) {
        handleVerifySetup(newCode.join(''))
      } else {
        handleVerify(newCode.join(''))
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, isSetup: boolean = false) => {
    const currentCode = isSetup ? setupCode : code
    const refs = isSetup ? setupInputRefs : inputRefs
    const setCodeFn = isSetup ? setSetupCode : setCode

    if (e.key === 'Backspace' && !currentCode[index] && index > 0) {
      refs.current[index - 1]?.focus()
      const newCode = [...currentCode]
      newCode[index - 1] = ''
      setCodeFn(newCode)
    }
  }

  const handlePaste = (e: React.ClipboardEvent, isSetup: boolean = false) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const refs = isSetup ? setupInputRefs : inputRefs
    const setCodeFn = isSetup ? setSetupCode : setCode

    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCodeFn(newCode)
      refs.current[5]?.focus()
      if (isSetup) {
        handleVerifySetup(pastedData)
      } else {
        handleVerify(pastedData)
      }
    } else if (pastedData.length > 0) {
      const currentCode = isSetup ? setupCode : code
      const newCode = [...currentCode]
      for (let i = 0; i < pastedData.length; i++) {
        newCode[i] = pastedData[i]
      }
      setCodeFn(newCode)
      const nextIndex = Math.min(pastedData.length, 5)
      refs.current[nextIndex]?.focus()
    }
  }

  // ─── MFA Setup Handlers ────────────────────────────────────────────────────

  const handleStartSetup = () => {
    const secret = generateTOTPSecret()
    const uri = generateTOTPQRCodeURI(secret.replace(/\s+/g, ''), user?.email || 'user@eadmin.gn')
    const codes = generateBackupCodes(10)

    setTotpSecret(secret)
    setQrCodeURI(uri)
    setBackupCodes(codes)
    setPhase('setup')
    setSetupCode(['', '', '', '', '', ''])
  }

  const handleVerifySetup = useCallback(async (codeStr?: string) => {
    const fullCode = codeStr || setupCode.join('')

    if (fullCode.length !== 6) {
      setError('Veuillez entrer les 6 chiffres du code')
      return
    }

    setIsLoading(true)
    setError('')

    // Small delay for UX
    await new Promise(r => setTimeout(r, 500))

    // Verify the TOTP code against the generated secret
    const isValid = verifyTOTPSync(totpSecret.replace(/\s+/g, ''), fullCode)

    setIsLoading(false)

    if (isValid) {
      toast.success('MFA configuré avec succès', {
        description: 'Votre authentification multi-facteurs est active',
      })

      // Store the MFA secret and backup codes in session
      sessionStore.setMfaEnabled(user?.email || '', true)
      sessionStore.setMfaSecret(user?.email || '', totpSecret)
      sessionStore.setBackupCodes(user?.email || '', backupCodes)

      setPhase('backup-codes')
    } else {
      // For demo: also accept any 6-digit code except 000000 during setup
      if (fullCode !== '000000' && /^\d{6}$/.test(fullCode)) {
        toast.success('MFA configuré avec succès (mode démo)', {
          description: 'Votre authentification multi-facteurs est active',
        })
        sessionStore.setMfaEnabled(user?.email || '', true)
        sessionStore.setMfaSecret(user?.email || '', totpSecret)
        sessionStore.setBackupCodes(user?.email || '', backupCodes)
        setPhase('backup-codes')
      } else {
        setError('Code invalide. Vérifiez que votre application affiche le bon code.')
        toast.error('Code invalide', {
          description: 'Le code saisi ne correspond pas',
        })
        setSetupCode(['', '', '', '', '', ''])
        setupInputRefs.current[0]?.focus()
      }
    }
  }, [setupCode, totpSecret, backupCodes, user, sessionStore])

  const handleBackupCodesContinue = () => {
    setPhase('verify')
    setCode(['', '', '', '', '', ''])
    setBackupCodesRevealed(false)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(id)
      toast.success('Copié dans le presse-papier')
      setTimeout(() => setCopiedCode(null), 2000)
    })
  }

  // ─── MFA Verification Handler ──────────────────────────────────────────────

  const handleVerify = useCallback(async (codeStr?: string) => {
    const fullCode = codeStr || code.join('')

    if (fullCode.length !== 6) {
      setError('Veuillez entrer les 6 chiffres du code')
      return
    }

    // Check rate limiting
    const rateLimitKey = `mfa-${user?.email || 'unknown'}`
    if (mfaRateLimiter.isLimited(rateLimitKey)) {
      const lockoutEnd = mfaRateLimiter.getLockoutEndTime(rateLimitKey)
      const remainingMinutes = lockoutEnd
        ? Math.ceil((lockoutEnd.getTime() - Date.now()) / 60000)
        : 15
      setError(`Compte temporairement verrouillé. Réessayez dans ${remainingMinutes} minutes.`)
      toast.error('Trop de tentatives', {
        description: `Compte verrouillé pour ${remainingMinutes} minutes`,
      })
      return
    }

    setIsLoading(true)
    setError('')

    await new Promise(r => setTimeout(r, 800))

    // Check backup codes first
    const storedBackupCodes = sessionStore.backupCodes?.[user?.email || ''] || []
    const isBackupCode = storedBackupCodes.includes(fullCode.toUpperCase())

    if (isBackupCode) {
      // Remove used backup code
      sessionStore.useBackupCode(user?.email || '', fullCode.toUpperCase())
      mfaRateLimiter.reset(rateLimitKey)
    } else {
      // Try TOTP verification
      const mfaSecret = sessionStore.mfaSecrets?.[user?.email || '']
      let isValid = false

      if (mfaSecret) {
        isValid = verifyTOTPSync(mfaSecret, fullCode)
      }

      // Demo fallback: any 6-digit code except 000000
      if (!isValid && fullCode !== '000000' && /^\d{6}$/.test(fullCode)) {
        isValid = true
      }

      if (!isValid) {
        mfaRateLimiter.recordAttempt(rateLimitKey)
        const remaining = mfaRateLimiter.getRemainingAttempts(rateLimitKey)

        setIsLoading(false)
        setError(`Code invalide. ${remaining} tentative(s) restante(s).`)
        toast.error('Code invalide', {
          description: remaining > 0
            ? `${remaining} tentative(s) restante(s) avant verrouillage`
            : 'Compte verrouillé pour 15 minutes',
        })
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }
    }

    // Success
    mfaRateLimiter.reset(rateLimitKey)
    const success = sessionStore.verifyMFA(fullCode)
    setIsLoading(false)

    if (success) {
      toast.success('Vérification réussie', {
        description: 'Authentification multi-facteurs confirmée',
      })

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
    }
  }, [code, sessionStore, user, navigate])

  const handleResend = () => {
    setTimeLeft(MFA_TIMEOUT_SECONDS)
    setCodeSent(true)
    setCode(['', '', '', '', '', ''])
    setError('')
    inputRefs.current[0]?.focus()
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

  // Rate limit info
  const rateLimitKey = `mfa-${user?.email || 'unknown'}`
  const remainingAttempts = mfaRateLimiter.getRemainingAttempts(rateLimitKey)
  const isLocked = mfaRateLimiter.isLimited(rateLimitKey)

  // ─── Render: Setup Phase ───────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#0d3a6e] to-[#0B2E58] p-4">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-lg"
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
                <QrCode className="h-8 w-8 text-[#0B2E58]" />
              </motion.div>

              <CardTitle className="text-xl text-white font-bold">
                Configuration MFA
              </CardTitle>
              <CardDescription className="text-white/50 mt-1">
                Scannez le QR code avec votre application d&apos;authentification
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-2 pb-6 space-y-5">
              {/* QR Code display */}
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                  <div className="w-48 h-48 flex items-center justify-center">
                    {/* Simple SVG QR code representation */}
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      <rect width="200" height="200" fill="white" />
                      {/* QR code pattern - simplified visual representation */}
                      {generateQRPattern(totpSecret)}
                      <text x="100" y="110" textAnchor="middle" className="text-[6px] fill-gray-800 font-mono">
                        eAdmin Guinée
                      </text>
                    </svg>
                  </div>
                </div>

                {/* Manual secret key entry */}
                <div className="w-full space-y-2">
                  <p className="text-xs text-white/40 text-center">
                    Ou entrez la clé manuellement :
                  </p>
                  <div className="flex items-center gap-2 bg-white/[0.06] rounded-lg p-3 border border-white/[0.08]">
                    <code className="flex-1 text-sm text-[#C8A45C] font-mono break-all">
                      {totpSecret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(totpSecret.replace(/\s+/g, ''), 'secret')}
                      className="shrink-0 p-1.5 hover:bg-white/[0.1] rounded transition-colors"
                    >
                      {copiedCode === 'secret' ? (
                        <Check className="h-4 w-4 text-[#009460]" />
                      ) : (
                        <Copy className="h-4 w-4 text-white/40" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Verify setup code */}
              <div className="space-y-3">
                <p className="text-sm text-white/60 text-center">
                  Entrez le code à 6 chiffres affiché par votre application
                </p>
                <div className="flex justify-center gap-2" onPaste={(e) => handlePaste(e, true)}>
                  {setupCode.map((digit, index) => (
                    <input
                      key={`setup-${index}`}
                      ref={(el) => { setupInputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value, true)}
                      onKeyDown={(e) => handleKeyDown(index, e, true)}
                      className="h-14 w-12 rounded-xl bg-white/[0.08] border border-white/[0.12] text-center text-xl font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-[#C8A45C]/50 focus:ring-1 focus:ring-[#C8A45C]/30 transition-all duration-200"
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

              {/* Verify button */}
              <Button
                onClick={() => handleVerifySetup()}
                disabled={isLoading || setupCode.some(d => d === '')}
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
                    Vérifier et activer
                  </span>
                )}
              </Button>

              {/* Demo hint */}
              <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <p className="text-[10px] text-white/25 text-center">
                  Démo : tout code à 6 chiffres est accepté pour la configuration, sauf 000000
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ─── Render: Backup Codes Phase ────────────────────────────────────────────
  if (phase === 'backup-codes') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#0d3a6e] to-[#0B2E58] p-4">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-lg"
        >
          <Card className="border-white/10 bg-white/[0.08] backdrop-blur-xl overflow-hidden shadow-2xl">
            <GuineaTricolor className="h-1.5" />

            <CardHeader className="text-center pt-6 pb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-[#009460] to-[#00C07F] flex items-center justify-center shadow-xl shadow-[#009460]/20"
              >
                <Key className="h-8 w-8 text-white" />
              </motion.div>

              <CardTitle className="text-xl text-white font-bold">
                Codes de secours
              </CardTitle>
              <CardDescription className="text-white/50 mt-1">
                Conservez ces codes en lieu sûr — ils ne seront plus affichés
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-2 pb-6 space-y-5">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FCD116]/10 border border-[#FCD116]/20">
                <AlertTriangle className="h-4 w-4 text-[#FCD116] shrink-0" />
                <p className="text-xs text-[#FCD116]/80">
                  Chaque code ne peut être utilisé qu&apos;une seule fois. Enregistrez-les dans un endroit sécurisé.
                </p>
              </div>

              {/* Backup codes grid */}
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((bc, idx) => (
                  <button
                    key={idx}
                    onClick={() => copyToClipboard(bc, `bc-${idx}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors group"
                  >
                    <span className="font-mono text-sm text-white/70 group-hover:text-white">
                      {backupCodesRevealed ? bc : '••••••••'}
                    </span>
                    {copiedCode === `bc-${idx}` ? (
                      <Check className="h-3.5 w-3.5 text-[#009460] shrink-0" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-white/20 group-hover:text-white/50 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Toggle reveal / copy all */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setBackupCodesRevealed(!backupCodesRevealed)}
                  className="flex-1 border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.06] rounded-xl"
                >
                  {backupCodesRevealed ? 'Masquer' : 'Révéler'} les codes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(backupCodes.join('\n'), 'all-codes')}
                  className="flex-1 border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.06] rounded-xl"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier tout
                </Button>
              </div>

              {/* Continue button */}
              <Button
                onClick={handleBackupCodesContinue}
                className="w-full btn-gold rounded-xl h-12 text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  J&apos;ai enregistré mes codes — Continuer
                </span>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ─── Render: Verification Phase (default) ──────────────────────────────────
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
            {/* Suspicious activity warning */}
            <AnimatePresence>
              {suspiciousWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-[#FCD116]/15 border border-[#FCD116]/20"
                >
                  <AlertTriangle className="h-4 w-4 text-[#FCD116] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[#FCD116]/80 font-medium">Activité suspecte</p>
                    <p className="text-xs text-[#FCD116]/60 mt-0.5">{suspiciousWarning}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simulated code sent message */}
            <AnimatePresence>
              {codeSent && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[#009460]/15 border border-[#009460]/20"
                >
                  <Smartphone className="h-4 w-4 text-[#009460] shrink-0" />
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

            {/* Rate limit warning */}
            {remainingAttempts <= 2 && remainingAttempts > 0 && !isLocked && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#FCD116]/10 border border-[#FCD116]/15">
                <AlertTriangle className="h-3.5 w-3.5 text-[#FCD116] shrink-0" />
                <p className="text-xs text-[#FCD116]/70">
                  Attention : {remainingAttempts} tentative(s) restante(s) avant verrouillage
                </p>
              </div>
            )}

            {isLocked && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#CE1126]/15 border border-[#CE1126]/20">
                <Lock className="h-4 w-4 text-[#CE1126] shrink-0" />
                <p className="text-sm text-[#CE1126]/80">
                  Compte verrouillé — trop de tentatives échouées. Réessayez dans 15 minutes.
                </p>
              </div>
            )}

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
                    disabled={isLocked}
                    className="h-14 w-12 rounded-xl bg-white/[0.08] border border-white/[0.12] text-center text-xl font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-[#C8A45C]/50 focus:ring-1 focus:ring-[#C8A45C]/30 transition-all duration-200 input-premium disabled:opacity-30"
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
              disabled={isLoading || code.some(d => d === '') || isLocked}
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

            {/* MFA Setup link */}
            {!sessionStore.mfaEnabledForUser?.[user?.email || ''] && (
              <div className="text-center">
                <button
                  onClick={handleStartSetup}
                  className="inline-flex items-center gap-1.5 text-sm text-[#C8A45C] hover:text-[#E0C98A] transition-colors"
                >
                  <Key className="h-3.5 w-3.5" />
                  Configurer l&apos;authentification TOTP
                </button>
              </div>
            )}

            {/* Demo hint */}
            <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <p className="text-[10px] text-white/25 text-center">
                Démo : tout code à 6 chiffres est accepté, sauf 000000. 5 tentatives max avant verrouillage 15 min.
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
            <span className="text-sm font-semibold text-white/30">eAdmin Guinée</span>
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

// ─── Helper: Generate a pseudo-QR pattern for SVG display ────────────────────
function generateQRPattern(seed: string): React.ReactNode {
  // Create a deterministic pattern based on the secret string
  const elements: React.ReactNode[] = []
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }

  const size = 200
  const moduleSize = 8
  const modules = Math.floor(size / moduleSize)

  // Corner markers (like real QR codes)
  const drawMarker = (x: number, y: number) => {
    elements.push(
      <rect key={`m-${x}-${y}`} x={x * moduleSize} y={y * moduleSize} width={7 * moduleSize} height={7 * moduleSize} fill="#0B2E58" rx="2" />,
      <rect key={`mi-${x}-${y}`} x={(x + 1) * moduleSize} y={(y + 1) * moduleSize} width={5 * moduleSize} height={5 * moduleSize} fill="white" rx="1" />,
      <rect key={`mc-${x}-${y}`} x={(x + 2) * moduleSize} y={(y + 2) * moduleSize} width={3 * moduleSize} height={3 * moduleSize} fill="#0B2E58" rx="1" />
    )
  }

  // Three corner markers
  drawMarker(0, 0)
  drawMarker(modules - 7, 0)
  drawMarker(0, modules - 7)

  // Data modules (pseudo-random based on seed)
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Skip marker areas
      if ((row < 8 && col < 8) || (row < 8 && col >= modules - 8) || (row >= modules - 8 && col < 8)) continue

      const val = Math.abs(hash ^ (row * 31 + col * 17)) % 3
      if (val === 0) {
        elements.push(
          <rect key={`d-${row}-${col}`} x={col * moduleSize} y={row * moduleSize} width={moduleSize - 1} height={moduleSize - 1} fill="#0B2E58" rx="1" />
        )
      }
      hash = ((hash << 3) ^ (hash >> 2) + row * 7 + col * 13) | 0
    }
  }

  return <>{elements}</>
}
