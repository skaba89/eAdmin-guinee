'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronRight,
  GitBranch,
  User,
  Calendar,
  MessageSquare,
  List,
  AlignLeft,
  ArrowRight,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WORKFLOW_STATUS_COLORS, GUINEA_COLORS } from '@/lib/design-system'

// ─── TYPES ────────────────────────────────────────────────────────────────────
type WorkflowStepStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'completed' | 'escalated'

interface WorkflowStep {
  id: string
  title: string
  description: string
  status: WorkflowStepStatus
  assignee?: string
  assigneeRole?: string
  date?: string
  comment?: string
  isCurrent?: boolean
}

interface WorkflowDefinition {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  createdAt: string
  priority: 'basse' | 'normale' | 'haute' | 'urgente'
  requester: string
}

// ─── DEMO WORKFLOW DATA ──────────────────────────────────────────────────────
const DEMO_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'wf-001',
    name: 'Approbation budgétaire MEF 2026',
    description: 'Processus d\'approbation du budget ministériel pour l\'exercice 2026',
    priority: 'urgente',
    requester: 'Direction du Budget',
    createdAt: '15 Jan 2026',
    steps: [
      { id: 's1', title: 'Soumission initiale', description: 'Dépôt du projet budgétaire par la Direction du Budget', status: 'completed', assignee: 'M. Sylla', assigneeRole: 'Directeur du Budget', date: '15 Jan 2026', comment: 'Projet complet avec toutes les pièces justificatives' },
      { id: 's2', title: 'Revue technique', description: 'Analyse de conformité par le service financier', status: 'completed', assignee: 'Mme Touré', assigneeRole: 'Chef Service Financier', date: '18 Jan 2026', comment: 'Conforme aux normes comptables internationales' },
      { id: 's3', title: 'Validation chef de service', description: 'Approbation par le chef de service compétent', status: 'approved', assignee: 'M. Camara', assigneeRole: 'Chef de Service', date: '20 Jan 2026', comment: 'Approuvé sous réserve de révision des dépenses de fonctionnement' },
      { id: 's4', title: 'Visa directeur', description: 'Visa du Directeur Général de la Modernisation', status: 'in_progress', assignee: 'M. Sylla', assigneeRole: 'Directeur DSI', isCurrent: true },
      { id: 's5', title: 'Approbation ministérielle', description: 'Signature du Ministre des Finances', status: 'pending', assigneeRole: 'Ministre MEF' },
      { id: 's6', title: 'Promulgation', description: 'Publication au Journal Officiel', status: 'pending', assigneeRole: 'SGG' },
    ],
  },
  {
    id: 'wf-002',
    name: 'Nomination fonctionnaire — Mairie de Kaloum',
    description: 'Procédure de nomination d\'un chef de bureau à la Mairie de Kaloum',
    priority: 'normale',
    requester: 'Ressources Humaines',
    createdAt: '10 Jan 2026',
    steps: [
      { id: 's1', title: 'Proposition RH', description: 'Proposition de nomination par le service RH', status: 'completed', assignee: 'Mme Bah', assigneeRole: 'DRH', date: '10 Jan 2026' },
      { id: 's2', title: 'Avis commission', description: 'Avis de la commission administrative paritaire', status: 'approved', assignee: 'Commission CAP', assigneeRole: 'Président CAP', date: '15 Jan 2026', comment: 'Avis favorable à l\'unanimité' },
      { id: 's3', title: 'Arrêté maire', description: 'Signature de l\'arrêté par le Maire', status: 'escalated', assignee: 'M. Diallo', assigneeRole: 'Maire de Kaloum', isCurrent: true, comment: 'Délai dépassé — escalade automatique au Secrétaire Général' },
      { id: 's4', title: 'Notification', description: 'Notification à l\'intéressé et publication', status: 'pending', assigneeRole: 'Service RH' },
    ],
  },
  {
    id: 'wf-003',
    name: 'Marché public — Équipement informatique',
    description: 'Appel d\'offres pour l\'équipement informatique des services ministériels',
    priority: 'haute',
    requester: 'DSI — Direction des Systèmes',
    createdAt: '5 Jan 2026',
    steps: [
      { id: 's1', title: 'Cahier des charges', description: 'Rédaction et validation du cahier des charges', status: 'completed', assignee: 'M. Camara', assigneeRole: 'DSI', date: '5 Jan 2026' },
      { id: 's2', title: 'Publication AO', description: 'Publication de l\'appel d\'offres', status: 'completed', assignee: 'Mme Touré', assigneeRole: 'Commission Marchés', date: '10 Jan 2026' },
      { id: 's3', title: 'Réception offres', description: 'Réception et dépouillement des offres', status: 'rejected', assignee: 'Commission', assigneeRole: 'Président Commission', date: '22 Jan 2026', comment: 'Offres non conformes — report de l\'AO' },
    ],
  },
]

