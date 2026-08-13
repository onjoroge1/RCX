import 'server-only'

import { neon } from '@neondatabase/serverless'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePool } from 'drizzle-orm/neon-serverless'
import ws from 'ws'

import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.')
}

// The WebSocket driver needs a ws implementation outside the browser/edge runtime.
neonConfig.webSocketConstructor = ws

/**
 * Reads. One-shot HTTP per statement — lowest latency, no connection to manage.
 *
 * IMPORTANT: this driver has no interactive transactions. `db.transaction()` will
 * not give you the isolation you expect. Anything multi-statement must use `txDb`.
 */
export const db = drizzle(neon(process.env.DATABASE_URL), {
  schema,
  casing: 'snake_case',
})

let pool: Pool | undefined

/**
 * Writes. Pooled WebSocket connection supporting real transactions.
 * Every server action uses this; every query file uses `db`.
 */
export function getTxDb() {
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL })
  return drizzlePool(pool, { schema, casing: 'snake_case' })
}

export type Db = typeof db
export { schema }
