import { expect, test, type Page } from '@playwright/test'

const password = process.env.EADMIN_UI_E2E_PASSWORD ?? ''
const apiUrl = process.env.EADMIN_UI_E2E_API_URL ?? 'http://localhost:8000'
const citizenEmail = 'citoyen.awa@recette.eadmin.gn'

const PRIMARY_SERVICES = [
  { serviceId: 'recette-acte-naissance', categoryId: 'etat-civil', name: "Copie d'acte de naissance — Recette" },
  { serviceId: 'recette-certificat-residence', categoryId: 'residence', name: 'Certificat de résidence — Recette' },
  { serviceId: 'recette-carte-identite', categoryId: 'identification', name: "Carte nationale d'identité — Recette" },
  { serviceId: 'recette-casier-judiciaire', categoryId: 'justice', name: 'Extrait de casier judiciaire — Recette' },
  { serviceId: 'recette-creation-entreprise', categoryId: 'entreprise', name: "Création d'entreprise — Recette" },
] as const

const ISOLATION_SERVICE_ID = 'recette-isolation-service'
const ISOLATION_SERVICE_NAME = 'Service tenant isolation — Recette'

type CatalogItem = {
  serviceId: string
  categoryId: string
  name: string
  isActive: boolean
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

async function loginCitizen(page: Page): Promise<void> {
  await openLogin(page)
  await page.locator('#login-email').fill(citizenEmail)
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

  expect((await loginResponsePromise).status(), 'Le login réel du citoyen doit réussir').toBe(200)
  expect((await meResponsePromise).status(), 'Le profil signé doit être résolu').toBe(200)
  await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Awa Diallo', { exact: true }).first()).toBeVisible()
}

async function openCitizenCatalog(page: Page): Promise<void> {
  await loginCitizen(page)

  const portalButton = page.getByRole('button', { name: 'Mon Portail', exact: true })
  await expect(portalButton).toBeVisible()
  await portalButton.click()

  const servicesTab = page.getByRole('tab', { name: 'Services', exact: true })
  await expect(servicesTab).toBeVisible({ timeout: 15_000 })
  await servicesTab.click()

  await expect(page.getByPlaceholder('Rechercher un service...')).toBeVisible()
  await expect(page.getByText('Chargement du catalogue officiel des démarches…')).toHaveCount(0, { timeout: 15_000 })
}

test.describe('Service catalog — real stack', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(!password, 'EADMIN_UI_E2E_PASSWORD is required for the isolated real-stack gate')

  test('public catalog exposes active primary-tenant services without cross-tenant leakage', async ({ page }) => {
    const response = await page.request.get(`${apiUrl}/api/v1/public/service-catalog`)
    expect(response.status(), 'Le catalogue public réel doit répondre 200').toBe(200)

    const payload = await response.json() as { items?: CatalogItem[] }
    expect(Array.isArray(payload.items), 'Le catalogue public doit retourner un tableau items').toBe(true)
    const items = payload.items ?? []
    const ids = new Set(items.map((item) => item.serviceId))

    for (const expectedService of PRIMARY_SERVICES) {
      expect(ids.has(expectedService.serviceId), `${expectedService.serviceId} doit être publié`).toBe(true)
      const item = items.find((candidate) => candidate.serviceId === expectedService.serviceId)
      expect(item?.name).toBe(expectedService.name)
      expect(item?.categoryId).toBe(expectedService.categoryId)
      expect(item?.isActive).toBe(true)
    }

    expect(ids.has(ISOLATION_SERVICE_ID), 'Le service du tenant secondaire ne doit jamais fuiter').toBe(false)
    expect(items.every((item) => item.isActive), 'Le catalogue public ne doit exposer que les versions actives').toBe(true)
  })

  test('real citizen portal renders the server-seeded catalog', async ({ page }) => {
    await openCitizenCatalog(page)

    for (const service of PRIMARY_SERVICES) {
      await expect(page.getByText(service.name, { exact: true }).first()).toBeVisible()
    }
    await expect(page.getByText(ISOLATION_SERVICE_NAME, { exact: true })).toHaveCount(0)
  })

  test('catalog search filters the live server catalog deterministically', async ({ page }) => {
    await openCitizenCatalog(page)

    const search = page.getByPlaceholder('Rechercher un service...')
    await search.fill('casier judiciaire')

    await expect(page.getByText('Extrait de casier judiciaire — Recette', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Certificat de résidence — Recette', { exact: true })).toHaveCount(0)
    await expect(page.getByText("Création d'entreprise — Recette", { exact: true })).toHaveCount(0)
  })

  test('category filter keeps only the selected server category', async ({ page }) => {
    await openCitizenCatalog(page)

    const justiceFilter = page.getByRole('button', { name: 'Justice', exact: true })
    await expect(justiceFilter).toBeVisible()
    await justiceFilter.click()

    await expect(page.getByText('Extrait de casier judiciaire — Recette', { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Copie d'acte de naissance — Recette", { exact: true })).toHaveCount(0)
    await expect(page.getByText('Certificat de résidence — Recette', { exact: true })).toHaveCount(0)
  })
})
