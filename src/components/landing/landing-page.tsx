'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Sparkles, FileText, Mail, GitBranch, PenTool, BarChart3,
  ArrowRight, CheckCircle2, Building2, Landmark,
  Shield, Search, Lock, Cloud, Code2, Bell, ScrollText,
  Users, Zap, Globe, ChevronRight, Star, Phone, MapPin,
  Server, Database, FileCheck, Scale, BookOpen, Award,
  Fingerprint, Eye, Cpu, Flag
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { BRAND, DEMO_STATS, LEGAL_REFERENCES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/* ─── Animation helpers ────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
}

function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.section
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  )
}

function CounterAnimation({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 2000
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target])

  return <span ref={ref}>{count.toLocaleString('fr-FR')}{suffix}</span>
}

/* ─── Floating Particles Component ───────────────────── */
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-[#C8A45C]/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float-particle ${8 + Math.random() * 12}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ─── Typing Reveal Text ─────────────────────────────── */
function TypingReveal({ text, className }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (inView && !started) {
      setStarted(true)
    }
  }, [inView, started])

  useEffect(() => {
    if (!started) return
    let idx = 0
    const timer = setInterval(() => {
      if (idx < text.length) {
        setDisplayed(text.slice(0, idx + 1))
        idx++
      } else {
        clearInterval(timer)
      }
    }, 40)
    return () => clearInterval(timer)
  }, [started, text])

  return (
    <span ref={ref} className={className}>
      {displayed}
      {displayed.length < text.length && started && (
        <span className="inline-block w-[3px] h-[0.8em] bg-[#C8A45C] ml-1 animate-pulse align-middle" />
      )}
    </span>
  )
}

/* ─── Data ────────────────────────────────────────────── */
const modules = [
  {
    icon: FileText,
    title: 'GED',
    desc: 'Gestion Électronique des Documents',
    detail: 'Archivage des décrets, arrêtés, circulaires et notes de service conformément au Code administratif de la République de Guinée.',
  },
  {
    icon: Mail,
    title: 'Courriers Numériques',
    desc: 'Courriers entrants et sortants',
    detail: 'Circuit du visa obligatoire : Service → Direction → Secrétariat Général → Cabinet du Ministre. Traçabilité complète avec horodatage certifié.',
  },
  {
    icon: GitBranch,
    title: 'Workflows Administratifs',
    desc: 'Automatisation des processus',
    detail: 'Procédures réglementaires : approbation budgétaire, marchés publics, recrutement fonction publique. Conformité au Code des marchés publics.',
  },
  {
    icon: PenTool,
    title: 'Signatures Électroniques',
    desc: 'Signature numérique certifiée',
    detail: 'Conforme au Décret n°D/2022/PRG/SGG sur la signature électronique à valeur juridique. Certification et non-répudiation garanties.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Décisionnel',
    desc: 'Tableaux de bord & KPIs',
    detail: 'Indicateurs du Plan National de Développement (PND) et suivi des performances interministérielles en temps réel.',
  },
  {
    icon: Sparkles,
    title: 'IA & Automatisation',
    desc: 'Intelligence artificielle intégrée',
    detail: 'Classification automatique des courriers conformément à la nomenclature administrative guinéenne. OCR intelligent et routing automatique.',
  },
]

