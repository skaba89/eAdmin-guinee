'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, Plus, CheckCircle2, Clock, AlertCircle,
  ChevronRight, User, MessageSquare, Play, Pause,
  BarChart3, MoreHorizontal, Shield, BookOpen, Scale,
  Landmark, FileSignature, ClipboardCheck, Gavel,
  CircleDot, ArrowRight, Eye, Check,
  Upload, Mail, PenTool, UserCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { BRAND } from '@/lib/constants'
import { useAppStore } from '@/store/app-store'

type WorkflowStepStatus = 'completed' | 'current' | 'pending' | 'rejected'
type WorkflowStatus = 'En cours' | 'En attente' | 'Validé' | 'Planifié'

interface WorkflowStep {
  name: string
  status: WorkflowStepStatus
  assignee: string
  assigneeTitle: string
  date?: string
  action?: string
  reference?: string
  comment?: string
}

interface Workflow {
  id: string
  name: string
  type: string
  typeBadge: string
  status: WorkflowStatus
  totalSteps: number
  progress: number
  steps: WorkflowStep[]
  regulatoryReference: string
  comments: { author: string; title: string; text: string; date: string }[]
}

const WORKFLOWS: Workflow[] = [
  {
    id: '1', name: 'Approbation budgétaire', type: 'budget', typeBadge: 'Budget', status: 'En cours', totalSteps: 8, progress: 75,
    steps: [
      { name: 'Service demandeur', status: 'completed', assignee: 'M. Abdoulaye Bah', assigneeTitle: 'Chef de Service Budget', date: '2026-04-01', action: 'Soumission de la demande budgétaire', reference: 'Art. 42 du Code Financier' },
      { name: 'Direction financière', status: 'completed', assignee: 'Mme Kadiatou Sylla', assigneeTitle: 'Directrice Financière', date: '2026-04-05', action: 'Avis favorable avec observations', reference: 'Art. 43 du Code Financier' },
      { name: 'Contrôle financier', status: 'completed', assignee: 'M. Ibrahima Sow', assigneeTitle: 'Contrôleur Financier', date: '2026-04-10', action: 'Visa de régularité', reference: 'Art. 45 du Code Financier' },
      { name: 'Secrétariat Général', status: 'completed', assignee: 'Mme Mariama Condé', assigneeTitle: 'Secrétaire Général', date: '2026-04-15', action: 'Transmission au Ministre', reference: 'Art. 12 du Décret organique' },
      { name: 'Ministre', status: 'completed', assignee: 'S.E. M. Alpha Condé', assigneeTitle: 'Ministre de l\'Économie et des Finances', date: '2026-04-20', action: 'Approbation ministérielle', reference: 'Art. 46 du Code Financier' },
      { name: 'Premier Ministre', status: 'current', assignee: 'S.E. M. Bernard Goumou', assigneeTitle: 'Premier Ministre', action: 'En attente de visa', reference: 'Art. 47 du Code Financier' },
      { name: 'Présidence', status: 'pending', assignee: 'S.E. le Président', assigneeTitle: 'Président de la République', reference: 'Art. 48 du Code Financier' },
      { name: 'Notification', status: 'pending', assignee: 'SGG', assigneeTitle: 'Secrétariat Général du Gouvernement', reference: 'Art. 50 du Code Financier' },
    ],
    regulatoryReference: 'Conforme à l\'article 45 du Code des Marchés Publics',
    comments: [
      { author: 'Mme Kadiatou Sylla', title: 'Directrice Financière', text: 'Avis favorable. Quelques ajustements nécessaires sur le chapitre 3 — voir note jointe.', date: '2026-04-05 16:00' },
      { author: 'M. Ibrahima Sow', title: 'Contrôleur Financier', text: 'Visa de régularité accordé. Conformité vérifiée avec le budget initial.', date: '2026-04-10 10:30' },
      { author: 'S.E. M. Alpha Condé', title: 'Ministre', text: 'Approuvé. Transmission à la Primature pour visa.', date: '2026-04-20 09:00' },
    ],
  },
  {
    id: '2', name: 'Marché public', type: 'marche', typeBadge: 'Marché', status: 'En attente', totalSteps: 6, progress: 50,
    steps: [
      { name: 'Soumission', status: 'completed', assignee: 'M. Moussa Keïta', assigneeTitle: 'Chef de Service Marchés', date: '2026-03-15', action: 'Dossier soumis', reference: 'Art. 20 du Code des Marchés Publics' },
      { name: 'Commission d\'évaluation', status: 'completed', assignee: 'Commission CAO', assigneeTitle: 'Commission d\'Appel d\'Offres', date: '2026-03-25', action: 'Rapport d\'évaluation', reference: 'Art. 25 du Code des Marchés Publics' },
      { name: 'Direction marchés', status: 'current', assignee: 'Mme Aminata Touré', assigneeTitle: 'Directrice des Marchés Publics', action: 'En cours de revue', reference: 'Art. 30 du Code des Marchés Publics' },
      { name: 'Autorité contractante', status: 'pending', assignee: 'M. Mamadou Baldé', assigneeTitle: 'Autorité Contractante', reference: 'Art. 35 du Code des Marchés Publics' },
      { name: 'Contrôle financier', status: 'pending', assignee: 'M. Ibrahima Sow', assigneeTitle: 'Contrôleur Financier', reference: 'Art. 40 du Code des Marchés Publics' },
      { name: 'Notification', status: 'pending', assignee: 'SGG', assigneeTitle: 'Secrétariat Général du Gouvernement', reference: 'Art. 45 du Code des Marchés Publics' },
    ],
    regulatoryReference: 'Conforme à l\'article 45 du Code des Marchés Publics',
    comments: [
      { author: 'Commission CAO', title: 'Commission d\'Appel d\'Offres', text: 'Trois soumissions reçues. Retenue : Société Guinéenne de BTP. Voir rapport détaillé.', date: '2026-03-25 17:00' },
    ],
  },
  {
    id: '3', name: 'Nomination fonction publique', type: 'nomination', typeBadge: 'Nomination', status: 'Validé', totalSteps: 5, progress: 100,
    steps: [
      { name: 'Proposition', status: 'completed', assignee: 'M. Fatoumata Camara', assigneeTitle: 'Directrice RH', date: '2026-02-01', action: 'Proposition de nomination', reference: 'Art. 15 du Statut Général' },
      { name: 'Direction RH', status: 'completed', assignee: 'M. Djenabou Diallo', assigneeTitle: 'Sous-Directeur RH', date: '2026-02-10', action: 'Avis conforme', reference: 'Art. 18 du Statut Général' },
      { name: 'Secrétariat Général', status: 'completed', assignee: 'Mme Mariama Condé', assigneeTitle: 'Secrétaire Général', date: '2026-02-15', action: 'Visa d\'opportunité', reference: 'Art. 20 du Statut Général' },
      { name: 'Ministre', status: 'completed', assignee: 'S.E. M. François Lonsény Fall', assigneeTitle: 'Ministre de la Fonction Publique', date: '2026-02-20', action: 'Approbation ministérielle', reference: 'Art. 22 du Statut Général' },
      { name: 'Décret présidentiel', status: 'completed', assignee: 'S.E. le Président', assigneeTitle: 'Président de la République', date: '2026-03-01', action: 'Décret signé D/2026/008/PRG/SGG', reference: 'Art. 25 du Statut Général' },
    ],
    regulatoryReference: 'Conforme à l\'article 25 du Statut Général de la Fonction Publique',
    comments: [
      { author: 'Mme Mariama Condé', title: 'Secrétaire Général', text: 'Visa accordé. Dossier complet et conforme. Transmission pour signature présidentielle.', date: '2026-02-15 14:00' },
      { author: 'SGG', title: 'Secrétariat Général du Gouvernement', text: 'Décret signé et promulgué. Publication au Journal Officiel prévue le 05/03/2026.', date: '2026-03-01 10:00' },
    ],
  },
  {
    id: '4', name: 'Circulaire ministérielle', type: 'circulaire', typeBadge: 'Circulaire', status: 'En cours', totalSteps: 4, progress: 60,
    steps: [
      { name: 'Rédaction', status: 'completed', assignee: 'M. Sékou Touré', assigneeTitle: 'Chef de Bureau Rédaction', date: '2026-04-20', action: 'Projet rédigé', reference: 'Circulaire type PM/SGG' },
      { name: 'Visa SG', status: 'completed', assignee: 'Mme Mariama Condé', assigneeTitle: 'Secrétaire Général', date: '2026-04-25', action: 'Visa obtenu avec modifications', reference: 'Art. 12 du Décret organique SG' },
      { name: 'Signature Ministre', status: 'current', assignee: 'S.E. M. le Ministre', assigneeTitle: 'Ministre concerné', action: 'En attente de signature', reference: 'Art. 15 du Décret organique Cabinet' },
      { name: 'Diffusion', status: 'pending', assignee: 'SGG', assigneeTitle: 'Secrétariat Général du Gouvernement', reference: 'Art. 20 du Décret organique SGG' },
    ],
    regulatoryReference: 'Conforme au Décret n°D/2024/001/PRG/SGG portant organisation du SGG',
    comments: [
      { author: 'Mme Mariama Condé', title: 'Secrétaire Général', text: 'Modifications apportées au paragraphe 3. Veuillez revoir la formulation avant transmission au Ministre.', date: '2026-04-25 11:30' },
    ],
  },
  {
    id: '5', name: 'Décret présidentiel', type: 'decret', typeBadge: 'Décret', status: 'En cours', totalSteps: 7, progress: 40,
    steps: [
      { name: 'Projet', status: 'completed', assignee: 'Cabinet ministériel', assigneeTitle: 'Conseiller Technique', date: '2026-04-01', action: 'Projet de décret initié', reference: 'Art. 50 de la Constitution' },
      { name: 'Consultation juridique', status: 'completed', assignee: 'M. Moussa Condé', assigneeTitle: 'Directeur des Affaires Juridiques', date: '2026-04-10', action: 'Avis juridique favorable', reference: 'Art. 52 de la Constitution' },
      { name: 'Visa SGG', status: 'current', assignee: 'M. le Secrétaire Général', assigneeTitle: 'Secrétaire Général du Gouvernement', action: 'En attente de visa', reference: 'Art. 55 de la Constitution' },
      { name: 'Conseil des Ministres', status: 'pending', assignee: 'Conseil des Ministres', assigneeTitle: 'Présidence de la République', reference: 'Art. 58 de la Constitution' },
      { name: 'Signature Présidentielle', status: 'pending', assignee: 'S.E. le Président', assigneeTitle: 'Président de la République', reference: 'Art. 60 de la Constitution' },
      { name: 'Promulgation', status: 'pending', assignee: 'SGG', assigneeTitle: 'Secrétariat Général du Gouvernement', reference: 'Art. 62 de la Constitution' },
      { name: 'Publication', status: 'pending', assignee: 'Journal Officiel', assigneeTitle: 'Imprimerie Nationale', reference: 'Art. 65 de la Constitution' },
    ],
    regulatoryReference: 'Conforme à l\'article 58 de la Constitution de la République de Guinée',
    comments: [
      { author: 'M. Moussa Condé', title: 'Directeur des Affaires Juridiques', text: 'Avis favorable sous réserve de conformité avec les engagements internationaux de la Guinée. Voir note d\'analyse juridique.', date: '2026-04-10 16:00' },
    ],
  },
  {
    id: '6', name: 'Audit institutionnel', type: 'audit', typeBadge: 'Audit', status: 'Planifié', totalSteps: 5, progress: 0,
    steps: [
      { name: 'Mandat', status: 'pending', assignee: 'Cour des Comptes', assigneeTitle: 'Premier Président', reference: 'Art. 100 de la Loi organique' },
      { name: 'Mission', status: 'pending', assignee: 'Commission d\'audit', assigneeTitle: 'Président de Commission', reference: 'Art. 105 de la Loi organique' },
      { name: 'Rapport préliminaire', status: 'pending', assignee: 'Rapporteur', assigneeTitle: 'Conseiller à la Cour des Comptes', reference: 'Art. 110 de la Loi organique' },
      { name: 'Observations', status: 'pending', assignee: 'Institution auditée', assigneeTitle: 'Ministre concerné', reference: 'Art. 115 de la Loi organique' },
      { name: 'Rapport définitif', status: 'pending', assignee: 'Cour des Comptes', assigneeTitle: 'Premier Président', reference: 'Art. 120 de la Loi organique' },
    ],
    regulatoryReference: 'Conforme à la Loi organique n°LO/2023/001/C relative à la Cour des Comptes',
    comments: [],
  },
]

