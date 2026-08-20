import { execFileSync } from 'node:child_process'

const proofBranch = 'agent/phase3-journey-runtime'
const branch = process.env.VERCEL_GIT_COMMIT_REF

if (branch !== proofBranch) {
  console.log(`[db-proof] skipped outside ${proofBranch}`)
  process.exit(0)
}

const databaseUrl = process.env.DATABASE_URL ?? ''
if (!databaseUrl || /127\.0\.0\.1|localhost/i.test(databaseUrl)) {
  throw new Error('[db-proof] DATABASE_URL is missing or points at localhost in the Vercel preview build')
}

console.log('[db-proof] Phase 3 preview detected; applying Drizzle migrations...')
execFileSync('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
  stdio: 'inherit',
  env: process.env,
})

console.log('[db-proof] migrations applied; running adversarial DB runtime proof...')
execFileSync(
  'node',
  ['--conditions=react-server', '--import', 'tsx', 'scripts/db-runtime-proof.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, RCX_DB_PROOF: '1' },
  },
)

console.log('[db-proof] PASS — migrations and Phase 2/3 DB runtime proof succeeded')