const features = [
  { icon: Search, title: 'OCR Intelligent', desc: 'Reconnaissance optique de caractères pour numériser les documents administratifs papier.' },
  { icon: Search, title: 'Recherche Avancée', desc: 'Moteur de recherche plein texte avec filtres et facettes pour les archives nationales.' },
  { icon: GitBranch, title: 'Versioning', desc: 'Historique complet des modifications avec restauration des documents réglementaires.' },
  { icon: Shield, title: 'Permissions RBAC', desc: 'Contrôle d\'accès granulaire basé sur les rôles conformément à la hiérarchie administrative.' },
  { icon: Building2, title: 'Multi-institutions', desc: 'Architecture multi-tenant sécurisée pour les 24 institutions de l\'État.' },
  { icon: Cloud, title: 'Souveraineté Cloud', desc: 'Hébergement sur le territoire national en conformité avec la Loi L/2016/018/AN.' },
  { icon: Code2, title: 'API Interopérable', desc: 'API REST complète pour l\'interconnexion des systèmes d\'information ministériels.' },
  { icon: Bell, title: 'Notifications Temps Réel', desc: 'Alertes instantanées push, email et SMS pour les agents publics et les citoyens.' },
  { icon: ScrollText, title: 'Audit & Traçabilité', desc: 'Traçabilité complète de toutes les actions, conforme aux exigences de la Cour des Comptes.' },
  { icon: Lock, title: 'Chiffrement AES-256', desc: 'Chiffrement de bout en bout des données sensibles de l\'administration publique.' },
]

const stats = [
  { value: 18, suffix: '/24', label: 'Institutions connectées', icon: Building2 },
  { value: 87450, suffix: '', label: 'Documents officiels archivés', icon: FileText },
  { value: 124500, suffix: '', label: 'Citoyens inscrits', icon: Users },
  { value: 99, suffix: '.2%', label: 'Conformité réglementaire', icon: Shield },
]

const steps = [
  {
    num: '01',
    title: 'Déploiement ministériel',
    desc: 'Installation de la plateforme au sein du ministère avec configuration de l\'arbre organisationnel et des habilitations conformes à la hiérarchie administrative.',
    icon: Building2,
  },
  {
    num: '02',
    title: 'Paramétrage réglementaire',
    desc: 'Configuration des circuits de validation, nomenclature des courriers et procédures conformes au Code administratif et aux circulaires en vigueur.',
    icon: Scale,
  },
  {
    num: '03',
    title: 'Migration des archives',
    desc: 'Numérisation et importation des archives papier avec OCR intelligent, indexation selon la nomenclature administrative guinéenne.',
    icon: Globe,
  },
  {
    num: '04',
    title: 'Mise en production souveraine',
    desc: 'Déploiement en production sur l\'infrastructure nationale avec formation des agents et accompagnement continu par l\'ANIN.',
    icon: CheckCircle2,
  },
]

const testimonials = [
  {
    name: 'M. Alpha Oumar Diallo',
    role: 'Secrétaire Général',
    org: 'Ministère de l\'Économie et des Finances',
    text: 'La plateforme eAdministration Suite a transformé la gestion interministérielle de nos courriers. Nous avons réduit les délais de traitement de 60% en moins de 6 mois. La conformité au Décret sur la signature électronique est un atout majeur pour notre ministère.',
  },
  {
    name: 'Mme Mariama Baldé',
    role: 'Directrice de la Modernisation Administrative',
    org: 'Primature',
    text: 'Conformément à la Circulaire n°001/PM/CAB, nous avons déployé la plateforme dans 18 institutions. La souplesse des workflows et la traçabilité complète répondent aux exigences de la Cour des Comptes et du Code administratif.',
  },
  {
    name: 'Dr. Mamadou Saliou Bah',
    role: 'Président',
    org: 'Autorité de Régulation des Communications Électroniques et des Postes (ARCEP)',
    text: 'L\'architecture souveraine de la plateforme, avec son hébergement national et son chiffrement AES-256, est conforme à la Loi L/2016/018/AN sur la protection des données. C\'est un modèle pour l\'administration numérique en Afrique de l\'Ouest.',
  },
  {
    name: 'M. Ibrahima Tounkara',
    role: 'Gouverneur',
    org: 'Région Administrative de Conakry',
    text: 'Le déploiement dans les 5 communes de Conakry a permis de traiter plus de 8 700 demandes citoyennes avec un taux de satisfaction de 94%. La décentralisation numérique est désormais une réalité pour les citoyens guinéens.',
  },
]

