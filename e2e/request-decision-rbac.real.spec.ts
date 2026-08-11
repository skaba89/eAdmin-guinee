import { expect, test, type Page } from '@playwright/test'

const password = process.env.EADMIN_UI_E2E_PASSWORD ?? ''

const ACCOUNTS = {
  mairie: 'mairie.ratoma@recette.eadmin.gn',
  admin: 'admin.ratoma@recette.eadmin.gn',
  chefService: 'chef.casier@recette.eadmin.gn',
} as const

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

  await expect(
    page.getByText('Demandes citoyennes', { exact: true }).first(),
  ).toBeVisible({ timeout: 15_000 })
}

async function openRequest(page: Page, reference: string): Promise<void> {
  await page.getByText('Demandes citoyennes', { exact: true }).first().click()
  await expect(
    page.getByText('Traitement des Demandes Citoyennes', { exact: true }),
  ).toBeVisible({ timeout: 15_000 })

  await page.getByRole('tab', { name: /Toutes \(/ }).click()
  const requestReference = page.getByText(reference, { exact: true }).first()
  await expect(requestReference).toBeVisible({ timeout: 15_000 })
  await requestReference.click()

  await expect(page.getByText(reference, { exact: true }).last()).toBeVisible()
}

async function expectProcessOnlyActions(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Demander pièces', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Valider', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Rejeter', exact: true })).toHaveCount(0)
}

test.describe('Request decision RBAC — real stack', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(!password, 'EADMIN_UI_E2E_PASSWORD is required for the isolated real-stack gate')

  test('MAIRIE can process but cannot approve or reject', async ({ page }) => {
    await login(page, ACCOUNTS.mairie)
    await openRequest(page, 'REC-GN-2026-002')
    await expectProcessOnlyActions(page)
  })

  test('ADMIN can process but cannot approve or reject', async ({ page }) => {
    await login(page, ACCOUNTS.admin)
    await openRequest(page, 'REC-GN-2026-002')
    await expectProcessOnlyActions(page)
  })

  test('CHEF_SERVICE can process, approve and reject', async ({ page }) => {
    await login(page, ACCOUNTS.chefService)
    await openRequest(page, 'REC-UI-CHEF-001')

    await expect(page.getByRole('button', { name: 'Demander pièces', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Valider', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rejeter', exact: true })).toBeVisible()
  })
})
