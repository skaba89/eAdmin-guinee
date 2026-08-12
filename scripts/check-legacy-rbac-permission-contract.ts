import assert from 'node:assert/strict'

import type { UserInfo } from '../src/store/app-store'
import { hasPermission } from '../src/lib/rbac'

function user(role: UserInfo['role']): UserInfo {
  return {
    id: `contract-${role}`,
    name: `Contract ${role}`,
    email: `${role.replaceAll('_', '-')}@contract.eadmin.gn`,
    role,
    institution: 'Mairie de Kaloum',
    fonction: 'Contract test',
    tenantId: 'tenant-contract',
    institutionId: 'institution-contract',
  }
}

const processOnlyRoles: UserInfo['role'][] = ['mairie', 'agence', 'agent', 'admin_general']
for (const role of processOnlyRoles) {
  const current = user(role)
  assert.equal(hasPermission(current, 'service-requests:process'), true, `${role} doit pouvoir traiter`)
  assert.equal(hasPermission(current, 'service-requests:approve'), false, `${role} ne doit pas pouvoir approuver`)
  assert.equal(hasPermission(current, 'service-requests:reject'), false, `${role} ne doit pas pouvoir rejeter`)
}

const decisionRoles: UserInfo['role'][] = ['chef_service', 'directeur', 'ministre', 'ministere', 'super_admin']
for (const role of decisionRoles) {
  const current = user(role)
  assert.equal(hasPermission(current, 'service-requests:process'), true, `${role} doit pouvoir traiter`)
  assert.equal(hasPermission(current, 'service-requests:approve'), true, `${role} doit pouvoir approuver`)
  assert.equal(hasPermission(current, 'service-requests:reject'), true, `${role} doit pouvoir rejeter`)
}

assert.equal(hasPermission(user('citizen'), 'service-requests:create'), true)
assert.equal(hasPermission(user('citizen'), 'service-requests:process'), false)
assert.equal(hasPermission(user('admin_general'), 'service-requests:delete'), false, 'ADMIN ne doit pas supprimer une demande')
assert.equal(hasPermission(user('super_admin'), 'service-requests:delete'), true, 'SUPER_ADMIN conserve la suppression')

// Lateral inheritance must never grant one operational role the direct rights of another.
assert.equal(hasPermission(user('agence'), 'courriers:create'), false, 'AGENCE ne doit pas hériter de MAIRIE')
assert.equal(hasPermission(user('agent'), 'courriers:create'), false, 'AGENT ne doit pas hériter de MAIRIE')
assert.equal(hasPermission(user('mairie'), 'courriers:create'), true, 'MAIRIE conserve son droit direct courrier')

const source = await Bun.file('src/lib/rbac.ts').text()
for (const forbidden of [
  'getInheritedPermissions(',
  'level <= roleLevel',
  'each higher level inherits all permissions',
]) {
  assert.equal(source.includes(forbidden), false, `Héritage RBAC implicite encore présent: ${forbidden}`)
}

console.log('PASS: legacy RBAC permissions are explicit, non-lateral and aligned for request decisions')
