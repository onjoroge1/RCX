import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { pool, seedDb } from './client'
import { users } from '@/lib/db/schema'
import { newId } from '@/lib/ids'

const configSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(16, 'PLATFORM_ADMIN_PASSWORD must be at least 16 characters.'),
  name: z.string().trim().min(1).max(120).default('RCX Platform Admin'),
})

async function main() {
  const parsed = configSchema.safeParse({
    email: process.env.PLATFORM_ADMIN_EMAIL,
    password: process.env.PLATFORM_ADMIN_PASSWORD,
    name: process.env.PLATFORM_ADMIN_NAME || undefined,
  })

  if (!parsed.success) {
    throw new Error(
      `Platform admin bootstrap configuration is invalid: ${parsed.error.issues[0]?.message ?? 'unknown error'}`,
    )
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const [existing] = await seedDb
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)

  if (existing) {
    await seedDb
      .update(users)
      .set({
        name: parsed.data.name,
        passwordHash,
        isPlatformAdmin: true,
        status: 'active',
      })
      .where(eq(users.id, existing.id))
    console.log(`Updated platform admin identity: ${parsed.data.email}`)
    return
  }

  await seedDb.insert(users).values({
    id: newId('user'),
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    isPlatformAdmin: true,
    status: 'active',
    defaultWorkspaceId: null,
  })

  console.log(`Created platform admin identity: ${parsed.data.email}`)
}

main()
  .then(async () => {
    await pool.end()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error(error)
    await pool.end().catch(() => {})
    process.exit(1)
  })
