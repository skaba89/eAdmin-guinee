// ═══════════════════════════════════════════════════════════════════════════════
// eAdministration Suite Guinea — Complete Services Configuration
// 28 administrative services with form fields, workflows, and business rules
// Drives the entire citizen request processing pipeline
// ═══════════════════════════════════════════════════════════════════════════════

// ─── INTERFACES ────────────────────────────────────────────────────────────────

export interface ServiceFormField {
  id: string
  label: string
  type: 'text' | 'select' | 'date' | 'textarea' | 'number' | 'checkbox' | 'radio'
  required: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  validation?: {
    pattern?: string
    min?: number
    max?: number
  }
  dependsOn?: {
    fieldId: string
    value: string
  }
  helperText?: string
}

export interface WorkflowStep {
  id: string
  label: string
  description: string
  order: number
  requiredStatus: string
  isAutomatic: boolean
  estimatedDuration: number // hours
  requiredRole: string
}

export interface ServiceConfig {
  serviceId: string
  serviceName: string
  categoryId: string
  categoryName: string
  description: string
  price: string
  priceAmount: number
  currency: 'GNF'
  estimatedDelayHours: number
  requiresAccount: boolean
  isAutoEligible: boolean
  verificationDb: string
  formFields: ServiceFormField[]
  workflowSteps: WorkflowStep[]
  rejectionReasons: string[]
  documentValidityPeriod: number // days, 0 = permanent
}

// ─── COMMON FORM FIELDS ────────────────────────────────────────────────────────

const COMMON_FIELDS: ServiceFormField[] = [
  {
    id: 'nom',
    label: 'Nom',
    type: 'text',
    required: true,
    placeholder: 'Entrez votre nom de famille',
    validation: { pattern: '^[A-Za-zÀ-ÿ\\s\\-]+$', min: 2, max: 50 },
    helperText: 'Nom de famille tel qu\'il apparaît sur vos documents officiels',
  },
  {
    id: 'prenom',
    label: 'Prénom',
    type: 'text',
    required: true,
    placeholder: 'Entrez votre prénom',
    validation: { pattern: '^[A-Za-zÀ-ÿ\\s\\-]+$', min: 2, max: 50 },
    helperText: 'Prénom tel qu\'il apparaît sur vos documents officiels',
  },
  {
    id: 'nin',
    label: 'Numéro d\'Identification Nationale (NIN)',
    type: 'text',
    required: true,
    placeholder: 'Ex: 1995031512345',
    validation: { pattern: '^[0-9]{13}$', min: 13, max: 13 },
    helperText: 'Numéro à 13 chiffres figurant sur votre CNI',
  },
  {
    id: 'telephone',
    label: 'Numéro de téléphone',
    type: 'text',
    required: true,
    placeholder: 'Ex: +224 622 00 00 00',
    validation: { pattern: '^(\\+224|00224)?[0-9\\s]{8,15}$' },
    helperText: 'Numéro de téléphone mobile pour les notifications',
  },
  {
    id: 'adresse',
    label: 'Adresse complète',
    type: 'textarea',
    required: true,
    placeholder: 'Quartier, commune, ville...',
    validation: { min: 10, max: 200 },
    helperText: 'Adresse de résidence actuelle',
  },
]

// ─── SERVICES CONFIGURATION ────────────────────────────────────────────────────

