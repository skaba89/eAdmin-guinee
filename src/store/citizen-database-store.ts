import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── CITIZEN DATABASE ──────────────────────────────────────────────────────

export interface BirthRecord {
  id: string
  acteNumber: string
  // Child info
  childLastName: string
  childFirstName: string
  childGender: 'M' | 'F'
  childBirthDate: string
  childBirthPlace: string
  childNIN: string
  // Parents
  fatherLastName: string
  fatherFirstName: string
  fatherNIN: string
  fatherNationality: string
  motherLastName: string
  motherFirstName: string
  motherMaidenName: string
  motherNIN: string
  motherNationality: string
  // Declaration
  declarantName: string
  declarantRelation: string
  declarationDate: string
  // Registration
  registrationDate: string
  registrationPlace: string
  registryOffice: string
  registryNumber: string
  // Document
  marginNotes: string[]
  status: 'active' | 'cancelled' | 'corrected'
  verificationHash: string
}

export interface NationalIDRecord {
  id: string
  nin: string
  lastName: string
  firstName: string
  birthDate: string
  birthPlace: string
  gender: 'M' | 'F'
  nationality: string
  address: string
  issueDate: string
  expiryDate: string
  status: 'active' | 'expired' | 'suspended' | 'lost'
  photoVerified: boolean
  biometricVerified: boolean
}

export interface CriminalRecord {
  id: string
  nin: string
  lastName: string
  firstName: string
  birthDate: string
  hasRecord: boolean
  offenses: CriminalOffense[]
  status: 'clean' | 'has_records' | 'restricted'
  lastChecked: string
}

export interface CriminalOffense {
  id: string
  date: string
  nature: string
  jurisdiction: string
  sentence: string
  rehabilited: boolean
  rehabilitationDate?: string
}

export interface MarriageRecord {
  id: string
  acteNumber: string
  spouse1LastName: string
  spouse1FirstName: string
  spouse1NIN: string
  spouse2LastName: string
  spouse2FirstName: string
  spouse2NIN: string
  marriageDate: string
  marriagePlace: string
  regime: string
  status: 'active' | 'divorced' | 'annulled'
}

export interface DeathRecord {
  id: string
  acteNumber: string
  deceasedLastName: string
  deceasedFirstName: string
  deceasedNIN: string
  deathDate: string
  deathPlace: string
  cause: string
  declarantName: string
  declarationDate: string
}

export interface ResidenceCertificate {
  id: string
  certificateNumber: string
  citizenNIN: string
  citizenLastName: string
  citizenFirstName: string
  address: string
  commune: string
  prefecture: string
  issueDate: string
  validityMonths: number
  status: 'valid' | 'expired'
}

export interface VerificationResult {
  verified: boolean
  confidence: number
  checks: VerificationCheck[]
  recommendation: 'auto_approve' | 'manual_review' | 'reject' | 'request_more_info'
  reason: string
}

export interface VerificationCheck {
  field: string
  query: string
  found: boolean
  match: boolean
  source: string
  details: string
}

// ─── DEMO SEED DATA ──────────────────────────────────────────────────────────

