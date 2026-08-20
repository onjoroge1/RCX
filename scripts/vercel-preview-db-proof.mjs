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

console.log('[db-proof] removing temporary proof actor after successful DB verification...')
execFileSync(
  'node',
  ['--conditions=react-server', '--import', 'tsx', 'scripts/db-proof-system-user.ts', '--cleanup'],
  {
    stdio: 'inherit',
    env: process.env,
  },
)
console.log('[db-proof] temporary proof actor removed')
