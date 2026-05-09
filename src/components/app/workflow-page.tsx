'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, Plus, CheckCircle2, Clock, AlertCircle,
  ChevronRight, User, MessageSquare, Filter,
  ArrowRight, Play, Pause, BarChart3, MoreHorizontal
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DEMO_STATS } from '@/lib/constants'

interface WorkflowStep {
  name: string
  status: 'completed' | 'current' | 'pending' | 'rejected'
  assignee: string
  date?: string
}

interface Workflow {
  id: string
  name: string
  status: 'actif' | 'complété' | 'en_attente'
  currentStep: number
  totalSteps: number
  progress: number
  assignees: { name: string; initials: string }[]
  steps: WorkflowStep[]
  createdAt: string
  comments: { author: string; text: string; date: string }[]
}

const FAKE_WORKFLOWS: Workflow[] = [
  {
    id: '1', name: 'Demande de congé - A. Diallo', status: 'actif', currentStep: 2, totalSteps: 4, progress: 50,
    assignees: [{ name: 'Aissatou Diallo', initials: 'AD' }, { name: 'Ibrahima Sow', initials: 'IS' }],
    steps: [
      { name: 'Soumission demande', status: 'completed', assignee: 'Aissatou Diallo', date: '2024-12-10' },
      { name: 'Validation chef de service', status: 'completed', assignee: 'Ibrahima Sow', date: '2024-12-11' },
      { name: 'Approbation DRH', status: 'current', assignee: 'Fatoumata Camara' },
      { name: 'Notification', status: 'pending', assignee: 'Système' },
    ],
    createdAt: '2024-12-10',
    comments: [
      { author: 'Ibrahima Sow', text: 'Demande validée, transmise à la DRH', date: '2024-12-11 09:30' },
      { author: 'Fatoumata Camara', text: 'En cours de vérification du solde de congé', date: '2024-12-12 14:15' },
    ],
  },
  {
    id: '2', name: 'Approbation budget 2025 - Direction', status: 'actif', currentStep: 3, totalSteps: 5, progress: 60,
    assignees: [{ name: 'Abdoulaye Bah', initials: 'AB' }, { name: 'Mamadou Baldé', initials: 'MB' }, { name: 'Kadiatou Sylla', initials: 'KS' }],
    steps: [
      { name: 'Préparation budget', status: 'completed', assignee: 'Abdoulaye Bah', date: '2024-12-01' },
      { name: 'Revue service finance', status: 'completed', assignee: 'Mamadou Baldé', date: '2024-12-05' },
      { name: 'Approbation directeur', status: 'current', assignee: 'Kadiatou Sylla' },
      { name: 'Validation ministère', status: 'pending', assignee: 'Ministre' },
      { name: 'Notification & publication', status: 'pending', assignee: 'Système' },
    ],
    createdAt: '2024-12-01',
    comments: [
      { author: 'Abdoulaye Bah', text: 'Budget préparé selon les normes', date: '2024-12-01 16:00' },
      { author: 'Mamadou Baldé', text: 'Quelques ajustements nécessaires sur le chapitre 3', date: '2024-12-04 10:00' },
    ],
  },
  {
    id: '3', name: 'Signature arrêté n°2024-312', status: 'actif', currentStep: 1, totalSteps: 3, progress: 33,
    assignees: [{ name: 'Alpha Condé', initials: 'AC' }, { name: 'Mariama Condé', initials: 'MC' }],
    steps: [
      { name: 'Rédaction arrêté', status: 'completed', assignee: 'Alpha Condé', date: '2024-12-13' },
      { name: 'Visa secrétaire général', status: 'current', assignee: 'Mariama Condé' },
      { name: 'Signature ministre', status: 'pending', assignee: 'Ministre' },
    ],
    createdAt: '2024-12-13',
    comments: [
      { author: 'Alpha Condé', text: 'Projet rédigé, en attente de visa', date: '2024-12-13 11:00' },
    ],
  },
  {
    id: '4', name: 'Validation marché public MP-2024-567', status: 'en_attente', currentStep: 1, totalSteps: 5, progress: 20,
    assignees: [{ name: 'Moussa Keïta', initials: 'MK' }],
    steps: [
      { name: 'Soumission dossier', status: 'completed', assignee: 'Moussa Keïta', date: '2024-12-08' },
      { name: 'Commission d\'appel d\'offres', status: 'pending', assignee: 'Commission CAO' },
      { name: 'Avis juridique', status: 'pending', assignee: 'Service juridique' },
      { name: 'Approbation autorité contractante', status: 'pending', assignee: 'Directeur Général' },
      { name: 'Notification attribution', status: 'pending', assignee: 'Système' },
    ],
    createdAt: '2024-12-08',
    comments: [],
  },
  {
    id: '5', name: 'Recrutement agent - Service Informatique', status: 'complété', currentStep: 4, totalSteps: 4, progress: 100,
    assignees: [{ name: 'Fatoumata Camara', initials: 'FC' }, { name: 'Djenabou Diallo', initials: 'DD' }],
    steps: [
      { name: 'Publication offre', status: 'completed', assignee: 'Fatoumata Camara', date: '2024-11-20' },
      { name: 'Sélection candidats', status: 'completed', assignee: 'Commission', date: '2024-12-01' },
      { name: 'Entretien', status: 'completed', assignee: 'Djenabou Diallo', date: '2024-12-05' },
      { name: 'Embauche', status: 'completed', assignee: 'DRH', date: '2024-12-10' },
    ],
    createdAt: '2024-11-20',
    comments: [
      { author: 'Djenabou Diallo', text: 'Candidat retenu : M. Souleymane Bah', date: '2024-12-06 15:00' },
    ],
  },
  {
    id: '6', name: 'Attribution subvention ONG Espoir', status: 'actif', currentStep: 2, totalSteps: 4, progress: 50,
    assignees: [{ name: 'Aminata Touré', initials: 'AT' }, { name: 'Sékou Touré', initials: 'ST' }],
    steps: [
      { name: 'Évaluation dossier', status: 'completed', assignee: 'Aminata Touré', date: '2024-12-09' },
      { name: 'Approbation commission', status: 'current', assignee: 'Sékou Touré' },
      { name: 'Décaissement', status: 'pending', assignee: 'Service financier' },
      { name: 'Suivi & rapport', status: 'pending', assignee: 'Aminata Touré' },
    ],
    createdAt: '2024-12-09',
    comments: [
      { author: 'Aminata Touré', text: 'Dossier complet et conforme', date: '2024-12-09 17:00' },
    ],
  },
]

