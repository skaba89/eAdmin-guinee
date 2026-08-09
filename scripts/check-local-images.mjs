import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const publicDir = path.join(root, 'public')
const scanRoots = [path.join(root, 'src')]
const extraFiles = [
  path.join(root, 'src', 'app', 'layout.tsx'),
  path.join(root, 'public', 'site.webmanifest'),
].filter(fs.existsSync)

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif'])
const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.html', '.json', '.webmanifest'])

// Historical landing URLs. Their original .png files contain JPEG bytes.
// Next.js rewrites these URLs before filesystem lookup to the correctly named
// local .jpg assets. Keep this list synchronized with next.config.ts.
const localAliases = new Map([
  ['/guinea-hero-conakry.png', '/guinea-hero-conakry.jpg'],
  ['/guinea-mosque-conakry.png', '/guinea-mosque-conakry.jpg'],
  ['/guinea-fouta-djallon.png', '/guinea-fouta-djallon.jpg'],
  ['/guinea-nimba-mountains.png', '/guinea-nimba-mountains.jpg'],
  ['/guinea-niger-river.png', '/guinea-niger-river.jpg'],
  ['/guinea-culture-dance.png', '/guinea-culture-dance.jpg'],
])

function walkText(directory) {
  if (!fs.existsSync(directory)) return []
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return walkText(full)
    return textExtensions.has(path.extname(entry.name).toLowerCase()) ? [full] : []
  })
}

function walkImages(directory) {
  if (!fs.existsSync(directory)) return []
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return walkImages(full)
    return imageExtensions.has(path.extname(entry.name).toLowerCase()) ? [full] : []
  })
}

function normalizeLocalAsset(value) {
  const clean = value.split(/[?#]/, 1)[0]
  return clean.startsWith('/') ? clean : null
}

function detectKind(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'gif'
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
  const head = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8').trimStart()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg'
  if (buffer.length >= 4 && buffer.readUInt16LE(0) === 0 && buffer.readUInt16LE(2) === 1) return 'ico'
  if (buffer.length >= 12 && buffer.subarray(4, 12).toString('ascii').includes('ftyp')) return 'avif'
  return 'unknown'
}

function expectedKind(extension) {
  if (extension === '.jpg' || extension === '.jpeg') return 'jpeg'
  return extension.slice(1)
}

const files = [...new Set([...scanRoots.flatMap(walkText), ...extraFiles])]
const localRefs = new Map()
const externalRefs = []

// Static string references are intentionally broad: this catches src/href,
// CSS url(), OpenGraph images and icon metadata without coupling the checker
// to one React image component.
const quotedImage = /["'`](\/[^"'`\s()]+\.(?:png|jpe?g|webp|gif|svg|ico|avif)(?:[?#][^"'`\s()]*)?)["'`]/gi
const cssImage = /url\(\s*["']?(\/[^"')\s]+\.(?:png|jpe?g|webp|gif|svg|ico|avif)(?:[?#][^"')\s]*)?)["']?\s*\)/gi
const externalImage = /(?:src\s*=\s*["']|url\(\s*["']?|image\s*:\s*["'])(https?:\/\/[^"')\s]+)/gi

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const relative = path.relative(root, file)

  for (const regex of [quotedImage, cssImage]) {
    regex.lastIndex = 0
    let match
    while ((match = regex.exec(text))) {
      const ref = normalizeLocalAsset(match[1])
      if (!ref) continue
      if (!localRefs.has(ref)) localRefs.set(ref, new Set())
      localRefs.get(ref).add(relative)
    }
  }

  externalImage.lastIndex = 0
  let remote
  while ((remote = externalImage.exec(text))) {
    externalRefs.push({ file: relative, url: remote[1] })
  }
}

const errors = []
const checkedTargets = new Set()

function validateAsset(target, label) {
  const extension = path.extname(target).toLowerCase()
  if (!imageExtensions.has(extension)) return
  const diskPath = path.join(publicDir, target.slice(1))
  if (!fs.existsSync(diskPath)) {
    errors.push(`MISSING ${label}`)
    return
  }
  if (checkedTargets.has(target)) return
  checkedTargets.add(target)
  const buffer = fs.readFileSync(diskPath)
  const actual = detectKind(buffer)
  const expected = expectedKind(extension)
  if (actual !== expected) {
    errors.push(`TYPE ${target}: extension expects ${expected}, bytes are ${actual}`)
  }
}

for (const [ref, sources] of [...localRefs.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const target = localAliases.get(ref) ?? ref
  validateAsset(
    target,
    `${ref}${target !== ref ? ` -> ${target}` : ''} referenced by ${[...sources].join(', ')}`,
  )
}

// Also validate every image physically shipped in public/, not only images that
// are currently referenced. Historical alias source files are intentionally
// skipped because Next intercepts those URLs before filesystem resolution and
// serves the matching .jpg target instead.
const legacyAliasSources = new Set(localAliases.keys())
let shippedImages = 0
for (const diskPath of walkImages(publicDir)) {
  const publicPath = `/${path.relative(publicDir, diskPath).split(path.sep).join('/')}`
  shippedImages += 1
  if (legacyAliasSources.has(publicPath)) continue
  validateAsset(publicPath, publicPath)
}

for (const item of externalRefs) {
  errors.push(`REMOTE ${item.url} referenced by ${item.file}`)
}

console.log(`Local image audit: ${localRefs.size} referenced paths, ${checkedTargets.size} validated local targets, ${shippedImages} shipped public images, ${externalRefs.length} remote image references.`)
for (const [ref, sources] of [...localRefs.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const target = localAliases.get(ref) ?? ref
  console.log(`  OK ${ref}${target !== ref ? ` -> ${target}` : ''} (${[...sources].join(', ')})`)
}

if (errors.length) {
  console.error('\nLocal image audit failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Local image audit passed: every runtime image is local and every shipped non-legacy asset has a matching file signature.')
