import { expect, test, type Page } from '@playwright/test'

const password = process.env.EADMIN_UI_E2E_PASSWORD ?? ''
const group = process.env.EADMIN_UI_E2E_GROUP ?? ''

type ActionContract = 'none' | 'process-only' | 'decision'

type RoleCase = {
  group: 'frontline' | 'institutional' | 'oversight'
  role: string
  email: string
  visibleNav: string[]
  hiddenNav: string[]
  visibleReference: string
  additionalVisibleReferences?: string[]
  hiddenReference?: string
  actionContract: ActionContract
}

const CASES: RoleCase[] = [
  {
    group: 'frontline',
    role: 'CITOYEN',
    email: 'citoyen.awa@recette.eadmin.gn',
    visibleNav: ['Mon Portail', 'Demandes citoyennes'],
    hiddenNav: ['Administration', 'Utilisateurs'],
    visibleReference: 'REC-GN-2026-002',
    hiddenReference: 'REC-GN-2026-003',
    actionContract: 'none',
  },
  {
    group: 'frontline',
    role: 'AGENT',
    email: 'agent.ratoma@recette.eadmin.gn',
    visibleNav: ['Mon Espace Agent', 'Demandes citoyennes', 'GED'],
    hiddenNav: ['Administration', 'Utilisateurs'],
    visibleReference: 'REC-GN-2026-002',
    hiddenReference: 'REC-GN-2026-003',
    actionContract: 'process-only',
  },
  {
    group: 'frontline',
    role: 'MAIRIE',
    email: 'mairie.ratoma@recette.eadmin.gn',
    visibleNav: ['Tableau de bord Mairie', 'Demandes citoyennes', 'Courriers'],
    hiddenNav: ['Administration', 'Workflows'],
    visibleReference: 'REC-GN-2026-002',
    hiddenReference: 'REC-GN-2026-003',
    actionContract: 'process-only',
  },
  {
    group: 'institutional',
    role: 'AGENCE',
    email: 'agence.anip@recette.eadmin.gn',
    visibleNav: ['Tableau de bord Agence', 'Demandes citoyennes', 'GED'],
    hiddenNav: ['Administration', 'Courriers'],
    visibleReference: 'REC-UI-AGENCE-001',
    hiddenReference: 'REC-GN-2026-002',
    actionContract: 'process-only',
  },
  {
    group: 'institutional',
    role: 'ADMIN',
    email: 'admin.ratoma@recette.eadmin.gn',
    visibleNav: ['Administration', 'Utilisateurs', 'Demandes citoyennes'],
    hiddenNav: ['Cabinet Ministériel', 'Mon Espace Chef Service'],
    visibleReference: 'REC-GN-2026-002',
    hiddenReference: 'REC-GN-2026-003',
    actionContract: 'process-only',
  },
  {
    group: 'institutional',
    role: 'CHEF_SERVICE',
    email: 'chef.casier@recette.eadmin.gn',
    visibleNav: ['Mon Espace Chef Service', 'Demandes citoyennes', 'Utilisateurs'],
    hiddenNav: ['Administration', 'Analytics'],
    visibleReference: 'REC-UI-CHEF-001',
    hiddenReference: 'REC-UI-DIRECTEUR-001',
    actionContract: 'decision',
  },
  {
    group: 'oversight',
    role: 'DIRECTEUR',
    email: 'directeur.justice@recette.eadmin.gn',
    visibleNav: ['Tableau de bord', 'Demandes citoyennes', 'Analytics'],
    hiddenNav: ['Administration', 'Cabinet Ministériel'],
    visibleReference: 'REC-UI-CHEF-001',
    additionalVisibleReferences: ['REC-UI-DIRECTEUR-001'],
    hiddenReference: 'REC-GN-2026-002',
    actionContract: 'decision',
  },
  {
    group: 'oversight',
    role: 'MINISTRE',
    email: 'ministre.justice@recette.eadmin.gn',
    visibleNav: ['Cabinet Ministériel', 'Tableau de bord', 'Demandes citoyennes'],
    hiddenNav: ['Administration', 'Utilisateurs'],
    visibleReference: 'REC-UI-DIRECTEUR-001',
    hiddenReference: 'REC-ISO-2026-001',
    actionContract: 'decision',
  },
  {
    group: 'oversight',
    role: 'SUPER_ADMIN',
    email: 'superadmin.recette@recette.eadmin.gn',
    visibleNav: ['Administration', 'Utilisateurs', 'Demandes citoyennes'],
    hiddenNav: [],
    visibleReference: 'REC-UI-DIRECTEUR-001',
    actionContract: 'decision',
  },
]

function sidebar(page: Page) {
  return page.locator('aside')
}

