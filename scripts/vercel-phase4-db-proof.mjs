import { execFileSync } from 'node:child_process'

const branch = process.env.VERCEL_GIT_COMMIT_REF
if (branch !== 'agent/phase4-controlled-integrations') {
  console.log('[phase4-db-proof] skipped outside Phase 4A preview branch')
  process.exit(0)
}

const databaseUrl = process.env.DATABASE_URL ?? ''
if (!databaseUrl || /localhost|127\.0\.0\.1/i.test(databaseUrl)) {
  throw new Error('[phase4-db-proof] preview DATABASE_URL is missing or points at localhost')
}

console.log('[phase4-db-proof] applying migrations through 0005...')
execFileSync('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
  stdio: 'inherit',
  env: process.env,
})

console.log('[phase4-db-proof] running disposable controlled-integration DB proof...')
execFileSync(
  'node',
  ['--conditions=react-server', '--import', 'tsx', 'scripts/phase4-db-proof.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, RCX_PHASE4_DB_PROOF: '1' },
  },
)

console.log('[phase4-db-proof] PASS')
