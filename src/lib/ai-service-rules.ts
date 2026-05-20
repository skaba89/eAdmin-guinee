/**
 * AI Service Rules Engine — eAdmin Guinée
 * Règles métier pour le traitement automatique des 28 services publics guinéens
 * Chaque service a des critères de validation, documents requis, motifs de rejet,
 * niveaux de complexité et conditions d'auto-approbation
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ServiceComplexity = 'simple' | 'standard' | 'complexe'
export type AutoApprovalPolicy = 'always' | 'if_complete' | 'never' | 'supervisor_only'

export interface ServiceRule {
  serviceId: string
  serviceName: string
  category: string
  complexity: ServiceComplexity
  autoApproval: AutoApprovalPolicy
  requiredDocuments: string[]
  optionalDocuments: string[]
  minDocumentsForProcessing: number  // minimum docs to start processing
  estimatedProcessingDays: number
  rejectionReasons: string[]
  commonIssues: string[]
  eligibilityCriteria: string[]
  autoValidationConditions: string[]
  escalationTriggers: string[]
  priorityLevel: 1 | 2 | 3  // 1=urgent, 2=normal, 3=basse
  requiresSupervisorSignature: boolean
  maxConfidenceWithoutHuman: number  // max auto-approve confidence even if docs are complete
}

export interface AIDecisionContext {
  serviceId: string
  serviceName: string
  category: string
  providedDocs: number
  requiredDocs: number
  attachedFiles: number
  citizenNIN: string | undefined
  motif: string
  hasPriority: boolean
  isComplete: boolean
}

export interface AIDecision {
  decision: 'validee' | 'pieces_complementaires' | 'rejetee' | 'escaladee'
  confidence: number
  reason: string
  missingDocs: string[]
  autoApproved: boolean
  needsHumanReview: boolean
  estimatedDays: number
  escalationReason?: string
}

// ─── Service Rules Database ────────────────────────────────────────────────────

export const SERVICE_RULES: Record<string, ServiceRule> = {
  // ═══ ÉTAT CIVIL ═══
  'ec-1': {
    serviceId: 'ec-1',
    serviceName: 'Acte de naissance',
    category: 'État civil',
    complexity: 'simple',
    autoApproval: 'if_complete',
    requiredDocuments: ["Carte d'identité nationale ou NIN", 'Déclaration de naissance'],
    optionalDocuments: ['Certificat de maternité', 'Jugement supplétif'],
    minDocumentsForProcessing: 1,
    estimatedProcessingDays: 3,
    rejectionReasons: ['Déclaration hors délai légal (plus de 30 jours)', 'Informations incohérentes avec le registre', 'Document falsifié ou altéré'],
    commonIssues: ['Nom du père non déclaré', 'Lieu de naissance imprécis', 'Date de naissance différente du registre'],
    eligibilityCriteria: ['Personne née sur le territoire guinéen', 'Parents de nationalité guinéenne', 'Déclaration dans les 30 jours'],
    autoValidationConditions: ['Documents complets', 'NIN vérifié', 'Pas de cas de double déclaration'],
    escalationTriggers: ['Conflit de registre', 'Demande de rectification', 'Cas de reconnaissance tardive'],
    priorityLevel: 2,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 95,
  },
  'ec-2': {
    serviceId: 'ec-2',
    serviceName: 'Acte de mariage',
    category: 'État civil',
    complexity: 'standard',
    autoApproval: 'if_complete',
    requiredDocuments: ["Cartes d'identité des époux", 'Certificat de célibat ou de non-remariage', 'Certificat médical prénuptial', 'Témoins (2 minimum)'],
    optionalDocuments: ['Contrat de mariage', 'Autorisation parentale (si mineur)', 'Certificat de décès du conjoint précédent'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 7,
    rejectionReasons: ['Âge légal non atteint (18 ans)', 'Lien de parenté entre époux', 'Mariage déjà enregistré', 'Documents falsifiés'],
    commonIssues: ['Certificat de célibat expiré', 'Absence de témoins valides', 'Contradiction dans les déclarations'],
    eligibilityCriteria: ['Âge légal minimum 18 ans', 'Consentement mutuel', 'Pas de lien de parenté prohibé'],
    autoValidationConditions: ['Tous les documents fournis', 'Certificat médical valide', 'Témoins confirmés'],
    escalationTriggers: ['Mariage polygame déjà à la limite', 'Opposition formelle', 'Mineur sans autorisation parentale'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 85,
  },
  'ec-3': {
    serviceId: 'ec-3',
    serviceName: 'Acte de décès',
    category: 'État civil',
    complexity: 'simple',
    autoApproval: 'if_complete',
    requiredDocuments: ['Certificat médical de décès', "Carte d'identité du défunt", "Déclaration du déclarant avec pièce d'identité"],
    optionalDocuments: ['Jugement déclaratif de décès'],
    minDocumentsForProcessing: 2,
    estimatedProcessingDays: 2,
    rejectionReasons: ['Certificat médical non conforme', 'Décès suspect non signalé', 'Déclaration hors délai'],
    commonIssues: ['Certificat médical incomplet', 'Identité du défunt non vérifiable'],
    eligibilityCriteria: ['Décès survenu sur le territoire guinéen', 'Déclaration dans les 72 heures'],
    autoValidationConditions: ['Certificat médical fourni', 'Identité du défunt confirmée'],
    escalationTriggers: ['Décès suspect', 'Conflit sur la cause du décès'],
    priorityLevel: 1,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 95,
  },
  'ec-4': {
    serviceId: 'ec-4',
    serviceName: 'Certificat de nationalité',
    category: 'État civil',
    complexity: 'complexe',
    autoApproval: 'supervisor_only',
    requiredDocuments: ["Carte d'identité nationale", 'Extrait acte de naissance', 'Certificat de résidence', 'Témoignages (2)'],
    optionalDocuments: ['Passeport guinéen', 'Acte de naturalisation', 'Certificat de filiation'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 15,
    rejectionReasons: ['Absence de preuve de nationalité guinéenne', 'Nationalité acquise par naturalisation non prouvée', 'Documents contradictoires'],
    commonIssues: ['Pièces anciennes illisibles', 'Absence de témoignages fiables', 'Cas de double nationalité'],
    eligibilityCriteria: ['Nationalité guinéenne d\'origine ou par naturalisation', 'Résidence en Guinée'],
    autoValidationConditions: ['Dossier complet avec 4+ documents', 'Témoignages vérifiés', 'Pas de contradiction'],
    escalationTriggers: ['Cas de double nationalité', 'Naturalisation récente', 'Conflit de nationalité'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 70,
  },
  'ec-5': {
    serviceId: 'ec-5',
    serviceName: 'Acte de reconnaissance',
    category: 'État civil',
    complexity: 'standard',
    autoApproval: 'if_complete',
    requiredDocuments: ["Carte d'identité du reconnaissant", 'Acte de naissance de l\'enfant', 'Déclaration de reconnaissance'],
    optionalDocuments: ['Résultat de test ADN', 'Attestation de la mère'],
    minDocumentsForProcessing: 2,
    estimatedProcessingDays: 5,
    rejectionReasons: ['Enfant déjà reconnu par un autre parent', 'Documents falsifiés', 'Conflit de reconnaissance'],
    commonIssues: ['Absence de la mère pour confirmation', 'Conflit de paternité'],
    eligibilityCriteria: ['Parent souhaitant reconnaître un enfant', 'Enfant non reconnu antérieurement'],
    autoValidationConditions: ['Documents complets', 'Pas de reconnaissance antérieure'],
    escalationTriggers: ['Conflit de paternité', 'Contestation par la mère'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 80,
  },
  'ec-6': {
    serviceId: 'ec-6',
    serviceName: 'Changement de nom',
    category: 'État civil',
    complexity: 'complexe',
    autoApproval: 'never',
    requiredDocuments: ["Carte d'identité", 'Extrait acte de naissance', 'Motif justifiant le changement', 'Casier judiciaire'],
    optionalDocuments: ['Jugement du tribunal', 'Publication au journal officiel'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 30,
    rejectionReasons: ['Motif non recevable', 'Procédure judiciaire non respectée', 'Opposition formée'],
    commonIssues: ['Motif insuffisant', 'Absence de jugement', 'Publication non effectuée'],
    eligibilityCriteria: ['Motif légitime et sérieux', 'Jugement du tribunal obtenu'],
    autoValidationConditions: ['Jugement fourni', 'Publication effectuée', 'Pas d\'opposition'],
    escalationTriggers: ['Opposition formée', 'Demande suspecte', 'Changement de nom à consonance étrangère'],
    priorityLevel: 3,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 50,
  },

  // ═══ JUSTICE ═══
  'j-1': {
    serviceId: 'j-1',
    serviceName: 'Casier judiciaire',
    category: 'Justice',
    complexity: 'standard',
    autoApproval: 'if_complete',
    requiredDocuments: ["Carte d'identité nationale", 'NIN'],
    optionalDocuments: ['Passeport'],
    minDocumentsForProcessing: 1,
    estimatedProcessingDays: 3,
    rejectionReasons: ['Identité non vérifiable', 'Fichage en cours de vérification'],
    commonIssues: ['NIN non trouvé dans la base', 'Homonymie'],
    eligibilityCriteria: ['Toute personne physique majeure', 'Identité vérifiable'],
    autoValidationConditions: ['NIN vérifié', 'Pas de casier en cours de mise à jour'],
    escalationTriggers: ['Casier non vide', 'Procédure en cours'],
    priorityLevel: 2,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 90,
  },
  'j-2': {
    serviceId: 'j-2',
    serviceName: 'Certificat de non-poursuite',
    category: 'Justice',
    complexity: 'standard',
    autoApproval: 'if_complete',
    requiredDocuments: ["Carte d'identité nationale", 'NIN'],
    optionalDocuments: ['Attestation employeur'],
    minDocumentsForProcessing: 1,
    estimatedProcessingDays: 5,
    rejectionReasons: ['Poursuites en cours', 'Identité non vérifiable'],
    commonIssues: ['Délai de vérification des poursuites', 'Homonymie avec personne poursuivie'],
    eligibilityCriteria: ['Toute personne physique', 'Pas de poursuites en cours'],
    autoValidationConditions: ['NIN vérifié', 'Aucune poursuite référencée'],
    escalationTriggers: ['Poursuites en cours signalées', 'Vérification complémentaire requise'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 85,
  },
  'j-3': {
    serviceId: 'j-3',
    serviceName: 'Légalisation de documents',
    category: 'Justice',
    complexity: 'simple',
    autoApproval: 'always',
    requiredDocuments: ['Document original à légaliser', "Carte d'identité du demandeur"],
    optionalDocuments: ['Traduction certifiée (si document étranger)'],
    minDocumentsForProcessing: 2,
    estimatedProcessingDays: 1,
    rejectionReasons: ['Document falsifié', 'Document non conforme', 'Compétence territoriale non applicable'],
    commonIssues: ['Document non original', 'Signature illisible'],
    eligibilityCriteria: ['Document original valide', 'Demandeur identifié'],
    autoValidationConditions: ['Document original présent', 'Identité vérifiée'],
    escalationTriggers: ['Document suspect', 'Signature douteuse'],
    priorityLevel: 2,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 98,
  },

  // ═══ IDENTIFICATION ═══
  'id-1': {
    serviceId: 'id-1',
    serviceName: "Carte d'identité nationale",
    category: 'Identification',
    complexity: 'standard',
    autoApproval: 'if_complete',
    requiredDocuments: ['Extrait acte de naissance', '4 photos identité récentes', 'Certificat de résidence', 'NIN'],
    optionalDocuments: ['Ancienne carte (renouvellement)', 'Passeport'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 7,
    rejectionReasons: ['Photos non conformes', 'Acte de naissance illisible', 'Résidence non vérifiable', 'Double inscription'],
    commonIssues: ['Photos trop anciennes', 'Adresse incorrecte', 'Empreintes non lisibles'],
    eligibilityCriteria: ['Nationalité guinéenne', 'Âge minimum 18 ans (ou 14 avec autorisation)'],
    autoValidationConditions: ['Tous les documents fournis', 'NIN vérifié', 'Photos conformes'],
    escalationTriggers: ['Double inscription détectée', 'Photos douteuses', 'Identité suspecte'],
    priorityLevel: 1,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 88,
  },
  'id-2': {
    serviceId: 'id-2',
    serviceName: 'Passeport biométrique',
    category: 'Identification',
    complexity: 'complexe',
    autoApproval: 'if_complete',
    requiredDocuments: ["Carte d'identité nationale", 'Extrait acte de naissance', '4 photos identité récentes', 'Certificat de résidence'],
    optionalDocuments: ['Ancien passeport', 'Visa ou invitation', 'Attestation employeur'],
    minDocumentsForProcessing: 4,
    estimatedProcessingDays: 10,
    rejectionReasons: ['Documents falsifiés', 'Interdiction de sortie du territoire', 'Photos non conformes aux normes ICAO'],
    commonIssues: ['Photos non conformes ICAO', 'Empreintes digitales illisibles', 'Première demande sans historique'],
    eligibilityCriteria: ['Nationalité guinéenne', 'Pas de mesure judiciaire interdisant la sortie'],
    autoValidationConditions: ['Dossier complet', 'CNI valide', 'Pas de signalement IST'],
    escalationTriggers: ['Signalement IST', 'Demande suspecte', 'Passeport précédent non restitué'],
    priorityLevel: 1,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 82,
  },
  'id-3': {
    serviceId: 'id-3',
    serviceName: 'Permis de conduire',
    category: 'Identification',
    complexity: 'complexe',
    autoApproval: 'if_complete',
    requiredDocuments: ["Carte d'identité nationale", 'Certificat médical', 'Photos identité', 'Attestation de réussite examen code/route'],
    optionalDocuments: ['Ancien permis (conversion)', 'Certificat de formation auto-école'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 10,
    rejectionReasons: ['Non réussite aux examens', 'Certificat médical non conforme', 'Candidat mineur sans autorisation'],
    commonIssues: ['Attestation examen expirée', 'Catégorie demandée non justifiée', 'Certificat médical incomplet'],
    eligibilityCriteria: ['Âge minimum 18 ans (catégorie B)', 'Réussite aux examens officiels'],
    autoValidationConditions: ['Attestation examen valide', 'Certificat médical valide', 'CNI vérifiée'],
    escalationTriggers: ['Attestation examen douteuse', 'Antécédents de conduite dangereuse', 'Demande de catégorie supérieure'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 80,
  },

  // ═══ URBANISME ═══
  'u-1': {
    serviceId: 'u-1',
    serviceName: 'Permis de construire',
    category: 'Urbanisme',
    complexity: 'complexe',
    autoApproval: 'never',
    requiredDocuments: ['Titre foncier ou bail', 'Plan de construction certifié', "Certificat d'urbanisme", 'Étude impact environnemental'],
    optionalDocuments: ['Plan lotissement', 'Autorisation voisinage', 'Rapport géotechnique'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 45,
    rejectionReasons: ['Zone non constructible', 'Plan non conforme au POS', 'Impact environnemental non acceptable', 'Titre foncier contesté'],
    commonIssues: ['Plan non signé par architecte agréé', 'Zone inondable', 'Non-respect des normes de construction'],
    eligibilityCriteria: ['Titre foncier ou bail valide', 'Zone constructible', 'Plan conforme au POS'],
    autoValidationConditions: ['Tous les documents fournis', 'Zone constructible confirmée', 'Plan certifié par architecte agréé'],
    escalationTriggers: ['Zone protégée', 'Conflit foncier', 'Opposition du voisinage', 'Impact environnemental majeur'],
    priorityLevel: 3,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 45,
  },
  'u-2': {
    serviceId: 'u-2',
    serviceName: 'Certificat de conformité',
    category: 'Urbanisme',
    complexity: 'complexe',
    autoApproval: 'never',
    requiredDocuments: ['Permis de construire original', 'Procès-verbal de réception des travaux', 'Plan de construction exécuté'],
    optionalDocuments: ['Rapport du bureau de contrôle', 'Photos du chantier'],
    minDocumentsForProcessing: 2,
    estimatedProcessingDays: 15,
    rejectionReasons: ['Construction non conforme au permis', 'Travaux non achevés', 'Mises en demeure non respectées'],
    commonIssues: ['Modifications non autorisées', 'Travaux non terminés', 'Absence de PV de réception'],
    eligibilityCriteria: ['Permis de construire valide', 'Travaux achevés conformément'],
    autoValidationConditions: ['PV de réception conforme', 'Pas de modifications non autorisées'],
    escalationTriggers: ['Non-conformité majeure', 'Absence de bureau de contrôle', 'Danger pour la sécurité publique'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 55,
  },
  'u-3': {
    serviceId: 'u-3',
    serviceName: 'Titre foncier',
    category: 'Urbanisme',
    complexity: 'complexe',
    autoApproval: 'never',
    requiredDocuments: ['Plan cadastral', 'Certificat de bornage', 'Titre de propriété antérieur', 'Attestation de non-contentieux'],
    optionalDocuments: ['Acte de vente', ' Jugement', 'Certificat de recherche hypothécaire'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 60,
    rejectionReasons: ['Conflit fonzier en cours', 'Plan cadastral non conforme', 'Zone classée'],
    commonIssues: ['Bornage contesté', 'Superposition de titres', 'Absence de titre antérieur'],
    eligibilityCriteria: ['Terrain non classé', 'Pas de contentieux foncier en cours'],
    autoValidationConditions: ['Dossier complet', 'Bornage certifié', 'Pas de contentieux'],
    escalationTriggers: ['Conflit foncier', 'Zone classée', 'Superposition de titres'],
    priorityLevel: 3,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 40,
  },

  // ═══ ENTREPRISE ═══
  'e-1': {
    serviceId: 'e-1',
    serviceName: 'Enregistrement entreprise',
    category: 'Entreprise',
    complexity: 'complexe',
    autoApproval: 'if_complete',
    requiredDocuments: ['Statuts de la société', "Pièce d'identité du gérant", 'Capital social justifié', 'Certificat de résidence du siège'],
    optionalDocuments: ['Régime fiscal choisi', 'Registre de commerce antérieur', 'Agrément ministériel'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 7,
    rejectionReasons: ['Statuts non conformes', 'Activité non autorisée', 'Gérant frappé d\'interdiction', 'Capital social insuffisant'],
    commonIssues: ['Statuts mal rédigés', 'Adresse du siège non vérifiable', 'Activité soumise à agrément sans agrément'],
    eligibilityCriteria: ['Activité légale en Guinée', 'Gérant majeur et capable', 'Capital social minimum respecté'],
    autoValidationConditions: ['Statuts conformes', 'CNI du gérant valide', 'Capital justifié'],
    escalationTriggers: ['Activité sensible', 'Gérant étranger', 'Société à responsabilité limitée unipersonnelle'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 78,
  },
  'e-2': {
    serviceId: 'e-2',
    serviceName: 'Registre de commerce',
    category: 'Entreprise',
    complexity: 'standard',
    autoApproval: 'if_complete',
    requiredDocuments: ["Carte d'identité du commerçant", 'Certificat de résidence', 'Statuts (si société)', 'Justificatif de local commercial'],
    optionalDocuments: ['Registre antérieur', 'Brevet de commerçant'],
    minDocumentsForProcessing: 2,
    estimatedProcessingDays: 5,
    rejectionReasons: ['Activité commerciale non déclarée', 'Commerçant frappé d\'interdiction', 'Local non conforme'],
    commonIssues: ['Local commercial non justifié', 'Activité non listée dans les statuts'],
    eligibilityCriteria: ['Personne physique majeure ou morale', 'Activité commerciale légale'],
    autoValidationConditions: ['Documents complets', 'CNI valide', 'Local justifié'],
    escalationTriggers: ['Activité réglementée', 'Faillite antérieure'],
    priorityLevel: 2,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 85,
  },

  // ═══ ÉDUCATION ═══
  'ed-1': {
    serviceId: 'ed-1',
    serviceName: "Bourse d'étude",
    category: 'Éducation',
    complexity: 'complexe',
    autoApproval: 'never',
    requiredDocuments: ['Diplôme ou relevé de notes', 'Certificat de résidence', 'Justificatif de revenus des parents', "Lettre de motivation"],
    optionalDocuments: ['Certificat de scolarité', 'Attestation de mérite', 'Certificat de décès (orphelin)'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 30,
    rejectionReasons: ['Dossier incomplet', 'Revenus familiaux dépassant le plafond', 'Mentions insuffisantes'],
    commonIssues: ['Justificatif de revenus obsolète', 'Relevé de notes non certifié'],
    eligibilityCriteria: ['Étudiant guinéen', 'Critères sociaux et académiques remplis'],
    autoValidationConditions: ['Dossier complet', 'Critères de mérite vérifiés', 'Revenus sous le plafond'],
    escalationTriggers: ['Dossier limite sur les revenus', 'Concurrence importante', 'Cas social particulier'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 55,
  },
  'ed-2': {
    serviceId: 'ed-2',
    serviceName: 'Duplicata diplôme',
    category: 'Éducation',
    complexity: 'simple',
    autoApproval: 'if_complete',
    requiredDocuments: ["Carte d'identité nationale", 'Déclaration de perte ou vol', 'Ancien numéro du diplôme'],
    optionalDocuments: ['Copie du diplôme original', 'Attestation de réussite'],
    minDocumentsForProcessing: 2,
    estimatedProcessingDays: 7,
    rejectionReasons: ['Diplôme non trouvé dans la base', 'Demande frauduleuse', 'Non-paiement des frais'],
    commonIssues: ['Numéro de diplôme incorrect', 'Année de délivrance inconnue'],
    eligibilityCriteria: ['Titulaire du diplôme original', 'Déclaration de perte/vol enregistrée'],
    autoValidationConditions: ['Diplôme trouvé dans la base', 'Identité vérifiée', 'Déclaration de perte fournie'],
    escalationTriggers: ['Diplôme non trouvé en base', 'Conflit sur le titulaire'],
    priorityLevel: 2,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 90,
  },
  'ed-3': {
    serviceId: 'ed-3',
    serviceName: 'Équivalence de diplôme',
    category: 'Éducation',
    complexity: 'complexe',
    autoApproval: 'never',
    requiredDocuments: ['Diplôme étranger original', 'Traduction certifiée', 'Programme de formation', "Carte d'identité"],
    optionalDocuments: ['Attestation de stage', 'Certificat de reconnaissance internationale'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 30,
    rejectionReasons: ['Diplôme non reconnu dans le pays d\'origine', 'Formation non équivalente', 'Établissement non accrédité'],
    commonIssues: ['Traduction non certifiée', 'Programme de formation incomplet'],
    eligibilityCriteria: ['Diplôme obtenu à l\'étranger', 'Demandeur de nationalité guinéenne ou résident'],
    autoValidationConditions: ['Diplôme reconnu internationalement', 'Équivalence directe possible'],
    escalationTriggers: ['Pays non partie à la convention', 'Établissement non accrédité', 'Spécialité non couverte en Guinée'],
    priorityLevel: 3,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 40,
  },

  // ═══ SANTÉ ═══
  's-1': {
    serviceId: 's-1',
    serviceName: 'Carnet de vaccination',
    category: 'Santé',
    complexity: 'simple',
    autoApproval: 'always',
    requiredDocuments: ["Carte d'identité", 'Ancien carnet de vaccination (si disponible)'],
    optionalDocuments: ['Certificat de vaccination international'],
    minDocumentsForProcessing: 1,
    estimatedProcessingDays: 1,
    rejectionReasons: ['Personne déjà vaccinée pour les maladies ciblées'],
    commonIssues: ['Ancien carnet illisible', 'Vaccinations incomplètes'],
    eligibilityCriteria: ['Toute personne résidant en Guinée'],
    autoValidationConditions: ['Identité vérifiée'],
    escalationTriggers: ['Réaction adverse signalée', 'Contre-indication médicale'],
    priorityLevel: 1,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 98,
  },
  's-2': {
    serviceId: 's-2',
    serviceName: "Carte d'assuré social",
    category: 'Santé',
    complexity: 'standard',
    autoApproval: 'if_complete',
    requiredDocuments: ["Carte d'identité nationale", 'Attestation employeur ou bulletin de salaire', 'Photos identité'],
    optionalDocuments: ['Ancienne carte CNSS', 'Contrat de travail'],
    minDocumentsForProcessing: 2,
    estimatedProcessingDays: 10,
    rejectionReasons: ['Employeur non affilié à la CNSS', 'Salaires non déclarés', 'Double affiliation'],
    commonIssues: ['Employeur non à jour des cotisations', 'Bulletin de salaire incomplet'],
    eligibilityCriteria: ['Travailleur du secteur formel', 'Employeur affilié CNSS'],
    autoValidationConditions: ['Employeur affilié et à jour', 'Identité vérifiée', 'Pas de double affiliation'],
    escalationTriggers: ['Employeur en retard de cotisations', 'Double affiliation détectée'],
    priorityLevel: 2,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 85,
  },

  // ═══ RÉSIDENCE ═══
  'r-1': {
    serviceId: 'r-1',
    serviceName: 'Certificat de résidence',
    category: 'Résidence',
    complexity: 'simple',
    autoApproval: 'always',
    requiredDocuments: ["Carte d'identité nationale", 'Justificatif de domicile (quittance, bail)'],
    optionalDocuments: ['Attestation du quartier', 'Facture d\'eau ou électricité'],
    minDocumentsForProcessing: 1,
    estimatedProcessingDays: 2,
    rejectionReasons: ['Adresse non vérifiable', 'Résidence hors circonscription'],
    commonIssues: ['Justificatif de domicile trop ancien', 'Adresse imprécise'],
    eligibilityCriteria: ['Résidence effective dans la commune', 'Justificatif de moins de 3 mois'],
    autoValidationConditions: ['CNI valide', 'Justificatif de domicile fourni'],
    escalationTriggers: ['Adresse suspecte', 'Conflit de résidence'],
    priorityLevel: 2,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 95,
  },
  'r-2': {
    serviceId: 'r-2',
    serviceName: 'Attestation de domicile',
    category: 'Résidence',
    complexity: 'simple',
    autoApproval: 'always',
    requiredDocuments: ["Carte d'identité nationale", 'Facture récente (eau/électricité/téléphone)'],
    optionalDocuments: ['Bail de location', 'Attestation du propriétaire'],
    minDocumentsForProcessing: 1,
    estimatedProcessingDays: 1,
    rejectionReasons: ['Facture trop ancienne (plus de 3 mois)', 'Nom différent sur la facture sans lien établi'],
    commonIssues: ['Facture au nom d\'un tiers', 'Adresse incomplète'],
    eligibilityCriteria: ['Résidence effective et vérifiable'],
    autoValidationConditions: ['CNI valide', 'Facture récente fournie'],
    escalationTriggers: ['Facture suspecte', 'Adresse inexistante'],
    priorityLevel: 2,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 95,
  },

  // ═══ FISCALITÉ ═══
  'f-1': {
    serviceId: 'f-1',
    serviceName: 'Attestation fiscale',
    category: 'Fiscalité',
    complexity: 'standard',
    autoApproval: 'if_complete',
    requiredDocuments: ["Carte d'identité nationale", 'NIF (Numéro d\'Identification Fiscale)', 'Dernière déclaration fiscale'],
    optionalDocuments: ['Quittancement des impôts', 'Reçu de paiement'],
    minDocumentsForProcessing: 2,
    estimatedProcessingDays: 5,
    rejectionReasons: ['Impôts impayés', 'NIF non valide', 'Déclaration fiscale non conforme'],
    commonIssues: ['Retard dans les déclarations', 'NIF non trouvé', 'Impôts partiels'],
    eligibilityCriteria: ['Contribuable en règle', 'Déclarations à jour'],
    autoValidationConditions: ['NIF valide', 'Déclarations à jour', 'Pas d\'arriérés'],
    escalationTriggers: ['Arriérés importants', 'Contrôle fiscal en cours', 'Fraude suspectée'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 80,
  },
  'f-2': {
    serviceId: 'f-2',
    serviceName: 'Déclaration d\'impôts',
    category: 'Fiscalité',
    complexity: 'standard',
    autoApproval: 'if_complete',
    requiredDocuments: ['NIF', 'Revenus annuels justifiés', "Carte d'identité"],
    optionalDocuments: ['Fiches de paie', 'Bilan comptable', 'Reçus de dons'],
    minDocumentsForProcessing: 2,
    estimatedProcessingDays: 5,
    rejectionReasons: ['Revenus non justifiés', 'Déclaration incomplète', 'Informations contradictoires'],
    commonIssues: ['Déclaration hors délai', 'Revenus non déclarés partiellement', 'Calcul incorrect'],
    eligibilityCriteria: ['Toute personne physique ou morale imposable'],
    autoValidationConditions: ['NIF valide', 'Revenus cohérents', 'Déclaration complète'],
    escalationTriggers: ['Écart significatif avec années précédentes', 'Revenus manifestement sous-évalués'],
    priorityLevel: 2,
    requiresSupervisorSignature: false,
    maxConfidenceWithoutHuman: 82,
  },

  // ═══ SOCIAL ═══
  'so-1': {
    serviceId: 'so-1',
    serviceName: 'Allocations familiales',
    category: 'Social',
    complexity: 'complexe',
    autoApproval: 'never',
    requiredDocuments: ["Carte d'identité nationale", 'Actes de naissance des enfants', 'Certificat de scolarité des enfants', 'Attestation employeur ou justificatif de revenus'],
    optionalDocuments: ['Livret de famille', 'Jugement de garde', 'Certificat de décès du conjoint'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 15,
    rejectionReasons: ['Enfants non scolarisés sans motif légitime', 'Revenus dépassant le plafond', 'Double perception'],
    commonIssues: ['Actes de naissance anciens', 'Certificat de scolarité expiré', 'Revenus non déclarés'],
    eligibilityCriteria: ['Parent ayant des enfants à charge', 'Revenus sous le plafond', 'Enfants scolarisés'],
    autoValidationConditions: ['Dossier complet', 'Enfants vérifiés en base', 'Revenus sous le plafond'],
    escalationTriggers: ['Suspicion de double perception', 'Enfants non vérifiables', 'Revenus manifestement sous-déclarés'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 60,
  },
  'so-2': {
    serviceId: 'so-2',
    serviceName: 'Pension de retraite',
    category: 'Social',
    complexity: 'complexe',
    autoApproval: 'never',
    requiredDocuments: ["Carte d'identité nationale", 'Relevé de carrière CNSS', 'Certificat de cessation d\'activité', 'NIF'],
    optionalDocuments: ['Derniers bulletins de salaire', 'Attestation employeur', 'Titre de pension antérieur'],
    minDocumentsForProcessing: 3,
    estimatedProcessingDays: 30,
    rejectionReasons: ['Cotisations insuffisantes', 'Âge légal non atteint', 'Activité professionnelle toujours en cours'],
    commonIssues: ['Relevé de carrière incomplet', 'Années de cotisation manquantes', 'Incohérence entre déclarations et cotisations'],
    eligibilityCriteria: ['Âge légal de départ (55 ans secteur public, 60 ans privé)', 'Nombre minimum de trimestres cotisés'],
    autoValidationConditions: ['Âge légal vérifié', 'Cotisations suffisantes', 'Cessation d\'activité confirmée'],
    escalationTriggers: ['Cotisations manquantes', 'Activité non déclarée détectée', 'Demande anticipée'],
    priorityLevel: 2,
    requiresSupervisorSignature: true,
    maxConfidenceWithoutHuman: 50,
  },
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

/** Get rule for a service */
export function getServiceRule(serviceId: string): ServiceRule | undefined {
  return SERVICE_RULES[serviceId]
}

