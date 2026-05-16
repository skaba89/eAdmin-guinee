'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Play, Pause, X, CheckCircle2,
  Users, FileText, Mail, GitBranch, PenTool, Globe, Shield,
  Lock, Brain, BarChart3, Settings, Library, Archive,
  Search, Download, Eye, QrCode, Building2, Clock, Star,
  Landmark, Award, BookOpen, Scale, Stethoscope, Home,
  MapPin, Briefcase, GraduationCap, Baby, Heart, IdCard,
  Car, Stamp, Church, Calculator, Coins, LayoutDashboard,
  ScrollText, UserCheck, Smartphone, Zap, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/app-store'

const GUINEA_RED = '#CE1126'
const GUINEA_YELLOW = '#FCD116'
const GUINEA_GREEN = '#009460'

interface TourStep {
  id: number
  chapter: string
  title: string
  subtitle: string
  features: { text: string; highlight?: boolean }[]
  visualType: string
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 1, chapter: 'Chapitre 01', title: 'Introduction', subtitle: 'eAdministration Suite Guinea — Vision & Mission',
    features: [
      { text: 'Plateforme GovTech de nouvelle génération pour la République de Guinée' },
      { text: 'Digitalisation intégrée de l\'administration publique', highlight: true },
      { text: 'Conformité avec le cadre juridique guinéen (Loi n°L/2016/018/AN)' },
      { text: 'Architecture souveraine — Données hébergées en Guinée' },
      { text: 'Interopérabilité entre 24 institutions gouvernementales', highlight: true },
    ],
    visualType: 'intro',
  },
  {
    id: 2, chapter: 'Chapitre 02', title: 'Connexion Multi-profils', subtitle: '6 comptes de démonstration pour chaque rôle',
    features: [
      { text: 'Ministre — Vue stratégique et tableau de bord exécutif' },
      { text: 'Directeur Général — Gestion opérationnelle et supervision', highlight: true },
      { text: 'Chef de Service — Traitement des dossiers et validation' },
      { text: 'Agent — Saisie, suivi et traitement des demandes' },
      { text: 'Citoyen — Portail de services publics en ligne', highlight: true },
      { text: 'Administrateur — Configuration système et gestion des accès' },
    ],
    visualType: 'login',
  },
  {
    id: 3, chapter: 'Chapitre 03', title: 'Tableau de bord décisionnel', subtitle: 'KPIs, graphiques et actions rapides',
    features: [
      { text: '14 250 courriers interministériels traités — +18.3%' },
      { text: '87 450 documents officiels archivés — +22.1%', highlight: true },
      { text: '234 procédures numérisées — +45.2%' },
      { text: 'Délai moyen de traitement : 1.8 jours — -32.5%' },
      { text: 'Taux de conformité réglementaire : 99.2%', highlight: true },
      { text: '8 KPIs en temps réel avec tendances et export' },
    ],
    visualType: 'dashboard',
  },
  {
    id: 4, chapter: 'Chapitre 04', title: 'GED — Gestion des Documents', subtitle: '87 450 documents, classification et archivage',
    features: [
      { text: '87 450 documents officiels gérés électroniquement' },
      { text: 'Classification automatique par IA (PUBLIC, DIFFUSION LIMITÉE, CONFIDENTIEL, SECRET)', highlight: true },
      { text: 'Recherche全文 par référence, objet, institution, région' },
      { text: 'Filtres avancés : classification, institution, région, dates' },
      { text: 'Consultation en ligne avec branding République de Guinée', highlight: true },
      { text: 'Export vers les Archives Nationales' },
    ],
    visualType: 'ged',
  },
  {
    id: 5, chapter: 'Chapitre 05', title: 'Courriers Officiels', subtitle: '14 250 courriers, priorités et suivi',
    features: [
      { text: '8 730 courriers entrants — 5 520 courriers sortants' },
      { text: '412 courriers en attente — 87 urgents', highlight: true },
      { text: 'Système de priorité : Urgent, Haut, Normal, Bas' },
      { text: 'Suivi en temps réel du pipeline de traitement' },
      { text: 'Assignation automatique aux services compétents', highlight: true },
      { text: 'Notifications et rappels intégrés' },
    ],
    visualType: 'courriers',
  },
  {
    id: 6, chapter: 'Chapitre 06', title: 'Workflows', subtitle: '234 workflows, pipeline et automatisation',
    features: [
      { text: '234 workflows actifs — 1 876 workflows complétés' },
      { text: '412 en cours — 89 en attente', highlight: true },
      { text: 'Pipeline visuel avec étapes personnalisables' },
      { text: 'Automatisation des tâches répétitives' },
      { text: 'Validation multi-niveaux avec rôles', highlight: true },
      { text: 'Tableau de bord de suivi en temps réel' },
    ],
    visualType: 'workflow',
  },
  {
    id: 7, chapter: 'Chapitre 07', title: 'Signatures Électroniques', subtitle: 'Signature numérique et vérification',
    features: [
      { text: 'Signature numérique conforme au Décret n°D/2022/PRG/SGG' },
      { text: 'Vérification d\'authenticité en temps réel', highlight: true },
      { text: 'Certificats numériques sécurisés' },
      { text: 'Horodatage certifié (timestamp)' },
      { text: 'Traçabilité complète des signatures', highlight: true },
      { text: 'Intégration avec les workflows de validation' },
    ],
    visualType: 'signatures',
  },
  {
    id: 8, chapter: 'Chapitre 08', title: 'Portail Citoyen', subtitle: '28 services, 9 catégories',
    features: [
      { text: '28 services publics en ligne répartis en 9 catégories' },
      { text: '124 500 citoyens inscrits — 94% de satisfaction', highlight: true },
      { text: 'État Civil, Justice, Identification, Urbanisme, Entreprise...' },
      { text: 'Suivi en temps réel des demandes' },
      { text: 'Livraison multi-canal : en ligne, guichet, courrier', highlight: true },
      { text: 'Interface intuitive accessible sur mobile' },
    ],
    visualType: 'portal',
  },
  {
    id: 9, chapter: 'Chapitre 09', title: 'Services Sans Compte', subtitle: 'Accès public aux démarches simples',
    features: [
      { text: 'Extrait d\'acte de naissance — Gratuit, 48h' },
      { text: 'Casier judiciaire — Procédure standard', highlight: true },
      { text: 'Certificat de vaccination — Gratuit, 24h' },
      { text: 'Attestation de scolarité — Gratuit, 48h' },
      { text: 'Certificat de résidence — Gratuit, 24h', highlight: true },
      { text: '8 services accessibles sans créer de compte' },
    ],
    visualType: 'no-account',
  },
  {
    id: 10, chapter: 'Chapitre 10', title: 'Services Avec Compte', subtitle: 'Démarches complexes nécessitant un profil',
    features: [
      { text: 'Carte d\'identité biométrique — Données biométriques' },
      { text: 'Passeport biométrique — Procédure internationale', highlight: true },
      { text: 'Permis de conduire — Données médicales et auto-école' },
      { text: 'Enregistrement entreprise — APIP, documents commerciaux' },
      { text: 'Permis de construire — Études et plans requis', highlight: true },
      { text: '20 services nécessitant un compte sécurisé' },
    ],
    visualType: 'with-account',
  },
  {
    id: 11, chapter: 'Chapitre 11', title: 'Soumission & Suivi de Demandes', subtitle: 'Numéro de référence et timeline',
    features: [
      { text: 'Soumission en ligne avec formulaire guidé' },
      { text: 'Numéro de référence unique (GN-2026-XXXXXX)', highlight: true },
      { text: 'Timeline visuelle de l\'avancement' },
      { text: 'Notifications à chaque étape du traitement' },
      { text: 'Possibilité de fournir des pièces complémentaires', highlight: true },
      { text: 'Suivi par SMS, email et WhatsApp' },
    ],
    visualType: 'tracking',
  },
  {
    id: 12, chapter: 'Chapitre 12', title: 'Traitement par les Agents', subtitle: 'Assignation, notes et changements de statut',
    features: [
      { text: 'Tableau de bord agent avec files d\'attente' },
      { text: 'Assignation automatique ou manuelle des dossiers', highlight: true },
      { text: 'Notes de traitement internes et externes' },
      { text: 'Changements de statut : Soumise → En cours → Prête → Livrée' },
      { text: 'Demande de pièces complémentaires', highlight: true },
      { text: 'Historique complet des actions' },
    ],
    visualType: 'agent',
  },
  {
    id: 13, chapter: 'Chapitre 13', title: 'Génération Sécurisée de Documents', subtitle: 'Branding Guinée, filigranes et QR codes',
    features: [
      { text: 'En-tête République de Guinée avec tricolore' },
      { text: 'Filigrane de sécurité (watermark)', highlight: true },
      { text: 'QR code de vérification sur chaque document' },
      { text: 'Badge de classification de sécurité' },
      { text: 'Signature numérique vérifiée', highlight: true },
      { text: 'Références légales et autorité émettrice' },
    ],
    visualType: 'doc-gen',
  },
  {
    id: 14, chapter: 'Chapitre 14', title: 'Consultation & Téléchargement', subtitle: 'Visualisation en ligne et export PDF',
    features: [
      { text: 'Consultation en ligne avec aperçu complet' },
      { text: 'Branding République de Guinée intégré', highlight: true },
      { text: 'Contrôles de zoom et ajustement de page' },
      { text: 'Téléchargement en PDF avec nommage automatique' },
      { text: 'Impression sécurisée avec filigrane', highlight: true },
      { text: 'Partage par lien sécurisé' },
    ],
    visualType: 'viewer',
  },
  {
    id: 15, chapter: 'Chapitre 15', title: 'Système d\'Archivage', subtitle: 'Archives nationales et durées de conservation',
    features: [
      { text: '2 450 documents archivés aux Archives Nationales' },
      { text: 'Durées de conservation : 5, 10, 30 ans ou permanente', highlight: true },
      { text: 'Catégories : Administratif, Juridique, Financier, Historique' },
      { text: 'Restauration de documents archivés' },
      { text: 'Consultation en ligne des archives', highlight: true },
      { text: 'Conformité avec le Code administratif' },
    ],
    visualType: 'archive',
  },
  {
    id: 16, chapter: 'Chapitre 16', title: 'Analyse & Aide à la Décision', subtitle: 'Graphiques, tendances et exports',
    features: [
      { text: 'Tableaux de bord analytiques en temps réel' },
      { text: 'Graphiques de tendances mensuelles', highlight: true },
      { text: 'Export des données en CSV et PDF' },
      { text: 'Indicateurs PND (Plan National de Développement)' },
      { text: 'Comparaisons inter-institutions', highlight: true },
      { text: 'Rapports personnalisables et programmables' },
    ],
    visualType: 'analytics',
  },
  {
    id: 17, chapter: 'Chapitre 17', title: 'Administration & Gestion des Utilisateurs', subtitle: 'Contrôle d\'accès et rôles',
    features: [
      { text: '2 847 utilisateurs — 2 312 actifs' },
      { text: 'Gestion des rôles et permissions granulaires', highlight: true },
      { text: '156 administrateurs — 379 invités' },
      { text: 'Audit trail complet des actions' },
      { text: 'Authentification multi-facteurs (MFA)', highlight: true },
      { text: 'SSO pour les institutions gouvernementales' },
    ],
    visualType: 'admin',
  },
  {
    id: 18, chapter: 'Chapitre 18', title: 'Sécurité & Conformité', subtitle: 'Loi sur la protection des données et audit',
    features: [
      { text: 'Conformité Loi n°L/2016/018/AN (protection des données)' },
      { text: 'Chiffrement AES-256 des données au repos', highlight: true },
      { text: 'TLS 1.3 pour les données en transit' },
      { text: 'Journaux d\'audit complets et immuables' },
      { text: 'Authentification biométrique disponible', highlight: true },
      { text: 'Certification ISO 27001 en cours' },
    ],
    visualType: 'security',
  },
  {
    id: 19, chapter: 'Chapitre 19', title: 'IA & Automatisation', subtitle: 'Classification, OCR et suggestions',
    features: [
      { text: 'Classification automatique des documents par IA' },
      { text: 'OCR (reconnaissance optique de caractères)', highlight: true },
      { text: 'Suggestions intelligentes pour le routage' },
      { text: 'Détection automatique des documents confidentiels' },
      { text: 'Résumé automatique des longs documents', highlight: true },
      { text: 'Apprentissage continu à partir des décisions humaines' },
    ],
    visualType: 'ai',
  },
  {
    id: 20, chapter: 'Chapitre 20', title: 'Conclusion & Démarrage', subtitle: 'Commencez à utiliser la plateforme dès maintenant',
    features: [
      { text: 'Plateforme opérationnelle — Prête à l\'emploi' },
      { text: '6 profils de démonstration pour explorer', highlight: true },
      { text: '28 services citoyens en ligne' },
      { text: '24 institutions gouvernementales connectées' },
      { text: 'Support technique disponible 24/7', highlight: true },
      { text: 'Essayer la plateforme maintenant →' },
    ],
    visualType: 'conclusion',
  },
]

