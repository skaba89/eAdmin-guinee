'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Maximize, SkipBack, SkipForward,
  RotateCcw, X, ChevronRight, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'

// ─── SCENES DATA ──────────────────────────────────────────────────────────
interface Scene {
  id: number
  duration: number // ms at 1x speed
  narration: string
  type: string
}

const SCENES: Scene[] = [
  { id: 0, duration: 3000, narration: 'eAdministration Suite Guinea. La plateforme GovTech de nouvelle génération pour la République de Guinée.', type: 'intro' },
  { id: 1, duration: 3000, narration: 'Notre mission : digitaliser l\'ensemble de l\'administration publique guinéenne.', type: 'vision' },
  { id: 2, duration: 4000, narration: 'Un tableau de bord décisionnel avec des indicateurs clés en temps réel.', type: 'dashboard' },
  { id: 3, duration: 3000, narration: '87 450 documents officiels archivés et classifiés avec intelligence artificielle.', type: 'ged' },
  { id: 4, duration: 3000, narration: 'Le circuit de visa interministériel, de la rédaction à la diffusion.', type: 'courriers' },
  { id: 5, duration: 3000, narration: 'L\'automatisation complète des procédures administratives.', type: 'workflow' },
  { id: 6, duration: 3000, narration: 'La signature électronique à valeur juridique, conforme au décret présidentiel.', type: 'signatures' },
  { id: 7, duration: 4000, narration: '28 services publics en ligne, organisés en 9 catégories pour les citoyens.', type: 'citizen' },
  { id: 8, duration: 3000, narration: '8 démarches accessibles sans créer de compte. Simple et rapide.', type: 'noaccount' },
  { id: 9, duration: 3000, narration: 'Les démarches complexes nécessitent un espace personnel sécurisé.', type: 'account' },
  { id: 10, duration: 3000, narration: 'Suivez chaque demande en temps réel, de la soumission à la livraison.', type: 'tracking' },
  { id: 11, duration: 3000, narration: 'Des documents officiels sécurisés, avec filigrane et signature numérique.', type: 'documents' },
  { id: 12, duration: 3000, narration: 'Un système d\'archivage national avec conservation pérenne.', type: 'archive' },
  { id: 13, duration: 3000, narration: 'Conforme à la loi sur la protection des données. Vos informations sont en sécurité.', type: 'security' },
  { id: 14, duration: 5000, narration: 'Prêt à transformer votre administration ? Essayer la plateforme dès maintenant.', type: 'outro' },
]

const GUINEA_RED = '#CE1126'
const GUINEA_YELLOW = '#FCD116'
const GUINEA_GREEN = '#009460'

// ─── COUNTER HOOK ──────────────────────────────────────────────────────────
function useAnimatedCounter(target: number, isActive: boolean, duration: number = 1500) {
  const [value, setValue] = useState(0)
  const prevActiveRef = useRef(false)
  useEffect(() => {
    if (!isActive) {
      if (prevActiveRef.current) {
        // Reset via RAF to avoid synchronous setState in effect
        requestAnimationFrame(() => setValue(0))
      }
      prevActiveRef.current = false
      return
    }
    prevActiveRef.current = true
    const start = performance.now()
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [isActive, target, duration])
  return value
}

// ─── TYPEWRITER HOOK ───────────────────────────────────────────────────────
function useTypewriter(text: string, isActive: boolean, speed: number = 30) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!isActive) { setDisplayed(''); return }
    setDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, isActive, speed])
  return displayed
}

