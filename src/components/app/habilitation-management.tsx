'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Key, Building2, Users, CheckCircle2, XCircle,
  ToggleLeft, ToggleRight, Plus, Trash2, RefreshCw,
  ChevronDown, ChevronRight, Eye, Lock, Unlock,
  AlertTriangle, Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  useServiceHabilitationsStore,
  SERVICES_BY_CATEGORY,
  INSTITUTION_DISPLAY_NAMES,
  INSTITUTION_KEYS,
  type InstitutionKey,
  type HabilitationLevel,
} from '@/store/service-habilitations-store'

const LEVEL_CONFIG: Record<HabilitationLevel, { label: string; color: string; bgColor: string; description: string }> = {
  lecture: { label: 'Lecture', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', description: 'Consultation des demandes uniquement' },
  traitement: { label: 'Traitement', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', description: 'Traitement des demandes' },
  validation: { label: 'Validation', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', description: 'Traitement et validation des demandes' },
  supervision: { label: 'Supervision', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', description: 'Supervision de toutes les demandes' },
  administration: { label: 'Administration', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', description: 'Accès complet incluant la configuration' },
}

export function HabilitationManagement() {
  const {
    institutionHabilitations,
    agentHabilitations,
    toggleInstitutionHabilitation,
    removeInstitutionHabilitation,
    removeAgentHabilitation,
    toggleAgentHabilitation,
    grantAllServicesToInstitution,
    resetToDefaults,
    getInstitutionHabilitations,
    getAgentHabilitations,
  } = useServiceHabilitationsStore()

  const [expandedInstitution, setExpandedInstitution] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [grantDialog, setGrantDialog] = useState(false)
  const [grantInstitution, setGrantInstitution] = useState<string>('')
  const [grantLevel, setGrantLevel] = useState<HabilitationLevel>('validation')

  // Group institution habilitations by institution
  const institutionGroups = Object.entries(INSTITUTION_DISPLAY_NAMES).map(([key, name]) => {
    const habs = getInstitutionHabilitations(key)
    const activeCount = habs.filter(h => h.isActive).length
    const totalServices = Object.values(SERVICES_BY_CATEGORY).flat().length
    return { key, name, habs, activeCount, totalServices }
  }).filter(g => g.habs.length > 0 || g.key === INSTITUTION_KEYS.PRESIDENCE || g.key === INSTITUTION_KEYS.DGMA)

  // Group agent habilitations by agent email
  const agentGroups = Object.entries(
    agentHabilitations.reduce((acc, hab) => {
      if (!acc[hab.agentEmail]) acc[hab.agentEmail] = { name: hab.agentName, habs: [] }
      acc[hab.agentEmail].habs.push(hab)
      return acc
    }, {} as Record<string, { name: string; habs: typeof agentHabilitations }>)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-600" />
            Gestion des Habilitations
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les services accessibles par chaque organisme et agent en fonction de leurs habilitations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setGrantDialog(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Accorder des services
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400"
            onClick={() => setConfirmReset(true)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-200 dark:border-amber-800/40">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{institutionGroups.filter(g => g.activeCount > 0).length}</p>
              <p className="text-xs text-muted-foreground">Organismes actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800/40">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{institutionHabilitations.filter(h => h.isActive).length}</p>
              <p className="text-xs text-muted-foreground">Habilitations actives</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800/40">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agentGroups.length}</p>
              <p className="text-xs text-muted-foreground">Agents habilités</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Système d&apos;habilitation par service</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            Chaque organisme et agent ne peut accéder qu&apos;aux services pour lesquels ils ont une habilitation active.
            Les agents de mairie ne voient que les demandes d&apos;état civil et de résidence, les agents ANIP ne voient
            que les demandes d&apos;identification. Les ministères ont un rôle de supervision sur tous les services.
          </p>
        </div>
      </div>

      {/* Institution Habilitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Habilitations par organisme
          </CardTitle>
          <CardDescription>
            Services accessibles pour chaque organisme public
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {institutionGroups.map((group) => {
            const isExpanded = expandedInstitution === group.key
            const level = group.habs.length > 0 ? group.habs[0].level : 'lecture'
            const levelConfig = LEVEL_CONFIG[level]

            return (
              <div key={group.key} className="border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedInstitution(isExpanded ? null : group.key)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-medium">{group.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-[10px] ${levelConfig.bgColor} ${levelConfig.color} border-0`}>
                          {levelConfig.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {group.activeCount} / {group.totalServices} services
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.activeCount === group.totalServices ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : group.activeCount === 0 ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-amber-500" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Separator />
                      <div className="p-4 space-y-4">
                        {/* Services by category */}
                        {Object.entries(SERVICES_BY_CATEGORY).map(([categoryId, services]) => {
                          const categoryHabs = group.habs.filter(h =>
                            services.some(s => s.id === h.serviceId)
                          )
                          if (categoryHabs.length === 0) return null

                          const categoryLabel = services[0]?.name ? categoryId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : categoryId

                          return (
                            <div key={categoryId}>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                {categoryLabel}
                              </p>
                              <div className="space-y-1.5">
                                {categoryHabs.map(hab => {
                                  const habLevel = LEVEL_CONFIG[hab.level]
                                  return (
                                    <div
                                      key={hab.id}
                                      className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                                        hab.isActive ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-muted/30'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          checked={hab.isActive}
                                          onCheckedChange={() => toggleInstitutionHabilitation(hab.id)}
                                          className="scale-75"
                                        />
                                        <span className={hab.isActive ? '' : 'text-muted-foreground'}>
                                          {hab.serviceName}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`text-[9px] ${habLevel.bgColor} ${habLevel.color} border-0`}>
                                          {habLevel.label}
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                          onClick={() => removeInstitutionHabilitation(hab.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Agent Habilitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Habilitations par agent
          </CardTitle>
          <CardDescription>
            Services accessibles pour chaque agent connecté
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {agentGroups.map(([email, data]) => {
            const activeHabs = data.habs.filter(h => h.isActive)
            const institutions = [...new Set(activeHabs.map(h => h.institutionName))]
            const level = activeHabs.length > 0 ? activeHabs[0].level : 'lecture'
            const levelConfig = LEVEL_CONFIG[level]

            return (
              <div key={email} className="p-4 rounded-xl border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#CE1126] to-[#009460] flex items-center justify-center text-white text-sm font-bold">
                      {data.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{data.name}</p>
                      <p className="text-xs text-muted-foreground">{email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${levelConfig.bgColor} ${levelConfig.color} border-0`}>
                      {levelConfig.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {activeHabs.length} service{activeHabs.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {institutions.map(inst => (
                    <Badge key={inst} variant="secondary" className="text-[10px] gap-1">
                      <Building2 className="h-2.5 w-2.5" />
                      {inst.length > 40 ? inst.substring(0, 40) + '...' : inst}
                    </Badge>
                  ))}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Légende des niveaux d&apos;habilitation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
              <div key={level} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                <Badge variant="outline" className={`text-[10px] mt-0.5 ${config.bgColor} ${config.color} border-0 shrink-0`}>
                  {config.label}
                </Badge>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grant Services Dialog */}
      <Dialog open={grantDialog} onOpenChange={setGrantDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Accorder des services à un organisme</DialogTitle>
            <DialogDescription>
              Ajoutez tous les services manquants pour un organisme sélectionné
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organisme</label>
              <Select value={grantInstitution} onValueChange={setGrantInstitution}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un organisme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INSTITUTION_DISPLAY_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Niveau d&apos;habilitation</label>
              <Select value={grantLevel} onValueChange={(v) => setGrantLevel(v as HabilitationLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le niveau" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
                    <SelectItem key={level} value={level}>
                      <span className="flex items-center gap-2">
                        {config.label} — {config.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGrantDialog(false)}>Annuler</Button>
            <Button
              className="bg-[#CE1126] hover:bg-[#CE1126]/90 text-white"
              disabled={!grantInstitution}
              onClick={() => {
                const instName = INSTITUTION_DISPLAY_NAMES[grantInstitution] || grantInstitution
                grantAllServicesToInstitution(grantInstitution, instName, grantLevel, 'Admin')
                setGrantDialog(false)
                setGrantInstitution('')
              }}
            >
              Accorder tous les services
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Réinitialiser les habilitations</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment réinitialiser toutes les habilitations à leur configuration par défaut ?
              Les modifications personnalisées seront perdues.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(false)}>Annuler</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                resetToDefaults()
                setConfirmReset(false)
              }}
            >
              Réinitialiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
