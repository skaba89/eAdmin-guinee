'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, SkipForward, SkipBack, Maximize,
  Volume2, VolumeX, ChevronRight, CheckCircle2,
  FileText, Users, Shield, Zap, BarChart3, Mail,
  PenTool, Search, Globe, Clock, Star, ArrowRight,
  Monitor, Smartphone, Cloud, Lock, Eye, MousePointerClick
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Demo video scenes/chapters
const scenes = [
  {
    id: 'intro',
    title: 'Introduction',
    duration: 8000,
    icon: Globe,
    subtitle: 'Bienvenue sur eAdmin Guinée',
    description: 'La plateforme GovTech de référence pour la transformation numérique de l\'administration publique guinéenne. Découvrez comment notre suite révolutionne la gestion administrative.',
    bgGradient: 'from-[#CE1126] via-[#8B0A1A] to-[#CE1126]',
    mockup: 'hero',
    features: ['7 modules intégrés', '28 services publics', '9 catégories de services'],
  },
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    duration: 10000,
    icon: BarChart3,
    subtitle: 'Centre de commandement présidentiel',
    description: 'Un tableau de bord interactif avec des indicateurs clés en temps réel, des graphiques dynamiques et un suivi des performances de l\'administration.',
    bgGradient: 'from-[#0B2E58] via-[#134A8E] to-[#0B2E58]',
    mockup: 'dashboard',
    features: ['KPI en temps réel', 'Graphiques interactifs', 'Suivi PND 2025-2031'],
  },
  {
    id: 'citizen',
    title: 'Portail Citoyen',
    duration: 10000,
    icon: Users,
    subtitle: 'Services accessibles à tous',
    description: 'Les citoyens peuvent accéder à 28 services publics en ligne, de l\'extrait de naissance au certificat de nationalité, sans se déplacer.',
    bgGradient: 'from-[#009460] via-[#006B45] to-[#009460]',
    mockup: 'citizen',
    features: ['28 services en ligne', 'Sans déplacement', 'Suivi en temps réel'],
  },
  {
    id: 'ged',
    title: 'Gestion Électronique',
    duration: 9000,
    icon: FileText,
    subtitle: 'GED & Archivage numérique',
    description: 'Numérisez, classez et retrouvez tous vos documents administratifs en un clic grâce à la recherche intelligente et à l\'OCR intégré.',
    bgGradient: 'from-[#FCD116] via-[#D4A800] to-[#FCD116]',
    mockup: 'ged',
    features: ['OCR intégré', 'Recherche intelligente', 'Archivage sécurisé'],
  },
  {
    id: 'courriers',
    title: 'Gestion du Courrier',
    duration: 9000,
    icon: Mail,
    subtitle: 'Courriers entrants & sortants',
    description: 'Traquez chaque courrier de la réception à l\'archivage. Aucun document ne se perd plus dans la chaîne administrative.',
    bgGradient: 'from-[#6B21A8] via-[#4C1D95] to-[#6B21A8]',
    mockup: 'courriers',
    features: ['Traçabilité complète', 'Circuit de validation', 'Notifications auto'],
  },
  {
    id: 'workflow',
    title: 'Workflows',
    duration: 9000,
    icon: Zap,
    subtitle: 'Automatisation des processus',
    description: 'Créez des workflows personnalisés pour automatiser les circuits de validation, les approbations et les transferts entre services.',
    bgGradient: 'from-[#0891B2] via-[#0E7490] to-[#0891B2]',
    mockup: 'workflow',
    features: ['Workflows personnalisables', 'Approbations en chaîne', 'IA automatique'],
  },
  {
    id: 'signatures',
    title: 'Signatures',
    duration: 8000,
    icon: PenTool,
    subtitle: 'Signature électronique',
    description: 'Signez vos documents administratifs électroniquement avec une valeur juridique reconnue. Fini les aller-retours pour signatures.',
    bgGradient: 'from-[#DC2626] via-[#991B1B] to-[#DC2626]',
    mockup: 'signatures',
    features: ['Valeur juridique', 'Multi-signataires', 'Horodatage certifié'],
  },
  {
    id: 'security',
    title: 'Sécurité & IA',
    duration: 8000,
    icon: Shield,
    subtitle: 'Agent IA & Souveraineté',
    description: 'Un agent IA autonome traite les demandes simples, vérifie les documents et pré-approuve les cas standards. Données hébergées en Guinée.',
    bgGradient: 'from-[#1E3A5F] via-[#0F2540] to-[#1E3A5F]',
    mockup: 'security',
    features: ['Agent IA autonome', 'Hébergement local', 'Conformité RGPD'],
  },
  {
    id: 'conclusion',
    title: 'Conclusion',
    duration: 8000,
    icon: Star,
    subtitle: 'Prêt à transformer votre administration ?',
    description: 'Rejoignez les institutions qui modernisent leur administration avec eAdmin Guinée. Planifiez votre démonstration personnalisée dès aujourd\'hui.',
    bgGradient: 'from-[#CE1126] via-[#FCD116] to-[#009460]',
    mockup: 'conclusion',
    features: ['Démo gratuite', 'Déploiement rapide', 'Accompagnement dédié'],
  },
]

