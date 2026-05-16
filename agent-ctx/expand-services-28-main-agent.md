# Task: expand-services-28
# Agent: Main Agent
# Status: COMPLETED

## Summary
Expanded the eAdministration Suite Guinea from 20→28 services and 100→140 test citizen accounts.

## Files Modified
1. `/src/components/landing/public-citizen-portal.tsx` - Added 8 new services across 2 new + 3 existing categories
2. `/src/data/demo-accounts.ts` - Added 40 new test accounts, updated SERVICE_IDS, SERVICE_NAMES, SERVICE_CATEGORY_MAP
3. `/src/store/citizen-requests-store.ts` - Added entity maps, status patterns, docs, rejection reasons for new services
4. `/src/lib/rbac.ts` - Added new institution category access mappings

## Changes Detail

### New Categories Added
- **Fiscalité & Impôts** (id: `fiscalite`, slate color scheme)
  - fi-1: Certificat de situation fiscale
  - fi-2: Déclaration d'impôts
- **Social & Assistance** (id: `social`, rose color scheme)
  - so-1: Carte d'assurance maladie
  - so-2: Allocations familiales

### Existing Categories Expanded
- **Urbanisme** (added 2): u-2 Certificat de conformité, u-3 Titre foncier
- **Éducation** (added 1): ed-3 Équivalence de diplôme
- **État Civil** (added 1): ec-6 Changement de nom

### New Test Accounts (40 total)
- fisc1-5@test.gn, impot1-5@test.gn, assur1-5@test.gn, alloc1-5@test.gn
- conform1-5@test.gn, foncier1-5@test.gn, equiv1-5@test.gn, nom1-5@test.gn

### New Institutions
- Direction Générale des Impôts → fiscalite category
- Caisse Nationale de Sécurité Sociale → social category

## Verification
- 28 services confirmed in portal component
- 140 test.gn emails confirmed
- 40 new service IDs confirmed
- All lint checks pass
- Store version bumped to 5 for migration