const institutionNames = [
  'Présidence de la République',
  'Primature',
  'Min. Administration Territoriale',
  'Min. Économie et Finances',
  'Min. Éducation Nationale',
  'Min. Santé et Hygiène Publique',
  'Min. Justice, Gardien des Sceaux',
  'Min. Défense Nationale',
  'Min. Mines et Géologie',
  'Assemblée Nationale',
  'Cour des Comptes',
  'ANIN',
  'ARCEP',
  'Conseil Économique et Social',
  'Min. Agriculture et Élevage',
  'Min. Plan et Coopération',
]

const sovereigntyCards = [
  {
    icon: Server,
    title: 'Data Center Conakry',
    desc: 'Infrastructure d\'hébergement souveraine située à Conakry, garantissant la disponibilité et l\'intégrité des données de l\'État.',
  },
  {
    icon: Shield,
    title: 'Conformité Loi L/2016/018',
    desc: 'Protection des données à caractère personnel conformément à la loi guinéenne. Aucun transfert de données hors du territoire national.',
  },
  {
    icon: Fingerprint,
    title: 'Chiffrement AES-256',
    desc: 'Chiffrement de bout en bout des données sensibles de l\'administration publique avec les standards les plus élevés.',
  },
  {
    icon: Eye,
    title: 'Audit de sécurité ANSSI',
    desc: 'Audits réguliers de sécurité par les autorités nationales compétentes pour garantir la résilience du système d\'information.',
  },
]

