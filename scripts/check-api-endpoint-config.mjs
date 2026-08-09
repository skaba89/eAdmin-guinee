import { readdir, readFile } from 'node:fs/promises'
import { extname, relative } from 'node:path'

const root = new URL('../src/', import.meta.url)
const allowedFile = 'lib/api-base-url.ts'
const forbidden = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
]
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])
const violations = []

async function visit(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true })
  for (const entry of entries) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl)
    if (entry.isDirectory()) {
      await visit(child)
      continue
    }
    if (!extensions.has(extname(entry.name))) continue

    const sourcePath = child.pathname
    const relativePath = relative(root.pathname, sourcePath).replaceAll('\\', '/')
    if (relativePath === allowedFile) continue

    const content = await readFile(child, 'utf8')
    for (const needle of forbidden) {
      if (content.includes(needle)) {
        violations.push(`${relativePath}: forbidden browser API fallback ${needle}`)
      }
    }
  }
}

await visit(root)

if (violations.length) {
  console.error('Frontend API endpoint gate failed:')
  for (const violation of violations) console.error(`- ${violation}`)
  console.error('Use src/lib/api-base-url.ts instead of a production localhost fallback.')
  process.exit(1)
}

console.log('Frontend API endpoint gate passed.')
