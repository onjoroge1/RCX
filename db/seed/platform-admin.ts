import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { pool, seedDb } from './client'
import { auditLog, users } from '@/lib/db/schema'
import { newId } from '@/lib/ids'
import { platformAdminIdentityEmail, PLATFORM_ADMIN_USERNAME } from '@/lib/admin/login-contract'

const strongAdminPassword = z
  .string()
  .min(12, 'PLATFORM_ADMIN_PASSWORD must be at least 12 characters.')
  .max(200)
  .refine((value) => /[A-Z]/.test(value), 'PLATFORM_ADMIN_PASSWORD must include an uppercase letter.')
  .refine((value) => /[a-z]/.test(value), 'PLATFORM_ADMIN_PASSWORD must include a lowercase letter.')
  .refine((value) => /\d/.test(value), 'PLATFORM_ADMIN_PASSWORD must include a number.')
  .refine((value) => /[^A-Za-z0-9]/.test(value), 'PLATFORM_ADMIN_PASSWORD must include a symbol.')

const configSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: strongAdminPassword,
  name: z.string().trim().min(1).max(120).default('RCX Platform Admin'),
})

async function main() {
  const parsed = configSchema.safeParse({
    email: platformAdminIdentityEmail(process.env.PLATFORM_ADMIN_EMAIL),
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
    .select({
      id: users.id,
      name: users.name,
      status: users.status,
      isPlatformAdmin: users.isPlatformAdmin,
    })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)

  const userId = existing?.id ?? newId('user')

  await seedDb.transaction(async (tx) => {
    if (existing) {
      await tx
        .update(users)
        .set({
          name: parsed.data.name,
          passwordHash,
          isPlatformAdmin: true,
          status: 'active',
        })
        .where(eq(users.id, userId))
    } else {
      await tx.insert(users).values({
        id: userId,
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        isPlatformAdmin: true,
        status: 'active',
        defaultWorkspaceId: null,
      })
    }

    await tx.insert(auditLog).values({
      id: newId('auditLog'),
      workspaceId: null,
      environment: null,
      actorType: 'system',
      actorLabel: 'platform-admin-bootstrap',
      action: existing ? 'platform_admin.rekeyed' : 'platform_admin.created',
      resourceType: 'user',
      resourceId: userId,
      resourceLabel: parsed.data.email,
      result: 'success',
      before: existing
        ? {
            name: existing.name,
            status: existing.status,
            isPlatformAdmin: existing.isPlatformAdmin,
          }
        : null,
      after: {
        username: PLATFORM_ADMIN_USERNAME,
        name: parsed.data.name,
        status: 'active',
        isPlatformAdmin: true,
      },
    })
  })

  console.log(`${existing ? 'Updated' : 'Created'} platform admin login: ${PLATFORM_ADMIN_USERNAME}`)
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