const DEMO_BIRTH_RECORDS: BirthRecord[] = [
  {
    id: 'br-001', acteNumber: 'AC-2024-KAL-001234',
    childLastName: 'Diallo', childFirstName: 'Aminata', childGender: 'F',
    childBirthDate: '1995-03-15', childBirthPlace: 'Conakry, Commune de Kaloum',
    childNIN: 'NIN-2019-458723',
    fatherLastName: 'Diallo', fatherFirstName: 'Mamadou', fatherNIN: 'NIN-1970-111222',
    fatherNationality: 'Guinéenne',
    motherLastName: 'Bah', motherFirstName: 'Fatoumata', motherMaidenName: 'Bah',
    motherNIN: 'NIN-1972-333444', motherNationality: 'Guinéenne',
    declarantName: 'Diallo Mamadou', declarantRelation: 'Père',
    declarationDate: '1995-03-16',
    registrationDate: '1995-03-18', registrationPlace: 'Conakry',
    registryOffice: 'Mairie de Kaloum — Bureau d\'État Civil',
    registryNumber: 'REG-1995-KAL-00567',
    marginNotes: [], status: 'active',
    verificationHash: 'sha256:a1b2c3d4e5f6',
  },
  {
    id: 'br-002', acteNumber: 'AC-2017-MAT-005678',
    childLastName: 'Condé', childFirstName: 'Ibrahim', childGender: 'M',
    childBirthDate: '1992-07-22', childBirthPlace: 'Conakry, Commune de Matam',
    childNIN: 'NIN-2017-123456',
    fatherLastName: 'Condé', fatherFirstName: 'Alpha', fatherNIN: 'NIN-1965-555666',
    fatherNationality: 'Guinéenne',
    motherLastName: 'Touré', motherFirstName: 'Mariama', motherMaidenName: 'Touré',
    motherNIN: 'NIN-1968-777888', motherNationality: 'Guinéenne',
    declarantName: 'Condé Alpha', declarantRelation: 'Père',
    declarationDate: '1992-07-23',
    registrationDate: '1992-07-25', registrationPlace: 'Conakry',
    registryOffice: 'Mairie de Matam — Bureau d\'État Civil',
    registryNumber: 'REG-1992-MAT-00890',
    marginNotes: [], status: 'active',
    verificationHash: 'sha256:b2c3d4e5f6a1',
  },
  {
    id: 'br-003', acteNumber: 'AC-2020-KIN-009012',
    childLastName: 'Camara', childFirstName: 'Ousmane', childGender: 'M',
    childBirthDate: '1988-11-05', childBirthPlace: 'Kindia, Préfecture de Kindia',
    childNIN: 'NIN-2020-789012',
    fatherLastName: 'Camara', fatherFirstName: 'Lamine', fatherNIN: 'NIN-1960-999000',
    fatherNationality: 'Guinéenne',
    motherLastName: 'Doubé', motherFirstName: 'Aïssatou', motherMaidenName: 'Doubé',
    motherNIN: 'NIN-1963-111222', motherNationality: 'Guinéenne',
    declarantName: 'Camara Lamine', declarantRelation: 'Père',
    declarationDate: '1988-11-06',
    registrationDate: '1988-11-08', registrationPlace: 'Kindia',
    registryOffice: 'Mairie de Kindia — Bureau d\'État Civil',
    registryNumber: 'REG-1988-KIN-00345',
    marginNotes: [], status: 'active',
    verificationHash: 'sha256:c3d4e5f6a1b2',
  },
  {
    id: 'br-004', acteNumber: 'AC-2018-DIX-003456',
    childLastName: 'Touré', childFirstName: 'Mariama', childGender: 'F',
    childBirthDate: '1990-01-30', childBirthPlace: 'Conakry, Commune de Dixinn',
    childNIN: 'NIN-2018-345678',
    fatherLastName: 'Touré', fatherFirstName: 'Seydou', fatherNIN: 'NIN-1962-333444',
    fatherNationality: 'Guinéenne',
    motherLastName: 'Sow', motherFirstName: 'Kadiatou', motherMaidenName: 'Sow',
    motherNIN: 'NIN-1965-555666', motherNationality: 'Guinéenne',
    declarantName: 'Touré Seydou', declarantRelation: 'Père',
    declarationDate: '1990-01-31',
    registrationDate: '1990-02-02', registrationPlace: 'Conakry',
    registryOffice: 'Mairie de Dixinn — Bureau d\'État Civil',
    registryNumber: 'REG-1990-DIX-00234',
    marginNotes: [], status: 'active',
    verificationHash: 'sha256:d4e5f6a1b2c3',
  },
  {
    id: 'br-005', acteNumber: 'AC-2015-KAN-007890',
    childLastName: 'Sow', childFirstName: 'Abdoulaye', childGender: 'M',
    childBirthDate: '1985-09-12', childBirthPlace: 'Kankan, Préfecture de Kankan',
    childNIN: 'NIN-2015-567890',
    fatherLastName: 'Sow', fatherFirstName: 'Ibrahima', fatherNIN: 'NIN-1958-777888',
    fatherNationality: 'Guinéenne',
    motherLastName: 'Keita', motherFirstName: 'Aminata', motherMaidenName: 'Keita',
    motherNIN: 'NIN-1960-999000', motherNationality: 'Guinéenne',
    declarantName: 'Sow Ibrahima', declarantRelation: 'Père',
    declarationDate: '1985-09-13',
    registrationDate: '1985-09-15', registrationPlace: 'Kankan',
    registryOffice: 'Mairie de Kankan — Bureau d\'État Civil',
    registryNumber: 'REG-1985-KAN-00123',
    marginNotes: ['Correction de nom le 12/03/2020 — Arrêté n°2020-COR-045'],
    status: 'corrected',
    verificationHash: 'sha256:e5f6a1b2c3d4',
  },
  {
    id: 'br-006', acteNumber: 'AC-2016-RAT-002345',
    childLastName: 'Bah', childFirstName: 'Fatoumata', childGender: 'F',
    childBirthDate: '1993-04-18', childBirthPlace: 'Conakry, Commune de Ratoma',
    childNIN: 'NIN-2016-234567',
    fatherLastName: 'Bah', fatherFirstName: 'Moussa', fatherNIN: 'NIN-1968-111333',
    fatherNationality: 'Guinéenne',
    motherLastName: 'Sylla', motherFirstName: 'Hawa', motherMaidenName: 'Sylla',
    motherNIN: 'NIN-1970-222444', motherNationality: 'Guinéenne',
    declarantName: 'Bah Moussa', declarantRelation: 'Père',
    declarationDate: '1993-04-19',
    registrationDate: '1993-04-21', registrationPlace: 'Conakry',
    registryOffice: 'Mairie de Ratoma — Bureau d\'État Civil',
    registryNumber: 'REG-1993-RAT-00678',
    marginNotes: [], status: 'active',
    verificationHash: 'sha256:f6a1b2c3d4e5',
  },
  {
    id: 'br-007', acteNumber: 'AC-2021-LAB-005678',
    childLastName: 'Keita', childFirstName: 'Mamadou', childGender: 'M',
    childBirthDate: '2000-06-25', childBirthPlace: 'Labé, Préfecture de Labé',
    childNIN: 'NIN-2021-890123',
    fatherLastName: 'Keita', fatherFirstName: 'Oumar', fatherNIN: 'NIN-1975-444555',
    fatherNationality: 'Guinéenne',
    motherLastName: 'Diallo', motherFirstName: 'Aissatou', motherMaidenName: 'Diallo',
    motherNIN: 'NIN-1977-666777', motherNationality: 'Guinéenne',
    declarantName: 'Keita Oumar', declarantRelation: 'Père',
    declarationDate: '2000-06-26',
    registrationDate: '2000-06-28', registrationPlace: 'Labé',
    registryOffice: 'Mairie de Labé — Bureau d\'État Civil',
    registryNumber: 'REG-2000-LAB-00345',
    marginNotes: [], status: 'active',
    verificationHash: 'sha256:a1b2c3d4e5f7',
  },
  {
    id: 'br-008', acteNumber: 'AC-2022-NZE-009012',
    childLastName: 'Doubé', childFirstName: 'Aïssatou', childGender: 'F',
    childBirthDate: '1997-12-08', childBirthPlace: 'N\'Zérékoré, Préfecture de N\'Zérékoré',
    childNIN: 'NIN-2022-456789',
    fatherLastName: 'Doubé', fatherFirstName: 'Gnano', fatherNIN: 'NIN-1970-888999',
    fatherNationality: 'Guinéenne',
    motherLastName: 'Gbamou', motherFirstName: 'Marie', motherMaidenName: 'Gbamou',
    motherNIN: 'NIN-1973-000111', motherNationality: 'Guinéenne',
    declarantName: 'Doubé Gnano', declarantRelation: 'Père',
    declarationDate: '1997-12-09',
    registrationDate: '1997-12-11', registrationPlace: 'N\'Zérékoré',
    registryOffice: 'Mairie de N\'Zérékoré — Bureau d\'État Civil',
    registryNumber: 'REG-1997-NZE-00789',
    marginNotes: [], status: 'active',
    verificationHash: 'sha256:b2c3d4e5f6a2',
  },
  {
    id: 'br-009', acteNumber: 'AC-2019-KAL-003345',
    childLastName: 'Condé', childFirstName: 'Sékou', childGender: 'M',
    childBirthDate: '1982-05-14', childBirthPlace: 'Conakry, Commune de Kaloum',
    childNIN: 'NIN-2019-100200',
    fatherLastName: 'Condé', fatherFirstName: 'Mamadi', fatherNIN: 'NIN-1955-200300',
    fatherNationality: 'Guinéenne',
    motherLastName: 'Camara', motherFirstName: 'Nabintou', motherMaidenName: 'Camara',
    motherNIN: 'NIN-1958-400500', motherNationality: 'Guinéenne',
    declarantName: 'Condé Mamadi', declarantRelation: 'Père',
    declarationDate: '1982-05-15',
    registrationDate: '1982-05-17', registrationPlace: 'Conakry',
    registryOffice: 'Mairie de Kaloum — Bureau d\'État Civil',
    registryNumber: 'REG-1982-KAL-00112',
    marginNotes: [], status: 'active',
    verificationHash: 'sha256:c3d4e5f6a1b3',
  },
  {
    id: 'br-010', acteNumber: 'AC-2023-DIX-004567',
    childLastName: 'Sylla', childFirstName: 'Mamadou', childGender: 'M',
    childBirthDate: '1998-08-20', childBirthPlace: 'Conakry, Commune de Dixinn',
    childNIN: 'NIN-2023-600700',
    fatherLastName: 'Sylla', fatherFirstName: 'Aboubacar', fatherNIN: 'NIN-1972-800900',
    fatherNationality: 'Guinéenne',
    motherLastName: 'Bah', motherFirstName: 'Néné', motherMaidenName: 'Bah',
    motherNIN: 'NIN-1974-010203', motherNationality: 'Guinéenne',
    declarantName: 'Sylla Aboubacar', declarantRelation: 'Père',
    declarationDate: '1998-08-21',
    registrationDate: '1998-08-23', registrationPlace: 'Conakry',
    registryOffice: 'Mairie de Dixinn — Bureau d\'État Civil',
    registryNumber: 'REG-1998-DIX-00567',
    marginNotes: [], status: 'active',
    verificationHash: 'sha256:d4e5f6a1b2c4',
  },
]

