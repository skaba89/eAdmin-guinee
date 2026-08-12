import assert from 'node:assert/strict'

import type { AppPage, UserRole } from '../src/store/app-store'
import { canRoleSeeSpecializedPage } from '../src/lib/specialized-page-role-policy'

const exactRoleCases: Array<[AppPage, UserRole]> = [
  ['mairie-dashboard', 'mairie'],
  ['agence-dashboard', 'agence'],
  ['agent-dashboard', 'agent'],
  ['chef-service-dashboard', 'chef_service'],
  ['ministre-dashboard', 'ministre'],
]

const allRoles: UserRole[] = [
  'citizen',
  'mairie',
  'admin_general',
  'agence',
  'agent',
  'chef_service',
  'directeur',
  'ministre',
  'ministere',
  'super_admin',
]

for (const [page, exactRole] of exactRoleCases) {
  for (const role of allRoles) {
    const expected = role === exactRole || role === 'super_admin'
    assert.equal(
      canRoleSeeSpecializedPage(page, role),
      expected,
      `${role} => ${page} doit être ${expected ? 'autorisé' : 'refusé'}`,
    )
  }
}

for (const page of ['dashboard', 'service-requests', 'ged', 'admin'] as AppPage[]) {
  for (const role of allRoles) {
    assert.equal(
      canRoleSeeSpecializedPage(page, role),
      true,
      `${page} n'est pas une page spécialisée et reste gouvernée par le RBAC générique`,
    )
  }
}

assert.equal(canRoleSeeSpecializedPage('ministre-dashboard', undefined), false)

console.log('PASS: specialized dashboards require the exact role; SUPER_ADMIN retains global override')
