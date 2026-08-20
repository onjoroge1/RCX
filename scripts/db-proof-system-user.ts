import { eq } from 'drizzle-orm'

import { pool, seedDb, schema } from '@/db/seed/client'

const ID = 'db-proof-system'
const EMAIL = 'db-proof-system@invalid.local'

async function main() {
  const cleanup = process.argv.includes('--cleanup')
  if (cleanup) {
    await seedDb.delete(schema.users).where(eq(schema.users.id, ID))
    console.log('[db-proof] temporary system actor removed')
    return
  }

  await seedDb
    .insert(schema.users)
    .values({ id: ID, name: 'RCX DB Proof', email: EMAIL })
    .onConflictDoNothing({ target: schema.users.id })
  console.log('[db-proof] temporary system actor ready')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
