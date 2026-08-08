'use client'

import { FormEvent, useMemo, useState } from 'react'
import { AlertCircle, ArrowLeft, Loader2, Lock, Shield } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function maskEmail(email?: string): string {
  if (!email) return 'utilisateur@eadmin.gn'
  const [local, domain] = email.split('@')
  if (!domain) return email
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(5, local.length - 2))}@${domain}`
}

export function MfaPage() {
  const { user, verifyMfa, logout, navigate, loginError } = useAppStore()
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const maskedEmail = useMemo(() => maskEmail(user?.email), [user?.email])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) return

    setIsSubmitting(true)
    try {
      await verifyMfa(code)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    logout()
    navigate('login')
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#071E3A] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,125,216,0.25),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(252,209,22,0.12),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(0,148,96,0.14),transparent_40%)]" />
      <div className="absolute top-0 left-0 right-0 h-1.5 flex">
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
        <div className="flex-1 bg-[#009460]" />
      </div>

      <Card className="relative z-10 w-full max-w-md border-white/10 bg-white/95 shadow-2xl backdrop-blur-xl dark:bg-slate-950/95">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-[#0B2E58] flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-[#FCD116]" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-2xl">Vérification de sécurité</CardTitle>
            <CardDescription className="mt-2 leading-relaxed">
              Saisissez le code à 6 chiffres généré par votre application d’authentification pour <strong>{maskedEmail}</strong>.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Code MFA</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="mfa-code"
                  name="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 pl-10 text-center text-xl tracking-[0.45em] font-semibold"
                  aria-describedby={loginError ? 'mfa-error' : undefined}
                  autoFocus
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                La vérification est effectuée côté serveur. Aucun code de démonstration n’est accepté.
              </p>
            </div>

            {loginError && (
              <div id="mfa-error" role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{loginError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-[#0B2E58] hover:bg-[#143D6B]"
              disabled={isSubmitting || code.length !== 6}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Vérification…
                </>
              ) : (
                'Valider le code'
              )}
            </Button>

            <Button type="button" variant="ghost" className="w-full" onClick={handleCancel} disabled={isSubmitting}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Revenir à la connexion
            </Button>
          </form>

          <div className="mt-6 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            Pour des raisons de sécurité, la session MFA est courte. Si elle expire, reconnectez-vous avec votre identifiant et votre mot de passe.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