const DEMO_NATIONAL_IDS: NationalIDRecord[] = [
  { id: 'nid-001', nin: 'NIN-2019-458723', lastName: 'Diallo', firstName: 'Aminata', birthDate: '1995-03-15', birthPlace: 'Conakry, Commune de Kaloum', gender: 'F', nationality: 'Guinéenne', address: 'Conakry, Commune de Kaloum, Quartier Boulbinet', issueDate: '2019-06-15', expiryDate: '2029-06-15', status: 'active', photoVerified: true, biometricVerified: true },
  { id: 'nid-002', nin: 'NIN-2017-123456', lastName: 'Condé', firstName: 'Ibrahim', birthDate: '1992-07-22', birthPlace: 'Conakry, Commune de Matam', gender: 'M', nationality: 'Guinéenne', address: 'Conakry, Commune de Matam, Quartier Madina', issueDate: '2017-03-10', expiryDate: '2027-03-10', status: 'active', photoVerified: true, biometricVerified: true },
  { id: 'nid-003', nin: 'NIN-2020-789012', lastName: 'Camara', firstName: 'Ousmane', birthDate: '1988-11-05', birthPlace: 'Kindia, Préfecture de Kindia', gender: 'M', nationality: 'Guinéenne', address: 'Kindia, Préfecture de Kindia', issueDate: '2020-01-20', expiryDate: '2030-01-20', status: 'active', photoVerified: true, biometricVerified: true },
  { id: 'nid-004', nin: 'NIN-2018-345678', lastName: 'Touré', firstName: 'Mariama', birthDate: '1990-01-30', birthPlace: 'Conakry, Commune de Dixinn', gender: 'F', nationality: 'Guinéenne', address: 'Conakry, Commune de Dixinn, Quartier Belle Vue', issueDate: '2018-09-05', expiryDate: '2028-09-05', status: 'active', photoVerified: true, biometricVerified: true },
  { id: 'nid-005', nin: 'NIN-2015-567890', lastName: 'Sow', firstName: 'Abdoulaye', birthDate: '1985-09-12', birthPlace: 'Kankan, Préfecture de Kankan', gender: 'M', nationality: 'Guinéenne', address: 'Kankan, Préfecture de Kankan', issueDate: '2015-04-12', expiryDate: '2025-04-12', status: 'active', photoVerified: true, biometricVerified: true },
  { id: 'nid-006', nin: 'NIN-2016-234567', lastName: 'Bah', firstName: 'Fatoumata', birthDate: '1993-04-18', birthPlace: 'Conakry, Commune de Ratoma', gender: 'F', nationality: 'Guinéenne', address: 'Conakry, Commune de Ratoma, Quartier Hamdallaye', issueDate: '2016-08-22', expiryDate: '2026-08-22', status: 'active', photoVerified: true, biometricVerified: true },
  { id: 'nid-007', nin: 'NIN-2021-890123', lastName: 'Keita', firstName: 'Mamadou', birthDate: '2000-06-25', birthPlace: 'Labé, Préfecture de Labé', gender: 'M', nationality: 'Guinéenne', address: 'Labé, Préfecture de Labé', issueDate: '2021-02-15', expiryDate: '2031-02-15', status: 'active', photoVerified: true, biometricVerified: true },
  { id: 'nid-008', nin: 'NIN-2022-456789', lastName: 'Doubé', firstName: 'Aïssatou', birthDate: '1997-12-08', birthPlace: 'N\'Zérékoré, Préfecture de N\'Zérékoré', gender: 'F', nationality: 'Guinéenne', address: 'N\'Zérékoré, Préfecture de N\'Zérékoré', issueDate: '2022-05-10', expiryDate: '2032-05-10', status: 'active', photoVerified: true, biometricVerified: true },
  { id: 'nid-009', nin: 'NIN-2019-100200', lastName: 'Condé', firstName: 'Sékou', birthDate: '1982-05-14', birthPlace: 'Conakry, Commune de Kaloum', gender: 'M', nationality: 'Guinéenne', address: 'Conakry, Commune de Kaloum, Almamya', issueDate: '2019-01-08', expiryDate: '2029-01-08', status: 'active', photoVerified: true, biometricVerified: true },
]

