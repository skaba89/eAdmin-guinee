import { expect, test, type Page } from '@playwright/test'

const password = process.env.EADMIN_UI_E2E_PASSWORD ?? ''
const apiUrl = process.env.EADMIN_UI_E2E_API_URL ?? 'http://localhost:8000'
const citizenEmail = 'citoyen.awa@recette.eadmin.gn'

const ACTIVE_ACCESS_KEY = 'eadmin.access_token'
const ACTIVE_REFRESH_KEY = 'eadmin.refresh_token'
const PENDING_ACCESS_KEY = 'eadmin.mfa_pending_access_token'
const PENDING_REFRESH_KEY = 'eadmin.mfa_pending_refresh_token'

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

async function submitLogin(
  page: Page,
  email: string,
  submittedPassword: string,
): Promise<number> {
  await openLogin(page)
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(submittedPassword)

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST'
      && response.url().includes('/api/v1/auth/login'),
  )

  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  return (await loginResponsePromise).status()
}

async function loginCitizen(page: Page): Promise<string> {
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

  const loginResponse = await loginResponsePromise
  const meResponse = await meResponsePromise
  expect(loginResponse.status(), 'Le login réel du citoyen doit réussir').toBe(200)
  expect(meResponse.status(), 'Le profil signé doit être résolu après login').toBe(200)

  await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Awa Diallo', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mon Portail', exact: true })).toBeVisible()

  const accessToken = await page.evaluate((key) => sessionStorage.getItem(key), ACTIVE_ACCESS_KEY)
  expect(accessToken, 'Le token actif doit être stocké après authentification').toBeTruthy()
  return accessToken as string
}

async function expectNoStoredAuthTokens(page: Page): Promise<void> {
  const tokens = await page.evaluate(
    ([activeAccess, activeRefresh, pendingAccess, pendingRefresh]) => ({
      activeAccess: sessionStorage.getItem(activeAccess),
      activeRefresh: sessionStorage.getItem(activeRefresh),
      pendingAccess: sessionStorage.getItem(pendingAccess),
      pendingRefresh: sessionStorage.getItem(pendingRefresh),
    }),
    [ACTIVE_ACCESS_KEY, ACTIVE_REFRESH_KEY, PENDING_ACCESS_KEY, PENDING_REFRESH_KEY],
  )

  expect(tokens).toEqual({
    activeAccess: null,
    activeRefresh: null,
    pendingAccess: null,
    pendingRefresh: null,
  })
}

test.describe('Authentication — real stack', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(!password, 'EADMIN_UI_E2E_PASSWORD is required for the isolated real-stack gate')

  test('real seeded citizen login resolves the signed profile', async ({ page }) => {
    await loginCitizen(page)
  })

  test('wrong password is rejected with 401 and leaves no browser session', async ({ page }) => {
    const status = await submitLogin(page, citizenEmail, 'Wrong-Password!2026')

    expect(status).toBe(401)
    await expect(page.getByRole('alert')).toContainText('Email ou mot de passe incorrect.')
    await expect(page.locator('#login-email')).toBeVisible()
    await expect(page.locator('aside')).toHaveCount(0)
    await expectNoStoredAuthTokens(page)
  })

  test('unknown account is rejected with 401 and fails closed', async ({ page }) => {
    const unknownEmail = `unknown-${Date.now()}@recette.eadmin.gn`
    const status = await submitLogin(page, unknownEmail, password)

    expect(status).toBe(401)
    await expect(page.getByRole('alert')).toContainText('Email ou mot de passe incorrect.')
    await expect(page.locator('#login-email')).toBeVisible()
    await expect(page.locator('aside')).toHaveCount(0)
    await expectNoStoredAuthTokens(page)
  })

  test('logout clears browser tokens and revokes the access token in Redis', async ({ page }) => {
    const accessToken = await loginCitizen(page)

    const logoutResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST'
        && response.url().includes('/api/v1/auth/logout'),
    )

    await page.getByRole('button', { name: 'Déconnexion', exact: true }).click()
    const logoutResponse = await logoutResponsePromise
    expect(logoutResponse.status(), 'La révocation serveur doit réussir').toBe(200)

    await expectNoStoredAuthTokens(page)
    await expect(page.locator('aside')).toHaveCount(0)
    await expect(page.getByText('Connexion', { exact: true }).first()).toBeVisible()

    const revokedProfileResponse = await page.request.get(`${apiUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(
      revokedProfileResponse.status(),
      'Un access token révoqué au logout ne doit plus autoriser /auth/me',
    ).toBe(401)
  })
})