// ─── SCENE VISUAL COMPONENTS ───────────────────────────────────────────────
function SceneIntro({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 flex h-1.5">
        <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
        <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
        <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
      </div>
      <motion.div initial={{ scale: 3, opacity: 0, filter: 'blur(20px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="relative z-10">
        <div className="w-20 h-20 rounded-2xl bg-[#C8A45C] flex items-center justify-center shadow-2xl shadow-[#C8A45C]/30">
          <span className="text-[#0B2E58] font-black text-3xl">eA</span>
        </div>
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }} className="mt-6 text-3xl sm:text-4xl font-black text-white tracking-tight">eAdministration Suite</motion.h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }} className="mt-2 text-white/60 text-sm sm:text-base">Guinée — DataSphere Innovation</motion.p>
      {[...Array(8)].map((_, i) => (
        <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-white/10" style={{ left: `${10 + i * 12}%`, top: `${15 + (i % 3) * 30}%` }} animate={{ y: [0, -30, 0], opacity: [0.1, 0.4, 0.1] }} transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </div>
  )
}

function SceneVision({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#071D3A] to-[#134A8E] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 flex h-1">
        <div className="flex-1" style={{ backgroundColor: GUINEA_RED }} />
        <div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} />
        <div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} />
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative z-10 flex flex-col items-center">
        <motion.div className="w-24 h-24 rounded-full border-4 border-[#C8A45C]/30 flex items-center justify-center mb-6" animate={{ borderColor: ['rgba(200,164,92,0.3)', 'rgba(200,164,92,0.8)', 'rgba(200,164,92,0.3)'] }} transition={{ duration: 2, repeat: Infinity }}>
          <span className="text-5xl">🇬🇳</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-2xl sm:text-3xl font-black text-white text-center">Digitaliser l&apos;administration</motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-white/50 text-sm mt-3">8 régions · 24 institutions · 124 500 citoyens</motion.p>
      </motion.div>
    </div>
  )
}

