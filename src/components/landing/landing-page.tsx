'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Sparkles, FileText, Mail, GitBranch, PenTool, BarChart3,
  ArrowRight, CheckCircle2, Building2, GraduationCap, Landmark,
  Shield, Search, Lock, Cloud, Code2, Bell, ScrollText, Key,
  Users, Zap, Globe, ChevronRight, Star, Phone, MapPin
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { BRAND, DEMO_STATS } from '@/lib/constants'
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

/* ─── Data ────────────────────────────────────────────── */
const modules = [
  { icon: FileText, title: 'GED', desc: 'Gestion Électronique des Documents', detail: 'Classement, archivage et recherche intelligente de tous vos documents administratifs.' },
  { icon: Mail, title: 'Courriers Numériques', desc: 'Courriers entrants et sortants', detail: 'Traçabilité complète de vos courriers avec horodatage et circuits de validation.' },
  { icon: GitBranch, title: 'Workflows Administratifs', desc: 'Automatisation des processus', detail: 'Concevez et déployez des workflows sur mesure pour chaque procédure administrative.' },
  { icon: PenTool, title: 'Signatures Électroniques', desc: 'Signature numérique certifiée', detail: 'Signez et validez vos documents en toute sécurité avec une valeur juridique reconnue.' },
  { icon: BarChart3, title: 'Dashboard Décisionnel', desc: 'Tableaux de bord & KPIs', detail: 'Visualisez vos indicateurs clés en temps réel pour une prise de décision éclairée.' },
  { icon: Sparkles, title: 'IA & Automatisation', desc: 'Intelligence artificielle intégrée', detail: 'OCR intelligent, classification automatique et suggestions alimentées par l\'IA.' },
]

const features = [
  { icon: Search, title: 'OCR Intelligent', desc: 'Reconnaissance optique de caractères pour numériser vos documents papier.' },
  { icon: Search, title: 'Recherche Avancée', desc: 'Moteur de recherche plein texte avec filtres et facettes.' },
  { icon: GitBranch, title: 'Versioning', desc: 'Historique complet des modifications avec restauration.' },
  { icon: Shield, title: 'Permissions RBAC', desc: 'Contrôle d\'accès granulaire basé sur les rôles.' },
  { icon: Building2, title: 'Multi-tenant', desc: 'Architecture multi-organisations sécurisée.' },
  { icon: Cloud, title: 'Cloud-ready', desc: 'Déploiement cloud hybride ou on-premise.' },
  { icon: Code2, title: 'API Ouverte', desc: 'API REST complète pour intégrations tierces.' },
  { icon: Bell, title: 'Notifications Temps Réel', desc: 'Alertes instantanées push, email et SMS.' },
  { icon: ScrollText, title: 'Audit Logs', desc: 'Traçabilité complète de toutes les actions.' },
  { icon: Lock, title: 'Chiffrement', desc: 'Chiffrement de bout en bout des données sensibles.' },
]

const stats = [
  { value: 150, suffix: '+', label: 'Institutions' },
  { value: 50000, suffix: '+', label: 'Documents traités' },
  { value: 98, suffix: '.7%', label: 'Disponibilité' },
  { value: 24, suffix: '/7', label: 'Support' },
]

const steps = [
  { num: '01', title: 'Inscription', desc: 'Créez votre compte institutionnel en quelques minutes.', icon: Users },
  { num: '02', title: 'Configuration', desc: 'Paramétrez vos workflows, rôles et structures administratives.', icon: Zap },
  { num: '03', title: 'Migration', desc: 'Importez vos documents existants avec l\'aide de nos experts.', icon: Globe },
  { num: '04', title: 'Production', desc: 'Démarrez votre administration numérique avec un accompagnement continu.', icon: CheckCircle2 },
]

const testimonials = [
  {
    name: 'M. Mamadou Bailo Bah',
    role: 'Secrétaire Général',
    org: 'Ministère des Finances',
    text: 'eAdmin Suite a transformé notre gestion des courriers. Nous avons réduit les délais de traitement de 60% en moins de 6 mois. La plateforme est intuitive et nos agents l\'ont adoptée rapidement.',
  },
  {
    name: 'Mme Aissatou Diallo',
    role: 'Directrice des Systèmes d\'Information',
    org: 'Université Gamal Abdel Nasser',
    text: 'La flexibilité des workflows et la qualité du support technique font d\'eAdmin Suite un partenaire de confiance. Notre université a digitalisé plus de 15 000 dossiers étudiant en un an.',
  },
  {
    name: 'Dr. Ibrahima Sory Sylla',
    role: 'Directeur Général',
    org: 'Agence Nationale de l\'Inclusion Numérique',
    text: 'L\'architecture multi-tenant nous permet de servir chaque ministère avec sa propre configuration tout en maintenant une gouvernance centralisée. C\'est exactement ce dont nous avions besoin.',
  },
]

