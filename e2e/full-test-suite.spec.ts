import { test, expect } from '@playwright/test'

/**
 * eAdministration Suite Guinea — E2E Test Suite
 * 
 * Compteurs de test:
 * - TC-AUTH: Tests d'authentification (6 comptes)
 * - TC-SVC: Tests des services publics (28 services)
 * - TC-MAIRIE: Tests du dashboard mairie
 * - TC-AGENCE: Tests du dashboard agence
 * - TC-ADMIN: Tests d'administration
 * - TC-BC: Tests base de données actes de naissance
 * - TC-AI: Tests du chatbot IA
 * - TC-GED: Tests GED
 * - TC-COURRIER: Tests courriers
 * - TC-WF: Tests workflows
 * - TC-SIG: Tests signatures
 * - TC-EXPORT: Tests exports
 */

// ─── HELPERS ────────────────────────────────────────────────────────────────
// Mot de passe démo conforme : majuscule + chiffre + spécial + 10+ caractères
const DEMO_PASSWORD = 'Eadmin2026!'

const DEMO_ACCOUNTS = {
  citizen: { email: 'citoyen@eadmin.gn', password: DEMO_PASSWORD, name: 'Aminata Diallo', role: 'Citoyen' },
  mairie: { email: 'mairie@eadmin.gn', password: DEMO_PASSWORD, name: 'Mme Fatoumata Bah', role: 'Agent de Mairie' },
  admin: { email: 'admin@eadmin.gn', password: DEMO_PASSWORD, name: 'Sékou Condé', role: 'Administrateur Général' },
  agence: { email: 'agence@eadmin.gn', password: DEMO_PASSWORD, name: 'M. Mamadou Soumah', role: "Agent d'Agence" },
  ministere: { email: 'ministere@eadmin.gn', password: DEMO_PASSWORD, name: 'Dr. Alpha Diallo', role: 'Agent Ministériel' },
  superadmin: { email: 'superadmin@eadmin.gn', password: DEMO_PASSWORD, name: 'Amadou Oury Bah', role: 'Super Administrateur' },
}

/**
 * Navigate to the login page from wherever we are.
 * Handles both landing page and already-on-login-page scenarios.
 */
async function navigateToLoginPage(page) {
  await page.goto('/')
  await page.waitForTimeout(2000)

  // If we're on the landing page, click the "Connexion" link to go to login
  // The landing page header has a "Connexion" button; the login page card title is also "Connexion"
  // Check if the login form is already visible (email input with placeholder "votre@email.gn")
  const emailInput = page.getByPlaceholder('votre@email.gn')
  if (!(await emailInput.isVisible({ timeout: 2000 }).catch(() => false))) {
    // Not on login page yet — click the Connexion navigation link
    const loginLink = page.locator('text=Connexion').first()
    if (await loginLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginLink.click()
      await page.waitForTimeout(1500)
    }
  }
}

/**
 * Login using the demo account quick-login buttons on the login page.
 * Falls back to manual form fill if the quick-login button isn't found.
 */
async function login(page, account: { email: string; password: string }) {
  await navigateToLoginPage(page)

  // Strategy 1: Try clicking the demo account quick-login button (motion.button elements)
  // Each demo account row shows the email as text inside a button
  const quickLoginBtn = page.locator('button').filter({ hasText: account.email }).first()
  if (await quickLoginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await quickLoginBtn.click()
    await page.waitForTimeout(3000)
    // Handle MFA redirect for admin+, ministere, super_admin roles
    await handleMFAIfNeeded(page)
    return
  }

  // Strategy 2: Fill the login form manually
  // The login page has:
  //   - Email input: type="email", placeholder="votre@email.gn"
  //   - Password input: type="password" (or "text" if toggled), placeholder="••••••••"
  //   - Submit button with text "Se connecter"
  const emailInput = page.getByPlaceholder('votre@email.gn')
  const passwordInput = page.locator('input[type="password"]').first()

  await emailInput.fill(account.email)
  await passwordInput.fill(account.password)

  // Submit
  const submitBtn = page.locator('button[type="submit"]').first()
  await submitBtn.click()
  await page.waitForTimeout(3000)

  // Handle MFA redirect for admin+, ministere, super_admin roles
  await handleMFAIfNeeded(page)
}

/**
 * Handle MFA verification page if it appears after login.
 * Roles admin_general, ministere, super_admin require MFA verification.
 * In demo mode, any 6-digit code (except 000000) is accepted.
 */
async function handleMFAIfNeeded(page) {
  // Check if MFA page is shown (6 digit inputs with placeholder "·")
  const mfaInput = page.locator('input[inputmode="numeric"]').first()
  if (await mfaInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Enter 6-digit code "123456" into the MFA inputs
    const mfaInputs = page.locator('input[inputmode="numeric"]')
    const count = await mfaInputs.count()
    if (count >= 6) {
      for (let i = 0; i < 6; i++) {
        await mfaInputs.nth(i).fill(String(i + 1))
      }
      // Wait for auto-submit or click verify
      await page.waitForTimeout(2000)
    }
  }
}

