// ═══════════════════════════════════════════════════════════════════════════════
// eAdministration Suite Guinea — National Birth Registry Database
// Simulates Guinea's national birth registry for AI agent verification
// 55 realistic Guinean birth records with NIN, parental, and registry data
// ═══════════════════════════════════════════════════════════════════════════════

export interface BirthRecord {
  id: string                    // e.g., "BR-2024-001"
  nin: string                   // National Identification Number
  lastName: string              // Family name
  firstName: string             // Given name
  dateOfBirth: string           // ISO date
  placeOfBirth: string          // City/commune
  region: string                // Administrative region
  gender: 'M' | 'F'
  fatherName: string            // Father's full name
  fatherNIN: string             // Father's NIN
  motherName: string            // Mother's maiden name
  motherNIN: string             // Mother's NIN
  declarantName: string         // Person who declared the birth
  declarantRelation: string     // e.g., "père", "mère", "oncle"
  registrationDate: string      // When the birth was registered
  registrationNumber: string    // Official registration number
  registryOffice: string        // e.g., "Mairie de Kaloum"
  status: 'active' | 'cancelled' | 'amended'
  amendments?: Array<{
    date: string
    field: string
    oldValue: string
    newValue: string
    reason: string
  }>
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIRTH RECORDS DATABASE — 55 Records
// ═══════════════════════════════════════════════════════════════════════════════

export const birthRecords: BirthRecord[] = [
  // ─── RECORDS MATCHING DEMO ACCOUNTS ──────────────────────────────────────────

  // 1. Aminata Diallo — matches citoyen@eadmin.gn (NIN-2019-458723) and naiss1@test.gn
  {
    id: 'BR-2024-001',
    nin: 'NIN-2019-458723',
    lastName: 'Diallo',
    firstName: 'Aminata',
    dateOfBirth: '1995-03-15',
    placeOfBirth: 'Kaloum',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Mamadou Diallo',
    fatherNIN: '1960081212345',
    motherName: 'Aissatou Bah',
    motherNIN: '1965092345678',
    declarantName: 'Mamadou Diallo',
    declarantRelation: 'père',
    registrationDate: '1995-03-17',
    registrationNumber: '1995-KLM-00147',
    registryOffice: 'Mairie de Kaloum',
    status: 'active',
  },

  // 2. Moussa Camara — matches naiss2@test.gn (NIN-2018-567890)
  {
    id: 'BR-2024-002',
    nin: 'NIN-2018-567890',
    lastName: 'Camara',
    firstName: 'Moussa',
    dateOfBirth: '1988-07-22',
    placeOfBirth: 'Kindia',
    region: 'Kindia',
    gender: 'M',
    fatherName: 'Ibrahim Camara',
    fatherNIN: '1955041556789',
    motherName: 'Fatoumata Soumah',
    motherNIN: '1960071267890',
    declarantName: 'Ibrahim Camara',
    declarantRelation: 'père',
    registrationDate: '1988-07-24',
    registrationNumber: '1988-KND-00283',
    registryOffice: 'Mairie de Kindia',
    status: 'active',
  },

  // 3. Kadiatou Sow — matches naiss3@test.gn (NIN-2020-123456)
  {
    id: 'BR-2024-003',
    nin: 'NIN-2020-123456',
    lastName: 'Sow',
    firstName: 'Kadiatou',
    dateOfBirth: '1992-11-08',
    placeOfBirth: 'Kankan',
    region: 'Kankan',
    gender: 'F',
    fatherName: 'Abdoulaye Sow',
    fatherNIN: '1962031478901',
    motherName: 'Mariama Keita',
    motherNIN: '1967062589012',
    declarantName: 'Abdoulaye Sow',
    declarantRelation: 'père',
    registrationDate: '1992-11-10',
    registrationNumber: '1992-KKN-00456',
    registryOffice: 'Mairie de Kankan',
    status: 'active',
  },

  // 4. Lamine Keita — matches naiss4@test.gn (NIN-2017-234567)
  {
    id: 'BR-2024-004',
    nin: 'NIN-2017-234567',
    lastName: 'Keita',
    firstName: 'Lamine',
    dateOfBirth: '1985-01-30',
    placeOfBirth: 'Labé',
    region: 'Labé',
    gender: 'M',
    fatherName: 'Mamadou Keita',
    fatherNIN: '1955100890123',
    motherName: 'Djénéba Diallo',
    motherNIN: '1960041201234',
    declarantName: 'Mamadou Keita',
    declarantRelation: 'père',
    registrationDate: '1985-02-01',
    registrationNumber: '1985-LBE-00198',
    registryOffice: 'Mairie de Labé',
    status: 'active',
  },

  // 5. Fatou Doumbouya — matches naiss5@test.gn (NIN-2021-345678)
  {
    id: 'BR-2024-005',
    nin: 'NIN-2021-345678',
    lastName: 'Doumbouya',
    firstName: 'Fatou',
    dateOfBirth: '1997-05-19',
    placeOfBirth: "N'Zérékoré",
    region: "N'Zérékoré",
    gender: 'F',
    fatherName: 'Sékou Doumbouya',
    fatherNIN: '1965070112345',
    motherName: 'Néné Tolno',
    motherNIN: '1970031523456',
    declarantName: 'Sékou Doumbouya',
    declarantRelation: 'père',
    registrationDate: '1997-05-21',
    registrationNumber: '1997-NZR-00312',
    registryOffice: "Mairie de N'Zérékoré",
    status: 'active',
  },

  // 6. Mariama Touré — matches mariage1@test.gn (NIN-2015-567890)
  {
    id: 'BR-2024-006',
    nin: 'NIN-2015-567890',
    lastName: 'Touré',
    firstName: 'Mariama',
    dateOfBirth: '1990-09-12',
    placeOfBirth: 'Dixinn',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Abdoulaye Touré',
    fatherNIN: '1960031834567',
    motherName: 'Aminata Condé',
    motherNIN: '1965082245678',
    declarantName: 'Abdoulaye Touré',
    declarantRelation: 'père',
    registrationDate: '1990-09-14',
    registrationNumber: '1990-DXN-00087',
    registryOffice: 'Mairie de Dixinn',
    status: 'active',
  },

  // 7. Ibrahim Condé — matches mariage2@test.gn & cni1@test.gn (NIN-2016-678901 / NIN-2017-123456)
  {
    id: 'BR-2024-007',
    nin: 'NIN-2016-678901',
    lastName: 'Condé',
    firstName: 'Ibrahim',
    dateOfBirth: '1983-06-25',
    placeOfBirth: 'Matam',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Alpha Condé',
    fatherNIN: '1955120756789',
    motherName: 'Hadja Sylla',
    motherNIN: '1960091167890',
    declarantName: 'Alpha Condé',
    declarantRelation: 'père',
    registrationDate: '1983-06-27',
    registrationNumber: '1983-MTM-00156',
    registryOffice: 'Mairie de Matam',
    status: 'active',
  },

  // 8. Alpha Diallo — matches ent2@test.gn & cni2@test.gn (NIN-2017-456789 / NIN-2018-234567)
  {
    id: 'BR-2024-008',
    nin: 'NIN-2017-456789',
    lastName: 'Diallo',
    firstName: 'Alpha',
    dateOfBirth: '1978-12-03',
    placeOfBirth: 'Kaloum',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Ibrahima Diallo',
    fatherNIN: '1945021478901',
    motherName: 'Kadiatou Bah',
    motherNIN: '1950072389012',
    declarantName: 'Ibrahima Diallo',
    declarantRelation: 'père',
    registrationDate: '1978-12-05',
    registrationNumber: '1978-KLM-00234',
    registryOffice: 'Mairie de Kaloum',
    status: 'active',
  },

  // 9. Ibrahima Touré — matches passeport2@test.gn (NIN-2015-345678)
  {
    id: 'BR-2024-009',
    nin: 'NIN-2015-345678',
    lastName: 'Touré',
    firstName: 'Ibrahima',
    dateOfBirth: '1980-04-17',
    placeOfBirth: 'Kaloum',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Mamady Touré',
    fatherNIN: '1950060290123',
    motherName: 'Saran Diallo',
    motherNIN: '1955091301234',
    declarantName: 'Mamady Touré',
    declarantRelation: 'père',
    registrationDate: '1980-04-19',
    registrationNumber: '1980-KLM-00098',
    registryOffice: 'Mairie de Kaloum',
    status: 'active',
  },

  // 10. Fatoumata Bah — matches passeport1@test.gn (NIN-2016-234567)
  {
    id: 'BR-2024-010',
    nin: 'NIN-2016-234567',
    lastName: 'Bah',
    firstName: 'Fatoumata',
    dateOfBirth: '1993-08-30',
    placeOfBirth: 'Ratoma',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Ousmane Bah',
    fatherNIN: '1961042512345',
    motherName: 'Djénébou Camara',
    motherNIN: '1966080723456',
    declarantName: 'Ousmane Bah',
    declarantRelation: 'père',
    registrationDate: '1993-09-01',
    registrationNumber: '1993-RTM-00173',
    registryOffice: 'Mairie de Ratoma',
    status: 'active',
  },

  // 11. Abdoulaye Touré — matches resid1@test.gn (NIN-2019-456789)
  {
    id: 'BR-2024-011',
    nin: 'NIN-2019-456789',
    lastName: 'Touré',
    firstName: 'Abdoulaye',
    dateOfBirth: '1975-02-14',
    placeOfBirth: 'Kaloum',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Thierno Touré',
    fatherNIN: '1945071834567',
    motherName: 'Fanta Bangoura',
    motherNIN: '1950110545678',
    declarantName: 'Thierno Touré',
    declarantRelation: 'père',
    registrationDate: '1975-02-16',
    registrationNumber: '1975-KLM-00062',
    registryOffice: 'Mairie de Kaloum',
    status: 'active',
  },

  // 12. Aissatou Sylla — matches main mairie account (as reference)
  {
    id: 'BR-2024-012',
    nin: 'NIN-2014-345678',
    lastName: 'Sylla',
    firstName: 'Aissatou',
    dateOfBirth: '1987-10-05',
    placeOfBirth: 'Dixinn',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Mamadou Sylla',
    fatherNIN: '1955031256789',
    motherName: 'Hawa Kaba',
    motherNIN: '1960062467890',
    declarantName: 'Mamadou Sylla',
    declarantRelation: 'père',
    registrationDate: '1987-10-07',
    registrationNumber: '1987-DXN-00129',
    registryOffice: 'Mairie de Dixinn',
    status: 'active',
  },

  // 13. Ibrahima Touré — matches superadmin reference (NIN not in demo but name matches)
  {
    id: 'BR-2024-013',
    nin: '1978112309876',
    lastName: 'Touré',
    firstName: 'Ibrahima',
    dateOfBirth: '1978-11-23',
    placeOfBirth: 'Kaloum',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'El Hadj Touré',
    fatherNIN: '1948021578901',
    motherName: 'Mariam Diallo',
    motherNIN: '1953070890123',
    declarantName: 'El Hadj Touré',
    declarantRelation: 'père',
    registrationDate: '1978-11-25',
    registrationNumber: '1978-KLM-00301',
    registryOffice: 'Mairie de Kaloum',
    status: 'active',
  },

  // 14. Mamadou Soumah — matches agence@eadmin.gn reference
  {
    id: 'BR-2024-014',
    nin: '1985061701234',
    lastName: 'Soumah',
    firstName: 'Mamadou',
    dateOfBirth: '1985-06-17',
    placeOfBirth: 'Kindia',
    region: 'Kindia',
    gender: 'M',
    fatherName: 'Lamine Soumah',
    fatherNIN: '1955092301234',
    motherName: 'Sitan Condé',
    motherNIN: '1960120712345',
    declarantName: 'Lamine Soumah',
    declarantRelation: 'père',
    registrationDate: '1985-06-19',
    registrationNumber: '1985-KND-00215',
    registryOffice: 'Mairie de Kindia',
    status: 'active',
  },

  // ─── ADDITIONAL RECORDS WITH 13-DIGIT NIN FORMAT ────────────────────────────

  // 15. Mamadou Diallo — older generation
  {
    id: 'BR-2024-015',
    nin: '1960081212345',
    lastName: 'Diallo',
    firstName: 'Mamadou',
    dateOfBirth: '1960-08-12',
    placeOfBirth: 'Kaloum',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Alpha Diallo',
    fatherNIN: '1930010134567',
    motherName: 'Fatoumata Keita',
    motherNIN: '1935020245678',
    declarantName: 'Alpha Diallo',
    declarantRelation: 'père',
    registrationDate: '1960-08-14',
    registrationNumber: '1960-KLM-00034',
    registryOffice: 'Mairie de Kaloum',
    status: 'active',
  },

  // 16. Aissatou Bah — mother of record #1
  {
    id: 'BR-2024-016',
    nin: '1965092345678',
    lastName: 'Bah',
    firstName: 'Aissatou',
    dateOfBirth: '1965-09-23',
    placeOfBirth: 'Ratoma',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Ousmane Bah',
    fatherNIN: '1935041556789',
    motherName: 'Mariama Sow',
    motherNIN: '1940061867890',
    declarantName: 'Ousmane Bah',
    declarantRelation: 'père',
    registrationDate: '1965-09-25',
    registrationNumber: '1965-RTM-00078',
    registryOffice: 'Mairie de Ratoma',
    status: 'active',
  },

  // 17. Ousmane Camara
  {
    id: 'BR-2024-017',
    nin: '1972030456789',
    lastName: 'Camara',
    firstName: 'Ousmane',
    dateOfBirth: '1972-03-04',
    placeOfBirth: 'Matoto',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Facinet Camara',
    fatherNIN: '1942081178901',
    motherName: 'Néné Bangoura',
    motherNIN: '1947120489012',
    declarantName: 'Facinet Camara',
    declarantRelation: 'père',
    registrationDate: '1972-03-06',
    registrationNumber: '1972-MTT-00112',
    registryOffice: 'Mairie de Matoto',
    status: 'active',
  },

  // 18. Fatoumata Condé
  {
    id: 'BR-2024-018',
    nin: '1976071578901',
    lastName: 'Condé',
    firstName: 'Fatoumata',
    dateOfBirth: '1976-07-15',
    placeOfBirth: 'Mamou',
    region: 'Mamou',
    gender: 'F',
    fatherName: 'Sékou Condé',
    fatherNIN: '1946031901234',
    motherName: 'Aminata Traoré',
    motherNIN: '1951080612345',
    declarantName: 'Sékou Condé',
    declarantRelation: 'père',
    registrationDate: '1976-07-17',
    registrationNumber: '1976-MMO-00045',
    registryOffice: 'Mairie de Mamou',
    status: 'active',
  },

  // 19. Ibrahim Keita
  {
    id: 'BR-2024-019',
    nin: '1979102289012',
    lastName: 'Keita',
    firstName: 'Ibrahim',
    dateOfBirth: '1979-10-22',
    placeOfBirth: 'Kankan',
    region: 'Kankan',
    gender: 'M',
    fatherName: 'Mamady Keita',
    fatherNIN: '1950061523456',
    motherName: 'Djénéba Sylla',
    motherNIN: '1955110834567',
    declarantName: 'Mamady Keita',
    declarantRelation: 'père',
    registrationDate: '1979-10-24',
    registrationNumber: '1979-KKN-00278',
    registryOffice: 'Mairie de Kankan',
    status: 'active',
  },

  // 20. Hadja Sylla — CANCELLED record (duplicate registration discovered)
  {
    id: 'BR-2024-020',
    nin: '1981040790123',
    lastName: 'Sylla',
    firstName: 'Hadja',
    dateOfBirth: '1981-04-07',
    placeOfBirth: 'Dixinn',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Thierno Sylla',
    fatherNIN: '1952041845678',
    motherName: 'Oumou Diallo',
    motherNIN: '1957072556789',
    declarantName: 'Thierno Sylla',
    declarantRelation: 'père',
    registrationDate: '1981-04-09',
    registrationNumber: '1981-DXN-00056',
    registryOffice: 'Mairie de Dixinn',
    status: 'cancelled',
  },

  // 21. Sékou Bah — CANCELLED record (fraudulent declaration)
  {
    id: 'BR-2024-021',
    nin: '1995061867890',
    lastName: 'Bah',
    firstName: 'Sékou',
    dateOfBirth: '1995-06-18',
    placeOfBirth: 'Boké',
    region: 'Boké',
    gender: 'M',
    fatherName: 'Moussa Bah',
    fatherNIN: '1965021178901',
    motherName: 'Fanta Doumbouya',
    motherNIN: '1970041490123',
    declarantName: 'Moussa Bah',
    declarantRelation: 'père',
    registrationDate: '1995-06-20',
    registrationNumber: '1995-BKE-00089',
    registryOffice: 'Mairie de Boké',
    status: 'cancelled',
  },

  // 22. Djénéba Traoré — CANCELLED record (court order — wrong parentage)
  {
    id: 'BR-2024-022',
    nin: '1999082501234',
    lastName: 'Traoré',
    firstName: 'Djénéba',
    dateOfBirth: '1999-08-25',
    placeOfBirth: 'Faranah',
    region: 'Faranah',
    gender: 'F',
    fatherName: 'Lamine Traoré',
    fatherNIN: '1970030612345',
    motherName: 'Mariama Baldé',
    motherNIN: '1975091723456',
    declarantName: 'Lamine Traoré',
    declarantRelation: 'père',
    registrationDate: '1999-08-27',
    registrationNumber: '1999-FRH-00034',
    registryOffice: 'Mairie de Faranah',
    status: 'cancelled',
  },

  // 23. Mamadou Bangoura — AMENDED record (first name correction)
  {
    id: 'BR-2024-023',
    nin: '1991021323456',
    lastName: 'Bangoura',
    firstName: 'Mamadou',
    dateOfBirth: '1991-02-13',
    placeOfBirth: 'Matam',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Ibrahim Bangoura',
    fatherNIN: '1961072834567',
    motherName: 'Saran Camara',
    motherNIN: '1966120145678',
    declarantName: 'Ibrahim Bangoura',
    declarantRelation: 'père',
    registrationDate: '1991-02-15',
    registrationNumber: '1991-MTM-00201',
    registryOffice: 'Mairie de Matam',
    status: 'amended',
    amendments: [
      {
        date: '1992-05-10',
        field: 'firstName',
        oldValue: 'Mohamed',
        newValue: 'Mamadou',
        reason: 'Erreur de transcription lors de la déclaration initiale — correction par jugement du tribunal de Première Instance de Conakry',
      },
    ],
  },

  // 24. Aminata Fofana — AMENDED record (last name correction)
  {
    id: 'BR-2024-024',
    nin: '1988070545678',
    lastName: 'Fofana',
    firstName: 'Aminata',
    dateOfBirth: '1988-07-05',
    placeOfBirth: 'Kindia',
    region: 'Kindia',
    gender: 'F',
    fatherName: 'Abdoulaye Fofana',
    fatherNIN: '1958041256789',
    motherName: 'Kadiatou Soumah',
    motherNIN: '1963080767890',
    declarantName: 'Abdoulaye Fofana',
    declarantRelation: 'père',
    registrationDate: '1988-07-07',
    registrationNumber: '1988-KND-00167',
    registryOffice: 'Mairie de Kindia',
    status: 'amended',
    amendments: [
      {
        date: '1990-11-20',
        field: 'lastName',
        oldValue: 'Fofana-Sylla',
        newValue: 'Fofana',
        reason: 'Rectification du nom de famille — le double nom avait été attribué par erreur, le père étant uniquement Fofana',
      },
    ],
  },

  // 25. Moussa Kaba — AMENDED record (date of birth correction)
  {
    id: 'BR-2024-025',
    nin: '2003091867890',
    lastName: 'Kaba',
    firstName: 'Moussa',
    dateOfBirth: '2003-09-18',
    placeOfBirth: 'Labé',
    region: 'Labé',
    gender: 'M',
    fatherName: 'Thierno Kaba',
    fatherNIN: '1974052178901',
    motherName: 'Hawa Dioubaté',
    motherNIN: '1979080390123',
    declarantName: 'Thierno Kaba',
    declarantRelation: 'père',
    registrationDate: '2003-09-20',
    registrationNumber: '2003-LBE-00092',
    registryOffice: 'Mairie de Labé',
    status: 'amended',
    amendments: [
      {
        date: '2005-02-15',
        field: 'dateOfBirth',
        oldValue: '2003-09-28',
        newValue: '2003-09-18',
        reason: 'Correction de la date de naissance — certificat médical produit démontrant une erreur de 10 jours dans la déclaration initiale',
      },
    ],
  },

  // 26. Fatoumata Diallo — AMENDED record (mother name + place of birth correction)
  {
    id: 'BR-2024-026',
    nin: '2006010290123',
    lastName: 'Diallo',
    firstName: 'Fatoumata',
    dateOfBirth: '2006-01-02',
    placeOfBirth: 'Dixinn',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Ousmane Diallo',
    fatherNIN: '1977031401234',
    motherName: 'Mariama Touré',
    motherNIN: '1982070512345',
    declarantName: 'Ousmane Diallo',
    declarantRelation: 'père',
    registrationDate: '2006-01-04',
    registrationNumber: '2006-DXN-00023',
    registryOffice: 'Mairie de Dixinn',
    status: 'amended',
    amendments: [
      {
        date: '2008-06-18',
        field: 'motherName',
        oldValue: 'Mariama Condé',
        newValue: 'Mariama Touré',
        reason: 'Rectification du nom de jeune fille de la mère — le nom marital avait été utilisé par erreur',
      },
      {
        date: '2008-06-18',
        field: 'placeOfBirth',
        oldValue: 'Kaloum',
        newValue: 'Dixinn',
        reason: 'Correction du lieu de naissance — la naissance a eu lieu à la clinique Pasteur de Dixinn et non à l\'hôpital de Kaloum',
      },
    ],
  },

  // 27. El Hadj Sanno
  {
    id: 'BR-2024-027',
    nin: '1963021423456',
    lastName: 'Sanno',
    firstName: 'El Hadj',
    dateOfBirth: '1963-02-14',
    placeOfBirth: 'Boké',
    region: 'Boké',
    gender: 'M',
    fatherName: 'Mohamed Sanno',
    fatherNIN: '1935031834567',
    motherName: 'Sitan Baldé',
    motherNIN: '1940072145678',
    declarantName: 'Mohamed Sanno',
    declarantRelation: 'père',
    registrationDate: '1963-02-16',
    registrationNumber: '1963-BKE-00027',
    registryOffice: 'Mairie de Boké',
    status: 'active',
  },

  // 28. Djénébou Sy Savané
  {
    id: 'BR-2024-028',
    nin: '1994042856789',
    lastName: 'Sy Savané',
    firstName: 'Djénébou',
    dateOfBirth: '1994-04-28',
    placeOfBirth: 'Ratoma',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Facinet Sy Savané',
    fatherNIN: '1964081167890',
    motherName: 'Aminata Kouyaté',
    motherNIN: '1969122478901',
    declarantName: 'Facinet Sy Savané',
    declarantRelation: 'père',
    registrationDate: '1994-04-30',
    registrationNumber: '1994-RTM-00188',
    registryOffice: 'Mairie de Ratoma',
    status: 'active',
  },

  // 29. Facinet Doubé
  {
    id: 'BR-2024-029',
    nin: '1971060389012',
    lastName: 'Doubé',
    firstName: 'Facinet',
    dateOfBirth: '1971-06-03',
    placeOfBirth: 'Faranah',
    region: 'Faranah',
    gender: 'M',
    fatherName: 'Mamadou Doubé',
    fatherNIN: '1945091790123',
    motherName: 'Djénéba Sow',
    motherNIN: '1950020801234',
    declarantName: 'Mamadou Doubé',
    declarantRelation: 'père',
    registrationDate: '1971-06-05',
    registrationNumber: '1971-FRH-00041',
    registryOffice: 'Mairie de Faranah',
    status: 'active',
  },

  // 30. Saran Baldé
  {
    id: 'BR-2024-030',
    nin: '1985091712345',
    lastName: 'Baldé',
    firstName: 'Saran',
    dateOfBirth: '1985-09-17',
    placeOfBirth: 'Kankan',
    region: 'Kankan',
    gender: 'F',
    fatherName: 'Ibrahima Baldé',
    fatherNIN: '1955102223456',
    motherName: 'Fatou Traoré',
    motherNIN: '1960031434567',
    declarantName: 'Ibrahima Baldé',
    declarantRelation: 'père',
    registrationDate: '1985-09-19',
    registrationNumber: '1985-KKN-00312',
    registryOffice: 'Mairie de Kankan',
    status: 'active',
  },

  // 31. Mamady Kouyaté
  {
    id: 'BR-2024-031',
    nin: '1968120545678',
    lastName: 'Kouyaté',
    firstName: 'Mamady',
    dateOfBirth: '1968-12-05',
    placeOfBirth: 'Kissidougou',
    region: "N'Zérékoré",
    gender: 'M',
    fatherName: 'Sékou Kouyaté',
    fatherNIN: '1940030856789',
    motherName: 'Hadja Dioubaté',
    motherNIN: '1945071167890',
    declarantName: 'Sékou Kouyaté',
    declarantRelation: 'père',
    registrationDate: '1968-12-07',
    registrationNumber: '1968-KSG-00019',
    registryOffice: 'Mairie de Kissidougou',
    status: 'active',
  },

  // 32. Néné Dioubaté
  {
    id: 'BR-2024-032',
    nin: '1993032178901',
    lastName: 'Dioubaté',
    firstName: 'Néné',
    dateOfBirth: '1993-03-21',
    placeOfBirth: 'Labé',
    region: 'Labé',
    gender: 'F',
    fatherName: 'Thierno Dioubaté',
    fatherNIN: '1963011489012',
    motherName: 'Aissatou Bah',
    motherNIN: '1968080701234',
    declarantName: 'Thierno Dioubaté',
    declarantRelation: 'père',
    registrationDate: '1993-03-23',
    registrationNumber: '1993-LBE-00145',
    registryOffice: 'Mairie de Labé',
    status: 'active',
  },

  // 33. Abdoulaye Soumah
  {
    id: 'BR-2024-033',
    nin: '1982081612345',
    lastName: 'Soumah',
    firstName: 'Abdoulaye',
    dateOfBirth: '1982-08-16',
    placeOfBirth: 'Kindia',
    region: 'Kindia',
    gender: 'M',
    fatherName: 'Moussa Soumah',
    fatherNIN: '1952061923456',
    motherName: 'Fanta Condé',
    motherNIN: '1957100334567',
    declarantName: 'Moussa Soumah',
    declarantRelation: 'père',
    registrationDate: '1982-08-18',
    registrationNumber: '1982-KND-00093',
    registryOffice: 'Mairie de Kindia',
    status: 'active',
  },

  // 34. Hawa Sow
  {
    id: 'BR-2024-034',
    nin: '1997070945678',
    lastName: 'Sow',
    firstName: 'Hawa',
    dateOfBirth: '1997-07-09',
    placeOfBirth: 'Matoto',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Ibrahim Sow',
    fatherNIN: '1967042256789',
    motherName: 'Djénéba Keita',
    motherNIN: '1972091567890',
    declarantName: 'Ibrahim Sow',
    declarantRelation: 'père',
    registrationDate: '1997-07-11',
    registrationNumber: '1997-MTT-00267',
    registryOffice: 'Mairie de Matoto',
    status: 'active',
  },

  // 35. Thierno Traoré
  {
    id: 'BR-2024-035',
    nin: '1975040278901',
    lastName: 'Traoré',
    firstName: 'Thierno',
    dateOfBirth: '1975-04-02',
    placeOfBirth: 'Mamou',
    region: 'Mamou',
    gender: 'M',
    fatherName: 'El Hadj Traoré',
    fatherNIN: '1945011589012',
    motherName: 'Mariam Fofana',
    motherNIN: '1950062801234',
    declarantName: 'El Hadj Traoré',
    declarantRelation: 'père',
    registrationDate: '1975-04-04',
    registrationNumber: '1975-MMO-00058',
    registryOffice: 'Mairie de Mamou',
    status: 'active',
  },

  // 36. Oumou Kaba
  {
    id: 'BR-2024-036',
    nin: '1990111512345',
    lastName: 'Kaba',
    firstName: 'Oumou',
    dateOfBirth: '1990-11-15',
    placeOfBirth: "N'Zérékoré",
    region: "N'Zérékoré",
    gender: 'F',
    fatherName: 'Mamadou Kaba',
    fatherNIN: '1960082323456',
    motherName: 'Sitan Doumbouya',
    motherNIN: '1965120634567',
    declarantName: 'Mamadou Kaba',
    declarantRelation: 'père',
    registrationDate: '1990-11-17',
    registrationNumber: '1990-NZR-00156',
    registryOffice: "Mairie de N'Zérékoré",
    status: 'active',
  },

  // 37. Mohamed Sylla
  {
    id: 'BR-2024-037',
    nin: '1986062845678',
    lastName: 'Sylla',
    firstName: 'Mohamed',
    dateOfBirth: '1986-06-28',
    placeOfBirth: 'Dixinn',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Lamine Sylla',
    fatherNIN: '1956041156789',
    motherName: 'Aminata Camara',
    motherNIN: '1961090467890',
    declarantName: 'Lamine Sylla',
    declarantRelation: 'père',
    registrationDate: '1986-06-30',
    registrationNumber: '1986-DXN-00076',
    registryOffice: 'Mairie de Dixinn',
    status: 'active',
  },

  // 38. Fanta Doumbouya
  {
    id: 'BR-2024-038',
    nin: '1970041478901',
    lastName: 'Doumbouya',
    firstName: 'Fanta',
    dateOfBirth: '1970-04-14',
    placeOfBirth: 'Guéckédou',
    region: "N'Zérékoré",
    gender: 'F',
    fatherName: 'Sékou Doumbouya',
    fatherNIN: '1940050889012',
    motherName: 'Kadiatou Leno',
    motherNIN: '1945101901234',
    declarantName: 'Sékou Doumbouya',
    declarantRelation: 'père',
    registrationDate: '1970-04-16',
    registrationNumber: '1970-GKD-00023',
    registryOffice: 'Mairie de Guéckédou',
    status: 'active',
  },

  // 39. Lamine Bah — declared by uncle
  {
    id: 'BR-2024-039',
    nin: '2005080390123',
    lastName: 'Bah',
    firstName: 'Lamine',
    dateOfBirth: '2005-08-03',
    placeOfBirth: 'Ratoma',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Moussa Bah',
    fatherNIN: '1975011701234',
    motherName: 'Mariama Sow',
    motherNIN: '1980040912345',
    declarantName: 'Thierno Bah',
    declarantRelation: 'oncle',
    registrationDate: '2005-08-06',
    registrationNumber: '2005-RTM-00134',
    registryOffice: 'Mairie de Ratoma',
    status: 'active',
  },

  // 40. Djénéba Sow — declared by mother
  {
    id: 'BR-2024-040',
    nin: '2015051223456',
    lastName: 'Sow',
    firstName: 'Djénéba',
    dateOfBirth: '2015-05-12',
    placeOfBirth: 'Matam',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Ibrahima Sow',
    fatherNIN: '1985091534567',
    motherName: 'Aminata Diallo',
    motherNIN: '1990032045678',
    declarantName: 'Aminata Diallo',
    declarantRelation: 'mère',
    registrationDate: '2015-05-14',
    registrationNumber: '2015-MTM-00067',
    registryOffice: 'Mairie de Matam',
    status: 'active',
  },

  // 41. Sékou Condé — older record from independence era
  {
    id: 'BR-2024-041',
    nin: '1962100756789',
    lastName: 'Condé',
    firstName: 'Sékou',
    dateOfBirth: '1962-10-07',
    placeOfBirth: 'Kaloum',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Alpha Condé',
    fatherNIN: '1935041267890',
    motherName: 'Hadja Touré',
    motherNIN: '1940081578901',
    declarantName: 'Alpha Condé',
    declarantRelation: 'père',
    registrationDate: '1962-10-09',
    registrationNumber: '1962-KLM-00048',
    registryOffice: 'Mairie de Kaloum',
    status: 'active',
  },

  // 42. Mariama Doumbouya
  {
    id: 'BR-2024-042',
    nin: '1998092489012',
    lastName: 'Doumbouya',
    firstName: 'Mariama',
    dateOfBirth: '1998-09-24',
    placeOfBirth: 'Macenta',
    region: "N'Zérékoré",
    gender: 'F',
    fatherName: 'Mamadou Doumbouya',
    fatherNIN: '1968031190123',
    motherName: 'Fatoumata Leno',
    motherNIN: '1973070501234',
    declarantName: 'Mamadou Doumbouya',
    declarantRelation: 'père',
    registrationDate: '1998-09-26',
    registrationNumber: '1998-MCT-00041',
    registryOffice: 'Mairie de Macenta',
    status: 'active',
  },

  // 43. Ibrahima Fofana
  {
    id: 'BR-2024-043',
    nin: '2001071812345',
    lastName: 'Fofana',
    firstName: 'Ibrahima',
    dateOfBirth: '2001-07-18',
    placeOfBirth: 'Boké',
    region: 'Boké',
    gender: 'M',
    fatherName: 'Abdoulaye Fofana',
    fatherNIN: '1971010423456',
    motherName: 'Djénébou Kaba',
    motherNIN: '1976061734567',
    declarantName: 'Abdoulaye Fofana',
    declarantRelation: 'père',
    registrationDate: '2001-07-20',
    registrationNumber: '2001-BKE-00055',
    registryOffice: 'Mairie de Boké',
    status: 'active',
  },

  // 44. Aissatou Touré
  {
    id: 'BR-2024-044',
    nin: '2004120145678',
    lastName: 'Touré',
    firstName: 'Aissatou',
    dateOfBirth: '2004-12-01',
    placeOfBirth: 'Kaloum',
    region: 'Conakry',
    gender: 'F',
    fatherName: 'Moussa Touré',
    fatherNIN: '1974082256789',
    motherName: 'Kadiatou Diallo',
    motherNIN: '1979031567890',
    declarantName: 'Moussa Touré',
    declarantRelation: 'père',
    registrationDate: '2004-12-03',
    registrationNumber: '2004-KLM-00289',
    registryOffice: 'Mairie de Kaloum',
    status: 'active',
  },

  // 45. Mamadou Keita — declared by uncle
  {
    id: 'BR-2024-045',
    nin: '2012020678901',
    lastName: 'Keita',
    firstName: 'Mamadou',
    dateOfBirth: '2012-02-06',
    placeOfBirth: 'Labé',
    region: 'Labé',
    gender: 'M',
    fatherName: 'Ibrahim Keita',
    fatherNIN: '1982071489012',
    motherName: 'Aminata Bah',
    motherNIN: '1987110901234',
    declarantName: 'Sékou Keita',
    declarantRelation: 'oncle',
    registrationDate: '2012-02-09',
    registrationNumber: '2012-LBE-00078',
    registryOffice: 'Mairie de Labé',
    status: 'active',
  },

  // 46. Kadiatou Traoré
  {
    id: 'BR-2024-046',
    nin: '1980031590123',
    lastName: 'Traoré',
    firstName: 'Kadiatou',
    dateOfBirth: '1980-03-15',
    placeOfBirth: 'Kankan',
    region: 'Kankan',
    gender: 'F',
    fatherName: 'Sékou Traoré',
    fatherNIN: '1950100801234',
    motherName: 'Mariam Bangoura',
    motherNIN: '1955041612345',
    declarantName: 'Sékou Traoré',
    declarantRelation: 'père',
    registrationDate: '1980-03-17',
    registrationNumber: '1980-KKN-00143',
    registryOffice: 'Mairie de Kankan',
    status: 'active',
  },

  // 47. Alpha Bangoura
  {
    id: 'BR-2024-047',
    nin: '1995062223456',
    lastName: 'Bangoura',
    firstName: 'Alpha',
    dateOfBirth: '1995-06-22',
    placeOfBirth: 'Matoto',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Mamadou Bangoura',
    fatherNIN: '1965091134567',
    motherName: 'Fatoumata Sylla',
    motherNIN: '1970020456789',
    declarantName: 'Mamadou Bangoura',
    declarantRelation: 'père',
    registrationDate: '1995-06-24',
    registrationNumber: '1995-MTT-00301',
    registryOffice: 'Mairie de Matoto',
    status: 'active',
  },

  // 48. Hadja Camara — declared by mother
  {
    id: 'BR-2024-048',
    nin: '2018071145678',
    lastName: 'Camara',
    firstName: 'Hadja',
    dateOfBirth: '2018-07-11',
    placeOfBirth: 'Kindia',
    region: 'Kindia',
    gender: 'F',
    fatherName: 'Ousmane Camara',
    fatherNIN: '1988032456789',
    motherName: 'Mariama Soumah',
    motherNIN: '1993010767890',
    declarantName: 'Mariama Soumah',
    declarantRelation: 'mère',
    registrationDate: '2018-07-13',
    registrationNumber: '2018-KND-00042',
    registryOffice: 'Mairie de Kindia',
    status: 'active',
  },

  // 49. Moussa Sy Savané
  {
    id: 'BR-2024-049',
    nin: '1987100167890',
    lastName: 'Sy Savané',
    firstName: 'Moussa',
    dateOfBirth: '1987-10-01',
    placeOfBirth: 'Dixinn',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Facinet Sy Savané',
    fatherNIN: '1957081578901',
    motherName: 'Saran Fofana',
    motherNIN: '1962120490123',
    declarantName: 'Facinet Sy Savané',
    declarantRelation: 'père',
    registrationDate: '1987-10-03',
    registrationNumber: '1987-DXN-00094',
    registryOffice: 'Mairie de Dixinn',
    status: 'active',
  },

  // 50. Fatoumata Soumah
  {
    id: 'BR-2024-050',
    nin: '2000040889012',
    lastName: 'Soumah',
    firstName: 'Fatoumata',
    dateOfBirth: '2000-04-08',
    placeOfBirth: 'Mamou',
    region: 'Mamou',
    gender: 'F',
    fatherName: 'Ibrahim Soumah',
    fatherNIN: '1970021501234',
    motherName: 'Aminata Baldé',
    motherNIN: '1975070812345',
    declarantName: 'Ibrahim Soumah',
    declarantRelation: 'père',
    registrationDate: '2000-04-10',
    registrationNumber: '2000-MMO-00073',
    registryOffice: 'Mairie de Mamou',
    status: 'active',
  },

  // 51. Ousmane Diallo
  {
    id: 'BR-2024-051',
    nin: '1991081923456',
    lastName: 'Diallo',
    firstName: 'Ousmane',
    dateOfBirth: '1991-08-19',
    placeOfBirth: 'Kaloum',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Mamady Diallo',
    fatherNIN: '1961040734567',
    motherName: 'Djénéba Condé',
    motherNIN: '1966081156789',
    declarantName: 'Mamady Diallo',
    declarantRelation: 'père',
    registrationDate: '1991-08-21',
    registrationNumber: '1991-KLM-00256',
    registryOffice: 'Mairie de Kaloum',
    status: 'active',
  },

  // 52. Mariama Baldé
  {
    id: 'BR-2024-052',
    nin: '1975091745678',
    lastName: 'Baldé',
    firstName: 'Mariama',
    dateOfBirth: '1975-09-17',
    placeOfBirth: 'Faranah',
    region: 'Faranah',
    gender: 'F',
    fatherName: 'Thierno Baldé',
    fatherNIN: '1945120867890',
    motherName: 'Kadiatou Sow',
    motherNIN: '1950032578901',
    declarantName: 'Thierno Baldé',
    declarantRelation: 'père',
    registrationDate: '1975-09-19',
    registrationNumber: '1975-FRH-00067',
    registryOffice: 'Mairie de Faranah',
    status: 'active',
  },

  // 53. Mamady Condé
  {
    id: 'BR-2024-053',
    nin: '1969051167890',
    lastName: 'Condé',
    firstName: 'Mamady',
    dateOfBirth: '1969-05-11',
    placeOfBirth: 'Kankan',
    region: 'Kankan',
    gender: 'M',
    fatherName: 'Sékou Condé',
    fatherNIN: '1940031489012',
    motherName: 'Hadja Keita',
    motherNIN: '1945080701234',
    declarantName: 'Sékou Condé',
    declarantRelation: 'père',
    registrationDate: '1969-05-13',
    registrationNumber: '1969-KKN-00089',
    registryOffice: 'Mairie de Kankan',
    status: 'active',
  },

  // 54. Aminata Kouyaté — mother of record #28
  {
    id: 'BR-2024-054',
    nin: '1969122478901',
    lastName: 'Kouyaté',
    firstName: 'Aminata',
    dateOfBirth: '1969-12-24',
    placeOfBirth: 'Kissidougou',
    region: "N'Zérékoré",
    gender: 'F',
    fatherName: 'Mamadou Kouyaté',
    fatherNIN: '1940110501234',
    motherName: 'Fatoumata Sylla',
    motherNIN: '1945041812345',
    declarantName: 'Mamadou Kouyaté',
    declarantRelation: 'père',
    registrationDate: '1969-12-26',
    registrationNumber: '1969-KSG-00031',
    registryOffice: 'Mairie de Kissidougou',
    status: 'active',
  },

  // 55. Ibrahim Camara — young child, recent registration
  {
    id: 'BR-2024-055',
    nin: '2020012301234',
    lastName: 'Camara',
    firstName: 'Ibrahim',
    dateOfBirth: '2020-01-23',
    placeOfBirth: 'Matam',
    region: 'Conakry',
    gender: 'M',
    fatherName: 'Moussa Camara',
    fatherNIN: '1988072256789',
    motherName: 'Fatoumata Touré',
    motherNIN: '1993110867890',
    declarantName: 'Moussa Camara',
    declarantRelation: 'père',
    registrationDate: '2020-01-25',
    registrationNumber: '2020-MTM-00019',
    registryOffice: 'Mairie de Matam',
    status: 'active',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP & VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find a birth record by National Identification Number (NIN)
 */
export function findBirthRecordByNIN(nin: string): BirthRecord | undefined {
  return birthRecords.find(record => record.nin === nin)
}

/**
 * Find birth records by last name and first name
 * Returns all matching records (there may be multiple people with the same name)
 */
export function findBirthRecordsByName(lastName: string, firstName: string): BirthRecord[] {
  const normalizedLastName = lastName.trim().toLowerCase()
  const normalizedFirstName = firstName.trim().toLowerCase()
  return birthRecords.filter(
    record =>
      record.lastName.trim().toLowerCase() === normalizedLastName &&
      record.firstName.trim().toLowerCase() === normalizedFirstName
  )
}

/**
 * Find a birth record by official registration number
 */
export function findBirthRecordByRegistrationNumber(regNumber: string): BirthRecord | undefined {
  return birthRecords.find(record => record.registrationNumber === regNumber)
}

/**
 * Validate a birth record claim against the national registry.
 *
 * Checks NIN, last name, first name, and date of birth.
 * Returns a detailed validation result including any mismatches.
 */
export function validateBirthRecord(
  nin: string,
  lastName: string,
  firstName: string,
  dateOfBirth: string
): { valid: boolean; record?: BirthRecord; details: string } {
  const record = findBirthRecordByNIN(nin)

  if (!record) {
    return {
      valid: false,
      details: 'Aucun acte de naissance trouvé pour ce NIN',
    }
  }

  // Check if the record is cancelled
  if (record.status === 'cancelled') {
    return {
      valid: false,
      record,
      details: `Acte de naissance annulé — L'acte n°${record.registrationNumber} enregistré à ${record.registryOffice} a été annulé. Toute utilisation est invalide.`,
    }
  }

  // Collect mismatches
  const mismatches: string[] = []

  if (record.lastName.trim().toLowerCase() !== lastName.trim().toLowerCase()) {
    mismatches.push(
      `Nom de famille : la valeur fournie "${lastName}" ne correspond pas à "${record.lastName}" enregistrée`
    )
  }

  if (record.firstName.trim().toLowerCase() !== firstName.trim().toLowerCase()) {
    mismatches.push(
      `Prénom : la valeur fournie "${firstName}" ne correspond pas à "${record.firstName}" enregistré`
    )
  }

  if (record.dateOfBirth !== dateOfBirth) {
    mismatches.push(
      `Date de naissance : la valeur fournie "${dateOfBirth}" ne correspond pas à "${record.dateOfBirth}" enregistrée`
    )
  }

  if (mismatches.length > 0) {
    return {
      valid: false,
      record,
      details: `Acte trouvé pour le NIN ${nin} mais avec des incohérences : ${mismatches.join(' ; ')}`,
    }
  }

  // All fields match
  const amendmentNote = record.status === 'amended' && record.amendments && record.amendments.length > 0
    ? ` Attention : cet acte comporte ${record.amendments.length} modification(s) judiciaire(s).`
    : ''

  return {
    valid: true,
    record,
    details: `Acte de naissance vérifié avec succès — ${record.firstName} ${record.lastName}, né(e) le ${record.dateOfBirth} à ${record.placeOfBirth} (${record.region}). Acte n°${record.registrationNumber}, ${record.registryOffice}.${amendmentNote}`,
  }
}

/**
 * Get all birth records in the database
 */
export function getAllBirthRecords(): BirthRecord[] {
  return [...birthRecords]
}

/**
 * Get birth records filtered by registry office
 */
export function getBirthRecordsByRegistry(registryOffice: string): BirthRecord[] {
  return birthRecords.filter(
    record => record.registryOffice.trim().toLowerCase() === registryOffice.trim().toLowerCase()
  )
}

/**
 * Get birth records filtered by administrative region
 */
export function getBirthRecordsByRegion(region: string): BirthRecord[] {
  return birthRecords.filter(
    record => record.region.trim().toLowerCase() === region.trim().toLowerCase()
  )
}
