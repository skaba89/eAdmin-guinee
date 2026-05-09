export const BRAND = {
  name: 'eAdministration Suite',
  fullName: 'eAdministration Suite Guinea',
  company: 'DataSphere Innovation',
  tagline: 'La plateforme GovTech de nouvelle génération pour la Guinée et l\'Afrique',
  description: 'Digitalisation administrative intégrée pour ministères, institutions publiques, universités et entreprises',
  colors: {
    primary: '#0B2E58',
    primaryLight: '#134A8E',
    primaryDark: '#071D3A',
    gold: '#C8A45C',
    goldLight: '#D4B878',
    white: '#FFFFFF',
    grayLight: '#F8F9FA',
    gray: '#6B7280',
    dark: '#111827',
  },
} as const

export const NAV_ITEMS = {
  public: [
    { label: 'Accueil', page: 'landing' as const },
    { label: 'À propos', page: 'about' as const },
    { label: 'Services', page: 'services' as const },
    { label: 'Solutions', page: 'solutions' as const },
    { label: 'Tarifs', page: 'pricing' as const },
    { label: 'Blog', page: 'blog' as const },
    { label: 'FAQ', page: 'faq' as const },
    { label: 'Contact', page: 'contact' as const },
  ],
  auth: [
    { label: 'Connexion', page: 'login' as const },
    { label: 'Inscription', page: 'register' as const },
  ],
  app: [
    { label: 'Tableau de bord', page: 'dashboard' as const, icon: 'LayoutDashboard' },
    { label: 'Documents (GED)', page: 'ged' as const, icon: 'FileText' },
    { label: 'Courriers', page: 'courriers' as const, icon: 'Mail' },
    { label: 'Workflows', page: 'workflow' as const, icon: 'GitBranch' },
    { label: 'Signatures', page: 'signatures' as const, icon: 'PenTool' },
    { label: 'Analytics', page: 'analytics' as const, icon: 'BarChart3' },
    { label: 'Portail Citoyen', page: 'citizen-portal' as const, icon: 'Users' },
  ],
  admin: [
    { label: 'Administration', page: 'admin' as const, icon: 'Shield' },
    { label: 'Utilisateurs', page: 'users' as const, icon: 'UserCog' },
    { label: 'Paramètres', page: 'settings' as const, icon: 'Settings' },
    { label: 'Notifications', page: 'notifications' as const, icon: 'Bell' },
    { label: 'Audit Logs', page: 'audit-logs' as const, icon: 'ScrollText' },
  ],
} as const

export const DEMO_STATS = {
  courriers: { total: 2847, entrants: 1523, sortants: 1324, enAttente: 187 },
  documents: { total: 12450, archives: 8320, actifs: 4130, partages: 892 },
  workflows: { actifs: 45, completes: 312, enCours: 89, enAttente: 23 },
  users: { total: 156, actifs: 134, admin: 12, invite: 10 },
}

export const DEMO_KPI = [
  { label: 'Courriers traités', value: '2 847', change: '+12.5%', trend: 'up' as const },
  { label: 'Documents archivés', value: '12 450', change: '+8.3%', trend: 'up' as const },
  { label: 'Workflows actifs', value: '45', change: '+3.2%', trend: 'up' as const },
  { label: 'Délai moyen (jours)', value: '2.4', change: '-15.2%', trend: 'down' as const },
  { label: 'Taux de conformité', value: '98.7%', change: '+1.2%', trend: 'up' as const },
  { label: 'Satisfaction citoyen', value: '4.8/5', change: '+0.3', trend: 'up' as const },
]

export const MONTHLY_DATA = [
  { month: 'Jan', courriers: 245, documents: 890, workflows: 34 },
  { month: 'Fév', courriers: 312, documents: 1023, workflows: 41 },
  { month: 'Mar', courriers: 287, documents: 945, workflows: 38 },
  { month: 'Avr', courriers: 356, documents: 1134, workflows: 45 },
  { month: 'Mai', courriers: 398, documents: 1256, workflows: 52 },
  { month: 'Jun', courriers: 421, documents: 1345, workflows: 48 },
  { month: 'Jul', courriers: 378, documents: 1198, workflows: 43 },
  { month: 'Aoû', courriers: 334, documents: 1067, workflows: 39 },
  { month: 'Sep', courriers: 412, documents: 1289, workflows: 51 },
  { month: 'Oct', courriers: 456, documents: 1423, workflows: 55 },
  { month: 'Nov', courriers: 489, documents: 1567, workflows: 58 },
  { month: 'Déc', courriers: 467, documents: 1478, workflows: 53 },
]