const institutions = [
  'Ministère des Finances', 'Ministère de l\'Éducation', 'Ministère de la Santé',
  'Université de Conakry', 'Assemblée Nationale', 'Cour Suprême',
]

/* ─── Component ────────────────────────────────────────── */
export function LandingPage() {
  const { navigate } = useAppStore()

  return (
    <div className="min-h-screen overflow-hidden">
      {/* ─── HERO ──────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#C8A45C]/20 rounded-full blur-[120px] animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#3B7DD8]/20 rounded-full blur-[120px] animate-pulse-soft" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C8A45C]/10 rounded-full blur-[150px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-6 bg-[#C8A45C]/20 text-[#C8A45C] border-[#C8A45C]/30 hover:bg-[#C8A45C]/30">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Plateforme GovTech N°1 en Guinée
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
              La plateforme{' '}
              <span className="text-[#C8A45C]">GovTech</span> de
              <br className="hidden sm:block" /> nouvelle génération pour
              <br className="hidden sm:block" /> la{' '}
              <span className="text-[#C8A45C]">Guinée</span> et l&apos;Afrique
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              Digitalisez votre administration avec une plateforme intégrée de GED,
              courriers numériques, workflows automatisés et signatures électroniques.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate('demo')}
                className="h-12 px-8 text-base bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] font-semibold"
              >
                Demander une démo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('solutions')}
                className="h-12 px-8 text-base border-white/20 text-white hover:bg-white/10"
              >
                Découvrir la plateforme
              </Button>
            </div>
          </motion.div>

          {/* Floating stat cards */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            {[
              { label: 'Courriers traités', value: DEMO_STATS.courriers.total.toLocaleString('fr-FR'), icon: Mail },
              { label: 'Documents archivés', value: DEMO_STATS.documents.total.toLocaleString('fr-FR'), icon: FileText },
              { label: 'Workflows actifs', value: DEMO_STATS.workflows.actifs.toString(), icon: GitBranch },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl p-4 text-center group hover:bg-white/10 transition-colors"
              >
                <stat.icon className="h-6 w-6 text-[#C8A45C] mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ─── TRUSTED BY ────────────────────────────────────── */}
      <AnimatedSection className="py-20 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Ils nous font confiance
            </p>
          </motion.div>
          <motion.div
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
          >
            {institutions.map((name) => (
              <motion.div
                key={name}
                variants={fadeUp}
                className="glass-card rounded-xl p-4 text-center hover:shadow-md transition-shadow"
              >
                <Building2 className="h-8 w-8 text-[#0B2E58]/40 dark:text-primary/40 mx-auto mb-2" />
                <p className="text-xs font-medium text-muted-foreground">{name}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ─── MODULES ───────────────────────────────────────── */}
      <AnimatedSection className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-[#C8A45C]/50 text-[#C8A45C]">
              Modules
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Une suite complète pour votre{' '}
              <span className="gradient-text">administration numérique</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Six modules intégrés qui couvrent l&apos;ensemble de vos besoins en gestion administrative digitale.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod) => (
              <motion.div key={mod.title} variants={fadeUp}>
                <Card className="glass-card hover:shadow-lg transition-all duration-300 group border-transparent hover:border-[#C8A45C]/30 h-full">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#0B2E58]/10 dark:bg-primary/10 group-hover:bg-[#0B2E58] dark:group-hover:bg-primary transition-colors">
                      <mod.icon className="h-6 w-6 text-[#0B2E58] dark:text-primary group-hover:text-white dark:group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">{mod.title}</h3>
                    <p className="text-sm font-medium text-[#C8A45C] mb-3">{mod.desc}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{mod.detail}</p>
                  </CardContent>
                </Card>
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
              <span className="gradient-text">de pointe</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Chaque fonctionnalité est conçue pour répondre aux exigences des administrations modernes.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {features.map((feat) => (
              <motion.div key={feat.title} variants={fadeUp}>
                <div className="glass-card rounded-xl p-5 h-full hover:shadow-md transition-all duration-300 group">
                  <feat.icon className="h-8 w-8 text-[#0B2E58] dark:text-primary mb-3 group-hover:text-[#C8A45C] transition-colors" />
                  <h3 className="text-sm font-semibold text-foreground mb-2">{feat.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── STATISTICS ────────────────────────────────────── */}
      <section className="py-24 bg-[#0B2E58] dark:bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8A45C]/10 rounded-full blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Des résultats qui parlent
              </h2>
              <p className="mt-4 text-lg text-white/60 max-w-2xl mx-auto">
                Notre plateforme accompagne les institutions guinéennes dans leur transformation digitale.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  className="text-center"
                >
                  <div className="text-4xl sm:text-5xl font-bold text-[#C8A45C]">
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
      <AnimatedSection className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-[#C8A45C]/50 text-[#C8A45C]">
              Processus
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Comment ça <span className="gradient-text">fonctionne</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Démarrez votre transformation digitale en 4 étapes simples.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0B2E58]/10 via-[#C8A45C]/40 to-[#0B2E58]/10 dark:from-primary/10 dark:via-gold/40 dark:to-primary/10" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step) => (
                <motion.div key={step.num} variants={fadeUp} className="relative">
                  <div className="text-center">
                    <div className="relative inline-flex mb-6">
                      <div className="h-16 w-16 rounded-full bg-[#0B2E58] dark:bg-primary flex items-center justify-center shadow-lg">
                        <step.icon className="h-7 w-7 text-[#C8A45C]" />
                      </div>
                      <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-[#C8A45C] text-[#0B2E58] text-xs font-bold flex items-center justify-center">
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
      <AnimatedSection className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-[#0B2E58]/30 dark:border-primary/30 text-[#0B2E58] dark:text-primary">
              Témoignages
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Ce que disent nos <span className="gradient-text">clients</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeUp}>
                <Card className="glass-card h-full border-transparent hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-[#C8A45C] text-[#C8A45C]" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#0B2E58] dark:bg-primary flex items-center justify-center text-white text-sm font-bold">
                        {t.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role} — {t.org}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── CTA ───────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] dark:from-primary dark:via-primary/80 dark:to-primary" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#C8A45C]/15 rounded-full blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Prêt à digitaliser votre <span className="text-[#C8A45C]">administration</span> ?
          </h2>
          <p className="mt-6 text-lg text-white/70 max-w-2xl mx-auto">
            Rejoignez les institutions qui ont déjà transformé leurs processus avec eAdmin Suite.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate('demo')}
              className="h-12 px-8 text-base bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] font-semibold"
            >
              Demander une démo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('contact')}
              className="h-12 px-8 text-base border-white/20 text-white hover:bg-white/10"
            >
              Nous contacter
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────── */}
      <footer className="bg-[#071D3A] dark:bg-background border-t border-border pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Produit */}
            <div>
              <h3 className="text-sm font-semibold text-white dark:text-foreground mb-4">Produit</h3>
              <ul className="space-y-2">
                {[
                  { label: 'GED', page: 'solutions' as const },
                  { label: 'Courriers', page: 'solutions' as const },
                  { label: 'Workflows', page: 'solutions' as const },
                  { label: 'Signatures', page: 'solutions' as const },
                  { label: 'Analytics', page: 'solutions' as const },
                  { label: 'Tarifs', page: 'pricing' as const },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => navigate(item.page)}
                      className="text-sm text-white/60 dark:text-muted-foreground hover:text-[#C8A45C] transition-colors"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {/* Entreprise */}
            <div>
              <h3 className="text-sm font-semibold text-white dark:text-foreground mb-4">Entreprise</h3>
              <ul className="space-y-2">
                {[
                  { label: 'À propos', page: 'about' as const },
                  { label: 'Services', page: 'services' as const },
                  { label: 'Carrières', page: 'about' as const },
                  { label: 'Blog', page: 'blog' as const },
                  { label: 'Contact', page: 'contact' as const },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => navigate(item.page)}
                      className="text-sm text-white/60 dark:text-muted-foreground hover:text-[#C8A45C] transition-colors"
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
                  { label: 'API Reference', page: 'faq' as const },
                  { label: 'Guides', page: 'faq' as const },
                  { label: 'FAQ', page: 'faq' as const },
                  { label: 'Communauté', page: 'blog' as const },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => navigate(item.page)}
                      className="text-sm text-white/60 dark:text-muted-foreground hover:text-[#C8A45C] transition-colors"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {/* Légal */}
            <div>
              <h3 className="text-sm font-semibold text-white dark:text-foreground mb-4">Légal</h3>
              <ul className="space-y-2">
                {[
                  'Mentions légales',
                  'Politique de confidentialité',
                  'CGU',
                  'Sécurité',
                  'RGPD',
                ].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-white/60 dark:text-muted-foreground hover:text-[#C8A45C] transition-colors cursor-pointer">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 dark:border-border pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#0B2E58] dark:bg-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[#C8A45C]" />
                </div>
                <span className="text-sm font-semibold text-white dark:text-foreground">
                  eAdmin Suite
                </span>
                <span className="text-xs text-white/40 dark:text-muted-foreground">
                  par {BRAND.company}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/40 dark:text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Conakry, Guinée
                </span>
                <span className="text-xs text-white/40 dark:text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> +224 622 00 00 00
                </span>
              </div>
              <p className="text-xs text-white/40 dark:text-muted-foreground">
                © {new Date().getFullYear()} {BRAND.company}. Tous droits réservés.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
