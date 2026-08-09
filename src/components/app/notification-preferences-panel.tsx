'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  confirmMobileVerification,
  getNotificationPreferences,
  type MobileVerificationChallenge,
  type NotificationPreferences,
  NotificationPreferencesApiError,
  startMobileVerification,
  updateNotificationPreferences,
} from '@/lib/notification-preferences-api'

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Une erreur inattendue est survenue.'
}

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startingVerification, setStartingVerification] = useState(false)
  const [confirmingVerification, setConfirmingVerification] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [mobileConsentAccepted, setMobileConsentAccepted] = useState(false)

  const [phoneInput, setPhoneInput] = useState('')
  const [verificationChannel, setVerificationChannel] = useState<'sms' | 'whatsapp'>('sms')
  const [challenge, setChallenge] = useState<MobileVerificationChallenge | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [changePhoneOpen, setChangePhoneOpen] = useState(false)

  const syncDraft = (next: NotificationPreferences) => {
    setPreferences(next)
    setEmailEnabled(next.email.enabled)
    setSmsEnabled(next.mobile.smsEnabled)
    setWhatsappEnabled(next.mobile.whatsappEnabled)
    setPhoneInput(next.mobile.phoneE164 || '')
    setMobileConsentAccepted(false)
    if (!next.mobile.smsProviderConfigured && next.mobile.whatsappProviderConfigured) {
      setVerificationChannel('whatsapp')
    }
  }

  const loadPreferences = async () => {
    setLoading(true)
    setError('')
    try {
      syncDraft(await getNotificationPreferences())
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPreferences()
  }, [])

  const mobileEnabled = smsEnabled || whatsappEnabled
  const requiresConsent = useMemo(() => {
    if (!preferences || !mobileEnabled) return false
    const enablingSms = smsEnabled && !preferences.mobile.smsEnabled
    const enablingWhatsapp = whatsappEnabled && !preferences.mobile.whatsappEnabled
    return enablingSms || enablingWhatsapp || !preferences.consent.current
  }, [mobileEnabled, preferences, smsEnabled, whatsappEnabled])

  const selectedProviderConfigured = verificationChannel === 'sms'
    ? preferences?.mobile.smsProviderConfigured
    : preferences?.mobile.whatsappProviderConfigured

  const startVerification = async () => {
    if (!phoneInput.trim()) {
      setError('Saisissez le numéro de téléphone à vérifier.')
      return
    }
    if (!selectedProviderConfigured) {
      setError(`Le fournisseur ${verificationChannel === 'sms' ? 'SMS' : 'WhatsApp'} n’est pas configuré.`)
      return
    }

    setStartingVerification(true)
    setError('')
    setSuccess('')
    try {
      const nextChallenge = await startMobileVerification(phoneInput, verificationChannel)
      setChallenge(nextChallenge)
      setOtpCode('')
      setSuccess(`Code envoyé vers ${nextChallenge.phoneMasked}.`)
    } catch (verificationError) {
      setError(errorMessage(verificationError))
    } finally {
      setStartingVerification(false)
    }
  }

  const confirmVerification = async () => {
    if (!challenge) return
    if (!/^\d{6}$/.test(otpCode)) {
      setError('Le code de vérification doit contenir exactement 6 chiffres.')
      return
    }

    setConfirmingVerification(true)
    setError('')
    try {
      const next = await confirmMobileVerification(challenge.challengeId, otpCode)
      syncDraft(next)
      setChallenge(null)
      setOtpCode('')
      setChangePhoneOpen(false)
      setSuccess('Numéro vérifié. Choisissez maintenant les canaux mobiles que vous souhaitez activer.')
    } catch (verificationError) {
      if (
        verificationError instanceof NotificationPreferencesApiError
        && typeof verificationError.remainingAttempts === 'number'
      ) {
        setError(`${verificationError.message} ${verificationError.remainingAttempts} tentative(s) restante(s).`)
      } else {
        setError(errorMessage(verificationError))
      }
    } finally {
      setConfirmingVerification(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return
    if (requiresConsent && !mobileConsentAccepted) {
      setError('Confirmez explicitement votre consentement avant d’activer les notifications mobiles.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const next = await updateNotificationPreferences({
        emailEnabled,
        smsEnabled,
        whatsappEnabled,
        confirmMobileConsent: requiresConsent && mobileConsentAccepted,
      })
      syncDraft(next)
      setSuccess('Préférences de notification enregistrées.')
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="glass-premium">
        <CardContent className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des préférences de notification…
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card className="glass-premium">
        <CardHeader>
          <CardTitle className="text-base">Préférences de notification</CardTitle>
          <CardDescription>Impossible de charger vos canaux de notification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}
          <Button variant="outline" className="gap-2" onClick={() => void loadPreferences()}>
            <RefreshCw className="h-4 w-4" /> Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  const verified = preferences.mobile.verified
  const smsUnavailable = !preferences.mobile.smsProviderConfigured
  const whatsappUnavailable = !preferences.mobile.whatsappProviderConfigured

  return (
    <div className="space-y-6">
      {(error || success) && (
        <div
          role="status"
          className={`rounded-xl border p-3 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-start gap-2">
            {error ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{error || success}</span>
          </div>
        </div>
      )}

      <Card className="glass-premium">
        <CardHeader>
          <CardTitle className="text-base">Notifications administratives</CardTitle>
          <CardDescription>
            Choisissez les canaux utilisés pour le suivi de vos démarches. Les SMS et WhatsApp exigent un numéro vérifié et votre consentement explicite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div className="flex min-w-0 items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand dark:text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Email</p>
                <p className="truncate text-xs text-muted-foreground">{preferences.email.address}</p>
                <p className="mt-1 text-xs text-muted-foreground">Suivi des changements de statut de vos démarches.</p>
              </div>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} aria-label="Activer les notifications email" />
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand dark:text-primary" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">Téléphone de notification</p>
                    {verified ? (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Vérifié
                      </Badge>
                    ) : (
                      <Badge variant="outline">Non vérifié</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {verified && preferences.mobile.phoneMasked
                      ? `Numéro vérifié : ${preferences.mobile.phoneMasked}`
                      : 'Vérifiez un numéro avant d’activer SMS ou WhatsApp.'}
                  </p>
                </div>
              </div>
              {verified && !changePhoneOpen && (
                <Button variant="outline" size="sm" onClick={() => setChangePhoneOpen(true)}>
                  Changer le numéro
                </Button>
              )}
            </div>

            {(!verified || changePhoneOpen) && (
              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="notification-phone">Numéro de téléphone</Label>
                  <Input
                    id="notification-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+224 620 00 00 01"
                    value={phoneInput}
                    onChange={(event) => setPhoneInput(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recevoir le code par</Label>
                  <Select value={verificationChannel} onValueChange={(value) => setVerificationChannel(value as 'sms' | 'whatsapp')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms" disabled={!preferences.mobile.smsProviderConfigured}>
                        SMS{!preferences.mobile.smsProviderConfigured ? ' — indisponible' : ''}
                      </SelectItem>
                      <SelectItem value="whatsapp" disabled={!preferences.mobile.whatsappProviderConfigured}>
                        WhatsApp{!preferences.mobile.whatsappProviderConfigured ? ' — indisponible' : ''}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="gap-2"
                  onClick={() => void startVerification()}
                  disabled={startingVerification || !selectedProviderConfigured}
                >
                  {startingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  Envoyer le code
                </Button>
              </div>
            )}

            {!preferences.mobile.smsProviderConfigured && !preferences.mobile.whatsappProviderConfigured && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Aucun fournisseur SMS/WhatsApp n’est actuellement configuré. La vérification mobile reste indisponible jusqu’à la configuration d’un fournisseur côté plateforme.
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-brand dark:text-primary" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">SMS</p>
                    <Badge variant="outline" className={smsUnavailable ? 'text-muted-foreground' : 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300'}>
                      {smsUnavailable ? 'Fournisseur non configuré' : 'Disponible'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Alertes courtes sur l’avancement de vos démarches.</p>
                </div>
              </div>
              <Switch
                checked={smsEnabled}
                onCheckedChange={setSmsEnabled}
                disabled={!verified || (smsUnavailable && !smsEnabled)}
                aria-label="Activer les notifications SMS"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">WhatsApp</p>
                    <Badge variant="outline" className={whatsappUnavailable ? 'text-muted-foreground' : 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300'}>
                      {whatsappUnavailable ? 'Fournisseur non configuré' : 'Disponible'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Notifications de statut sur le numéro vérifié.</p>
                </div>
              </div>
              <Switch
                checked={whatsappEnabled}
                onCheckedChange={setWhatsappEnabled}
                disabled={!verified || (whatsappUnavailable && !whatsappEnabled)}
                aria-label="Activer les notifications WhatsApp"
              />
            </div>
          </div>

          {mobileEnabled && (
            <div className={`rounded-xl border p-4 ${requiresConsent ? 'border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/20' : ''}`}>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="mobile-notification-consent"
                  checked={mobileConsentAccepted}
                  onCheckedChange={(checked) => setMobileConsentAccepted(checked === true)}
                  disabled={!requiresConsent}
                />
                <div className="space-y-1">
                  <Label htmlFor="mobile-notification-consent" className="text-sm font-medium leading-5">
                    J’accepte de recevoir des notifications administratives par les canaux mobiles activés.
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Consentement {preferences.consent.current ? 'à jour' : `à renouveler (${preferences.consent.currentVersion})`}. Vous pouvez désactiver SMS ou WhatsApp à tout moment.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Les messages ne contiennent pas votre NIN, vos pièces jointes ni les motifs détaillés de décision.
            </p>
            <Button className="btn-premium gap-2" onClick={() => void savePreferences()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Enregistrement…' : 'Enregistrer les préférences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={challenge !== null} onOpenChange={(open) => { if (!open && !confirmingVerification) setChallenge(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vérifier votre numéro</DialogTitle>
            <DialogDescription>
              Saisissez le code à 6 chiffres envoyé par {challenge?.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} vers {challenge?.phoneMasked}. Le code expire après 10 minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="mobile-otp">Code de vérification</Label>
            <Input
              id="mobile-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-lg tracking-[0.35em]"
            />
            {challenge?.expiresAt && (
              <p className="text-xs text-muted-foreground">
                Expiration : {new Date(challenge.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setChallenge(null)} disabled={confirmingVerification}>Annuler</Button>
            <Button onClick={() => void confirmVerification()} disabled={confirmingVerification || otpCode.length !== 6} className="gap-2">
              {confirmingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Vérifier le numéro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
