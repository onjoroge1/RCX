import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const queriesDir = new URL('../lib/db/queries/', import.meta.url)
const entries = (await readdir(queriesDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => entry.name)
  .sort()

const violations = []

for (const name of entries) {
  const fileUrl = new URL(name, queriesDir)
  const source = await readFile(fileUrl, 'utf8')

  // Tenant identity must never be caller supplied. Query functions resolve it
  // through getScope(), where membership and environment are revalidated.
  const exportedFunctions = [
    ...source.matchAll(/export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)/gs),
    ...source.matchAll(/export\s+function\s+(\w+)\s*\(([^)]*)\)/gs),
  ]

  for (const match of exportedFunctions) {
    const [, fn, params] = match
    if (/\b(workspaceId|workspace_id|environment)\b/.test(params)) {
      violations.push(`${name}: ${fn} accepts tenant scope from its caller`)
    }
  }

  if (source.includes("from '@/lib/db'") && !source.includes('getScope(')) {
    violations.push(`${name}: database query module does not resolve getScope()`)
  }
}

if (violations.length) {
  console.error('Tenant scoping contract failed:\n')
  for (const violation of violations) console.error(`  - ${violation}`)
  process.exit(1)
}

console.log(`Tenant scoping contract OK (${entries.length} query modules checked).`)