const DEMO_CRIMINAL_RECORDS: CriminalRecord[] = [
  { id: 'cr-001', nin: 'NIN-2019-458723', lastName: 'Diallo', firstName: 'Aminata', birthDate: '1995-03-15', hasRecord: false, offenses: [], status: 'clean', lastChecked: new Date().toISOString() },
  { id: 'cr-002', nin: 'NIN-2017-123456', lastName: 'Condé', firstName: 'Ibrahim', birthDate: '1992-07-22', hasRecord: false, offenses: [], status: 'clean', lastChecked: new Date().toISOString() },
  { id: 'cr-003', nin: 'NIN-2020-789012', lastName: 'Camara', firstName: 'Ousmane', birthDate: '1988-11-05', hasRecord: false, offenses: [], status: 'clean', lastChecked: new Date().toISOString() },
  { id: 'cr-004', nin: 'NIN-2018-345678', lastName: 'Touré', firstName: 'Mariama', birthDate: '1990-01-30', hasRecord: false, offenses: [], status: 'clean', lastChecked: new Date().toISOString() },
  { id: 'cr-005', nin: 'NIN-2015-567890', lastName: 'Sow', firstName: 'Abdoulaye', birthDate: '1985-09-12', hasRecord: true, offenses: [
    { id: 'off-001', date: '2018-03-15', nature: 'Contravention routière', jurisdiction: 'Tribunal de Kankan', sentence: 'Amende 50 000 GNF', rehabilited: true, rehabilitationDate: '2020-03-15' },
  ], status: 'has_records', lastChecked: new Date().toISOString() },
  { id: 'cr-006', nin: 'NIN-2016-234567', lastName: 'Bah', firstName: 'Fatoumata', birthDate: '1993-04-18', hasRecord: false, offenses: [], status: 'clean', lastChecked: new Date().toISOString() },
  { id: 'cr-007', nin: 'NIN-2021-890123', lastName: 'Keita', firstName: 'Mamadou', birthDate: '2000-06-25', hasRecord: false, offenses: [], status: 'clean', lastChecked: new Date().toISOString() },
  { id: 'cr-008', nin: 'NIN-2022-456789', lastName: 'Doubé', firstName: 'Aïssatou', birthDate: '1997-12-08', hasRecord: false, offenses: [], status: 'clean', lastChecked: new Date().toISOString() },
]

