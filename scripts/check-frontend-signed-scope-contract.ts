import assert from 'node:assert/strict'

import {
  filterServiceRequestsBySignedScope,
  isServiceRequestWithinSignedScope,
} from '../src/lib/service-request-scope'
import type { UserInfo, UserRole } from '../src/store/app-store'
import type { CitizenRequest } from '../src/store/citizen-requests-store'

function user(
  role: UserRole,
  overrides: Partial<UserInfo> = {},
): UserInfo {
  return {
    id: `scope-${role}`,
    name: `Scope ${role}`,
    email: `${role}@scope.example.com`,
    role,
    institution: 'Institution de recette',
    fonction: 'Contrat scope',
    tenantId: 'tenant-a',
    institutionId: 'inst-a',
    ...overrides,
  }
}

function request(
  id: string,
  tenantId: string,
  institutionId: string,
  citizenEmail = 'citizen@scope.example.com',
): CitizenRequest {
  return {
    id,
    reference: `REF-${id}`,
    serviceId: 'svc',
    serviceName: 'Service',
    category: 'Catégorie',
    categoryId: 'categorie',
    citizenName: 'Nom',
    citizenFirstName: 'Prénom',
    citizenNIN: 'NIN',
    citizenPhone: '+224000000000',
    citizenEmail,
    citizenAddress: 'Conakry',
    motif: 'Test',
    documents: [],
    uploadedDocuments: [],
    status: 'soumise',
    assignedService: 'Institution',
    assignedAgent: '',
    processingNotes: [],
    timeline: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    deadlineDays: 5,
    deadlineDate: new Date(86400000).toISOString(),
    deliveryMode: 'en_ligne',
    tenantId,
    institutionId,
  }
}

const sameInstitution = request('same', 'tenant-a', 'inst-a')
const otherInstitution = request('other-inst', 'tenant-a', 'inst-b')
const otherTenant = request('other-tenant', 'tenant-b', 'inst-a')
const ownCitizen = request('own', 'tenant-a', 'inst-z', 'citizen@scope.example.com')
const otherCitizen = request('other-citizen', 'tenant-a', 'inst-z', 'other@scope.example.com')
const all = [sameInstitution, otherInstitution, otherTenant]

for (const role of ['mairie', 'agence', 'agent', 'admin_general', 'chef_service', 'directeur'] as UserRole[]) {
  assert.deepEqual(
    filterServiceRequestsBySignedScope(all, user(role)).map((item) => item.id),
    ['same'],
    `${role} doit rester dans son institution signée`,
  )
}

assert.deepEqual(
  filterServiceRequestsBySignedScope(all, user('ministre')).map((item) => item.id),
  ['same', 'other-inst'],
  'MINISTRE doit rester dans son tenant signé',
)

assert.deepEqual(
  filterServiceRequestsBySignedScope(all, user('super_admin')).map((item) => item.id),
  ['same', 'other-inst', 'other-tenant'],
  'SUPER_ADMIN conserve le résultat global déjà autorisé par le serveur',
)

assert.deepEqual(
  filterServiceRequestsBySignedScope(
    [ownCitizen, otherCitizen, otherTenant],
    user('citizen', { email: 'citizen@scope.example.com', institutionId: undefined }),
  ).map((item) => item.id),
  ['own'],
  'CITOYEN doit rester dans son tenant et sur son identité',
)

for (const role of ['mairie', 'admin_general', 'directeur'] as UserRole[]) {
  assert.deepEqual(
    filterServiceRequestsBySignedScope(all, user(role, { institutionId: undefined })),
    [],
    `${role} doit échouer fermé sans institution signée`,
  )
}

assert.deepEqual(
  filterServiceRequestsBySignedScope(all, user('ministre', { tenantId: undefined })),
  [],
  'MINISTRE doit échouer fermé sans tenant signé',
)
assert.equal(isServiceRequestWithinSignedScope(sameInstitution, user('admin_general')), true)
assert.equal(isServiceRequestWithinSignedScope(otherInstitution, user('admin_general')), false)

const storeSource = await Bun.file('src/store/app-store.ts').text()
for (const requiredSnippet of [
  'tenantId?: string',
  'institutionId?: string',
  'tenantId: normalizedScope(claims.tenant_id)',
  'institutionId: normalizedScope(claims.institution_id)',
  'decodeJwtPayload(tokens.access_token)',
  'decodeJwtPayload(activeToken)',
  'decodeJwtPayload(pendingToken)',
]) {
  assert.equal(
    storeSource.includes(requiredSnippet),
    true,
    `app-store doit conserver le scope signé: ${requiredSnippet}`,
  )
}

const requestPageSource = await Bun.file('src/components/app/service-requests-page.tsx').text()
assert.equal(
  requestPageSource.includes("from '@/lib/service-request-scope'"),
  true,
  'La page Demandes doit importer le helper de scope signé',
)
assert.equal(
  requestPageSource.includes('filterServiceRequestsBySignedScope(requests, user)'),
  true,
  'La page Demandes doit filtrer avec tenant/institution signés',
)
assert.equal(
  requestPageSource.includes('filterRequestsByRLS(requests, user)'),
  false,
  'La page Demandes ne doit plus utiliser le filtre historique par catégories',
)

console.log('PASS: frontend session and request page enforce signed tenant/institution scope')
