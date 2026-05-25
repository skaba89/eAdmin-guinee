// ═══════════════════════════════════════════════════════════════════════════════
// eAdmin Guinée — Demo & Test Accounts
// 6 main role accounts + 140 citizen test accounts (5 per service × 28 services)
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = 'citoyen' | 'mairie' | 'agence' | 'agent' | 'chef_service' | 'directeur' | 'ministre' | 'admin' | 'ministere' | 'superadmin'

export interface DemoAccount {
  email: string
  password: string
  name: string
  firstName: string
  role: UserRole
  institution: string
  fonction: string
  avatar?: string
  nin?: string
  phone?: string
  address?: string
  serviceId?: string  // For citizen accounts, which service they're testing
  scenario?: string   // Test scenario description
}

// ─── 8 MAIN ROLE ACCOUNTS ──────────────────────────────────────────────────────
export const MAIN_ACCOUNTS: DemoAccount[] = [
  {
    email: 'citoyen@eadmin.gn',
    password: 'Eadmin2026!',
    name: 'Condé',
    firstName: 'Sékou',
    role: 'citoyen',
    institution: 'Portail Citoyen',
    fonction: 'Citoyen',
    nin: 'NIN-2019-458723',
    phone: '+224 622 34 56 78',
    address: 'Conakry, Commune de Kaloum',
  },
  {
    email: 'mairie@eadmin.gn',
    password: 'Eadmin2026!',
    name: 'Bah',
    firstName: 'Fatoumata',
    role: 'mairie',
    institution: 'Mairie de Kaloum',
    fonction: 'Secrétaire Général — Mairie',
  },
  {
    email: 'admin@eadmin.gn',
    password: 'Eadmin2026!',
    name: 'Diallo',
    firstName: 'Alpha',
    role: 'admin',
    institution: 'Direction Générale de la Modernisation Administrative',
    fonction: 'Administrateur Système',
  },
  {
    email: 'agence@eadmin.gn',
    password: 'Eadmin2026!',
    name: 'Soumah',
    firstName: 'Mamadou',
    role: 'agence',
    institution: 'Agence Nationale d\'Identification (ANIP)',
    fonction: 'Agent ANIP — Traitement des demandes',
  },
  {
    email: 'ministere@eadmin.gn',
    password: 'Eadmin2026!',
    name: 'Sylla',
    firstName: 'Aissatou',
    role: 'ministere',
    institution: "Ministère de l'Administration Territoriale et de la Décentralisation",
    fonction: 'Directrice de la Modernisation Administrative',
  },
  {
    email: 'superadmin@eadmin.gn',
    password: 'Eadmin2026!',
    name: 'Touré',
    firstName: 'Ibrahima',
    role: 'superadmin',
    institution: 'Présidence de la République — Service e-Gouvernement',
    fonction: 'Super Administrateur Plateforme',
  },
  {
    email: 'agent@eadmin.gn',
    password: 'Eadmin2026!',
    name: 'Camara',
    firstName: 'Ibrahim',
    role: 'agent',
    institution: 'Mairie de Kaloum',
    fonction: 'Agent de Traitement — État Civil',
  },
  {
    email: 'directeur@eadmin.gn',
    password: 'Eadmin2026!',
    name: 'Sylla',
    firstName: 'Mamadou',
    role: 'directeur',
    institution: 'Direction Générale de la Modernisation Administrative',
    fonction: "Directeur des Systèmes d'Information",
  },
]