// ─── ANIMATED VISUAL MOCKUPS ──────────────────────────────────────────────────
function StepVisual({ type }: { type: string }) {
  switch (type) {
    case 'intro':
      return (
        <div className="relative h-full flex items-center justify-center">
          <div className="flex gap-0 mb-4">
            <motion.div className="w-8 h-24 rounded-l-lg" style={{ backgroundColor: GUINEA_RED }} animate={{ scaleY: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
            <motion.div className="w-8 h-24" style={{ backgroundColor: GUINEA_YELLOW }} animate={{ scaleY: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.2 }} />
            <motion.div className="w-8 h-24 rounded-r-lg" style={{ backgroundColor: GUINEA_GREEN }} animate={{ scaleY: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.4 }} />
          </div>
          <motion.div className="absolute bottom-4 left-4 right-4 space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            {['Présidence', 'Primature', '18 Ministères'].map((inst, i) => (
              <motion.div key={inst} className="flex items-center gap-2 bg-white/10 rounded-lg p-2" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 + i * 0.15 }}>
                <Building2 className="size-4 text-[#C8A45C]" />
                <span className="text-xs text-white/80">{inst}</span>
                <CheckCircle2 className="size-3 text-emerald-400 ml-auto" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )
    case 'login':
      return (
        <div className="space-y-3 p-4">
          {[
            { role: 'Ministre', icon: Landmark, color: 'bg-purple-500' },
            { role: 'Directeur Général', icon: Building2, color: 'bg-blue-500' },
            { role: 'Chef de Service', icon: Users, color: 'bg-amber-500' },
            { role: 'Agent', icon: UserCheck, color: 'bg-emerald-500' },
            { role: 'Citoyen', icon: Globe, color: 'bg-sky-500' },
            { role: 'Administrateur', icon: Shield, color: 'bg-red-500' },
          ].map((item, i) => (
            <motion.div key={item.role} className="flex items-center gap-3 bg-white/10 rounded-lg p-2.5" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}>
              <div className={`p-1.5 rounded-lg ${item.color}`}><item.icon className="size-3.5 text-white" /></div>
              <span className="text-xs text-white/90 font-medium">{item.role}</span>
              <Badge className="ml-auto bg-white/10 text-white/60 text-[9px] border-white/20">Actif</Badge>
            </motion.div>
          ))}
        </div>
      )
    case 'dashboard':
      return (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Courriers', val: '14 250', color: 'bg-blue-500/20 text-blue-300' },
              { label: 'Documents', val: '87 450', color: 'bg-amber-500/20 text-amber-300' },
              { label: 'Workflows', val: '234', color: 'bg-emerald-500/20 text-emerald-300' },
              { label: 'Satisfaction', val: '94%', color: 'bg-sky-500/20 text-sky-300' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} className={`rounded-lg p-2.5 ${kpi.color}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.12, type: 'spring' }}>
                <p className="text-[10px] opacity-70">{kpi.label}</p>
                <p className="text-lg font-bold">{kpi.val}</p>
              </motion.div>
            ))}
          </div>
          <motion.div className="h-16 bg-white/5 rounded-lg p-2 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <div className="flex items-end gap-1 h-full">
              {[35, 50, 42, 60, 75, 68, 55, 48, 65, 80, 85, 72].map((h, i) => (
                <motion.div key={i} className="flex-1 rounded-t" style={{ backgroundColor: GUINEA_GREEN, opacity: 0.7 }} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.6 + i * 0.05 }} />
              ))}
            </div>
          </motion.div>
        </div>
      )
    case 'ged':
      return (
        <div className="p-4 space-y-2">
          <div className="flex gap-2 mb-2">
            <div className="flex-1 h-1 rounded" style={{ backgroundColor: GUINEA_RED }} />
            <div className="flex-1 h-1 rounded" style={{ backgroundColor: GUINEA_YELLOW }} />
            <div className="flex-1 h-1 rounded" style={{ backgroundColor: GUINEA_GREEN }} />
          </div>
          {['D/2026/012 — Décret portant organisation...', 'A/2026/045 — Arrêté fixant les modalités...', 'C/2026/003 — Circulaire relative à...'].map((doc, i) => (
            <motion.div key={doc} className="flex items-center gap-2 bg-white/10 rounded-lg p-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}>
              <FileText className="size-4 text-[#C8A45C] shrink-0" />
              <span className="text-[10px] text-white/80 truncate">{doc}</span>
              <Badge className="ml-auto text-[8px] bg-emerald-500/20 text-emerald-300 border-0 shrink-0">PUBLIC</Badge>
            </motion.div>
          ))}
          <div className="flex gap-2 mt-3">
            {['87 450 docs', '4 230 décrets', '1 340 confidentiels'].map((stat, i) => (
              <div key={stat} className="flex-1 bg-white/5 rounded p-1.5 text-center">
                <p className="text-[10px] font-bold text-[#C8A45C]">{stat.split(' ')[0]}</p>
                <p className="text-[8px] text-white/50">{stat.split(' ').slice(1).join(' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )
    case 'courriers':
      return (
        <div className="p-4 space-y-2">
          {[
            { ref: 'CE-2026-001', subject: 'Demande d\'autorisation', priority: 'Urgent', color: 'bg-red-500' },
            { ref: 'CS-2026-042', subject: 'Rapport d\'activité Q1', priority: 'Haut', color: 'bg-amber-500' },
            { ref: 'CE-2026-089', subject: 'Note de service interministérielle', priority: 'Normal', color: 'bg-blue-500' },
          ].map((courrier, i) => (
            <motion.div key={courrier.ref} className="bg-white/10 rounded-lg p-2.5" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#C8A45C]">{courrier.ref}</span>
                <Badge className={`text-[8px] ${courrier.color} text-white border-0`}>{courrier.priority}</Badge>
              </div>
              <p className="text-[10px] text-white/70">{courrier.subject}</p>
            </motion.div>
          ))}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[{ l: 'Entrants', v: '8 730' }, { l: 'Sortants', v: '5 520' }, { l: 'En attente', v: '412' }].map(s => (
              <div key={s.l} className="bg-white/5 rounded p-1.5 text-center">
                <p className="text-xs font-bold text-white">{s.v}</p>
                <p className="text-[8px] text-white/50">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      )
    case 'workflow':
      return (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            {['Soumis', 'Validation', 'Traitement', 'Approbation', 'Terminé'].map((step, i) => (
              <div key={step} className="flex items-center gap-1">
                <motion.div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ${i < 3 ? 'bg-emerald-500 text-white' : i === 3 ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/40'}`}
                  animate={i === 3 ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
                  {i + 1}
                </motion.div>
                {i < 4 && <div className={`w-4 h-0.5 ${i < 3 ? 'bg-emerald-500' : 'bg-white/20'}`} />}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[{ w: 'Visa dossier', status: '234 actifs' }, { w: 'Approbation budget', status: '412 en cours' }, { w: 'Validation signature', status: '89 en attente' }].map((wf, i) => (
              <motion.div key={wf.w} className="flex items-center justify-between bg-white/10 rounded-lg p-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }}>
                <div className="flex items-center gap-2">
                  <GitBranch className="size-3.5 text-[#C8A45C]" />
                  <span className="text-[10px] text-white/80">{wf.w}</span>
                </div>
                <span className="text-[9px] text-emerald-300">{wf.status}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )
    case 'signatures':
      return (
        <div className="p-4 space-y-3">
          <motion.div className="border-2 border-dashed border-[#C8A45C]/40 rounded-lg p-4 text-center" animate={{ borderColor: ['#C8A45C40', '#C8A45C', '#C8A45C40'] }} transition={{ repeat: Infinity, duration: 2 }}>
            <PenTool className="size-8 mx-auto text-[#C8A45C] mb-2" />
            <p className="text-xs text-white/80 font-medium">Zone de signature</p>
            <p className="text-[9px] text-white/50">Cliquez pour signer numériquement</p>
          </motion.div>
          <div className="space-y-2">
            {[
              { label: 'Certificat valide', icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'Horodatage certifié', icon: Clock, color: 'text-sky-400' },
              { label: 'Hash SHA-256', icon: Lock, color: 'text-amber-400' },
            ].map((item, i) => (
              <motion.div key={item.label} className="flex items-center gap-2 bg-white/5 rounded p-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.1 }}>
                <item.icon className={`size-3.5 ${item.color}`} />
                <span className="text-[10px] text-white/70">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )
    case 'portal':
    case 'no-account':
    case 'with-account':
      return (
        <div className="p-4 space-y-2">
          <div className="flex gap-0 mb-2 rounded overflow-hidden">
            <div className="flex-1 h-1" style={{ backgroundColor: GUINEA_RED }} />
            <div className="flex-1 h-1" style={{ backgroundColor: GUINEA_YELLOW }} />
            <div className="flex-1 h-1" style={{ backgroundColor: GUINEA_GREEN }} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[Baby, Scale, Stethoscope, GraduationCap, Home, Heart].map((Icon, i) => (
              <motion.div key={i} className="bg-white/10 rounded-lg p-2 flex flex-col items-center gap-1" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08, type: 'spring' }}>
                <Icon className="size-4 text-[#C8A45C]" />
                <div className="h-1 w-8 bg-white/20 rounded" />
              </motion.div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px]">8 sans compte</Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px]">20 avec compte</Badge>
          </div>
        </div>
      )
    case 'tracking':
      return (
        <div className="p-4 space-y-3">
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-[9px] text-white/50">Numéro de référence</p>
            <p className="text-sm font-mono font-bold text-[#C8A45C]">GN-2026-012345</p>
          </div>
          <div className="space-y-1.5">
            {[
              { step: 'Demande soumise', done: true },
              { step: 'En cours de traitement', done: true },
              { step: 'Validation en cours', current: true },
              { step: 'Document prêt', done: false },
              { step: 'Livrée', done: false },
            ].map((s, i) => (
              <motion.div key={s.step} className="flex items-center gap-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12 }}>
                <div className={`w-3 h-3 rounded-full ${s.done ? 'bg-emerald-500' : s.current ? 'bg-amber-500' : 'bg-white/20'}`} />
                <span className={`text-[10px] ${s.done ? 'text-white/80' : s.current ? 'text-amber-300 font-medium' : 'text-white/30'}`}>{s.step}</span>
                {s.done && <CheckCircle2 className="size-3 text-emerald-400 ml-auto" />}
                {s.current && <motion.div className="w-2 h-2 rounded-full bg-amber-400 ml-auto" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />}
              </motion.div>
            ))}
          </div>
        </div>
      )
    case 'agent':
      return (
        <div className="p-4 space-y-2">
          {[
            { ref: 'GN-2026-001', action: 'Assigné à M. Diallo', status: 'En cours' },
            { ref: 'GN-2026-002', action: 'Pièces complémentaires demandées', status: 'En attente' },
            { ref: 'GN-2026-003', action: 'Approuvé — Document généré', status: 'Prêt' },
          ].map((task, i) => (
            <motion.div key={task.ref} className="bg-white/10 rounded-lg p-2.5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#C8A45C]">{task.ref}</span>
                <Badge className={`text-[8px] border-0 ${task.status === 'En cours' ? 'bg-amber-500/20 text-amber-300' : task.status === 'En attente' ? 'bg-orange-500/20 text-orange-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{task.status}</Badge>
              </div>
              <p className="text-[10px] text-white/60">{task.action}</p>
            </motion.div>
          ))}
        </div>
      )
    case 'doc-gen':
      return (
        <div className="p-3 space-y-2">
          <div className="bg-white/10 rounded border border-white/10 overflow-hidden">
            <div className="flex gap-0">
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_RED }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_YELLOW }} />
              <div className="flex-1 h-1.5" style={{ backgroundColor: GUINEA_GREEN }} />
            </div>
            <div className="p-2 text-center">
              <p className="text-[8px] font-bold text-white/80">RÉPUBLIQUE DE GUINÉE</p>
              <p className="text-[7px] text-white/50">Travail - Justice - Solidarité</p>
              <p className="text-[9px] font-bold text-[#C8A45C] mt-1">DOCUMENT OFFICIEL</p>
              <div className="mt-2 space-y-1">
                {[1, 2, 3].map(i => <div key={i} className="h-1 bg-white/10 rounded mx-2" style={{ width: `${70 + i * 5}%` }} />)}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 bg-white/5 rounded p-1.5 flex-1">
              <QrCode className="size-3 text-[#C8A45C]" />
              <span className="text-[8px] text-white/50">QR vérif.</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded p-1.5 flex-1">
              <Shield className="size-3 text-emerald-400" />
              <span className="text-[8px] text-white/50">Signé</span>
            </div>
          </div>
        </div>
      )
    case 'viewer':
      return (
        <div className="p-4 space-y-2">
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex gap-0 mb-2 rounded overflow-hidden">
              <div className="flex-1 h-1" style={{ backgroundColor: GUINEA_RED }} />
              <div className="flex-1 h-1" style={{ backgroundColor: GUINEA_YELLOW }} />
              <div className="flex-1 h-1" style={{ backgroundColor: GUINEA_GREEN }} />
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 bg-white/10 rounded w-3/4" />
              <div className="h-1 bg-white/10 rounded w-full" />
              <div className="h-1 bg-white/10 rounded w-5/6" />
              <div className="h-1 bg-white/10 rounded w-2/3" />
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { icon: Search, label: 'Zoom' },
              { icon: Download, label: 'PDF' },
              { icon: Eye, label: 'Imprimer' },
            ].map(btn => (
              <div key={btn.label} className="flex-1 flex flex-col items-center gap-1 bg-white/5 rounded p-1.5">
                <btn.icon className="size-3.5 text-[#C8A45C]" />
                <span className="text-[8px] text-white/50">{btn.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    case 'archive':
      return (
        <div className="p-4 space-y-2">
          <div className="bg-white/10 rounded-lg p-2.5 text-center mb-2">
            <Archive className="size-6 mx-auto text-[#C8A45C] mb-1" />
            <p className="text-xs font-bold text-white">Archives Nationales</p>
            <p className="text-[10px] text-[#C8A45C]">2 450 documents archivés</p>
          </div>
          {[
            { period: '30 ans', cat: 'Juridique', color: 'bg-red-500/20 text-red-300' },
            { period: '10 ans', cat: 'Financier', color: 'bg-amber-500/20 text-amber-300' },
            { period: 'Permanente', cat: 'Historique', color: 'bg-purple-500/20 text-purple-300' },
          ].map((arch, i) => (
            <motion.div key={arch.cat} className="flex items-center justify-between bg-white/5 rounded p-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.1 }}>
              <div>
                <p className="text-[10px] text-white/80">{arch.cat}</p>
                <p className="text-[8px] text-white/40">Conservation: {arch.period}</p>
              </div>
              <Badge className={`text-[8px] border-0 ${arch.color}`}>{arch.period}</Badge>
            </motion.div>
          ))}
        </div>
      )
    case 'analytics':
      return (
        <div className="p-4 space-y-3">
          <div className="h-24 flex items-end gap-1">
            {[40, 55, 45, 60, 70, 65, 50, 45, 60, 75, 80, 70].map((h, i) => (
              <motion.div key={i} className="flex-1 rounded-t" style={{ backgroundColor: i < 6 ? GUINEA_GREEN : '#C8A45C' }} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.06, duration: 0.4 }} />
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded" style={{ backgroundColor: GUINEA_GREEN }} /><span className="text-[8px] text-white/50">Courriers</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded" style={{ backgroundColor: '#C8A45C' }} /><span className="text-[8px] text-white/50">Documents</span></div>
          </div>
        </div>
      )
    case 'admin':
      return (
        <div className="p-4 space-y-2">
          {[{ role: 'Admin', count: '156', color: 'bg-red-500/20 text-red-300' }, { role: 'Actifs', count: '2 312', color: 'bg-emerald-500/20 text-emerald-300' }, { role: 'Invités', count: '379', color: 'bg-sky-500/20 text-sky-300' }].map((u, i) => (
            <motion.div key={u.role} className="flex items-center justify-between bg-white/10 rounded p-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }}>
              <span className="text-[10px] text-white/70">{u.role}</span>
              <Badge className={`text-[9px] border-0 ${u.color}`}>{u.count}</Badge>
            </motion.div>
          ))}
          <div className="mt-2 space-y-1">
            {['Gestion des rôles', 'MFA activé', 'SSO configuré'].map((f, i) => (
              <div key={f} className="flex items-center gap-2">
                <CheckCircle2 className="size-3 text-emerald-400" />
                <span className="text-[10px] text-white/60">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )
    case 'security':
      return (
        <div className="p-4 space-y-3">
          <motion.div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/20 border-2 border-emerald-500/40"
            animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
            <Shield className="size-8 text-emerald-400" />
          </motion.div>
          <div className="space-y-2">
            {[
              { label: 'AES-256', icon: Lock, color: 'text-emerald-400' },
              { label: 'TLS 1.3', icon: Zap, color: 'text-sky-400' },
              { label: 'Audit trail', icon: ScrollText, color: 'text-amber-400' },
              { label: 'Biométrie', icon: Smartphone, color: 'text-purple-400' },
            ].map((item, i) => (
              <motion.div key={item.label} className="flex items-center gap-2 bg-white/5 rounded p-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }}>
                <item.icon className={`size-3.5 ${item.color}`} />
                <span className="text-[10px] text-white/70">{item.label}</span>
                <CheckCircle2 className="size-3 text-emerald-400 ml-auto" />
              </motion.div>
            ))}
          </div>
        </div>
      )
    case 'ai':
      return (
        <div className="p-4 space-y-3">
          <motion.div className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center bg-purple-500/20 border border-purple-500/30"
            animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
            <Brain className="size-7 text-purple-400" />
          </motion.div>
          <div className="space-y-2">
            {[
              { label: 'Classification auto', pct: 94 },
              { label: 'OCR précision', pct: 98 },
              { label: 'Routage intelligent', pct: 87 },
            ].map((ai, i) => (
              <div key={ai.label}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-white/70">{ai.label}</span>
                  <span className="text-[#C8A45C]">{ai.pct}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full bg-purple-500" initial={{ width: 0 }} animate={{ width: `${ai.pct}%` }} transition={{ delay: 0.5 + i * 0.2, duration: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    case 'conclusion':
      return (
        <div className="p-4 flex flex-col items-center justify-center h-full space-y-4">
          <div className="flex gap-0 mb-2 rounded overflow-hidden">
            <motion.div className="w-6 h-12 rounded-l-lg" style={{ backgroundColor: GUINEA_RED }} animate={{ scaleY: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
            <motion.div className="w-6 h-12" style={{ backgroundColor: GUINEA_YELLOW }} animate={{ scaleY: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} />
            <motion.div className="w-6 h-12 rounded-r-lg" style={{ backgroundColor: GUINEA_GREEN }} animate={{ scaleY: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} />
          </div>
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
            <Star className="size-10 text-[#C8A45C]" />
          </motion.div>
          <p className="text-sm text-white/90 font-semibold text-center">Prêt à transformer votre administration ?</p>
          <div className="flex items-center gap-2 text-[#C8A45C]">
            <span className="text-xs">Commencer maintenant</span>
            <ArrowRight className="size-4" />
          </div>
        </div>
      )
    default:
      return null
  }
}

export function InteractiveDemoTour() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showChapterList, setShowChapterList] = useState(false)
  const navigate = useAppStore((s) => s.navigate)

  const step = TOUR_STEPS[currentStep]
  const totalSteps = TOUR_STEPS.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  const goNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))
  }, [totalSteps])

  const goPrev = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 8000)
    return () => clearInterval(timer)
  }, [isPlaying, totalSteps])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') navigate('landing')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B2E58] via-[#071D3A] to-[#0B2E58] flex flex-col">
      {/* Top bar with progress */}
      <div className="sticky top-0 z-50 bg-[#0B2E58]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => navigate('landing')}>
                <X className="size-5" />
              </Button>
              <div>
                <p className="text-xs text-white/40">{step.chapter}</p>
                <p className="text-sm font-semibold text-white">{step.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 gap-1.5" onClick={() => setShowChapterList(!showChapterList)}>
                <BookOpen className="size-4" />
                <span className="text-xs">Sommaire</span>
              </Button>
              <Button variant="ghost" size="sm" className={`gap-1.5 ${isPlaying ? 'text-[#C8A45C]' : 'text-white/60'} hover:text-white hover:bg-white/10`} onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                <span className="text-xs">{isPlaying ? 'Pause' : 'Auto'}</span>
              </Button>
              <span className="text-xs text-white/40 font-mono">{currentStep + 1}/{totalSteps}</span>
            </div>
          </div>
          <Progress value={progress} className="h-1 rounded-none bg-white/10 [&>div]:bg-[#C8A45C]" />
        </div>
      </div>

      {/* Chapter list sidebar */}
      <AnimatePresence>
        {showChapterList && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed top-14 left-0 bottom-0 w-72 z-40 bg-[#071D3A]/95 backdrop-blur-sm border-r border-white/10 overflow-y-auto"
          >
            <div className="p-4 space-y-1">
              <p className="text-xs text-[#C8A45C] font-semibold mb-3">Sommaire — {totalSteps} chapitres</p>
              {TOUR_STEPS.map((s, i) => (
                <button
                  key={s.id}
                  className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center gap-3 ${i === currentStep ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                  onClick={() => { setCurrentStep(i); setShowChapterList(false) }}
                >
                  <span className={`text-[10px] font-mono w-6 shrink-0 ${i === currentStep ? 'text-[#C8A45C]' : 'text-white/30'}`}>{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{s.title}</p>
                    <p className="text-[10px] truncate opacity-60">{s.subtitle}</p>
                  </div>
                  {i === currentStep && <motion.div className="w-1.5 h-1.5 rounded-full bg-[#C8A45C] ml-auto shrink-0" layoutId="chapterIndicator" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Features */}
          <motion.div
            key={`features-${step.id}`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col justify-center"
          >
            <div className="mb-2">
              <Badge className="bg-[#C8A45C]/20 text-[#C8A45C] border-[#C8A45C]/30 text-xs">{step.chapter}</Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{step.title}</h2>
            <p className="text-sm text-white/50 mb-6">{step.subtitle}</p>
            <div className="space-y-3">
              {step.features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <div className={`mt-1 size-2 rounded-full shrink-0 ${feature.highlight ? 'bg-[#C8A45C]' : 'bg-white/20'}`} />
                  <span className={`text-sm leading-relaxed ${feature.highlight ? 'text-[#C8A45C] font-medium' : 'text-white/70'}`}>
                    {feature.text}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* CTA on last step */}
            {currentStep === totalSteps - 1 && (
              <motion.div className="mt-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Button size="lg" className="bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] font-semibold gap-2 text-base px-8 h-12" onClick={() => navigate('login')}>
                  <Play className="size-5" />
                  Essayer la plateforme
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Right: Visual */}
          <motion.div
            key={`visual-${step.id}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center"
          >
            <Card className="w-full bg-[#0B2E58]/60 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <CardHeader className="pb-0 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  <span className="text-[10px] text-white/30 font-mono ml-2">eAdministration Suite — {step.title}</span>
                </div>
              </CardHeader>
              <CardContent className="p-4 min-h-[280px] md:min-h-[340px]">
                <StepVisual type={step.visualType} />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 bg-[#071D3A]/95 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10 gap-1.5"
              onClick={goPrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="size-4" />
              Précédent
            </Button>

            {/* Step markers */}
            <div className="hidden md:flex items-center gap-1 overflow-x-auto max-w-xl px-2">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all shrink-0 ${i === currentStep ? 'bg-[#C8A45C] w-4' : i < currentStep ? 'bg-white/40' : 'bg-white/15'}`}
                  onClick={() => setCurrentStep(i)}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10 gap-1.5"
              onClick={goNext}
              disabled={currentStep === totalSteps - 1}
            >
              Suivant
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
