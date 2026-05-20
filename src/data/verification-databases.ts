// ═══════════════════════════════════════════════════════════════════════════════
// eAdmin Guinée — Verification Databases
// Simulated verification databases for AI agent and service processing
// Covers: marriage, death, criminal, land, enterprise, education,
//         vaccination, tax, social security, construction, and driving records
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Verification Result Interface ─────────────────────────────────────────────

export interface VerificationResult {
  found: boolean
  data?: Record<string, any>
  confidence: number // 0-100
  message: string
  source: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MARRIAGE RECORDS — 20 records
// ═══════════════════════════════════════════════════════════════════════════════

export interface MarriageRecord {
  id: string
  husbandName: string
  husbandFirstName: string
  husbandNIN: string
  wifeName: string
  wifeFirstName: string
  wifeNIN: string
  marriageDate: string
  marriageLocation: string
  actNumber: string
  regime: 'communauté_biens' | 'séparation_biens'
  officierEtatCivil: string
  commune: string
}

export const MARRIAGE_RECORDS: MarriageRecord[] = [
  {
    id: 'MR-2024-001',
    husbandName: 'Condé',
    husbandFirstName: 'Ibrahim',
    husbandNIN: 'NIN-2016-678901',
    wifeName: 'Touré',
    wifeFirstName: 'Mariama',
    wifeNIN: 'NIN-2015-567890',
    marriageDate: '2018-06-15',
    marriageLocation: 'Mairie de Matam',
    actNumber: '2018-MTM-M-00147',
    regime: 'communauté_biens',
    officierEtatCivil: 'Mamadou Bangoura',
    commune: 'Matam',
  },
  {
    id: 'MR-2024-002',
    husbandName: 'Diallo',
    husbandFirstName: 'Alpha',
    husbandNIN: 'NIN-2017-456789',
    wifeName: 'Bah',
    wifeFirstName: 'Aissatou',
    wifeNIN: '1965092345678',
    marriageDate: '2015-03-22',
    marriageLocation: 'Mairie de Kaloum',
    actNumber: '2015-KLM-M-00089',
    regime: 'communauté_biens',
    officierEtatCivil: 'Thierno Camara',
    commune: 'Kaloum',
  },
  {
    id: 'MR-2024-003',
    husbandName: 'Camara',
    husbandFirstName: 'Ousmane',
    husbandNIN: '1972030456789',
    wifeName: 'Soumah',
    wifeFirstName: 'Fatoumata',
    wifeNIN: '2000040889012',
    marriageDate: '2022-12-10',
    marriageLocation: 'Mairie de Matoto',
    actNumber: '2022-MTT-M-00234',
    regime: 'séparation_biens',
    officierEtatCivil: 'Lamine Sow',
    commune: 'Matoto',
  },
  {
    id: 'MR-2024-004',
    husbandName: 'Keita',
    husbandFirstName: 'Lamine',
    husbandNIN: 'NIN-2017-234567',
    wifeName: 'Baldé',
    wifeFirstName: 'Saran',
    wifeNIN: '1985091712345',
    marriageDate: '2012-08-05',
    marriageLocation: 'Mairie de Kankan',
    actNumber: '2012-KKN-M-00178',
    regime: 'communauté_biens',
    officierEtatCivil: 'Mamady Fofana',
    commune: 'Kankan',
  },
  {
    id: 'MR-2024-005',
    husbandName: 'Touré',
    husbandFirstName: 'Ibrahima',
    husbandNIN: 'NIN-2015-345678',
    wifeName: 'Diallo',
    wifeFirstName: 'Kadiatou',
    wifeNIN: '1980031590123',
    marriageDate: '2010-04-18',
    marriageLocation: 'Mairie de Kaloum',
    actNumber: '2010-KLM-M-00056',
    regime: 'communauté_biens',
    officierEtatCivil: 'Facinet Sy Savané',
    commune: 'Kaloum',
  },
  {
    id: 'MR-2024-006',
    husbandName: 'Bah',
    husbandFirstName: 'Mamadou',
    husbandNIN: 'NIN-2016-123456',
    wifeName: 'Condé',
    wifeFirstName: 'Fatoumata',
    wifeNIN: '1976071578901',
    marriageDate: '2008-01-25',
    marriageLocation: 'Mairie de Dixinn',
    actNumber: '2008-DXN-M-00112',
    regime: 'séparation_biens',
    officierEtatCivil: 'Alpha Doumbouya',
    commune: 'Dixinn',
  },
  {
    id: 'MR-2024-007',
    husbandName: 'Sylla',
    husbandFirstName: 'Mohamed',
    husbandNIN: '1986062845678',
    wifeName: 'Fofana',
    wifeFirstName: 'Aminata',
    wifeNIN: '1988070545678',
    marriageDate: '2016-09-30',
    marriageLocation: 'Mairie de Dixinn',
    actNumber: '2016-DXN-M-00195',
    regime: 'communauté_biens',
    officierEtatCivil: 'Ibrahim Camara',
    commune: 'Dixinn',
  },
  {
    id: 'MR-2024-008',
    husbandName: 'Soumah',
    husbandFirstName: 'Abdoulaye',
    husbandNIN: '1982081612345',
    wifeName: 'Traoré',
    wifeFirstName: 'Djénéba',
    wifeNIN: '1999082501234',
    marriageDate: '2020-11-14',
    marriageLocation: 'Mairie de Kindia',
    actNumber: '2020-KND-M-00078',
    regime: 'communauté_biens',
    officierEtatCivil: 'Moussa Condé',
    commune: 'Kindia',
  },
  {
    id: 'MR-2024-009',
    husbandName: 'Doubé',
    husbandFirstName: 'Facinet',
    husbandNIN: '1971060389012',
    wifeName: 'Dioubaté',
    wifeFirstName: 'Néné',
    wifeNIN: '1993032178901',
    marriageDate: '2019-02-20',
    marriageLocation: 'Mairie de Labé',
    actNumber: '2019-LBE-M-00134',
    regime: 'séparation_biens',
    officierEtatCivil: 'Thierno Kaba',
    commune: 'Labé',
  },
  {
    id: 'MR-2024-010',
    husbandName: 'Sy Savané',
    husbandFirstName: 'Moussa',
    husbandNIN: '1987100167890',
    wifeName: 'Sow',
    wifeFirstName: 'Hawa',
    wifeNIN: '1997070945678',
    marriageDate: '2021-07-03',
    marriageLocation: 'Mairie de Ratoma',
    actNumber: '2021-RTM-M-00201',
    regime: 'communauté_biens',
    officierEtatCivil: 'Mamadou Bah',
    commune: 'Ratoma',
  },
  {
    id: 'MR-2024-011',
    husbandName: 'Sow',
    husbandFirstName: 'Mamadou',
    husbandNIN: '1991081923456',
    wifeName: 'Camara',
    wifeFirstName: 'Djénébou',
    wifeNIN: '1994042856789',
    marriageDate: '2017-05-12',
    marriageLocation: 'Mairie de Kaloum',
    actNumber: '2017-KLM-M-00167',
    regime: 'communauté_biens',
    officierEtatCivil: 'Ousmane Touré',
    commune: 'Kaloum',
  },
  {
    id: 'MR-2024-012',
    husbandName: 'Doumbouya',
    husbandFirstName: 'Sékou',
    husbandNIN: '1965070112345',
    wifeName: 'Kaba',
    wifeFirstName: 'Oumou',
    wifeNIN: '1990111512345',
    marriageDate: '2023-03-18',
    marriageLocation: "Mairie de N'Zérékoré",
    actNumber: '2023-NZR-M-00045',
    regime: 'communauté_biens',
    officierEtatCivil: 'Lamine Doumbouya',
    commune: "N'Zérékoré",
  },
  {
    id: 'MR-2024-013',
    husbandName: 'Condé',
    husbandFirstName: 'Sékou',
    husbandNIN: '1962100756789',
    wifeName: 'Keita',
    wifeFirstName: 'Mariama',
    wifeNIN: '1975091745678',
    marriageDate: '1995-11-08',
    marriageLocation: 'Mairie de Mamou',
    actNumber: '1995-MMO-M-00034',
    regime: 'communauté_biens',
    officierEtatCivil: 'El Hadj Baldé',
    commune: 'Mamou',
  },
  {
    id: 'MR-2024-014',
    husbandName: 'Fofana',
    husbandFirstName: 'Ibrahima',
    husbandNIN: '2001071812345',
    wifeName: 'Bangoura',
    wifeFirstName: 'Fatoumata',
    wifeNIN: '1995062223456',
    marriageDate: '2024-01-20',
    marriageLocation: 'Mairie de Boké',
    actNumber: '2024-BKE-M-00012',
    regime: 'séparation_biens',
    officierEtatCivil: 'Mohamed Sanno',
    commune: 'Boké',
  },
  {
    id: 'MR-2024-015',
    husbandName: 'Traoré',
    husbandFirstName: 'Thierno',
    husbandNIN: '1975040278901',
    wifeName: 'Baldé',
    wifeFirstName: 'Mariama',
    wifeNIN: '1975091745678',
    marriageDate: '2005-06-25',
    marriageLocation: 'Mairie de Faranah',
    actNumber: '2005-FRH-M-00067',
    regime: 'communauté_biens',
    officierEtatCivil: 'Mamadou Doubé',
    commune: 'Faranah',
  },
  {
    id: 'MR-2024-016',
    husbandName: 'Kouyaté',
    husbandFirstName: 'Mamady',
    husbandNIN: '1968120545678',
    wifeName: 'Doumbouya',
    wifeFirstName: 'Mariama',
    wifeNIN: '1998092489012',
    marriageDate: '2022-08-28',
    marriageLocation: "Mairie de N'Zérékoré",
    actNumber: '2022-NZR-M-00156',
    regime: 'communauté_biens',
    officierEtatCivil: 'Sékou Leno',
    commune: "N'Zérékoré",
  },
  {
    id: 'MR-2024-017',
    husbandName: 'Camara',
    husbandFirstName: 'Moussa',
    husbandNIN: 'NIN-2018-567890',
    wifeName: 'Touré',
    wifeFirstName: 'Aissatou',
    wifeNIN: '2004120145678',
    marriageDate: '2024-06-15',
    marriageLocation: 'Mairie de Kindia',
    actNumber: '2024-KND-M-00089',
    regime: 'communauté_biens',
    officierEtatCivil: 'Abdoulaye Soumah',
    commune: 'Kindia',
  },
  {
    id: 'MR-2024-018',
    husbandName: 'Bangoura',
    husbandFirstName: 'Mamadou',
    husbandNIN: '1991021323456',
    wifeName: 'Sylla',
    wifeFirstName: 'Aissatou',
    wifeNIN: 'NIN-2014-345678',
    marriageDate: '2019-10-12',
    marriageLocation: 'Mairie de Matam',
    actNumber: '2019-MTM-M-00223',
    regime: 'séparation_biens',
    officierEtatCivil: 'Ibrahim Condé',
    commune: 'Matam',
  },
  {
    id: 'MR-2024-019',
    husbandName: 'Keita',
    husbandFirstName: 'Ibrahim',
    husbandNIN: '1979102289012',
    wifeName: 'Diallo',
    wifeFirstName: 'Fatoumata',
    wifeNIN: '2006010290123',
    marriageDate: '2023-12-22',
    marriageLocation: 'Mairie de Kankan',
    actNumber: '2023-KKN-M-00289',
    regime: 'communauté_biens',
    officierEtatCivil: 'Mamady Condé',
    commune: 'Kankan',
  },
  {
    id: 'MR-2024-020',
    husbandName: 'Bah',
    husbandFirstName: 'Ousmane',
    husbandNIN: 'NIN-2014-789012',
    wifeName: 'Sy Savané',
    wifeFirstName: 'Aminata',
    wifeNIN: 'NIN-2022-890123',
    marriageDate: '2024-02-14',
    marriageLocation: 'Mairie de Boké',
    actNumber: '2024-BKE-M-00034',
    regime: 'communauté_biens',
    officierEtatCivil: 'Facinet Sanno',
    commune: 'Boké',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DEATH RECORDS — 15 records
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeathRecord {
  id: string
  deceasedName: string
  deceasedFirstName: string
  deceasedNIN: string
  deathDate: string
  deathLocation: string
  deathCause: string
  actNumber: string
  declarantName: string
  declarantFirstName: string
  declarantRelation: string
  declarantNIN: string
  commune: string
}

export const DEATH_RECORDS: DeathRecord[] = [
  {
    id: 'DR-2024-001',
    deceasedName: 'Diallo',
    deceasedFirstName: 'Mamadou',
    deceasedNIN: '1960081212345',
    deathDate: '2023-11-15',
    deathLocation: 'Hôpital Ignace Deen, Kaloum',
    deathCause: 'Cause naturelle — insuffisance cardiaque',
    actNumber: '2023-KLM-D-00078',
    declarantName: 'Diallo',
    declarantFirstName: 'Aminata',
    declarantRelation: 'fille',
    declarantNIN: 'NIN-2019-458723',
    commune: 'Kaloum',
  },
  {
    id: 'DR-2024-002',
    deceasedName: 'Condé',
    deceasedFirstName: 'Alpha',
    deceasedNIN: '1955120756789',
    deathDate: '2024-01-08',
    deathLocation: 'Clinique Pasteur, Dixinn',
    deathCause: 'Cause naturelle — accident vasculaire cérébral',
    actNumber: '2024-DXN-D-00012',
    declarantName: 'Condé',
    declarantFirstName: 'Ibrahim',
    declarantRelation: 'fils',
    declarantNIN: 'NIN-2016-678901',
    commune: 'Dixinn',
  },
  {
    id: 'DR-2024-003',
    deceasedName: 'Camara',
    deceasedFirstName: 'Facinet',
    deceasedNIN: '1942081178901',
    deathDate: '2022-06-20',
    deathLocation: 'Hôpital régional, Kindia',
    deathCause: 'Cause naturelle — maladie prolongée',
    actNumber: '2022-KND-D-00034',
    declarantName: 'Camara',
    declarantFirstName: 'Ousmane',
    declarantRelation: 'fils',
    declarantNIN: '1972030456789',
    commune: 'Kindia',
  },
  {
    id: 'DR-2024-004',
    deceasedName: 'Keita',
    deceasedFirstName: 'Mamady',
    deceasedNIN: '1950061523456',
    deathDate: '2023-04-12',
    deathLocation: 'Hôpital régional, Kankan',
    deathCause: 'Cause naturelle — pneumopathie',
    actNumber: '2023-KKN-D-00056',
    declarantName: 'Keita',
    declarantFirstName: 'Ibrahim',
    declarantRelation: 'fils',
    declarantNIN: '1979102289012',
    commune: 'Kankan',
  },
  {
    id: 'DR-2024-005',
    deceasedName: 'Bah',
    deceasedFirstName: 'Ousmane',
    deceasedNIN: '1961042512345',
    deathDate: '2024-03-28',
    deathLocation: 'Centre hospitalier, Ratoma',
    deathCause: 'Cause naturelle — diabète',
    actNumber: '2024-RTM-D-00023',
    declarantName: 'Bah',
    declarantFirstName: 'Fatoumata',
    declarantRelation: 'fille',
    declarantNIN: 'NIN-2016-234567',
    commune: 'Ratoma',
  },
  {
    id: 'DR-2024-006',
    deceasedName: 'Touré',
    deceasedFirstName: 'Mamady',
    deceasedNIN: '1950060290123',
    deathDate: '2021-09-14',
    deathLocation: 'Hôpital Donka, Conakry',
    deathCause: 'Cause naturelle — hypertension',
    actNumber: '2021-KLM-D-00145',
    declarantName: 'Touré',
    declarantFirstName: 'Ibrahima',
    declarantRelation: 'fils',
    declarantNIN: 'NIN-2015-345678',
    commune: 'Kaloum',
  },
  {
    id: 'DR-2024-007',
    deceasedName: 'Sylla',
    deceasedFirstName: 'Lamine',
    deceasedNIN: '1956041156789',
    deathDate: '2023-07-02',
    deathLocation: 'Clinique Le Littoral, Dixinn',
    deathCause: 'Cause naturelle — cancer',
    actNumber: '2023-DXN-D-00089',
    declarantName: 'Sylla',
    declarantFirstName: 'Mohamed',
    declarantRelation: 'fils',
    declarantNIN: '1986062845678',
    commune: 'Dixinn',
  },
  {
    id: 'DR-2024-008',
    deceasedName: 'Soumah',
    deceasedFirstName: 'Lamine',
    deceasedNIN: '1955092301234',
    deathDate: '2022-12-05',
    deathLocation: 'Hôpital régional, Kindia',
    deathCause: 'Cause naturelle — insuffisance rénale',
    actNumber: '2022-KND-D-00112',
    declarantName: 'Soumah',
    declarantFirstName: 'Mamadou',
    declarantRelation: 'fils',
    declarantNIN: '1985061701234',
    commune: 'Kindia',
  },
  {
    id: 'DR-2024-009',
    deceasedName: 'Fofana',
    deceasedFirstName: 'Abdoulaye',
    deceasedNIN: '1958041256789',
    deathDate: '2024-02-19',
    deathLocation: 'Hôpital régional, Mamou',
    deathCause: 'Accident de la circulation',
    actNumber: '2024-MMO-D-00008',
    declarantName: 'Fofana',
    declarantFirstName: 'Aminata',
    declarantRelation: 'fille',
    declarantNIN: '1988070545678',
    commune: 'Mamou',
  },
  {
    id: 'DR-2024-010',
    deceasedName: 'Doubé',
    deceasedFirstName: 'Mamadou',
    deceasedNIN: '1945091790123',
    deathDate: '2023-10-30',
    deathLocation: 'Centre médical, Faranah',
    deathCause: 'Cause naturelle — vieillesse',
    actNumber: '2023-FRH-D-00045',
    declarantName: 'Doubé',
    declarantFirstName: 'Facinet',
    declarantRelation: 'fils',
    declarantNIN: '1971060389012',
    commune: 'Faranah',
  },
  {
    id: 'DR-2024-011',
    deceasedName: 'Traoré',
    deceasedFirstName: 'El Hadj',
    deceasedNIN: '1945011589012',
    deathDate: '2022-03-17',
    deathLocation: 'Hôpital régional, Mamou',
    deathCause: 'Cause naturelle — affection respiratoire',
    actNumber: '2022-MMO-D-00067',
    declarantName: 'Traoré',
    declarantFirstName: 'Thierno',
    declarantRelation: 'fils',
    declarantNIN: '1975040278901',
    commune: 'Mamou',
  },
  {
    id: 'DR-2024-012',
    deceasedName: 'Condé',
    deceasedFirstName: 'Sékou',
    deceasedNIN: '1946031901234',
    deathDate: '2024-05-11',
    deathLocation: 'Hôpital de Boké',
    deathCause: 'Cause naturelle — paludisme grave',
    actNumber: '2024-BKE-D-00019',
    declarantName: 'Condé',
    declarantFirstName: 'Fatoumata',
    declarantRelation: 'fille',
    declarantNIN: '1976071578901',
    commune: 'Boké',
  },
  {
    id: 'DR-2024-013',
    deceasedName: 'Kaba',
    deceasedFirstName: 'Thierno',
    deceasedNIN: '1974052178901',
    deathDate: '2023-08-22',
    deathLocation: 'Hôpital régional, Labé',
    deathCause: 'Accident de travail',
    actNumber: '2023-LBE-D-00091',
    declarantName: 'Kaba',
    declarantFirstName: 'Moussa',
    declarantRelation: 'fils',
    declarantNIN: '2003091867890',
    commune: 'Labé',
  },
  {
    id: 'DR-2024-014',
    deceasedName: 'Baldé',
    deceasedFirstName: 'Thierno',
    deceasedNIN: '1945120867890',
    deathDate: '2021-12-01',
    deathLocation: 'Centre de santé, Faranah',
    deathCause: 'Cause naturelle — hypertension',
    actNumber: '2021-FRH-D-00034',
    declarantName: 'Baldé',
    declarantFirstName: 'Mariama',
    declarantRelation: 'fille',
    declarantNIN: '1975091745678',
    commune: 'Faranah',
  },
  {
    id: 'DR-2024-015',
    deceasedName: 'Sanno',
    deceasedFirstName: 'Mohamed',
    deceasedNIN: '1935031834567',
    deathDate: '2020-07-14',
    deathLocation: 'Centre hospitalier, Boké',
    deathCause: 'Cause naturelle — insuffisance cardiaque',
    actNumber: '2020-BKE-D-00056',
    declarantName: 'Sanno',
    declarantFirstName: 'El Hadj',
    declarantRelation: 'fils',
    declarantNIN: '1963021423456',
    commune: 'Boké',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CRIMINAL RECORDS — 20 entries (most clear, 3-4 with records)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CriminalRecord {
  nin: string
  fullName: string
  firstName: string
  hasRecord: boolean
  recordType: 'aucun' | 'contravention' | 'délit' | 'crime'
  details: string
  dateLastCheck: string
  isClear: boolean
}

export const CRIMINAL_RECORDS: CriminalRecord[] = [
  {
    nin: 'NIN-2019-458723',
    fullName: 'Diallo',
    firstName: 'Aminata',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-11-15',
    isClear: true,
  },
  {
    nin: 'NIN-2018-567890',
    fullName: 'Camara',
    firstName: 'Moussa',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-10-22',
    isClear: true,
  },
  {
    nin: 'NIN-2020-123456',
    fullName: 'Sow',
    firstName: 'Kadiatou',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-09-08',
    isClear: true,
  },
  {
    nin: 'NIN-2017-234567',
    fullName: 'Keita',
    firstName: 'Lamine',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-08-30',
    isClear: true,
  },
  {
    nin: 'NIN-2021-345678',
    fullName: 'Doumbouya',
    firstName: 'Fatou',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-07-19',
    isClear: true,
  },
  {
    nin: 'NIN-2015-567890',
    fullName: 'Touré',
    firstName: 'Mariama',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-11-02',
    isClear: true,
  },
  {
    nin: 'NIN-2016-678901',
    fullName: 'Condé',
    firstName: 'Ibrahim',
    hasRecord: true,
    recordType: 'contravention',
    details: 'Contravention pour excès de vitesse en 2019 — amendée, dossier clos',
    dateLastCheck: '2024-06-25',
    isClear: false,
  },
  {
    nin: 'NIN-2017-456789',
    fullName: 'Diallo',
    firstName: 'Alpha',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-12-03',
    isClear: true,
  },
  {
    nin: 'NIN-2015-345678',
    fullName: 'Touré',
    firstName: 'Ibrahima',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-04-17',
    isClear: true,
  },
  {
    nin: 'NIN-2016-234567',
    fullName: 'Bah',
    firstName: 'Fatoumata',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-08-30',
    isClear: true,
  },
  {
    nin: 'NIN-2019-456789',
    fullName: 'Touré',
    firstName: 'Abdoulaye',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-02-14',
    isClear: true,
  },
  {
    nin: '1972030456789',
    fullName: 'Camara',
    firstName: 'Ousmane',
    hasRecord: true,
    recordType: 'délit',
    details: 'Délit de vol simple en 2015 — condamnation avec sursis, 2 ans de probation terminée en 2017',
    dateLastCheck: '2024-03-04',
    isClear: false,
  },
  {
    nin: '1991021323456',
    fullName: 'Bangoura',
    firstName: 'Mamadou',
    hasRecord: true,
    recordType: 'délit',
    details: 'Délit d\'escroquerie en 2020 — condamnation à 1 an avec sursis, probation terminée en 2022',
    dateLastCheck: '2024-02-13',
    isClear: false,
  },
  {
    nin: '1971060389012',
    fullName: 'Doubé',
    firstName: 'Facinet',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-06-03',
    isClear: true,
  },
  {
    nin: '1982081612345',
    fullName: 'Soumah',
    firstName: 'Abdoulaye',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-08-16',
    isClear: true,
  },
  {
    nin: '1975040278901',
    fullName: 'Traoré',
    firstName: 'Thierno',
    hasRecord: true,
    recordType: 'contravention',
    details: 'Contravention pour trouble à l\'ordre public en 2021 — amendée, dossier clos',
    dateLastCheck: '2024-04-02',
    isClear: false,
  },
  {
    nin: '1986062845678',
    fullName: 'Sylla',
    firstName: 'Mohamed',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-06-28',
    isClear: true,
  },
  {
    nin: '1968120545678',
    fullName: 'Kouyaté',
    firstName: 'Mamady',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-12-05',
    isClear: true,
  },
  {
    nin: '1987100167890',
    fullName: 'Sy Savané',
    firstName: 'Moussa',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-10-01',
    isClear: true,
  },
  {
    nin: '1995062223456',
    fullName: 'Bangoura',
    firstName: 'Alpha',
    hasRecord: false,
    recordType: 'aucun',
    details: 'Aucun casier judiciaire enregistré — casier vierge',
    dateLastCheck: '2024-06-22',
    isClear: true,
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 4. LAND RECORDS — 10 records (1-2 contested)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LandRecord {
  id: string
  ownerName: string
  ownerFirstName: string
  ownerNIN: string
  parcelNumber: string
  address: string
  area: number
  titleNumber: string
  registrationDate: string
  typePropriete: 'titre_foncier' | 'bail' | 'concession'
  commune: string
  isContested: boolean
}

export const LAND_RECORDS: LandRecord[] = [
  {
    id: 'LR-2024-001',
    ownerName: 'Keita',
    ownerFirstName: 'Lamine',
    ownerNIN: 'NIN-2017-234567',
    parcelNumber: 'PC-KLM-2024-001',
    address: 'Avenue du Port, Kaloum',
    area: 450,
    titleNumber: 'TF-2018-KLM-00345',
    registrationDate: '2018-05-15',
    typePropriete: 'titre_foncier',
    commune: 'Kaloum',
    isContested: false,
  },
  {
    id: 'LR-2024-002',
    ownerName: 'Diallo',
    ownerFirstName: 'Alpha',
    ownerNIN: 'NIN-2017-456789',
    parcelNumber: 'PC-DXN-2024-002',
    address: 'Boulevard du Commerce, Dixinn',
    area: 800,
    titleNumber: 'TF-2015-DXN-00178',
    registrationDate: '2015-09-22',
    typePropriete: 'titre_foncier',
    commune: 'Dixinn',
    isContested: false,
  },
  {
    id: 'LR-2024-003',
    ownerName: 'Touré',
    ownerFirstName: 'Abdoulaye',
    ownerNIN: 'NIN-2019-456789',
    parcelNumber: 'PC-MTM-2024-003',
    address: 'Rue KA-023, Matam',
    area: 350,
    titleNumber: 'BL-2020-MTM-00089',
    registrationDate: '2020-03-10',
    typePropriete: 'bail',
    commune: 'Matam',
    isContested: false,
  },
  {
    id: 'LR-2024-004',
    ownerName: 'Camara',
    ownerFirstName: 'Moussa',
    ownerNIN: 'NIN-2018-567890',
    parcelNumber: 'PC-KND-2024-004',
    address: 'Quartier Sinko, Kindia',
    area: 1200,
    titleNumber: 'TF-2019-KND-00056',
    registrationDate: '2019-07-18',
    typePropriete: 'titre_foncier',
    commune: 'Kindia',
    isContested: true,
  },
  {
    id: 'LR-2024-005',
    ownerName: 'Bah',
    ownerFirstName: 'Fatoumata',
    ownerNIN: 'NIN-2016-234567',
    parcelNumber: 'PC-RTM-2024-005',
    address: 'Cosa, Ratoma',
    area: 600,
    titleNumber: 'CS-2021-RTM-00234',
    registrationDate: '2021-11-05',
    typePropriete: 'concession',
    commune: 'Ratoma',
    isContested: false,
  },
  {
    id: 'LR-2024-006',
    ownerName: 'Sow',
    ownerFirstName: 'Kadiatou',
    ownerNIN: 'NIN-2020-123456',
    parcelNumber: 'PC-KKN-2024-006',
    address: 'Boulevard de la République, Kankan',
    area: 900,
    titleNumber: 'TF-2017-KKN-00112',
    registrationDate: '2017-02-28',
    typePropriete: 'titre_foncier',
    commune: 'Kankan',
    isContested: false,
  },
  {
    id: 'LR-2024-007',
    ownerName: 'Condé',
    ownerFirstName: 'Ibrahim',
    ownerNIN: 'NIN-2016-678901',
    parcelNumber: 'PC-MTT-2024-007',
    address: 'Hamdallaye, Matoto',
    area: 500,
    titleNumber: 'BL-2022-MTT-00078',
    registrationDate: '2022-06-14',
    typePropriete: 'bail',
    commune: 'Matoto',
    isContested: true,
  },
  {
    id: 'LR-2024-008',
    ownerName: 'Doumbouya',
    ownerFirstName: 'Fatou',
    ownerNIN: 'NIN-2021-345678',
    parcelNumber: 'PC-NZR-2024-008',
    address: 'Quartier Gbessia, N\'Zérékoré',
    area: 750,
    titleNumber: 'TF-2020-NZR-00045',
    registrationDate: '2020-08-19',
    typePropriete: 'titre_foncier',
    commune: "N'Zérékoré",
    isContested: false,
  },
  {
    id: 'LR-2024-009',
    ownerName: 'Sylla',
    ownerFirstName: 'Aissatou',
    ownerNIN: 'NIN-2014-345678',
    parcelNumber: 'PC-DXN-2024-009',
    address: 'Belle Vue, Dixinn',
    area: 400,
    titleNumber: 'CS-2019-DXN-00156',
    registrationDate: '2019-04-23',
    typePropriete: 'concession',
    commune: 'Dixinn',
    isContested: false,
  },
  {
    id: 'LR-2024-010',
    ownerName: 'Soumah',
    ownerFirstName: 'Abdoulaye',
    ownerNIN: '1982081612345',
    parcelNumber: 'PC-KND-2024-010',
    address: 'Quartier Madina, Kindia',
    area: 550,
    titleNumber: 'TF-2023-KND-00023',
    registrationDate: '2023-01-16',
    typePropriete: 'titre_foncier',
    commune: 'Kindia',
    isContested: false,
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ENTERPRISE RECORDS — 10 records
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnterpriseRecord {
  id: string
  denomination: string
  typeEntreprise: 'SARL' | 'SA' | 'SASU' | 'SNC'
  gerantName: string
  gerantFirstName: string
  gerantNIN: string
  rccmNumber: string
  dateCreation: string
  secteurActivite: string
  adresseSiege: string
  statut: 'active' | 'en_formation' | 'radiée'
  capitalSocial: number
}

export const ENTERPRISE_RECORDS: EnterpriseRecord[] = [
  {
    id: 'ER-2024-001',
    denomination: 'Diallo & Fils Commerce SARL',
    typeEntreprise: 'SARL',
    gerantName: 'Diallo',
    gerantFirstName: 'Alpha',
    gerantNIN: 'NIN-2017-456789',
    rccmNumber: 'RCCM-CK-2020-A-00145',
    dateCreation: '2020-03-15',
    secteurActivite: 'Commerce général — import/export',
    adresseSiege: 'Avenue de la République, Kaloum, Conakry',
    statut: 'active',
    capitalSocial: 50000000,
  },
  {
    id: 'ER-2024-002',
    denomination: 'Touré Technologies SASU',
    typeEntreprise: 'SASU',
    gerantName: 'Touré',
    gerantFirstName: 'Mariama',
    gerantNIN: 'NIN-2015-567890',
    rccmNumber: 'RCCM-CK-2021-B-00078',
    dateCreation: '2021-07-01',
    secteurActivite: 'Technologies de l\'information et communication',
    adresseSiege: 'Boulevard du Commerce, Dixinn, Conakry',
    statut: 'active',
    capitalSocial: 25000000,
  },
  {
    id: 'ER-2024-003',
    denomination: 'Camara BTP SA',
    typeEntreprise: 'SA',
    gerantName: 'Camara',
    gerantFirstName: 'Ousmane',
    gerantNIN: '1972030456789',
    rccmNumber: 'RCCM-CK-2018-A-00234',
    dateCreation: '2018-01-10',
    secteurActivite: 'Bâtiment et travaux publics',
    adresseSiege: 'Route du Niger, Matoto, Conakry',
    statut: 'active',
    capitalSocial: 200000000,
  },
  {
    id: 'ER-2024-004',
    denomination: 'Keita Agro-Services SARL',
    typeEntreprise: 'SARL',
    gerantName: 'Keita',
    gerantFirstName: 'Mamadou',
    gerantNIN: 'NIN-2016-789012',
    rccmNumber: 'RCCM-KKN-2019-A-00056',
    dateCreation: '2019-05-20',
    secteurActivite: 'Agriculture — transformation et commercialisation',
    adresseSiege: 'Boulevard de la République, Kankan',
    statut: 'active',
    capitalSocial: 30000000,
  },
  {
    id: 'ER-2024-005',
    denomination: 'Bah Logistics SNC',
    typeEntreprise: 'SNC',
    gerantName: 'Bah',
    gerantFirstName: 'Ousmane',
    gerantNIN: 'NIN-2019-567890',
    rccmNumber: 'RCCM-CK-2022-B-00112',
    dateCreation: '2022-09-15',
    secteurActivite: 'Transport et logistique',
    adresseSiege: 'Port Autonome, Kaloum, Conakry',
    statut: 'en_formation',
    capitalSocial: 15000000,
  },
  {
    id: 'ER-2024-006',
    denomination: 'Condé Consult SARL',
    typeEntreprise: 'SARL',
    gerantName: 'Condé',
    gerantFirstName: 'Ibrahim',
    gerantNIN: 'NIN-2016-678901',
    rccmNumber: 'RCCM-CK-2017-A-00345',
    dateCreation: '2017-11-08',
    secteurActivite: 'Conseil et expertise comptable',
    adresseSiege: 'Almamya, Matam, Conakry',
    statut: 'active',
    capitalSocial: 10000000,
  },
  {
    id: 'ER-2024-007',
    denomination: 'Soumah Minérie SARL',
    typeEntreprise: 'SARL',
    gerantName: 'Soumah',
    gerantFirstName: 'Abdoulaye',
    gerantNIN: '1982081612345',
    rccmNumber: 'RCCM-KND-2020-A-00089',
    dateCreation: '2020-02-28',
    secteurActivite: 'Exploitation minière — or et bauxite',
    adresseSiege: 'Route de la Mine, Kindia',
    statut: 'active',
    capitalSocial: 100000000,
  },
  {
    id: 'ER-2024-008',
    denomination: 'Doumbouya Pêche SA',
    typeEntreprise: 'SA',
    gerantName: 'Doumbouya',
    gerantFirstName: 'Sékou',
    gerantNIN: '1965070112345',
    rccmNumber: 'RCCM-NZR-2016-A-00023',
    dateCreation: '2016-04-12',
    secteurActivite: 'Pêche industrielle et artisanale',
    adresseSiege: 'Port de pêche, N\'Zérékoré',
    statut: 'radiée',
    capitalSocial: 75000000,
  },
  {
    id: 'ER-2024-009',
    denomination: 'Sy Savané Pharma SARL',
    typeEntreprise: 'SARL',
    gerantName: 'Sy Savané',
    gerantFirstName: 'Moussa',
    gerantNIN: '1987100167890',
    rccmNumber: 'RCCM-CK-2023-A-00067',
    dateCreation: '2023-06-01',
    secteurActivite: 'Pharmacie et produits médicaux',
    adresseSiege: 'Corniche Nord, Dixinn, Conakry',
    statut: 'active',
    capitalSocial: 40000000,
  },
  {
    id: 'ER-2024-010',
    denomination: 'Doubé Transport SASU',
    typeEntreprise: 'SASU',
    gerantName: 'Doubé',
    gerantFirstName: 'Facinet',
    gerantNIN: '1971060389012',
    rccmNumber: 'RCCM-FRH-2021-B-00034',
    dateCreation: '2021-10-15',
    secteurActivite: 'Transport routier de marchandises',
    adresseSiege: 'Gare routière, Faranah',
    statut: 'active',
    capitalSocial: 20000000,
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 6. EDUCATION RECORDS — 15 records
// ═══════════════════════════════════════════════════════════════════════════════

export interface EducationRecord {
  id: string
  studentName: string
  studentFirstName: string
  studentNIN: string
  etablissement: string
  niveau: 'primaire' | 'secondaire' | 'supérieur'
  diplome: string
  anneeObtention: string
  matricule: string
  statut: 'inscrit' | 'diplômé' | 'radié' | 'en_cours'
  mention: string
  specialite: string
}

export const EDUCATION_RECORDS: EducationRecord[] = [
  {
    id: 'EDR-2024-001',
    studentName: 'Diallo',
    studentFirstName: 'Aminata',
    studentNIN: 'NIN-2019-458723',
    etablissement: 'Université Gamal Abdel Nasser de Conakry',
    niveau: 'supérieur',
    diplome: 'Licence en Droit',
    anneeObtention: '2018',
    matricule: 'UGANC-2014-D-2345',
    statut: 'diplômé',
    mention: 'Assez Bien',
    specialite: 'Droit privé',
  },
  {
    id: 'EDR-2024-002',
    studentName: 'Camara',
    studentFirstName: 'Moussa',
    studentNIN: 'NIN-2018-567890',
    etablissement: 'Université de Kindia',
    niveau: 'supérieur',
    diplome: 'Master en Économie',
    anneeObtention: '2020',
    matricule: 'UKND-2015-E-0789',
    statut: 'diplômé',
    mention: 'Bien',
    specialite: 'Économie du développement',
  },
  {
    id: 'EDR-2024-003',
    studentName: 'Sow',
    studentFirstName: 'Kadiatou',
    studentNIN: 'NIN-2020-123456',
    etablissement: 'Université Julius Nyerere de Kankan',
    niveau: 'supérieur',
    diplome: 'Licence en Gestion',
    anneeObtention: '2016',
    matricule: 'UJNK-2012-G-1234',
    statut: 'diplômé',
    mention: 'Passable',
    specialite: 'Sciences de gestion',
  },
  {
    id: 'EDR-2024-004',
    studentName: 'Keita',
    studentFirstName: 'Lamine',
    studentNIN: 'NIN-2017-234567',
    etablissement: 'Institut Polytechnique de Labé',
    niveau: 'supérieur',
    diplome: 'Ingénieur en Agronomie',
    anneeObtention: '2010',
    matricule: 'IPL-2005-A-0456',
    statut: 'diplômé',
    mention: 'Bien',
    specialite: 'Agronomie générale',
  },
  {
    id: 'EDR-2024-005',
    studentName: 'Doumbouya',
    studentFirstName: 'Fatou',
    studentNIN: 'NIN-2021-345678',
    etablissement: 'Lycée de N\'Zérékoré',
    niveau: 'secondaire',
    diplome: 'Baccalauréat série D',
    anneeObtention: '2017',
    matricule: 'LNZR-2016-D-0678',
    statut: 'diplômé',
    mention: 'Assez Bien',
    specialite: 'Sciences de la nature',
  },
  {
    id: 'EDR-2024-006',
    studentName: 'Touré',
    studentFirstName: 'Mariama',
    studentNIN: 'NIN-2015-567890',
    etablissement: 'Université Gamal Abdel Nasser de Conakry',
    niveau: 'supérieur',
    diplome: 'Master en Informatique',
    anneeObtention: '2019',
    matricule: 'UGANC-2014-I-3456',
    statut: 'diplômé',
    mention: 'Très Bien',
    specialite: 'Génie logiciel',
  },
  {
    id: 'EDR-2024-007',
    studentName: 'Condé',
    studentFirstName: 'Ibrahim',
    studentNIN: 'NIN-2016-678901',
    etablissement: 'Université Gamal Abdel Nasser de Conakry',
    niveau: 'supérieur',
    diplome: 'Doctorat en Médecine',
    anneeObtention: '2015',
    matricule: 'UGANC-2005-M-0123',
    statut: 'diplômé',
    mention: 'Bien',
    specialite: 'Médecine générale',
  },
  {
    id: 'EDR-2024-008',
    studentName: 'Bah',
    studentFirstName: 'Ousmane',
    studentNIN: 'NIN-2019-567890',
    etablissement: 'École Supérieure de Commerce de Conakry',
    niveau: 'supérieur',
    diplome: '',
    anneeObtention: '',
    matricule: 'ESCC-2022-C-0567',
    statut: 'en_cours',
    mention: '',
    specialite: 'Commerce international',
  },
  {
    id: 'EDR-2024-009',
    studentName: 'Diallo',
    studentFirstName: 'Alpha',
    studentNIN: 'NIN-2017-456789',
    etablissement: 'Université Gamal Abdel Nasser de Conakry',
    niveau: 'supérieur',
    diplome: 'Licence en Administration Publique',
    anneeObtention: '2003',
    matricule: 'UGANC-1999-AP-0890',
    statut: 'diplômé',
    mention: 'Assez Bien',
    specialite: 'Administration publique',
  },
  {
    id: 'EDR-2024-010',
    studentName: 'Sy Savané',
    studentFirstName: 'Aminata',
    studentNIN: 'NIN-2022-890123',
    etablissement: 'Collège de Boké',
    niveau: 'secondaire',
    diplome: 'BEPC',
    anneeObtention: '2022',
    matricule: 'CBKE-2021-B-0234',
    statut: 'inscrit',
    mention: 'Assez Bien',
    specialite: 'Général',
  },
  {
    id: 'EDR-2024-011',
    studentName: 'Doubé',
    studentFirstName: 'Mamadou',
    studentNIN: 'NIN-2013-901234',
    etablissement: 'Université Julius Nyerere de Kankan',
    niveau: 'supérieur',
    diplome: 'Licence en Lettres Modernes',
    anneeObtention: '2012',
    matricule: 'UJNK-2008-L-1456',
    statut: 'diplômé',
    mention: 'Passable',
    specialite: 'Lettres modernes',
  },
  {
    id: 'EDR-2024-012',
    studentName: 'Kaba',
    studentFirstName: 'Moussa',
    studentNIN: '2003091867890',
    etablissement: 'Lycée de Labé',
    niveau: 'secondaire',
    diplome: '',
    anneeObtention: '',
    matricule: 'LLBE-2021-S-0789',
    statut: 'en_cours',
    mention: '',
    specialite: 'Série C',
  },
  {
    id: 'EDR-2024-013',
    studentName: 'Soumah',
    studentFirstName: 'Fatoumata',
    studentNIN: '2000040889012',
    etablissement: 'Lycée 2 de Mamou',
    niveau: 'secondaire',
    diplome: 'Baccalauréat série A',
    anneeObtention: '2020',
    matricule: 'L2MM-2019-A-0112',
    statut: 'diplômé',
    mention: 'Bien',
    specialite: 'Lettres et philosophie',
  },
  {
    id: 'EDR-2024-014',
    studentName: 'Bangoura',
    studentFirstName: 'Alpha',
    studentNIN: '1995062223456',
    etablissement: 'Institut Supérieur des Mines de Kindia',
    niveau: 'supérieur',
    diplome: '',
    anneeObtention: '',
    matricule: 'ISMK-2023-M-0345',
    statut: 'radié',
    mention: '',
    specialite: 'Mines et géologie',
  },
  {
    id: 'EDR-2024-015',
    studentName: 'Traoré',
    studentFirstName: 'Kadiatou',
    studentNIN: '1980031590123',
    etablissement: 'École Primaire de Kankan',
    niveau: 'primaire',
    diplome: 'CEPE',
    anneeObtention: '1992',
    matricule: 'EPKK-1991-C-0567',
    statut: 'diplômé',
    mention: '',
    specialite: 'Général',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 7. VACCINATION RECORDS — 15 records
// ═══════════════════════════════════════════════════════════════════════════════

export interface VaccinationRecord {
  id: string
  citizenName: string
  citizenFirstName: string
  citizenNIN: string
  vaccines: Array<{
    name: string
    date: string
    dose: number
    lot: string
  }>
  isComplete: boolean
  lastUpdate: string
  centreVaccination: string
}

export const VACCINATION_RECORDS: VaccinationRecord[] = [
  {
    id: 'VR-2024-001',
    citizenName: 'Diallo',
    citizenFirstName: 'Aminata',
    citizenNIN: 'NIN-2019-458723',
    vaccines: [
      { name: 'BCG', date: '1995-04-01', dose: 1, lot: 'BCG-95-KLM-001' },
      { name: 'VPO (Polio)', date: '1995-04-01', dose: 1, lot: 'VPO-95-KLM-001' },
      { name: 'VPO (Polio)', date: '1995-06-01', dose: 2, lot: 'VPO-95-KLM-002' },
      { name: 'VPO (Polio)', date: '1995-08-01', dose: 3, lot: 'VPO-95-KLM-003' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1995-06-01', dose: 1, lot: 'DTC-95-KLM-001' },
      { name: 'Rougeole', date: '1996-04-01', dose: 1, lot: 'ROU-96-KLM-001' },
      { name: 'COVID-19 (AstraZeneca)', date: '2021-08-15', dose: 1, lot: 'AZ-21-GN-0456' },
      { name: 'COVID-19 (AstraZeneca)', date: '2021-11-20', dose: 2, lot: 'AZ-21-GN-0789' },
      { name: 'Fièvre Jaune', date: '2018-03-10', dose: 1, lot: 'FJ-18-GN-0123' },
    ],
    isComplete: true,
    lastUpdate: '2021-11-20',
    centreVaccination: 'Centre de Santé de Kaloum',
  },
  {
    id: 'VR-2024-002',
    citizenName: 'Camara',
    citizenFirstName: 'Moussa',
    citizenNIN: 'NIN-2018-567890',
    vaccines: [
      { name: 'BCG', date: '1988-08-01', dose: 1, lot: 'BCG-88-KND-001' },
      { name: 'VPO (Polio)', date: '1988-08-01', dose: 1, lot: 'VPO-88-KND-001' },
      { name: 'VPO (Polio)', date: '1988-10-01', dose: 2, lot: 'VPO-88-KND-002' },
      { name: 'VPO (Polio)', date: '1988-12-01', dose: 3, lot: 'VPO-88-KND-003' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1988-10-01', dose: 1, lot: 'DTC-88-KND-001' },
      { name: 'Rougeole', date: '1989-08-01', dose: 1, lot: 'ROU-89-KND-001' },
      { name: 'COVID-19 (Johnson & Johnson)', date: '2021-09-05', dose: 1, lot: 'JNJ-21-GN-0234' },
      { name: 'Fièvre Jaune', date: '2019-06-22', dose: 1, lot: 'FJ-19-GN-0567' },
    ],
    isComplete: true,
    lastUpdate: '2021-09-05',
    centreVaccination: 'Hôpital Régional de Kindia',
  },
  {
    id: 'VR-2024-003',
    citizenName: 'Sow',
    citizenFirstName: 'Kadiatou',
    citizenNIN: 'NIN-2020-123456',
    vaccines: [
      { name: 'BCG', date: '1992-12-01', dose: 1, lot: 'BCG-92-KKN-001' },
      { name: 'VPO (Polio)', date: '1992-12-01', dose: 1, lot: 'VPO-92-KKN-001' },
      { name: 'VPO (Polio)', date: '1993-02-01', dose: 2, lot: 'VPO-93-KKN-002' },
      { name: 'COVID-19 (Pfizer)', date: '2022-01-15', dose: 1, lot: 'PFE-22-GN-0890' },
    ],
    isComplete: false,
    lastUpdate: '2022-01-15',
    centreVaccination: 'Centre de Santé de Kankan',
  },
  {
    id: 'VR-2024-004',
    citizenName: 'Keita',
    citizenFirstName: 'Lamine',
    citizenNIN: 'NIN-2017-234567',
    vaccines: [
      { name: 'BCG', date: '1985-03-01', dose: 1, lot: 'BCG-85-LBE-001' },
      { name: 'VPO (Polio)', date: '1985-03-01', dose: 1, lot: 'VPO-85-LBE-001' },
      { name: 'VPO (Polio)', date: '1985-05-01', dose: 2, lot: 'VPO-85-LBE-002' },
      { name: 'VPO (Polio)', date: '1985-07-01', dose: 3, lot: 'VPO-85-LBE-003' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1985-05-01', dose: 1, lot: 'DTC-85-LBE-001' },
      { name: 'Rougeole', date: '1986-03-01', dose: 1, lot: 'ROU-86-LBE-001' },
      { name: 'Fièvre Jaune', date: '2017-05-10', dose: 1, lot: 'FJ-17-GN-0345' },
      { name: 'Méningite', date: '2017-05-10', dose: 1, lot: 'MEN-17-GN-0678' },
    ],
    isComplete: true,
    lastUpdate: '2017-05-10',
    centreVaccination: 'Hôpital Régional de Labé',
  },
  {
    id: 'VR-2024-005',
    citizenName: 'Doumbouya',
    citizenFirstName: 'Fatou',
    citizenNIN: 'NIN-2021-345678',
    vaccines: [
      { name: 'BCG', date: '1997-06-01', dose: 1, lot: 'BCG-97-NZR-001' },
      { name: 'VPO (Polio)', date: '1997-06-01', dose: 1, lot: 'VPO-97-NZR-001' },
      { name: 'VPO (Polio)', date: '1997-08-01', dose: 2, lot: 'VPO-97-NZR-002' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1997-08-01', dose: 1, lot: 'DTC-97-NZR-001' },
      { name: 'COVID-19 (AstraZeneca)', date: '2021-07-20', dose: 1, lot: 'AZ-21-GN-0345' },
      { name: 'COVID-19 (AstraZeneca)', date: '2021-10-25', dose: 2, lot: 'AZ-21-GN-0567' },
    ],
    isComplete: false,
    lastUpdate: '2021-10-25',
    centreVaccination: 'Centre de Santé de N\'Zérékoré',
  },
  {
    id: 'VR-2024-006',
    citizenName: 'Touré',
    citizenFirstName: 'Mariama',
    citizenNIN: 'NIN-2015-567890',
    vaccines: [
      { name: 'BCG', date: '1990-10-01', dose: 1, lot: 'BCG-90-DXN-001' },
      { name: 'VPO (Polio)', date: '1990-10-01', dose: 1, lot: 'VPO-90-DXN-001' },
      { name: 'VPO (Polio)', date: '1990-12-01', dose: 2, lot: 'VPO-90-DXN-002' },
      { name: 'VPO (Polio)', date: '1991-02-01', dose: 3, lot: 'VPO-91-DXN-003' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1990-12-01', dose: 1, lot: 'DTC-90-DXN-001' },
      { name: 'Rougeole', date: '1991-10-01', dose: 1, lot: 'ROU-91-DXN-001' },
      { name: 'Fièvre Jaune', date: '2020-02-14', dose: 1, lot: 'FJ-20-GN-0123' },
      { name: 'COVID-19 (Sinopharm)', date: '2021-06-10', dose: 1, lot: 'SNP-21-GN-0456' },
      { name: 'COVID-19 (Sinopharm)', date: '2021-09-10', dose: 2, lot: 'SNP-21-GN-0789' },
    ],
    isComplete: true,
    lastUpdate: '2021-09-10',
    centreVaccination: 'Centre de Vaccination de Dixinn',
  },
  {
    id: 'VR-2024-007',
    citizenName: 'Condé',
    citizenFirstName: 'Ibrahim',
    citizenNIN: 'NIN-2016-678901',
    vaccines: [
      { name: 'BCG', date: '1983-07-01', dose: 1, lot: 'BCG-83-MTM-001' },
      { name: 'VPO (Polio)', date: '1983-07-01', dose: 1, lot: 'VPO-83-MTM-001' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1983-09-01', dose: 1, lot: 'DTC-83-MTM-001' },
      { name: 'Rougeole', date: '1984-07-01', dose: 1, lot: 'ROU-84-MTM-001' },
      { name: 'Fièvre Jaune', date: '2015-08-22', dose: 1, lot: 'FJ-15-GN-0567' },
      { name: 'COVID-19 (AstraZeneca)', date: '2021-04-05', dose: 1, lot: 'AZ-21-GN-0012' },
      { name: 'COVID-19 (AstraZeneca)', date: '2021-07-05', dose: 2, lot: 'AZ-21-GN-0234' },
    ],
    isComplete: true,
    lastUpdate: '2021-07-05',
    centreVaccination: 'Hôpital National Donka',
  },
  {
    id: 'VR-2024-008',
    citizenName: 'Bah',
    citizenFirstName: 'Fatoumata',
    citizenNIN: 'NIN-2016-234567',
    vaccines: [
      { name: 'BCG', date: '1993-09-01', dose: 1, lot: 'BCG-93-RTM-001' },
      { name: 'VPO (Polio)', date: '1993-09-01', dose: 1, lot: 'VPO-93-RTM-001' },
      { name: 'VPO (Polio)', date: '1993-11-01', dose: 2, lot: 'VPO-93-RTM-002' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1993-11-01', dose: 1, lot: 'DTC-93-RTM-001' },
      { name: 'Rougeole', date: '1994-09-01', dose: 1, lot: 'ROU-94-RTM-001' },
      { name: 'COVID-19 (Pfizer)', date: '2022-03-12', dose: 1, lot: 'PFE-22-GN-0123' },
      { name: 'COVID-19 (Pfizer)', date: '2022-06-12', dose: 2, lot: 'PFE-22-GN-0456' },
      { name: 'Fièvre Jaune', date: '2019-09-01', dose: 1, lot: 'FJ-19-GN-0890' },
    ],
    isComplete: true,
    lastUpdate: '2022-06-12',
    centreVaccination: 'Centre de Santé de Ratoma',
  },
  {
    id: 'VR-2024-009',
    citizenName: 'Doubé',
    citizenFirstName: 'Aïssatou',
    citizenNIN: 'NIN-2022-456789',
    vaccines: [
      { name: 'BCG', date: '2000-05-01', dose: 1, lot: 'BCG-00-MMO-001' },
      { name: 'VPO (Polio)', date: '2000-05-01', dose: 1, lot: 'VPO-00-MMO-001' },
      { name: 'VPO (Polio)', date: '2000-07-01', dose: 2, lot: 'VPO-00-MMO-002' },
    ],
    isComplete: false,
    lastUpdate: '2000-07-01',
    centreVaccination: 'Centre de Santé de Mamou',
  },
  {
    id: 'VR-2024-010',
    citizenName: 'Sy Savané',
    citizenFirstName: 'Ibrahim',
    citizenNIN: 'NIN-2019-678234',
    vaccines: [
      { name: 'BCG', date: '1995-02-01', dose: 1, lot: 'BCG-95-KLM-002' },
      { name: 'VPO (Polio)', date: '1995-02-01', dose: 1, lot: 'VPO-95-KLM-004' },
      { name: 'VPO (Polio)', date: '1995-04-01', dose: 2, lot: 'VPO-95-KLM-005' },
      { name: 'VPO (Polio)', date: '1995-06-01', dose: 3, lot: 'VPO-95-KLM-006' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1995-04-01', dose: 1, lot: 'DTC-95-KLM-002' },
      { name: 'Rougeole', date: '1996-02-01', dose: 1, lot: 'ROU-96-KLM-002' },
      { name: 'Fièvre Jaune', date: '2018-07-18', dose: 1, lot: 'FJ-18-GN-0345' },
      { name: 'COVID-19 (AstraZeneca)', date: '2021-05-20', dose: 1, lot: 'AZ-21-GN-0567' },
      { name: 'COVID-19 (AstraZeneca)', date: '2021-08-20', dose: 2, lot: 'AZ-21-GN-0890' },
    ],
    isComplete: true,
    lastUpdate: '2021-08-20',
    centreVaccination: 'Hôpital Ignace Deen',
  },
  {
    id: 'VR-2024-011',
    citizenName: 'Soumah',
    citizenFirstName: 'Mamadou',
    citizenNIN: 'NIN-2021-567890',
    vaccines: [
      { name: 'BCG', date: '1985-07-01', dose: 1, lot: 'BCG-85-KND-001' },
      { name: 'VPO (Polio)', date: '1985-07-01', dose: 1, lot: 'VPO-85-KND-001' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1985-09-01', dose: 1, lot: 'DTC-85-KND-001' },
      { name: 'Rougeole', date: '1986-07-01', dose: 1, lot: 'ROU-86-KND-001' },
      { name: 'Fièvre Jaune', date: '2020-06-19', dose: 1, lot: 'FJ-20-GN-0456' },
    ],
    isComplete: true,
    lastUpdate: '2020-06-19',
    centreVaccination: 'Centre de Santé de Matam',
  },
  {
    id: 'VR-2024-012',
    citizenName: 'Diallo',
    citizenFirstName: 'Fatoumata',
    citizenNIN: 'NIN-2020-678901',
    vaccines: [
      { name: 'BCG', date: '1995-03-01', dose: 1, lot: 'BCG-95-KLM-003' },
      { name: 'VPO (Polio)', date: '1995-03-01', dose: 1, lot: 'VPO-95-KLM-007' },
      { name: 'COVID-19 (Johnson & Johnson)', date: '2022-02-10', dose: 1, lot: 'JNJ-22-GN-0123' },
    ],
    isComplete: false,
    lastUpdate: '2022-02-10',
    centreVaccination: 'Centre de Santé de Kankan',
  },
  {
    id: 'VR-2024-013',
    citizenName: 'Touré',
    citizenFirstName: 'Ibrahim',
    citizenNIN: 'NIN-2019-789012',
    vaccines: [
      { name: 'BCG', date: '1980-05-01', dose: 1, lot: 'BCG-80-KLM-001' },
      { name: 'VPO (Polio)', date: '1980-05-01', dose: 1, lot: 'VPO-80-KLM-001' },
      { name: 'VPO (Polio)', date: '1980-07-01', dose: 2, lot: 'VPO-80-KLM-002' },
      { name: 'VPO (Polio)', date: '1980-09-01', dose: 3, lot: 'VPO-80-KLM-003' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1980-07-01', dose: 1, lot: 'DTC-80-KLM-001' },
      { name: 'Rougeole', date: '1981-05-01', dose: 1, lot: 'ROU-81-KLM-001' },
    ],
    isComplete: false,
    lastUpdate: '1981-05-01',
    centreVaccination: 'Centre de Santé de Labé',
  },
  {
    id: 'VR-2024-014',
    citizenName: 'Bah',
    citizenFirstName: 'Kadiatou',
    citizenNIN: 'NIN-2018-890123',
    vaccines: [
      { name: 'BCG', date: '1990-12-01', dose: 1, lot: 'BCG-90-DXN-002' },
      { name: 'VPO (Polio)', date: '1990-12-01', dose: 1, lot: 'VPO-90-DXN-004' },
      { name: 'VPO (Polio)', date: '1991-02-01', dose: 2, lot: 'VPO-91-DXN-005' },
      { name: 'VPO (Polio)', date: '1991-04-01', dose: 3, lot: 'VPO-91-DXN-006' },
      { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', date: '1991-02-01', dose: 1, lot: 'DTC-91-DXN-002' },
      { name: 'Rougeole', date: '1991-12-01', dose: 1, lot: 'ROU-91-DXN-002' },
      { name: 'Fièvre Jaune', date: '2020-01-15', dose: 1, lot: 'FJ-20-GN-0789' },
      { name: 'COVID-19 (Sinopharm)', date: '2021-05-01', dose: 1, lot: 'SNP-21-GN-0123' },
      { name: 'COVID-19 (Sinopharm)', date: '2021-08-01', dose: 2, lot: 'SNP-21-GN-0456' },
    ],
    isComplete: true,
    lastUpdate: '2021-08-01',
    centreVaccination: 'Centre de Vaccination de Dixinn',
  },
  {
    id: 'VR-2024-015',
    citizenName: 'Doumbouya',
    citizenFirstName: 'Mamadou',
    citizenNIN: 'NIN-2018-567123',
    vaccines: [
      { name: 'BCG', date: '1970-01-01', dose: 1, lot: 'BCG-70-KLM-001' },
      { name: 'VPO (Polio)', date: '1970-01-01', dose: 1, lot: 'VPO-70-KLM-001' },
      { name: 'COVID-19 (AstraZeneca)', date: '2021-06-15', dose: 1, lot: 'AZ-21-GN-0234' },
      { name: 'COVID-19 (AstraZeneca)', date: '2021-09-15', dose: 2, lot: 'AZ-21-GN-0567' },
      { name: 'Fièvre Jaune', date: '2019-03-20', dose: 1, lot: 'FJ-19-GN-0123' },
    ],
    isComplete: true,
    lastUpdate: '2021-09-15',
    centreVaccination: 'Centre de Santé de Kaloum',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 8. TAX RECORDS — 10 records
// ═══════════════════════════════════════════════════════════════════════════════

export interface TaxRecord {
  nin: string
  taxpayerName: string
  taxpayerFirstName: string
  numeroNIF: string
  anneeFiscale: string
  revenuDeclare: number
  impotDu: number
  statutPaiement: 'à_jour' | 'impayé' | 'partiel'
  derniereDeclaration: string
  typeContribuable: 'particulier' | 'entreprise'
}

export const TAX_RECORDS: TaxRecord[] = [
  {
    nin: 'NIN-2019-458723',
    taxpayerName: 'Diallo',
    taxpayerFirstName: 'Aminata',
    numeroNIF: 'NIF-2019-458723',
    anneeFiscale: '2024',
    revenuDeclare: 24000000,
    impotDu: 1800000,
    statutPaiement: 'à_jour',
    derniereDeclaration: '2024-03-15',
    typeContribuable: 'particulier',
  },
  {
    nin: 'NIN-2018-567890',
    taxpayerName: 'Camara',
    taxpayerFirstName: 'Moussa',
    numeroNIF: 'NIF-2018-567890',
    anneeFiscale: '2024',
    revenuDeclare: 36000000,
    impotDu: 3200000,
    statutPaiement: 'partiel',
    derniereDeclaration: '2024-04-22',
    typeContribuable: 'particulier',
  },
  {
    nin: 'NIN-2017-456789',
    taxpayerName: 'Diallo',
    taxpayerFirstName: 'Alpha',
    numeroNIF: 'NIF-2020-00145',
    anneeFiscale: '2024',
    revenuDeclare: 150000000,
    impotDu: 18000000,
    statutPaiement: 'à_jour',
    derniereDeclaration: '2024-03-20',
    typeContribuable: 'entreprise',
  },
  {
    nin: 'NIN-2015-567890',
    taxpayerName: 'Touré',
    taxpayerFirstName: 'Mariama',
    numeroNIF: 'NIF-2021-00078',
    anneeFiscale: '2024',
    revenuDeclare: 85000000,
    impotDu: 9500000,
    statutPaiement: 'à_jour',
    derniereDeclaration: '2024-02-28',
    typeContribuable: 'entreprise',
  },
  {
    nin: 'NIN-2016-678901',
    taxpayerName: 'Condé',
    taxpayerFirstName: 'Ibrahim',
    numeroNIF: 'NIF-2017-00345',
    anneeFiscale: '2024',
    revenuDeclare: 48000000,
    impotDu: 4200000,
    statutPaiement: 'impayé',
    derniereDeclaration: '2023-11-08',
    typeContribuable: 'particulier',
  },
  {
    nin: 'NIN-2020-123456',
    taxpayerName: 'Sow',
    taxpayerFirstName: 'Kadiatou',
    numeroNIF: 'NIF-2020-123456',
    anneeFiscale: '2024',
    revenuDeclare: 18000000,
    impotDu: 1200000,
    statutPaiement: 'à_jour',
    derniereDeclaration: '2024-03-10',
    typeContribuable: 'particulier',
  },
  {
    nin: 'NIN-2017-234567',
    taxpayerName: 'Keita',
    taxpayerFirstName: 'Lamine',
    numeroNIF: 'NIF-2017-234567',
    anneeFiscale: '2024',
    revenuDeclare: 22000000,
    impotDu: 1600000,
    statutPaiement: 'à_jour',
    derniereDeclaration: '2024-04-01',
    typeContribuable: 'particulier',
  },
  {
    nin: 'NIN-2019-567890',
    taxpayerName: 'Bah',
    taxpayerFirstName: 'Ousmane',
    numeroNIF: 'NIF-2022-00112',
    anneeFiscale: '2024',
    revenuDeclare: 15000000,
    impotDu: 900000,
    statutPaiement: 'partiel',
    derniereDeclaration: '2024-05-15',
    typeContribuable: 'entreprise',
  },
  {
    nin: 'NIN-2016-234567',
    taxpayerName: 'Bah',
    taxpayerFirstName: 'Fatoumata',
    numeroNIF: 'NIF-2016-234567',
    anneeFiscale: '2024',
    revenuDeclare: 15000000,
    impotDu: 900000,
    statutPaiement: 'à_jour',
    derniereDeclaration: '2024-03-01',
    typeContribuable: 'particulier',
  },
  {
    nin: '1982081612345',
    taxpayerName: 'Soumah',
    taxpayerFirstName: 'Abdoulaye',
    numeroNIF: 'NIF-2020-00089',
    anneeFiscale: '2024',
    revenuDeclare: 120000000,
    impotDu: 14000000,
    statutPaiement: 'impayé',
    derniereDeclaration: '2023-08-16',
    typeContribuable: 'entreprise',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 9. SOCIAL SECURITY RECORDS — 10 records
// ═══════════════════════════════════════════════════════════════════════════════

export interface SocialSecurityRecord {
  nin: string
  beneficiaryName: string
  beneficiaryFirstName: string
  numeroSecuriteSociale: string
  regime: 'CNSS' | 'fonction_publique' | 'privé'
  employeur: string
  nombreEnfants: number
  statut: 'affilié' | 'non_affilié' | 'radié'
  dateAffiliation: string
}

export const SOCIAL_SECURITY_RECORDS: SocialSecurityRecord[] = [
  {
    nin: 'NIN-2019-458723',
    beneficiaryName: 'Diallo',
    beneficiaryFirstName: 'Aminata',
    numeroSecuriteSociale: 'CNSS-2019-458723',
    regime: 'CNSS',
    employeur: 'Ministère de l\'Éducation Nationale',
    nombreEnfants: 2,
    statut: 'affilié',
    dateAffiliation: '2019-09-01',
  },
  {
    nin: 'NIN-2018-567890',
    beneficiaryName: 'Camara',
    beneficiaryFirstName: 'Moussa',
    numeroSecuriteSociale: 'CNSS-2018-567890',
    regime: 'privé',
    employeur: 'Camara BTP SA',
    nombreEnfants: 3,
    statut: 'affilié',
    dateAffiliation: '2018-02-15',
  },
  {
    nin: 'NIN-2017-456789',
    beneficiaryName: 'Diallo',
    beneficiaryFirstName: 'Alpha',
    numeroSecuriteSociale: 'CNSS-2020-00145',
    regime: 'privé',
    employeur: 'Diallo & Fils Commerce SARL',
    nombreEnfants: 4,
    statut: 'affilié',
    dateAffiliation: '2020-04-01',
  },
  {
    nin: 'NIN-2016-678901',
    beneficiaryName: 'Condé',
    beneficiaryFirstName: 'Ibrahim',
    numeroSecuriteSociale: 'FP-2016-678901',
    regime: 'fonction_publique',
    employeur: 'Hôpital National Donka',
    nombreEnfants: 2,
    statut: 'affilié',
    dateAffiliation: '2016-01-15',
  },
  {
    nin: 'NIN-2015-567890',
    beneficiaryName: 'Touré',
    beneficiaryFirstName: 'Mariama',
    numeroSecuriteSociale: 'CNSS-2021-00078',
    regime: 'privé',
    employeur: 'Touré Technologies SASU',
    nombreEnfants: 1,
    statut: 'affilié',
    dateAffiliation: '2021-08-01',
  },
  {
    nin: 'NIN-2020-123456',
    beneficiaryName: 'Sow',
    beneficiaryFirstName: 'Kadiatou',
    numeroSecuriteSociale: 'CNSS-2020-123456',
    regime: 'CNSS',
    employeur: 'Banque Internationale pour le Commerce et l\'Industrie',
    nombreEnfants: 0,
    statut: 'affilié',
    dateAffiliation: '2020-06-01',
  },
  {
    nin: 'NIN-2017-234567',
    beneficiaryName: 'Keita',
    beneficiaryFirstName: 'Lamine',
    numeroSecuriteSociale: 'CNSS-2017-234567',
    regime: 'privé',
    employeur: 'Office National des Forêts',
    nombreEnfants: 3,
    statut: 'radié',
    dateAffiliation: '2010-03-01',
  },
  {
    nin: 'NIN-2016-234567',
    beneficiaryName: 'Bah',
    beneficiaryFirstName: 'Fatoumata',
    numeroSecuriteSociale: 'FP-2016-234567',
    regime: 'fonction_publique',
    employeur: 'Direction Nationale de l\'Enseignement Primaire',
    nombreEnfants: 2,
    statut: 'affilié',
    dateAffiliation: '2016-09-01',
  },
  {
    nin: 'NIN-2019-456789',
    beneficiaryName: 'Touré',
    beneficiaryFirstName: 'Abdoulaye',
    numeroSecuriteSociale: 'CNSS-2019-456789',
    regime: 'CNSS',
    employeur: 'Société des Bauxites de Guinée',
    nombreEnfants: 5,
    statut: 'affilié',
    dateAffiliation: '2005-01-10',
  },
  {
    nin: 'NIN-2021-345678',
    beneficiaryName: 'Doumbouya',
    beneficiaryFirstName: 'Fatou',
    numeroSecuriteSociale: '',
    regime: 'privé',
    employeur: '',
    nombreEnfants: 0,
    statut: 'non_affilié',
    dateAffiliation: '',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 10. CONSTRUCTION RECORDS — 8 records
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConstructionRecord {
  id: string
  ownerName: string
  ownerFirstName: string
  ownerNIN: string
  permitNumber: string
  address: string
  typeConstruction: string
  datePermis: string
  statutConformite: 'conforme' | 'non_conforme' | 'en_cours'
  dateReceptionTravaux: string
  commune: string
}

export const CONSTRUCTION_RECORDS: ConstructionRecord[] = [
  {
    id: 'CR-2024-001',
    ownerName: 'Keita',
    ownerFirstName: 'Ibrahim',
    ownerNIN: '1979102289012',
    permitNumber: 'PC-2022-DXN-001',
    address: 'Belle Vue, Dixinn',
    typeConstruction: 'Villa R+2 résidentielle',
    datePermis: '2022-03-15',
    statutConformite: 'conforme',
    dateReceptionTravaux: '2023-09-20',
    commune: 'Dixinn',
  },
  {
    id: 'CR-2024-002',
    ownerName: 'Diallo',
    ownerFirstName: 'Mariama',
    ownerNIN: 'NIN-2016-345678',
    permitNumber: 'PC-2023-KLM-002',
    address: 'Avenue de la République, Kaloum',
    typeConstruction: 'Immeuble R+3 commercial',
    datePermis: '2023-01-20',
    statutConformite: 'en_cours',
    dateReceptionTravaux: '',
    commune: 'Kaloum',
  },
  {
    id: 'CR-2024-003',
    ownerName: 'Touré',
    ownerFirstName: 'Mamadou',
    ownerNIN: 'NIN-2020-789012',
    permitNumber: 'PC-2021-KND-003',
    address: 'Quartier Sinko, Kindia',
    typeConstruction: 'Villa R+1 résidentielle',
    datePermis: '2021-06-10',
    statutConformite: 'conforme',
    dateReceptionTravaux: '2022-08-15',
    commune: 'Kindia',
  },
  {
    id: 'CR-2024-004',
    ownerName: 'Sow',
    ownerFirstName: 'Fatou',
    ownerNIN: 'NIN-2018-567890',
    permitNumber: 'PC-2023-KKN-004',
    address: 'Boulevard de la République, Kankan',
    typeConstruction: 'Entrepôt commercial',
    datePermis: '2023-04-05',
    statutConformite: 'non_conforme',
    dateReceptionTravaux: '2024-02-28',
    commune: 'Kankan',
  },
  {
    id: 'CR-2024-005',
    ownerName: 'Camara',
    ownerFirstName: 'Abdoulaye',
    ownerNIN: 'NIN-2019-678901',
    permitNumber: 'PC-2022-MTT-005',
    address: 'Hamdallaye, Matoto',
    typeConstruction: 'Villa R+2 résidentielle',
    datePermis: '2022-09-12',
    statutConformite: 'conforme',
    dateReceptionTravaux: '2024-01-10',
    commune: 'Matoto',
  },
  {
    id: 'CR-2024-006',
    ownerName: 'Bah',
    ownerFirstName: 'Ousmane',
    ownerNIN: 'NIN-2014-789012',
    permitNumber: 'PC-2024-BKE-006',
    address: 'Quartier Centre-Ville, Boké',
    typeConstruction: 'Complexe commercial R+1',
    datePermis: '2024-02-14',
    statutConformite: 'en_cours',
    dateReceptionTravaux: '',
    commune: 'Boké',
  },
  {
    id: 'CR-2024-007',
    ownerName: 'Condé',
    ownerFirstName: 'Kadiatou',
    ownerNIN: 'NIN-2020-678901',
    permitNumber: 'PC-2023-LBE-007',
    address: 'Quartier Donghol, Labé',
    typeConstruction: 'Maison individuelle R+1',
    datePermis: '2023-07-22',
    statutConformite: 'conforme',
    dateReceptionTravaux: '2024-06-30',
    commune: 'Labé',
  },
  {
    id: 'CR-2024-008',
    ownerName: 'Doumbouya',
    ownerFirstName: 'Mamadou',
    ownerNIN: 'NIN-2018-567123',
    permitNumber: 'PC-2021-KLM-008',
    address: 'Almamya, Kaloum',
    typeConstruction: 'Immeuble R+4 mixte',
    datePermis: '2021-11-05',
    statutConformite: 'non_conforme',
    dateReceptionTravaux: '2023-12-20',
    commune: 'Kaloum',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 11. DRIVING RECORDS — 10 records
// ═══════════════════════════════════════════════════════════════════════════════

export interface DrivingRecord {
  nin: string
  driverName: string
  driverFirstName: string
  permitNumber: string
  categorie: 'A' | 'B' | 'C' | 'D' | 'E'
  dateDelivrance: string
  dateExpiration: string
  points: number
  infractions: number
  statut: 'valide' | 'expiré' | 'suspendu'
}

export const DRIVING_RECORDS: DrivingRecord[] = [
  {
    nin: 'NIN-2018-789012',
    driverName: 'Sow',
    driverFirstName: 'Mamadou',
    permitNumber: 'PC-B-2020-458723',
    categorie: 'B',
    dateDelivrance: '2020-06-15',
    dateExpiration: '2030-06-15',
    points: 12,
    infractions: 0,
    statut: 'valide',
  },
  {
    nin: 'NIN-2019-890123',
    driverName: 'Camara',
    driverFirstName: 'Fatoumata',
    permitNumber: 'PC-B-2021-567890',
    categorie: 'B',
    dateDelivrance: '2021-03-20',
    dateExpiration: '2031-03-20',
    points: 10,
    infractions: 2,
    statut: 'valide',
  },
  {
    nin: 'NIN-2020-901234',
    driverName: 'Touré',
    driverFirstName: 'Ousmane',
    permitNumber: 'PC-C-2022-345678',
    categorie: 'C',
    dateDelivrance: '2022-01-10',
    dateExpiration: '2032-01-10',
    points: 12,
    infractions: 0,
    statut: 'valide',
  },
  {
    nin: 'NIN-2021-012345',
    driverName: 'Bah',
    driverFirstName: 'Aminata',
    permitNumber: 'PC-A-2019-234567',
    categorie: 'A',
    dateDelivrance: '2019-09-05',
    dateExpiration: '2029-09-05',
    points: 8,
    infractions: 3,
    statut: 'valide',
  },
  {
    nin: 'NIN-2017-123456',
    driverName: 'Diallo',
    driverFirstName: 'Lamine',
    permitNumber: 'PC-B-2015-123456',
    categorie: 'B',
    dateDelivrance: '2015-07-22',
    dateExpiration: '2025-07-22',
    points: 6,
    infractions: 5,
    statut: 'suspendu',
  },
  {
    nin: 'NIN-2016-678901',
    driverName: 'Condé',
    driverFirstName: 'Ibrahim',
    permitNumber: 'PC-B-2014-678901',
    categorie: 'B',
    dateDelivrance: '2014-11-15',
    dateExpiration: '2024-11-15',
    points: 12,
    infractions: 0,
    statut: 'expiré',
  },
  {
    nin: '1972030456789',
    driverName: 'Camara',
    driverFirstName: 'Ousmane',
    permitNumber: 'PC-E-2018-045678',
    categorie: 'E',
    dateDelivrance: '2018-04-20',
    dateExpiration: '2028-04-20',
    points: 10,
    infractions: 1,
    statut: 'valide',
  },
  {
    nin: '1982081612345',
    driverName: 'Soumah',
    driverFirstName: 'Abdoulaye',
    permitNumber: 'PC-B-2016-081623',
    categorie: 'B',
    dateDelivrance: '2016-02-28',
    dateExpiration: '2026-02-28',
    points: 12,
    infractions: 0,
    statut: 'valide',
  },
  {
    nin: 'NIN-2019-456789',
    driverName: 'Touré',
    driverFirstName: 'Abdoulaye',
    permitNumber: 'PC-D-2012-456789',
    categorie: 'D',
    dateDelivrance: '2012-05-14',
    dateExpiration: '2022-05-14',
    points: 4,
    infractions: 7,
    statut: 'expiré',
  },
  {
    nin: 'NIN-2017-456789',
    driverName: 'Diallo',
    driverFirstName: 'Alpha',
    permitNumber: 'PC-B-2010-456789',
    categorie: 'B',
    dateDelivrance: '2010-12-03',
    dateExpiration: '2020-12-03',
    points: 12,
    infractions: 0,
    statut: 'expiré',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify a marriage record by searching for either spouse's NIN
 */
export function verifyMarriageRecord(nin1: string, nin2?: string): VerificationResult {
  const record = MARRIAGE_RECORDS.find(
    r => r.husbandNIN === nin1 || r.wifeNIN === nin1 || (nin2 && (r.husbandNIN === nin2 || r.wifeNIN === nin2))
  )

  if (record) {
    return {
      found: true,
      data: {
        id: record.id,
        husbandName: `${record.husbandFirstName} ${record.husbandName}`,
        husbandNIN: record.husbandNIN,
        wifeName: `${record.wifeFirstName} ${record.wifeName}`,
        wifeNIN: record.wifeNIN,
        marriageDate: record.marriageDate,
        marriageLocation: record.marriageLocation,
        actNumber: record.actNumber,
        regime: record.regime,
        officierEtatCivil: record.officierEtatCivil,
        commune: record.commune,
      },
      confidence: 95,
      message: `Acte de mariage trouvé — ${record.husbandFirstName} ${record.husbandName} & ${record.wifeFirstName} ${record.wifeName}, mariés le ${record.marriageDate} à ${record.marriageLocation}`,
      source: 'Registre des mariages — État civil',
    }
  }

  return {
    found: false,
    confidence: 30,
    message: `Aucun acte de mariage trouvé pour le NIN ${nin1}${nin2 ? ` ou ${nin2}` : ''}`,
    source: 'Registre des mariages — État civil',
  }
}

/**
 * Verify a death record by the deceased's NIN
 */
export function verifyDeathRecord(nin: string): VerificationResult {
  const record = DEATH_RECORDS.find(r => r.deceasedNIN === nin)

  if (record) {
    return {
      found: true,
      data: {
        id: record.id,
        deceasedName: `${record.deceasedFirstName} ${record.deceasedName}`,
        deceasedNIN: record.deceasedNIN,
        deathDate: record.deathDate,
        deathLocation: record.deathLocation,
        deathCause: record.deathCause,
        actNumber: record.actNumber,
        declarantName: `${record.declarantFirstName} ${record.declarantName}`,
        declarantRelation: record.declarantRelation,
        commune: record.commune,
      },
      confidence: 98,
      message: `Acte de décès trouvé — ${record.deceasedFirstName} ${record.deceasedName}, décédé(e) le ${record.deathDate} à ${record.deathLocation}`,
      source: 'Registre des décès — État civil',
    }
  }

  return {
    found: false,
    confidence: 15,
    message: `Aucun acte de décès trouvé pour le NIN ${nin} — la personne est présumée vivante`,
    source: 'Registre des décès — État civil',
  }
}

/**
 * Verify a criminal record by NIN
 */
export function verifyCriminalRecord(nin: string): VerificationResult {
  const record = CRIMINAL_RECORDS.find(r => r.nin === nin)

  if (record) {
    return {
      found: true,
      data: {
        nin: record.nin,
        fullName: `${record.firstName} ${record.fullName}`,
        hasRecord: record.hasRecord,
        recordType: record.recordType,
        details: record.details,
        dateLastCheck: record.dateLastCheck,
        isClear: record.isClear,
      },
      confidence: 92,
      message: record.isClear
        ? `Casier judiciaire vierge pour ${record.firstName} ${record.fullName} — vérifié le ${record.dateLastCheck}`
        : `Casier judiciaire non vierge pour ${record.firstName} ${record.fullName} — ${record.details}`,
      source: 'Casier judiciaire national — Ministère de la Justice',
    }
  }

  return {
    found: false,
    confidence: 40,
    message: `Aucun casier judiciaire trouvé pour le NIN ${nin} — vérification manuelle recommandée`,
    source: 'Casier judiciaire national — Ministère de la Justice',
  }
}

/**
 * Verify a land record by owner NIN, optionally filtered by parcel number
 */
export function verifyLandRecord(ownerNIN: string, parcelNumber?: string): VerificationResult {
  let record = LAND_RECORDS.find(r => r.ownerNIN === ownerNIN)

  if (parcelNumber) {
    record = LAND_RECORDS.find(r => r.ownerNIN === ownerNIN && r.parcelNumber === parcelNumber)
  }

  if (record) {
    return {
      found: true,
      data: {
        id: record.id,
        ownerName: `${record.ownerFirstName} ${record.ownerName}`,
        ownerNIN: record.ownerNIN,
        parcelNumber: record.parcelNumber,
        address: record.address,
        area: record.area,
        titleNumber: record.titleNumber,
        registrationDate: record.registrationDate,
        typePropriete: record.typePropriete,
        commune: record.commune,
        isContested: record.isContested,
      },
      confidence: record.isContested ? 65 : 90,
      message: record.isContested
        ? `Titre foncier trouvé MAIS CONTESTÉ — ${record.ownerFirstName} ${record.ownerName}, parcelle ${record.parcelNumber} à ${record.commune}`
        : `Titre foncier trouvé — ${record.ownerFirstName} ${record.ownerName}, parcelle ${record.parcelNumber} (${record.area} m²) à ${record.address}, ${record.commune}`,
      source: 'Registre foncier — Direction Nationale du Cadastre',
    }
  }

  return {
    found: false,
    confidence: 25,
    message: `Aucun enregistrement foncier trouvé pour le NIN ${ownerNIN}${parcelNumber ? ` / parcelle ${parcelNumber}` : ''}`,
    source: 'Registre foncier — Direction Nationale du Cadastre',
  }
}

/**
 * Verify an enterprise record by gérant NIN, optionally filtered by denomination
 */
export function verifyEnterpriseRecord(gerantNIN: string, denomination?: string): VerificationResult {
  let record = ENTERPRISE_RECORDS.find(r => r.gerantNIN === gerantNIN)

  if (denomination) {
    record = ENTERPRISE_RECORDS.find(
      r => r.gerantNIN === gerantNIN && r.denomination.toLowerCase().includes(denomination.toLowerCase())
    )
  }

  if (record) {
    return {
      found: true,
      data: {
        id: record.id,
        denomination: record.denomination,
        typeEntreprise: record.typeEntreprise,
        gerantName: `${record.gerantFirstName} ${record.gerantName}`,
        gerantNIN: record.gerantNIN,
        rccmNumber: record.rccmNumber,
        dateCreation: record.dateCreation,
        secteurActivite: record.secteurActivite,
        adresseSiege: record.adresseSiege,
        statut: record.statut,
        capitalSocial: record.capitalSocial,
      },
      confidence: record.statut === 'active' ? 95 : record.statut === 'en_formation' ? 70 : 45,
      message: record.statut === 'active'
        ? `Entreprise trouvée et ACTIVE — ${record.denomination} (${record.typeEntreprise}), RCCM: ${record.rccmNumber}`
        : record.statut === 'en_formation'
        ? `Entreprise en cours de formation — ${record.denomination} (${record.typeEntreprise})`
        : `Entreprise trouvée mais RADIÉE — ${record.denomination}, RCCM: ${record.rccmNumber}`,
      source: 'Registre du commerce et du crédit mobilier — APIP',
    }
  }

  return {
    found: false,
    confidence: 25,
    message: `Aucune entreprise trouvée pour le gérant NIN ${gerantNIN}${denomination ? ` / dénomination "${denomination}"` : ''}`,
    source: 'Registre du commerce et du crédit mobilier — APIP',
  }
}

/**
 * Verify an education record by student NIN
 */
export function verifyEducationRecord(studentNIN: string): VerificationResult {
  const record = EDUCATION_RECORDS.find(r => r.studentNIN === studentNIN)

  if (record) {
    return {
      found: true,
      data: {
        id: record.id,
        studentName: `${record.studentFirstName} ${record.studentName}`,
        studentNIN: record.studentNIN,
        etablissement: record.etablissement,
        niveau: record.niveau,
        diplome: record.diplome,
        anneeObtention: record.anneeObtention,
        matricule: record.matricule,
        statut: record.statut,
        mention: record.mention,
        specialite: record.specialite,
      },
      confidence: record.statut === 'diplômé' ? 95 : record.statut === 'en_cours' ? 80 : record.statut === 'inscrit' ? 75 : 50,
      message: record.statut === 'diplômé'
        ? `Diplôme vérifié — ${record.diplome} (${record.mention}), ${record.etablissement}, ${record.anneeObtention}`
        : record.statut === 'en_cours'
        ? `Étudiant en cours — ${record.specialite}, ${record.etablissement}, matricule ${record.matricule}`
        : record.statut === 'inscrit'
        ? `Inscrit — ${record.etablissement}, ${record.niveau}, matricule ${record.matricule}`
        : `Étudiant radié — ${record.etablissement}, ${record.specialite}`,
      source: 'Système d\'information de l\'Éducation nationale — Ministère de l\'Éducation',
    }
  }

  return {
    found: false,
    confidence: 20,
    message: `Aucun dossier scolaire ou universitaire trouvé pour le NIN ${studentNIN}`,
    source: 'Système d\'information de l\'Éducation nationale — Ministère de l\'Éducation',
  }
}

/**
 * Verify a vaccination record by citizen NIN
 */
export function verifyVaccinationRecord(citizenNIN: string): VerificationResult {
  const record = VACCINATION_RECORDS.find(r => r.citizenNIN === citizenNIN)

  if (record) {
    return {
      found: true,
      data: {
        id: record.id,
        citizenName: `${record.citizenFirstName} ${record.citizenName}`,
        citizenNIN: record.citizenNIN,
        vaccines: record.vaccines,
        isComplete: record.isComplete,
        lastUpdate: record.lastUpdate,
        centreVaccination: record.centreVaccination,
        vaccineCount: record.vaccines.length,
      },
      confidence: record.isComplete ? 95 : 60,
      message: record.isComplete
        ? `Vaccination complète — ${record.vaccines.length} vaccin(s) enregistré(s), dernier le ${record.lastUpdate} à ${record.centreVaccination}`
        : `Vaccination INCOMPLÈTE — ${record.vaccines.length} vaccin(s) enregistré(s), des doses manquantes`,
      source: 'Registre national de vaccination — Ministère de la Santé',
    }
  }

  return {
    found: false,
    confidence: 15,
    message: `Aucun enregistrement vaccinal trouvé pour le NIN ${citizenNIN}`,
    source: 'Registre national de vaccination — Ministère de la Santé',
  }
}

/**
 * Verify a tax record by NIN, optionally filtered by fiscal year
 */
export function verifyTaxRecord(nin: string, anneeFiscale?: string): VerificationResult {
  let record = TAX_RECORDS.find(r => r.nin === nin)

  if (anneeFiscale) {
    record = TAX_RECORDS.find(r => r.nin === nin && r.anneeFiscale === anneeFiscale)
  }

  if (record) {
    return {
      found: true,
      data: {
        nin: record.nin,
        taxpayerName: `${record.taxpayerFirstName} ${record.taxpayerName}`,
        numeroNIF: record.numeroNIF,
        anneeFiscale: record.anneeFiscale,
        revenuDeclare: record.revenuDeclare,
        impotDu: record.impotDu,
        statutPaiement: record.statutPaiement,
        derniereDeclaration: record.derniereDeclaration,
        typeContribuable: record.typeContribuable,
      },
      confidence: record.statutPaiement === 'à_jour' ? 95 : record.statutPaiement === 'partiel' ? 60 : 35,
      message: record.statutPaiement === 'à_jour'
        ? `Situation fiscale à jour — ${record.taxpayerFirstName} ${record.taxpayerName}, NIF: ${record.numeroNIF}, année ${record.anneeFiscale}`
        : record.statutPaiement === 'partiel'
        ? `Paiement partiel — ${record.taxpayerFirstName} ${record.taxpayerName}, impôt dû: ${record.impotDu.toLocaleString('fr-FR')} GNF, année ${record.anneeFiscale}`
        : `Impôts IMPAYÉS — ${record.taxpayerFirstName} ${record.taxpayerName}, montant dû: ${record.impotDu.toLocaleString('fr-FR')} GNF, année ${record.anneeFiscale}`,
      source: 'Direction Nationale des Impôts — Ministère des Finances',
    }
  }

  return {
    found: false,
    confidence: 20,
    message: `Aucun enregistrement fiscal trouvé pour le NIN ${nin}${anneeFiscale ? ` / année ${anneeFiscale}` : ''}`,
    source: 'Direction Nationale des Impôts — Ministère des Finances',
  }
}

/**
 * Verify a social security record by NIN
 */
export function verifySocialSecurityRecord(nin: string): VerificationResult {
  const record = SOCIAL_SECURITY_RECORDS.find(r => r.nin === nin)

  if (record) {
    return {
      found: true,
      data: {
        nin: record.nin,
        beneficiaryName: `${record.beneficiaryFirstName} ${record.beneficiaryName}`,
        numeroSecuriteSociale: record.numeroSecuriteSociale,
        regime: record.regime,
        employeur: record.employeur,
        nombreEnfants: record.nombreEnfants,
        statut: record.statut,
        dateAffiliation: record.dateAffiliation,
      },
      confidence: record.statut === 'affilié' ? 95 : record.statut === 'non_affilié' ? 50 : 40,
      message: record.statut === 'affilié'
        ? `Affilié ${record.regime} — ${record.beneficiaryFirstName} ${record.beneficiaryName}, n° ${record.numeroSecuriteSociale}, employeur: ${record.employeur}`
        : record.statut === 'non_affilié'
        ? `Non affilié — ${record.beneficiaryFirstName} ${record.beneficiaryName} n'est pas affilié à un régime de sécurité sociale`
        : `Affiliation RADIÉE — ${record.beneficiaryFirstName} ${record.beneficiaryName}, ancien n° ${record.numeroSecuriteSociale}`,
      source: 'Caisse Nationale de Sécurité Sociale — CNSS',
    }
  }

  return {
    found: false,
    confidence: 20,
    message: `Aucun enregistrement de sécurité sociale trouvé pour le NIN ${nin}`,
    source: 'Caisse Nationale de Sécurité Sociale — CNSS',
  }
}

/**
 * Verify a construction record by permit number
 */
export function verifyConstructionRecord(permitNumber: string): VerificationResult {
  const record = CONSTRUCTION_RECORDS.find(r => r.permitNumber === permitNumber)

  if (record) {
    return {
      found: true,
      data: {
        id: record.id,
        ownerName: `${record.ownerFirstName} ${record.ownerName}`,
        ownerNIN: record.ownerNIN,
        permitNumber: record.permitNumber,
        address: record.address,
        typeConstruction: record.typeConstruction,
        datePermis: record.datePermis,
        statutConformite: record.statutConformite,
        dateReceptionTravaux: record.dateReceptionTravaux,
        commune: record.commune,
      },
      confidence: record.statutConformite === 'conforme' ? 95 : record.statutConformite === 'en_cours' ? 70 : 40,
      message: record.statutConformite === 'conforme'
        ? `Permis conforme — ${record.typeConstruction}, ${record.address}, ${record.commune}, délivré le ${record.datePermis}`
        : record.statutConformite === 'en_cours'
        ? `Permis en cours de vérification — ${record.typeConstruction}, ${record.address}, ${record.commune}`
        : `Permis NON CONFORME — ${record.typeConstruction}, ${record.address}, ${record.commune} — des irrégularités ont été constatées`,
      source: 'Direction Nationale de l\'Urbanisme et de l\'Habitat',
    }
  }

  return {
    found: false,
    confidence: 20,
    message: `Aucun permis de construire trouvé pour le numéro ${permitNumber}`,
    source: 'Direction Nationale de l\'Urbanisme et de l\'Habitat',
  }
}

/**
 * Verify a driving record by NIN
 */
export function verifyDrivingRecord(nin: string): VerificationResult {
  const record = DRIVING_RECORDS.find(r => r.nin === nin)

  if (record) {
    return {
      found: true,
      data: {
        nin: record.nin,
        driverName: `${record.driverFirstName} ${record.driverName}`,
        permitNumber: record.permitNumber,
        categorie: record.categorie,
        dateDelivrance: record.dateDelivrance,
        dateExpiration: record.dateExpiration,
        points: record.points,
        infractions: record.infractions,
        statut: record.statut,
      },
      confidence: record.statut === 'valide' ? 95 : record.statut === 'expiré' ? 50 : 30,
      message: record.statut === 'valide'
        ? `Permis valide catégorie ${record.categorie} — ${record.driverFirstName} ${record.driverName}, ${record.points}/12 points, n° ${record.permitNumber}`
        : record.statut === 'expiré'
        ? `Permis EXPIRÉ catégorie ${record.categorie} — ${record.driverFirstName} ${record.driverName}, expiré le ${record.dateExpiration}`
        : `Permis SUSPENDU catégorie ${record.categorie} — ${record.driverFirstName} ${record.driverName}, ${record.points}/12 points, ${record.infractions} infraction(s)`,
      source: 'Direction Nationale des Transports Terrestres',
    }
  }

  return {
    found: false,
    confidence: 25,
    message: `Aucun permis de conduire trouvé pour le NIN ${nin}`,
    source: 'Direction Nationale des Transports Terrestres',
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE-BASED VERIFICATION ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mapping of service IDs to their corresponding verification database
 * This allows the AI agent to route verification requests to the correct database
 */
const SERVICE_VERIFICATION_MAP: Record<string, {
  verificationDb: string
  verificationFunction: (nin: string, extraParams?: Record<string, any>) => VerificationResult
}> = {
  // État civil
  'ec-1': { verificationDb: 'birth_records', verificationFunction: (_nin) => ({ found: false, confidence: 10, message: 'Vérification via registre des naissances — consultez birth-records-database.ts', source: 'Registre des naissances — État civil' }) },
  'ec-2': { verificationDb: 'marriage_records', verificationFunction: (nin, extra) => verifyMarriageRecord(nin, extra?.nin2) },
  'ec-3': { verificationDb: 'death_records', verificationFunction: (nin) => verifyDeathRecord(nin) },
  'ec-4': { verificationDb: 'birth_records', verificationFunction: (_nin) => ({ found: false, confidence: 10, message: 'Vérification via registre des naissances — consultez birth-records-database.ts', source: 'Registre des naissances — État civil' }) },
  'ec-5': { verificationDb: 'birth_records', verificationFunction: (_nin) => ({ found: false, confidence: 10, message: 'Vérification via registre des naissances — consultez birth-records-database.ts', source: 'Registre des naissances — État civil' }) },
  'ec-6': { verificationDb: 'birth_records', verificationFunction: (_nin) => ({ found: false, confidence: 10, message: 'Vérification via registre des naissances — consultez birth-records-database.ts', source: 'Registre des naissances — État civil' }) },

  // Justice
  'j-1': { verificationDb: 'criminal_records', verificationFunction: (nin) => verifyCriminalRecord(nin) },
  'j-2': { verificationDb: 'criminal_records', verificationFunction: (nin) => verifyCriminalRecord(nin) },
  'j-3': { verificationDb: 'criminal_records', verificationFunction: (nin) => verifyCriminalRecord(nin) },

  // Identification
  'id-1': { verificationDb: 'criminal_records', verificationFunction: (nin) => verifyCriminalRecord(nin) },
  'id-2': { verificationDb: 'criminal_records', verificationFunction: (nin) => verifyCriminalRecord(nin) },
  'id-3': { verificationDb: 'driving_records', verificationFunction: (nin) => verifyDrivingRecord(nin) },

  // Urbanisme
  'u-1': { verificationDb: 'land_records', verificationFunction: (nin, extra) => verifyLandRecord(nin, extra?.parcelNumber) },
  'u-2': { verificationDb: 'construction_records', verificationFunction: (_nin, extra) => verifyConstructionRecord(extra?.permitNumber || '') },
  'u-3': { verificationDb: 'land_records', verificationFunction: (nin, extra) => verifyLandRecord(nin, extra?.parcelNumber) },

  // Entreprise
  'e-1': { verificationDb: 'enterprise_records', verificationFunction: (nin, extra) => verifyEnterpriseRecord(nin, extra?.denomination) },
  'e-2': { verificationDb: 'enterprise_records', verificationFunction: (nin, extra) => verifyEnterpriseRecord(nin, extra?.denomination) },

  // Éducation
  'ed-1': { verificationDb: 'education_records', verificationFunction: (nin) => verifyEducationRecord(nin) },
  'ed-2': { verificationDb: 'education_records', verificationFunction: (nin) => verifyEducationRecord(nin) },
  'ed-3': { verificationDb: 'education_records', verificationFunction: (nin) => verifyEducationRecord(nin) },

  // Santé
  's-1': { verificationDb: 'vaccination_records', verificationFunction: (nin) => verifyVaccinationRecord(nin) },
  's-2': { verificationDb: 'social_security_records', verificationFunction: (nin) => verifySocialSecurityRecord(nin) },

  // Résidence
  'r-1': { verificationDb: 'birth_records', verificationFunction: (_nin) => ({ found: false, confidence: 10, message: 'Vérification résidentielle — consultez le registre des naissances', source: 'État civil — Vérification résidentielle' }) },
  'r-2': { verificationDb: 'birth_records', verificationFunction: (_nin) => ({ found: false, confidence: 10, message: 'Vérification domiciliaire — consultez le registre des naissances', source: 'État civil — Vérification domiciliaire' }) },

  // Fiscalité
  'f-1': { verificationDb: 'tax_records', verificationFunction: (nin, extra) => verifyTaxRecord(nin, extra?.anneeFiscale) },
  'f-2': { verificationDb: 'tax_records', verificationFunction: (nin, extra) => verifyTaxRecord(nin, extra?.anneeFiscale) },

  // Social
  'so-1': { verificationDb: 'social_security_records', verificationFunction: (nin) => verifySocialSecurityRecord(nin) },
  'so-2': { verificationDb: 'social_security_records', verificationFunction: (nin) => verifySocialSecurityRecord(nin) },
}

/**
 * Route a verification request to the correct database based on the service ID
 * This is the main entry point for the AI agent to verify citizen information
 *
 * @param serviceId The service ID (e.g., 'ec-2', 'j-1', 'id-3')
 * @param nin The National Identification Number of the citizen
 * @param extraParams Optional additional parameters (e.g., nin2 for marriage, parcelNumber for land)
 */
export function verifyByServiceId(
  serviceId: string,
  nin: string,
  extraParams?: Record<string, any>
): VerificationResult {
  const mapping = SERVICE_VERIFICATION_MAP[serviceId]

  if (!mapping) {
    return {
      found: false,
      confidence: 10,
      message: `Service "${serviceId}" non reconnu — aucune base de vérification associée`,
      source: 'Système de vérification — eAdmin Guinée',
    }
  }

  try {
    return mapping.verificationFunction(nin, extraParams)
  } catch (error) {
    return {
      found: false,
      confidence: 5,
      message: `Erreur lors de la vérification pour le service "${serviceId}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      source: mapping.verificationDb,
    }
  }
}

/**
 * Get the verification database name for a given service ID
 */
export function getVerificationDbForService(serviceId: string): string | undefined {
  return SERVICE_VERIFICATION_MAP[serviceId]?.verificationDb
}

/**
 * Get all available verification databases and their record counts
 */
export function getVerificationDatabaseStats(): Record<string, { recordCount: number; description: string }> {
  return {
    marriage_records: { recordCount: MARRIAGE_RECORDS.length, description: 'Registre des mariages — État civil' },
    death_records: { recordCount: DEATH_RECORDS.length, description: 'Registre des décès — État civil' },
    criminal_records: { recordCount: CRIMINAL_RECORDS.length, description: 'Casier judiciaire national' },
    land_records: { recordCount: LAND_RECORDS.length, description: 'Registre foncier — Cadastre' },
    enterprise_records: { recordCount: ENTERPRISE_RECORDS.length, description: 'Registre du commerce — APIP' },
    education_records: { recordCount: EDUCATION_RECORDS.length, description: 'Système éducation nationale' },
    vaccination_records: { recordCount: VACCINATION_RECORDS.length, description: 'Registre national vaccination' },
    tax_records: { recordCount: TAX_RECORDS.length, description: 'Direction Nationale des Impôts' },
    social_security_records: { recordCount: SOCIAL_SECURITY_RECORDS.length, description: 'Caisse Nationale Sécurité Sociale' },
    construction_records: { recordCount: CONSTRUCTION_RECORDS.length, description: 'Direction Urbanisme et Habitat' },
    driving_records: { recordCount: DRIVING_RECORDS.length, description: 'Direction Transports Terrestres' },
  }
}