const TYPE_ICONS: Record<string, React.ElementType> = {
  budget: Landmark,
  marche: ClipboardCheck,
  nomination: User,
  circulaire: BookOpen,
  decret: Scale,
  audit: Gavel,
}

const STATUS_CONFIG: Record<WorkflowStatus, { color: string; icon: React.ElementType }> = {
  'En cours': { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: Play },
  'En attente': { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Pause },
  'Validé': { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  'Planifié': { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: Clock },
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  Budget: 'bg-brand/10 text-brand dark:bg-primary/20 dark:text-primary',
  Marché: 'bg-gold/10 text-gold-foreground dark:bg-gold/20 dark:text-gold',
  Nomination: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Circulaire: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  Décret: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Audit: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function WorkflowPage() {
  const navigate = useAppStore((s) => s.navigate)
  const [workflows, setWorkflows] = useState<Workflow[]>(WORKFLOWS)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [successToast, setSuccessToast] = useState('')

  const handleAdvance = () => {
    if (!selectedWorkflow) return
    const currentStepIndex = selectedWorkflow.steps.findIndex(s => s.status === 'current')
    if (currentStepIndex === -1) return

    const today = new Date().toISOString().split('T')[0]
    const updatedWorkflows = workflows.map(wf => {
      if (wf.id !== selectedWorkflow.id) return wf
      const newSteps = wf.steps.map((step, i) => {
        if (i === currentStepIndex) {
          return { ...step, status: 'completed' as WorkflowStepStatus, date: today, action: `Étape validée le ${today}` }
        }
        if (i === currentStepIndex + 1 && step.status === 'pending') {
          return { ...step, status: 'current' as WorkflowStepStatus }
        }
        return step
      })
      const completedCount = newSteps.filter(s => s.status === 'completed').length
      const newProgress = Math.round((completedCount / wf.totalSteps) * 100)
      const allCompleted = newSteps.every(s => s.status === 'completed')
      return { ...wf, steps: newSteps, progress: newProgress, status: allCompleted ? 'Validé' as WorkflowStatus : wf.status }
    })

    setWorkflows(updatedWorkflows)
    const updated = updatedWorkflows.find(wf => wf.id === selectedWorkflow.id)
    if (updated) setSelectedWorkflow(updated)
    setSuccessToast('Procédure avancée avec succès')
    setTimeout(() => setSuccessToast(''), 4000)
  }

  const handleAddComment = () => {
    if (!selectedWorkflow || !commentText.trim()) return

    const now = new Date()
    const dateStr = `${now.toISOString().split('T')[0]} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const updatedWorkflows = workflows.map(wf => {
      if (wf.id !== selectedWorkflow.id) return wf
      return {
        ...wf,
        comments: [...wf.comments, { author: 'Utilisateur actuel', title: 'Agent', text: commentText.trim(), date: dateStr }],
      }
    })

    setWorkflows(updatedWorkflows)
    const updated = updatedWorkflows.find(wf => wf.id === selectedWorkflow.id)
    if (updated) setSelectedWorkflow(updated)
    setCommentText('')
    setCommentDialogOpen(false)
    setSuccessToast('Commentaire publié avec succès')
    setTimeout(() => setSuccessToast(''), 4000)
  }

  const stats = [
    { label: 'Procédures actives', value: '234', icon: GitBranch, color: 'text-brand dark:text-primary', bg: 'bg-brand/5 dark:bg-primary/10' },
    { label: 'Approuvées ce mois', value: '1 876', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'En cours de validation', value: '412', icon: Clock, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: 'En attente de visa', value: '89', icon: Shield, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand/10 dark:bg-primary/20">
            <GitBranch className="h-6 w-6 text-brand dark:text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand dark:text-primary">Procédures Administratives Réglementaires</h2>
            <p className="text-sm text-muted-foreground">Circuits de validation conformes au Code administratif de la République de Guinée</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
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

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="shadow-sm border-[#C8A45C]/20 dark:border-[#D4B878]/20 bg-gradient-to-r from-[#0B2E58]/[0.02] to-[#C8A45C]/[0.02] dark:from-[#3B7DD8]/[0.05] dark:to-[#D4B878]/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0B2E58] dark:text-white">Actions rapides</CardTitle>
            <CardDescription className="text-xs">Raccourcis vers les modules liés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Nouveau courrier', icon: Mail, color: 'bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white', onClick: () => navigate('courriers') },
                { label: 'Upload document', icon: Upload, color: 'bg-[#3B7DD8] hover:bg-[#3B7DD8]/90 text-white', onClick: () => navigate('ged') },
                { label: 'Demander signature', icon: PenTool, color: 'bg-emerald-600 hover:bg-emerald-600/90 text-white', onClick: () => navigate('signatures') },
                { label: 'Demandes citoyennes', icon: UserCheck, color: 'bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58]', onClick: () => navigate('service-requests') },
              ].map(action => (
                <Button key={action.label} className={`${action.color} h-auto flex-col gap-2 rounded-xl py-4 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]`} onClick={action.onClick}>
                  <action.icon className="size-5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content - Workflow List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Cards */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {workflows.map((wf, i) => {
              const sConfig = STATUS_CONFIG[wf.status]
              const StatusIcon = sConfig.icon
              const TypeIcon = TYPE_ICONS[wf.type] || GitBranch
              const currentStepIndex = wf.steps.findIndex(s => s.status === 'current')
              const completedCount = wf.steps.filter(s => s.status === 'completed').length

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
                          <div className="flex items-center gap-2 mb-1.5">
                            <TypeIcon className="h-4 w-4 text-brand dark:text-primary" />
                            <h3 className="font-semibold text-sm">{wf.name}</h3>
                            <Badge variant="outline" className={`text-[10px] font-semibold ${TYPE_BADGE_COLORS[wf.typeBadge] || 'bg-muted'}`}>
                              {wf.typeBadge}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{completedCount}/{wf.totalSteps} étapes complétées</span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {wf.regulatoryReference}
                            </span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {wf.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Progression</span>
                          <span className="text-xs font-bold text-brand dark:text-primary">{wf.progress}%</span>
                        </div>
                        <Progress value={wf.progress} className="h-2" />
                      </div>

                      {/* Step Pipeline */}
                      <div className="flex items-center gap-0 overflow-x-auto pb-2">
                        {wf.steps.map((step, si) => (
                          <div key={si} className="flex items-center shrink-0">
                            <div className="flex flex-col items-center gap-1 min-w-[80px]">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                step.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                                step.status === 'current' ? 'bg-brand border-brand text-white dark:bg-primary dark:border-primary' :
                                'bg-background border-muted-foreground/30 text-muted-foreground'
                              }`}>
                                {step.status === 'completed' ? (
                                  <Check className="h-4 w-4" />
                                ) : step.status === 'current' ? (
                                  <Play className="h-3.5 w-3.5" />
                                ) : (
                                  <CircleDot className="h-3.5 w-3.5" />
                                )}
                              </div>
                              <span className={`text-[9px] text-center leading-tight max-w-[80px] ${
                                step.status === 'current' ? 'font-semibold text-brand dark:text-primary' :
                                step.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
                                'text-muted-foreground'
                              }`}>
                                {step.name}
                              </span>
                              <span className="text-[8px] text-muted-foreground text-center truncate max-w-[80px]">
                                {step.assignee}
                              </span>
                            </div>
                            {si < wf.steps.length - 1 && (
                              <div className={`w-6 h-0.5 mb-6 ${
                                step.status === 'completed' && wf.steps[si + 1]?.status !== 'pending' ? 'bg-emerald-400 dark:bg-emerald-600' :
                                step.status === 'completed' ? 'bg-emerald-300 dark:bg-emerald-700' :
                                'bg-muted-foreground/20'
                              }`} />
                            )}
                          </div>
                        ))}
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
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] font-semibold ${TYPE_BADGE_COLORS[selectedWorkflow.typeBadge] || 'bg-muted'}`}>
                      {selectedWorkflow.typeBadge}
                    </Badge>
                    <Badge className={`text-[10px] font-medium ${STATUS_CONFIG[selectedWorkflow.status].color}`}>
                      {selectedWorkflow.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{selectedWorkflow.name}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {selectedWorkflow.regulatoryReference}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Timeline */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Chronologie réglementaire</h4>
                    <div className="space-y-0 max-h-[400px] overflow-y-auto pr-1">
                      {selectedWorkflow.steps.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                              step.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                              step.status === 'current' ? 'bg-brand border-brand text-white dark:bg-primary dark:border-primary' :
                              'bg-background border-muted-foreground/30 text-muted-foreground'
                            }`}>
                              {step.status === 'completed' ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : step.status === 'current' ? (
                                <Play className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                            </div>
                            {i < selectedWorkflow.steps.length - 1 && (
                              <div className={`w-0.5 h-10 ${
                                step.status === 'completed' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-muted-foreground/20'
                              }`} />
                            )}
                          </div>
                          <div className="pb-4 flex-1 min-w-0">
                            <p className={`text-sm font-medium ${step.status === 'current' ? 'text-brand dark:text-primary' : ''}`}>
                              {step.name}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{step.assignee}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{step.assigneeTitle}</p>
                            {step.action && (
                              <p className="text-[10px] text-brand dark:text-primary mt-1 font-medium">{step.action}</p>
                            )}
                            {step.date && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{step.date}</p>
                            )}
                            {step.reference && (
                              <p className="text-[9px] text-gold mt-0.5 flex items-center gap-0.5">
                                <Scale className="h-2.5 w-2.5" />
                                {step.reference}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Comments */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Commentaires officiels ({selectedWorkflow.comments.length})</h4>
                    {selectedWorkflow.comments.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {selectedWorkflow.comments.map((comment, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/50 border border-muted">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <span className="text-xs font-medium">{comment.author}</span>
                                <span className="text-[10px] text-muted-foreground ml-1.5">— {comment.title}</span>
                              </div>
                              <span className="text-[9px] text-muted-foreground">{comment.date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">Aucun commentaire officiel</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90 gap-1" onClick={handleAdvance} disabled={!selectedWorkflow.steps.some(s => s.status === 'current')}>
                      <Play className="h-3.5 w-3.5" />
                      Avancer
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setCommentDialogOpen(true)}>
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
                <p className="text-sm text-muted-foreground">Sélectionnez une procédure pour voir les détails</p>
                <p className="text-xs text-muted-foreground mt-1">Circuit de validation et chronologie réglementaire</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un commentaire officiel</DialogTitle>
            <DialogDescription>
              Publiez un commentaire dans le registre officiel de cette procédure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment-author">Auteur</Label>
              <Input id="comment-author" value="Utilisateur actuel" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment-text">Commentaire</Label>
              <Textarea
                id="comment-text"
                placeholder="Rédigez votre commentaire officiel..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentDialogOpen(false)}>Annuler</Button>
            <Button className="bg-brand hover:bg-brand/90 dark:bg-primary dark:hover:bg-primary/90" onClick={handleAddComment} disabled={!commentText.trim()}>
              Publier le commentaire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-white text-sm font-medium shadow-lg"
          >
            <CheckCircle2 className="h-4 w-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
