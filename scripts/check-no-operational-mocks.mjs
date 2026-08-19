import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const roots = [
  new URL('../app/app/', import.meta.url),
  new URL('../components/app/', import.meta.url),
]

const violations = []

async function walk(dirUrl) {
  const entries = await readdir(dirUrl, { withFileTypes: true })
  for (const entry of entries) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dirUrl)
    if (entry.isDirectory()) {
      await walk(child)
      continue
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue
    const source = await readFile(child, 'utf8')
    if (source.includes("@/data/mock") || source.includes("../data/mock") || source.includes("../../data/mock")) {
      violations.push(child.pathname.split('/RCX/').pop() ?? child.pathname)
    }
  }
}

for (const root of roots) await walk(root)

if (violations.length) {
  console.error('Operational surfaces still depend on prototype mock data:\n')
  for (const file of violations.sort()) console.error(`  - ${file}`)
  process.exit(1)
}

console.log('Operational mock-data guard OK.')