/** Get all service rules as array */
export function getAllServiceRules(): ServiceRule[] {
  return Object.values(SERVICE_RULES)
}

/** Get rules by category */
export function getRulesByCategory(category: string): ServiceRule[] {
  return Object.values(SERVICE_RULES).filter(r => r.category === category)
}

/** Get rules by complexity */
export function getRulesByComplexity(complexity: ServiceComplexity): ServiceRule[] {
  return Object.values(SERVICE_RULES).filter(r => r.complexity === complexity)
}

/** Make an AI decision based on service rules and request context */
export function makeAIDecision(ctx: AIDecisionContext): AIDecision {
  const rule = SERVICE_RULES[ctx.serviceId]
  if (!rule) {
    return {
      decision: 'escaladee',
      confidence: 30,
      reason: 'Service non reconnu par le moteur de règles — révision humaine requise',
      missingDocs: [],
      autoApproved: false,
      needsHumanReview: true,
      estimatedDays: 15,
      escalationReason: 'Service non configuré dans le moteur de règles',
    }
  }

  // Check document completeness
  const docRatio = rule.requiredDocuments.length > 0
    ? Math.min(ctx.providedDocs / rule.requiredDocuments.length, 1)
    : 1
  const meetsMinDocs = ctx.providedDocs >= rule.minDocumentsForProcessing
  const isComplete = ctx.providedDocs >= rule.requiredDocuments.length

  // Calculate base confidence
  let confidence = 0
  const factors: { name: string; weight: number; score: number }[] = []

  // Factor 1: Document completeness (40%)
  const docScore = docRatio * 100
  factors.push({ name: 'Complétude documents', weight: 40, score: docScore })

  // Factor 2: NIN availability (15%)
  const ninScore = ctx.citizenNIN ? 100 : 30
  factors.push({ name: 'Vérification identité', weight: 15, score: ninScore })

  // Factor 3: Auto-approval policy (25%)
  let policyScore = 0
  switch (rule.autoApproval) {
    case 'always': policyScore = 100; break
    case 'if_complete': policyScore = isComplete ? 90 : 40; break
    case 'never': policyScore = 20; break
    case 'supervisor_only': policyScore = 30; break
  }
  factors.push({ name: 'Politique auto-approbation', weight: 25, score: policyScore })

  // Factor 4: Service complexity (10%)
  let complexityScore = 0
  switch (rule.complexity) {
    case 'simple': complexityScore = 95; break
    case 'standard': complexityScore = 75; break
    case 'complexe': complexityScore = 50; break
  }
  factors.push({ name: 'Complexité service', weight: 10, score: complexityScore })

  // Factor 5: Priority level (10%)
  let priorityScore = 0
  switch (rule.priorityLevel) {
    case 1: priorityScore = 90; break  // urgent = high confidence to process
    case 2: priorityScore = 70; break
    case 3: priorityScore = 50; break
  }
  factors.push({ name: 'Priorité', weight: 10, score: priorityScore })

  // Weighted average
  confidence = Math.round(
    factors.reduce((sum, f) => sum + f.score * (f.weight / 100), 0)
  )

  // Clamp confidence
  confidence = Math.min(100, Math.max(5, confidence))

  // Apply max confidence cap
  if (confidence > rule.maxConfidenceWithoutHuman) {
    // Only cap if not fully auto-approved
    if (rule.autoApproval !== 'always' && !isComplete) {
      confidence = Math.min(confidence, rule.maxConfidenceWithoutHuman)
    }
  }

  // Determine decision
  let decision: AIDecision['decision']
  let reason: string
  let autoApproved = false
  let needsHumanReview = false
  let missingDocs: string[] = []
  let escalationReason: string | undefined

  if (!meetsMinDocs) {
    // Not enough documents even for processing
    decision = 'pieces_complementaires'
    const missingCount = rule.minDocumentsForProcessing - ctx.providedDocs
    missingDocs = rule.requiredDocuments.slice(ctx.providedDocs)
    reason = `${missingCount} document(s) minimum requis non fourni(s) pour le service "${rule.serviceName}". Documents manquants: ${missingDocs.join(', ')}`
    needsHumanReview = false
  } else if (!isComplete) {
    // Documents partially provided
    decision = 'pieces_complementaires'
    missingDocs = rule.requiredDocuments.slice(ctx.providedDocs)
    reason = `Dossier partiel pour "${rule.serviceName}": ${ctx.providedDocs}/${rule.requiredDocuments.length} documents fournis. Pièces manquantes: ${missingDocs.join(', ')}`
    needsHumanReview = false
  } else if (rule.autoApproval === 'never') {
    // Service never auto-approves
    decision = 'escaladee'
    reason = `Le service "${rule.serviceName}" nécessite une validation humaine obligatoire (politique: jamais d'auto-approbation). Dossier complet mais nécessite révision.`
    needsHumanReview = true
    escalationReason = `Service ${rule.complexity} — validation humaine requise par politique`
  } else if (rule.autoApproval === 'supervisor_only' && confidence < rule.maxConfidenceWithoutHuman) {
    decision = 'escaladee'
    reason = `Le service "${rule.serviceName}" nécessite l'approbation d'un superviseur (confiance: ${confidence}%, seuil: ${rule.maxConfidenceWithoutHuman}%).`
    needsHumanReview = true
    escalationReason = 'Approbation superviseur requise'
  } else if (confidence >= 70 && isComplete) {
    // High enough confidence and complete docs — auto-validate
    decision = 'validee'
    reason = `Dossier complet pour "${rule.serviceName}" avec confiance ${confidence}%. ${rule.autoApproval === 'always' ? 'Auto-approbation systématique.' : 'Auto-approbation conditionnelle validée.'}`
    autoApproved = true
    needsHumanReview = rule.complexity === 'complexe' && confidence < 85
  } else if (confidence >= 50) {
    // Medium confidence — escalate for review
    decision = 'escaladee'
    reason = `Confiance modérée (${confidence}%) pour "${rule.serviceName}". Dossier complet mais vérification humaine recommandée.`
    needsHumanReview = true
    escalationReason = `Confiance ${confidence}% inférieure au seuil de 70%`
  } else {
    // Low confidence — request more docs or escalate
    decision = 'pieces_complementaires'
    reason = `Confiance faible (${confidence}%) pour "${rule.serviceName}". Vérification supplémentaire requise.`
    missingDocs = rule.requiredDocuments
    needsHumanReview = true
  }

  // Check for escalation triggers in the context
  if (decision === 'validee' && rule.escalationTriggers.length > 0) {
    // If there are escalation triggers for this service, add a note
    if (rule.complexity === 'complexe' && confidence < 85) {
      needsHumanReview = true
    }
  }

  return {
    decision,
    confidence,
    reason,
    missingDocs,
    autoApproved,
    needsHumanReview,
    estimatedDays: rule.estimatedProcessingDays,
    escalationReason,
  }
}