const DEMO_MARRIAGE_RECORDS: MarriageRecord[] = [
  { id: 'mr-001', acteNumber: 'MC-2022-KAL-000123', spouse1LastName: 'Diallo', spouse1FirstName: 'Aminata', spouse1NIN: 'NIN-2019-458723', spouse2LastName: 'Sow', spouse2FirstName: 'Ibrahima', spouse2NIN: 'NIN-2015-567890', marriageDate: '2022-12-15', marriagePlace: 'Conakry, Mairie de Kaloum', regime: 'Communauté de biens', status: 'active' },
  { id: 'mr-002', acteNumber: 'MC-2019-DIX-000456', spouse1LastName: 'Bah', spouse1FirstName: 'Fatoumata', spouse1NIN: 'NIN-2016-234567', spouse2LastName: 'Camara', spouse2FirstName: 'Lamine', spouse2NIN: 'NIN-2020-789012', marriageDate: '2019-06-20', marriagePlace: 'Conakry, Mairie de Dixinn', regime: 'Séparation de biens', status: 'active' },
]

const DEMO_DEATH_RECORDS: DeathRecord[] = [
  { id: 'dr-001', acteNumber: 'DC-2024-KAL-000012', deceasedLastName: 'Camara', deceasedFirstName: 'Lamine Sr.', deceasedNIN: 'NIN-1960-999000', deathDate: '2024-08-10', deathPlace: 'Conakry, Hôpital Donka', cause: 'Cause naturelle', declarantName: 'Camara Ousmane', declarationDate: '2024-08-11' },
]