// Mini mockup components for each scene
function SceneMockup({ type, active }: { type: string; active: boolean }) {
  if (!active) return null

  const fadeProps: Record<string, unknown> = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.6, ease: 'easeOut' as const },
  }

  switch (type) {
    case 'hero':
      return (
        <motion.div {...fadeProps} className="w-full h-full flex items-center justify-center">
          <div className="relative">
            {/* Guinea Coat of Arms representation */}
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="w-28 h-28 rounded-full border-4 border-[#FCD116] bg-gradient-to-br from-[#CE1126] via-[#FCD116] to-[#009460] flex items-center justify-center shadow-2xl"
            >
              <span className="text-white font-bold text-2xl">GN</span>
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -inset-6 rounded-full border-2 border-[#FCD116]/40"
            />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="absolute -inset-12 rounded-full border border-[#FCD116]/20"
            />
          </div>
        </motion.div>
      )

    case 'dashboard':
      return (
        <motion.div {...fadeProps} className="w-full h-full p-6 space-y-4">
          {/* Simulated dashboard */}
          <div className="grid grid-cols-4 gap-2">
            {[85, 72, 94, 56].map((val, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="bg-white/10 backdrop-blur rounded-lg p-2 text-center"
              >
                <div className="text-lg font-bold text-white">{val}%</div>
                <div className="text-[10px] text-white/60">KPI {i + 1}</div>
              </motion.div>
            ))}
          </div>
          {/* Chart area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white/10 backdrop-blur rounded-lg p-3 h-32 flex items-end gap-1"
          >
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.8 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                className={cn(
                  'flex-1 rounded-t',
                  i >= 10 ? 'bg-[#FCD116]' : 'bg-white/30'
                )}
              />
            ))}
          </motion.div>
          {/* Activity row */}
          <div className="flex gap-2">
            {['En cours', 'Traité', 'En attente'].map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4 + i * 0.1 }}
                className="flex-1 bg-white/10 backdrop-blur rounded-lg p-2"
              >
                <div className="text-xs text-white/80">{s}</div>
                <div className="text-white font-bold">{[24, 156, 8][i]}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )

    case 'citizen':
      return (
        <motion.div {...fadeProps} className="w-full h-full p-4 space-y-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur rounded-lg p-2 text-center"
          >
            <span className="text-white/80 text-xs">Portail Citoyen</span>
          </motion.div>
          <div className="grid grid-cols-3 gap-2">
            {['Naissance', 'Nationalité', 'Mariage', 'Décès', 'Casier', 'Permis'].map((svc, i) => (
              <motion.div
                key={svc}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-white/10 backdrop-blur rounded-lg p-2 text-center cursor-pointer hover:bg-white/20 transition-colors"
              >
                <div className="text-xs text-white font-medium">{svc}</div>
              </motion.div>
            ))}
          </div>
          {/* Simulated form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="bg-white/10 backdrop-blur rounded-lg p-3 space-y-2"
          >
            <div className="h-2 bg-white/20 rounded w-3/4" />
            <div className="h-6 bg-white/10 rounded" />
            <div className="h-2 bg-white/20 rounded w-1/2" />
            <div className="h-6 bg-white/10 rounded" />
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.5 }}
              className="h-7 bg-[#CE1126] rounded text-white text-xs flex items-center justify-center font-medium"
            >
              Soumettre la demande
            </motion.div>
          </motion.div>
        </motion.div>
      )

    case 'ged':
      return (
        <motion.div {...fadeProps} className="w-full h-full p-4 space-y-3">
          <div className="flex gap-2">
            {['Tous', 'PDF', 'Images', 'OCR'].map((t, i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'px-2 py-1 rounded text-[10px]',
                  i === 0 ? 'bg-[#FCD116] text-black' : 'bg-white/10 text-white'
                )}
              >
                {t}
              </motion.div>
            ))}
          </div>
          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-lg p-2"
          >
            <Search className="h-3 w-3 text-white/60" />
            <div className="h-2 bg-white/20 rounded flex-1" />
          </motion.div>
          {/* Document list */}
          {['Acte de naissance #2024-001', 'Arrêté ministériel #089', 'Décret présidentiel #2024-12'].map((doc, i) => (
            <motion.div
              key={doc}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              className="bg-white/10 backdrop-blur rounded-lg p-2 flex items-center gap-2"
            >
              <FileText className="h-4 w-4 text-[#FCD116]" />
              <span className="text-[10px] text-white/80 flex-1">{doc}</span>
              <Eye className="h-3 w-3 text-white/40" />
            </motion.div>
          ))}
        </motion.div>
      )

    case 'courriers':
      return (
        <motion.div {...fadeProps} className="w-full h-full p-4 space-y-3">
          {/* Tabs */}
          <div className="flex gap-1">
            {['Entrants', 'Sortants', 'En cours'].map((t, i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'flex-1 text-center py-1 rounded text-[10px] font-medium',
                  i === 2 ? 'bg-[#6B21A8] text-white' : 'bg-white/10 text-white/60'
                )}
              >
                {t}
              </motion.div>
            ))}
          </div>
          {/* Courrier cards */}
          {[
            { ref: 'CE-2024-00456', from: 'Ministère Finances', status: 'En traitement' },
            { ref: 'CE-2024-00457', from: 'Présidence', status: 'Transféré' },
            { ref: 'CE-2024-00458', from: 'Cour Suprême', status: 'Nouveau' },
          ].map((c, i) => (
            <motion.div
              key={c.ref}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
              className="bg-white/10 backdrop-blur rounded-lg p-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white font-mono">{c.ref}</span>
                <span className={cn(
                  'text-[8px] px-1.5 py-0.5 rounded',
                  c.status === 'Nouveau' ? 'bg-[#CE1126] text-white' :
                  c.status === 'Transféré' ? 'bg-[#FCD116] text-black' :
                  'bg-[#009460] text-white'
                )}>
                  {c.status}
                </span>
              </div>
              <div className="text-[10px] text-white/60 mt-1">{c.from}</div>
            </motion.div>
          ))}
        </motion.div>
      )

    case 'workflow':
      return (
        <motion.div {...fadeProps} className="w-full h-full p-4 space-y-3">
          {/* Workflow steps */}
          <div className="flex items-center justify-between">
            {['Soumission', 'Vérification IA', 'Validation', 'Approbation'].map((step, i) => (
              <div key={step} className="flex items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.3 }}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold',
                    i < 2 ? 'bg-[#009460] text-white' : 'bg-white/20 text-white/60'
                  )}
                >
                  {i + 1}
                </motion.div>
                {i < 3 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 20 }}
                    transition={{ delay: 0.5 + i * 0.3 }}
                    className={cn('h-0.5', i < 1 ? 'bg-[#009460]' : 'bg-white/20')}
                  />
                )}
              </div>
            ))}
          </div>
          {/* AI Processing animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="bg-gradient-to-r from-[#0891B2]/30 to-purple-500/30 backdrop-blur rounded-lg p-3 border border-[#0891B2]/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-[#0891B2] flex items-center justify-center">
                <Zap className="h-3 w-3 text-white" />
              </div>
              <span className="text-[10px] text-white font-medium">Agent IA — Traitement automatique</span>
            </div>
            <motion.div
              animate={{ width: ['0%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-1 bg-[#0891B2] rounded"
            />
          </motion.div>
        </motion.div>
      )

    case 'signatures':
      return (
        <motion.div {...fadeProps} className="w-full h-full p-4 space-y-3">
          {/* Document preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 backdrop-blur rounded-lg p-3"
          >
            <div className="h-2 bg-white/20 rounded w-3/4 mb-2" />
            <div className="h-1.5 bg-white/10 rounded w-full mb-1" />
            <div className="h-1.5 bg-white/10 rounded w-5/6 mb-1" />
            <div className="h-1.5 bg-white/10 rounded w-4/5" />
          </motion.div>
          {/* Signature pad */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 border border-dashed border-white/30 rounded-lg p-3 text-center"
          >
            <PenTool className="h-6 w-6 text-[#DC2626] mx-auto mb-1" />
            <span className="text-[10px] text-white/60">Zone de signature</span>
          </motion.div>
          {/* Signers */}
          <div className="flex gap-2">
            {['M. Diallo', 'Mme Touré', 'Dr. Condé'].map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className={cn(
                  'flex-1 text-center py-1 rounded text-[9px]',
                  i === 0 ? 'bg-[#DC2626] text-white' : 'bg-white/10 text-white/60'
                )}
              >
                {s}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )

    case 'security':
      return (
        <motion.div {...fadeProps} className="w-full h-full p-4 space-y-3">
          {/* AI Agent */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-br from-[#0891B2]/20 to-purple-500/20 backdrop-blur rounded-lg p-3 border border-[#0891B2]/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-6 h-6 rounded-full bg-[#0891B2] flex items-center justify-center"
              >
                <Zap className="h-3 w-3 text-white" />
              </motion.div>
              <span className="text-xs text-white font-medium">Agent IA Autonome</span>
            </div>
            <div className="space-y-1">
              {['Vérification documentaire', 'Validation automatique', 'Pré-approbation IA'].map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.2 }}
                  className="flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3 text-[#009460]" />
                  <span className="text-[10px] text-white/80">{t}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          {/* Security badges */}
          <div className="flex gap-2">
            {[
              { icon: Lock, label: 'Chiffrement' },
              { icon: Shield, label: 'RGPD' },
              { icon: Cloud, label: 'Hébergé GN' },
            ].map((b, i) => (
              <motion.div
                key={b.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.1 }}
                className="flex-1 bg-white/10 backdrop-blur rounded-lg p-2 text-center"
              >
                <b.icon className="h-4 w-4 text-[#FCD116] mx-auto mb-1" />
                <span className="text-[9px] text-white/70">{b.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )

    case 'conclusion':
      return (
        <motion.div {...fadeProps} className="w-full h-full flex flex-col items-center justify-center p-6">
          {/* Guinea flag colors animation */}
          <div className="flex gap-1 mb-4">
            <motion.div
              animate={{ height: [20, 40, 20] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-8 bg-[#CE1126] rounded"
              style={{ height: 30 }}
            />
            <motion.div
              animate={{ height: [30, 40, 30] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              className="w-8 bg-[#FCD116] rounded"
              style={{ height: 30 }}
            />
            <motion.div
              animate={{ height: [25, 40, 25] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              className="w-8 bg-[#009460] rounded"
              style={{ height: 30 }}
            />
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center"
          >
            <p className="text-white font-bold text-sm mb-1">eAdmin Guinée</p>
            <p className="text-white/60 text-xs">Transformons ensemble l'administration</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-4 bg-[#FCD116] text-black px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
          >
            Commencer maintenant <ArrowRight className="h-3 w-3" />
          </motion.div>
        </motion.div>
      )

    default:
      return null
  }
}

export function DemoVideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentScene, setCurrentScene] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0)
  const currentSceneData = scenes[currentScene]

  // Calculate scene start times
  const sceneStartTimes = scenes.reduce((acc: number[], scene, i) => {
    const prev = i > 0 ? acc[i - 1] : 0
    acc.push(prev + scene.duration)
    return acc
  }, [])

  const elapsedAtSceneStart = currentScene > 0 ? sceneStartTimes[currentScene - 1] : 0

  // Progress tracking
  useEffect(() => {
    if (isPlaying) {
      progressRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 50
          const elapsed = (newProgress / 1000)
          if (elapsed >= totalDuration / 1000) {
            setIsPlaying(false)
            return 0
          }
          // Check if we need to advance scene
          const totalElapsed = newProgress / 1000
          let sceneTime = 0
          for (let i = 0; i < scenes.length; i++) {
            sceneTime += scenes[i].duration / 1000
            if (totalElapsed < sceneTime) {
              if (i !== currentScene) {
                setCurrentScene(i)
              }
              break
            }
          }
          return newProgress
        })
      }, 50)
    } else {
      if (progressRef.current) clearInterval(progressRef.current)
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [isPlaying, currentScene, totalDuration])

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isPlaying) {
      timerRef.current = setTimeout(() => setShowControls(false), 3000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [showControls, isPlaying])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
    setShowControls(true)
  }, [])

  const goToScene = useCallback((index: number) => {
    setCurrentScene(index)
    let timeBefore = 0
    for (let i = 0; i < index; i++) {
      timeBefore += scenes[i].duration
    }
    setProgress((timeBefore / 1000) * 1000)
    setShowControls(true)
  }, [])

  const nextScene = useCallback(() => {
    if (currentScene < scenes.length - 1) {
      goToScene(currentScene + 1)
    }
  }, [currentScene, goToScene])

  const prevScene = useCallback(() => {
    if (currentScene > 0) {
      goToScene(currentScene - 1)
    }
  }, [currentScene, goToScene])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    const newProgress = pct * (totalDuration / 1000) * 1000
    setProgress(newProgress)
    // Find scene
    let time = 0
    for (let i = 0; i < scenes.length; i++) {
      time += scenes[i].duration / 1000
      if (pct * (totalDuration / 1000) < time) {
        setCurrentScene(i)
        break
      }
    }
  }, [totalDuration])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const progressPct = (progress / 1000) / (totalDuration / 1000) * 100
  const sceneProgressPct = (() => {
    const sceneElapsed = (progress / 1000) - elapsedAtSceneStart / 1000
    return Math.min((sceneElapsed / (currentSceneData.duration / 1000)) * 100, 100)
  })()

  // Chapter markers on progress bar
  const chapterMarkers = scenes.map((s, i) => {
    let timeBefore = 0
    for (let j = 0; j < i; j++) timeBefore += scenes[j].duration
    return {
      index: i,
      position: (timeBefore / totalDuration) * 100,
      title: s.title,
    }
  })

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden shadow-2xl"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video viewport */}
      <div className={cn(
        'relative bg-gradient-to-br aspect-video flex items-center justify-center overflow-hidden',
        currentSceneData.bgGradient
      )}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-1/2"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
          />
        </div>

        {/* Mockup area */}
        <div className="relative z-10 w-full max-w-lg mx-auto px-4">
          <AnimatePresence mode="wait">
            <SceneMockup key={currentSceneData.id} type={currentSceneData.mockup} active={true} />
          </AnimatePresence>
        </div>

        {/* Scene info overlay (bottom) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          key={`info-${currentSceneData.id}`}
          className="absolute bottom-16 left-0 right-0 z-20 px-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <currentSceneData.icon className="h-4 w-4 text-[#FCD116]" />
            <span className="text-[#FCD116] text-xs font-semibold uppercase tracking-wider">
              {currentSceneData.title}
            </span>
          </div>
          <h3 className="text-white font-bold text-lg leading-tight">
            {currentSceneData.subtitle}
          </h3>
          <p className="text-white/70 text-xs mt-1 line-clamp-2 max-w-md">
            {currentSceneData.description}
          </p>
        </motion.div>

        {/* Big play button overlay when paused */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 cursor-pointer"
              onClick={togglePlay}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <Play className="h-10 w-10 text-white ml-1" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 z-40"
            >
              {/* Progress bar */}
              <div className="px-4">
                <div
                  className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group"
                  onClick={handleProgressClick}
                >
                  {/* Chapter markers */}
                  {chapterMarkers.map((m) => (
                    <div
                      key={m.index}
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/40"
                      style={{ left: `${m.position}%` }}
                      title={m.title}
                    />
                  ))}
                  {/* Progress */}
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-[#FCD116] rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                  {/* Seek handle */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#FCD116] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${progressPct}%`, marginLeft: '-7px' }}
                  />
                </div>
              </div>

              {/* Control bar */}
              <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 py-3 flex items-center gap-3">
                <button onClick={prevScene} className="text-white/80 hover:text-white transition-colors">
                  <SkipBack className="h-4 w-4" />
                </button>
                <button onClick={togglePlay} className="text-white hover:text-white/80 transition-colors">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <button onClick={nextScene} className="text-white/80 hover:text-white transition-colors">
                  <SkipForward className="h-4 w-4" />
                </button>

                {/* Time display */}
                <span className="text-white/80 text-xs font-mono">
                  {formatTime(progress / 1000)} / {formatTime(totalDuration / 1000)}
                </span>

                <div className="flex-1" />

                {/* Scene title */}
                <span className="text-white/60 text-xs hidden sm:block">
                  {currentScene + 1}/{scenes.length} — {currentSceneData.title}
                </span>

                <button onClick={() => setIsMuted(!isMuted)} className="text-white/80 hover:text-white transition-colors">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button onClick={toggleFullscreen} className="text-white/80 hover:text-white transition-colors">
                  <Maximize className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chapter navigation below video */}
      <div className="bg-black/90 dark:bg-black/95 px-4 py-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {scenes.map((scene, i) => (
            <button
              key={scene.id}
              onClick={() => goToScene(i)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all',
                i === currentScene
                  ? 'bg-[#FCD116] text-black font-semibold'
                  : i < currentScene
                  ? 'bg-white/10 text-white/60'
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              )}
            >
              {i < currentScene ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <scene.icon className="h-3 w-3" />
              )}
              {scene.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
