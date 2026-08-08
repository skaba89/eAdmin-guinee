'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Fingerprint,
  Hash,
  KeyRound,
  Loader2,
  PenTool,
  RefreshCw,
  Shield,
  Stamp,
  User,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import * as parapheurApi from '@/lib/parapheur-api'

const ACTION_LABELS: Record<string, string> = {
  sign: 'Signer',
  approve: 'Approuver',
  viser: 'Viser',
  stamp: 'Apposer le cachet',
  reject: 'Rejeter',
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sign: PenTool,
  approve: CheckCircle2,
  viser: FileCheck,
  stamp: Stamp,
  reject: XCircle,
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function shortenHash(value?: string | null) {
  if (!value) return '—'
  return value.length > 28 ? `${value.slice(0, 14)}…${value.slice(-10)}` : value
}

export function SignaturesPage() {
  const [pending, setPending] = useState<parapheurApi.PendingParapheurItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<parapheurApi.PendingParapheurItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<parapheurApi.AdvanceParapheurResult | null>(null)
  const [verifyCircuitId, setVerifyCircuitId] = useState('')
  const [verifyHash, setVerifyHash] = useState('')
  const [verifyResult, setVerifyResult] = useState<parapheurApi.VerificationResult | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [toast, setToast] = useState('')

  const loadPending = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      setPending(await parapheurApi.listPending())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Impossible de charger le parapheur.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPending()
  }, [loadPending])

  const actionCounts = useMemo(() => {
    return pending.reduce<Record<string, number>>((acc, item) => {
      acc[item.action_type] = (acc[item.action_type] || 0) + 1
      return acc
    }, {})
  }, [pending])

  const openAction = (item: parapheurApi.PendingParapheurItem) => {
    setSelected(item)
    setComment('')
    setActionError(null)
    setDialogOpen(true)
  }

  const executeAction = async (action: parapheurApi.ParapheurAction) => {
    if (!selected || isSubmitting) return
    if (action === 'reject' && !comment.trim()) {
      setActionError('Une raison de rejet est obligatoire pour assurer la traçabilité.')
      return
    }

    setIsSubmitting(true)
    setActionError(null)
    try {
      const result = await parapheurApi.advance(selected, action, comment)
      setLastAction(result)
      setDialogOpen(false)
      setToast(
        action === 'reject'
          ? 'Décision de rejet enregistrée dans le parapheur.'
          : 'Action enregistrée avec une preuve d’approbation interne.',
      )
      if (result.signature_hash) {
        setVerifyCircuitId(result.circuit_id)
        setVerifyHash(result.signature_hash)
        try {
          setVerifyResult(await parapheurApi.verify(result.circuit_id, result.signature_hash))
          setVerifyError(null)
        } catch {
          setVerifyResult(null)
        }
      }
      await loadPending()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Action impossible.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyEvidence = async () => {
    if (!verifyCircuitId.trim() || !verifyHash.trim() || isVerifying) return
    setIsVerifying(true)
    setVerifyError(null)
    setVerifyResult(null)
    try {
      setVerifyResult(await parapheurApi.verify(verifyCircuitId.trim(), verifyHash.trim()))
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : 'Vérification impossible.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#0B2E58] text-white shadow-sm">
              <PenTool className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0B2E58] dark:text-white">Parapheur électronique</h1>
              <p className="text-sm text-muted-foreground">
                Visas, approbations, signatures internes et cachets soumis à contrôle serveur.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void loadPending()} disabled={isLoading}>
          <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="flex gap-3 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Niveau de preuve actuellement disponible</p>
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              eAdmin produit une <strong>preuve d’approbation interne SHA-256</strong> liée à la version exacte du document,
              à l’identité authentifiée, à l’action et au timestamp serveur. La <strong>signature PKI qualifiée avec certificat
              et horodatage TSA externe n’est pas encore configurée</strong> et n’est donc pas revendiquée par l’application.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'À traiter', value: pending.length, icon: Clock },
          { label: 'Signatures', value: actionCounts.sign || 0, icon: PenTool },
          { label: 'Visas / approbations', value: (actionCounts.viser || 0) + (actionCounts.approve || 0), icon: FileCheck },
          { label: 'Cachets', value: actionCounts.stamp || 0, icon: Stamp },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-primary/10 dark:text-primary">
                <stat.icon className="size-4" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mes étapes en attente</CardTitle>
            <CardDescription>Seules les étapes assignées à votre identité authentifiée sont affichées.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Chargement du parapheur…
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                {loadError}
              </div>
            ) : pending.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center text-center">
                <CheckCircle2 className="mb-3 size-10 text-emerald-500" />
                <p className="font-medium">Aucune étape en attente</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Le parapheur serveur ne retourne actuellement aucune décision à traiter pour votre compte.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((item, index) => {
                  const ActionIcon = ACTION_ICONS[item.action_type] || PenTool
                  return (
                    <motion.div
                      key={item.step_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0B2E58]/10 text-[#0B2E58] dark:bg-primary/10 dark:text-primary">
                              <ActionIcon className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#0B2E58] dark:text-white">{item.document_title}</p>
                              <p className="text-xs text-muted-foreground">{item.circuit_name}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 pl-10 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="size-3" /> Demandé par {item.requested_by}</span>
                            <span>Étape {item.order + 1}</span>
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline">{ACTION_LABELS[item.action_type] || item.action_type}</Badge>
                          <Button size="sm" onClick={() => openAction(item)}>
                            Traiter
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Fingerprint className="size-4" /> Vérifier une preuve</CardTitle>
              <CardDescription>La vérification est effectuée par le backend, jamais dans le navigateur.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium">Identifiant du circuit</span>
                <input
                  value={verifyCircuitId}
                  onChange={(event) => setVerifyCircuitId(event.target.value)}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="UUID du circuit"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium">Hash de preuve</span>
                <input
                  value={verifyHash}
                  onChange={(event) => setVerifyHash(event.target.value)}
                  className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
                  placeholder="SHA-256"
                />
              </label>
              <Button className="w-full gap-2" onClick={() => void verifyEvidence()} disabled={isVerifying || !verifyCircuitId.trim() || !verifyHash.trim()}>
                {isVerifying ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
                Vérifier côté serveur
              </Button>
              {verifyError && <p className="text-xs text-red-600 dark:text-red-400">{verifyError}</p>}
            </CardContent>
          </Card>

          {verifyResult && (
            <Card className={verifyResult.is_valid ? 'border-emerald-200 dark:border-emerald-900' : 'border-red-200 dark:border-red-900'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {verifyResult.is_valid ? <CheckCircle2 className="size-5 text-emerald-600" /> : <XCircle className="size-5 text-red-600" />}
                  {verifyResult.is_valid ? 'Preuve interne valide' : 'Preuve non validée'}
                </CardTitle>
                <CardDescription>{verifyResult.reason}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                  <span className="text-muted-foreground">Signataire</span>
                  <span className="font-medium">{verifyResult.signer?.name || '—'} {verifyResult.signer?.role ? `(${verifyResult.signer.role})` : ''}</span>
                  <span className="text-muted-foreground">Action</span>
                  <span>{ACTION_LABELS[verifyResult.action_type || ''] || verifyResult.action_type || '—'}</span>
                  <span className="text-muted-foreground">Version</span>
                  <span>{verifyResult.document_version ?? '—'}</span>
                  <span className="text-muted-foreground">Hash document</span>
                  <span className="break-all font-mono">{shortenHash(verifyResult.document_hash)}</span>
                  <span className="text-muted-foreground">Horodatage interne</span>
                  <span>{formatDate(verifyResult.evidence_timestamp)}</span>
                  <span className="text-muted-foreground">Type de preuve</span>
                  <span>{verifyResult.evidence_type || '—'}</span>
                  <span className="text-muted-foreground">PKI qualifiée</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Non configurée</span>
                </div>
              </CardContent>
            </Card>
          )}

          {lastAction?.signature_hash && (
            <Card>
              <CardContent className="space-y-2 p-4 text-xs">
                <div className="flex items-center gap-2 font-semibold"><Hash className="size-4" /> Dernière preuve générée</div>
                <p className="break-all font-mono text-muted-foreground">{lastAction.signature_hash}</p>
                <p className="text-muted-foreground">Circuit: {lastAction.circuit_id}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !isSubmitting && setDialogOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Traiter l’étape du parapheur</DialogTitle>
            <DialogDescription>
              L’action sera enregistrée par le serveur et liée à la version hashée du document.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="font-semibold">{selected.document_title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{selected.circuit_name}</p>
                <div className="mt-3 flex gap-2">
                  <Badge>{ACTION_LABELS[selected.action_type] || selected.action_type}</Badge>
                  <Badge variant="outline">Étape {selected.order + 1}</Badge>
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium">Commentaire / motif de décision</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Contexte de la décision. Obligatoire en cas de rejet."
                  disabled={isSubmitting}
                />
              </label>
              {actionError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                  {actionError}
                </div>
              )}
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300">
                Le navigateur ne génère ni certificat ni hash. La preuve est calculée et vérifiée côté serveur à partir de la version documentaire enregistrée.
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="destructive" onClick={() => void executeAction('reject')} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              Rejeter
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Annuler</Button>
              {selected && (
                <Button onClick={() => void executeAction(selected.action_type)} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : (() => {
                    const Icon = ACTION_ICONS[selected.action_type] || KeyRound
                    return <Icon className="size-4" />
                  })()}
                  {ACTION_LABELS[selected.action_type] || 'Valider'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg"
            onAnimationComplete={() => window.setTimeout(() => setToast(''), 3500)}
          >
            <CheckCircle2 className="size-5 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SignaturesPage