const DEMO_RESIDENCE_CERTIFICATES: ResidenceCertificate[] = [
  { id: 'rc-001', certificateNumber: 'RES-2025-KAL-001234', citizenNIN: 'NIN-2019-458723', citizenLastName: 'Diallo', citizenFirstName: 'Aminata', address: 'Quartier Boulbinet, Conakry', commune: 'Kaloum', prefecture: 'Conakry', issueDate: '2025-11-15', validityMonths: 3, status: 'valid' },
  { id: 'rc-002', certificateNumber: 'RES-2025-MAT-005678', citizenNIN: 'NIN-2017-123456', citizenLastName: 'Condé', citizenFirstName: 'Ibrahim', address: 'Quartier Madina, Conakry', commune: 'Matam', prefecture: 'Conakry', issueDate: '2025-09-10', validityMonths: 3, status: 'expired' },
  { id: 'rc-003', certificateNumber: 'RES-2026-DIX-002345', citizenNIN: 'NIN-2018-345678', citizenLastName: 'Touré', citizenFirstName: 'Mariama', address: 'Quartier Belle Vue, Conakry', commune: 'Dixinn', prefecture: 'Conakry', issueDate: '2026-02-20', validityMonths: 3, status: 'valid' },
  { id: 'rc-004', certificateNumber: 'RES-2025-RAT-003456', citizenNIN: 'NIN-2016-234567', citizenLastName: 'Bah', citizenFirstName: 'Fatoumata', address: 'Quartier Hamdallaye, Conakry', commune: 'Ratoma', prefecture: 'Conakry', issueDate: '2026-01-05', validityMonths: 3, status: 'valid' },
]

// ─── STORE ────────────────────────────────────────────────────────────────

interface CitizenDatabaseState {
  birthRecords: BirthRecord[]
  nationalIDs: NationalIDRecord[]
  criminalRecords: CriminalRecord[]
  marriageRecords: MarriageRecord[]
  deathRecords: DeathRecord[]
  residenceCertificates: ResidenceCertificate[]

  // Query methods
  findBirthRecordByNIN: (nin: string) => BirthRecord | undefined
  findBirthRecordByName: (lastName: string, firstName: string) => BirthRecord | undefined
  findBirthRecordByActeNumber: (acteNumber: string) => BirthRecord | undefined
  findNationalIDByNIN: (nin: string) => NationalIDRecord | undefined
  findCriminalRecordByNIN: (nin: string) => CriminalRecord | undefined
  findMarriageRecordByNIN: (nin: string) => MarriageRecord | undefined
  findDeathRecordByNIN: (nin: string) => DeathRecord | undefined
  findResidenceCertificateByNIN: (nin: string) => ResidenceCertificate | undefined

  // Verification
  verifyCitizen: (params: {
    nin?: string
    lastName?: string
    firstName?: string
    birthDate?: string
    serviceId?: string
  }) => VerificationResult

  // Search
  searchBirthRecords: (query: string) => BirthRecord[]
  searchAll: (query: string) => { birthRecords: BirthRecord[]; nationalIDs: NationalIDRecord[]; criminalRecords: CriminalRecord[] }
}

