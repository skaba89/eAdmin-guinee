const ENTRY_PREFIX = 'eadmin.idempotency.v1.'
const ENTRY_TTL_MS = 15 * 60 * 1000

interface IdempotencyEntry {
  key: string
  createdAt: number
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    )
  }
  return value
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function randomKey(): string {
  if (typeof crypto.randomUUID === 'function') {
    return `req_${crypto.randomUUID()}`
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const random = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return `req_${random}`
}

export async function getStableIdempotencyKey(payload: unknown): Promise<string> {
  const canonical = JSON.stringify(stableValue(payload))
  const fingerprint = await sha256Hex(canonical)
  const storageKey = `${ENTRY_PREFIX}${fingerprint}`

  if (typeof window !== 'undefined') {
    const raw = sessionStorage.getItem(storageKey)
    if (raw) {
      try {
        const entry = JSON.parse(raw) as IdempotencyEntry
        if (
          typeof entry.key === 'string'
          && typeof entry.createdAt === 'number'
          && Date.now() - entry.createdAt <= ENTRY_TTL_MS
        ) {
          return entry.key
        }
      } catch {
        // Replace malformed local metadata below. No business payload is stored.
      }
      sessionStorage.removeItem(storageKey)
    }
  }

  const key = randomKey()
  if (typeof window !== 'undefined') {
    const entry: IdempotencyEntry = { key, createdAt: Date.now() }
    sessionStorage.setItem(storageKey, JSON.stringify(entry))
  }
  return key
}

export function purgeExpiredIdempotencyKeys(): void {
  if (typeof window === 'undefined') return
  const now = Date.now()
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index)
    if (!key?.startsWith(ENTRY_PREFIX)) continue
    const raw = sessionStorage.getItem(key)
    try {
      const entry = JSON.parse(raw || '{}') as Partial<IdempotencyEntry>
      if (typeof entry.createdAt !== 'number' || now - entry.createdAt > ENTRY_TTL_MS) {
        sessionStorage.removeItem(key)
      }
    } catch {
      sessionStorage.removeItem(key)
    }
  }
}