/* ─── Component ────────────────────────────────────────── */
export function LandingPage() {
  const { navigate } = useAppStore()

  return (
    <div className="min-h-screen overflow-hidden">
      {/* ─── HERO — Presidential Digital ────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background image - Conakry skyline */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/guinea-hero-conakry.png')" }}
        />
        {/* Sophisticated mesh gradient overlay */}
        <div className="absolute inset-0 hero-mesh-gradient/92" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B2E58]/60 via-transparent to-[#0B2E58]/80" />

        {/* Animated moving grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(200,164,92,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,164,92,0.3) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            animation: 'grid-drift 20s linear infinite',
          }}
        />

        {/* Floating particles */}
        <FloatingParticles />

        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#C8A45C]/20 rounded-full blur-[120px] animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#3B7DD8]/20 rounded-full blur-[120px] animate-pulse-soft delay-500" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C8A45C]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-[#009460]/10 rounded-full blur-[100px] animate-pulse-soft delay-300" />

        {/* Guinea tricolor accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#009460]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Republic emblem */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-4"
            >
              <p className="text-[#C8A45C] text-sm sm:text-base font-semibold tracking-wider uppercase">
                🇬🇳 République de Guinée — Travail · Justice · Solidarité
              </p>
            </motion.div>

            {/* Premium hero badge with glassmorphism + gold border */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8 inline-block"
            >
              <div className="glass-premium rounded-full px-5 py-2 inline-flex items-center gap-2 animate-border-glow">
                <Landmark className="h-4 w-4 text-[#C8A45C]" />
                <span className="text-sm font-semibold text-gradient-gold">
                  Plateforme Nationale de eAdministration — République de Guinée
                </span>
              </div>
            </motion.div>

            {/* Main heading with typing reveal effect */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="block"
              >
                L&apos;administration numérique
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="block"
              >
                de la{' '}
                <TypingReveal
                  text="République de Guinée"
                  className="text-gradient-gold"
                />
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="mt-6 text-lg sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed"
            >
              Conformément à la Circulaire n°001/PM/CAB, la plateforme eAdministration Suite assure
              la digitalisation de l&apos;ensemble des procédures administratives pour les 24 institutions
              de l&apos;État guinéen et les 8 régions administratives.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {/* Premium CTA button with gold shimmer */}
              <button
                onClick={() => navigate('login')}
                className="btn-gold h-12 px-8 text-base font-semibold shadow-gold animate-shimmer-gold"
              >
                Accéder à la plateforme
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              {/* Glass effect outline button */}
              <button
                onClick={() => navigate('citizen-portal')}
                className="h-12 px-8 text-base font-semibold rounded-[var(--radius)] border border-white/20 text-white hover:bg-white/10 backdrop-blur-md bg-white/5 transition-all duration-300 hover:border-white/30 hover:shadow-lg"
              >
                Portail Citoyen
              </button>
            </motion.div>
          </motion.div>

          {/* Floating stat cards with glass-premium */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            {[
              { label: 'Institutions connectées', value: `${DEMO_STATS.institutions.connectees}/${DEMO_STATS.institutions.total}`, icon: Building2 },
              { label: 'Courriers interministériels', value: DEMO_STATS.courriers.total.toLocaleString('fr-FR'), icon: Mail },
              { label: 'Citoyens inscrits', value: DEMO_STATS.citoyens.inscrits.toLocaleString('fr-FR'), icon: Users },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass-premium rounded-xl p-4 text-center group hover:bg-white/10 transition-all duration-300"
              >
                <stat.icon className="h-6 w-6 text-[#C8A45C] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-2xl font-bold text-white tabular-nums tracking-tight">{stat.value}</div>
                <div className="text-sm text-white/60 font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ─── INSTITUTIONS DE LA RÉPUBLIQUE ────────────────── */}
      <AnimatedSection className="py-20 relative overflow-hidden">
        {/* Background image - Grand Mosque of Conakry */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/guinea-mosque-conakry.png')" }}
        />
        <div className="absolute inset-0 bg-background/92" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <div className="badge-premium inline-flex mb-3">
              <Building2 className="h-3.5 w-3.5" />
              Institutions de la République
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Les institutions de l&apos;État guinéen engagées dans la transformation numérique
            </p>
          </motion.div>
          <motion.div
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 lg:gap-5"
          >
            {institutionNames.map((name) => (
              <motion.div
                key={name}
                variants={fadeUp}
                className="card-interactive rounded-xl p-4 text-center"
              >
                <Building2 className="h-7 w-7 text-[#0B2E58]/40 dark:text-primary/40 mx-auto mb-2" />
                <p className="text-xs font-medium text-muted-foreground leading-tight">{name}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ─── DÉCOUVREZ LA GUINÉE ───────────────────────────── */}
      <AnimatedSection className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-[#CE1126]/40 text-[#CE1126]">
              <Flag className="h-3.5 w-3.5 mr-1" />
              Découvrez la Guinée
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Une nation d&apos;exception,{' '}
              <span className="text-gradient-gold">une richesse naturelle</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              De Conakry aux hauts plateaux du Fouta Djallon, du Mont Nimba au fleuve Niger, la Guinée offre des paysages d&apos;une beauté incomparable.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                img: '/guinea-hero-conakry.png',
                title: 'Conakry, la capitale',
                desc: 'Métropole dynamique bordée par l\'Atlantique, carrefour économique et culturel de l\'Afrique de l\'Ouest.',
              },
              {
                img: '/guinea-nimba-mountains.png',
                title: 'Mont Nimba',
                desc: 'Patrimoine mondial de l\'UNESCO, massif montagneux aux écosystèmes uniques et à la biodiversité exceptionnelle.',
              },
              {
                img: '/guinea-niger-river.png',
                title: 'Fleuve Niger',
                desc: 'Prend sa source en Guinée, le fleuve nourrit des millions de personnes à travers l\'Afrique de l\'Ouest.',
              },
              {
                img: '/guinea-fouta-djallon.png',
                title: 'Fouta Djallon',
                desc: 'Hauts plateaux aux cascades majestueuses, le « château d\'eau » de l\'Afrique de l\'Ouest.',
              },
              {
                img: '/guinea-mosque-conakry.png',
                title: 'Grande Mosquée de Conakry',
                desc: 'L\'un des plus grands édifices religieux d\'Afrique, symbole de la ferveur spirituelle guinéenne.',
              },
              {
                img: '/guinea-culture-dance.png',
                title: 'Culture et traditions',
                desc: 'Danses traditionnelles, djembé et griots perpétuent l\'héritage culturel riche et diversifié de la Guinée.',
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp}>
                <div className="card-interactive overflow-hidden group h-full">
                  <div className="relative h-48 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url('${item.img}')` }}
                    />
                    {/* Premium gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B2E58]/80 via-[#0B2E58]/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#C8A45C]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute bottom-3 left-4">
                      <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                    </div>
                  </div>
                  <div className="p-4 bg-card">
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── MODULES ───────────────────────────────────────── */}
      <AnimatedSection className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="badge-premium inline-flex mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Modules
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Une suite complète pour{' '}
              <span className="text-gradient-gold">l&apos;administration numérique</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Six modules intégrés conformes aux exigences réglementaires de la République de Guinée.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod) => (
              <motion.div key={mod.title} variants={fadeUp}>
                <div className="card-interactive h-full group">
                  <div className="p-6">
                    {/* Refined icon container with gradient on hover */}
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#0B2E58]/10 to-[#3B7DD8]/5 dark:from-primary/10 dark:to-primary/5 group-hover:from-[#0B2E58] group-hover:to-[#134A8E] dark:group-hover:from-primary dark:group-hover:to-primary/80 transition-all duration-400">
                      <mod.icon className="h-6 w-6 text-[#0B2E58] dark:text-primary group-hover:text-[#C8A45C] transition-colors duration-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">{mod.title}</h3>
                    <p className="text-sm font-medium text-gradient-gold mb-3">{mod.desc}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{mod.detail}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── KEY FEATURES ──────────────────────────────────── */}
      <AnimatedSection className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-[#0B2E58]/30 dark:border-primary/30 text-[#0B2E58] dark:text-primary">
              Fonctionnalités
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Des fonctionnalités{' '}
              <span className="text-gradient-gold">de pointe</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Chaque fonctionnalité est conçue pour répondre aux exigences de l&apos;administration publique guinéenne.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {features.map((feat) => (
              <motion.div key={feat.title} variants={fadeUp}>
                <div className="card-interactive rounded-xl p-5 h-full group">
                  {/* Icon with gradient background */}
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0B2E58]/10 to-[#C8A45C]/5 dark:from-primary/10 dark:to-gold/5 group-hover:from-[#0B2E58]/20 group-hover:to-[#C8A45C]/10 transition-all duration-300">
                    <feat.icon className="h-5 w-5 text-[#0B2E58] dark:text-primary group-hover:text-[#C8A45C] transition-colors" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">{feat.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── GOVERNANCE ────────────────────────────────────── */}
      <AnimatedSection className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="badge-premium inline-flex mb-4">
              <Scale className="h-3.5 w-3.5" />
              Gouvernance
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Conformité et{' '}
              <span className="text-gradient-gold">Gouvernance Numérique</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              La plateforme est conforme à l&apos;ensemble du cadre juridique et réglementaire de la République de Guinée.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LEGAL_REFERENCES.map((ref) => (
              <motion.div key={ref.id} variants={fadeUp}>
                <div className="card-interactive h-full">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0B2E58]/10 to-[#3B7DD8]/5 dark:from-primary/10 dark:to-primary/5">
                        <BookOpen className="h-5 w-5 text-[#0B2E58] dark:text-primary" />
                      </div>
                      <Badge
                        className={cn(
                          'text-xs',
                          ref.status === 'conforme'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        )}
                      >
                        {ref.status === 'conforme' ? 'Conforme' : 'En application'}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-gradient-gold mb-1">{ref.reference}</p>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{ref.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ref.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Data sovereignty banner with tricolor gradient */}
          <motion.div variants={fadeUp} className="mt-10">
            <div className="relative rounded-xl overflow-hidden p-6 text-center shadow-premium">
              {/* Tricolor gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B2E58] via-[#134A8E] to-[#0B2E58]" />
              <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#009460]" style={{ backgroundSize: '200% 100%', animation: 'gradient-flow 8s ease infinite' }} />
              {/* Top gold accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C8A45C]/60 to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Database className="h-5 w-5 text-[#C8A45C]" />
                  <span className="text-[#C8A45C] font-semibold text-sm uppercase tracking-wider">
                    Souveraineté des données
                  </span>
                </div>
                <p className="text-white/80 text-sm">
                  Hébergement des données sur le territoire national — Conformément à la Loi n°L/2016/018/AN sur la protection des données personnelles
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ─── NATIONAL SOVEREIGNTY ──────────────────────────── */}
      <AnimatedSection className="py-24 relative overflow-hidden">
        {/* Background image - Fouta Djallon highlands */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/guinea-fouta-djallon.png')" }}
        />
        <div className="absolute inset-0 bg-background/93" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="badge-premium inline-flex mb-4">
              <Flag className="h-3.5 w-3.5" />
              Souveraineté
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Souveraineté numérique et{' '}
              <span className="text-gradient-gold">hébergement national</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              L&apos;infrastructure de la plateforme est entièrement hébergée sur le territoire national, garantissant la souveraineté des données de l&apos;État guinéen.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sovereigntyCards.map((card) => (
              <motion.div key={card.title} variants={fadeUp}>
                <div className="card-interactive group h-full">
                  <div className="p-6 text-center">
                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0B2E58]/10 to-[#3B7DD8]/5 dark:from-primary/10 dark:to-primary/5 group-hover:from-[#0B2E58] group-hover:to-[#134A8E] dark:group-hover:from-primary dark:group-hover:to-primary/80 transition-all duration-400">
                      <card.icon className="h-7 w-7 text-[#0B2E58] dark:text-primary group-hover:text-[#C8A45C] transition-colors duration-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{card.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── STATISTICS ────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        {/* Background image - Mount Nimba */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/guinea-nimba-mountains.png')" }}
        />
        <div className="absolute inset-0 bg-[#0B2E58]/92 dark:bg-primary/92" />
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 opacity-30 hero-mesh-gradient" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8A45C]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-[#3B7DD8]/8 rounded-full blur-[100px]" />

        {/* Guinea tricolor accent at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#009460]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <p className="text-[#C8A45C] text-sm font-semibold tracking-wider uppercase mb-2">
                🇬🇳 République de Guinée
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Des résultats au service de l&apos;État
              </h2>
              <p className="mt-4 text-lg text-white/60 max-w-2xl mx-auto">
                La plateforme eAdministration Suite accompagne la transformation numérique de l&apos;administration publique guinéenne.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  className="text-center"
                >
                  {/* Refined icon container */}
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 mb-4">
                    <stat.icon className="h-6 w-6 text-[#C8A45C]/70" />
                  </div>
                  <div className="text-4xl sm:text-5xl font-bold text-gradient-gold tabular-nums tracking-tight">
                    <CounterAnimation target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="mt-2 text-sm font-medium text-white/70">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────── */}
      <AnimatedSection className="py-24 relative overflow-hidden">
        {/* Background image - Niger River */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/guinea-niger-river.png')" }}
        />
        <div className="absolute inset-0 bg-background/93" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="badge-premium inline-flex mb-4">
              <Zap className="h-3.5 w-3.5" />
              Processus
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Comment ça <span className="text-gradient-gold">fonctionne</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Déploiement de la plateforme dans les institutions de l&apos;État en 4 étapes réglementaires.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connecting line with gradient effect */}
            <div className="hidden lg:block absolute top-[2rem] left-[12%] right-[12%] h-[2px]">
              <div className="w-full h-full bg-gradient-to-r from-[#0B2E58]/20 via-[#C8A45C]/50 to-[#0B2E58]/20 dark:from-primary/20 dark:via-[#C8A45C]/50 dark:to-primary/20 rounded-full" />
              <div className="absolute inset-0 animate-shimmer-gold opacity-50 rounded-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
              {steps.map((step) => (
                <motion.div key={step.num} variants={fadeUp} className="relative">
                  <div className="text-center">
                    {/* Step circle with gradient background and gold accents */}
                    <div className="relative inline-flex mb-6">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#0B2E58] to-[#134A8E] dark:from-primary dark:to-primary/80 flex items-center justify-center shadow-lg shadow-navy animate-glow-pulse">
                        <step.icon className="h-7 w-7 text-[#C8A45C]" />
                      </div>
                      <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gradient-to-br from-[#C8A45C] to-[#D4B878] text-[#0B2E58] text-xs font-bold flex items-center justify-center shadow-gold">
                        {step.num}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ─── TESTIMONIALS ──────────────────────────────────── */}
      <AnimatedSection className="py-24 relative overflow-hidden">
        {/* Background image - Guinean culture & dance */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/guinea-culture-dance.png')" }}
        />
        <div className="absolute inset-0 bg-muted/90" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="badge-premium inline-flex mb-4">
              <Award className="h-3.5 w-3.5" />
              Témoignages
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Les retours des <span className="text-gradient-gold">institutions de l&apos;État</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeUp}>
                <div className="card-interactive h-full">
                  <div className="p-6">
                    {/* Star ratings with gold gradient */}
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-[#C8A45C] text-[#C8A45C]" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0B2E58] to-[#134A8E] dark:from-primary dark:to-primary/80 flex items-center justify-center text-white text-sm font-bold shadow-navy">
                        {t.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t.name}</p>
                        <p className="text-xs text-gradient-gold font-medium">{t.role}</p>
                        <p className="text-xs text-muted-foreground">{t.org}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── CTA ───────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        {/* Background image - Fouta Djallon waterfalls */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/guinea-fouta-djallon.png')" }}
        />
        {/* Premium gradient background with mesh effect */}
        <div className="absolute inset-0 hero-mesh-gradient/92" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B2E58]/70 via-transparent to-[#0B2E58]/90" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#C8A45C]/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/3 w-60 h-60 bg-[#3B7DD8]/10 rounded-full blur-[80px]" />

        {/* Floating particles */}
        <FloatingParticles />

        {/* Guinea tricolor accent */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#009460]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#C8A45C] text-sm font-semibold tracking-wider uppercase mb-4">
            🇬🇳 République de Guinée
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Rejoignez la transformation numérique de{' '}
            <span className="text-gradient-gold">l&apos;administration guinéenne</span>
          </h2>
          <p className="mt-6 text-lg text-white/70 max-w-2xl mx-auto">
            Conformément à la Circulaire n°001/PM/CAB, toutes les institutions de l&apos;État sont appelées à adopter la plateforme eAdministration Suite.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Premium CTA button with gold shimmer */}
            <button
              onClick={() => navigate('login')}
              className="btn-gold h-12 px-8 text-base font-semibold shadow-gold animate-shimmer-gold"
            >
              Accéder à la plateforme
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            {/* Glass effect outline button */}
            <button
              onClick={() => navigate('citizen-portal')}
              className="h-12 px-8 text-base font-semibold rounded-[var(--radius)] border border-white/20 text-white hover:bg-white/10 backdrop-blur-md bg-white/5 transition-all duration-300 hover:border-white/30 hover:shadow-lg"
            >
              Portail Citoyen
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER — Premium Dark ──────────────────────────── */}
      <footer className="relative bg-[#071D3A] dark:bg-background border-t border-border pt-16 pb-8 overflow-hidden">
        {/* Subtle background mesh */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage:
            'radial-gradient(at 20% 80%, rgba(200,164,92,0.15) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(59,125,216,0.1) 0%, transparent 50%)',
        }} />

        {/* Guinea tricolor at top */}
        <div className="flex h-1 mb-8">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#009460]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Republic header */}
          <div className="text-center mb-12">
            <p className="text-gradient-gold text-lg font-semibold tracking-wide">
              République de Guinée — Travail · Justice · Solidarité
            </p>
            <p className="text-white/50 text-sm mt-1">
              Site officiel du Gouvernement guinéen
            </p>
            <p className="text-white/30 text-xs mt-1 flex items-center justify-center gap-1">
              <Database className="h-3 w-3" />
              Hébergé en souveraineté numérique sur le territoire national
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Plateforme */}
            <div>
              <h3 className="text-sm font-semibold text-white dark:text-foreground mb-4">Plateforme</h3>
              <ul className="space-y-2">
                {[
                  { label: 'GED', page: 'solutions' as const },
                  { label: 'Courriers', page: 'solutions' as const },
                  { label: 'Workflows', page: 'solutions' as const },
                  { label: 'Signatures', page: 'solutions' as const },
                  { label: 'Analytics', page: 'solutions' as const },
                  { label: 'Portail Citoyen', page: 'citizen-portal' as const },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => navigate(item.page)}
                      className="text-sm text-white/60 dark:text-muted-foreground hover:text-[#C8A45C] transition-colors duration-200"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {/* Institutions */}
            <div>
              <h3 className="text-sm font-semibold text-white dark:text-foreground mb-4">Institutions</h3>
              <ul className="space-y-2">
                {[
                  { label: 'Présidence', page: 'about' as const },
                  { label: 'Primature', page: 'about' as const },
                  { label: 'Ministères', page: 'about' as const },
                  { label: 'Assemblée Nationale', page: 'about' as const },
                  { label: 'ANIN', page: 'about' as const },
                  { label: 'ARCEP', page: 'about' as const },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => navigate(item.page)}
                      className="text-sm text-white/60 dark:text-muted-foreground hover:text-[#C8A45C] transition-colors duration-200"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {/* Ressources */}
            <div>
              <h3 className="text-sm font-semibold text-white dark:text-foreground mb-4">Ressources</h3>
              <ul className="space-y-2">
                {[
                  { label: 'Documentation', page: 'faq' as const },
                  { label: 'API Interopérabilité', page: 'faq' as const },
                  { label: 'Guides ministériels', page: 'faq' as const },
                  { label: 'FAQ', page: 'faq' as const },
                  { label: 'Formation agents', page: 'services' as const },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => navigate(item.page)}
                      className="text-sm text-white/60 dark:text-muted-foreground hover:text-[#C8A45C] transition-colors duration-200"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {/* Légal */}
            <div>
              <h3 className="text-sm font-semibold text-white dark:text-foreground mb-4">Cadre juridique</h3>
              <ul className="space-y-2">
                {[
                  'Mentions légales',
                  'Données personnelles (Loi L/2016/018/AN)',
                  'Conditions générales',
                  'Accessibilité',
                  'Décret signature électronique',
                ].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-white/60 dark:text-muted-foreground hover:text-[#C8A45C] transition-colors duration-200 cursor-pointer">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider with premium style */}
          <div className="divider-premium mb-8" />

          <div className="pt-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#0B2E58] to-[#134A8E] dark:from-primary dark:to-primary/80 flex items-center justify-center overflow-hidden shadow-navy">
                  <img src="/logo-128.png" alt="Armories de la République de Guinée" className="h-8 w-8 object-contain" />
                </div>
                <span className="text-sm font-semibold text-white dark:text-foreground">
                  eAdministration Suite
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-white/40 dark:text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Conakry, République de Guinée
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> +224 622 00 00 00
                </span>
              </div>
              <div className="text-center">
                <p className="text-xs text-white/40 dark:text-muted-foreground">
                  © 2026 République de Guinée — Ministère des Postes, Télécommunications et de l&apos;Économie Numérique
                </p>
                <p className="text-xs text-white/30 dark:text-muted-foreground/60 mt-1">
                  Conçu et développé par {BRAND.company} pour la République de Guinée
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
