import assert from 'node:assert/strict'

import type { UserInfo } from '../src/store/app-store'
import type { CitizenRequest } from '../src/store/citizen-requests-store'
import {
  HIERARCHY_LEVELS,
  canProcessRequest,
  canViewRequest,
  filterCourriersByRLS,
  filterRequestsByRLS,
} from '../src/lib/rbac'

assert.deepEqual(HIERARCHY_LEVELS, {
  citoyen: 0,
  mairie: 2,
  agence: 2,
  agent: 2,
  chef_service: 4,
  directeur: 5,
  ministre: 6,
  ministere: 6,
  admin: 3,
  superadmin: 7,
})

function user(role: UserInfo['role'], overrides: Partial<UserInfo> = {}): UserInfo {
  return {
    id: `scope-${role}`,
    name: `Scope ${role}`,
    email: `${role.replaceAll('_', '-')}@scope.eadmin.gn`,
    role,
    institution: 'Institution A',
    fonction: 'Scope contract',
    tenantId: 'tenant-a',
    institutionId: 'institution-a',
    ...overrides,
  }
}

function request(id: string, overrides: Partial<CitizenRequest> = {}): CitizenRequest {
  return {
    id,
    reference: `REF-${id}`,
    serviceId: 'ec-1',
    serviceName: 'Service test',
    category: 'État civil',
    categoryId: 'etat-civil',
    citizenName: 'Diallo',
    citizenFirstName: 'Aminata',
    citizenNIN: 'NIN-CONTRACT',
    citizenPhone: '+224620000000',
    citizenEmail: 'citizen@scope.eadmin.gn',
    citizenAddress: 'Conakry',
    motif: 'Contrat RBAC',
    documents: [],
    uploadedDocuments: [],
    status: 'soumise',
    assignedService: 'Institution A',
    assignedAgent: '',
    processingNotes: [],
    timeline: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    deadlineDays: 5,
    deadlineDate: new Date(86400000).toISOString(),
    deliveryMode: 'en_ligne',
    tenantId: 'tenant-a',
    institutionId: 'institution-a',
    ...overrides,
  }
}

const ownInstitution = request('OWN')
const otherInstitution = request('OTHER-INST', { institutionId: 'institution-b' })
const otherTenant = request('OTHER-TENANT', { tenantId: 'tenant-b' })
const all = [ownInstitution, otherInstitution, otherTenant]

for (const role of ['mairie', 'agence', 'agent', 'admin_general', 'chef_service', 'directeur'] as const) {
  const current = user(role)
  assert.deepEqual(filterRequestsByRLS(all, current).map((item) => item.id), ['OWN'])
  assert.equal(canViewRequest(current, ownInstitution), true)
  assert.equal(canViewRequest(current, otherInstitution), false)
  assert.equal(canProcessRequest(current, ownInstitution), true)
  assert.equal(canProcessRequest(current, otherInstitution), false)
}

const minister = user('ministre')
assert.deepEqual(filterRequestsByRLS(all, minister).map((item) => item.id), ['OWN', 'OTHER-INST'])
assert.equal(canViewRequest(minister, otherInstitution), true)
assert.equal(canViewRequest(minister, otherTenant), false)

const superAdmin = user('super_admin', { tenantId: undefined, institutionId: undefined })
assert.deepEqual(filterRequestsByRLS(all, superAdmin).map((item) => item.id), ['OWN', 'OTHER-INST', 'OTHER-TENANT'])

const citizen = user('citizen', { email: 'citizen@scope.eadmin.gn' })
assert.deepEqual(filterRequestsByRLS(all, citizen).map((item) => item.id), ['OWN', 'OTHER-INST'])
assert.equal(canProcessRequest(citizen, ownInstitution), false)

const missingScopeAdmin = user('admin_general', { institutionId: undefined })
assert.deepEqual(filterRequestsByRLS(all, missingScopeAdmin), [], 'ADMIN sans institution signée doit échouer fermé')

const courriers = [
  { id: 'normal', confidential: false },
  { id: 'secret', confidential: true },
]
assert.deepEqual(filterCourriersByRLS(courriers, user('mairie')).map((item) => item.id), ['normal'])
assert.deepEqual(filterCourriersByRLS(courriers, user('directeur')).map((item) => item.id), ['normal', 'secret'])
assert.deepEqual(filterCourriersByRLS(courriers, user('admin_general')).map((item) => item.id), ['normal', 'secret'])
assert.deepEqual(filterCourriersByRLS(courriers, user('citizen')), [])

const source = await Bun.file('src/lib/rbac.ts').text()
assert.equal(source.includes('const level = getHierarchyLevel(role)'), false, 'Les scopes ne doivent plus dépendre du niveau numérique')
assert.equal(source.includes('level >= 5'), false, 'Les scopes ne doivent plus utiliser de seuil numérique')
assert.equal(source.includes('filterServiceRequestsBySignedScope'), true, 'Le legacy request RLS doit réutiliser le scope signé')
assert.equal(source.includes('isServiceRequestWithinSignedScope'), true, 'Les contrôles unitaires de demande doivent réutiliser le scope signé')

console.log('PASS: legacy hierarchy matches backend and legacy request scopes are signed/fail-closed')