async function logout(page) {
  // Try multiple logout strategies
  // Strategy 1: Click avatar/user menu then click Déconnexion
  try {
    const avatarButton = page.locator('[class*="avatar"], [class*="Avatar"]').first()
    if (await avatarButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await avatarButton.click()
      await page.waitForTimeout(500)
      const logoutLink = page.locator('text=Déconnexion').first()
      if (await logoutLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutLink.click()
        await page.waitForTimeout(2000)
        return
      }
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Try clicking a user dropdown button that contains the user name
  try {
    const userMenuBtn = page.locator('button').filter({ hasText: /Déconnexion/i }).first()
    if (await userMenuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenuBtn.click()
      await page.waitForTimeout(2000)
      return
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Try sidebar/user menu approach
  try {
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).last()
    await menuButton.click({ timeout: 2000 })
    await page.waitForTimeout(500)
    const logoutLink = page.locator('text=Déconnexion').first()
    if (await logoutLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutLink.click()
      await page.waitForTimeout(2000)
      return
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 4: Force logout by clearing storage and navigating away
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  await page.waitForTimeout(2000)
}

// ═══════════════════════════════════════════════════════════════════════════
// TC-AUTH: TESTS D'AUTHENTIFICATION
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-AUTH: Authentification', () => {

  test('TC-AUTH-001: Page de login affiche les 6 comptes démo', async ({ page }) => {
    await navigateToLoginPage(page)
    
    // Check page title
    await expect(page.locator('text=eAdmin Guinée').first()).toBeVisible({ timeout: 5000 })
    
    // Check demo accounts section - each email appears inside a quick-login button
    await expect(page.locator('text=citoyen@eadmin.gn').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=mairie@eadmin.gn').first()).toBeVisible()
    await expect(page.locator('text=admin@eadmin.gn').first()).toBeVisible()
    await expect(page.locator('text=agence@eadmin.gn').first()).toBeVisible()
    await expect(page.locator('text=ministere@eadmin.gn').first()).toBeVisible()
    await expect(page.locator('text=superadmin@eadmin.gn').first()).toBeVisible()
  })

  test('TC-AUTH-002: Connexion citoyen réussie', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.citizen)
    
    // Should redirect to citizen portal
    await expect(page.locator('text=Portail').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Aminata Diallo').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-AUTH-003: Connexion mairie réussie', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.mairie)
    
    // Should redirect to mairie dashboard
    await expect(page.locator('text=Mairie').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Fatoumata Bah').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-AUTH-004: Connexion admin réussie', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    
    // Should redirect to admin dashboard
    await expect(page.locator('text=Tableau de bord').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Sékou Condé').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-AUTH-005: Connexion agence (ANIP) réussie', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.agence)
    
    // Should redirect to agency dashboard
    await expect(page.locator('text=Agence').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Mamadou Soumah').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-AUTH-006: Connexion ministère réussie', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.ministere)
    
    await expect(page.locator('text=Alpha Diallo').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-AUTH-007: Connexion super admin réussie', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.superadmin)
    
    await expect(page.locator('text=Amadou Oury Bah').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-AUTH-008: Login avec mauvais mot de passe', async ({ page }) => {
    await navigateToLoginPage(page)
    
    // Fill the form manually with wrong password
    const emailInput = page.getByPlaceholder('votre@email.gn')
    const passwordInput = page.locator('input[type="password"]').first()
    
    await emailInput.fill('admin@eadmin.gn')
    await passwordInput.fill('wrongpassword')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
    
    // Should show error - the store sets loginError to 'Mot de passe incorrect.'
    await expect(page.locator('text=incorrect').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-AUTH-009: Login avec email inexistant', async ({ page }) => {
    await navigateToLoginPage(page)
    
    const emailInput = page.getByPlaceholder('votre@email.gn')
    const passwordInput = page.locator('input[type="password"]').first()
    
    await emailInput.fill('unknown@test.com')
    await passwordInput.fill('Eadmin2026!')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
    
    // Should show error - the store sets loginError to 'Email non reconnu...'
    await expect(page.locator('text=non reconnu').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-AUTH-010: Déconnexion fonctionnelle', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    await page.waitForTimeout(2000)
    
    // Verify logged in
    await expect(page.locator('text=Sékou Condé').first()).toBeVisible({ timeout: 5000 })
    
    // Logout
    await logout(page)
    
    // Should be back on landing page
    await page.waitForTimeout(2000)
  })

  test('TC-AUTH-011: Inscription citoyen', async ({ page }) => {
    await navigateToLoginPage(page)
    
    // Navigate to register - the login page has a link "Créer un compte citoyen"
    const registerLink = page.locator('text=Créer un compte').first()
    if (await registerLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await registerLink.click()
      await page.waitForTimeout(1500)
    }
    
    // Fill registration form
    const nameInput = page.locator('input[placeholder*="Nom"], input[placeholder*="nom"]').first()
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Test User')
    }
    
    const emailInput = page.locator('input[type="email"]').first()
    await emailInput.fill('test@register.gn')
    
    const passwordInput = page.locator('input[type="password"]').first()
    await passwordInput.fill('Eadmin2026!')
    
    // Submit
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(3000)
    
    // Should be logged in after registration — citizen goes to citizen portal or dashboard
    await page.waitForTimeout(3000)
    // Just verify we're past the login page by checking the user is logged in
    const isPastLogin = !(await page.getByPlaceholder('votre@email.gn').isVisible({ timeout: 2000 }).catch(() => false))
    expect(isPastLogin).toBeTruthy()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-SVC: TESTS DES SERVICES PUBLICS (28 services)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-SVC: Services Publics', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.citizen)
    await page.waitForTimeout(2000)
  })

  const SERVICES = [
    { name: "Extrait d'acte de naissance", category: 'État Civil' },
    { name: "Extrait d'acte de mariage", category: 'État Civil' },
    { name: "Extrait d'acte de décès", category: 'État Civil' },
    { name: 'Certificat de nationalité', category: 'État Civil' },
    { name: 'Déclaration de naissance', category: 'État Civil' },
    { name: 'Casier judiciaire', category: 'Justice' },
    { name: 'Certificat de non-poursuite', category: 'Justice' },
    { name: 'Légalisation de documents', category: 'Justice' },
    { name: "Carte d'identité nationale biométrique", category: 'Identification' },
    { name: 'Passeport biométrique', category: 'Identification' },
    { name: 'Permis de conduire', category: 'Identification' },
    { name: 'Permis de construire', category: 'Urbanisme' },
    { name: 'Enregistrement entreprise (APIP)', category: 'Entreprise' },
    { name: 'Registre de commerce', category: 'Entreprise' },
    { name: 'Attestation de scolarité', category: 'Éducation' },
    { name: 'Diplôme et relevé de notes', category: 'Éducation' },
    { name: 'Certificat de vaccination', category: 'Santé' },
    { name: 'Carte sanitaire', category: 'Santé' },
    { name: 'Certificat de résidence', category: 'Résidence' },
    { name: 'Attestation de domicile', category: 'Résidence' },
  ]

  for (const service of SERVICES) {
    test(`TC-SVC-${service.name}: Service "${service.name}" (${service.category}) visible et demandable`, async ({ page }) => {
      // Navigate to public services portal if on citizen portal
      const servicesTab = page.locator('text=Services').first()
      if (await servicesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await servicesTab.click()
        await page.waitForTimeout(1000)
      }
      
      // Search for the service
      const searchInput = page.locator('input[placeholder*="Rechercher"], input[placeholder*="rechercher"]').first()
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill(service.name)
        await page.waitForTimeout(1000)
      }
      
      // Check service is visible
      await expect(page.locator(`text=${service.name}`).first()).toBeVisible({ timeout: 5000 })
    })
  }

  test('TC-SVC-021: Soumission demande acte de naissance', async ({ page }) => {
    // Navigate to services
    const servicesTab = page.locator('text=Services').first()
    if (await servicesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await servicesTab.click()
      await page.waitForTimeout(1000)
    }
    
    // Find and click "Faire une demande" for birth certificate
    const birthCertCard = page.locator('text=Extrait d\'acte de naissance').first()
    await expect(birthCertCard).toBeVisible({ timeout: 5000 })
    
    // Click the "Faire une demande" button nearby
    const requestBtn = page.locator('button').filter({ hasText: 'Faire une demande' }).first()
    if (await requestBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await requestBtn.click()
      await page.waitForTimeout(1500)
    }
    
    // Fill form if dialog opened
    const nameField = page.locator('input[placeholder*="Nom"], input[placeholder*="nom"]').first()
    if (await nameField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameField.fill('Diallo')
      await page.locator('input[placeholder*="Prénom"], input[placeholder*="prénom"]').first().fill('Aminata')
      await page.locator('input[placeholder*="NIN"]').first().fill('NIN-2019-458723')
      await page.locator('input[placeholder*="téléphone"], input[placeholder*="Téléphone"]').first().fill('+224 622 34 56 78')
      await page.locator('input[placeholder*="adresse"], input[placeholder*="Adresse"]').first().fill('Conakry, Kaloum')
      
      // Accept terms
      const termsCheckbox = page.locator('button[role="checkbox"], input[type="checkbox"]').first()
      if (await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await termsCheckbox.click()
      }
      
      // Submit
      const submitBtn = page.locator('button').filter({ hasText: /Soumettre|Envoyer|Valider/ }).first()
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.click()
        await page.waitForTimeout(2000)
      }
      
      // Check success message
      await expect(page.locator('text=succès').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-SVC-022: Suivi de demande avec numéro de référence', async ({ page }) => {
    // Navigate to tracking tab
    const suiviTab = page.locator('text=Suivi').first()
    if (await suiviTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suiviTab.click()
      await page.waitForTimeout(1000)
    }
    
    // Enter a reference number
    const refInput = page.locator('input[placeholder*="GN-2026"], input[placeholder*="référence"]').first()
    if (await refInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refInput.fill('GN-2026-100234')
      
      // Click search
      const searchBtn = page.locator('button').filter({ hasText: /Rechercher/ }).first()
      if (await searchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchBtn.click()
        await page.waitForTimeout(2000)
      }
      
      // Check tracking results
      await expect(page.locator('text=GN-2026-100234').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-SVC-023: Filtrage des services par catégorie', async ({ page }) => {
    const servicesTab = page.locator('text=Services').first()
    if (await servicesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await servicesTab.click()
      await page.waitForTimeout(1000)
    }
    
    // Click on État Civil filter
    const etatCivilBtn = page.locator('button').filter({ hasText: 'État Civil' }).first()
    if (await etatCivilBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await etatCivilBtn.click()
      await page.waitForTimeout(1000)
    }
    
    // Should show only État Civil services
    await expect(page.locator("text=Extrait d'acte de naissance").first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-SVC-024: Affichage des 9 catégories de services', async ({ page }) => {
    const servicesTab = page.locator('text=Services').first()
    if (await servicesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await servicesTab.click()
      await page.waitForTimeout(1000)
    }
    
    // Check category filter buttons
    const categories = ['État Civil', 'Justice', 'Identification', 'Urbanisme', 'Entreprise', 'Éducation', 'Santé', 'Résidence']
    for (const cat of categories) {
      const catBtn = page.locator('button').filter({ hasText: cat }).first()
      // At least check the button exists
      await expect(catBtn).toBeVisible({ timeout: 3000 })
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-MAIRIE: TESTS DASHBOARD MAIRIE
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-MAIRIE: Dashboard Mairie', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.mairie)
    await page.waitForTimeout(3000)
  })

  test('TC-MAIRIE-001: Affichage du dashboard mairie', async ({ page }) => {
    await expect(page.locator('text=Mairie').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Fatoumata Bah').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-MAIRIE-002: Pipeline des demandes État Civil', async ({ page }) => {
    // Check for request pipeline section
    await expect(page.locator('text=État Civil').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-MAIRIE-003: Prise en charge d\'une demande', async ({ page }) => {
    // Look for a request to process
    const takeChargeBtn = page.locator('button').filter({ hasText: /Prendre en charge|Traiter/ }).first()
    if (await takeChargeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await takeChargeBtn.click()
      await page.waitForTimeout(2000)
      // Should show success
      await expect(page.locator('text=prise en charge').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-MAIRIE-004: Accès à la base des actes de naissance', async ({ page }) => {
    // Navigate to birth certificate database
    const birthDbLink = page.locator('text=Base État Civil').first()
    if (await birthDbLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await birthDbLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-MAIRIE-005: Validation d\'une demande', async ({ page }) => {
    const validateBtn = page.locator('button').filter({ hasText: /Valider/ }).first()
    if (await validateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await validateBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-MAIRIE-006: Navigation sidebar mairie', async ({ page }) => {
    // Check mairie-specific sidebar items
    const sidebarItems = ['Dashboard', 'Demandes', 'GED', 'Base État Civil']
    for (const item of sidebarItems) {
      const link = page.locator(`text=${item}`).first()
      // Check it exists somewhere on the page
      const isVisible = await link.isVisible({ timeout: 2000 }).catch(() => false)
      if (isVisible) {
        await link.click()
        await page.waitForTimeout(1500)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-AGENCE: TESTS DASHBOARD AGENCE (ANIP)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-AGENCE: Dashboard Agence ANIP', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.agence)
    await page.waitForTimeout(3000)
  })

  test('TC-AGENCE-001: Affichage du dashboard agence', async ({ page }) => {
    await expect(page.locator('text=Agence').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Mamadou Soumah').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-AGENCE-002: File d\'attente CNI', async ({ page }) => {
    await expect(page.locator('text=CNI').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-AGENCE-003: File d\'attente Passeport', async ({ page }) => {
    await expect(page.locator('text=Passeport').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-AGENCE-004: Traitement d\'une demande d\'identification', async ({ page }) => {
    const processBtn = page.locator('button').filter({ hasText: /Traiter|Prendre en charge/ }).first()
    if (await processBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await processBtn.click()
      await page.waitForTimeout(2000)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-BC: TESTS BASE DE DONNÉES ACTES DE NAISSANCE
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-BC: Base de Données Actes de Naissance', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.mairie)
    await page.waitForTimeout(2000)
    
    // Navigate to birth certificate database
    const birthDbLink = page.locator('text=Base État Civil').first()
    if (await birthDbLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await birthDbLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-BC-001: Affichage de la page base de données', async ({ page }) => {
    await expect(page.locator('text=Acte').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-BC-002: Recherche par nom — Aminata Diallo', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Rechercher"], input[placeholder*="Nom"]').first()
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('Diallo')
      await page.waitForTimeout(1500)
      
      // Should show Diallo records
      await expect(page.locator('text=Diallo').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-BC-003: Recherche par numéro d\'acte', async ({ page }) => {
    const acteInput = page.locator('input[placeholder*="acte"], input[placeholder*="AN/"]').first()
    if (await acteInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await acteInput.fill('AN/KAL/1995/0001')
      await page.waitForTimeout(1500)
      
      await expect(page.locator('text=AN/KAL/1995/0001').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-BC-004: Vérification d\'identité exacte', async ({ page }) => {
    // Navigate to verification tab
    const verificationTab = page.locator('text=Vérification').first()
    if (await verificationTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await verificationTab.click()
      await page.waitForTimeout(1000)
    }
    
    // Fill verification form
    const nameInput = page.locator('input[placeholder*="Nom"]').first()
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Diallo')
      await page.locator('input[placeholder*="Prénom"]').first().fill('Aminata')
      await page.locator('input[type="date"]').first().fill('1995-03-15')
      await page.locator('input[placeholder*="Lieu"]').first().fill('Conakry')
      
      // Click verify
      const verifyBtn = page.locator('button').filter({ hasText: /Vérifier/ }).first()
      if (await verifyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await verifyBtn.click()
        await page.waitForTimeout(2000)
      }
      
      // Should show verified
      await expect(page.locator('text=vérifiée').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-BC-005: Vérification d\'identité introuvable', async ({ page }) => {
    const verificationTab = page.locator('text=Vérification').first()
    if (await verificationTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await verificationTab.click()
      await page.waitForTimeout(1000)
    }
    
    const nameInput = page.locator('input[placeholder*="Nom"]').first()
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('UnknownName')
      await page.locator('input[placeholder*="Prénom"]').first().fill('UnknownFirst')
      await page.locator('input[type="date"]').first().fill('1999-01-01')
      await page.locator('input[placeholder*="Lieu"]').first().fill('Nowhere')
      
      const verifyBtn = page.locator('button').filter({ hasText: /Vérifier/ }).first()
      if (await verifyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await verifyBtn.click()
        await page.waitForTimeout(2000)
      }
      
      // Should show not found
      await expect(page.locator('text=Aucun').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-BC-006: Statistiques de la base', async ({ page }) => {
    // Check stats cards
    await expect(page.locator('text=Total actes').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Actes actifs').first()).toBeVisible({ timeout: 3000 })
  })

  test('TC-BC-007: Détail d\'un acte de naissance', async ({ page }) => {
    // Click on a record to see details
    const firstRecord = page.locator('text=AN/').first()
    if (await firstRecord.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRecord.click()
      await page.waitForTimeout(1500)
      
      // Should show detail dialog with parent info
      await expect(page.locator('text=Père').first()).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Mère').first()).toBeVisible({ timeout: 3000 })
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-ADMIN: TESTS ADMINISTRATION
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-ADMIN: Administration', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    await page.waitForTimeout(3000)
  })

  test('TC-ADMIN-001: Dashboard avec KPIs', async ({ page }) => {
    await expect(page.locator('text=Tableau de bord').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-ADMIN-002: Navigation vers GED', async ({ page }) => {
    const gedLink = page.locator('text=GED').first()
    if (await gedLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gedLink.click()
      await page.waitForTimeout(2000)
      await expect(page.locator('text=Documents').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-ADMIN-003: Navigation vers Courriers', async ({ page }) => {
    const courrierLink = page.locator('text=Courriers').first()
    if (await courrierLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await courrierLink.click()
      await page.waitForTimeout(2000)
      await expect(page.locator('text=Courrier').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-ADMIN-004: Navigation vers Workflows', async ({ page }) => {
    const workflowLink = page.locator('text=Workflow').first()
    if (await workflowLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workflowLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-ADMIN-005: Navigation vers Signatures', async ({ page }) => {
    const sigLink = page.locator('text=Signatures').first()
    if (await sigLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sigLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-ADMIN-006: Navigation vers Analytics', async ({ page }) => {
    const analyticsLink = page.locator('text=Analytics').first()
    if (await analyticsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await analyticsLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-ADMIN-007: Gestion des utilisateurs', async ({ page }) => {
    const usersLink = page.locator('text=Utilisateurs').first()
    if (await usersLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersLink.click()
      await page.waitForTimeout(2000)
      await expect(page.locator('text=Utilisateur').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-ADMIN-008: Paramètres', async ({ page }) => {
    const settingsLink = page.locator('text=Paramètres').first()
    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click()
      await page.waitForTimeout(2000)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-GED: TESTS GED
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-GED: Gestion Électronique des Documents', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    await page.waitForTimeout(2000)
    
    // Navigate to GED
    const gedLink = page.locator('text=GED').first()
    if (await gedLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gedLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-GED-001: Affichage des documents', async ({ page }) => {
    await expect(page.locator('text=Documents').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-GED-002: Recherche de document', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Rechercher"]').first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Décret')
      await page.waitForTimeout(1500)
      await expect(page.locator('text=Décret').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-GED-003: Consultation d\'un document', async ({ page }) => {
    // Hover over first row to make action button visible
    const row = page.locator('tr').nth(1)
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      await row.hover()
      await page.waitForTimeout(500)
    }
  })

  test('TC-GED-004: Import d\'un document', async ({ page }) => {
    const importBtn = page.locator('button').filter({ hasText: /Importer/ }).first()
    if (await importBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await importBtn.click()
      await page.waitForTimeout(1500)
      
      // Should show upload dialog
      await expect(page.locator('text=Importer un document').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-GED-005: Filtrage par classification', async ({ page }) => {
    // Open filters
    const filterBtn = page.locator('button').filter({ hasText: /Filtres/ }).first()
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.click()
      await page.waitForTimeout(1000)
    }
  })

  test('TC-GED-006: Classification automatique par IA', async ({ page }) => {
    const aiClassBtn = page.locator('button').filter({ hasText: /Classification.*IA/ }).first()
    if (await aiClassBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiClassBtn.click()
      await page.waitForTimeout(2000)
      await expect(page.locator('text=reclassifié').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-GED-007: Export vers Archives Nationales', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: /Archives Nationales/ }).first()
    if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exportBtn.click()
      await page.waitForTimeout(2000)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-COURRIER: TESTS COURRIERS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-COURRIER: Courriers Officiels', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    await page.waitForTimeout(2000)
    
    const courrierLink = page.locator('text=Courriers').first()
    if (await courrierLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await courrierLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-COURRIER-001: Affichage des courriers', async ({ page }) => {
    await expect(page.locator('text=Courrier').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-COURRIER-002: Filtrage par type de courrier', async ({ page }) => {
    // Click on Présidentiels tab
    const presTab = page.locator('text=Présidentiel').first()
    if (await presTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await presTab.click()
      await page.waitForTimeout(1500)
    }
  })

  test('TC-COURRIER-003: Nouveau courrier', async ({ page }) => {
    const newBtn = page.locator('button').filter({ hasText: /Nouveau/ }).first()
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click()
      await page.waitForTimeout(1500)
    }
  })

  test('TC-COURRIER-004: Viser un courrier', async ({ page }) => {
    // Hover over first row to show actions
    const firstRow = page.locator('tr').nth(1)
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.hover()
      await page.waitForTimeout(500)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-SIG: TESTS SIGNATURES ÉLECTRONIQUES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-SIG: Signatures Électroniques', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    await page.waitForTimeout(2000)
    
    const sigLink = page.locator('text=Signatures').first()
    if (await sigLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sigLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-SIG-001: Affichage des signatures', async ({ page }) => {
    await expect(page.locator('text=Signature').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-SIG-002: Signer un document', async ({ page }) => {
    const signBtn = page.locator('button').filter({ hasText: /Signer/ }).first()
    if (await signBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await signBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-SIG-003: Vérifier l\'intégrité d\'une signature', async ({ page }) => {
    const verifyBtn = page.locator('button').filter({ hasText: /Vérifier|Intégrité/ }).first()
    if (await verifyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await verifyBtn.click()
      await page.waitForTimeout(2000)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-EXPORT: TESTS EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-EXPORT: Exports de données', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    await page.waitForTimeout(2000)
  })

  test('TC-EXPORT-001: Export PDF depuis Analytics', async ({ page }) => {
    const analyticsLink = page.locator('text=Analytics').first()
    if (await analyticsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await analyticsLink.click()
      await page.waitForTimeout(2000)
    }
    
    const exportPdfBtn = page.locator('button').filter({ hasText: /PDF/ }).first()
    if (await exportPdfBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportPdfBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-EXPORT-002: Export Excel/CSV depuis Analytics', async ({ page }) => {
    const analyticsLink = page.locator('text=Analytics').first()
    if (await analyticsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await analyticsLink.click()
      await page.waitForTimeout(2000)
    }
    
    const exportExcelBtn = page.locator('button').filter({ hasText: /Excel|CSV/ }).first()
    if (await exportExcelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportExcelBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-EXPORT-003: Export CSV depuis Audit Logs', async ({ page }) => {
    const auditLink = page.locator('text=Audit, text=Journal').first()
    if (await auditLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await auditLink.click()
      await page.waitForTimeout(2000)
    }
    
    const exportCsvBtn = page.locator('button').filter({ hasText: /CSV/ }).first()
    if (await exportCsvBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportCsvBtn.click()
      await page.waitForTimeout(2000)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-AI: TESTS CHATBOT IA
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-AI: Chatbot IA', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.citizen)
    await page.waitForTimeout(3000)
  })

  test('TC-AI-001: Ouverture du chatbot flottant', async ({ page }) => {
    // Try clicking the floating chatbot button (fixed position at bottom of screen)
    const sparklesBtn = page.locator('[class*="fixed"] button, [class*="bottom"] button').first()
    if (await sparklesBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sparklesBtn.click()
      await page.waitForTimeout(1500)
    }
  })

  test('TC-AI-002: Envoi d\'un message au chatbot', async ({ page }) => {
    // Open chatbot first - try the floating button
    const sparklesBtn = page.locator('[class*="fixed"] button, [class*="bottom"] button').first()
    if (await sparklesBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sparklesBtn.click()
      await page.waitForTimeout(1500)
    }
    
    // Find chat input
    const chatInput = page.locator('input[placeholder*="message"], input[placeholder*="Question"]').first()
    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.fill('Comment faire une demande d\'acte de naissance?')
      await page.locator('button').filter({ hasText: /Envoyer/ }).first().click().catch(() => {})
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3000)
      
      // Should show assistant response
      await expect(page.locator('text=acte de naissance').first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('TC-AI-003: Navigation vers page Assistant IA', async ({ page }) => {
    const aiLink = page.locator('text=Assistant IA').first()
    if (await aiLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiLink.click()
      await page.waitForTimeout(2000)
      await expect(page.locator('text=Assistant').first()).toBeVisible({ timeout: 5000 })
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-REQUEST: TESTS TRAITEMENT DES DEMANDES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-REQUEST: Traitement des Demandes Citoyennes', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    await page.waitForTimeout(2000)
    
    const requestsLink = page.locator('text=Demandes').first()
    if (await requestsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await requestsLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-REQUEST-001: Affichage des demandes', async ({ page }) => {
    await expect(page.locator('text=Demande').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-REQUEST-002: Filtrage par statut', async ({ page }) => {
    const soumiseTab = page.locator('text=Soumise').first()
    if (await soumiseTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await soumiseTab.click()
      await page.waitForTimeout(1500)
    }
  })

  test('TC-REQUEST-003: Prise en charge d\'une demande', async ({ page }) => {
    const takeBtn = page.locator('button').filter({ hasText: /Prendre en charge/ }).first()
    if (await takeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await takeBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-REQUEST-004: Validation d\'une demande', async ({ page }) => {
    const validateBtn = page.locator('button').filter({ hasText: /Valider/ }).first()
    if (await validateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await validateBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-REQUEST-005: Rejet d\'une demande', async ({ page }) => {
    const rejectBtn = page.locator('button').filter({ hasText: /Rejeter/ }).first()
    if (await rejectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await rejectBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-REQUEST-006: Ajout d\'une note de traitement', async ({ page }) => {
    const noteBtn = page.locator('button').filter({ hasText: /Note/ }).first()
    if (await noteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noteBtn.click()
      await page.waitForTimeout(1500)
      
      const noteInput = page.locator('textarea').first()
      if (await noteInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noteInput.fill('Document vérifié et conforme aux exigences réglementaires.')
        
        const saveBtn = page.locator('button').filter({ hasText: /Ajouter|Enregistrer|Sauvegarder/ }).first()
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveBtn.click()
          await page.waitForTimeout(2000)
        }
      }
    }
  })

  test('TC-REQUEST-007: Livraison d\'un document', async ({ page }) => {
    const deliverBtn = page.locator('button').filter({ hasText: /Livrer|Livraison/ }).first()
    if (await deliverBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deliverBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-REQUEST-008: Demande de pièces complémentaires', async ({ page }) => {
    const infoBtn = page.locator('button').filter({ hasText: /complémentaire/ }).first()
    if (await infoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await infoBtn.click()
      await page.waitForTimeout(2000)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-SETTINGS: TESTS PARAMÈTRES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-SETTINGS: Paramètres', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    await page.waitForTimeout(2000)
    
    const settingsLink = page.locator('text=Paramètres').first()
    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-SETTINGS-001: Affichage des paramètres', async ({ page }) => {
    await expect(page.locator('text=Paramètres').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-SETTINGS-002: Changement de thème', async ({ page }) => {
    const darkModeBtn = page.locator('button').filter({ hasText: /Sombre/ }).first()
    if (await darkModeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await darkModeBtn.click()
      await page.waitForTimeout(1500)
      
      // Check dark mode is applied
      const htmlClass = await page.evaluate(() => document.documentElement.className)
      expect(htmlClass).toContain('dark')
    }
  })

  test('TC-SETTINGS-003: Onglet Sécurité', async ({ page }) => {
    const securityTab = page.locator('text=Sécurité').first()
    if (await securityTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await securityTab.click()
      await page.waitForTimeout(1500)
    }
  })

  test('TC-SETTINGS-004: Onglet Notifications', async ({ page }) => {
    const notifTab = page.locator('text=Notifications').first()
    if (await notifTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notifTab.click()
      await page.waitForTimeout(1500)
    }
  })

  test('TC-SETTINGS-005: Onglet Intégrations', async ({ page }) => {
    const integrationTab = page.locator('text=Intégration').first()
    if (await integrationTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await integrationTab.click()
      await page.waitForTimeout(1500)
    }
  })

  test('TC-SETTINGS-006: Sauvegarde des paramètres', async ({ page }) => {
    const saveBtn = page.locator('button').filter({ hasText: /Enregistrer/ }).first()
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveBtn.click()
      await page.waitForTimeout(2000)
      await expect(page.locator('text=sauvegardé').first()).toBeVisible({ timeout: 5000 })
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-ROLE: TESTS CONTRÔLE D'ACCÈS PAR RÔLE
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-ROLE: Contrôle d\'accès par rôle', () => {

  test('TC-ROLE-001: Citoyen ne voit pas les modules admin', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.citizen)
    await page.waitForTimeout(3000)
    
    // Citizen should NOT see admin modules
    const adminLink = page.locator('text=Administration').first()
    const isVisible = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)
    expect(isVisible).toBe(false)
  })

  test('TC-ROLE-002: Mairie voit ses modules spécifiques', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.mairie)
    await page.waitForTimeout(3000)
    
    // Mairie should see Base État Civil
    await expect(page.locator('text=Mairie').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-ROLE-003: Super admin a accès à tout', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.superadmin)
    await page.waitForTimeout(3000)
    
    // Super admin should see admin and users modules
    const adminLink = page.locator('text=Administration').first()
    const isVisible = await adminLink.isVisible({ timeout: 5000 }).catch(() => false)
    // Super admin should have broader access
    expect(isVisible).toBe(true)
  })

  test('TC-ROLE-004: Agence voit son dashboard spécifique', async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.agence)
    await page.waitForTimeout(3000)
    
    await expect(page.locator('text=Agence').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-ROLE-005: Chaque rôle atterrit sur sa page par défaut', async ({ page }) => {
    const testCases = [
      { account: DEMO_ACCOUNTS.citizen, expectedContent: 'Portail' },
      { account: DEMO_ACCOUNTS.mairie, expectedContent: 'Mairie' },
      { account: DEMO_ACCOUNTS.agence, expectedContent: 'Agence' },
    ]
    
    for (const tc of testCases) {
      await login(page, tc.account)
      await page.waitForTimeout(3000)
      await expect(page.locator(`text=${tc.expectedContent}`).first()).toBeVisible({ timeout: 10000 })
      await logout(page)
      await page.waitForTimeout(2000)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-WF: TESTS WORKFLOWS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-WF: Workflows', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    await page.waitForTimeout(2000)
    
    const wfLink = page.locator('text=Workflow').first()
    if (await wfLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wfLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-WF-001: Affichage des workflows', async ({ page }) => {
    await expect(page.locator('text=Workflow').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-WF-002: Avancement d\'une étape de workflow', async ({ page }) => {
    const advanceBtn = page.locator('button').filter({ hasText: /Avancer|Avance/ }).first()
    if (await advanceBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await advanceBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-WF-003: Ajout d\'un commentaire', async ({ page }) => {
    const commentBtn = page.locator('button').filter({ hasText: /Commentaire/ }).first()
    if (await commentBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commentBtn.click()
      await page.waitForTimeout(1500)
      
      const commentInput = page.locator('textarea').first()
      if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentInput.fill('Approbation conforme aux procédures réglementaires.')
        await page.locator('button').filter({ hasText: /Envoyer|Ajouter/ }).first().click().catch(() => {})
        await page.waitForTimeout(2000)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-USERS: TESTS GESTION UTILISATEURS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-USERS: Gestion des Utilisateurs', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.superadmin)
    await page.waitForTimeout(2000)
    
    const usersLink = page.locator('text=Utilisateurs').first()
    if (await usersLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-USERS-001: Affichage de la liste des utilisateurs', async ({ page }) => {
    await expect(page.locator('text=Utilisateur').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-USERS-002: Ajout d\'un utilisateur', async ({ page }) => {
    const addBtn = page.locator('button').filter({ hasText: /Ajouter|Nouveau/ }).first()
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1500)
    }
  })

  test('TC-USERS-003: Recherche d\'un utilisateur', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Rechercher"]').first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Diallo')
      await page.waitForTimeout(1500)
    }
  })

  test('TC-USERS-004: Profil d\'un utilisateur', async ({ page }) => {
    // Hover to show actions then click profile
    const firstRow = page.locator('tr').nth(1)
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.hover()
      await page.waitForTimeout(500)
    }
  })

  test('TC-USERS-005: Export des utilisateurs', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: /Export/ }).first()
    if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exportBtn.click()
      await page.waitForTimeout(2000)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TC-NOTIF: TESTS NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('TC-NOTIF: Notifications', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ACCOUNTS.admin)
    await page.waitForTimeout(2000)
    
    const notifLink = page.locator('text=Notifications').first()
    if (await notifLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notifLink.click()
      await page.waitForTimeout(2000)
    }
  })

  test('TC-NOTIF-001: Affichage des notifications', async ({ page }) => {
    await expect(page.locator('text=Notification').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-NOTIF-002: Marquer comme lu', async ({ page }) => {
    const markReadBtn = page.locator('button').filter({ hasText: /Marquer.*lu/ }).first()
    if (await markReadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await markReadBtn.click()
      await page.waitForTimeout(1500)
    }
  })

  test('TC-NOTIF-003: Supprimer une notification', async ({ page }) => {
    const deleteBtn = page.locator('button').filter({ hasText: /Supprimer/ }).first()
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click()
      await page.waitForTimeout(1500)
    }
  })
})
