'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Maximize, Volume2, VolumeX,
  SkipBack, SkipForward, X, RotateCcw, Check,
  ChevronRight, MousePointer, Eye, Clock, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/app-store'

// ─── WALKTHROUGH CHAPTERS ─────────────────────────────────────────────────
// Each chapter = a step in the guided demo with detailed feature showcase

interface WalkthroughStep {
  id: number
  chapter: string
  title: string
  subtitle: string
  duration: number // ms
  bg: string
  features: { label: string; desc: string; highlight?: boolean }[]
  // Visual content type for the slide
  contentType: 'login' | 'dashboard' | 'ged' | 'courriers' | 'workflow' | 'signatures' | 'citizen' | 'services' | 'treatment' | 'admin' | 'security' | 'analytics' | 'onboarding'
  // Navigation hint
  navHint?: string
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  // ═══════════════ 1. INTRODUCTION ═══════════════
  {
    id: 0,
    chapter: 'Introduction',
    title: 'Bienvenue dans eAdministration Suite Guinea',
    subtitle: 'Guide complet de démonstration — 13 étapes pour découvrir toutes les fonctionnalités',
    duration: 8000,
    bg: 'from-[#0B2E58] via-[#134A8E] to-[#0B2E58]',
    contentType: 'onboarding',
    features: [
      { label: 'Plateforme GovTech complète', desc: '7 modules intégrés pour digitaliser l\'administration guinéenne' },
      { label: '28 services publics en ligne', desc: 'De l\'état civil à la fiscalité, tous vos démarches numérisées' },
      { label: '6 profils utilisateur', desc: 'Du citoyen au Secrétaire Général, chaque rôle a son espace dédié' },
    ],
    navHint: 'Cliquez sur Play ou utilisez les flèches pour naviguer',
  },
  // ═══════════════ 2. CONNEXION ═══════════════
  {
    id: 1,
    chapter: 'Étape 1',
    title: 'Connexion multi-profils',
    subtitle: '6 comptes de démonstration prêts à l\'emploi pour tester chaque rôle',
    duration: 12000,
    bg: 'from-[#0B2E58] via-[#071D3A] to-[#134A8E]',
    contentType: 'login',
    features: [
      { label: 'Citoyen', desc: 'Portail citoyen, demandes de documents, suivi en temps réel', highlight: true },
      { label: 'Agent', desc: 'Traitement des demandes, vérification des pièces, notes internes' },
      { label: 'Chef de Service', desc: 'Validation, supervision des agents, rapports de service' },
      { label: 'Directeur', desc: 'Tableaux de bord, KPIs, décisions stratégiques' },
      { label: 'Administrateur', desc: 'Gestion système, utilisateurs, configuration' },
      { label: 'Secrétaire Général', desc: 'Vue d\'ensemble gouvernementale, visas, courriers prioritaires' },
    ],
    navHint: 'Sur la page de connexion, cliquez sur un compte démo',
  },
  // ═══════════════ 3. TABLEAU DE BORD ═══════════════
  {
    id: 2,
    chapter: 'Étape 2',
    title: 'Tableau de bord décisionnel',
    subtitle: 'Vue 360° de l\'activité administrative en temps réel',
    duration: 12000,
    bg: 'from-[#0B2E58] via-[#0D3A70] to-[#0B2E58]',
    contentType: 'dashboard',
    features: [
      { label: '8 KPIs en temps réel', desc: 'Courriers, documents, workflows, satisfaction citoyenne', highlight: true },
      { label: 'Graphiques interactifs', desc: 'Tendances mensuelles, répartition par institution' },
      { label: 'Progression PND 2025-2030', desc: 'Suivi des 4 axes du Plan National de Développement' },
      { label: 'Actions rapides', desc: 'Accès direct aux tâches prioritaires' },
      { label: 'Flux d\'activité', desc: 'Dernières actions sur la plateforme en temps réel' },
    ],
    navHint: 'Le dashboard s\'adapte au profil connecté',
  },
  // ═══════════════ 4. GED ═══════════════
  {
    id: 3,
    chapter: 'Étape 3',
    title: 'Gestion Électronique des Documents (GED)',
    subtitle: 'Archivage souverain et classification intelligente de la documentation de l\'État',
    duration: 12000,
    bg: 'from-[#071D3A] via-[#0B2E58] to-[#134A8E]',
    contentType: 'ged',
    features: [
      { label: '15 documents démo', desc: 'Décrets, arrêtés, circulaires, notes de service avec classification' },
      { label: '5 niveaux de classification', desc: 'PUBLIC, DIFFUSION RESTREINTE, CONFIDENTIEL, SECRET, TRÈS SECRET', highlight: true },
      { label: 'Actions fonctionnelles', desc: 'Consulter, Télécharger, Archiver, Reclassifier, Supprimer' },
      { label: 'Filtrage par institution', desc: '24 institutions guinéennes dans le sidebar' },
      { label: 'Classification IA', desc: 'Suggestion automatique du niveau de confidentialité' },
    ],
    navHint: 'Cliquez sur "..." pour voir toutes les actions disponibles',
  },
  // ═══════════════ 5. COURRIERS ═══════════════
  {
    id: 4,
    chapter: 'Étape 4',
    title: 'Courriers officiels interministériels',
    subtitle: 'Circuit complet de visa, validation et diffusion des courriers de l\'État',
    duration: 12000,
    bg: 'from-[#134A8E] via-[#0B2E58] to-[#071D3A]',
    contentType: 'courriers',
    features: [
      { label: 'Entrants & Sortants', desc: 'Onglets séparés avec indicateurs de priorité', highlight: true },
      { label: '12 courriers démo', desc: 'Urgent, Important, Normal — avec circuit de visa complet' },
      { label: 'Circuit de validation', desc: 'Rédaction → Visa SG → Ministre → Diffusion' },
      { label: 'SLA & Délais', desc: 'Suivi des délais de traitement avec alertes' },
      { label: 'Actions complètes', desc: 'Consulter, Viser, Transférer, Traiter, Archiver' },
    ],
    navHint: 'Les badges de priorité (URGENT) sont en rouge',
  },
  // ═══════════════ 6. WORKFLOWS ═══════════════
  {
    id: 5,
    chapter: 'Étape 5',
    title: 'Workflows & Automatisation',
    subtitle: 'Automatisation des procédures administratives selon la réglementation guinéenne',
    duration: 10000,
    bg: 'from-[#0B2E58] via-[#009460]/30 to-[#0B2E58]',
    contentType: 'workflow',
    features: [
      { label: '6 workflows préconfigurés', desc: 'Visa courrier, Demande congé, Appro budget, Recrutement, Marché public, Publication JO' },
      { label: 'Pipeline visuel', desc: 'Étapes colorées : En attente, En cours, Approuvé, Rejeté' },
      { label: 'Drag & Drop', desc: 'Réorganisez les étapes par glisser-déposer' },
      { label: 'Rôles assignés', desc: 'Chaque étape est attribuée à un rôle spécifique' },
    ],
    navHint: 'Créez un nouveau workflow avec le bouton "+"',
  },
  // ═══════════════ 7. SIGNATURES ═══════════════
  {
    id: 6,
    chapter: 'Étape 6',
    title: 'Signature électronique',
    subtitle: 'Valeur juridique conforme au Décret D/2022/PRG/SGG',
    duration: 10000,
    bg: 'from-[#0B2E58] via-[#C8A45C]/20 to-[#0B2E58]',
    contentType: 'signatures',
    features: [
      { label: '8 demandes de signature', desc: 'Décrets, arrêtés, contrats en attente ou signés' },
      { label: 'Signer / Refuser', desc: 'Actions fonctionnelles avec motif de refus', highlight: true },
      { label: 'QR Code de vérification', desc: 'Code unique pour vérifier l\'authenticité' },
      { label: 'Empreinte numérique', desc: 'Hash SHA-256 pour garantie d\'intégrité' },
      { label: 'Conformité légale', desc: 'Décret n°D/2022/PRG/SGG sur la signature électronique' },
    ],
    navHint: 'Le QR code apparaît après signature',
  },
  // ═══════════════ 8. PORTAIL CITOYEN ═══════════════
  {
    id: 7,
    chapter: 'Étape 7',
    title: 'Portail Citoyen — Guinée Services',
    subtitle: '124 500 citoyens inscrits — 28 services publics en ligne',
    duration: 14000,
    bg: 'from-[#0B2E58] via-[#009460]/40 to-[#0B2E58]',
    contentType: 'citizen',
    features: [
      { label: '9 catégories de services', desc: 'État Civil, Justice, Identification, Urbanisme, Entreprise, Éducation, Santé, Résidence, Fiscalité' },
      { label: '28 services complets', desc: 'Chaque service avec prix, délai, pièces justificatives', highlight: true },
      { label: 'Formulaire de demande', desc: 'Nom, NIN, téléphone, adresse, mode de livraison' },
      { label: 'Suivi en temps réel', desc: 'Timeline visuelle : Soumission → Traitement → Livraison' },
      { label: 'Aperçu document type', desc: 'Visualisez le document officiel avant de faire la demande' },
      { label: '3 modes de livraison', desc: 'En ligne, au guichet, par courrier' },
    ],
    navHint: 'Cliquez "Voir le document type" pour prévisualiser',
  },
  // ═══════════════ 9. 28 SERVICES ═══════════════
  {
    id: 8,
    chapter: 'Étape 8',
    title: 'Les 28 Services Publics en détail',
    subtitle: 'Chaque service produit un document sécurisé avec filigrane et signature numérique',
    duration: 14000,
    bg: 'from-[#0B2E58] via-[#C8A45C]/15 to-[#0B2E58]',
    contentType: 'services',
    features: [
      { label: 'État Civil (5)', desc: 'Naissance, mariage, décès, nationalité, déclaration' },
      { label: 'Justice (3)', desc: 'Casier judiciaire, non-poursuite, légalisation' },
      { label: 'Identification (3)', desc: 'CNI biométrique, passeport, permis conduire' },
      { label: 'Urbanisme (3)', desc: 'Permis construire, lotir, conformité' },
      { label: 'Entreprise (3)', desc: 'APIP, RCCM, licence importation' },
      { label: 'Éducation (3)', desc: 'Scolarité, diplôme, équivalence' },
      { label: 'Santé (3)', desc: 'Vaccination, carte sanitaire, aptitude' },
      { label: 'Résidence (2)', desc: 'Certificat, attestation de domicile' },
      { label: 'Fiscalité (3)', desc: 'Quitus fiscal, déclaration, extrait de rôle' },
    ],
    navHint: 'Recherchez un service par mot-clé',
  },
  // ═══════════════ 10. TRAITEMENT DES DEMANDES ═══════════════
  {
    id: 9,
    chapter: 'Étape 9',
    title: 'Traitement des demandes citoyennes',
    subtitle: 'Workflow complet côté agent : réception → traitement → livraison',
    duration: 12000,
    bg: 'from-[#0B2E58] via-[#134A8E] to-[#0B2E58]',
    contentType: 'treatment',
    features: [
      { label: '28 demandes démo', desc: 'Couvrant tous les statuts et tous les services', highlight: true },
      { label: '7 statuts possibles', desc: 'Soumise → En cours → Pièces complémentaires → Validée → Prête → Livrée / Rejetée' },
      { label: 'Prendre en charge', desc: 'L\'agent s\'assigne la demande et démarre le traitement' },
      { label: 'Demander pièces', desc: 'Notifier le citoyen des documents manquants' },
      { label: 'Valider & Livrer', desc: 'Valider, marquer prêt, choisir le mode de livraison' },
      { label: 'Aperçu document délivré', desc: 'Visualiser le document officiel généré avec données du citoyen' },
    ],
    navHint: 'Les demandes soumises ont un bouton "Prendre en charge"',
  },
  // ═══════════════ 11. DOCUMENTS SÉCURISÉS ═══════════════
  {
    id: 10,
    chapter: 'Étape 10',
    title: 'Documents sécurisés & officiels',
    subtitle: 'Chaque document produit est conforme aux normes administratives guinéennes',
    duration: 12000,
    bg: 'from-[#0B2E58] via-[#CE1126]/15 to-[#0B2E58]',
    contentType: 'security',
    features: [
      { label: 'En-tête République de Guinée', desc: 'Avec devise "Travail - Justice - Solidarité" et barre tricolore' },
      { label: 'Filigrane de sécurité', desc: 'Watermark "RÉPUBLIQUE DE GUINÉE" en arrière-plan', highlight: true },
      { label: '3 niveaux de sécurité', desc: 'PUBLIC, OFFICIEL, CONFIDENTIEL — avec badge de classification' },
      { label: 'Références légales', desc: 'Code de la Famille, Code Pénal, Décrets, Ordonnances' },
      { label: 'Signature numérique', desc: 'Indicateur de signature électronique avec hash SHA-256' },
      { label: 'QR de vérification', desc: 'Code QR pour vérification d\'authenticité du document' },
    ],
    navHint: 'Visualisez les documents dans le Portail Citoyen ou Traitement des demandes',
  },
  // ═══════════════ 12. ANALYTICS & ADMIN ═══════════════
  {
    id: 11,
    chapter: 'Étape 11',
    title: 'Analytics & Administration',
    subtitle: 'Supervision système et indicateurs de performance pour les dirigeants',
    duration: 10000,
    bg: 'from-[#134A8E] via-[#0B2E58] to-[#071D3A]',
    contentType: 'analytics',
    features: [
      { label: 'Dashboard analytique', desc: 'Graphiques multi-dimensionnels, KPIs, tendances régionales' },
      { label: 'Gestion utilisateurs', desc: '12 comptes démo avec rôles, institutions, statuts' },
      { label: 'Administration système', desc: 'Santé serveur, stockage, modules, clés API' },
      { label: 'Audit Logs', desc: 'Trçabilité complète de chaque action avec export CSV' },
      { label: 'Notifications', desc: '15 notifications démo avec filtres par type' },
    ],
    navHint: 'Accès réservé aux profils Admin et Directeur',
  },
  // ═══════════════ 13. CONCLUSION ═══════════════
  {
    id: 12,
    chapter: 'Conclusion',
    title: 'Prêt à digitaliser votre administration',
    subtitle: 'eAdministration Suite — La plateforme GovTech pour la Guinée et l\'Afrique',
    duration: 10000,
    bg: 'from-[#CE1126]/20 via-[#FCD116]/15 via-[#009460]/20 to-[#0B2E58]',
    contentType: 'onboarding',
    features: [
      { label: 'Essayer maintenant', desc: '6 comptes démo pour tester immédiatement la plateforme', highlight: true },
      { label: 'Déployé pour la Guinée', desc: '8 régions, 24 institutions, 124 500 citoyens inscrits' },
      { label: 'Conforme réglementation', desc: 'Loi L/2016/018, Décret signature, Code administratif' },
      { label: 'DataSphere Innovation', desc: 'Partenaire technologique de l\'État guinéen' },
    ],
    navHint: 'Cliquez "Essayer la plateforme" pour commencer',
  },
]

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────
export function FeatureWalkthroughPlayer() {
  const navigate = useAppStore((s) => s.navigate)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)
  const [showChapterList, setShowChapterList] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalDuration = WALKTHROUGH_STEPS.reduce((acc, s) => acc + s.duration, 0)
  const step = WALKTHROUGH_STEPS[currentStep]

  const startPlayback = useCallback(() => {
    if (!hasStarted) setHasStarted(true)
    setIsPlaying(true)
  }, [hasStarted])

  const togglePlay = useCallback(() => {
    if (!hasStarted) { startPlayback(); return }
    setIsPlaying(prev => !prev)
  }, [hasStarted, startPlayback])

  const reset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep(0)
    setProgress(0)
  }, [])

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= WALKTHROUGH_STEPS.length) return
    if (!hasStarted) setHasStarted(true)
    // Calculate progress for the start of this step
    let p = 0
    for (let i = 0; i < index; i++) p += (WALKTHROUGH_STEPS[i].duration / totalDuration) * 100
    setProgress(p)
    setCurrentStep(index)
  }, [hasStarted, totalDuration])

  const goNext = useCallback(() => {
    if (currentStep < WALKTHROUGH_STEPS.length - 1) goToStep(currentStep + 1)
  }, [currentStep, goToStep])

  const goPrev = useCallback(() => {
    if (currentStep > 0) goToStep(currentStep - 1)
  }, [currentStep, goToStep])

  // Progress advancement
  useEffect(() => {
    if (isPlaying) {
      const interval = 50
      timerRef.current = setInterval(() => {
        setProgress(prev => {
          const next = prev + (interval / totalDuration) * 100
          if (next >= 100) { setIsPlaying(false); return 100 }
          return next
        })
      }, interval)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, totalDuration])

  // Determine current step from progress
  useEffect(() => {
    let accumulated = 0
    for (let i = 0; i < WALKTHROUGH_STEPS.length; i++) {
      accumulated += (WALKTHROUGH_STEPS[i].duration / totalDuration) * 100
      if (progress < accumulated) { setCurrentStep(i); break }
      if (i === WALKTHROUGH_STEPS.length - 1) setCurrentStep(i)
    }
  }, [progress, totalDuration])

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isPlaying) {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000)
    }
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current) }
  }, [showControls, isPlaying])

  const handleMouseMove = () => setShowControls(true)

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setProgress(Math.max(0, Math.min(100, pct)))
    if (!hasStarted) { setHasStarted(true); setIsPlaying(true) }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const formatTime = (pct: number) => {
    const totalSec = Math.floor((pct / 100) * (totalDuration / 1000))
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  // Step markers on progress bar
  const stepMarkers = WALKTHROUGH_STEPS.map((s, i) => {
    let pos = 0
    for (let j = 0; j < i; j++) pos += (WALKTHROUGH_STEPS[j].duration / totalDuration) * 100
    return { id: s.id, position: pos, chapter: s.chapter }
  })

  return (
    <div
      ref={containerRef}
      className={cn('relative rounded-2xl overflow-hidden bg-black group', isFullscreen && 'rounded-none')}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* ═══════════════════ VIDEO DISPLAY ═══════════════════ */}
      <div className="relative aspect-video">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.5 }}
            className={cn('absolute inset-0 bg-gradient-to-br flex flex-col p-6 sm:p-8 text-white overflow-hidden', step.bg)}
          >
            {/* Decorative blurs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/[0.02] blur-3xl" />
            </div>

            {/* Guinea tricolor top bar */}
            <div className="absolute top-0 left-0 right-0 flex h-1.5">
              <div className="flex-1" style={{ backgroundColor: '#CE1126' }} />
              <div className="flex-1" style={{ backgroundColor: '#FCD116' }} />
              <div className="flex-1" style={{ backgroundColor: '#009460' }} />
            </div>

            {/* Subtle particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-white/20"
                  style={{ left: `${15 + i * 16}%`, top: `${20 + (i % 3) * 25}%` }}
                  animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}
            </div>

            {/* ═══════ CONTENT LAYOUT ═══════ */}
            <div className="relative z-10 flex-1 flex flex-col sm:flex-row gap-6 overflow-hidden">
              {/* LEFT: Title + Features */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                {/* Chapter badge */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Badge className="bg-white/10 text-white/80 border-white/20 text-xs mb-3 backdrop-blur-sm">
                    <Sparkles className="size-3 mr-1 text-[#C8A45C]" />
                    {step.chapter} — {currentStep + 1}/{WALKTHROUGH_STEPS.length}
                  </Badge>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl sm:text-3xl font-bold mb-2 leading-tight"
                >
                  {step.title}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-white/60 text-sm mb-5"
                >
                  {step.subtitle}
                </motion.p>

                {/* Features list */}
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2 scrollbar-thin">
                  {step.features.map((feat, i) => (
                    <motion.div
                      key={feat.label}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className={cn(
                        'flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors',
                        feat.highlight ? 'bg-[#C8A45C]/15 border border-[#C8A45C]/30' : 'bg-white/5'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                        feat.highlight ? 'bg-[#C8A45C] text-[#0B2E58]' : 'bg-white/10 text-white/60'
                      )}>
                        {feat.highlight ? <Sparkles className="size-3" /> : <Check className="size-3" />}
                      </div>
                      <div className="min-w-0">
                        <p className={cn('text-xs font-semibold leading-tight', feat.highlight && 'text-[#C8A45C]')}>
                          {feat.label}
                        </p>
                        <p className="text-[11px] text-white/50 leading-tight mt-0.5">{feat.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Visual demo mockup */}
              <div className="hidden sm:flex w-[340px] lg:w-[400px] flex-col justify-center shrink-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-black/30 backdrop-blur-sm rounded-xl border border-white/10 p-4 space-y-3"
                >
                  {/* Mock browser bar */}
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                    </div>
                    <div className="flex-1 h-5 rounded bg-white/5 flex items-center px-2">
                      <span className="text-[9px] text-white/30 font-mono truncate">
                        {step.contentType === 'login' ? 'app.eadmin.gov.gn/login' :
                         step.contentType === 'dashboard' ? 'app.eadmin.gov.gn/dashboard' :
                         step.contentType === 'ged' ? 'app.eadmin.gov.gn/documents' :
                         step.contentType === 'courriers' ? 'app.eadmin.gov.gn/courriers' :
                         step.contentType === 'workflow' ? 'app.eadmin.gov.gn/workflows' :
                         step.contentType === 'signatures' ? 'app.eadmin.gov.gn/signatures' :
                         step.contentType === 'citizen' ? 'app.eadmin.gov.gn/portail-citoyen' :
                         step.contentType === 'services' ? 'services.gov.gn' :
                         step.contentType === 'treatment' ? 'app.eadmin.gov.gn/traitement-demandes' :
                         step.contentType === 'analytics' ? 'app.eadmin.gov.gn/analytics' :
                         step.contentType === 'security' ? 'app.eadmin.gov.gn/documents/secure' :
                         'app.eadmin.gov.gn'}
                      </span>
                    </div>
                  </div>

                  {/* Mock content based on type */}
                  {step.contentType === 'dashboard' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { v: '14 250', l: 'Courriers', c: 'text-[#C8A45C]' },
                          { v: '87 450', l: 'Documents', c: 'text-emerald-400' },
                          { v: '234', l: 'Workflows', c: 'text-sky-400' },
                          { v: '94%', l: 'Satisfaction', c: 'text-[#C8A45C]' },
                        ].map(kpi => (
                          <div key={kpi.l} className="bg-white/5 rounded-lg p-2 text-center">
                            <p className={cn('text-sm font-bold', kpi.c)}>{kpi.v}</p>
                            <p className="text-[8px] text-white/40">{kpi.l}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-end gap-0.5 h-12 pt-1">
                        {[35,42,38,56,62,58,45,50,67,72,78,85].map((h, i) => (
                          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.7 + i * 0.04, duration: 0.3 }} className="flex-1 rounded-t bg-[#C8A45C]/60" />
                        ))}
                      </div>
                    </div>
                  )}

                  {step.contentType === 'login' && (
                    <div className="space-y-2">
                      <div className="bg-white/5 rounded-lg p-3 space-y-2">
                        <div className="h-6 bg-white/10 rounded" />
                        <div className="h-6 bg-white/10 rounded" />
                        <div className="h-7 bg-[#C8A45C]/40 rounded flex items-center justify-center">
                          <span className="text-[9px] text-white/80 font-medium">Se connecter</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {['Citoyen', 'Agent', 'Admin', 'Chef S.', 'Direct.', 'SG'].map(role => (
                          <div key={role} className="bg-white/5 rounded p-1.5 text-center">
                            <div className="w-4 h-4 rounded-full bg-white/10 mx-auto mb-0.5" />
                            <span className="text-[7px] text-white/40">{role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {step.contentType === 'ged' && (
                    <div className="space-y-1.5">
                      {[
                        { n: 'Décret Présidentiel', c: 'CONFIDENTIEL', cl: 'bg-red-500/30 text-red-300' },
                        { n: 'Arrêté Ministériel', c: 'DIFFUSION RESTREINTE', cl: 'bg-orange-500/30 text-orange-300' },
                        { n: 'Note de Service', c: 'PUBLIC', cl: 'bg-emerald-500/30 text-emerald-300' },
                      ].map(doc => (
                        <div key={doc.n} className="bg-white/5 rounded-lg p-2 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-medium text-white/80">{doc.n}</p>
                            <p className="text-[8px] text-white/30">24 Jan 2026</p>
                          </div>
                          <span className={cn('px-1.5 py-0.5 rounded text-[7px] font-bold', doc.cl)}>{doc.c}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.contentType === 'courriers' && (
                    <div className="space-y-1.5">
                      {[
                        { ref: 'CR-2026-8721', s: 'Visa SG en attente', p: 'URGENT', pc: 'bg-red-500/30 text-red-300' },
                        { ref: 'CR-2026-8720', s: 'En validation', p: 'IMPORTANT', pc: 'bg-orange-500/30 text-orange-300' },
                        { ref: 'CR-2026-8719', s: 'Diffusée', p: 'NORMAL', pc: 'bg-white/10 text-white/50' },
                      ].map(c => (
                        <div key={c.ref} className="bg-white/5 rounded-lg p-2 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-mono text-[#C8A45C]">{c.ref}</span>
                            <p className="text-[8px] text-white/40">{c.s}</p>
                          </div>
                          <span className={cn('px-1.5 py-0.5 rounded text-[7px] font-bold', c.pc)}>{c.p}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.contentType === 'workflow' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 justify-center">
                        {['Rédaction', 'Visa', 'Ministre', 'Diffusion'].map((s, i) => (
                          <div key={s} className="flex items-center gap-0.5">
                            <div className={cn(
                              'px-1.5 py-1 rounded text-[7px] font-medium border',
                              i < 2 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
                              i === 2 ? 'bg-[#C8A45C]/20 border-[#C8A45C]/30 text-[#C8A45C]' :
                              'bg-white/5 border-white/10 text-white/30'
                            )}>{s}</div>
                            {i < 3 && <div className={cn('w-2 h-0.5', i < 2 ? 'bg-emerald-500/40' : 'bg-white/10')} />}
                          </div>
                        ))}
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-white/60">6 workflows actifs</p>
                      </div>
                    </div>
                  )}

                  {step.contentType === 'signatures' && (
                    <div className="space-y-1.5">
                      {[
                        { d: 'Décret n°D/2026/SGG', s: 'Signé', sc: 'text-emerald-400' },
                        { d: 'Contrat FMI', s: 'En attente', sc: 'text-[#C8A45C]' },
                      ].map(sig => (
                        <div key={sig.d} className="bg-white/5 rounded-lg p-2 flex items-center justify-between">
                          <span className="text-[9px] text-white/70">{sig.d}</span>
                          <span className={cn('text-[8px] font-medium', sig.sc)}>{sig.s}</span>
                        </div>
                      ))}
                      <div className="bg-white/5 rounded-lg p-2 flex items-center justify-center gap-2">
                        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                          <span className="text-[7px] text-white/40">QR</span>
                        </div>
                        <span className="text-[8px] text-white/30">Vérification d&apos;authenticité</span>
                      </div>
                    </div>
                  )}

                  {step.contentType === 'citizen' && (
                    <div className="space-y-1.5">
                      <div className="bg-white/5 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-medium text-white/80">Suivi demande</span>
                          <span className="text-[8px] text-emerald-400">En temps réel</span>
                        </div>
                        {['Soumission ✓', 'Vérification ✓', 'Traitement ●', 'Validation', 'Prêt'].map((s, i) => (
                          <div key={s} className="flex items-center gap-1.5 py-0.5">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              i < 2 ? 'bg-emerald-400' : i === 2 ? 'bg-[#C8A45C] animate-pulse' : 'bg-white/20'
                            )} />
                            <span className={cn(
                              'text-[8px]',
                              i < 2 ? 'text-emerald-400' : i === 2 ? 'text-[#C8A45C]' : 'text-white/30'
                            )}>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {step.contentType === 'services' && (
                    <div className="space-y-1">
                      <div className="grid grid-cols-3 gap-1">
                        {['État Civil', 'Justice', 'Identif.', 'Urban.', 'Entrpr.', 'Éducation', 'Santé', 'Résid.', 'Fiscalité'].map(cat => (
                          <div key={cat} className="bg-white/5 rounded p-1.5 text-center">
                            <span className="text-[7px] text-white/50">{cat}</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-center pt-1">
                        <span className="text-[8px] text-[#C8A45C] font-bold">28 services en ligne</span>
                      </div>
                    </div>
                  )}

                  {step.contentType === 'treatment' && (
                    <div className="space-y-1.5">
                      {[
                        { s: 'Soumise', c: 'bg-sky-500/30 text-sky-300' },
                        { s: 'En cours', c: 'bg-amber-500/30 text-amber-300' },
                        { s: 'Prête', c: 'bg-emerald-500/30 text-emerald-300' },
                        { s: 'Livrée', c: 'bg-[#0B2E58]/40 text-[#C8A45C]' },
                      ].map(st => (
                        <div key={st.s} className="bg-white/5 rounded p-1.5 flex items-center justify-between">
                          <span className="text-[8px] text-white/60">{st.s}</span>
                          <span className={cn('px-1.5 py-0.5 rounded text-[7px] font-bold', st.c)}>{Math.floor(Math.random() * 5) + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.contentType === 'security' && (
                    <div className="space-y-1.5">
                      <div className="bg-white/5 rounded-lg p-3 border border-[#C8A45C]/20 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center -rotate-45 pointer-events-none">
                          <span className="text-white/5 text-2xl font-black whitespace-nowrap">RÉPUBLIQUE DE GUINÉE</span>
                        </div>
                        <div className="relative z-10 space-y-1">
                          <div className="flex h-1.5 gap-0">
                            <div className="flex-1 bg-red-500/60" />
                            <div className="flex-1 bg-yellow-500/60" />
                            <div className="flex-1 bg-green-500/60" />
                          </div>
                          <p className="text-[7px] text-white/40 text-center">République de Guinée</p>
                          <p className="text-[9px] font-bold text-center text-white/70">DOCUMENT OFFICIEL</p>
                          <div className="flex items-center justify-center gap-1">
                            <span className="px-1 py-0.5 bg-red-500/30 text-red-300 text-[7px] rounded font-bold">OFFICIEL</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step.contentType === 'analytics' && (
                    <div className="space-y-1.5">
                      <div className="flex items-end gap-0.5 h-10">
                        {[45, 62, 38, 78, 55, 82, 68].map((h, i) => (
                          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.7 + i * 0.05, duration: 0.3 }} className={cn('flex-1 rounded-t', i % 2 === 0 ? 'bg-[#C8A45C]/50' : 'bg-[#0B2E58]/50')} />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="bg-white/5 rounded p-1.5 text-center">
                          <p className="text-[10px] font-bold text-emerald-400">99.2%</p>
                          <p className="text-[7px] text-white/30">Conformité</p>
                        </div>
                        <div className="bg-white/5 rounded p-1.5 text-center">
                          <p className="text-[10px] font-bold text-[#C8A45C]">18/24</p>
                          <p className="text-[7px] text-white/30">Institutions</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {step.contentType === 'onboarding' && (
                    <div className="flex flex-col items-center justify-center py-4 space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-[#C8A45C] flex items-center justify-center">
                        <span className="text-[#0B2E58] font-bold text-lg">eA</span>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold">eAdministration Suite</p>
                        <p className="text-[9px] text-white/40">DataSphere Innovation — Guinée</p>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#CE1126' }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FCD116' }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#009460' }} />
                      </div>
                    </div>
                  )}

                  {/* Navigation hint */}
                  {step.navHint && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                      <MousePointer className="size-3 text-[#C8A45C] shrink-0" />
                      <span className="text-[9px] text-white/40 italic">{step.navHint}</span>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ═══════════════ BIG PLAY BUTTON (before start) ═══════════════ */}
        {!hasStarted && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer"
            onClick={togglePlay}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/30" />
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="relative z-10">
              <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-2xl">
                <Play className="h-10 w-10 text-white ml-1" />
              </div>
            </motion.div>
            <div className="absolute bottom-28 text-center z-10">
              <p className="text-white font-semibold text-lg">Guide pas-à-pas eAdmin Suite</p>
              <p className="text-white/60 text-sm mt-1">
                13 étapes — {Math.floor(totalDuration / 1000 / 60)} min {Math.floor((totalDuration / 1000) % 60)} s
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Eye className="size-3.5 text-[#C8A45C]" />
                <span className="text-xs text-[#C8A45C] font-medium">Démonstration complète des fonctionnalités</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Center click area */}
        {hasStarted && <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay} />}

        {/* Pause indicator */}
        <AnimatePresence>
          {hasStarted && !isPlaying && progress < 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="h-16 w-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finished overlay */}
        <AnimatePresence>
          {progress >= 100 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/60 flex items-center justify-center z-20"
            >
              <div className="text-center">
                <p className="text-white text-xl font-bold mb-1">Démonstration terminée</p>
                <p className="text-white/60 text-sm mb-4">Prêt à transformer votre administration ?</p>
                <div className="flex items-center gap-3 justify-center">
                  <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-colors">
                    <RotateCcw className="h-4 w-4" />Revoir
                  </button>
                  <button onClick={() => navigate('login')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] text-sm font-semibold transition-colors">
                    Essayer la plateforme<ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════ CONTROLS BAR ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: hasStarted && showControls ? 1 : 0, y: hasStarted && showControls ? 0 : 10 }}
          transition={{ duration: 0.2 }}
          className={cn('absolute bottom-0 left-0 right-0 z-30', !hasStarted && 'hidden')}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
          <div className="relative p-3 pt-8">
            {/* Progress bar with chapter markers */}
            <div ref={progressRef} className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-2 group/progress hover:h-2.5 transition-all relative" onClick={handleProgressClick}>
              {/* Chapter markers */}
              {stepMarkers.map(marker => (
                <div
                  key={marker.id}
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/30 z-10"
                  style={{ left: `${marker.position}%` }}
                  title={marker.chapter}
                />
              ))}
              <div className="h-full bg-[#C8A45C] rounded-full relative transition-all" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#C8A45C] opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg" />
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button onClick={goPrev} className="text-white/70 hover:text-white transition-colors" disabled={currentStep === 0}>
                  <SkipBack className="h-4 w-4" />
                </button>
                <button onClick={togglePlay} className="text-white hover:text-[#C8A45C] transition-colors">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <button onClick={goNext} className="text-white/70 hover:text-white transition-colors" disabled={currentStep === WALKTHROUGH_STEPS.length - 1}>
                  <SkipForward className="h-4 w-4" />
                </button>
                <button onClick={() => setIsMuted(!isMuted)} className="text-white/70 hover:text-white transition-colors ml-1">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <span className="text-white/60 text-[10px] ml-2 font-mono">{formatTime(progress)} / {formatTime(100)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-white/10 text-white/60 border-white/10 text-[9px]">
                  {step.chapter}
                </Badge>
                <button onClick={() => setShowChapterList(!showChapterList)} className="text-white/70 hover:text-white transition-colors text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10">
                  Chapitres
                </button>
                <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors">
                  {isFullscreen ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════ CHAPTER LIST SIDEBAR ═══════════════ */}
        <AnimatePresence>
          {showChapterList && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute top-0 right-0 bottom-0 w-64 bg-black/90 backdrop-blur-sm z-40 overflow-y-auto border-l border-white/10"
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-white/80">Chapitres</h3>
                  <button onClick={() => setShowChapterList(false)} className="text-white/40 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  {WALKTHROUGH_STEPS.map((s, i) => {
                    // Calculate start progress for this step
                    let stepStart = 0
                    for (let j = 0; j < i; j++) stepStart += (WALKTHROUGH_STEPS[j].duration / totalDuration) * 100
                    const isCurrentStep = currentStep === i
                    const isCompleted = progress >= stepStart + (s.duration / totalDuration) * 100
                    return (
                      <button
                        key={s.id}
                        onClick={() => { goToStep(i); setShowChapterList(false) }}
                        className={cn(
                          'w-full text-left p-2 rounded-lg transition-colors',
                          isCurrentStep ? 'bg-[#C8A45C]/20 border border-[#C8A45C]/30' : 'hover:bg-white/5'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-[8px] shrink-0',
                            isCompleted ? 'bg-emerald-500 text-white' :
                            isCurrentStep ? 'bg-[#C8A45C] text-[#0B2E58]' :
                            'bg-white/10 text-white/40'
                          )}>
                            {isCompleted ? <Check className="size-3" /> : i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className={cn('text-[10px] font-medium truncate', isCurrentStep ? 'text-[#C8A45C]' : 'text-white/70')}>{s.title}</p>
                            <p className="text-[8px] text-white/30">{Math.floor(s.duration / 1000)}s</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