const STATUS_CONFIG = {
  actif: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Play },
  complété: { color: 'bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary', icon: CheckCircle2 },
  en_attente: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Pause },
}

export function WorkflowPage() {
  const [statusFilter, setStatusFilter] = useState<string>('tous')
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)

  const filtered = FAKE_WORKFLOWS.filter(w =>
    statusFilter === 'tous' || w.status === statusFilter
  )

  const stats = [
    { label: 'Workflows actifs', value: DEMO_STATS.workflows.actifs, icon: Play, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Complétés', value: DEMO_STATS.workflows.completes, icon: CheckCircle2, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
    { label: 'En cours', value: DEMO_STATS.workflows.enCours, icon: Clock, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: 'En attente', value: DEMO_STATS.workflows.enAttente, icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="complété">Complété</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2 bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Créer un workflow
        </Button>
      </div>

      {/* Main Content - Workflow List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Cards */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((wf, i) => {
              const sConfig = STATUS_CONFIG[wf.status]
              const StatusIcon = sConfig.icon
              return (
                <motion.div
                  key={wf.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.06 }}
                  layout
                >
                  <Card
                    className={`cursor-pointer hover:shadow-lg transition-all ${selectedWorkflow?.id === wf.id ? 'ring-2 ring-brand dark:ring-primary' : ''}`}
                    onClick={() => setSelectedWorkflow(wf)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <GitBranch className="h-4 w-4 text-brand dark:text-primary" />
                            <h3 className="font-semibold text-sm">{wf.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">Créé le {wf.createdAt}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {wf.status === 'actif' ? 'Actif' : wf.status === 'complété' ? 'Complété' : 'En attente'}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Étape {wf.currentStep} / {wf.totalSteps}</span>
                          <span className="text-xs font-medium">{wf.progress}%</span>
                        </div>
                        <Progress value={wf.progress} className="h-2" />
                      </div>

                      {/* Pipeline Steps */}
                      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                        {wf.steps.map((step, si) => (
                          <div key={si} className="flex items-center shrink-0">
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium ${
                              step.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              step.status === 'current' ? 'bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary ring-1 ring-brand/30 dark:ring-primary/30' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {step.status === 'completed' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : step.status === 'current' ? (
                                <Play className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {step.name}
                            </div>
                            {si < wf.steps.length - 1 && (
                              <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Assignees */}
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {wf.assignees.map(a => (
                            <Avatar key={a.initials} className="h-7 w-7 border-2 border-background">
                              <AvatarFallback className="text-[10px] bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary">
                                {a.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          {wf.comments.length}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedWorkflow ? (
            <motion.div
              key={selectedWorkflow.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="glass-card sticky top-24">
                <CardHeader>
                  <CardTitle className="text-base">{selectedWorkflow.name}</CardTitle>
                  <CardDescription>Créé le {selectedWorkflow.createdAt}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Timeline */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Chronologie</h4>
                    <div className="space-y-0">
                      {selectedWorkflow.steps.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              step.status === 'completed' ? 'bg-emerald-500 text-white' :
                              step.status === 'current' ? 'bg-brand text-white dark:bg-primary' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {step.status === 'completed' ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : step.status === 'current' ? (
                                <Play className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3.5 w-3.5" />
                              )}
                            </div>
                            {i < selectedWorkflow.steps.length - 1 && (
                              <div className={`w-0.5 h-8 ${
                                step.status === 'completed' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-muted'
                              }`} />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-medium">{step.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {step.assignee}
                            </p>
                            {step.date && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{step.date}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Commentaires ({selectedWorkflow.comments.length})</h4>
                    {selectedWorkflow.comments.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {selectedWorkflow.comments.map((comment, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium">{comment.author}</span>
                              <span className="text-[10px] text-muted-foreground">{comment.date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">Aucun commentaire</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-1">
                      <Play className="h-3.5 w-3.5" />
                      Avancer
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Commenter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <GitBranch className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Sélectionnez un workflow pour voir les détails</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
