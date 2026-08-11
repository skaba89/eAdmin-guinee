import assert from 'node:assert/strict'

import {
  canApproveServiceRequest,
  canProcessServiceRequest,
  canRejectServiceRequest,
} from '../src/lib/service-request-rbac'
import type { UserInfo, UserRole } from '../src/store/app-store'

function user(role: UserRole): UserInfo {
  return {
    id: `contract-${role}`,
    name: `Contract ${role}`,
    email: `${role}@contract.example.com`,
    role,
    institution: 'Institution de recette',
    fonction: 'Contrat RBAC',
  }
}

const processOnly: UserRole[] = ['mairie', 'agence', 'agent', 'admin_general']
const decisionRoles: UserRole[] = [
  'chef_service',
  'directeur',
  'ministre',
  'ministere',
  'super_admin',
]

assert.equal(canProcessServiceRequest(user('citizen')), false)
assert.equal(canApproveServiceRequest(user('citizen')), false)
assert.equal(canRejectServiceRequest(user('citizen')), false)

for (const role of processOnly) {
  assert.equal(canProcessServiceRequest(user(role)), true, `${role} doit pouvoir traiter`)
  assert.equal(canApproveServiceRequest(user(role)), false, `${role} ne doit pas pouvoir valider`)
  assert.equal(canRejectServiceRequest(user(role)), false, `${role} ne doit pas pouvoir rejeter`)
}

for (const role of decisionRoles) {
  assert.equal(canProcessServiceRequest(user(role)), true, `${role} doit pouvoir traiter`)
  assert.equal(canApproveServiceRequest(user(role)), true, `${role} doit pouvoir valider`)
  assert.equal(canRejectServiceRequest(user(role)), true, `${role} doit pouvoir rejeter`)
}

console.log('PASS: frontend service-request RBAC matches the backend decision boundary')
