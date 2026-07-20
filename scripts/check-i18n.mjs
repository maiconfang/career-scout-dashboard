import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const localesDir = path.join(root, 'src', 'i18n', 'locales')
const sourceDir = path.join(root, 'src')
const localeFiles = ['en.json', 'fr.json', 'pt-BR.json']
const mojibakePattern = /Ã|Â|â|�/
const visibleStringPattern = /(?:>|=|\{|\()\s*["'`](?![./?#:@{}$%<>=!+\-[\]()*|&;,\w]*["'`])([A-Z][^"'`{}<>]{3,})["'`]/g

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'))
}

function walk(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, result)
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      result.push(fullPath)
    }
  }
  return result
}

const dictionaries = Object.fromEntries(localeFiles.map(file => [file, readJson(file)]))
const referenceKeys = Object.keys(dictionaries['en.json']).sort()
let hasKeyDrift = false

for (const file of localeFiles) {
  const keys = Object.keys(dictionaries[file]).sort()
  const missing = referenceKeys.filter(key => !keys.includes(key))
  const extra = keys.filter(key => !referenceKeys.includes(key))

  if (missing.length || extra.length) {
    hasKeyDrift = true
    console.error(`\n${file}`)
    if (missing.length) console.error(`  Missing keys: ${missing.join(', ')}`)
    if (extra.length) console.error(`  Extra keys: ${extra.join(', ')}`)
  }
}

const encodingWarnings = []
for (const file of localeFiles) {
  for (const [key, value] of Object.entries(dictionaries[file])) {
    if (typeof value === 'string' && mojibakePattern.test(value)) {
      encodingWarnings.push(`${file}:${key}`)
    }
  }
}

const hardcodedWarnings = []
for (const filePath of walk(sourceDir)) {
  const relative = path.relative(root, filePath)
  if (relative.includes(`${path.sep}i18n${path.sep}`)) continue
  const content = fs.readFileSync(filePath, 'utf8')
  let match
  while ((match = visibleStringPattern.exec(content)) !== null) {
    const value = match[1].trim()
    if (
      value.includes('className') ||
      value.includes('http') ||
      value.includes('/api/') ||
      /^[MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]+$/.test(value) ||
      value.length > 90
    ) {
      continue
    }
    hardcodedWarnings.push(`${relative}: ${value}`)
  }
}

if (encodingWarnings.length) {
  console.warn(`\nEncoding warnings (${encodingWarnings.length}):`)
  for (const warning of encodingWarnings.slice(0, 50)) console.warn(`  ${warning}`)
  if (encodingWarnings.length > 50) console.warn(`  ...and ${encodingWarnings.length - 50} more`)
}

if (hardcodedWarnings.length) {
  console.warn(`\nPossible hardcoded UI strings (${hardcodedWarnings.length}):`)
  for (const warning of hardcodedWarnings.slice(0, 80)) console.warn(`  ${warning}`)
  if (hardcodedWarnings.length > 80) console.warn(`  ...and ${hardcodedWarnings.length - 80} more`)
}

if (hasKeyDrift) {
  process.exitCode = 1
} else {
  console.log('\ni18n dictionaries contain the same keys.')
}