export const SERVICES_CONFIG: Record<string, ServiceConfig> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAT CIVIL (ec)
  // ═══════════════════════════════════════════════════════════════════════════

  'ec-1': {
    serviceId: 'ec-1',
    serviceName: 'Extrait d\'acte de naissance',
    categoryId: 'ec',
    categoryName: 'État Civil',
    description: 'Copie intégrale ou extrait d\'acte de naissance délivré par la mairie du lieu de naissance. Document officiel attestant de la naissance d\'une personne.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 48,
    requiresAccount: true,
    isAutoEligible: true,
    verificationDb: 'birth_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'dateNaissance',
        label: 'Date de naissance',
        type: 'date',
        required: true,
        helperText: 'Date de naissance telle qu\'enregistrée à l\'état civil',
      },
      {
        id: 'lieuNaissance',
        label: 'Lieu de naissance',
        type: 'text',
        required: true,
        placeholder: 'Ex: Kaloum, Conakry',
        validation: { min: 2, max: 100 },
        helperText: 'Commune et ville de naissance',
      },
      {
        id: 'numeroActe',
        label: 'Numéro d\'acte de naissance',
        type: 'text',
        required: false,
        placeholder: 'Ex: 1995-KLM-00147',
        helperText: 'Numéro d\'enregistrement si vous le connaissez (facultatif)',
      },
      {
        id: 'nomPere',
        label: 'Nom du père',
        type: 'text',
        required: true,
        placeholder: 'Nom complet du père',
        validation: { min: 2, max: 100 },
      },
      {
        id: 'nomMere',
        label: 'Nom de la mère (nom de jeune fille)',
        type: 'text',
        required: true,
        placeholder: 'Nom de jeune fille de la mère',
        validation: { min: 2, max: 100 },
      },
    ],
    workflowSteps: [
      { id: 'ec1-soumission', label: 'Soumission', description: 'Soumission de la demande par le citoyen', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'ec1-verification-acte', label: 'Vérification acte de naissance', description: 'Consultation automatique de la base de données des actes de naissance', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'ec1-validation-mairie', label: 'Validation mairie', description: 'Validation de l\'acte par l\'officier d\'état civil de la mairie', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 24, requiredRole: 'etat_civil_officer' },
      { id: 'ec1-production', label: 'Production document', description: 'Génération et impression de l\'extrait d\'acte de naissance', order: 4, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'ec1-livraison', label: 'Livraison', description: 'Mise à disposition du document pour retrait ou envoi numérique', order: 5, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 21, requiredRole: 'etat_civil_officer' },
    ],
    rejectionReasons: [
      'Aucun acte de naissance trouvé dans la base de données pour les informations fournies',
      'Informations incohérentes entre la demande et l\'acte enregistré',
      'Acte de naissance annulé ou remplacé dans le registre',
      'Demande incomplète — pièces justificatives manquantes',
    ],
    documentValidityPeriod: 0,
  },

  'ec-2': {
    serviceId: 'ec-2',
    serviceName: 'Extrait d\'acte de mariage',
    categoryId: 'ec',
    categoryName: 'État Civil',
    description: 'Copie intégrale ou extrait d\'acte de mariage délivré par la mairie du lieu de célébration du mariage.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 48,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'marriage_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'dateMariage',
        label: 'Date du mariage',
        type: 'date',
        required: true,
        helperText: 'Date de célébration du mariage',
      },
      {
        id: 'lieuMariage',
        label: 'Lieu du mariage',
        type: 'text',
        required: true,
        placeholder: 'Ex: Mairie de Kaloum',
        validation: { min: 2, max: 150 },
        helperText: 'Mairie ou commune où le mariage a été célébré',
      },
      {
        id: 'numeroActeMariage',
        label: 'Numéro d\'acte de mariage',
        type: 'text',
        required: false,
        placeholder: 'Ex: 2018-KLM-M0147',
        helperText: 'Numéro d\'enregistrement si vous le connaissez (facultatif)',
      },
      {
        id: 'nomConjoint',
        label: 'Nom du conjoint',
        type: 'text',
        required: true,
        placeholder: 'Nom complet du conjoint',
        validation: { min: 2, max: 100 },
      },
    ],
    workflowSteps: [
      { id: 'ec2-soumission', label: 'Soumission', description: 'Soumission de la demande par le citoyen', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'ec2-verification-mariage', label: 'Vérification acte de mariage', description: 'Consultation automatique du registre des mariages', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'ec2-validation-mairie', label: 'Validation mairie', description: 'Validation par l\'officier d\'état civil compétent', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 24, requiredRole: 'etat_civil_officer' },
      { id: 'ec2-production', label: 'Production document', description: 'Génération de l\'extrait d\'acte de mariage', order: 4, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'ec2-livraison', label: 'Livraison', description: 'Mise à disposition du document', order: 5, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 21, requiredRole: 'etat_civil_officer' },
    ],
    rejectionReasons: [
      'Aucun acte de mariage trouvé pour les informations fournies',
      'Nom du conjoint ne correspondant pas au registre',
      'Acte de mariage annulé (divorce enregistré)',
      'Informations incomplètes ou incohérentes',
    ],
    documentValidityPeriod: 0,
  },

  'ec-3': {
    serviceId: 'ec-3',
    serviceName: 'Extrait d\'acte de décès',
    categoryId: 'ec',
    categoryName: 'État Civil',
    description: 'Copie intégrale ou extrait d\'acte de décès délivré par la mairie du lieu de décès.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 48,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'death_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'dateDeces',
        label: 'Date du décès',
        type: 'date',
        required: true,
        helperText: 'Date du décès telle qu\'enregistrée',
      },
      {
        id: 'lieuDeces',
        label: 'Lieu du décès',
        type: 'text',
        required: true,
        placeholder: 'Ex: Conakry, Matam',
        validation: { min: 2, max: 150 },
      },
      {
        id: 'numeroActeDeces',
        label: 'Numéro d\'acte de décès',
        type: 'text',
        required: false,
        placeholder: 'Ex: 2023-MTM-D0042',
        helperText: 'Numéro d\'enregistrement si vous le connaissez (facultatif)',
      },
      {
        id: 'lienParente',
        label: 'Lien de parenté avec le défunt',
        type: 'select',
        required: true,
        options: [
          { label: 'Conjoint(e)', value: 'conjoint' },
          { label: 'Enfant', value: 'enfant' },
          { label: 'Père/Mère', value: 'parent' },
          { label: 'Frère/Sœur', value: 'frere_soeur' },
          { label: 'Autre', value: 'autre' },
        ],
        helperText: 'Seules les personnes ayant un lien de parenté peuvent demander cet extrait',
      },
    ],
    workflowSteps: [
      { id: 'ec3-soumission', label: 'Soumission', description: 'Soumission de la demande par le demandeur', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'ec3-verification-deces', label: 'Vérification acte de décès', description: 'Consultation automatique du registre des décès', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'ec3-verification-parente', label: 'Vérification lien de parenté', description: 'Vérification du lien de parenté du demandeur avec le défunt', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 12, requiredRole: 'etat_civil_officer' },
      { id: 'ec3-validation', label: 'Validation mairie', description: 'Validation finale par l\'officier d\'état civil', order: 4, requiredStatus: 'parente_verified', isAutomatic: false, estimatedDuration: 12, requiredRole: 'etat_civil_officer' },
      { id: 'ec3-production', label: 'Production document', description: 'Génération de l\'extrait d\'acte de décès', order: 5, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'ec3-livraison', label: 'Livraison', description: 'Mise à disposition du document', order: 6, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 21, requiredRole: 'etat_civil_officer' },
    ],
    rejectionReasons: [
      'Aucun acte de décès trouvé pour les informations fournies',
      'Le demandeur n\'a pas de lien de parenté reconnu avec le défunt',
      'Informations incohérentes entre la demande et le registre',
      'Pièces justificatives du lien de parenté insuffisantes',
    ],
    documentValidityPeriod: 0,
  },

  'ec-4': {
    serviceId: 'ec-4',
    serviceName: 'Certificat de nationalité',
    categoryId: 'ec',
    categoryName: 'État Civil',
    description: 'Certificat officiel attestant de la nationalité guinéenne du demandeur, délivré par le tribunal de première instance.',
    price: '5 000 GNF',
    priceAmount: 5000,
    currency: 'GNF',
    estimatedDelayHours: 120,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'birth_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'motifNationalite',
        label: 'Motif de la demande',
        type: 'select',
        required: true,
        options: [
          { label: 'Inscription sur les listes électorales', value: 'electorale' },
          { label: 'Demande de passeport', value: 'passeport' },
          { label: 'Emploi dans la fonction publique', value: 'emploi' },
          { label: 'Autre', value: 'autre' },
        ],
        helperText: 'Raison pour laquelle vous demandez le certificat de nationalité',
      },
    ],
    workflowSteps: [
      { id: 'ec4-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement des frais', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'ec4-verification-naissance', label: 'Vérification acte de naissance', description: 'Consultation du registre des naissances pour confirmer la naissance en Guinée', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'ec4-instruction-dossier', label: 'Instruction du dossier', description: 'Examen complet du dossier par le greffier du tribunal', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 48, requiredRole: 'tribunal_clerk' },
      { id: 'ec4-audition', label: 'Audition du demandeur', description: 'Audition éventuelle du demandeur par le juge', order: 4, requiredStatus: 'instructed', isAutomatic: false, estimatedDuration: 24, requiredRole: 'judge' },
      { id: 'ec4-deliberation', label: 'Délibération', description: 'Délibération et décision du juge sur l\'attribution du certificat', order: 5, requiredStatus: 'auditioned', isAutomatic: false, estimatedDuration: 24, requiredRole: 'judge' },
      { id: 'ec4-production', label: 'Production document', description: 'Établissement et signature du certificat de nationalité', order: 6, requiredStatus: 'approved', isAutomatic: false, estimatedDuration: 8, requiredRole: 'tribunal_clerk' },
      { id: 'ec4-livraison', label: 'Livraison', description: 'Remise du certificat au demandeur', order: 7, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 14, requiredRole: 'tribunal_clerk' },
    ],
    rejectionReasons: [
      'Impossible de prouver la nationalité guinéenne par les documents fournis',
      'Acte de naissance non trouvé ou annulé dans le registre',
      'Le demandeur ne remplit pas les conditions légales de nationalité',
      'Informations contradictoires entre les documents présentés',
      'Dossier incomplet — pièces justificatives manquantes',
    ],
    documentValidityPeriod: 365,
  },

  'ec-5': {
    serviceId: 'ec-5',
    serviceName: 'Déclaration de naissance',
    categoryId: 'ec',
    categoryName: 'État Civil',
    description: 'Déclaration officielle d\'une naissance auprès de la mairie du lieu de naissance. Obligatoire dans les 30 jours suivant la naissance.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 24,
    requiresAccount: true,
    isAutoEligible: true,
    verificationDb: 'birth_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'dateNaissanceEnfant',
        label: 'Date de naissance de l\'enfant',
        type: 'date',
        required: true,
        helperText: 'La déclaration doit être faite dans les 30 jours suivant la naissance',
      },
      {
        id: 'lieuNaissanceEnfant',
        label: 'Lieu de naissance de l\'enfant',
        type: 'text',
        required: true,
        placeholder: 'Ex: Clinique Pasteur, Dixinn',
        validation: { min: 2, max: 150 },
      },
      {
        id: 'sexeEnfant',
        label: 'Sexe de l\'enfant',
        type: 'select',
        required: true,
        options: [
          { label: 'Masculin', value: 'M' },
          { label: 'Féminin', value: 'F' },
        ],
      },
      {
        id: 'nomPere',
        label: 'Nom du père',
        type: 'text',
        required: true,
        placeholder: 'Nom complet du père',
        validation: { min: 2, max: 100 },
      },
      {
        id: 'nomMere',
        label: 'Nom de la mère (nom de jeune fille)',
        type: 'text',
        required: true,
        placeholder: 'Nom de jeune fille de la mère',
        validation: { min: 2, max: 100 },
      },
      {
        id: 'certificatMedical',
        label: 'Certificat médical de naissance',
        type: 'checkbox',
        required: true,
        helperText: 'Attestation que vous disposez du certificat médical de naissance délivré par la maternité',
      },
    ],
    workflowSteps: [
      { id: 'ec5-soumission', label: 'Soumission', description: 'Soumission de la déclaration de naissance', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'ec5-verification-doublon', label: 'Vérification anti-doublon', description: 'Vérification automatique qu\'aucun acte n\'existe déjà pour cet enfant', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'ec5-enregistrement', label: 'Enregistrement', description: 'Enregistrement de l\'acte de naissance par l\'officier d\'état civil', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 8, requiredRole: 'etat_civil_officer' },
      { id: 'ec5-production', label: 'Production acte', description: 'Génération de l\'acte de naissance et attribution du numéro d\'enregistrement', order: 4, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'ec5-livraison', label: 'Livraison', description: 'Remise de l\'acte de naissance au déclarant', order: 5, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 13, requiredRole: 'etat_civil_officer' },
    ],
    rejectionReasons: [
      'Un acte de naissance existe déjà pour cet enfant avec ces mêmes informations',
      'Déclaration effectuée au-delà du délai légal de 30 jours (procédure supplémentaire requise)',
      'Certificat médical de naissance non fourni ou invalide',
      'Informations incohérentes entre le certificat médical et la déclaration',
    ],
    documentValidityPeriod: 0,
  },

  'ec-6': {
    serviceId: 'ec-6',
    serviceName: 'Changement de nom',
    categoryId: 'ec',
    categoryName: 'État Civil',
    description: 'Procédure de changement de nom auprès du tribunal de première instance. Nécessite une publication au Journal Officiel de Guinée.',
    price: '50 000 GNF',
    priceAmount: 50000,
    currency: 'GNF',
    estimatedDelayHours: 720,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'birth_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'ancienNom',
        label: 'Ancien nom',
        type: 'text',
        required: true,
        placeholder: 'Nom actuel à changer',
        validation: { min: 2, max: 100 },
      },
      {
        id: 'nouveauNom',
        label: 'Nouveau nom demandé',
        type: 'text',
        required: true,
        placeholder: 'Nouveau nom souhaité',
        validation: { min: 2, max: 100 },
      },
      {
        id: 'motifChangement',
        label: 'Motif du changement',
        type: 'select',
        required: true,
        options: [
          { label: 'Erreur dans l\'acte de naissance', value: 'erreur' },
          { label: 'Mariage', value: 'mariage' },
          { label: 'Adoption', value: 'adoption' },
          { label: 'Autre', value: 'autre' },
        ],
        helperText: 'Raison principale du changement de nom',
      },
      {
        id: 'datePublicationJO',
        label: 'Date de publication au Journal Officiel',
        type: 'date',
        required: false,
        helperText: 'À remplir après la publication au Journal Officiel de Guinée',
      },
    ],
    workflowSteps: [
      { id: 'ec6-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement des frais', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'ec6-verification-acte', label: 'Vérification acte de naissance', description: 'Vérification de l\'acte de naissance actuel dans le registre', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'ec6-instruction', label: 'Instruction du dossier', description: 'Examen du dossier par le greffier du tribunal', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 168, requiredRole: 'tribunal_clerk' },
      { id: 'ec6-publication-jo', label: 'Publication au Journal Officiel', description: 'Publication de l\'avis de changement de nom au Journal Officiel de Guinée', order: 4, requiredStatus: 'instructed', isAutomatic: false, estimatedDuration: 336, requiredRole: 'journal_officiel_agent' },
      { id: 'ec6-delai-opposition', label: 'Délai d\'opposition', description: 'Attente du délai légal d\'opposition (2 mois)', order: 5, requiredStatus: 'published', isAutomatic: true, estimatedDuration: 1440, requiredRole: 'system' },
      { id: 'ec6-jugement', label: 'Jugement', description: 'Jugement du tribunal prononçant le changement de nom', order: 6, requiredStatus: 'opposition_closed', isAutomatic: false, estimatedDuration: 72, requiredRole: 'judge' },
      { id: 'ec6-mise-a-jour', label: 'Mise à jour registre', description: 'Mise à jour du registre d\'état civil avec le nouveau nom', order: 7, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'ec6-livraison', label: 'Livraison', description: 'Remise du jugement et du nouvel extrait d\'acte de naissance', order: 8, requiredStatus: 'updated', isAutomatic: false, estimatedDuration: 14, requiredRole: 'tribunal_clerk' },
    ],
    rejectionReasons: [
      'Le motif invoqué n\'est pas juridiquement recevable',
      'Opposition formée par un tiers durant le délai de publication',
      'Le nouveau nom est contraire à l\'ordre public ou aux bonnes mœurs',
      'Documents justificatifs insuffisants pour motiver le changement',
      'Erreur ou fraude détectée dans le dossier',
    ],
    documentValidityPeriod: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // JUSTICE (j)
  // ═══════════════════════════════════════════════════════════════════════════

  'j-1': {
    serviceId: 'j-1',
    serviceName: 'Casier judiciaire',
    categoryId: 'j',
    categoryName: 'Justice',
    description: 'Extrait du casier judiciaire (Bulletin n°3) délivré par le greffe du tribunal. Document nécessaire pour de nombreuses démarches administratives.',
    price: '5 000 GNF',
    priceAmount: 5000,
    currency: 'GNF',
    estimatedDelayHours: 120,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'criminal_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'motifCasier',
        label: 'Motif de la demande',
        type: 'select',
        required: true,
        options: [
          { label: 'Emploi', value: 'emploi' },
          { label: 'Visa', value: 'visa' },
          { label: 'Licence', value: 'licence' },
          { label: 'Autre', value: 'autre' },
        ],
      },
      {
        id: 'typeCasier',
        label: 'Type de bulletin',
        type: 'select',
        required: true,
        options: [
          { label: 'Bulletin B1 (personne physique)', value: 'B1' },
          { label: 'Bulletin B2 (administration)', value: 'B2' },
          { label: 'Bulletin B3 (personne physique — le plus courant)', value: 'B3' },
        ],
        helperText: 'Le Bulletin B3 est le plus demandé par les particuliers',
      },
    ],
    workflowSteps: [
      { id: 'j1-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'j1-verification-identite', label: 'Vérification identité', description: 'Vérification de l\'identité du demandeur dans les bases de données', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'j1-consultation-casier', label: 'Consultation casier judiciaire', description: 'Consultation du casier judiciaire national', order: 3, requiredStatus: 'identity_verified', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'j1-validation-greffier', label: 'Validation greffier', description: 'Validation et certification par le greffier du tribunal', order: 4, requiredStatus: 'records_checked', isAutomatic: false, estimatedDuration: 72, requiredRole: 'tribunal_clerk' },
      { id: 'j1-production', label: 'Production document', description: 'Établissement du bulletin du casier judiciaire', order: 5, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'j1-livraison', label: 'Livraison', description: 'Remise de l\'extrait du casier judiciaire', order: 6, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 43, requiredRole: 'tribunal_clerk' },
    ],
    rejectionReasons: [
      'Identité du demandeur non vérifiable dans les bases de données',
      'Informations incohérentes entre la demande et les registres',
      'Demande incomplète — pièces d\'identité manquantes ou expirées',
      'Le demandeur n\'est pas habilité à recevoir le type de bulletin demandé',
    ],
    documentValidityPeriod: 90,
  },

  'j-2': {
    serviceId: 'j-2',
    serviceName: 'Certificat de non-poursuite',
    categoryId: 'j',
    categoryName: 'Justice',
    description: 'Certificat attestant qu\'aucune poursuite judiciaire n\'est en cours contre le demandeur. Délivré par le parquet du tribunal.',
    price: '3 000 GNF',
    priceAmount: 3000,
    currency: 'GNF',
    estimatedDelayHours: 72,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'criminal_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'motifNonPoursuite',
        label: 'Motif de la demande',
        type: 'select',
        required: true,
        options: [
          { label: 'Licence commerciale', value: 'licence_commerciale' },
          { label: 'Emploi', value: 'emploi' },
          { label: 'Autre', value: 'autre' },
        ],
      },
    ],
    workflowSteps: [
      { id: 'j2-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'j2-verification-identite', label: 'Vérification identité', description: 'Vérification de l\'identité du demandeur', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'j2-verification-poursuites', label: 'Vérification poursuites', description: 'Consultation du registre des poursuites judiciaires', order: 3, requiredStatus: 'identity_verified', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'j2-validation-parquet', label: 'Validation parquet', description: 'Validation par le magistrat du parquet', order: 4, requiredStatus: 'records_checked', isAutomatic: false, estimatedDuration: 48, requiredRole: 'prosecutor' },
      { id: 'j2-production', label: 'Production document', description: 'Établissement du certificat de non-poursuite', order: 5, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'j2-livraison', label: 'Livraison', description: 'Remise du certificat', order: 6, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 19, requiredRole: 'tribunal_clerk' },
    ],
    rejectionReasons: [
      'Des poursuites judiciaires sont en cours contre le demandeur',
      'Identité non vérifiable',
      'Documents d\'identité manquants ou expirés',
      'Informations incohérentes dans la demande',
    ],
    documentValidityPeriod: 90,
  },

  'j-3': {
    serviceId: 'j-3',
    serviceName: 'Légalisation de documents',
    categoryId: 'j',
    categoryName: 'Justice',
    description: 'Légalisation officielle de signatures et de documents par le tribunal. Atteste de l\'authenticité de la signature apposée sur un document.',
    price: '2 000 GNF',
    priceAmount: 2000,
    currency: 'GNF',
    estimatedDelayHours: 24,
    requiresAccount: true,
    isAutoEligible: true,
    verificationDb: '',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'typeDocument',
        label: 'Type de document à légaliser',
        type: 'select',
        required: true,
        options: [
          { label: 'Diplôme', value: 'diplome' },
          { label: 'Contrat', value: 'contrat' },
          { label: 'Attestation', value: 'attestation' },
          { label: 'Autre', value: 'autre' },
        ],
      },
      {
        id: 'paysOrigine',
        label: 'Pays d\'origine du document',
        type: 'text',
        required: true,
        placeholder: 'Ex: Guinée, Sénégal, France',
        validation: { min: 2, max: 50 },
        helperText: 'Pays où le document a été émis',
      },
    ],
    workflowSteps: [
      { id: 'j3-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'j3-verification-document', label: 'Vérification document', description: 'Vérification de l\'authenticité du document présenté', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'j3-legalisation', label: 'Légalisation', description: 'Apposition de la légalisation par le greffier', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 8, requiredRole: 'tribunal_clerk' },
      { id: 'j3-livraison', label: 'Livraison', description: 'Remise du document légalisé', order: 4, requiredStatus: 'legalized', isAutomatic: false, estimatedDuration: 15, requiredRole: 'tribunal_clerk' },
    ],
    rejectionReasons: [
      'Document suspecté de contrefaçon ou de falsification',
      'Signature du signataire non reconnaissable ou non vérifiable',
      'Document non conforme aux exigences légales pour la légalisation',
      'Le signataire du document n\'est pas identifié ou pas joignable',
    ],
    documentValidityPeriod: 180,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTIFICATION (id)
  // ═══════════════════════════════════════════════════════════════════════════

  'id-1': {
    serviceId: 'id-1',
    serviceName: 'CNI biométrique',
    categoryId: 'id',
    categoryName: 'Identification',
    description: 'Carte Nationale d\'Identité biométrique. Document officiel d\'identification incluant les données biométriques du titulaire.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 168,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'birth_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'typeDemande',
        label: 'Type de demande',
        type: 'select',
        required: true,
        options: [
          { label: 'Première demande', value: 'premiere_demande' },
          { label: 'Renouvellement', value: 'renouvellement' },
          { label: 'Remplacement (perte/vol)', value: 'remplacement' },
        ],
      },
      {
        id: 'categorieCNI',
        label: 'Catégorie de CNI',
        type: 'select',
        required: true,
        options: [
          { label: 'Majeur (18 ans et plus)', value: 'majeur' },
          { label: 'Mineur (moins de 18 ans)', value: 'mineur' },
        ],
      },
    ],
    workflowSteps: [
      { id: 'id1-soumission', label: 'Soumission', description: 'Soumission de la demande en ligne', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'id1-verification-identite', label: 'Vérification identité', description: 'Vérification de l\'identité dans les bases de données', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'id1-retrait-biometrique', label: 'Prise d\'empreintes biométriques', description: 'Rendez-vous pour la capture des données biométriques (empreintes, photo)', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 48, requiredRole: 'identification_agent' },
      { id: 'id1-fabrication', label: 'Fabrication CNI', description: 'Fabrication de la carte biométrique', order: 4, requiredStatus: 'biometrics_captured', isAutomatic: true, estimatedDuration: 96, requiredRole: 'system' },
      { id: 'id1-activation', label: 'Activation', description: 'Activation et vérification de la carte avant distribution', order: 5, requiredStatus: 'fabricated', isAutomatic: false, estimatedDuration: 8, requiredRole: 'identification_agent' },
      { id: 'id1-livraison', label: 'Livraison', description: 'Remise de la CNI au citoyen', order: 6, requiredStatus: 'activated', isAutomatic: false, estimatedDuration: 14, requiredRole: 'identification_agent' },
    ],
    rejectionReasons: [
      'Identité non vérifiable dans les bases de données de l\'état civil',
      'Documents justificatifs manquants ou falsifiés',
      'Le demandeur ne remplit pas les conditions d\'âge ou de nationalité',
      'Doublon détecté — une CNI active existe déjà pour ce NIN',
      'Données biométriques impossibles à capturer (problème technique)',
    ],
    documentValidityPeriod: 3650,
  },

  'id-2': {
    serviceId: 'id-2',
    serviceName: 'Passeport biométrique',
    categoryId: 'id',
    categoryName: 'Identification',
    description: 'Passeport biométrique guinéen pour les voyages internationaux. Inclut une puce électronique avec les données biométriques.',
    price: '150 000 GNF',
    priceAmount: 150000,
    currency: 'GNF',
    estimatedDelayHours: 240,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'birth_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'typeDemandePasseport',
        label: 'Type de demande',
        type: 'select',
        required: true,
        options: [
          { label: 'Première demande', value: 'premiere_demande' },
          { label: 'Renouvellement', value: 'renouvellement' },
        ],
      },
      {
        id: 'typePasseport',
        label: 'Type de passeport',
        type: 'select',
        required: true,
        options: [
          { label: 'Ordinaire', value: 'ordinaire' },
          { label: 'Diplomatique', value: 'diplomatique' },
          { label: 'De service', value: 'service' },
        ],
        helperText: 'Le passeport diplomatique et de service est réservé aux agents de l\'État',
      },
      {
        id: 'paysDestination',
        label: 'Pays de destination principale',
        type: 'text',
        required: true,
        placeholder: 'Ex: France, Sénégal, États-Unis',
        validation: { min: 2, max: 50 },
      },
    ],
    workflowSteps: [
      { id: 'id2-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement des frais', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'id2-verification-dossier', label: 'Vérification dossier', description: 'Vérification du dossier et de l\'identité du demandeur', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'id2-retrait-biometrique', label: 'Capture biométrique', description: 'Rendez-vous pour la capture des données biométriques', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 72, requiredRole: 'identification_agent' },
      { id: 'id2-validation-police', label: 'Validation police', description: 'Vérification par les services de police (casier judiciaire, signalements)', order: 4, requiredStatus: 'biometrics_captured', isAutomatic: false, estimatedDuration: 48, requiredRole: 'police_officer' },
      { id: 'id2-fabrication', label: 'Fabrication passeport', description: 'Fabrication du passeport biométrique', order: 5, requiredStatus: 'police_cleared', isAutomatic: true, estimatedDuration: 96, requiredRole: 'system' },
      { id: 'id2-livraison', label: 'Livraison', description: 'Remise du passeport au citoyen', order: 6, requiredStatus: 'fabricated', isAutomatic: false, estimatedDuration: 20, requiredRole: 'identification_agent' },
    ],
    rejectionReasons: [
      'Le demandeur fait l\'objet d\'une interdiction de quitter le territoire',
      'Documents d\'identité falsifiés ou contrefaits',
      'Casier judiciaire incompatible avec la délivrance d\'un passeport',
      'Informations contradictoires dans le dossier',
      'Le demandeur ne peut justifier de sa nationalité guinéenne',
    ],
    documentValidityPeriod: 1825,
  },

  'id-3': {
    serviceId: 'id-3',
    serviceName: 'Permis de conduire',
    categoryId: 'id',
    categoryName: 'Identification',
    description: 'Permis de conduire guinéen. Permet la conduite de véhicules sur le territoire national et international (selon la catégorie).',
    price: '25 000 GNF',
    priceAmount: 25000,
    currency: 'GNF',
    estimatedDelayHours: 240,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'driving_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'categoriePermis',
        label: 'Catégorie de permis',
        type: 'select',
        required: true,
        options: [
          { label: 'A — Moto', value: 'A' },
          { label: 'B — Véhicule léger', value: 'B' },
          { label: 'C — Poids lourd', value: 'C' },
          { label: 'D — Transport en commun', value: 'D' },
          { label: 'E — Remorque', value: 'E' },
        ],
      },
      {
        id: 'typeDemandePermis',
        label: 'Type de demande',
        type: 'select',
        required: true,
        options: [
          { label: 'Première demande', value: 'premiere_demande' },
          { label: 'Renouvellement', value: 'renouvellement' },
          { label: 'Conversion internationale', value: 'conversion_internationale' },
        ],
      },
      {
        id: 'autoEcole',
        label: 'Auto-école fréquentée',
        type: 'text',
        required: false,
        placeholder: 'Nom de l\'auto-école',
        validation: { min: 2, max: 100 },
        helperText: 'Requis pour une première demande (facultatif pour un renouvellement)',
        dependsOn: { fieldId: 'typeDemandePermis', value: 'premiere_demande' },
      },
    ],
    workflowSteps: [
      { id: 'id3-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'id3-verification-dossier', label: 'Vérification dossier', description: 'Vérification du dossier médical et administratif', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'id3-examen-code', label: 'Examen du code', description: 'Passage de l\'examen du code de la route', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 72, requiredRole: 'driving_examiner' },
      { id: 'id3-examen-conduite', label: 'Examen de conduite', description: 'Passage de l\'examen pratique de conduite', order: 4, requiredStatus: 'code_passed', isAutomatic: false, estimatedDuration: 72, requiredRole: 'driving_examiner' },
      { id: 'id3-fabrication', label: 'Fabrication permis', description: 'Fabrication du permis de conduire', order: 5, requiredStatus: 'driving_passed', isAutomatic: true, estimatedDuration: 48, requiredRole: 'system' },
      { id: 'id3-livraison', label: 'Livraison', description: 'Remise du permis de conduire', order: 6, requiredStatus: 'fabricated', isAutomatic: false, estimatedDuration: 44, requiredRole: 'transport_agent' },
    ],
    rejectionReasons: [
      'Échec à l\'examen du code de la route',
      'Échec à l\'examen pratique de conduite',
      'Certificat médical d\'aptitude non conforme ou manquant',
      'Le demandeur ne remplit pas les conditions d\'âge pour la catégorie demandée',
      'Suspension ou annulation d\'un permis antérieur',
    ],
    documentValidityPeriod: 3650,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // URBANISME (u)
  // ═══════════════════════════════════════════════════════════════════════════

  'u-1': {
    serviceId: 'u-1',
    serviceName: 'Permis de construire',
    categoryId: 'u',
    categoryName: 'Urbanisme',
    description: 'Autorisation administrative de construire sur un terrain. Obligatoire pour toute construction nouvelle ou modification importante d\'un bâtiment existant.',
    price: '50 000 GNF',
    priceAmount: 50000,
    currency: 'GNF',
    estimatedDelayHours: 360,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'land_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'adresseTerrain',
        label: 'Adresse du terrain',
        type: 'textarea',
        required: true,
        placeholder: 'Adresse complète du terrain à construire',
        validation: { min: 10, max: 300 },
      },
      {
        id: 'superficieTerrain',
        label: 'Superficie du terrain (m²)',
        type: 'number',
        required: true,
        placeholder: 'Ex: 500',
        validation: { min: 1, max: 100000 },
        helperText: 'Superficie en mètres carrés',
      },
      {
        id: 'typeConstruction',
        label: 'Type de construction',
        type: 'select',
        required: true,
        options: [
          { label: 'Villa', value: 'villa' },
          { label: 'Immeuble', value: 'immeuble' },
          { label: 'Commercial', value: 'commercial' },
          { label: 'Industriel', value: 'industriel' },
        ],
      },
      {
        id: 'hauteurConstruction',
        label: 'Hauteur de construction',
        type: 'select',
        required: true,
        options: [
          { label: 'R (Rez-de-chaussée)', value: 'R' },
          { label: 'R+1', value: 'R+1' },
          { label: 'R+2', value: 'R+2' },
          { label: 'R+3 et plus', value: 'R+3+' },
        ],
      },
      {
        id: 'nomArchitecte',
        label: 'Nom de l\'architecte',
        type: 'text',
        required: true,
        placeholder: 'Nom et prénom de l\'architecte en charge du projet',
        validation: { min: 2, max: 100 },
      },
    ],
    workflowSteps: [
      { id: 'u1-soumission', label: 'Soumission', description: 'Soumission de la demande, plans et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'u1-verification-terrain', label: 'Vérification terrain', description: 'Vérification cadastrale du terrain et de la propriété', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 24, requiredRole: 'system' },
      { id: 'u1-conformite-urbanisme', label: 'Conformité urbanisme', description: 'Vérification de la conformité avec le plan d\'urbanisme', order: 3, requiredStatus: 'terrain_verified', isAutomatic: false, estimatedDuration: 72, requiredRole: 'urbanism_engineer' },
      { id: 'u1-instruction-technique', label: 'Instruction technique', description: 'Examen technique des plans par le service d\'urbanisme', order: 4, requiredStatus: 'urbanism_compliant', isAutomatic: false, estimatedDuration: 120, requiredRole: 'urbanism_engineer' },
      { id: 'u1-avis-commission', label: 'Avis de la commission', description: 'Avis de la commission départementale de l\'urbanisme', order: 5, requiredStatus: 'technically_approved', isAutomatic: false, estimatedDuration: 96, requiredRole: 'commission_president' },
      { id: 'u1-signature-maire', label: 'Signature', description: 'Signature du permis par le maire ou son délégué', order: 6, requiredStatus: 'commission_favorable', isAutomatic: false, estimatedDuration: 24, requiredRole: 'mayor' },
      { id: 'u1-livraison', label: 'Livraison', description: 'Remise du permis de construire', order: 7, requiredStatus: 'signed', isAutomatic: false, estimatedDuration: 24, requiredRole: 'urbanism_agent' },
    ],
    rejectionReasons: [
      'Le terrain n\'est pas constructible selon le plan d\'urbanisme en vigueur',
      'Le demandeur n\'est pas le propriétaire légal du terrain',
      'Les plans ne sont pas conformes aux normes de construction en vigueur',
      'Hauteur de construction non autorisée dans cette zone',
      'Absence d\'architecte agréé',
    ],
    documentValidityPeriod: 730,
  },

  'u-2': {
    serviceId: 'u-2',
    serviceName: 'Certificat de conformité',
    categoryId: 'u',
    categoryName: 'Urbanisme',
    description: 'Certificat de conformité attestant qu\'une construction a été réalisée conformément au permis de construire accordé.',
    price: '25 000 GNF',
    priceAmount: 25000,
    currency: 'GNF',
    estimatedDelayHours: 240,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'construction_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'numeroPermisConstruire',
        label: 'Numéro du permis de construire',
        type: 'text',
        required: true,
        placeholder: 'Ex: PC-2023-KLM-0456',
        validation: { min: 3, max: 50 },
      },
      {
        id: 'dateAchevementTravaux',
        label: 'Date d\'achèvement des travaux',
        type: 'date',
        required: true,
        helperText: 'Date à laquelle les travaux de construction ont été achevés',
      },
      {
        id: 'conformiteTravaux',
        label: 'Déclaration de conformité des travaux',
        type: 'checkbox',
        required: true,
        helperText: 'J\'atteste que les travaux ont été réalisés conformément au permis de construire',
      },
    ],
    workflowSteps: [
      { id: 'u2-soumission', label: 'Soumission', description: 'Soumission de la demande', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'u2-verification-permis', label: 'Vérification permis', description: 'Vérification de l\'existence et de la validité du permis de construire', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'u2-visite-terrain', label: 'Visite sur terrain', description: 'Visite de terrain par l\'inspecteur de la construction', order: 3, requiredStatus: 'permit_verified', isAutomatic: false, estimatedDuration: 72, requiredRole: 'construction_inspector' },
      { id: 'u2-rapport-conformite', label: 'Rapport de conformité', description: 'Rédaction et validation du rapport de conformité', order: 4, requiredStatus: 'site_visited', isAutomatic: false, estimatedDuration: 48, requiredRole: 'construction_inspector' },
      { id: 'u2-signature', label: 'Signature', description: 'Signature du certificat par le responsable de l\'urbanisme', order: 5, requiredStatus: 'report_approved', isAutomatic: false, estimatedDuration: 24, requiredRole: 'urbanism_director' },
      { id: 'u2-livraison', label: 'Livraison', description: 'Remise du certificat de conformité', order: 6, requiredStatus: 'signed', isAutomatic: false, estimatedDuration: 92, requiredRole: 'urbanism_agent' },
    ],
    rejectionReasons: [
      'Le permis de construire n\'a pas été trouvé ou est expiré',
      'La construction ne correspond pas aux plans approuvés dans le permis',
      'Modifications non autorisées détectées lors de la visite de terrain',
      'Normes de sécurité non respectées',
    ],
    documentValidityPeriod: 0,
  },

  'u-3': {
    serviceId: 'u-3',
    serviceName: 'Titre foncier',
    categoryId: 'u',
    categoryName: 'Urbanisme',
    description: 'Titre de propriété foncière officiel délivré par les services du cadastre. Document définitif de propriété d\'un terrain.',
    price: '100 000 GNF',
    priceAmount: 100000,
    currency: 'GNF',
    estimatedDelayHours: 720,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'land_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'adresseTerrain',
        label: 'Adresse du terrain',
        type: 'textarea',
        required: true,
        placeholder: 'Adresse complète et localisation du terrain',
        validation: { min: 10, max: 300 },
      },
      {
        id: 'superficie',
        label: 'Superficie (m²)',
        type: 'number',
        required: true,
        placeholder: 'Ex: 1000',
        validation: { min: 1, max: 1000000 },
      },
      {
        id: 'typeTitre',
        label: 'Type de demande',
        type: 'select',
        required: true,
        options: [
          { label: 'Premier titre', value: 'premier_titre' },
          { label: 'Renouvellement', value: 'renouvellement' },
          { label: 'Mutation (transfert de propriété)', value: 'mutation' },
        ],
      },
      {
        id: 'originePropriete',
        label: 'Origine de la propriété',
        type: 'select',
        required: true,
        options: [
          { label: 'Achat', value: 'achat' },
          { label: 'Donation', value: 'donation' },
          { label: 'Héritage', value: 'heritage' },
        ],
      },
    ],
    workflowSteps: [
      { id: 'u3-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'u3-verification-cadastrale', label: 'Vérification cadastrale', description: 'Vérification du cadastre et des droits fonciers existants', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 24, requiredRole: 'system' },
      { id: 'u3-bornage', label: 'Bornage', description: 'Opération de bornage du terrain par un géomètre', order: 3, requiredStatus: 'cadastral_verified', isAutomatic: false, estimatedDuration: 168, requiredRole: 'surveyor' },
      { id: 'u3-enquete-domiciliaire', label: 'Enquête domiciliaire', description: 'Enquête publique pour vérifier l\'absence d\'opposition', order: 4, requiredStatus: 'delimited', isAutomatic: false, estimatedDuration: 240, requiredRole: 'land_agent' },
      { id: 'u3-instruction', label: 'Instruction du dossier', description: 'Instruction complète du dossier par le service foncier', order: 5, requiredStatus: 'enquiry_completed', isAutomatic: false, estimatedDuration: 120, requiredRole: 'land_officer' },
      { id: 'u3-deliberation', label: 'Délibération', description: 'Délibération de la commission des titres fonciers', order: 6, requiredStatus: 'instructed', isAutomatic: false, estimatedDuration: 96, requiredRole: 'commission_president' },
      { id: 'u3-signature-ministre', label: 'Signature ministérielle', description: 'Signature du titre foncier par le ministre compétent', order: 7, requiredStatus: 'commission_favorable', isAutomatic: false, estimatedDuration: 48, requiredRole: 'minister' },
      { id: 'u3-immatriculation', label: 'Immatriculation', description: 'Immatriculation du titre au livre foncier', order: 8, requiredStatus: 'signed', isAutomatic: true, estimatedDuration: 8, requiredRole: 'system' },
      { id: 'u3-livraison', label: 'Livraison', description: 'Remise du titre foncier', order: 9, requiredStatus: 'registered', isAutomatic: false, estimatedDuration: 16, requiredRole: 'land_officer' },
    ],
    rejectionReasons: [
      'Le terrain fait l\'objet d\'un litige foncier en cours',
      'Un titre foncier existe déjà au nom d\'un autre propriétaire',
      'Le bornage révèle une superficie différente de celle déclarée',
      'Opposition légitime formulée durant l\'enquête publique',
      'Documents de propriété insuffisants ou frauduleux',
    ],
    documentValidityPeriod: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTREPRISE (e)
  // ═══════════════════════════════════════════════════════════════════════════

  'e-1': {
    serviceId: 'e-1',
    serviceName: 'Enregistrement entreprise (APIP)',
    categoryId: 'e',
    categoryName: 'Entreprise',
    description: 'Enregistrement d\'une entreprise auprès de l\'Agence de Promotion des Investissements Privés (APIP). Création du numéro d\'identification fiscal et du Registre de Commerce.',
    price: '50 000 GNF',
    priceAmount: 50000,
    currency: 'GNF',
    estimatedDelayHours: 72,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'enterprise_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'typeEntreprise',
        label: 'Type d\'entreprise',
        type: 'select',
        required: true,
        options: [
          { label: 'SARL', value: 'SARL' },
          { label: 'SASU', value: 'SASU' },
          { label: 'SA', value: 'SA' },
          { label: 'SNC', value: 'SNC' },
          { label: 'Auto-entrepreneur', value: 'auto_entrepreneur' },
        ],
      },
      {
        id: 'denominationSociale',
        label: 'Dénomination sociale',
        type: 'text',
        required: true,
        placeholder: 'Nom de l\'entreprise',
        validation: { min: 2, max: 100 },
      },
      {
        id: 'capitalSocial',
        label: 'Capital social (GNF)',
        type: 'number',
        required: true,
        placeholder: 'Ex: 1000000',
        validation: { min: 0, max: 100000000000 },
        helperText: 'Montant du capital social en GNF',
      },
      {
        id: 'secteurActivite',
        label: 'Secteur d\'activité',
        type: 'select',
        required: true,
        options: [
          { label: 'Commerce', value: 'commerce' },
          { label: 'Services', value: 'services' },
          { label: 'Industrie', value: 'industrie' },
          { label: 'Agriculture', value: 'agriculture' },
          { label: 'Technologie', value: 'technologie' },
        ],
      },
      {
        id: 'adresseSiege',
        label: 'Adresse du siège social',
        type: 'textarea',
        required: true,
        placeholder: 'Adresse complète du siège social',
        validation: { min: 10, max: 300 },
      },
    ],
    workflowSteps: [
      { id: 'e1-soumission', label: 'Soumission', description: 'Soumission du dossier d\'enregistrement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'e1-verification-denomination', label: 'Vérification dénomination', description: 'Vérification de la disponibilité de la dénomination sociale', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'e1-instruction-api', label: 'Instruction APIP', description: 'Instruction du dossier par l\'agent APIP', order: 3, requiredStatus: 'name_available', isAutomatic: false, estimatedDuration: 24, requiredRole: 'apip_agent' },
      { id: 'e1-immatriculation-rc', label: 'Immatriculation RC', description: 'Immatriculation au Registre de Commerce', order: 4, requiredStatus: 'instructed', isAutomatic: true, estimatedDuration: 8, requiredRole: 'system' },
      { id: 'e1-attribution-nif', label: 'Attribution NIF', description: 'Attribution du Numéro d\'Identification Fiscale', order: 5, requiredStatus: 'rc_registered', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'e1-livraison', label: 'Livraison', description: 'Remise des documents d\'enregistrement (RCCM, NIF, statuts enregistrés)', order: 6, requiredStatus: 'nif_assigned', isAutomatic: false, estimatedDuration: 34, requiredRole: 'apip_agent' },
    ],
    rejectionReasons: [
      'La dénomination sociale est déjà utilisée par une entreprise existante',
      'Le capital social est inférieur au minimum légal pour le type d\'entreprise choisi',
      'Documents constitutifs incomplets ou non conformes',
      'Le gérant ou dirigeant est frappé d\'une interdiction de gérer',
      'Activité non autorisée sans agrément préalable',
    ],
    documentValidityPeriod: 0,
  },

  'e-2': {
    serviceId: 'e-2',
    serviceName: 'Registre de commerce',
    categoryId: 'e',
    categoryName: 'Entreprise',
    description: 'Inscription ou modification au Registre du Commerce et du Crédit Mobilier (RCCM). Document obligatoire pour toute entreprise commerciale.',
    price: '100 000 GNF',
    priceAmount: 100000,
    currency: 'GNF',
    estimatedDelayHours: 168,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'enterprise_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'numeroAPIP',
        label: 'Numéro APIP',
        type: 'text',
        required: true,
        placeholder: 'Ex: APIP-2024-12345',
        validation: { min: 3, max: 50 },
        helperText: 'Numéro d\'enregistrement APIP de l\'entreprise',
      },
      {
        id: 'typeModification',
        label: 'Type d\'opération',
        type: 'select',
        required: true,
        options: [
          { label: 'Immatriculation', value: 'immatriculation' },
          { label: 'Modification', value: 'modification' },
          { label: 'Radiation', value: 'radiation' },
        ],
      },
    ],
    workflowSteps: [
      { id: 'e2-soumission', label: 'Soumission', description: 'Soumission de la demande', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'e2-verification-apip', label: 'Vérification APIP', description: 'Vérification de l\'existence de l\'entreprise dans le registre APIP', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'e2-instruction', label: 'Instruction', description: 'Instruction du dossier par le greffier du tribunal de commerce', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 72, requiredRole: 'tribunal_clerk' },
      { id: 'e2-immatriculation', label: 'Immatriculation/Mise à jour', description: 'Enregistrement au RCCM', order: 4, requiredStatus: 'instructed', isAutomatic: true, estimatedDuration: 8, requiredRole: 'system' },
      { id: 'e2-livraison', label: 'Livraison', description: 'Remise de l\'extrait RCCM', order: 5, requiredStatus: 'registered', isAutomatic: false, estimatedDuration: 84, requiredRole: 'tribunal_clerk' },
    ],
    rejectionReasons: [
      'L\'entreprise n\'est pas enregistrée à l\'APIP',
      'Documents de modification non conformes ou insuffisants',
      'Solde impayé sur les cotisations ou taxes antérieures',
      'Opposition d\'un créancier ou d\'un associé',
    ],
    documentValidityPeriod: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉDUCATION (ed)
  // ═══════════════════════════════════════════════════════════════════════════

  'ed-1': {
    serviceId: 'ed-1',
    serviceName: 'Attestation de scolarité',
    categoryId: 'ed',
    categoryName: 'Éducation',
    description: 'Attestation officielle de scolarité délivrée par un établissement d\'enseignement. Certifie la fréquentation ou la fréquentation passée d\'un établissement.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 48,
    requiresAccount: true,
    isAutoEligible: true,
    verificationDb: 'education_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'etablissement',
        label: 'Établissement fréquenté',
        type: 'text',
        required: true,
        placeholder: 'Ex: Lycée 2 Octobre, Université de Conakry',
        validation: { min: 2, max: 200 },
      },
      {
        id: 'niveauEtude',
        label: 'Niveau d\'étude',
        type: 'select',
        required: true,
        options: [
          { label: 'Primaire', value: 'primaire' },
          { label: 'Secondaire', value: 'secondaire' },
          { label: 'Supérieur', value: 'superieur' },
        ],
      },
      {
        id: 'anneeScolaire',
        label: 'Année scolaire',
        type: 'text',
        required: true,
        placeholder: 'Ex: 2024-2025',
        validation: { pattern: '^[0-9]{4}-[0-9]{4}$' },
        helperText: 'Format: AAAA-AAAA',
      },
    ],
    workflowSteps: [
      { id: 'ed1-soumission', label: 'Soumission', description: 'Soumission de la demande', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'ed1-verification-scolarite', label: 'Vérification scolarité', description: 'Vérification automatique dans la base de données de l\'établissement', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'ed1-validation-etablissement', label: 'Validation établissement', description: 'Validation par le secrétariat de l\'établissement', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 24, requiredRole: 'school_admin' },
      { id: 'ed1-production', label: 'Production', description: 'Génération de l\'attestation de scolarité', order: 4, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'ed1-livraison', label: 'Livraison', description: 'Remise de l\'attestation', order: 5, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 22, requiredRole: 'school_admin' },
    ],
    rejectionReasons: [
      'Aucune trace de scolarité trouvée dans les registres de l\'établissement',
      'L\'établissement mentionné n\'existe pas ou n\'est pas reconnu',
      'Informations incohérentes entre la demande et le registre scolaire',
    ],
    documentValidityPeriod: 180,
  },

  'ed-2': {
    serviceId: 'ed-2',
    serviceName: 'Diplôme et relevé de notes',
    categoryId: 'ed',
    categoryName: 'Éducation',
    description: 'Délivrance de diplôme, duplicata ou relevé de notes officiel par l\'établissement ou le ministère de l\'enseignement concerné.',
    price: '10 000 GNF',
    priceAmount: 10000,
    currency: 'GNF',
    estimatedDelayHours: 120,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'education_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'typeDiplome',
        label: 'Type de diplôme',
        type: 'select',
        required: true,
        options: [
          { label: 'BAC', value: 'BAC' },
          { label: 'Licence', value: 'Licence' },
          { label: 'Master', value: 'Master' },
          { label: 'Doctorat', value: 'Doctorat' },
          { label: 'BTS', value: 'BTS' },
          { label: 'DUT', value: 'DUT' },
        ],
      },
      {
        id: 'etablissement',
        label: 'Établissement de délivrance',
        type: 'text',
        required: true,
        placeholder: 'Ex: Université Gamal Abdel Nasser de Conakry',
        validation: { min: 2, max: 200 },
      },
      {
        id: 'anneeObtention',
        label: 'Année d\'obtention',
        type: 'text',
        required: true,
        placeholder: 'Ex: 2020',
        validation: { pattern: '^[0-9]{4}$' },
      },
      {
        id: 'numeroMatricule',
        label: 'Numéro de matricule',
        type: 'text',
        required: true,
        placeholder: 'Ex: 2018-UC-0456',
        validation: { min: 2, max: 50 },
      },
      {
        id: 'typeDemandeDiplome',
        label: 'Type de demande',
        type: 'select',
        required: true,
        options: [
          { label: 'Duplicata', value: 'duplicata' },
          { label: 'Copie certifiée conforme', value: 'copie_certifiee' },
          { label: 'Relevé de notes', value: 'releve' },
        ],
      },
    ],
    workflowSteps: [
      { id: 'ed2-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'ed2-verification-diplome', label: 'Vérification diplôme', description: 'Vérification dans la base de données de l\'établissement', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'ed2-validation-etablissement', label: 'Validation établissement', description: 'Validation par le secrétariat de l\'établissement', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 48, requiredRole: 'school_admin' },
      { id: 'ed2-validation-ministere', label: 'Validation ministère', description: 'Validation par le ministère de l\'enseignement supérieur si nécessaire', order: 4, requiredStatus: 'school_approved', isAutomatic: false, estimatedDuration: 48, requiredRole: 'ministry_education_officer' },
      { id: 'ed2-production', label: 'Production', description: 'Production du document demandé', order: 5, requiredStatus: 'ministry_approved', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'ed2-livraison', label: 'Livraison', description: 'Remise du diplôme ou relevé de notes', order: 6, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 16, requiredRole: 'school_admin' },
    ],
    rejectionReasons: [
      'Aucun diplôme trouvé pour le matricule et l\'année indiqués',
      'Le matricule ne correspond pas au nom du demandeur',
      'Diplôme non encore délivré (résultats non publiés)',
      'L\'établissement n\'est pas reconnu par le ministère',
    ],
    documentValidityPeriod: 0,
  },

  'ed-3': {
    serviceId: 'ed-3',
    serviceName: 'Équivalence de diplôme',
    categoryId: 'ed',
    categoryName: 'Éducation',
    description: 'Procédure de reconnaissance et d\'équivalence d\'un diplôme étranger avec le système éducatif guinéen. Délivrée par le ministère de l\'Enseignement Supérieur.',
    price: '50 000 GNF',
    priceAmount: 50000,
    currency: 'GNF',
    estimatedDelayHours: 360,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'education_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'paysOrigineDiplome',
        label: 'Pays d\'origine du diplôme',
        type: 'text',
        required: true,
        placeholder: 'Ex: Sénégal, France, Maroc',
        validation: { min: 2, max: 50 },
      },
      {
        id: 'etablissementOrigine',
        label: 'Établissement d\'origine',
        type: 'text',
        required: true,
        placeholder: 'Nom de l\'établissement ayant délivré le diplôme',
        validation: { min: 2, max: 200 },
      },
      {
        id: 'typeDiplomeEtranger',
        label: 'Type de diplôme étranger',
        type: 'text',
        required: true,
        placeholder: 'Ex: Master 2, Licence 3, PhD',
        validation: { min: 2, max: 100 },
      },
      {
        id: 'anneeObtentionDiplome',
        label: 'Année d\'obtention du diplôme',
        type: 'text',
        required: true,
        placeholder: 'Ex: 2019',
        validation: { pattern: '^[0-9]{4}$' },
      },
      {
        id: 'specialite',
        label: 'Spécialité / Domaine',
        type: 'text',
        required: true,
        placeholder: 'Ex: Informatique, Droit, Médecine',
        validation: { min: 2, max: 100 },
      },
    ],
    workflowSteps: [
      { id: 'ed3-soumission', label: 'Soumission', description: 'Soumission de la demande, traduction des diplômes et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'ed3-verification-traduction', label: 'Vérification traduction', description: 'Vérification de la traduction assermentée des documents', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'ed3-verification-etablissement', label: 'Vérification établissement', description: 'Vérification de la reconnaissance de l\'établissement étranger', order: 3, requiredStatus: 'translation_verified', isAutomatic: false, estimatedDuration: 72, requiredRole: 'ministry_education_officer' },
      { id: 'ed3-evaluation-commission', label: 'Évaluation commission', description: 'Évaluation par la commission nationale d\'équivalence', order: 4, requiredStatus: 'institution_verified', isAutomatic: false, estimatedDuration: 168, requiredRole: 'equivalence_commission' },
      { id: 'ed3-decision', label: 'Décision', description: 'Décision d\'équivalence par le ministre de l\'enseignement supérieur', order: 5, requiredStatus: 'commission_reviewed', isAutomatic: false, estimatedDuration: 72, requiredRole: 'minister' },
      { id: 'ed3-production', label: 'Production', description: 'Établissement de l\'arrêté d\'équivalence', order: 6, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'ed3-livraison', label: 'Livraison', description: 'Remise de l\'arrêté d\'équivalence', order: 7, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 40, requiredRole: 'ministry_education_officer' },
    ],
    rejectionReasons: [
      'L\'établissement étranger n\'est pas reconnu par les autorités du pays d\'origine',
      'Le diplôme ne correspond à aucun niveau du système éducatif guinéen',
      'Documents falsifiés ou non authentifiés par les autorités consulaires',
      'Traduction non assermentée ou non conforme',
      'Le domaine de spécialité n\'est pas couvert par le système éducatif guinéen',
    ],
    documentValidityPeriod: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SANTÉ (s)
  // ═══════════════════════════════════════════════════════════════════════════

  's-1': {
    serviceId: 's-1',
    serviceName: 'Certificat de vaccination',
    categoryId: 's',
    categoryName: 'Santé',
    description: 'Certificat international de vaccination ou carnet de vaccination à jour. Nécessaire pour les voyages internationaux et certaines démarches administratives.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 24,
    requiresAccount: true,
    isAutoEligible: true,
    verificationDb: 'vaccination_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'typeVaccination',
        label: 'Type de demande',
        type: 'select',
        required: true,
        options: [
          { label: 'Certificat international (fièvre jaune)', value: 'international' },
          { label: 'Mise à jour du carnet', value: 'mise_a_jour' },
          { label: 'Duplicata', value: 'duplicata' },
        ],
      },
      {
        id: 'vaccins',
        label: 'Vaccins à inclure',
        type: 'checkbox',
        required: false,
        options: [
          { label: 'COVID-19', value: 'covid19' },
          { label: 'Fièvre Jaune', value: 'fievre_jaune' },
          { label: 'Hépatite B', value: 'hepatite_b' },
          { label: 'BCG', value: 'bcg' },
          { label: 'Rougeole', value: 'rougeole' },
          { label: 'Autre', value: 'autre' },
        ],
        helperText: 'Cochez les vaccins pour lesquels vous avez été vacciné(e)',
      },
    ],
    workflowSteps: [
      { id: 's1-soumission', label: 'Soumission', description: 'Soumission de la demande', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 's1-verification-vaccination', label: 'Vérification vaccination', description: 'Consultation automatique du registre des vaccinations', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 's1-validation-medecin', label: 'Validation médecin', description: 'Validation par un médecin du centre de vaccination', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 8, requiredRole: 'health_officer' },
      { id: 's1-production', label: 'Production', description: 'Établissement du certificat de vaccination', order: 4, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 's1-livraison', label: 'Livraison', description: 'Remise du certificat ou carnet de vaccination', order: 5, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 14, requiredRole: 'health_officer' },
    ],
    rejectionReasons: [
      'Aucune trace de vaccination trouvée dans le registre national',
      'Les vaccins demandés n\'ont pas été administrés selon le registre',
      'Vaccination expirée nécessitant une nouvelle injection',
    ],
    documentValidityPeriod: 90,
  },

  's-2': {
    serviceId: 's-2',
    serviceName: 'Carte sanitaire',
    categoryId: 's',
    categoryName: 'Santé',
    description: 'Carte sanitaire individuelle permettant l\'accès aux structures de santé publique et le suivi médical du titulaire.',
    price: '2 000 GNF',
    priceAmount: 2000,
    currency: 'GNF',
    estimatedDelayHours: 120,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: '',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'regimeAssurance',
        label: 'Régime d\'assurance',
        type: 'select',
        required: true,
        options: [
          { label: 'CNSS', value: 'cnss' },
          { label: 'Fonction publique', value: 'fonction_publique' },
          { label: 'Privé', value: 'prive' },
        ],
      },
      {
        id: 'employeur',
        label: 'Employeur',
        type: 'text',
        required: false,
        placeholder: 'Nom de l\'employeur',
        validation: { min: 2, max: 100 },
        helperText: 'Requis si vous êtes salarié(e)',
      },
    ],
    workflowSteps: [
      { id: 's2-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 's2-verification-identite', label: 'Vérification identité', description: 'Vérification de l\'identité du demandeur', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 's2-verification-assurance', label: 'Vérification assurance', description: 'Vérification du régime d\'assurance', order: 3, requiredStatus: 'identity_verified', isAutomatic: false, estimatedDuration: 48, requiredRole: 'health_officer' },
      { id: 's2-fabrication', label: 'Fabrication carte', description: 'Fabrication de la carte sanitaire', order: 4, requiredStatus: 'insurance_verified', isAutomatic: true, estimatedDuration: 24, requiredRole: 'system' },
      { id: 's2-livraison', label: 'Livraison', description: 'Remise de la carte sanitaire', order: 5, requiredStatus: 'fabricated', isAutomatic: false, estimatedDuration: 46, requiredRole: 'health_officer' },
    ],
    rejectionReasons: [
      'Le régime d\'assurance déclaré n\'est pas vérifiable',
      'L\'employeur mentionné n\'existe pas ou ne cotise pas',
      'Une carte sanitaire active existe déjà pour ce NIN',
      'Documents justificatifs insuffisants',
    ],
    documentValidityPeriod: 365,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RÉSIDENCE (r)
  // ═══════════════════════════════════════════════════════════════════════════

  'r-1': {
    serviceId: 'r-1',
    serviceName: 'Certificat de résidence',
    categoryId: 'r',
    categoryName: 'Résidence',
    description: 'Certificat de résidence délivré par la mairie attestant de la domiciliation du demandeur dans la commune. Document souvent requis pour les démarches administratives.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 24,
    requiresAccount: true,
    isAutoEligible: true,
    verificationDb: '',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'adresseComplete',
        label: 'Adresse complète de résidence',
        type: 'textarea',
        required: true,
        placeholder: 'Quartier, rue, numéro, commune...',
        validation: { min: 10, max: 300 },
      },
      {
        id: 'dureeResidence',
        label: 'Durée de résidence',
        type: 'select',
        required: true,
        options: [
          { label: 'Moins de 1 an', value: 'moins_1_an' },
          { label: '1 à 3 ans', value: '1_3_ans' },
          { label: '3 à 5 ans', value: '3_5_ans' },
          { label: 'Plus de 5 ans', value: 'plus_5_ans' },
        ],
      },
      {
        id: 'typeLogement',
        label: 'Type de logement',
        type: 'select',
        required: true,
        options: [
          { label: 'Propriétaire', value: 'proprietaire' },
          { label: 'Locataire', value: 'locataire' },
          { label: 'Hébergé', value: 'heberge' },
        ],
      },
    ],
    workflowSteps: [
      { id: 'r1-soumission', label: 'Soumission', description: 'Soumission de la demande', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'r1-verification-adresse', label: 'Vérification adresse', description: 'Vérification de l\'adresse dans les bases de données', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'r1-validation-mairie', label: 'Validation mairie', description: 'Validation par le chef de quartier ou l\'agent de la mairie', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 8, requiredRole: 'mairie_agent' },
      { id: 'r1-production', label: 'Production', description: 'Génération du certificat de résidence', order: 4, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'r1-livraison', label: 'Livraison', description: 'Remise du certificat', order: 5, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 14, requiredRole: 'mairie_agent' },
    ],
    rejectionReasons: [
      'Adresse non vérifiable ou inexistante',
      'Le demandeur ne réside pas à l\'adresse indiquée',
      'Pièces justificatives de domicile insuffisantes',
    ],
    documentValidityPeriod: 90,
  },

  'r-2': {
    serviceId: 'r-2',
    serviceName: 'Attestation de domicile',
    categoryId: 'r',
    categoryName: 'Résidence',
    description: 'Attestation de domicile délivrée sur présentation de justificatifs. Document complémentaire au certificat de résidence.',
    price: '1 000 GNF',
    priceAmount: 1000,
    currency: 'GNF',
    estimatedDelayHours: 24,
    requiresAccount: true,
    isAutoEligible: true,
    verificationDb: '',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'adresseComplete',
        label: 'Adresse complète',
        type: 'textarea',
        required: true,
        placeholder: 'Adresse complète de domicile',
        validation: { min: 10, max: 300 },
      },
      {
        id: 'typeJustificatif',
        label: 'Type de justificatif',
        type: 'select',
        required: true,
        options: [
          { label: 'Facture d\'électricité', value: 'facture_electricite' },
          { label: 'Facture d\'eau', value: 'facture_eau' },
          { label: 'Quittance de loyer', value: 'quittance_loyer' },
          { label: 'Titre de propriété', value: 'titre_propriete' },
        ],
        helperText: 'Sélectionnez le type de justificatif que vous fournissez',
      },
    ],
    workflowSteps: [
      { id: 'r2-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'r2-verification-justificatif', label: 'Vérification justificatif', description: 'Vérification du justificatif de domicile présenté', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'r2-validation', label: 'Validation', description: 'Validation par l\'agent administratif', order: 3, requiredStatus: 'verified', isAutomatic: false, estimatedDuration: 8, requiredRole: 'mairie_agent' },
      { id: 'r2-production', label: 'Production', description: 'Génération de l\'attestation de domicile', order: 4, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'r2-livraison', label: 'Livraison', description: 'Remise de l\'attestation', order: 5, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 14, requiredRole: 'mairie_agent' },
    ],
    rejectionReasons: [
      'Le justificatif de domicile est expiré (plus de 3 mois)',
      'Le justificatif ne correspond pas à l\'adresse déclarée',
      'Le justificatif est au nom d\'un tiers sans attestation d\'hébergement',
    ],
    documentValidityPeriod: 90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FISCALITÉ (fi)
  // ═══════════════════════════════════════════════════════════════════════════

  'fi-1': {
    serviceId: 'fi-1',
    serviceName: 'Certificat de situation fiscale',
    categoryId: 'fi',
    categoryName: 'Fiscalité',
    description: 'Certificat attestant de la situation fiscale du contribuable — à jour ou non de ses obligations fiscales. Souvent requis pour les marchés publics.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 48,
    requiresAccount: true,
    isAutoEligible: true,
    verificationDb: 'tax_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'numeroNIF',
        label: 'Numéro d\'Identification Fiscale (NIF)',
        type: 'text',
        required: true,
        placeholder: 'Ex: NIF-2024-123456',
        validation: { min: 3, max: 50 },
        helperText: 'Numéro NIF du contribuable',
      },
      {
        id: 'anneeFiscale',
        label: 'Année fiscale',
        type: 'text',
        required: true,
        placeholder: 'Ex: 2024',
        validation: { pattern: '^[0-9]{4}$' },
        helperText: 'Année pour laquelle vous souhaitez le certificat',
      },
      {
        id: 'typeContribuable',
        label: 'Type de contribuable',
        type: 'select',
        required: true,
        options: [
          { label: 'Particulier', value: 'particulier' },
          { label: 'Entreprise', value: 'entreprise' },
        ],
      },
    ],
    workflowSteps: [
      { id: 'fi1-soumission', label: 'Soumission', description: 'Soumission de la demande', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'fi1-verification-nif', label: 'Vérification NIF', description: 'Vérification du numéro d\'identification fiscale', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'fi1-consultation-dossier', label: 'Consultation dossier fiscal', description: 'Consultation automatique du dossier fiscal', order: 3, requiredStatus: 'nif_verified', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'fi1-validation-inspecteur', label: 'Validation inspecteur', description: 'Validation par l\'inspecteur des impôts', order: 4, requiredStatus: 'records_checked', isAutomatic: false, estimatedDuration: 24, requiredRole: 'tax_inspector' },
      { id: 'fi1-production', label: 'Production', description: 'Génération du certificat de situation fiscale', order: 5, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'fi1-livraison', label: 'Livraison', description: 'Remise du certificat', order: 6, requiredStatus: 'produced', isAutomatic: false, estimatedDuration: 20, requiredRole: 'tax_inspector' },
    ],
    rejectionReasons: [
      'Numéro NIF non trouvé dans la base de données fiscale',
      'Le contribuable n\'est pas à jour de ses obligations fiscales',
      'Déclarations fiscales manquantes pour l\'année demandée',
      'Redressement fiscal en cours',
    ],
    documentValidityPeriod: 90,
  },

  'fi-2': {
    serviceId: 'fi-2',
    serviceName: 'Déclaration d\'impôts',
    categoryId: 'fi',
    categoryName: 'Fiscalité',
    description: 'Déclaration en ligne des revenus et de l\'impôt sur le revenu. Obligation annuelle pour tous les contribuables guinéens.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 120,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'tax_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'numeroNIF',
        label: 'Numéro d\'Identification Fiscale (NIF)',
        type: 'text',
        required: true,
        placeholder: 'Ex: NIF-2024-123456',
        validation: { min: 3, max: 50 },
      },
      {
        id: 'anneeDeclaration',
        label: 'Année de déclaration',
        type: 'text',
        required: true,
        placeholder: 'Ex: 2024',
        validation: { pattern: '^[0-9]{4}$' },
        helperText: 'Année fiscale concernée par la déclaration',
      },
      {
        id: 'typeRevenus',
        label: 'Type de revenus',
        type: 'select',
        required: true,
        options: [
          { label: 'Salaires', value: 'salaires' },
          { label: 'Entreprise', value: 'entreprise' },
          { label: 'Foncier', value: 'foncier' },
          { label: 'Autres', value: 'autres' },
        ],
      },
      {
        id: 'revenuBrut',
        label: 'Revenu brut annuel (GNF)',
        type: 'number',
        required: true,
        placeholder: 'Ex: 50000000',
        validation: { min: 0, max: 1000000000000 },
        helperText: 'Montant total des revenus bruts annuels en GNF',
      },
    ],
    workflowSteps: [
      { id: 'fi2-soumission', label: 'Soumission', description: 'Soumission de la déclaration', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'fi2-verification-nif', label: 'Vérification NIF', description: 'Vérification du numéro d\'identification fiscale', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'fi2-calcul-impot', label: 'Calcul impôt', description: 'Calcul automatique de l\'impôt sur la base des revenus déclarés', order: 3, requiredStatus: 'nif_verified', isAutomatic: true, estimatedDuration: 1, requiredRole: 'system' },
      { id: 'fi2-verification-coherence', label: 'Vérification cohérence', description: 'Vérification de la cohérence de la déclaration par l\'inspecteur', order: 4, requiredStatus: 'calculated', isAutomatic: false, estimatedDuration: 72, requiredRole: 'tax_inspector' },
      { id: 'fi2-validation', label: 'Validation', description: 'Validation de la déclaration et émission de l\'avis d\'imposition', order: 5, requiredStatus: 'coherent', isAutomatic: false, estimatedDuration: 24, requiredRole: 'tax_inspector' },
      { id: 'fi2-notification', label: 'Notification', description: 'Notification au contribuable de l\'avis d\'imposition', order: 6, requiredStatus: 'validated', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
    ],
    rejectionReasons: [
      'Numéro NIF invalide ou non trouvé',
      'Revenus déclarés manifestement sous-évalués par rapport aux données connues',
      'Déclaration déjà soumise pour la même année fiscale',
      'Pièces justificatives des revenus manquantes',
      'Incohérences détectées entre les déclarations antérieures et la déclaration actuelle',
    ],
    documentValidityPeriod: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCIAL (so)
  // ═══════════════════════════════════════════════════════════════════════════

  'so-1': {
    serviceId: 'so-1',
    serviceName: 'Carte d\'assurance maladie',
    categoryId: 'so',
    categoryName: 'Social',
    description: 'Carte d\'assurance maladie permettant la prise en charge des frais médicaux. Délivrée par la CNSS ou l\'organisme d\'assurance compétent.',
    price: '2 000 GNF',
    priceAmount: 2000,
    currency: 'GNF',
    estimatedDelayHours: 168,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'social_security_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'regimeAssuranceMaladie',
        label: 'Régime d\'assurance maladie',
        type: 'select',
        required: true,
        options: [
          { label: 'CNSS', value: 'cnss' },
          { label: 'Fonction publique', value: 'fonction_publique' },
          { label: 'Mutuelle privée', value: 'mutuelle_privee' },
        ],
      },
      {
        id: 'employeur',
        label: 'Employeur',
        type: 'text',
        required: true,
        placeholder: 'Nom de l\'employeur ou de l\'organisme',
        validation: { min: 2, max: 100 },
      },
      {
        id: 'numeroSecuriteSociale',
        label: 'Numéro de sécurité sociale',
        type: 'text',
        required: true,
        placeholder: 'Ex: CNSS-123456',
        validation: { min: 3, max: 50 },
      },
    ],
    workflowSteps: [
      { id: 'so1-soumission', label: 'Soumission', description: 'Soumission de la demande et paiement', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'so1-verification-cotisations', label: 'Vérification cotisations', description: 'Vérification des cotisations de sécurité sociale', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
      { id: 'so1-validation-cnss', label: 'Validation CNSS', description: 'Validation par l\'agent de la CNSS ou de l\'organisme d\'assurance', order: 3, requiredStatus: 'contributions_verified', isAutomatic: false, estimatedDuration: 72, requiredRole: 'social_security_agent' },
      { id: 'so1-fabrication', label: 'Fabrication carte', description: 'Fabrication de la carte d\'assurance maladie', order: 4, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 48, requiredRole: 'system' },
      { id: 'so1-activation', label: 'Activation', description: 'Activation de la carte dans le système', order: 5, requiredStatus: 'fabricated', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'so1-livraison', label: 'Livraison', description: 'Remise de la carte d\'assurance maladie', order: 6, requiredStatus: 'activated', isAutomatic: false, estimatedDuration: 42, requiredRole: 'social_security_agent' },
    ],
    rejectionReasons: [
      'Le numéro de sécurité sociale n\'existe pas dans la base',
      'Cotisations de sécurité sociale insuffisantes ou non à jour',
      'L\'employeur n\'est pas affilié à la CNSS',
      'Une carte d\'assurance maladie active existe déjà pour ce bénéficiaire',
    ],
    documentValidityPeriod: 365,
  },

  'so-2': {
    serviceId: 'so-2',
    serviceName: 'Allocations familiales',
    categoryId: 'so',
    categoryName: 'Social',
    description: 'Demande d\'allocations familiales pour la prise en charge des enfants à charge. Prestation sociale versée par la CNSS.',
    price: 'Gratuit',
    priceAmount: 0,
    currency: 'GNF',
    estimatedDelayHours: 240,
    requiresAccount: true,
    isAutoEligible: false,
    verificationDb: 'social_security_records',
    formFields: [
      ...COMMON_FIELDS,
      {
        id: 'numeroSecuriteSociale',
        label: 'Numéro de sécurité sociale',
        type: 'text',
        required: true,
        placeholder: 'Ex: CNSS-123456',
        validation: { min: 3, max: 50 },
      },
      {
        id: 'nombreEnfants',
        label: 'Nombre d\'enfants à charge',
        type: 'number',
        required: true,
        placeholder: 'Ex: 3',
        validation: { min: 1, max: 20 },
        helperText: 'Nombre d\'enfants de moins de 16 ans (ou 21 ans si étudiants)',
      },
      {
        id: 'employeur',
        label: 'Employeur',
        type: 'text',
        required: true,
        placeholder: 'Nom de l\'employeur',
        validation: { min: 2, max: 100 },
      },
      {
        id: 'situationFamiliale',
        label: 'Situation familiale',
        type: 'select',
        required: true,
        options: [
          { label: 'Marié(e)', value: 'marie' },
          { label: 'Célibataire', value: 'celibataire' },
          { label: 'Divorcé(e)', value: 'divorce' },
          { label: 'Veuf/Veuve', value: 'veuf' },
        ],
      },
    ],
    workflowSteps: [
      { id: 'so2-soumission', label: 'Soumission', description: 'Soumission de la demande d\'allocations familiales', order: 1, requiredStatus: 'submitted', isAutomatic: true, estimatedDuration: 0, requiredRole: 'citizen' },
      { id: 'so2-verification-cotisations', label: 'Vérification cotisations', description: 'Vérification des cotisations de l\'employeur à la CNSS', order: 2, requiredStatus: 'pending_verification', isAutomatic: true, estimatedDuration: 4, requiredRole: 'system' },
      { id: 'so2-verification-enfants', label: 'Vérification enfants', description: 'Vérification des actes de naissance des enfants à charge', order: 3, requiredStatus: 'contributions_verified', isAutomatic: true, estimatedDuration: 8, requiredRole: 'system' },
      { id: 'so2-instruction', label: 'Instruction', description: 'Instruction du dossier par l\'agent de la CNSS', order: 4, requiredStatus: 'children_verified', isAutomatic: false, estimatedDuration: 72, requiredRole: 'social_security_agent' },
      { id: 'so2-validation', label: 'Validation', description: 'Validation et calcul du montant des allocations', order: 5, requiredStatus: 'instructed', isAutomatic: false, estimatedDuration: 48, requiredRole: 'social_security_director' },
      { id: 'so2-mise-en-paiement', label: 'Mise en paiement', description: 'Mise en paiement des allocations familiales', order: 6, requiredStatus: 'approved', isAutomatic: true, estimatedDuration: 24, requiredRole: 'system' },
      { id: 'so2-notification', label: 'Notification', description: 'Notification au bénéficiaire du montant et des modalités de versement', order: 7, requiredStatus: 'payment_set', isAutomatic: true, estimatedDuration: 2, requiredRole: 'system' },
    ],
    rejectionReasons: [
      'Les cotisations de l\'employeur ne sont pas à jour à la CNSS',
      'Les actes de naissance des enfants n\'ont pas pu être vérifiés',
      'Les enfants déclarés dépassent l\'âge limite (16 ans ou 21 ans si étudiants)',
      'Le demandeur ne remplit pas les conditions d\'éligibilité aux allocations',
      'Doublon détecté — allocations déjà versées pour les mêmes enfants',
    ],
    documentValidityPeriod: 180,
  },

}

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get the full configuration for a service by its ID
 */
export function getServiceConfig(serviceId: string): ServiceConfig | undefined {
  return SERVICES_CONFIG[serviceId]
}

/**
 * Get all services belonging to a specific category
 */
export function getServicesByCategory(categoryId: string): ServiceConfig[] {
  return Object.values(SERVICES_CONFIG).filter(
    (service) => service.categoryId === categoryId
  )
}

/**
 * Get all services that are auto-eligible (can be processed by AI)
 */
export function getAutoEligibleServices(): ServiceConfig[] {
  return Object.values(SERVICES_CONFIG).filter(
    (service) => service.isAutoEligible
  )
}

/**
 * Get the form fields configuration for a specific service
 */
export function getFormFieldsForService(serviceId: string): ServiceFormField[] {
  const config = SERVICES_CONFIG[serviceId]
  return config?.formFields ?? []
}