function SceneDashboard({ active }: { active: boolean }) {
  const courriers = useAnimatedCounter(14250, active, 1200)
  const documents = useAnimatedCounter(87450, active, 1500)
  const workflows = useAnimatedCounter(234, active, 800)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#0D3A70] to-[#0B2E58] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-6">Tableau de bord décisionnel</motion.h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
        {[
          { label: 'Courriers', value: courriers.toLocaleString('fr-FR'), color: 'text-[#C8A45C]', bg: 'bg-[#C8A45C]/10 border-[#C8A45C]/20' },
          { label: 'Documents', value: documents.toLocaleString('fr-FR'), color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Workflows', value: workflows.toString(), color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
          { label: 'Satisfaction', value: '94%', color: 'text-[#C8A45C]', bg: 'bg-[#C8A45C]/10 border-[#C8A45C]/20' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 30, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.2 + i * 0.12 }} className={`p-3 rounded-xl border backdrop-blur-sm text-center ${kpi.bg}`}>
            <p className={`text-xl sm:text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-white/50 mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>
      <div className="flex items-end gap-1 h-16 mt-4 w-full max-w-md">
        {[35, 42, 38, 56, 62, 58, 45, 50, 67, 72, 78, 85].map((h, i) => (
          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.6 + i * 0.05, duration: 0.3 }} className="flex-1 rounded-t bg-[#C8A45C]/60" />
        ))}
      </div>
    </div>
  )
}

function SceneGed({ active }: { active: boolean }) {
  const docs = useAnimatedCounter(87450, active, 1200)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#071D3A] via-[#0B2E58] to-[#134A8E] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-2">Gestion Électronique des Documents</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-[#C8A45C] font-black text-3xl sm:text-4xl mb-4">{docs.toLocaleString('fr-FR')}</motion.p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {[
          { label: 'Décrets présidentiels', badge: 'PUBLIC', bc: 'bg-emerald-500/30 text-emerald-300' },
          { label: 'Arrêtés ministériels', badge: 'PUBLIC', bc: 'bg-emerald-500/30 text-emerald-300' },
          { label: 'Circulaires', badge: 'DIFF. LIMITÉE', bc: 'bg-amber-500/30 text-amber-300' },
          { label: 'Rapports confidentiels', badge: 'CONFIDENTIEL', bc: 'bg-red-500/30 text-red-300' },
        ].map((doc, i) => (
          <motion.div key={doc.label} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
            <p className="text-xs font-medium text-white/80">{doc.label}</p>
            <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold ${doc.bc}`}>{doc.badge}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SceneCourriers({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#134A8E] via-[#0B2E58] to-[#071D3A] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-4">Courriers Officiels</motion.h2>
      <div className="w-full max-w-sm space-y-2">
        {[
          { ref: 'CR-2026-8721', status: 'Urgent — Visa SG', priority: 'URGENT', pc: 'bg-red-500/30 text-red-300 border-red-500/30' },
          { ref: 'CR-2026-8720', status: 'En cours de validation', priority: 'IMPORTANT', pc: 'bg-orange-500/30 text-orange-300 border-orange-500/30' },
          { ref: 'CR-2026-8719', status: 'Diffusée aux services', priority: 'NORMAL', pc: 'bg-white/10 text-white/50 border-white/10' },
        ].map((c, i) => (
          <motion.div key={c.ref} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.15 }} className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 flex items-center justify-between">
            <div><span className="font-mono text-xs text-[#C8A45C]">{c.ref}</span><p className="text-[10px] text-white/50 mt-0.5">{c.status}</p></div>
            <span className={`px-2 py-1 rounded-full text-[9px] font-black border ${c.pc}`}>{c.priority}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4">
        {['Rédaction', '→', 'Visa SG', '→', 'Ministre', '→', 'Diffusion'].map((step, i) => (
          <motion.span key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + i * 0.08 }} className={step === '→' ? 'text-white/30 text-xs' : `text-[10px] font-bold ${i < 4 ? 'text-emerald-400' : 'text-white/40'}`}>{step}</motion.span>
        ))}
      </div>
    </div>
  )
}

function SceneWorkflow({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#009460]/20 to-[#0B2E58] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-6">Workflows & Automatisation</motion.h2>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {[
          { name: 'Visa courrier', steps: 4, progress: 75, color: 'bg-emerald-500' },
          { name: 'Approbation budget', steps: 6, progress: 50, color: 'bg-[#C8A45C]' },
          { name: 'Marché public', steps: 8, progress: 25, color: 'bg-sky-500' },
        ].map((wf, i) => (
          <motion.div key={wf.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.15 }} className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-white/80">{wf.name}</span><span className="text-[10px] text-white/40">{wf.steps} étapes</span></div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${wf.progress}%` }} transition={{ delay: 0.5 + i * 0.15, duration: 0.8 }} className={`h-full rounded-full ${wf.color}`} /></div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SceneSignatures({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#C8A45C]/15 to-[#0B2E58] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-4">Signature Électronique</motion.h2>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4">
        <motion.svg initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></motion.svg>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="bg-white/5 rounded-lg p-3 border border-white/10 w-full max-w-xs text-center">
        <p className="text-xs text-white/60">Décret n°D/2022/PRG/SGG</p>
        <p className="text-[10px] text-[#C8A45C] mt-1 font-medium">Valeur juridique garantie</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center"><span className="text-[7px] text-white/40 font-mono">QR</span></div>
          <span className="text-[9px] text-white/30">Vérification d&apos;authenticité</span>
        </div>
      </motion.div>
    </div>
  )
}

function SceneCitizen({ active }: { active: boolean }) {
  const services = useAnimatedCounter(28, active, 1000)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#009460]/25 to-[#0B2E58] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-1">Portail Citoyen</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-[#C8A45C] font-black text-3xl mb-4">{services} services publics</motion.p>
      <div className="grid grid-cols-3 gap-1.5 w-full max-w-xs">
        {['État Civil', 'Justice', 'Identif.', 'Urban.', 'Entrpr.', 'Éducation', 'Santé', 'Résid.', 'Fiscalité'].map((cat, i) => (
          <motion.div key={cat} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.06 }} className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center border border-white/10">
            <p className="text-[9px] font-medium text-white/80">{cat}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SceneNoAccount({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#009460]/20 to-[#0B2E58] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-1">Sans compte</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-emerald-400 text-sm font-medium mb-4">8 démarches accessibles directement</motion.p>
      <div className="grid grid-cols-2 gap-1.5 w-full max-w-xs">
        {['Acte de naissance', 'Acte de décès', 'Casier judiciaire', 'Non-poursuite', 'Vaccination', 'Scolarité', 'Résidence', 'Domicile'].map((s, i) => (
          <motion.div key={s} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }} className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20 flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0"><span className="text-[7px] text-emerald-400">✓</span></div>
            <span className="text-[9px] text-white/80">{s}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SceneAccount({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#C8A45C]/10 to-[#0B2E58] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-1">Avec compte</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-amber-400 text-sm font-medium mb-4">Démarches complexes — Espace sécurisé</motion.p>
      <div className="grid grid-cols-2 gap-1.5 w-full max-w-xs">
        {['Passeport', 'CNI biométrique', 'Permis conduire', 'Permis construire', 'Entreprise APIP', 'RCCM', 'Équivalence', 'Cert. nationalité'].map((s, i) => (
          <motion.div key={s} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }} className="bg-amber-500/10 rounded-lg p-2 border border-amber-500/20 flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-amber-500/30 flex items-center justify-center shrink-0"><span className="text-[7px] text-amber-400">🔒</span></div>
            <span className="text-[9px] text-white/80">{s}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SceneTracking({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-4">Suivi en temps réel</motion.h2>
      <div className="w-full max-w-xs space-y-0">
        {[
          { step: 'Soumission', done: true, delay: 0.3 },
          { step: 'Vérification pièces', done: true, delay: 0.5 },
          { step: 'Traitement service', current: true, delay: 0.7 },
          { step: 'Validation', delay: 0.9 },
          { step: 'Document prêt', delay: 1.1 },
        ].map((s, i) => (
          <motion.div key={s.step} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: s.delay }} className="flex items-center gap-3 py-2">
            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0', s.done ? 'bg-emerald-500 text-white' : s.current ? 'bg-[#C8A45C] text-[#0B2E58]' : 'bg-white/10 text-white/30')}>
              {s.done ? <span className="text-xs">✓</span> : s.current ? <span className="text-[8px] font-bold">●</span> : <span className="text-[8px]">○</span>}
            </div>
            <span className={cn('text-sm', s.done ? 'text-emerald-400' : s.current ? 'text-[#C8A45C] font-semibold' : 'text-white/30')}>{s.step}</span>
            {s.current && <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-[10px] text-[#C8A45C]">En cours</motion.span>}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SceneDocuments({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#CE1126]/10 to-[#0B2E58] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-4">Documents sécurisés</motion.h2>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-white rounded-lg w-full max-w-xs overflow-hidden shadow-2xl shadow-black/50">
        <div className="flex h-2"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
        <div className="p-4 text-center relative">
          <div className="absolute inset-0 flex items-center justify-center -rotate-45 pointer-events-none"><span className="text-gray-100 text-xl font-black whitespace-nowrap opacity-40">RÉPUBLIQUE DE GUINÉE</span></div>
          <p className="text-[8px] text-gray-400">RÉPUBLIQUE DE GUINÉE</p>
          <p className="text-[7px] text-gray-400 italic">Travail — Justice — Solidarité</p>
          <p className="text-sm font-black text-gray-800 mt-2">EXTRAIT D&apos;ACTE DE NAISSANCE</p>
          <div className="mt-3 space-y-1.5 text-[9px] text-gray-600 text-left">
            <p>NOM : <span className="font-bold">DIALLO</span></p>
            <p>PRÉNOM : <span className="font-bold">Aminata</span></p>
            <p>NIN : <span className="font-mono">GN-2001-456789</span></p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[7px] font-bold rounded">OFFICIEL</span>
            <span className="text-[7px] text-gray-400 flex items-center gap-1">🔒 Signé numériquement</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function SceneArchive({ active }: { active: boolean }) {
  const archived = useAnimatedCounter(2450, active, 1000)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#071D3A] via-[#0B2E58] to-[#134A8E] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-2">Archives Nationales</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-[#C8A45C] font-black text-3xl mb-4">{archived.toLocaleString('fr-FR')}</motion.p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
        {[
          { label: 'Administratif', period: '30 ans', icon: '🏛️' },
          { label: 'Juridique', period: '10 ans', icon: '⚖️' },
          { label: 'Financier', period: 'Permanente', icon: '💰' },
          { label: 'Historique', period: 'Permanente', icon: '📜' },
        ].map((a, i) => (
          <motion.div key={a.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="bg-white/5 rounded-lg p-2.5 border border-white/10 text-center">
            <span className="text-lg">{a.icon}</span>
            <p className="text-xs font-medium text-white/80 mt-1">{a.label}</p>
            <p className="text-[9px] text-[#C8A45C]">{a.period}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SceneSecurity({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#CE1126]/15 to-[#0B2E58] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl font-black text-white mb-4">Sécurité & Conformité</motion.h2>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4">
        <span className="text-2xl">🔒</span>
      </motion.div>
      <div className="w-full max-w-xs space-y-1.5">
        {[
          { text: 'Chiffrement AES-256', status: 'Actif' },
          { text: 'Authentification 2FA', status: 'Actif' },
          { text: 'Audit trail complet', status: 'Actif' },
          { text: 'Loi L/2016/018', status: 'Conforme' },
        ].map((item, i) => (
          <motion.div key={item.text} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }} className="bg-white/5 rounded-lg p-2 flex items-center justify-between border border-white/5">
            <span className="text-xs text-white/70">{item.text}</span>
            <span className="text-[10px] text-emerald-400 font-bold">{item.status}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SceneOutro({ active }: { active: boolean }) {
  const navigate = useAppStore(s => s.navigate)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] overflow-hidden p-6">
      <div className="absolute top-0 left-0 right-0 flex h-1.5"><div className="flex-1" style={{ backgroundColor: GUINEA_RED }} /><div className="flex-1" style={{ backgroundColor: GUINEA_YELLOW }} /><div className="flex-1" style={{ backgroundColor: GUINEA_GREEN }} /></div>
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.8 }} className="w-16 h-16 rounded-2xl bg-[#C8A45C] flex items-center justify-center shadow-2xl shadow-[#C8A45C]/30 mb-4">
        <span className="text-[#0B2E58] font-black text-2xl">eA</span>
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-2xl sm:text-3xl font-black text-white text-center">Prêt à transformer votre administration ?</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-white/50 text-sm mt-2">eAdministration Suite — DataSphere Innovation</motion.p>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex gap-3 mt-6">
        <button onClick={() => navigate('login')} className="px-6 py-3 bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] font-bold rounded-xl text-sm transition-colors flex items-center gap-2">
          <Zap className="size-4" /> Essayer la plateforme
        </button>
      </motion.div>
      <div className="flex gap-2 mt-4">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: GUINEA_RED }} />
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: GUINEA_YELLOW }} />
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: GUINEA_GREEN }} />
      </div>
    </div>
  )
}

// ─── SCENE RENDERER ────────────────────────────────────────────────────────
function SceneContent({ scene, active }: { scene: Scene; active: boolean }) {
  switch (scene.type) {
    case 'intro': return <SceneIntro active={active} />
    case 'vision': return <SceneVision active={active} />
    case 'dashboard': return <SceneDashboard active={active} />
    case 'ged': return <SceneGed active={active} />
    case 'courriers': return <SceneCourriers active={active} />
    case 'workflow': return <SceneWorkflow active={active} />
    case 'signatures': return <SceneSignatures active={active} />
    case 'citizen': return <SceneCitizen active={active} />
    case 'noaccount': return <SceneNoAccount active={active} />
    case 'account': return <SceneAccount active={active} />
    case 'tracking': return <SceneTracking active={active} />
    case 'documents': return <SceneDocuments active={active} />
    case 'archive': return <SceneArchive active={active} />
    case 'security': return <SceneSecurity active={active} />
    case 'outro': return <SceneOutro active={active} />
    default: return null
  }
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export function CinematicDemoVideo({ className }: { className?: string }) {
  const navigate = useAppStore(s => s.navigate)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentScene, setCurrentScene] = useState(0)
  const [progress, setProgress] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalDuration = SCENES.reduce((acc, s) => acc + s.duration, 0)
  const scene = SCENES[currentScene]
  const narration = useTypewriter(scene?.narration || '', isPlaying, 25 / speed)

  const startPlayback = useCallback(() => {
    if (!hasStarted) setHasStarted(true)
    setIsPlaying(true)
  }, [hasStarted])

  const togglePlay = useCallback(() => {
    if (!hasStarted) { startPlayback(); return }
    setIsPlaying(prev => !prev)
  }, [hasStarted, startPlayback])

  const reset = useCallback(() => {
    setIsPlaying(false); setCurrentScene(0); setProgress(0)
  }, [])

  const goNext = useCallback(() => {
    if (currentScene < SCENES.length - 1) {
      let p = 0
      for (let i = 0; i <= currentScene; i++) p += (SCENES[i].duration / totalDuration) * 100
      setProgress(p); setCurrentScene(prev => prev + 1)
    }
  }, [currentScene, totalDuration])

  const goPrev = useCallback(() => {
    if (currentScene > 0) {
      let p = 0
      for (let i = 0; i < currentScene - 1; i++) p += (SCENES[i].duration / totalDuration) * 100
      setProgress(p); setCurrentScene(prev => prev - 1)
    }
  }, [currentScene, totalDuration])

  // Progress
  useEffect(() => {
    if (isPlaying) {
      const interval = 50
      timerRef.current = setInterval(() => {
        setProgress(prev => {
          const next = prev + ((interval * speed) / totalDuration) * 100
          if (next >= 100) { setIsPlaying(false); return 100 }
          return next
        })
      }, interval)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, totalDuration, speed])

  // Scene from progress
  useEffect(() => {
    let acc = 0
    for (let i = 0; i < SCENES.length; i++) {
      acc += (SCENES[i].duration / totalDuration) * 100
      if (progress < acc) { setCurrentScene(i); break }
      if (i === SCENES.length - 1) setCurrentScene(i)
    }
  }, [progress, totalDuration])

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isPlaying) {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 2000)
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

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay() }
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, goNext, goPrev])

  const formatTime = (pct: number) => {
    const sec = Math.floor((pct / 100) * (totalDuration / 1000 / speed))
    const m = Math.floor(sec / 60); const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Scene markers
  const sceneMarkers = SCENES.map((s, i) => {
    let pos = 0
    for (let j = 0; j < i; j++) pos += (SCENES[j].duration / totalDuration) * 100
    return pos
  })

  // Sound wave bars
  const waveBars = Array.from({ length: 30 }, () => Math.random())

  return (
    <div ref={containerRef} className={cn('relative rounded-2xl overflow-hidden bg-black group', isFullscreen && 'rounded-none', className)} onMouseMove={handleMouseMove} onMouseLeave={() => isPlaying && setShowControls(false)}>
      <div className="relative aspect-video">
        {/* Scene Content */}
        <AnimatePresence mode="wait">
          <motion.div key={scene?.id} initial={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0">
            {scene && <SceneContent scene={scene} active={isPlaying} />}
          </motion.div>
        </AnimatePresence>

        {/* Narration Subtitle */}
        {hasStarted && isPlaying && narration && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-20 left-4 right-4 z-20 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md rounded-lg px-4 py-2.5 max-w-2xl mx-auto">
              <p className="text-white text-sm sm:text-base font-medium leading-relaxed">{narration}<span className="animate-pulse text-white/60">|</span></p>
            </div>
          </motion.div>
        )}

        {/* Sound Wave Visualizer */}
        {isPlaying && (
          <div className="absolute bottom-14 left-0 right-0 z-10 flex items-end justify-center gap-[2px] h-4 pointer-events-none opacity-30">
            {waveBars.map((base, i) => (
              <motion.div key={i} className="w-[3px] bg-[#C8A45C] rounded-full" animate={{ height: `${Math.max(2, base * 16 * (0.5 + Math.random()))}px` }} transition={{ duration: 0.15, repeat: Infinity, repeatType: 'reverse', delay: i * 0.02 }} />
            ))}
          </div>
        )}

        {/* Play Button Overlay */}
        {!hasStarted && (
          <motion.div className="absolute inset-0 flex items-center justify-center z-30 cursor-pointer bg-black/30" onClick={togglePlay}>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="h-20 w-20 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border-2 border-white/25 shadow-2xl">
              <Play className="h-10 w-10 text-white ml-1" />
            </motion.div>
            <div className="absolute bottom-28 text-center">
              <p className="text-white font-bold text-lg">Vidéo de présentation</p>
              <p className="text-white/50 text-sm mt-1">{Math.floor(totalDuration / 1000)}s — Aperçu accéléré de la plateforme</p>
            </div>
          </motion.div>
        )}

        {/* Paused overlay */}
        {hasStarted && !isPlaying && progress < 100 && (
          <div className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer" onClick={togglePlay}>
            <div className="h-14 w-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"><Play className="h-7 w-7 text-white ml-0.5" /></div>
          </div>
        )}

        {/* Finished overlay */}
        <AnimatePresence>
          {progress >= 100 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
              <div className="text-center">
                <p className="text-white text-xl font-bold mb-2">Démonstration terminée</p>
                <p className="text-white/50 text-sm mb-5">Prêt à transformer votre administration ?</p>
                <div className="flex items-center gap-3 justify-center">
                  <button onClick={reset} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"><RotateCcw className="h-4 w-4" />Revoir</button>
                  <button onClick={() => navigate('login')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] text-sm font-bold transition-colors"><Zap className="h-4 w-4" />Essayer la plateforme</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: hasStarted && showControls ? 1 : 0, y: hasStarted && showControls ? 0 : 10 }} transition={{ duration: 0.2 }} className={cn('absolute bottom-0 left-0 right-0 z-30', !hasStarted && 'hidden')}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
          <div className="relative p-3 pt-6">
            {/* Progress bar */}
            <div ref={progressRef} className="w-full h-1 bg-white/15 rounded-full cursor-pointer mb-2 group/progress hover:h-2 transition-all" onClick={handleProgressClick}>
              <div className="h-full bg-[#C8A45C] rounded-full relative transition-all" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#C8A45C] opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg" />
              </div>
              {/* Scene markers */}
              {sceneMarkers.map((pos, i) => (
                <div key={i} className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-white/20 -rotate-45" style={{ left: `${pos}%` }} />
              ))}
            </div>
            {/* Controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button onClick={goPrev} className="text-white/60 hover:text-white transition-colors p-1" disabled={currentScene === 0}><SkipBack className="h-4 w-4" /></button>
                <button onClick={togglePlay} className="text-white hover:text-[#C8A45C] transition-colors p-1">{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
                <button onClick={goNext} className="text-white/60 hover:text-white transition-colors p-1" disabled={currentScene === SCENES.length - 1}><SkipForward className="h-4 w-4" /></button>
                <span className="text-white/40 text-[11px] ml-2 font-mono">{formatTime(progress)} / {formatTime(100)}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Speed control */}
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                  {([1, 1.5, 2] as const).map(s => (
                    <button key={s} onClick={() => setSpeed(s)} className={cn('px-2 py-0.5 rounded text-[10px] font-bold transition-colors', speed === s ? 'bg-[#C8A45C] text-[#0B2E58]' : 'text-white/50 hover:text-white')}>{s}x</button>
                  ))}
                </div>
                <span className="text-white/30 text-[10px] hidden sm:block max-w-[120px] truncate">{scene?.type}</span>
                <button onClick={toggleFullscreen} className="text-white/60 hover:text-white transition-colors p-1">{isFullscreen ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}</button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
