import type { Config } from 'drizzle-kit'

if (!process.env.DATABASE_URL) {
  // drizzle-kit does not load .env.local on its own.
  process.loadEnvFile?.('.env.local')
}

export default {
  schema: './lib/db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  casing: 'snake_case',
  strict: true,
  verbose: true,
} satisfies Config