function navButton(page: Page, label: string) {
  return sidebar(page).getByRole('button', { name: label, exact: true })
}

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/')

  const emailInput = page.locator('#login-email')
  if (!(await emailInput.isVisible())) {
    const connectionEntry = page.getByText('Connexion', { exact: true }).first()
    await expect(connectionEntry).toBeVisible()
    await connectionEntry.click()
  }

  await expect(emailInput).toBeVisible()
  await emailInput.fill(email)
  await page.locator('#login-password').fill(password)

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST'
      && response.url().includes('/api/v1/auth/login'),
  )

  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  const loginResponse = await loginResponsePromise
  expect(loginResponse.status(), `Connexion API échouée pour ${email}`).toBe(200)

  await expect(sidebar(page)).toBeVisible({ timeout: 15_000 })
  await expect(navButton(page, 'Demandes citoyennes')).toBeVisible({ timeout: 15_000 })
}

async function expectNavigation(page: Page, roleCase: RoleCase): Promise<void> {
  for (const label of roleCase.visibleNav) {
    await expect(
      navButton(page, label),
      `${roleCase.role} doit voir le lien ${label}`,
    ).toBeVisible()
  }
  for (const label of roleCase.hiddenNav) {
    await expect(
      navButton(page, label),
      `${roleCase.role} ne doit pas voir le lien ${label}`,
    ).toHaveCount(0)
  }
}

async function goToRequests(page: Page): Promise<void> {
  await navButton(page, 'Demandes citoyennes').click()
  await expect(
    page.getByRole('heading', { name: 'Traitement des Demandes Citoyennes', level: 2 }),
  ).toBeVisible({ timeout: 15_000 })
}

async function openRequest(page: Page, reference: string): Promise<void> {
  await goToRequests(page)
  await page.getByRole('tab', { name: /Toutes \(/ }).click()
  const requestReference = page.getByText(reference, { exact: true }).first()
  await expect(requestReference).toBeVisible({ timeout: 15_000 })
  await requestReference.click()
  await expect(page.getByText(reference, { exact: true }).last()).toBeVisible()
}

async function expectVisibleReferences(page: Page, references: string[] = []): Promise<void> {
  if (references.length === 0) return
  await page.getByRole('tab', { name: /Toutes \(/ }).click()
  for (const reference of references) {
    await expect(page.getByText(reference, { exact: true }).first()).toBeVisible()
  }
}

async function expectHiddenReference(page: Page, reference?: string): Promise<void> {
  if (!reference) return
  await page.getByRole('tab', { name: /Toutes \(/ }).click()
  await expect(page.getByText(reference, { exact: true })).toHaveCount(0)
}

async function expectActionContract(
  page: Page,
  reference: string,
  contract: ActionContract,
): Promise<void> {
  const selectedReference = page.getByText(reference, { exact: true }).last()
  const detailCard = selectedReference.locator('xpath=ancestor::*[@data-slot="card"][1]')
  await expect(detailCard).toBeVisible()

  const processButton = detailCard.getByRole('button', { name: 'Demander pièces', exact: true })
  const approveButton = detailCard.getByRole('button', { name: 'Valider', exact: true })
  const rejectButton = detailCard.getByRole('button', { name: 'Rejeter', exact: true })

  if (contract === 'none') {
    await expect(processButton).toHaveCount(0)
    await expect(approveButton).toHaveCount(0)
    await expect(rejectButton).toHaveCount(0)
    return
  }

  await expect(processButton).toBeVisible()
  if (contract === 'process-only') {
    await expect(approveButton).toHaveCount(0)
    await expect(rejectButton).toHaveCount(0)
    return
  }

  await expect(approveButton).toBeVisible()
  await expect(rejectButton).toBeVisible()
}

const selectedCases = CASES.filter((entry) => entry.group === group)

test.describe('All nine roles RBAC — real stack', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(
    !password || selectedCases.length !== 3,
    'EADMIN_UI_E2E_PASSWORD and one valid three-role EADMIN_UI_E2E_GROUP are required',
  )

  for (const roleCase of selectedCases) {
    test(`${roleCase.role}: navigation, dossier scope and actions are strict`, async ({ page }) => {
      await login(page, roleCase.email)
      await expectNavigation(page, roleCase)

      await goToRequests(page)
      await expectVisibleReferences(page, roleCase.additionalVisibleReferences)
      await expectHiddenReference(page, roleCase.hiddenReference)

      await openRequest(page, roleCase.visibleReference)
      await expectActionContract(page, roleCase.visibleReference, roleCase.actionContract)

      if (roleCase.role === 'SUPER_ADMIN') {
        await page.getByRole('tab', { name: /Toutes \(/ }).click()
        await expect(page.getByText('REC-ISO-2026-001', { exact: true }).first()).toBeVisible()
      }
    })
  }
})
