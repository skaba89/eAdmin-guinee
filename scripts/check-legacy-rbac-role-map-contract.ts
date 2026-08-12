import assert from 'node:assert/strict'

import { mapFrontendRoleToLegacyRole } from '../src/lib/legacy-rbac-role-map'

const expected = {
  citizen: 'citoyen',
  mairie: 'mairie',
  agence: 'agence',
  agent: 'agent',
  admin_general: 'admin',
  chef_service: 'chef_service',
  directeur: 'directeur',
  ministre: 'ministre',
  ministere: 'ministere',
  super_admin: 'superadmin',
} as const

for (const [frontendRole, legacyRole] of Object.entries(expected)) {
  assert.equal(
    mapFrontendRoleToLegacyRole(frontendRole),
    legacyRole,
    `${frontendRole} doit conserver son identité fonctionnelle`,
  )
}

for (const legacyRole of [
  'citoyen',
  'mairie',
  'admin',
  'agence',
  'agent',
  'chef_service',
  'directeur',
  'ministre',
  'ministere',
  'superadmin',
]) {
  assert.equal(mapFrontendRoleToLegacyRole(legacyRole), legacyRole)
}

for (const staleOrUnknownRole of [
  'CHEF_SERVICE',
  'AGENT',
  'DIRECTOR',
  'LECTEUR',
  'SUPER_ADMIN',
  'UNKNOWN_PRIVILEGED_ROLE',
]) {
  assert.equal(
    mapFrontendRoleToLegacyRole(staleOrUnknownRole),
    null,
    `${staleOrUnknownRole} ne doit jamais être réinterprété par le moteur legacy`,
  )
}

const rbacSource = await Bun.file('src/lib/rbac.ts').text()
for (const forbiddenSnippet of [
  "'CHEF_SERVICE': 'mairie'",
  "'AGENT': 'agence'",
  "'DIRECTOR': 'ministere'",
  "'LECTEUR': 'citoyen'",
  'role as UserRole',
]) {
  assert.equal(
    rbacSource.includes(forbiddenSnippet),
    false,
    `Le moteur legacy contient encore un mapping/cast non sûr: ${forbiddenSnippet}`,
  )
}

assert.equal(
  rbacSource.includes("mapFrontendRoleToLegacyRole(user.role) ?? 'citoyen'"),
  true,
  'mapUserRole doit échouer fermé sur citoyen',
)
assert.equal(
  rbacSource.includes("mapFrontendRoleToLegacyRole(role) ?? 'citoyen'"),
  true,
  'mapRole doit échouer fermé sur citoyen',
)

console.log('PASS: legacy RBAC role mapping preserves canonical identity and fails closed')