// ─── 140 CITIZEN TEST ACCOUNTS — 5 per service × 28 services ───────────────────
// Each account has a different scenario to test various use cases
export const TEST_CITIZEN_ACCOUNTS: DemoAccount[] = [
  // ═══ ÉTAT CIVIL ══════════════════════════════════════════════════════════════
  // ec-1: Extrait d'acte de naissance
  { email: 'naiss1@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2024-111222', phone: '+224 622 34 56 78', address: 'Conakry, Commune de Kaloum', serviceId: 'ec-1', scenario: 'Première demande — dossier complet, livraison guichet' },
  { email: 'naiss2@test.gn', password: 'test2026', name: 'Camara', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-567890', phone: '+224 655 12 34 56', address: 'Kindia, Préfecture de Kindia', serviceId: 'ec-1', scenario: 'Demande urgente — livraison en ligne' },
  { email: 'naiss3@test.gn', password: 'test2026', name: 'Sow', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-123456', phone: '+224 628 45 67 89', address: 'Kankan, Préfecture de Kankan', serviceId: 'ec-1', scenario: 'Pièces manquantes — demande complémentaire requise' },
  { email: 'naiss4@test.gn', password: 'test2026', name: 'Keita', firstName: 'Lamine', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-234567', phone: '+224 677 89 01 23', address: 'Labé, Préfecture de Labé', serviceId: 'ec-1', scenario: 'Demande rejetée — documents non conformes' },
  { email: 'naiss5@test.gn', password: 'test2026', name: 'Doumbouya', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2021-345678', phone: '+224 620 56 78 90', address: "N'Zérékoré, Préfecture de N'Zérékoré", serviceId: 'ec-1', scenario: 'Demande aboutie — document livré avec succès' },

  // ec-2: Extrait d'acte de mariage
  { email: 'mariage1@test.gn', password: 'test2026', name: 'Touré', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2015-567890', phone: '+224 621 98 76 54', address: 'Conakry, Commune de Dixinn', serviceId: 'ec-2', scenario: 'Demande acte mariage — dossier complet' },
  { email: 'mariage2@test.gn', password: 'test2026', name: 'Condé', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-678901', phone: '+224 666 78 90 12', address: 'Conakry, Commune de Matam', serviceId: 'ec-2', scenario: 'Livraison par courrier' },
  { email: 'mariage3@test.gn', password: 'test2026', name: 'Bah', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2014-789012', phone: '+224 664 32 10 98', address: 'Mamou, Préfecture de Mamou', serviceId: 'ec-2', scenario: 'Numéro d\'acte manquant — pièces complémentaires' },
  { email: 'mariage4@test.gn', password: 'test2026', name: 'Sy Savané', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2022-890123', phone: '+224 633 44 55 66', address: 'Boké, Préfecture de Boké', serviceId: 'ec-2', scenario: 'Demande en cours de traitement' },
  { email: 'mariage5@test.gn', password: 'test2026', name: 'Doubé', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2013-901234', phone: '+224 644 55 66 77', address: 'Faranah, Préfecture de Faranah', serviceId: 'ec-2', scenario: 'Document prêt pour retrait' },

  // ec-3: Extrait d'acte de décès
  { email: 'deces1@test.gn', password: 'test2026', name: 'Camara', firstName: 'Aïssatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2010-112233', phone: '+224 655 22 33 44', address: 'Conakry, Commune de Ratoma', serviceId: 'ec-3', scenario: 'Déclaration décès parent — dossier complet' },
  { email: 'deces2@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Abdoulaye', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2011-223344', phone: '+224 622 33 44 55', address: 'Kankan, Préfecture de Kankan', serviceId: 'ec-3', scenario: 'Demande en ligne — acte numérique' },
  { email: 'deces3@test.gn', password: 'test2026', name: 'Sow', firstName: 'Ibrahima', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2012-334455', phone: '+224 628 55 66 77', address: 'Kindia, Préfecture de Kindia', serviceId: 'ec-3', scenario: 'Acte original introuvable — recherche en mairie' },
  { email: 'deces4@test.gn', password: 'test2026', name: 'Keita', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2009-445566', phone: '+224 677 66 77 88', address: 'Labé, Préfecture de Labé', serviceId: 'ec-3', scenario: 'Demande rejetée — pas de lien familial prouvé' },
  { email: 'deces5@test.gn', password: 'test2026', name: 'Touré', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2008-556677', phone: '+224 621 77 88 99', address: 'Conakry, Commune de Matoto', serviceId: 'ec-3', scenario: 'Document livré avec succès' },

  // ec-4: Certificat de nationalité
  { email: 'nat1@test.gn', password: 'test2026', name: 'Sow', firstName: 'Abdoulaye', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2015-567890', phone: '+224 621 98 76 54', address: 'Kankan, Préfecture de Kankan', serviceId: 'ec-4', scenario: 'Certificat nationalité — inscription électorale' },
  { email: 'nat2@test.gn', password: 'test2026', name: 'Bah', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-678901', phone: '+224 664 88 99 00', address: 'Conakry, Commune de Kaloum', serviceId: 'ec-4', scenario: 'Certificat résidence manquant — pièces complémentaires' },
  { email: 'nat3@test.gn', password: 'test2026', name: 'Condé', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-789012', phone: '+224 666 11 22 33', address: 'Mamou, Préfecture de Mamou', serviceId: 'ec-4', scenario: 'Demande validée — en attente production' },
  { email: 'nat4@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Lamine', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-890123', phone: '+224 622 44 55 66', address: 'Boké, Préfecture de Boké', serviceId: 'ec-4', scenario: 'Rejet — photos non conformes' },
  { email: 'nat5@test.gn', password: 'test2026', name: 'Camara', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-901234', phone: '+224 655 77 88 99', address: 'Conakry, Commune de Dixinn', serviceId: 'ec-4', scenario: 'Certificat livré — retrait guichet mairie' },

  // ec-5: Déclaration de naissance
  { email: 'declnaiss1@test.gn', password: 'test2026', name: 'Touré', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-123789', phone: '+224 621 11 22 33', address: 'Conakry, Commune de Matam', serviceId: 'ec-5', scenario: 'Déclaration naissance enfant — certificat médical fourni' },
  { email: 'declnaiss2@test.gn', password: 'test2026', name: 'Sy Savané', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-234890', phone: '+224 633 22 33 44', address: 'Kankan, Préfecture de Kankan', serviceId: 'ec-5', scenario: 'Déclaration tardive — plus de 30 jours' },
  { email: 'declnaiss3@test.gn', password: 'test2026', name: 'Doubé', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-345901', phone: '+224 620 33 44 55', address: 'Labé, Préfecture de Labé', serviceId: 'ec-5', scenario: 'Certificat médical manquant — pièces complémentaires' },
  { email: 'declnaiss4@test.gn', password: 'test2026', name: 'Keita', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2021-456012', phone: '+224 677 44 55 66', address: 'Kindia, Préfecture de Kindia', serviceId: 'ec-5', scenario: 'En cours de traitement par la mairie' },
  { email: 'declnaiss5@test.gn', password: 'test2026', name: 'Bah', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2022-567123', phone: '+224 664 55 66 77', address: 'Conakry, Commune de Ratoma', serviceId: 'ec-5', scenario: 'Déclaration enregistrée — acte disponible' },

  // ═══ JUSTICE & LÉGAL ══════════════════════════════════════════════════════════
  // j-1: Casier judiciaire
  { email: 'casier1@test.gn', password: 'test2026', name: 'Camara', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-789012', phone: '+224 655 12 34 56', address: 'Kindia, Préfecture de Kindia', serviceId: 'j-1', scenario: 'Casier judiciaire pour emploi BCRG' },
  { email: 'casier2@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-890123', phone: '+224 622 23 34 45', address: 'Conakry, Commune de Kaloum', serviceId: 'j-1', scenario: 'Demande en ligne — résultat numérique' },
  { email: 'casier3@test.gn', password: 'test2026', name: 'Touré', firstName: 'Abdoulaye', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-901234', phone: '+224 621 34 45 56', address: 'Kankan, Préfecture de Kankan', serviceId: 'j-1', scenario: 'Timbre fiscal manquant — pièces complémentaires' },
  { email: 'casier4@test.gn', password: 'test2026', name: 'Sow', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-012345', phone: '+224 628 45 56 67', address: 'Mamou, Préfecture de Mamou', serviceId: 'j-1', scenario: 'Rejet — photos non conformes aux normes' },
  { email: 'casier5@test.gn', password: 'test2026', name: 'Bah', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-123456', phone: '+224 664 56 67 78', address: 'Conakry, Commune de Dixinn', serviceId: 'j-1', scenario: 'Casier délivré — document prêt' },

  // j-2: Certificat de non-poursuite
  { email: 'nonpours1@test.gn', password: 'test2026', name: 'Keita', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2015-234567', phone: '+224 677 67 78 89', address: 'Conakry, Commune de Matam', serviceId: 'j-2', scenario: 'Non-poursuite pour licence commerciale' },
  { email: 'nonpours2@test.gn', password: 'test2026', name: 'Condé', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2014-345678', phone: '+224 666 78 89 90', address: 'Labé, Préfecture de Labé', serviceId: 'j-2', scenario: 'Casier judiciaire expiré — renouvellement nécessaire' },
  { email: 'nonpours3@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2013-456789', phone: '+224 622 89 90 01', address: 'Boké, Préfecture de Boké', serviceId: 'j-2', scenario: 'En cours de vérification au tribunal' },
  { email: 'nonpours4@test.gn', password: 'test2026', name: 'Camara', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2012-567890', phone: '+224 655 90 01 12', address: 'Kindia, Préfecture de Kindia', serviceId: 'j-2', scenario: 'Demande rejetée — procédure en cours' },
  { email: 'nonpours5@test.gn', password: 'test2026', name: 'Sow', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2011-678901', phone: '+224 628 01 12 23', address: 'Conakry, Commune de Ratoma', serviceId: 'j-2', scenario: 'Certificat délivré avec succès' },

  // j-3: Légalisation de documents
  { email: 'legal1@test.gn', password: 'test2026', name: 'Touré', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-789012', phone: '+224 621 12 23 34', address: 'Conakry, Commune de Kaloum', serviceId: 'j-3', scenario: 'Légalisation diplôme étranger' },
  { email: 'legal2@test.gn', password: 'test2026', name: 'Bah', firstName: 'Aïssatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-890123', phone: '+224 664 23 34 45', address: 'Kankan, Préfecture de Kankan', serviceId: 'j-3', scenario: 'Légalisation contrat de travail' },
  { email: 'legal3@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-901234', phone: '+224 622 34 45 56', address: 'Labé, Préfecture de Labé', serviceId: 'j-3', scenario: 'Photocopie manquante — pièces complémentaires' },
  { email: 'legal4@test.gn', password: 'test2026', name: 'Condé', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-012345', phone: '+224 666 45 56 67', address: 'Conakry, Commune de Matoto', serviceId: 'j-3', scenario: 'Document original non conforme — rejet' },
  { email: 'legal5@test.gn', password: 'test2026', name: 'Keita', firstName: 'Lamine', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-123456', phone: '+224 677 56 67 78', address: 'Mamou, Préfecture de Mamou', serviceId: 'j-3', scenario: 'Document légalisé et disponible' },

  // ═══ IDENTIFICATION ═══════════════════════════════════════════════════════════
  // id-1: Carte d'identité nationale biométrique
  { email: 'cni1@test.gn', password: 'test2026', name: 'Condé', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-123456', phone: '+224 666 78 90 12', address: 'Conakry, Commune de Matam', serviceId: 'id-1', scenario: 'Première demande CNI biométrique' },
  { email: 'cni2@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-234567', phone: '+224 622 89 01 23', address: 'Conakry, Commune de Kaloum', serviceId: 'id-1', scenario: 'Renouvellement CNI expirée' },
  { email: 'cni3@test.gn', password: 'test2026', name: 'Camara', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-345678', phone: '+224 655 90 01 12', address: 'Kindia, Préfecture de Kindia', serviceId: 'id-1', scenario: 'Témoin manquant — pièces complémentaires' },
  { email: 'cni4@test.gn', password: 'test2026', name: 'Sow', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-456789', phone: '+224 628 01 12 23', address: 'Kankan, Préfecture de Kankan', serviceId: 'id-1', scenario: 'Photos non conformes — rejet' },
  { email: 'cni5@test.gn', password: 'test2026', name: 'Bah', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2021-567890', phone: '+224 664 12 23 34', address: 'Conakry, Commune de Dixinn', serviceId: 'id-1', scenario: 'CNI produite et livrée' },

  // id-2: Passeport biométrique
  { email: 'passeport1@test.gn', password: 'test2026', name: 'Bah', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-234567', phone: '+224 664 32 10 98', address: 'Conakry, Commune de Ratoma', serviceId: 'id-2', scenario: 'Passeport pour voyage professionnel Europe' },
  { email: 'passeport2@test.gn', password: 'test2026', name: 'Touré', firstName: 'Abdoulaye', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2015-345678', phone: '+224 621 43 21 09', address: 'Conakry, Commune de Kaloum', serviceId: 'id-2', scenario: 'Renouvellement passeport expiré' },
  { email: 'passeport3@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2014-456789', phone: '+224 622 54 32 10', address: 'Mamou, Préfecture de Mamou', serviceId: 'id-2', scenario: 'Certificat résidence manquant — pièces complémentaires' },
  { email: 'passeport4@test.gn', password: 'test2026', name: 'Keita', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2013-567890', phone: '+224 677 65 43 21', address: 'Labé, Préfecture de Labé', serviceId: 'id-2', scenario: 'Ancien passeport non fourni — rejet' },
  { email: 'passeport5@test.gn', password: 'test2026', name: 'Condé', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2012-678901', phone: '+224 666 76 54 32', address: 'Conakry, Commune de Matam', serviceId: 'id-2', scenario: 'Passeport livré au guichet ANIP' },

  // id-3: Permis de conduire
  { email: 'permis1@test.gn', password: 'test2026', name: 'Sow', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-789012', phone: '+224 628 87 65 43', address: 'Conakry, Commune de Dixinn', serviceId: 'id-3', scenario: 'Première demande permis B' },
  { email: 'permis2@test.gn', password: 'test2026', name: 'Camara', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-890123', phone: '+224 655 98 76 54', address: 'Kankan, Préfecture de Kankan', serviceId: 'id-3', scenario: 'Conversion permis international' },
  { email: 'permis3@test.gn', password: 'test2026', name: 'Touré', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-901234', phone: '+224 621 09 87 65', address: 'Kindia, Préfecture de Kindia', serviceId: 'id-3', scenario: 'Attestation auto-école manquante' },
  { email: 'permis4@test.gn', password: 'test2026', name: 'Bah', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2021-012345', phone: '+224 664 10 98 76', address: 'Labé, Préfecture de Labé', serviceId: 'id-3', scenario: 'Certificat médical expiré — rejet' },
  { email: 'permis5@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Lamine', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-123456', phone: '+224 622 21 09 87', address: 'Conakry, Commune de Ratoma', serviceId: 'id-3', scenario: 'Permis produit et disponible' },

  // ═══ URBANISME ════════════════════════════════════════════════════════════════
  // u-1: Permis de construire
  { email: 'constr1@test.gn', password: 'test2026', name: 'Keita', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2015-234567', phone: '+224 677 32 10 98', address: 'Conakry, Commune de Dixinn', serviceId: 'u-1', scenario: 'Permis construire villa résidentielle' },
  { email: 'constr2@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-345678', phone: '+224 622 43 21 09', address: 'Conakry, Commune de Kaloum', serviceId: 'u-1', scenario: 'Construction immeuble R+3 — étude impact requise' },
  { email: 'constr3@test.gn', password: 'test2026', name: 'Touré', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-456789', phone: '+224 621 54 32 10', address: 'Kindia, Préfecture de Kindia', serviceId: 'u-1', scenario: 'Plan non certifié — pièces complémentaires' },
  { email: 'constr4@test.gn', password: 'test2026', name: 'Sow', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-567890', phone: '+224 628 65 43 21', address: 'Kankan, Préfecture de Kankan', serviceId: 'u-1', scenario: 'Titre foncier contesté — rejet' },
  { email: 'constr5@test.gn', password: 'test2026', name: 'Camara', firstName: 'Abdoulaye', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-678901', phone: '+224 655 76 54 32', address: 'Conakry, Commune de Matoto', serviceId: 'u-1', scenario: 'Permis accordé et délivré' },

  // ═══ ENTREPRISE & COMMERCE ════════════════════════════════════════════════════
  // e-1: Enregistrement entreprise (APIP)
  { email: 'ent1@test.gn', password: 'test2026', name: 'Touré', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-345678', phone: '+224 628 45 67 89', address: 'Conakry, Commune de Dixinn', serviceId: 'e-1', scenario: 'Création SARL commerce général' },
  { email: 'ent2@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Alpha', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-456789', phone: '+224 622 56 78 90', address: 'Conakry, Commune de Kaloum', serviceId: 'e-1', scenario: 'SASU technologie — enregistrement rapide' },
  { email: 'ent3@test.gn', password: 'test2026', name: 'Bah', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-567890', phone: '+224 664 67 78 89', address: 'Kankan, Préfecture de Kankan', serviceId: 'e-1', scenario: 'Casier judiciaire du gérant manquant' },
  { email: 'ent4@test.gn', password: 'test2026', name: 'Condé', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-678901', phone: '+224 666 78 89 90', address: 'Labé, Préfecture de Labé', serviceId: 'e-1', scenario: 'Statuts non conformes — rejet' },
  { email: 'ent5@test.gn', password: 'test2026', name: 'Keita', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-789012', phone: '+224 677 89 90 01', address: 'Conakry, Commune de Ratoma', serviceId: 'e-1', scenario: 'RCCM délivré — entreprise enregistrée' },

  // e-2: Registre de commerce
  { email: 'rccm1@test.gn', password: 'test2026', name: 'Sow', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2015-890123', phone: '+224 628 90 01 12', address: 'Conakry, Commune de Matam', serviceId: 'e-2', scenario: 'Immatriculation RCCM après APIP' },
  { email: 'rccm2@test.gn', password: 'test2026', name: 'Camara', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2014-901234', phone: '+224 655 01 12 23', address: 'Conakry, Commune de Dixinn', serviceId: 'e-2', scenario: 'Modification registre — changement gérant' },
  { email: 'rccm3@test.gn', password: 'test2026', name: 'Touré', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2013-012345', phone: '+224 621 12 23 34', address: 'Kindia, Préfecture de Kindia', serviceId: 'e-2', scenario: 'Attestation APIP manquante' },
  { email: 'rccm4@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2012-123456', phone: '+224 622 23 34 45', address: 'Kankan, Préfecture de Kankan', serviceId: 'e-2', scenario: 'Statuts non enregistrés — rejet' },
  { email: 'rccm5@test.gn', password: 'test2026', name: 'Bah', firstName: 'Lamine', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2011-234567', phone: '+224 664 34 45 56', address: 'Conakry, Commune de Ratoma', serviceId: 'e-2', scenario: 'RCCM obtenu avec succès' },

  // ═══ ÉDUCATION ════════════════════════════════════════════════════════════════
  // ed-1: Attestation de scolarité
  { email: 'scol1@test.gn', password: 'test2026', name: 'Keita', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2021-890123', phone: '+224 677 56 78 90', address: 'Labé, Préfecture de Labé', serviceId: 'ed-1', scenario: 'Attestation scolarité pour bourse d\'étude' },
  { email: 'scol2@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2022-901234', phone: '+224 622 67 78 89', address: 'Conakry, Commune de Kaloum', serviceId: 'ed-1', scenario: 'Attestation pour inscription université' },
  { email: 'scol3@test.gn', password: 'test2026', name: 'Camara', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-012345', phone: '+224 655 78 89 90', address: 'Kankan, Préfecture de Kankan', serviceId: 'ed-1', scenario: 'Bulletin scolaire manquant — pièces complémentaires' },
  { email: 'scol4@test.gn', password: 'test2026', name: 'Touré', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2023-123456', phone: '+224 621 89 90 01', address: 'Kindia, Préfecture de Kindia', serviceId: 'ed-1', scenario: 'Non inscrit — rejet' },
  { email: 'scol5@test.gn', password: 'test2026', name: 'Sow', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-234567', phone: '+224 628 90 01 12', address: 'Conakry, Commune de Matam', serviceId: 'ed-1', scenario: 'Attestation délivrée avec succès' },

  // ed-2: Diplôme et relevé de notes
  { email: 'dip1@test.gn', password: 'test2026', name: 'Bah', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-345678', phone: '+224 664 01 12 23', address: 'Conakry, Commune de Ratoma', serviceId: 'ed-2', scenario: 'Duplicata diplôme BAC' },
  { email: 'dip2@test.gn', password: 'test2026', name: 'Condé', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-456789', phone: '+224 666 12 23 34', address: 'Mamou, Préfecture de Mamou', serviceId: 'ed-2', scenario: 'Relevé notes licence — emploi' },
  { email: 'dip3@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-567890', phone: '+224 622 23 34 45', address: 'Labé, Préfecture de Labé', serviceId: 'ed-2', scenario: 'Numéro matricule introuvable' },
  { email: 'dip4@test.gn', password: 'test2026', name: 'Keita', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2015-678901', phone: '+224 677 34 45 56', address: 'Boké, Préfecture de Boké', serviceId: 'ed-2', scenario: 'Ancien diplôme non fourni — rejet' },
  { email: 'dip5@test.gn', password: 'test2026', name: 'Camara', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2014-789012', phone: '+224 655 45 56 67', address: 'Conakry, Commune de Dixinn', serviceId: 'ed-2', scenario: 'Diplôme certifié disponible' },

  // ═══ SANTÉ ════════════════════════════════════════════════════════════════════
  // s-1: Certificat de vaccination
  { email: 'vacc1@test.gn', password: 'test2026', name: 'Doubé', firstName: 'Aïssatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2022-456789', phone: '+224 620 11 22 33', address: "N'Zérékoré, Préfecture de N'Zérékoré", serviceId: 's-1', scenario: 'Certificat vaccination international voyage' },
  { email: 'vacc2@test.gn', password: 'test2026', name: 'Sow', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2021-567890', phone: '+224 628 22 33 44', address: 'Conakry, Commune de Matam', serviceId: 's-1', scenario: 'Mise à jour carnet vaccination' },
  { email: 'vacc3@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-678901', phone: '+224 622 33 44 55', address: 'Kankan, Préfecture de Kankan', serviceId: 's-1', scenario: 'Ancien carnet perdu — recherche en cours' },
  { email: 'vacc4@test.gn', password: 'test2026', name: 'Touré', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-789012', phone: '+224 621 44 55 66', address: 'Labé, Préfecture de Labé', serviceId: 's-1', scenario: 'Vaccination incomplète — doses manquantes' },
  { email: 'vacc5@test.gn', password: 'test2026', name: 'Bah', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-890123', phone: '+224 664 55 66 77', address: 'Conakry, Commune de Dixinn', serviceId: 's-1', scenario: 'Certificat vaccinal délivré' },

  // s-2: Carte sanitaire
  { email: 'sanit1@test.gn', password: 'test2026', name: 'Camara', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-901234', phone: '+224 655 66 77 88', address: 'Conakry, Commune de Kaloum', serviceId: 's-2', scenario: 'Première demande carte sanitaire' },
  { email: 'sanit2@test.gn', password: 'test2026', name: 'Keita', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-012345', phone: '+224 677 77 88 99', address: 'Kindia, Préfecture de Kindia', serviceId: 's-2', scenario: 'Renouvellement carte sanitaire' },
  { email: 'sanit3@test.gn', password: 'test2026', name: 'Condé', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-123456', phone: '+224 666 88 99 00', address: 'Mamou, Préfecture de Mamou', serviceId: 's-2', scenario: 'Attestation emploi manquante' },
  { email: 'sanit4@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-234567', phone: '+224 622 99 00 11', address: 'Kankan, Préfecture de Kankan', serviceId: 's-2', scenario: 'Certificat résidence expiré — rejet' },
  { email: 'sanit5@test.gn', password: 'test2026', name: 'Sow', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-345678', phone: '+224 628 00 11 22', address: 'Conakry, Commune de Ratoma', serviceId: 's-2', scenario: 'Carte sanitaire produite' },

  // ═══ RÉSIDENCE & CITOYENNETÉ ══════════════════════════════════════════════════
  // r-1: Certificat de résidence
  { email: 'resid1@test.gn', password: 'test2026', name: 'Touré', firstName: 'Abdoulaye', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-456789', phone: '+224 621 11 22 33', address: 'Conakry, Commune de Kaloum', serviceId: 'r-1', scenario: 'Certificat résidence pour inscription scolaire' },
  { email: 'resid2@test.gn', password: 'test2026', name: 'Bah', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-567890', phone: '+224 664 22 33 44', address: 'Conakry, Commune de Matam', serviceId: 'r-1', scenario: 'Nouveau domicile — changement adresse' },
  { email: 'resid3@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-678901', phone: '+224 622 33 44 55', address: 'Kindia, Préfecture de Kindia', serviceId: 'r-1', scenario: 'Témoignage voisins manquant' },
  { email: 'resid4@test.gn', password: 'test2026', name: 'Camara', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-789012', phone: '+224 655 44 55 66', address: 'Kankan, Préfecture de Kankan', serviceId: 'r-1', scenario: 'Quittance loyer expirée — rejet' },
  { email: 'resid5@test.gn', password: 'test2026', name: 'Sow', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-890123', phone: '+224 628 55 66 77', address: 'Conakry, Commune de Dixinn', serviceId: 'r-1', scenario: 'Certificat de résidence délivré' },

  // r-2: Attestation de domicile
  { email: 'domic1@test.gn', password: 'test2026', name: 'Keita', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2021-901234', phone: '+224 677 66 77 88', address: 'Conakry, Commune de Ratoma', serviceId: 'r-2', scenario: 'Attestation domicile pour ouverture compte bancaire' },
  { email: 'domic2@test.gn', password: 'test2026', name: 'Condé', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-012345', phone: '+224 666 77 88 99', address: 'Conakry, Commune de Kaloum', serviceId: 'r-2', scenario: 'Facture électricité récente fournie' },
  { email: 'domic3@test.gn', password: 'test2026', name: 'Bah', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-123456', phone: '+224 664 88 99 00', address: 'Mamou, Préfecture de Mamou', serviceId: 'r-2', scenario: 'Facture trop ancienne — pièces complémentaires' },
  { email: 'domic4@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-234567', phone: '+224 622 99 00 11', address: 'Labé, Préfecture de Labé', serviceId: 'r-2', scenario: 'Pas de justificatif — rejet' },
  { email: 'domic5@test.gn', password: 'test2026', name: 'Touré', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-345678', phone: '+224 621 00 11 22', address: 'Conakry, Commune de Matoto', serviceId: 'r-2', scenario: 'Attestation délivrée avec succès' },

  // ═══ FISCALITÉ & IMPÔTS ═════════════════════════════════════════════════════
  // fi-1: Certificat de situation fiscale
  { email: 'fisc1@test.gn', password: 'test2026', name: 'Doumbouya', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-567123', phone: '+224 620 12 23 34', address: 'Conakry, Commune de Kaloum', serviceId: 'fi-1', scenario: 'Certificat situation fiscale — dossier complet' },
  { email: 'fisc2@test.gn', password: 'test2026', name: 'Sylla', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-678234', phone: '+224 633 23 34 45', address: 'Kankan, Préfecture de Kankan', serviceId: 'fi-1', scenario: 'Pièces complémentaires — quittance manquante' },
  { email: 'fisc3@test.gn', password: 'test2026', name: 'Soumah', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-789345', phone: '+224 628 34 45 56', address: 'Kindia, Préfecture de Kindia', serviceId: 'fi-1', scenario: 'Demande en cours de traitement' },
  { email: 'fisc4@test.gn', password: 'test2026', name: 'Bah', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-890456', phone: '+224 664 45 56 67', address: 'Labé, Préfecture de Labé', serviceId: 'fi-1', scenario: 'Rejet — NIF non valide' },
  { email: 'fisc5@test.gn', password: 'test2026', name: 'Condé', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-901567', phone: '+224 666 56 67 78', address: 'Conakry, Commune de Dixinn', serviceId: 'fi-1', scenario: 'Certificat délivré avec succès' },

  // fi-2: Déclaration d'impôts
  { email: 'impot1@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2021-012678', phone: '+224 622 67 78 89', address: 'Conakry, Commune de Matam', serviceId: 'fi-2', scenario: 'Déclaration annuelle — dossier complet' },
  { email: 'impot2@test.gn', password: 'test2026', name: 'Camara', firstName: 'Abdoulaye', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-123789', phone: '+224 655 78 89 90', address: 'Mamou, Préfecture de Mamou', serviceId: 'fi-2', scenario: 'Pièces complémentaires — relevés manquants' },
  { email: 'impot3@test.gn', password: 'test2026', name: 'Touré', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-234890', phone: '+224 621 89 90 01', address: 'Boké, Préfecture de Boké', serviceId: 'fi-2', scenario: 'En cours de vérification' },
  { email: 'impot4@test.gn', password: 'test2026', name: 'Keita', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-345901', phone: '+224 677 90 01 12', address: 'Kankan, Préfecture de Kankan', serviceId: 'fi-2', scenario: 'Rejet — revenus non déclarés' },
  { email: 'impot5@test.gn', password: 'test2026', name: 'Sow', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-456012', phone: '+224 628 01 12 23', address: 'Conakry, Commune de Ratoma', serviceId: 'fi-2', scenario: 'Déclaration enregistrée avec succès' },

  // ═══ SOCIAL & ASSISTANCE ═════════════════════════════════════════════════════
  // so-1: Carte d'assurance maladie
  { email: 'assur1@test.gn', password: 'test2026', name: 'Doubé', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-567123', phone: '+224 620 23 34 45', address: 'Conakry, Commune de Kaloum', serviceId: 'so-1', scenario: 'Première demande carte assurance maladie' },
  { email: 'assur2@test.gn', password: 'test2026', name: 'Sy Savané', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-678234', phone: '+224 633 34 45 56', address: "N'Zérékoré, Préfecture de N'Zérékoré", serviceId: 'so-1', scenario: 'Pièces complémentaires — attestation employeur manquante' },
  { email: 'assur3@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-789345', phone: '+224 622 45 56 67', address: 'Kindia, Préfecture de Kindia', serviceId: 'so-1', scenario: 'Demande en cours de traitement' },
  { email: 'assur4@test.gn', password: 'test2026', name: 'Camara', firstName: 'Aïssatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-890456', phone: '+224 655 56 67 78', address: 'Labé, Préfecture de Labé', serviceId: 'so-1', scenario: 'Rejet — certificat résidence expiré' },
  { email: 'assur5@test.gn', password: 'test2026', name: 'Bah', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-901567', phone: '+224 664 67 78 89', address: 'Conakry, Commune de Dixinn', serviceId: 'so-1', scenario: 'Carte assurance maladie livrée' },

  // so-2: Allocations familiales
  { email: 'alloc1@test.gn', password: 'test2026', name: 'Condé', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2015-012678', phone: '+224 666 78 89 90', address: 'Conakry, Commune de Matam', serviceId: 'so-2', scenario: 'Demande allocations familiales — dossier complet' },
  { email: 'alloc2@test.gn', password: 'test2026', name: 'Sow', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-123789', phone: '+224 628 89 90 01', address: 'Mamou, Préfecture de Mamou', serviceId: 'so-2', scenario: 'Pièces complémentaires — livret de famille manquant' },
  { email: 'alloc3@test.gn', password: 'test2026', name: 'Doumbouya', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-234890', phone: '+224 620 90 01 12', address: 'Kankan, Préfecture de Kankan', serviceId: 'so-2', scenario: 'En cours de vérification' },
  { email: 'alloc4@test.gn', password: 'test2026', name: 'Touré', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-345901', phone: '+224 621 01 12 23', address: "N'Zérékoré, Préfecture de N'Zérékoré", serviceId: 'so-2', scenario: 'Rejet — certificat scolarité enfants manquant' },
  { email: 'alloc5@test.gn', password: 'test2026', name: 'Keita', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-456012', phone: '+224 677 12 23 34', address: 'Conakry, Commune de Ratoma', serviceId: 'so-2', scenario: 'Allocations familiales accordées' },

  // ═══ URBANISME (extension) ═══════════════════════════════════════════════════
  // u-2: Certificat de conformité
  { email: 'conform1@test.gn', password: 'test2026', name: 'Sylla', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-567123', phone: '+224 633 23 34 45', address: 'Conakry, Commune de Dixinn', serviceId: 'u-2', scenario: 'Certificat conformité — construction achevée' },
  { email: 'conform2@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-678234', phone: '+224 622 34 45 56', address: 'Conakry, Commune de Kaloum', serviceId: 'u-2', scenario: 'Pièces complémentaires — PV réception manquant' },
  { email: 'conform3@test.gn', password: 'test2026', name: 'Camara', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-789345', phone: '+224 655 45 56 67', address: 'Kindia, Préfecture de Kindia', serviceId: 'u-2', scenario: 'En cours de vérification sur site' },
  { email: 'conform4@test.gn', password: 'test2026', name: 'Bah', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-890456', phone: '+224 664 56 67 78', address: 'Kankan, Préfecture de Kankan', serviceId: 'u-2', scenario: 'Rejet — construction non conforme au permis' },
  { email: 'conform5@test.gn', password: 'test2026', name: 'Soumah', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-901567', phone: '+224 628 67 78 89', address: 'Conakry, Commune de Matoto', serviceId: 'u-2', scenario: 'Certificat de conformité délivré' },

  // u-3: Titre foncier
  { email: 'foncier1@test.gn', password: 'test2026', name: 'Touré', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2015-012678', phone: '+224 621 78 89 90', address: 'Conakry, Commune de Ratoma', serviceId: 'u-3', scenario: 'Enregistrement titre foncier — dossier complet' },
  { email: 'foncier2@test.gn', password: 'test2026', name: 'Keita', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-123789', phone: '+224 677 89 90 01', address: 'Mamou, Préfecture de Mamou', serviceId: 'u-3', scenario: 'Pièces complémentaires — certificat bornage manquant' },
  { email: 'foncier3@test.gn', password: 'test2026', name: 'Condé', firstName: 'Abdoulaye', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-234890', phone: '+224 666 90 01 12', address: 'Kindia, Préfecture de Kindia', serviceId: 'u-3', scenario: 'En cours — enquête de voisinage en cours' },
  { email: 'foncier4@test.gn', password: 'test2026', name: 'Doumbouya', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-345901', phone: '+224 620 01 12 23', address: 'Boké, Préfecture de Boké', serviceId: 'u-3', scenario: 'Rejet — litige foncier détecté' },
  { email: 'foncier5@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Fatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-456012', phone: '+224 622 12 23 34', address: 'Conakry, Commune de Dixinn', serviceId: 'u-3', scenario: 'Titre foncier enregistré avec succès' },

  // ═══ ÉDUCATION (extension) ═══════════════════════════════════════════════════
  // ed-3: Équivalence de diplôme
  { email: 'equiv1@test.gn', password: 'test2026', name: 'Bah', firstName: 'Ibrahim', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-567123', phone: '+224 664 23 34 45', address: 'Conakry, Commune de Kaloum', serviceId: 'ed-3', scenario: 'Équivalence diplôme étranger — dossier complet' },
  { email: 'equiv2@test.gn', password: 'test2026', name: 'Sow', firstName: 'Kadiatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-678234', phone: '+224 628 34 45 56', address: 'Kankan, Préfecture de Kankan', serviceId: 'ed-3', scenario: 'Pièces complémentaires — traduction assermentée manquante' },
  { email: 'equiv3@test.gn', password: 'test2026', name: 'Camara', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-789345', phone: '+224 655 45 56 67', address: 'Labé, Préfecture de Labé', serviceId: 'ed-3', scenario: 'En cours d\'évaluation par la commission' },
  { email: 'equiv4@test.gn', password: 'test2026', name: 'Touré', firstName: 'Mamadou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-890456', phone: '+224 621 56 67 78', address: 'Conakry, Commune de Matam', serviceId: 'ed-3', scenario: 'Rejet — programme de formation non fourni' },
  { email: 'equiv5@test.gn', password: 'test2026', name: 'Condé', firstName: 'Aïssatou', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2016-901567', phone: '+224 666 67 78 89', address: "N'Zérékoré, Préfecture de N'Zérékoré", serviceId: 'ed-3', scenario: 'Équivalence accordée avec succès' },

  // ═══ ÉTAT CIVIL (extension) ══════════════════════════════════════════════════
  // ec-6: Changement de nom
  { email: 'nom1@test.gn', password: 'test2026', name: 'Sy Savané', firstName: 'Ousmane', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2017-012678', phone: '+224 633 78 89 90', address: 'Conakry, Commune de Ratoma', serviceId: 'ec-6', scenario: 'Changement de nom — dossier complet' },
  { email: 'nom2@test.gn', password: 'test2026', name: 'Doubé', firstName: 'Mariama', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2018-123789', phone: '+224 620 89 90 01', address: 'Kindia, Préfecture de Kindia', serviceId: 'ec-6', scenario: 'Pièces complémentaires — publication Journal Officiel manquante' },
  { email: 'nom3@test.gn', password: 'test2026', name: 'Keita', firstName: 'Aminata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2019-234890', phone: '+224 677 90 01 12', address: 'Kankan, Préfecture de Kankan', serviceId: 'ec-6', scenario: 'En cours de traitement par le tribunal' },
  { email: 'nom4@test.gn', password: 'test2026', name: 'Diallo', firstName: 'Fatoumata', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2020-345901', phone: '+224 622 01 12 23', address: 'Labé, Préfecture de Labé', serviceId: 'ec-6', scenario: 'Rejet — motif non justifié' },
  { email: 'nom5@test.gn', password: 'test2026', name: 'Bah', firstName: 'Moussa', role: 'citoyen', institution: 'Portail Citoyen', fonction: 'Citoyen', nin: 'NIN-2021-456012', phone: '+224 664 12 23 34', address: 'Conakry, Commune de Dixinn', serviceId: 'ec-6', scenario: 'Changement de nom accordé' },
]

// All accounts combined
export const ALL_ACCOUNTS: DemoAccount[] = [...MAIN_ACCOUNTS, ...TEST_CITIZEN_ACCOUNTS]

// Helper to find account by email
export function findAccountByEmail(email: string): DemoAccount | undefined {
  return ALL_ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase())
}

// Helper to get accounts by service
export function getAccountsByService(serviceId: string): DemoAccount[] {
  return TEST_CITIZEN_ACCOUNTS.filter(a => a.serviceId === serviceId)
}

// Helper to get accounts by role
export function getAccountsByRole(role: UserRole): DemoAccount[] {
  return ALL_ACCOUNTS.filter(a => a.role === role)
}

// Service IDs list for reference
export const SERVICE_IDS = [
  'ec-1', 'ec-2', 'ec-3', 'ec-4', 'ec-5', 'ec-6',  // État Civil (6)
  'j-1', 'j-2', 'j-3',                                // Justice (3)
  'id-1', 'id-2', 'id-3',                              // Identification (3)
  'u-1', 'u-2', 'u-3',                                 // Urbanisme (3)
  'e-1', 'e-2',                                         // Entreprise (2)
  'ed-1', 'ed-2', 'ed-3',                               // Éducation (3)
  's-1', 's-2',                                         // Santé (2)
  'r-1', 'r-2',                                         // Résidence (2)
  'fi-1', 'fi-2',                                       // Fiscalité (2)
  'so-1', 'so-2',                                       // Social (2)
] as const

// Service names mapping
export const SERVICE_NAMES: Record<string, string> = {
  'ec-1': "Extrait d'acte de naissance",
  'ec-2': "Extrait d'acte de mariage",
  'ec-3': "Extrait d'acte de décès",
  'ec-4': 'Certificat de nationalité',
  'ec-5': 'Déclaration de naissance',
  'ec-6': 'Changement de nom',
  'j-1': 'Casier judiciaire',
  'j-2': 'Certificat de non-poursuite',
  'j-3': 'Légalisation de documents',
  'id-1': "Carte d'identité nationale biométrique",
  'id-2': 'Passeport biométrique',
  'id-3': 'Permis de conduire',
  'u-1': 'Permis de construire',
  'u-2': 'Certificat de conformité',
  'u-3': 'Titre foncier',
  'e-1': 'Enregistrement entreprise (APIP)',
  'e-2': 'Registre de commerce',
  'ed-1': 'Attestation de scolarité',
  'ed-2': 'Diplôme et relevé de notes',
  'ed-3': 'Équivalence de diplôme',
  's-1': 'Certificat de vaccination',
  's-2': 'Carte sanitaire',
  'r-1': 'Certificat de résidence',
  'r-2': 'Attestation de domicile',
  'fi-1': 'Certificat de situation fiscale',
  'fi-2': "Déclaration d'impôts",
  'so-1': "Carte d'assurance maladie",
  'so-2': 'Allocations familiales',
}

// Category mapping
export const SERVICE_CATEGORY_MAP: Record<string, { name: string; id: string }> = {
  'ec-1': { name: 'État Civil', id: 'etat-civil' },
  'ec-2': { name: 'État Civil', id: 'etat-civil' },
  'ec-3': { name: 'État Civil', id: 'etat-civil' },
  'ec-4': { name: 'État Civil', id: 'etat-civil' },
  'ec-5': { name: 'État Civil', id: 'etat-civil' },
  'ec-6': { name: 'État Civil', id: 'etat-civil' },
  'j-1': { name: 'Justice & Légal', id: 'justice' },
  'j-2': { name: 'Justice & Légal', id: 'justice' },
  'j-3': { name: 'Justice & Légal', id: 'justice' },
  'id-1': { name: 'Identification', id: 'identification' },
  'id-2': { name: 'Identification', id: 'identification' },
  'id-3': { name: 'Identification', id: 'identification' },
  'u-1': { name: 'Urbanisme & Construction', id: 'urbanisme' },
  'u-2': { name: 'Urbanisme & Construction', id: 'urbanisme' },
  'u-3': { name: 'Urbanisme & Construction', id: 'urbanisme' },
  'e-1': { name: 'Entreprise & Commerce', id: 'entreprise' },
  'e-2': { name: 'Entreprise & Commerce', id: 'entreprise' },
  'ed-1': { name: 'Éducation', id: 'education' },
  'ed-2': { name: 'Éducation', id: 'education' },
  'ed-3': { name: 'Éducation', id: 'education' },
  's-1': { name: 'Santé', id: 'sante' },
  's-2': { name: 'Santé', id: 'sante' },
  'r-1': { name: 'Résidence & Citoyenneté', id: 'residence' },
  'r-2': { name: 'Résidence & Citoyenneté', id: 'residence' },
  'fi-1': { name: 'Fiscalité & Impôts', id: 'fiscalite' },
  'fi-2': { name: 'Fiscalité & Impôts', id: 'fiscalite' },
  'so-1': { name: 'Social & Assistance', id: 'social' },
  'so-2': { name: 'Social & Assistance', id: 'social' },
}