/** Build a detailed system prompt for the AI based on service rules */
export function buildServiceSystemPrompt(serviceId: string): string {
  const rule = SERVICE_RULES[serviceId]
  if (!rule) {
    return `Tu es un agent IA de l'administration guinéenne. Analyse la demande et réponds en JSON.`
  }

  return `Tu es un agent IA autonome de l'administration publique de la République de Guinée. Tu analyses les demandes de services publics avec expertise et rigueur.

SERVICE: ${rule.serviceName} (${rule.category})
COMPLEXITÉ: ${rule.complexity}
POLITIQUE D'AUTO-APPROBATION: ${rule.autoApproval === 'always' ? 'Toujours auto-approuver si documents complets' : rule.autoApproval === 'if_complete' ? 'Auto-approuver si dossier complet' : rule.autoApproval === 'never' ? 'Jamais auto-approuver — validation humaine obligatoire' : 'Approbation superviseur uniquement'}
CONFIANCE MAX SANS HUMAIN: ${rule.maxConfidenceWithoutHuman}%
DÉLAI ESTIMÉ: ${rule.estimatedProcessingDays} jours
PRIORITÉ: ${rule.priorityLevel === 1 ? 'Urgente' : rule.priorityLevel === 2 ? 'Normale' : 'Basse'}

DOCUMENTS REQUIS: ${rule.requiredDocuments.join(', ')}
DOCUMENTS OPTIONNELS: ${rule.optionalDocuments.join(', ') || 'Aucun'}
MINIMUM POUR TRAITEMENT: ${rule.minDocumentsForProcessing} document(s)

CRITÈRES D'ÉLIGIBILITÉ:
${rule.eligibilityCriteria.map(c => `- ${c}`).join('\n')}

CONDITIONS D'AUTO-VALIDATION:
${rule.autoValidationConditions.map(c => `- ${c}`).join('\n')}

MOTIFS DE REJET COURANTS:
${rule.rejectionReasons.map(r => `- ${r}`).join('\n')}

PROBLÈMES FRÉQUENTS:
${rule.commonIssues.map(i => `- ${i}`).join('\n')}

DÉCLENCHEURS D'ESCALADE:
${rule.escalationTriggers.map(t => `- ${t}`).join('\n')}

RÈGLE: Si la confiance est inférieure à ${rule.maxConfidenceWithoutHuman}%, la décision doit être "escaladee" (révision humaine) plutôt que "validee". Si des documents sont manquants, utilise "pieces_complementaires". Si le dossier est irrecevable, utilise "rejetee".

Réponds UNIQUEMENT en JSON valide avec ce format:
{
  "decision": "validee" | "pieces_complementaires" | "rejetee" | "escaladee",
  "confidence": 0-100,
  "reason": "Explication détaillée en français",
  "missingDocs": ["document1", "document2"],
  "estimatedDays": nombre,
  "needsHumanReview": true/false
}`
}

/** Get statistics about service rules */
export function getServiceRulesStats() {
  const rules = Object.values(SERVICE_RULES)
  return {
    totalServices: rules.length,
    byComplexity: {
      simple: rules.filter(r => r.complexity === 'simple').length,
      standard: rules.filter(r => r.complexity === 'standard').length,
      complexe: rules.filter(r => r.complexity === 'complexe').length,
    },
    byAutoApproval: {
      always: rules.filter(r => r.autoApproval === 'always').length,
      if_complete: rules.filter(r => r.autoApproval === 'if_complete').length,
      never: rules.filter(r => r.autoApproval === 'never').length,
      supervisor_only: rules.filter(r => r.autoApproval === 'supervisor_only').length,
    },
    avgProcessingDays: Math.round(rules.reduce((sum, r) => sum + r.estimatedProcessingDays, 0) / rules.length),
    avgMaxConfidence: Math.round(rules.reduce((sum, r) => sum + r.maxConfidenceWithoutHuman, 0) / rules.length),
  }
}
