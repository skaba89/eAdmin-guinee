import { expect, test, type Page } from '@playwright/test'

const password = process.env.EADMIN_UI_E2E_PASSWORD ?? ''
const apiUrl = process.env.EADMIN_UI_E2E_API_URL ?? 'http://localhost:8000'

const ACCOUNTS = {
  citizenAwa: 'citoyen.awa@recette.eadmin.gn',
  mairieRatoma: 'mairie.ratoma@recette.eadmin.gn',
} as const

const RATOMA_REFERENCES = [
  'REC-GN-2026-001',
  'REC-GN-2026-002',
  'REC-GN-2026-007',
] as const

const OUT_OF_SCOPE_REFERENCES = [
  'REC-GN-2026-003',
  'REC-GN-2026-004',
  'REC-GN-2026-005',
  'REC-GN-2026-006',
  'REC-GN-2026-008',
  'REC-ISO-2026-001',
] as const

type ServiceRequestItem = {
  reference: string
  status: string
}

async function openLogin(page: Page): Promise<void> {
  await page.goto('/')

  const emailInput = page.locator('#login-email')
  if (!(await emailInput.isVisible())) {
    const connectionEntry = page.getByText('Connexion', { exact: true }).first()
    await expect(connectionEntry).toBeVisible()
    await connectionEntry.click()
  }

  await expect(emailInput).toBeVisible()
  await expect(page.locator('#login-password')).toBeVisible()
}

async function login(page: Page, email: string): Promise<void> {
  await openLogin(page)
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST'
      && response.url().includes('/api/v1/auth/login'),
  )
  const meResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET'
      && response.url().includes('/api/v1/auth/me'),
  )

  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()

  expect((await loginResponsePromise).status(), `Le login réel doit réussir pour ${email}`).toBe(200)
  expect((await meResponsePromise).status(), `Le profil signé doit être résolu pour ${email}`).toBe(200)
  await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 })
}

async function openRatomaInbox(page: Page): Promise<void> {
  await login(page, ACCOUNTS.mairieRatoma)

  const requestsNav = page.getByText('Demandes citoyennes', { exact: true }).first()
  await expect(requestsNav).toBeVisible({ timeout: 15_000 })
  await requestsNav.click()

  await expect(
    page.getByText('Traitement des Demandes Citoyennes', { exact: true }),
  ).toBeVisible({ timeout: 15_000 })
}

async function getAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => sessionStorage.getItem('eadmin.access_token'))
  expect(token, 'Le navigateur authentifié doit conserver un access token actif').toBeTruthy()
  return token as string
}

async function listRequests(page: Page): Promise<ServiceRequestItem[]> {
  const accessToken = await getAccessToken(page)
  const response = await page.request.get(`${apiUrl}/api/v1/service-requests?page=1&page_size=200`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(response.status(), 'La liste réelle des demandes doit répondre 200').toBe(200)

  const payload = await response.json() as { items?: ServiceRequestItem[] }
  expect(Array.isArray(payload.items), 'La liste des demandes doit retourner un tableau items').toBe(true)
  return payload.items ?? []
}

test.describe('Service request lifecycle — real stack', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(!password, 'EADMIN_UI_E2E_PASSWORD is required for the isolated real-stack gate')

  test('Ratoma inbox exposes only requests inside the signed mairie scope', async ({ page }) => {
    await openRatomaInbox(page)

    const allTab = page.getByRole('tab', { name: /Toutes \(/ })
    await expect(allTab).toBeVisible()
    await allTab.click()

    for (const reference of RATOMA_REFERENCES) {
      await expect(page.getByText(reference, { exact: true }).first()).toBeVisible()
    }

    for (const reference of OUT_OF_SCOPE_REFERENCES) {
      await expect(page.getByText(reference, { exact: true })).toHaveCount(0)
    }
  })

  test('status tabs filter the live Ratoma dataset deterministically', async ({ page }) => {
    await openRatomaInbox(page)

    const submittedTab = page.getByRole('tab', { name: 'Soumises (1)', exact: true })
    await expect(submittedTab).toBeVisible()
    await expect(page.getByText('REC-GN-2026-001', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('REC-GN-2026-002', { exact: true })).toHaveCount(0)
    await expect(page.getByText('REC-GN-2026-007', { exact: true })).toHaveCount(0)

    const inProgressTab = page.getByRole('tab', { name: 'En cours (1)', exact: true })
    await inProgressTab.click()
    await expect(page.getByText('REC-GN-2026-002', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('REC-GN-2026-001', { exact: true })).toHaveCount(0)
    await expect(page.getByText('REC-GN-2026-007', { exact: true })).toHaveCount(0)

    const rejectedTab = page.getByRole('tab', { name: 'Rejetées (1)', exact: true })
    await rejectedTab.click()
    await expect(page.getByText('REC-GN-2026-007', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('REC-GN-2026-001', { exact: true })).toHaveCount(0)
    await expect(page.getByText('REC-GN-2026-002', { exact: true })).toHaveCount(0)
  })

  test('citizen request API returns only Awa own requests and never another tenant', async ({ page }) => {
    await login(page, ACCOUNTS.citizenAwa)
    await expect(page.getByText('Awa Diallo', { exact: true }).first()).toBeVisible({ timeout: 15_000 })

    const items = await listRequests(page)
    const references = items.map((item) => item.reference).sort()

    expect(references).toEqual([...RATOMA_REFERENCES].sort())
    expect(references).not.toContain('REC-ISO-2026-001')
    expect(references).not.toContain('REC-GN-2026-003')
    expect(references).not.toContain('REC-GN-2026-004')
  })

  test('MAIRIE takes charge of a submitted request through the real backend', async ({ page }) => {
    await openRatomaInbox(page)

    const requestReference = page.getByText('REC-GN-2026-001', { exact: true }).first()
    await expect(requestReference).toBeVisible()
    await requestReference.click()

    const takeChargeButton = page.getByRole('button', { name: 'Prendre en charge', exact: true })
    await expect(takeChargeButton).toBeVisible()

    const statusResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST'
        && /\/api\/v1\/service-requests\/[^/]+\/status$/.test(new URL(response.url()).pathname),
    )
    const assignResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST'
        && /\/api\/v1\/service-requests\/[^/]+\/assign$/.test(new URL(response.url()).pathname),
    )

    await takeChargeButton.click()

    expect((await statusResponsePromise).status(), 'La transition vers en_cours doit réussir').toBe(200)
    expect((await assignResponsePromise).status(), 'L’affectation de la demande doit réussir').toBe(200)
    await expect(
      page.getByText('Demande REC-GN-2026-001 prise en charge', { exact: true }),
    ).toBeVisible()

    await expect.poll(async () => {
      const items = await listRequests(page)
      return items.find((item) => item.reference === 'REC-GN-2026-001')?.status
    }, { timeout: 10_000 }).toBe('en_cours')
  })
})
