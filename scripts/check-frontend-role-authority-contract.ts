import assert from 'node:assert/strict'

import {
  FRONTEND_ROLE_LEVELS,
  getFrontendRoleLevel,
  isGlobalFrontendRole,
  isInstitutionScopedFrontendRole,
  isTenantWideFrontendRole,
  mapBackendRoleToFrontend,
} from '../src/lib/frontend-role-authority'

const expectedLevels = {
  citizen: 0,
  mairie: 2,
  agence: 2,
  agent: 2,
  admin_general: 3,
  chef_service: 4,
  directeur: 5,
  ministre: 6,
  ministere: 6,
  super_admin: 7,
} as const

assert.deepEqual(FRONTEND_ROLE_LEVELS, expectedLevels)

const backendMappings = {
  CITOYEN: 'citizen',
  MAIRIE: 'mairie',
  AGENCE: 'agence',
  AGENT: 'agent',
  ADMIN: 'admin_general',
  CHEF_SERVICE: 'chef_service',
  DIRECTEUR: 'directeur',
  MINISTRE: 'ministre',
  SUPER_ADMIN: 'super_admin',
} as const

for (const [backendRole, frontendRole] of Object.entries(backendMappings)) {
  assert.equal(mapBackendRoleToFrontend(backendRole), frontendRole)
  assert.equal(mapBackendRoleToFrontend(backendRole.toLowerCase()), frontendRole)
}
assert.equal(mapBackendRoleToFrontend('UNKNOWN_PRIVILEGED_ROLE'), null)

for (const role of ['mairie', 'agence', 'agent', 'admin_general', 'chef_service', 'directeur'] as const) {
  assert.equal(isInstitutionScopedFrontendRole(role), true, `${role} doit être institution-scoped`)
}
assert.equal(isInstitutionScopedFrontendRole('citizen'), false)
assert.equal(isInstitutionScopedFrontendRole('ministre'), false)
assert.equal(isInstitutionScopedFrontendRole('super_admin'), false)
assert.equal(isTenantWideFrontendRole('ministre'), true)
assert.equal(isTenantWideFrontendRole('ministere'), true)
assert.equal(isGlobalFrontendRole('super_admin'), true)
assert.equal(getFrontendRoleLevel('admin_general'), 3)
assert.equal(getFrontendRoleLevel('chef_service'), 4)

const backendSource = await Bun.file('backend/app/models/user.py').text()
for (const snippet of [
  'RoleEnum.CITOYEN: 0',
  'RoleEnum.MAIRIE: 2',
  'RoleEnum.AGENCE: 2',
  'RoleEnum.AGENT: 2',
  'RoleEnum.ADMIN: 3',
  'RoleEnum.CHEF_SERVICE: 4',
  'RoleEnum.DIRECTEUR: 5',
  'RoleEnum.MINISTRE: 6',
  'RoleEnum.SUPER_ADMIN: 7',
]) {
  assert.equal(backendSource.includes(snippet), true, `Parité backend manquante: ${snippet}`)
}

console.log('PASS: frontend role authority matches backend RoleEnum hierarchy and scope classes')
