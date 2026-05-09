export const BRAND = {
  name: 'eAdministration Suite',
  fullName: 'eAdministration Suite Guinea',
  company: 'DataSphere Innovation',
  republic: 'République de Guinée',
  motto: 'Travail - Justice - Solidarité',
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
    guineaRed: '#CE1126',
    guineaYellow: '#FCD116',
    guineaGreen: '#009460',
  },
  governmentStructure: [
    'Présidence de la République',
    'Primature (Office of the Prime Minister)',
    'Ministère de l\'Administration Territoriale et de la Décentralisation',
    'Ministère de l\'Économie et des Finances',
    'Ministère de l\'Éducation Nationale et de l\'Alphabétisation',
    'Ministère de l\'Enseignement Supérieur, de la Recherche Scientifique et de l\'Innovation',
    'Ministère de la Santé et de l\'Hygiène Publique',
    'Ministère de la Justice, Gardien des Sceaux',
    'Ministère de la Défense Nationale',
    'Ministère de la Sécurité et de la Protection Civile',
    'Ministère des Transports',
    'Ministère de l\'Agriculture et de l\'Élevage',
    'Ministère des Mines et de la Géologie',
    'Ministère du Plan et de la Coopération Internationale',
    'Ministère de la Fonction Publique et de la Réforme de l\'État',
    'Ministère des Postes, Télécommunications et de l\'Économie Numérique',
    'Ministère de l\'Environnement, des Eaux et Forêts',
    'Ministère des Travaux Publics',
    'Ministère du Commerce, de l\'Industrie et des PME',
    'Cour des Comptes',
    'Assemblée Nationale',
    'Conseil Économique et Social',
    'Agence Nationale de l\'Inclusion Numérique (ANIN)',
    'Autorité de Régulation des Communications Électroniques et des Postes (ARCEP)',
  ] as const,
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
    { label: 'Guinée Services', page: 'public-citizen-portal' as const },
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
    { label: 'Demandes Citoyennes', page: 'service-requests' as const, icon: 'ClipboardCheck' },
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
  courriers: { total: 14250, entrants: 8730, sortants: 5520, enAttente: 412, urgents: 87 },
  documents: { total: 87450, archives: 62300, actifs: 25150, partages: 4892, confidentiels: 1340 },
  workflows: { actifs: 234, completes: 1876, enCours: 412, enAttente: 89 },
  users: { total: 2847, actifs: 2312, admin: 156, invite: 379 },
  institutions: { total: 24, connectees: 18, enDeploiement: 6 },
  citoyens: { inscrits: 124500, demandes: 8730, satisfait: 94 },
}

