// ═══════════════════════════════════════════════════════════════════════════════
// eAdmin Guinée — Enterprise Security Module
// MFA/TOTP, JWT rotation, encryption, password policy
// ═══════════════════════════════════════════════════════════════════════════════

// --- Password Policy ---
export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  forbiddenPatterns: [
    'password', '123456', 'admin', 'demo', 'guinee', 'conakry',
    'motdepasse', 'azerty', 'qwerty', 'abc123', 'letmein',
    'welcome', 'monkey', 'dragon', 'master', 'login',
  ],
}

/**
 * Validates a password against the enterprise password policy.
 * Returns validity, a 0-100 score, errors, and warnings.
 */
export function validatePassword(password: string): {
  valid: boolean
  score: number  // 0-100
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  let score = 0

  // Length check
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Le mot de passe doit contenir au moins ${PASSWORD_POLICY.minLength} caractères`)
  } else {
    score += 20
    if (password.length >= 16) score += 10
    if (password.length >= 20) score += 5
  }

  // Uppercase
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule')
  } else if (/[A-Z]/.test(password)) {
    score += 15
  }

  // Lowercase
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule')
  } else if (/[a-z]/.test(password)) {
    score += 15
  }

  // Digit
  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre')
  } else if (/\d/.test(password)) {
    score += 15
  }

  // Special character
  if (PASSWORD_POLICY.requireSpecial && !new RegExp(`[${PASSWORD_POLICY.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial')
  } else if (new RegExp(`[${PASSWORD_POLICY.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
    score += 15
  }

  // Forbidden patterns
  const lowerPassword = password.toLowerCase()
  for (const pattern of PASSWORD_POLICY.forbiddenPatterns) {
    if (lowerPassword.includes(pattern)) {
      errors.push(`Le mot de passe contient un motif interdit : "${pattern}"`)
      score = Math.max(0, score - 20)
      break
    }
  }

  // Entropy-based scoring bonus
  const uniqueChars = new Set(password).size
  const uniqueRatio = uniqueChars / password.length
  if (uniqueRatio > 0.7) score += 5

  // Check for common sequences
  const sequences = ['abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', '0123456789']
  for (const seq of sequences) {
    for (let i = 0; i <= seq.length - 4; i++) {
      if (lowerPassword.includes(seq.substring(i, i + 4))) {
        warnings.push('Le mot de passe contient une séquence commune')
        score = Math.max(0, score - 10)
        break
      }
    }
  }

  // Repeated characters
  if (/(.)\1{2,}/.test(password)) {
    warnings.push('Le mot de passe contient des caractères répétés')
    score = Math.max(0, score - 5)
  }

  // Cap score
  score = Math.min(100, Math.max(0, score))

  return {
    valid: errors.length === 0,
    score,
    errors,
    warnings,
  }
}

// --- TOTP (Time-based One-Time Password) ---
// Client-side TOTP implementation (RFC 6238) — self-contained, no external deps

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Generate a random Base32 secret for TOTP.
 */
export function generateTOTPSecret(): string {
  const array = new Uint8Array(20) // 160 bits
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }

  let secret = ''
  let bits = ''
  for (const byte of array) {
    bits += byte.toString(2).padStart(8, '0')
  }
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5)
    const index = parseInt(chunk, 2)
    secret += BASE32_CHARS[index]
  }

  // Add spacing every 4 chars for readability
  return secret.match(/.{1,4}/g)?.join(' ') || secret
}

/**
 * Parse a Base32 string into a Uint8Array.
 */
function base32Decode(str: string): Uint8Array {
  const cleaned = str.replace(/\s+/g, '').toUpperCase()
  let bits = ''
  for (const char of cleaned) {
    const index = BASE32_CHARS.indexOf(char)
    if (index === -1) continue
    bits += index.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2))
  }
  return new Uint8Array(bytes)
}

/**
 * Compute HMAC-SHA1 digest.
 * Uses Web Crypto API when available, falls back to a simple implementation.
 */
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message.buffer as ArrayBuffer)
    return new Uint8Array(signature)
  }

  // Fallback: simple HMAC-SHA1 (for non-browser environments, not cryptographic-grade)
  // This is a simplified version for demo purposes
  const combined = new Uint8Array(key.length + message.length)
  combined.set(key)
  combined.set(message, key.length)

  // Simple hash (NOT real SHA1, just for demo fallback)
  const result = new Uint8Array(20)
  for (let i = 0; i < 20; i++) {
    result[i] = combined[i % combined.length] ^ (i * 37 + 0x5A)
  }
  return result
}

/**
 * Generate a 6-digit TOTP code from a Base32 secret and current time.
 * Uses 30-second time step and HMAC-SHA1 (RFC 6238).
 */
export async function generateTOTPCode(secret: string, time?: number): Promise<string> {
  const currentTime = time ?? Math.floor(Date.now() / 1000)
  const timeStep = 30
  const counter = Math.floor(currentTime / timeStep)

  // Convert counter to 8-byte big-endian buffer
  const counterBuf = new Uint8Array(8)
  let tempCounter = counter
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = tempCounter & 0xff
    tempCounter = Math.floor(tempCounter / 256)
  }

  const key = base32Decode(secret)
  const hmac = await hmacSha1(key, counterBuf)

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const otp = binary % 1000000
  return otp.toString().padStart(6, '0')
}

/**
 * Synchronous TOTP generation using a simplified approach.
 * For demo purposes — the async version with Web Crypto API is preferred.
 */
export function generateTOTPCodeSync(secret: string, time?: number): string {
  const currentTime = time ?? Math.floor(Date.now() / 1000)
  const timeStep = 30
  const counter = Math.floor(currentTime / timeStep)

  // Simple hash-based OTP for synchronous demo
  const key = base32Decode(secret)
  const combined = new Uint8Array(key.length + 8)
  combined.set(key)

  // Counter as big-endian
  let tempCounter = counter
  for (let i = 7; i >= 0; i--) {
    combined[key.length + i] = tempCounter & 0xff
    tempCounter = Math.floor(tempCounter / 256)
  }

  // Simple hash for demo (deterministic based on secret + counter)
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined[i]) | 0
  }

  // Dynamic truncation simulation
  const offset = Math.abs(hash) % (combined.length - 4)
  let binary = 0
  for (let i = 0; i < 4; i++) {
    binary = (binary << 8) | (combined[offset + i] & (i === 0 ? 0x7f : 0xff))
  }

  const otp = Math.abs(binary) % 1000000
  return otp.toString().padStart(6, '0')
}

/**
 * Verify a TOTP code within ±1 window (allows 30s clock drift).
 */
export async function verifyTOTP(secret: string, code: string, windowSize: number = 1): Promise<boolean> {
  const currentTime = Math.floor(Date.now() / 1000)

  for (let i = -windowSize; i <= windowSize; i++) {
    const checkTime = currentTime + i * 30
    const expectedCode = await generateTOTPCode(secret, checkTime)
    if (constantTimeCompare(code, expectedCode)) {
      return true
    }
  }
  return false
}

/**
 * Synchronous TOTP verification for demo mode.
 */
export function verifyTOTPSync(secret: string, code: string, windowSize: number = 1): boolean {
  const currentTime = Math.floor(Date.now() / 1000)

  for (let i = -windowSize; i <= windowSize; i++) {
    const checkTime = currentTime + i * 30
    const expectedCode = generateTOTPCodeSync(secret, checkTime)
    if (constantTimeCompare(code, expectedCode)) {
      return true
    }
  }
  return false
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Generate an otpauth:// URI for TOTP QR code generation.
 */
export function generateTOTPQRCodeURI(secret: string, email: string): string {
  const cleanSecret = secret.replace(/\s+/g, '')
  const issuer = 'eAdminGuinee'
  const encodedEmail = encodeURIComponent(email)
  return `otpauth://totp/${issuer}:${encodedEmail}?secret=${cleanSecret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
}

/**
 * Generate backup codes (10 one-time use codes).
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const array = new Uint8Array(4)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array)
    } else {
      for (let j = 0; j < array.length; j++) {
        array[j] = Math.floor(Math.random() * 256)
      }
    }
    // Generate 8-character alphanumeric codes
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion
    let code = ''
    for (let j = 0; j < 8; j++) {
      code += chars[array[j % array.length] % chars.length]
    }
    codes.push(code)
  }
  return codes
}

// --- Encryption (AES-256-GCM for sensitive data at rest) ---

/**
 * Derive an AES-256 key from a passphrase using PBKDF2.
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase).buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data using AES-256-GCM.
 * Output format: base64(salt[16] + iv[12] + ciphertext + tag)
 */
export async function encryptData(data: string, key?: string): Promise<string> {
  const passphrase = key || 'eadmin-guinee-default-encryption-key-2026'
  const encoder = new TextEncoder()

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Derive key
  const cryptoKey = await deriveKey(passphrase, salt)

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(data)
  )

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)

  // Return base64 encoded
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt AES-256-GCM encrypted data.
 */
export async function decryptData(encryptedData: string, key?: string): Promise<string> {
  const passphrase = key || 'eadmin-guinee-default-encryption-key-2026'

  // Decode base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))

  // Extract salt, IV, and ciphertext
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const ciphertext = combined.slice(28)

  // Derive key
  const cryptoKey = await deriveKey(passphrase, salt)

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

// --- Session Security ---

/**
 * Detect suspicious activity based on session metadata.
 */
export function detectSuspiciousActivity(session: {
  ipAddress: string
  userAgent: string
  loginTime: string
  previousIPs: string[]
}): {
  isSuspicious: boolean
  reasons: string[]
  riskScore: number  // 0-100
} {
  const reasons: string[] = []
  let riskScore = 0

  // Check for new IP address
  if (session.previousIPs.length > 0 && !session.previousIPs.includes(session.ipAddress)) {
    reasons.push('Nouvelle adresse IP détectée')
    riskScore += 30
  }

  // Check for impossible travel (simplified: check if login time is unusual)
  const loginHour = new Date(session.loginTime).getHours()
  if (loginHour < 5 || loginHour > 23) {
    reasons.push('Connexion à des heures inhabituelles')
    riskScore += 15
  }

  // Check for different user agent pattern (simplified)
  const knownBrowsers = ['Chrome', 'Firefox', 'Safari', 'Edge']
  const isKnownBrowser = knownBrowsers.some(b => session.userAgent.includes(b))
  if (!isKnownBrowser && session.userAgent !== '') {
    reasons.push('Navigateur non reconnu')
    riskScore += 20
  }

  // Check for VPN/proxy indicators in IP (simplified)
  if (session.ipAddress.startsWith('10.') || session.ipAddress.startsWith('192.168.')) {
    // Internal IP - could be proxy
    riskScore += 5
  }

  // Multiple different IP ranges
  if (session.previousIPs.length >= 3) {
    const uniqueSubnets = new Set(
      [session.ipAddress, ...session.previousIPs].map(ip => ip.split('.').slice(0, 3).join('.'))
    )
    if (uniqueSubnets.size >= 3) {
      reasons.push('Connexions depuis de multiples réseaux')
      riskScore += 25
    }
  }

  riskScore = Math.min(100, riskScore)

  return {
    isSuspicious: riskScore >= 50,
    reasons,
    riskScore,
  }
}

/**
 * Generate a CSRF token.
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate a CSRF token using constant-time comparison.
 */
export function validateCSRFToken(token: string, expectedToken: string): boolean {
  return constantTimeCompare(token, expectedToken)
}

// --- Rate Limiter (client-side) ---

export class ClientRateLimiter {
  private attempts: Map<string, number[]> = new Map()

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000  // 15 minutes
  ) {}

  isLimited(key: string): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    const validAttempts = attempts.filter(t => now - t < this.windowMs)
    this.attempts.set(key, validAttempts)
    return validAttempts.length >= this.maxAttempts
  }

  recordAttempt(key: string): void {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    attempts.push(now)
    // Clean old attempts
    const validAttempts = attempts.filter(t => now - t < this.windowMs)
    this.attempts.set(key, validAttempts)
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }

  getRemainingAttempts(key: string): number {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    const validAttempts = attempts.filter(t => now - t < this.windowMs)
    return Math.max(0, this.maxAttempts - validAttempts.length)
  }

  getLockoutEndTime(key: string): Date | null {
    if (!this.isLimited(key)) return null
    const attempts = this.attempts.get(key) || []
    const validAttempts = attempts.filter(t => Date.now() - t < this.windowMs)
    if (validAttempts.length === 0) return null
    const oldestAttempt = Math.min(...validAttempts)
    return new Date(oldestAttempt + this.windowMs)
  }
}

// --- Password Strength Indicator ---

export function getPasswordStrengthLabel(score: number): {
  label: string
  color: string
} {
  if (score < 30) return { label: 'Très faible', color: 'text-red-500' }
  if (score < 50) return { label: 'Faible', color: 'text-orange-500' }
  if (score < 70) return { label: 'Moyen', color: 'text-yellow-500' }
  if (score < 90) return { label: 'Fort', color: 'text-emerald-500' }
  return { label: 'Très fort', color: 'text-green-500' }
}

// --- JWT Rotation Utilities ---

export interface JWTRotationState {
  accessTokenGeneratedAt: number
  refreshTokenGeneratedAt: number
  lastRotationAt: number
  rotationCount: number
}

/**
 * Check if a JWT token needs rotation based on its age.
 */
export function shouldRotateToken(
  rotationState: JWTRotationState,
  accessMaxAgeMs: number = 25 * 60 * 1000,  // 25 minutes (access token expires at 30)
  refreshMaxAgeMs: number = 6 * 24 * 60 * 60 * 1000  // 6 days (refresh token expires at 7)
): { access: boolean; refresh: boolean } {
  const now = Date.now()
  return {
    access: now - rotationState.accessTokenGeneratedAt > accessMaxAgeMs,
    refresh: now - rotationState.refreshTokenGeneratedAt > refreshMaxAgeMs,
  }
}

/**
 * Create initial JWT rotation state.
 */
export function createInitialJWTRotationState(): JWTRotationState {
  const now = Date.now()
  return {
    accessTokenGeneratedAt: now,
    refreshTokenGeneratedAt: now,
    lastRotationAt: now,
    rotationCount: 0,
  }
}