export const useCitizenDatabaseStore = create<CitizenDatabaseState>()(
  persist(
    (set, get) => ({
      birthRecords: DEMO_BIRTH_RECORDS,
      nationalIDs: DEMO_NATIONAL_IDS,
      criminalRecords: DEMO_CRIMINAL_RECORDS,
      marriageRecords: DEMO_MARRIAGE_RECORDS,
      deathRecords: DEMO_DEATH_RECORDS,
      residenceCertificates: DEMO_RESIDENCE_CERTIFICATES,

      findBirthRecordByNIN: (nin) => get().birthRecords.find(r => r.childNIN === nin),
      findBirthRecordByName: (lastName, firstName) => get().birthRecords.find(r =>
        r.childLastName.toLowerCase() === lastName.toLowerCase() &&
        r.childFirstName.toLowerCase() === firstName.toLowerCase()
      ),
      findBirthRecordByActeNumber: (acteNumber) => get().birthRecords.find(r =>
        r.acteNumber === acteNumber || r.acteNumber.toLowerCase().includes(acteNumber.toLowerCase())
      ),
      findNationalIDByNIN: (nin) => get().nationalIDs.find(r => r.nin === nin),
      findCriminalRecordByNIN: (nin) => get().criminalRecords.find(r => r.nin === nin),
      findMarriageRecordByNIN: (nin) => get().marriageRecords.find(r =>
        r.spouse1NIN === nin || r.spouse2NIN === nin
      ),
      findDeathRecordByNIN: (nin) => get().deathRecords.find(r => r.deceasedNIN === nin),
      findResidenceCertificateByNIN: (nin) => get().residenceCertificates.filter(r => r.citizenNIN === nin).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0],

      verifyCitizen: (params) => {
        const { nin, lastName, firstName, birthDate, serviceId } = params
        const checks: VerificationCheck[] = []
        let allVerified = true
        let confidence = 100

        // Check birth record
        const birthRecord = nin
          ? get().findBirthRecordByNIN(nin)
          : (lastName && firstName ? get().findBirthRecordByName(lastName, firstName) : undefined)

        checks.push({
          field: 'Acte de naissance',
          query: nin || `${lastName} ${firstName}`,
          found: !!birthRecord,
          match: !!birthRecord && birthRecord.status === 'active',
          source: 'Base d\'État Civil',
          details: birthRecord
            ? `Acte n°${birthRecord.acteNumber} — ${birthRecord.childFirstName} ${birthRecord.childLastName}, né(e) le ${birthRecord.childBirthDate} à ${birthRecord.childBirthPlace}${birthRecord.status !== 'active' ? ` [STATUT: ${birthRecord.status}]` : ''}`
            : 'Aucun acte de naissance trouvé dans la base',
        })
        if (!birthRecord || birthRecord.status !== 'active') { allVerified = false; confidence -= 40 }

        // Check national ID
        const nationalID = nin ? get().findNationalIDByNIN(nin) : undefined
        checks.push({
          field: 'Carte d\'identité nationale',
          query: nin || 'N/A',
          found: !!nationalID,
          match: !!nationalID && nationalID.status === 'active',
          source: 'ANIP — Base d\'Identification Nationale',
          details: nationalID
            ? `CNI ${nationalID.status === 'active' ? 'valide' : nationalID.status} — ${nationalID.firstName} ${nationalID.lastName}, délivrée le ${nationalID.issueDate}, expire le ${nationalID.expiryDate}`
            : 'Aucune carte d\'identité trouvée',
        })
        if (!nationalID || nationalID.status !== 'active') { allVerified = false; confidence -= 25 }

        // Check birth date match
        if (birthRecord && birthDate) {
          const dateMatch = birthRecord.childBirthDate === birthDate
          checks.push({
            field: 'Date de naissance',
            query: birthDate,
            found: true,
            match: dateMatch,
            source: 'Vérification croisée État Civil',
            details: dateMatch
              ? `Date de naissance confirmée : ${birthDate}`
              : `Écart détecté : base=${birthRecord.childBirthDate}, déclaré=${birthDate}`,
          })
          if (!dateMatch) { allVerified = false; confidence -= 30 }
        }

        // Check death record (deceased check)
        const deathRecord = nin ? get().findDeathRecordByNIN(nin) : undefined
        if (deathRecord) {
          checks.push({
            field: 'Vérification décès',
            query: nin || 'N/A',
            found: true,
            match: false,
            source: 'Base des Actes de Décès',
            details: `ATTENTION : Acte de décès trouvé — ${deathRecord.deceasedFirstName} ${deathRecord.deceasedLastName}, décédé(e) le ${deathRecord.deathDate}`,
          })
          allVerified = false
          confidence -= 100
        }

        // Check criminal record for certain services
        if (serviceId && ['j-1', 'e-1', 'id-1', 'id-2'].includes(serviceId)) {
          const criminalRecord = nin ? get().findCriminalRecordByNIN(nin) : undefined
          checks.push({
            field: 'Casier judiciaire',
            query: nin || 'N/A',
            found: !!criminalRecord,
            match: !!criminalRecord && criminalRecord.status === 'clean',
            source: 'Ministère de la Justice — Base du Casier Judiciaire',
            details: criminalRecord
              ? criminalRecord.status === 'clean'
                ? 'Casier judiciaire vierge'
                : `${criminalRecord.offenses.length} infraction(s) enregistrée(s) — ${criminalRecord.offenses.filter(o => !o.rehabilited).length} non réhabilitée(s)`
              : 'Aucun casier judiciaire trouvé',
          })
          if (criminalRecord && criminalRecord.status !== 'clean') { confidence -= 15 }
        }

        // Check residence certificate for address-related services
        if (serviceId && ['ec-4', 'r-1'].includes(serviceId)) {
          const residence = nin ? get().findResidenceCertificateByNIN(nin) : undefined
          checks.push({
            field: 'Certificat de résidence',
            query: nin || 'N/A',
            found: !!residence,
            match: !!residence && residence.status === 'valid',
            source: 'Mairie — Base des Certificats de Résidence',
            details: residence
              ? residence.status === 'valid'
                ? `Certificat valide — ${residence.address}, ${residence.commune} (délivré le ${residence.issueDate})`
                : `Certificat expiré — ${residence.address}, ${residence.commune}`
              : 'Aucun certificat de résidence trouvé',
          })
          if (!residence || residence.status !== 'valid') { confidence -= 15 }
        }

        // Determine recommendation
        let recommendation: VerificationResult['recommendation']
        let reason: string

        if (deathRecord) {
          recommendation = 'reject'
          reason = 'Acte de décès trouvé — la personne est déclarée décédée'
        } else if (confidence >= 90 && allVerified) {
          recommendation = 'auto_approve'
          reason = 'Toutes les vérifications sont positives — traitement automatique possible'
        } else if (confidence >= 60) {
          recommendation = 'manual_review'
          reason = 'Vérifications partielles — revue manuelle requise avant validation'
        } else if (confidence >= 30) {
          recommendation = 'request_more_info'
          reason = 'Informations insuffisantes ou incohérentes — pièces complémentaires requises'
        } else {
          recommendation = 'reject'
          reason = 'Vérifications échouées — demande non recevable'
        }

        return { verified: allVerified, confidence: Math.max(0, confidence), checks, recommendation, reason }
      },

      searchBirthRecords: (query) => {
        const q = query.toLowerCase()
        return get().birthRecords.filter(r =>
          r.childLastName.toLowerCase().includes(q) ||
          r.childFirstName.toLowerCase().includes(q) ||
          r.childNIN.toLowerCase().includes(q) ||
          r.acteNumber.toLowerCase().includes(q) ||
          r.childBirthPlace.toLowerCase().includes(q)
        )
      },

      searchAll: (query) => {
        const q = query.toLowerCase()
        return {
          birthRecords: get().birthRecords.filter(r =>
            r.childLastName.toLowerCase().includes(q) ||
            r.childFirstName.toLowerCase().includes(q) ||
            r.childNIN.toLowerCase().includes(q) ||
            r.acteNumber.toLowerCase().includes(q)
          ),
          nationalIDs: get().nationalIDs.filter(r =>
            r.lastName.toLowerCase().includes(q) ||
            r.firstName.toLowerCase().includes(q) ||
            r.nin.toLowerCase().includes(q)
          ),
          criminalRecords: get().criminalRecords.filter(r =>
            r.lastName.toLowerCase().includes(q) ||
            r.firstName.toLowerCase().includes(q) ||
            r.nin.toLowerCase().includes(q)
          ),
        }
      },
    }),
    {
      name: 'citizen-database-storage',
      version: 1,
    }
  )
)