export const DEMO_KPI = [
  { label: 'Courriers interministériels traités', value: '14 250', change: '+18.3%', trend: 'up' as const },
  { label: 'Documents officiels archivés', value: '87 450', change: '+22.1%', trend: 'up' as const },
  { label: 'Procédures administratives numérisées', value: '234', change: '+45.2%', trend: 'up' as const },
  { label: 'Délai moyen de traitement', value: '1.8 jours', change: '-32.5%', trend: 'down' as const },
  { label: 'Taux de conformité réglementaire', value: '99.2%', change: '+2.1%', trend: 'up' as const },
  { label: 'Satisfaction citoyenne', value: '4.7/5', change: '+0.4', trend: 'up' as const },
  { label: 'Institutions connectées', value: '18/24', change: '+3', trend: 'up' as const },
  { label: 'Demandes citoyennes traitées', value: '8 730', change: '+28.7%', trend: 'up' as const },
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

export const GUINEA_ADMIN_STRUCTURE = {
  regions: [
    { name: 'Conakry', capital: 'Conakry' },
    { name: 'Kindia', capital: 'Kindia' },
    { name: 'Boké', capital: 'Boké' },
    { name: 'Labé', capital: 'Labé' },
    { name: 'Mamou', capital: 'Mamou' },
    { name: 'Faranah', capital: 'Faranah' },
    { name: 'Kankan', capital: 'Kankan' },
    { name: 'N\'Zérékoré', capital: 'N\'Zérékoré' },
  ],
  totalRegions: 8,
  totalPrefectures: 33,
  totalSubPrefectures: 341,
  totalCommunes: 38,
  conakryCommunes: ['Kaloum', 'Dixinn', 'Matam', 'Matoto', 'Ratoma'],
} as const

export const LEGAL_REFERENCES = [
  {
    id: 'LOI-2016-018',
    reference: 'Loi n°L/2016/018/AN',
    title: 'Protection des données personnelles',
    description: 'Loi relative à la protection des données à caractère personnel en République de Guinée',
    status: 'conforme' as const,
  },
  {
    id: 'ORD-011-PRG-87',
    reference: 'Ordonnance n°011/PRG/87',
    title: 'Organisation de l\'administration territoriale',
    description: 'Ordonnance portant organisation de l\'administration territoriale de la République',
    status: 'conforme' as const,
  },
  {
    id: 'DECRET-2022-SGG',
    reference: 'Décret n°D/2022/PRG/SGG',
    title: 'Signature électronique',
    description: 'Décret portant réglementation de la signature électronique à valeur juridique',
    status: 'conforme' as const,
  },
  {
    id: 'LOI-2019-011',
    reference: 'Loi n°L/2019/011/AN',
    title: 'Transactions électroniques',
    description: 'Loi sur les transactions électroniques et le commerce numérique',
    status: 'conforme' as const,
  },
  {
    id: 'DECRET-2018-ANIN',
    reference: 'Décret n°D/2018/PRG/SGG',
    title: 'Création de l\'ANIN',
    description: 'Décret portant création de l\'Agence Nationale de l\'Inclusion Numérique',
    status: 'conforme' as const,
  },
  {
    id: 'CODE-ADMIN',
    reference: 'Code administratif',
    title: 'Code administratif de la République de Guinée',
    description: 'Recueil des textes régissant l\'administration publique guinéenne',
    status: 'conforme' as const,
  },
  {
    id: 'CIRC-001-PM',
    reference: 'Circulaire n°001/PM/CAB',
    title: 'Généralisation de l\'administration électronique',
    description: 'Circulaire portant généralisation de l\'administration électronique dans les ministères et institutions',
    status: 'en-application' as const,
  },
] as const

export const PND_INDICATORS = {
  axe1: {
    title: 'Gouvernance démocratique',
    indicators: [
      'Taux de transparence des procédures administratives',
      'Indice de e-gouvernement',
      'Nombre de services administratifs dématérialisés',
      'Taux de conformité réglementaire',
    ],
  },
  axe2: {
    title: 'Transformation structurelle de l\'économie',
    indicators: [
      'Nombre de procédures de marchés publics numérisées',
      'Délai moyen de traitement des dossiers économiques',
      'Volume des transactions électroniques interministérielles',
    ],
  },
  axe3: {
    title: 'Développement du capital humain',
    indicators: [
      'Taux de formation des agents publics au numérique',
      'Nombre de services citoyens en ligne',
      'Indice de satisfaction des usagers',
    ],
  },
  axe4: {
    title: 'Gestion durable de l\'environnement',
    indicators: [
      'Réduction de la consommation papier',
      'Nombre d\'archives dématérialisées',
      'Empreinte carbone numérique de l\'administration',
    ],
  },
} as const

export const CITIZEN_SERVICES = [
  { id: 'acte-naissance', name: 'Extrait d\'acte de naissance', category: 'État civil', delay: '3 jours' },
  { id: 'certificat-nationalite', name: 'Certificat de nationalité', category: 'Nationalité', delay: '5 jours' },
  { id: 'casier-judiciaire', name: 'Casier judiciaire', category: 'Justice', delay: '2 jours' },
  { id: 'acte-mariage', name: 'Extrait d\'acte de mariage', category: 'État civil', delay: '3 jours' },
  { id: 'acte-deces', name: 'Extrait d\'acte de décès', category: 'État civil', delay: '2 jours' },
  { id: 'permis-construire', name: 'Permis de construire', category: 'Urbanisme', delay: '15 jours' },
  { id: 'certificat-residence', name: 'Certificat de résidence', category: 'État civil', delay: '1 jour' },
  { id: 'attestation-prise-en-charge', name: 'Attestation de prise en charge', category: 'Social', delay: '2 jours' },
  { id: 'carte-identite', name: 'Carte d\'identité nationale', category: 'Identification', delay: '7 jours' },
  { id: 'passeport-biometrique', name: 'Passeport biométrique', category: 'Identification', delay: '10 jours' },
  { id: 'permis-conduire', name: 'Permis de conduire', category: 'Transport', delay: '5 jours' },
  { id: 'certificat-non-poursuite', name: 'Certificat de non-poursuite', category: 'Justice', delay: '3 jours' },
  { id: 'attestation-scolarite', name: 'Attestation de scolarité', category: 'Éducation', delay: '2 jours' },
  { id: 'diplome-releve', name: 'Diplôme et relevé de notes', category: 'Éducation', delay: '5 jours' },
  { id: 'certificat-vaccination', name: 'Certificat de vaccination', category: 'Santé', delay: '1 jour' },
  { id: 'enregistrement-entreprise', name: 'Enregistrement entreprise (APIP)', category: 'Économie', delay: '3 jours' },
] as const