// ─── STATUS ICON HELPER ───────────────────────────────────────────────────────
function StatusIcon({ status, size = 20 }: { status: WorkflowStepStatus; size?: number }) {
  const cls = `size-${Math.round(size / 4)}`
  switch (status) {
    case 'completed':
    case 'approved':
      return <CheckCircle2 className={cls} />
    case 'in_progress':
      return <Clock className={cls} />
    case 'pending':
      return <Clock className={cls} />
    case 'rejected':
      return <XCircle className={cls} />
    case 'escalated':
      return <AlertTriangle className={cls} />
  }
}

function getStatusColors(status: WorkflowStepStatus) {
  return WORKFLOW_STATUS_COLORS[status] || WORKFLOW_STATUS_COLORS.pending
}

// ─── STEP NODE COMPONENT ─────────────────────────────────────────────────────
function StepNode({
  step,
  index,
  total,
  isHovered,
  onHover,
  onLeave,
}: {
  step: WorkflowStep
  index: number
  total: number
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const colors = getStatusColors(step.status)
  const isCompleted = step.status === 'completed' || step.status === 'approved'
  const isRejected = step.status === 'rejected'

  return (
    <div className="flex items-start gap-4 relative" onMouseEnter={onHover} onMouseLeave={onLeave}>
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        {/* Node circle */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
          className={`relative flex size-10 items-center justify-center rounded-full border-2 ${colors.border} ${colors.bg} transition-all duration-200 ${isHovered ? 'scale-110 shadow-lg' : ''} ${step.isCurrent ? 'ring-2 ring-offset-2 ring-[#0B2E58]/30 dark:ring-[#3B7DD8]/30' : ''}`}
        >
          <div className={colors.text}>
            <StatusIcon status={step.status} size={20} />
          </div>
          {/* Pulsing indicator for current step */}
          {step.isCurrent && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[#0B2E58]/20 dark:border-[#3B7DD8]/20"
              animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </motion.div>
        {/* Connector line */}
        {index < total - 1 && (
          <div className={`w-0.5 h-8 my-1 rounded-full ${isCompleted ? 'bg-emerald-300 dark:bg-emerald-700' : isRejected ? 'bg-red-300 dark:bg-red-700' : 'bg-muted-foreground/20'}`} />
        )}
      </div>

      {/* Step content */}
      <motion.div
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: index * 0.1 + 0.05, duration: 0.3 }}
        className={`flex-1 min-w-0 pb-4 transition-all duration-200 ${isHovered ? 'translate-x-1' : ''}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={`text-sm font-semibold ${step.status === 'pending' ? 'text-muted-foreground' : 'text-[#0B2E58] dark:text-white'}`}>
            {step.title}
          </h4>
          <Badge variant="outline" className={`text-[10px] border-0 ${colors.bg} ${colors.text}`}>
            {step.status === 'completed' ? 'Terminé' :
             step.status === 'approved' ? 'Approuvé' :
             step.status === 'in_progress' ? 'En cours' :
             step.status === 'rejected' ? 'Rejeté' :
             step.status === 'escalated' ? 'Escaladé' : 'En attente'}
          </Badge>
          {step.isCurrent && (
            <Badge className="text-[10px] bg-[#0B2E58] dark:bg-[#3B7DD8] text-white border-0 animate-pulse-soft">
              Étape actuelle
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>

        {/* Hover details */}
        <AnimatePresence>
          {isHovered && (step.assignee || step.date || step.comment) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5 overflow-hidden"
            >
              {step.assignee && (
                <div className="flex items-center gap-1.5 text-xs">
                  <User className="size-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigné à:</span>
                  <span className="font-medium text-[#0B2E58] dark:text-white">{step.assignee}</span>
                  {step.assigneeRole && <span className="text-muted-foreground">({step.assigneeRole})</span>}
                </div>
              )}
              {step.date && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="size-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{step.date}</span>
                </div>
              )}
              {step.comment && (
                <div className="flex items-start gap-1.5 text-xs">
                  <MessageSquare className="size-3 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">Commentaire:</span>
                  <span className="italic">{step.comment}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─── HORIZONTAL STEP VIEW ─────────────────────────────────────────────────────
function HorizontalStepView({
  steps,
  hoveredStep,
  onHover,
  onLeave,
}: {
  steps: WorkflowStep[]
  hoveredStep: string | null
  onHover: (id: string) => void
  onLeave: () => void
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-start min-w-max gap-0">
        {steps.map((step, idx) => {
          const colors = getStatusColors(step.status)
          const isCompleted = step.status === 'completed' || step.status === 'approved'
          const isRejected = step.status === 'rejected'
          const isHovered = hoveredStep === step.id

          return (
            <div key={step.id} className="flex items-start">
              <div
                className="flex flex-col items-center w-36"
                onMouseEnter={() => onHover(step.id)}
                onMouseLeave={onLeave}
              >
                {/* Node */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.08, duration: 0.3 }}
                  className={`relative flex size-10 items-center justify-center rounded-full border-2 ${colors.border} ${colors.bg} transition-all duration-200 ${isHovered ? 'scale-110 shadow-lg' : ''} ${step.isCurrent ? 'ring-2 ring-offset-2 ring-[#0B2E58]/30 dark:ring-[#3B7DD8]/30' : ''}`}
                >
                  <div className={colors.text}>
                    <StatusIcon status={step.status} size={20} />
                  </div>
                  {step.isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[#0B2E58]/20 dark:border-[#3B7DD8]/20"
                      animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                </motion.div>

                {/* Title */}
                <p className={`text-[11px] font-semibold text-center mt-2 leading-tight ${step.status === 'pending' ? 'text-muted-foreground' : 'text-[#0B2E58] dark:text-white'}`}>
                  {step.title}
                </p>
                {step.assignee && (
                  <p className="text-[10px] text-muted-foreground text-center mt-0.5">{step.assignee}</p>
                )}

                {/* Hover details popup */}
                <AnimatePresence>
                  {isHovered && (step.comment || step.date) && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-14 z-10 w-44 rounded-lg border border-border bg-popover p-2 shadow-lg text-[10px] space-y-1"
                    >
                      {step.date && <div className="flex items-center gap-1"><Calendar className="size-3" />{step.date}</div>}
                      {step.comment && <div className="italic text-muted-foreground">{step.comment}</div>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Arrow connector */}
              {idx < steps.length - 1 && (
                <div className="flex items-center self-center -mx-0.5">
                  <div className={`h-0.5 w-6 rounded-full ${isCompleted ? 'bg-emerald-300 dark:bg-emerald-700' : isRejected ? 'bg-red-300 dark:bg-red-700' : 'bg-muted-foreground/20'}`} />
                  <ArrowRight className={`size-3 ${isCompleted ? 'text-emerald-400' : 'text-muted-foreground/30'}`} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PRIORITY BADGE COLORS ────────────────────────────────────────────────────
const priorityColors: Record<string, string> = {
  basse: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  normale: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  haute: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  urgente: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function WorkflowVisualizer() {
  const [selectedWorkflow, setSelectedWorkflow] = useState(0)
  const [viewMode, setViewMode] = useState<'timeline' | 'horizontal'>('timeline')
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)

  const workflow = DEMO_WORKFLOWS[selectedWorkflow]
  const completedSteps = workflow.steps.filter(s => s.status === 'completed' || s.status === 'approved').length
  const totalSteps = workflow.steps.length
  const progressPct = Math.round((completedSteps / totalSteps) * 100)

  // Compute progress bar color based on Guinea tricolor
  const progressColor = progressPct < 33 ? GUINEA_COLORS.red : progressPct < 66 ? GUINEA_COLORS.yellow : GUINEA_COLORS.green

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5 p-4 md:p-6 dashboard-bg-v2"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] shadow-sm">
            <GitBranch className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0B2E58] dark:text-white">Visualisation des Workflows</h2>
            <p className="text-xs text-muted-foreground">Chaînes d&apos;approbation et progression des procédures</p>
          </div>
        </div>
        {/* View mode toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'ghost'}
            size="sm"
            className={`h-7 text-xs ${viewMode === 'timeline' ? 'bg-[#0B2E58] dark:bg-[#3B7DD8] text-white' : ''}`}
            onClick={() => setViewMode('timeline')}
            aria-label="Vue timeline"
          >
            <AlignLeft className="size-3 mr-1" />
            Timeline
          </Button>
          <Button
            variant={viewMode === 'horizontal' ? 'default' : 'ghost'}
            size="sm"
            className={`h-7 text-xs ${viewMode === 'horizontal' ? 'bg-[#0B2E58] dark:bg-[#3B7DD8] text-white' : ''}`}
            onClick={() => setViewMode('horizontal')}
            aria-label="Vue horizontale"
          >
            <List className="size-3 mr-1" />
            Horizontal
          </Button>
        </div>
      </div>

      {/* Workflow selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DEMO_WORKFLOWS.map((wf, idx) => (
          <motion.button
            key={wf.id}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${selectedWorkflow === idx ? 'bg-[#0B2E58] text-white dark:bg-[#3B7DD8] shadow-md' : 'bg-card border border-border text-muted-foreground hover:bg-muted/50'}`}
            onClick={() => setSelectedWorkflow(idx)}
            aria-label={`Sélectionner workflow: ${wf.name}`}
          >
            <GitBranch className="size-3.5" />
            {wf.name}
          </motion.button>
        ))}
      </div>

      {/* Selected workflow card */}
      <Card className="card-interactive shadow-premium overflow-hidden border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                  {workflow.name}
                </CardTitle>
                <Badge className={`text-[10px] border-0 ${priorityColors[workflow.priority]}`}>
                  {workflow.priority.charAt(0).toUpperCase() + workflow.priority.slice(1)}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">{workflow.description}</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Demandeur: <strong className="text-[#0B2E58] dark:text-white">{workflow.requester}</strong></span>
              <span>Créé: {workflow.createdAt}</span>
            </div>
          </div>
          {/* Progress bar with Guinea tricolor threshold */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#0B2E58] dark:text-white">Progression</span>
              <span className="font-bold tabular-nums" style={{ color: progressColor }}>{progressPct}% ({completedSteps}/{totalSteps})</span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
              {/* Guinea tricolor background markers */}
              <div className="absolute inset-0 flex">
                <div className="flex-[1] bg-[#CE1126]/5" />
                <div className="flex-[1] bg-[#FCD116]/5" />
                <div className="flex-[1] bg-[#009460]/5" />
              </div>
              <motion.div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ backgroundColor: progressColor }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'timeline' ? (
            <div className="pl-2">
              {workflow.steps.map((step, idx) => (
                <StepNode
                  key={step.id}
                  step={step}
                  index={idx}
                  total={workflow.steps.length}
                  isHovered={hoveredStep === step.id}
                  onHover={() => setHoveredStep(step.id)}
                  onLeave={() => setHoveredStep(null)}
                />
              ))}
            </div>
          ) : (
            <HorizontalStepView
              steps={workflow.steps}
              hoveredStep={hoveredStep}
              onHover={setHoveredStep}
              onLeave={() => setHoveredStep(null)}
            />
          )}
        </CardContent>
      </Card>

      {/* Approval chain visualization */}
      <Card className="card-interactive shadow-premium overflow-hidden border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#C8A45C] to-[#0B2E58] shadow-sm">
              <ChevronRight className="size-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">
                Chaîne d&apos;approbation
              </CardTitle>
              <CardDescription className="text-xs">Circuit de validation hiérarchique</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {workflow.steps.map((step, idx) => {
              const colors = getStatusColors(step.status)
              const isCompleted = step.status === 'completed' || step.status === 'approved'
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.08 }}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${colors.bg} ${colors.text} ${step.isCurrent ? 'ring-2 ring-offset-1 ring-[#0B2E58]/20 dark:ring-[#3B7DD8]/20' : ''}`}
                  >
                    <div className={`size-1.5 rounded-full ${colors.dot}`} />
                    {step.assigneeRole || step.title}
                  </motion.div>
                  {idx < workflow.steps.length - 1 && (
                    <ChevronRight className={`size-3 ${isCompleted ? 'text-emerald-400' : 'text-muted-foreground/30'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default WorkflowVisualizer
