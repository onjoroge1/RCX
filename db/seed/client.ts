/**
 * Standalone database client for seed scripts.
 *
 * Deliberately does NOT reuse lib/db — that module is `server-only`, which throws
 * by design outside a React Server Component. Scripts run in plain Node, so they
 * get their own pooled connection. Same schema, same casing convention.
 */
import { config } from 'dotenv'

import { Pool, neonConfig } from '@neondatabase/serverless'

// .env.local first — dotenv/config alone would only read .env, which we do not use.
config({ path: ['.env.local', '.env'] })
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'

import * as schema from '@/lib/db/schema'

neonConfig.webSocketConstructor = ws

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.')
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const seedDb = drizzle(pool, { schema, casing: 'snake_case' })
export { schema }
