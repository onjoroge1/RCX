import { execFileSync } from 'node:child_process'

if (!process.env.VERCEL) process.exit(0)

console.log('[phase4b-db-proof] applying migrations through 0006...')
execFileSync('pnpm', ['db:migrate'], { stdio: 'inherit' })
console.log('[phase4b-db-proof] running disposable provider-adapter DB proof...')
execFileSync('pnpm', ['tsx', 'scripts/phase4b-db-proof.ts'], { stdio: 'inherit' })
console.log('[phase4b-db-proof] PASS')
