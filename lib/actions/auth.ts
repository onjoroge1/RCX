'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { signIn, signOut } from '@/lib/auth/auth'
import { hashPassword } from '@/lib/auth/password'
import { getTxDb, db } from '@/lib/db'
import { organizations, users, workspaceMembers, workspaces, roles } from '@/lib/db/schema'
import { newId } from '@/lib/ids'
import { ENVIRONMENT_COOKIE, WORKSPACE_COOKIE, getScope } from '@/lib/db/scope'
import { slugify } from '@/lib/format'
import { isPlatformAdminUsername, platformAdminIdentityEmail } from '@/lib/admin/login-contract'

export type AuthFormState = { error?: string } | undefined

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
} as const

/* ------------------------------------------------------------------ *
 * Sign in
 * ------------------------------------------------------------------ */

const signInSchema = z.object({
  email: z.string().email('Enter a valid work email.'),
  password: z.string().min(1, 'Enter your password.'),
})

const adminSignInSchema = z.object({
  username: z.string().trim().min(1, 'Enter the admin username.').max(80),
  password: z.string().min(1, 'Enter your password.').max(200),
})

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const next = String(formData.get('next') || '/app/overview')

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeNext(next),
    })
  } catch (error) {
    // NEXT_REDIRECT is how a successful signIn returns — rethrow it untouched.
    if (error instanceof AuthError) {
      return { error: 'That email and password did not match an account.' }
    }
    throw error
  }
}

/**
 * Dedicated control-plane sign in. `/admin/login` intentionally uses a stable
 * operator username while the underlying Auth.js identity remains an email-backed
 * database user. The password is still verified by the normal Credentials provider
 * and never lives in source code.
 */
export async function adminSignInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = adminSignInSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Deliberately keep all invalid-admin cases on one response path.
  if (!isPlatformAdminUsername(parsed.data.username)) {
    return { error: 'That username and password did not match the platform administrator.' }
  }

  const email = platformAdminIdentityEmail(process.env.PLATFORM_ADMIN_EMAIL)
  const [admin] = await db
    .select({ id: users.id, status: users.status, isPlatformAdmin: users.isPlatformAdmin })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!admin || admin.status !== 'active' || !admin.isPlatformAdmin) {
    return { error: 'That username and password did not match the platform administrator.' }
  }

  try {
    await signIn('credentials', {
      email,
      password: parsed.data.password,
      redirectTo: '/admin',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'That username and password did not match the platform administrator.' }
    }
    throw error
  }
}

/* ------------------------------------------------------------------ *
 * Sign up
 * ------------------------------------------------------------------ */

const signUpSchema = z.object({
  name: z.string().min(1, 'Enter your name.').max(120),
  email: z.string().email('Enter a valid work email.'),
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
  company: z.string().min(1, 'Enter your company.').max(160),
  country: z.string().max(2).optional(),
})

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    company: formData.get('company'),
    country: formData.get('country') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const email = parsed.data.email.trim().toLowerCase()

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    return { error: 'An account with that email already exists. Sign in instead.' }
  }

  const [ownerRole] = await db.select().from(roles).where(eq(roles.key, 'owner')).limit(1)
  if (!ownerRole) {
    throw new Error('System roles are not seeded. Run `pnpm db:seed:auth`.')
  }

  const userId = newId('user')
  const orgId = newId('organization')
  const workspaceId = newId('workspace')
  const passwordHash = await hashPassword(parsed.data.password)

  const tx = getTxDb()
  await tx.transaction(async (t) => {
    await t.insert(organizations).values({
      id: orgId,
      name: parsed.data.company,
      slug: await uniqueSlug(parsed.data.company, orgId),
      country: parsed.data.country ?? null,
    })

    await t.insert(users).values({
      id: userId,
      name: parsed.data.name,
      email,
      passwordHash,
      country: parsed.data.country ?? null,
      defaultWorkspaceId: workspaceId,
    })

    await t.insert(workspaces).values({
      id: workspaceId,
      organizationId: orgId,
      name: parsed.data.company,
      slug: await uniqueSlug(parsed.data.company, workspaceId),
    })

    await t.insert(workspaceMembers).values({
      id: newId('member'),
      workspaceId,
      userId,
      roleId: ownerRole.id,
      status: 'active',
      defaultEnvironment: 'test',
    })
  })

  try {
    await signIn('credentials', {
      email,
      password: parsed.data.password,
      redirectTo: '/app/overview',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Account created, but sign-in failed. Try signing in.' }
    }
    throw error
  }
}

/* ------------------------------------------------------------------ *
 * Demo sign-in — the one-click path that keeps /app clickable
 * ------------------------------------------------------------------ */

export async function signInAsDemoAction(): Promise<AuthFormState> {
  const email = process.env.DEMO_USER_EMAIL
  const password = process.env.DEMO_USER_PASSWORD
  if (!email || !password) {
    return { error: 'Demo access is not configured on this deployment.' }
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/app/overview' })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'The demo workspace is unavailable right now.' }
    }
    throw error
  }
}

/* ------------------------------------------------------------------ *
 * Session controls
 * ------------------------------------------------------------------ */

export async function signOutAction() {
  const jar = await cookies()
  jar.delete(WORKSPACE_COOKIE)
  jar.delete(ENVIRONMENT_COOKIE)
  await signOut({ redirectTo: '/' })
}

export async function switchWorkspaceAction(workspaceId: string) {
  // Verify membership before honouring the switch — never trust the argument.
  const scope = await getScope()
  const [membership] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, scope.userId),
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.status, 'active'),
      ),
    )
    .limit(1)

  if (!membership) throw new Error('Not a member of that workspace')

  const jar = await cookies()
  jar.set(WORKSPACE_COOKIE, workspaceId, COOKIE_OPTS)
  revalidatePath('/app', 'layout')
}

export async function switchEnvironmentAction(environment: 'test' | 'live') {
  await getScope() // authenticated callers only
  const jar = await cookies()
  jar.set(ENVIRONMENT_COOKIE, environment, COOKIE_OPTS)
  revalidatePath('/app', 'layout')
}

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

/** Only ever redirect to a path on this site, never to an absolute URL. */
function safeNext(next: string): string {
  if (!next.startsWith('/') || next.startsWith('//')) return '/app/overview'
  return next
}

async function uniqueSlug(name: string, fallbackId: string): Promise<string> {
  const base = slugify(name)
  if (!base) return fallbackId
  const [taken] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, base)).limit(1)
  return taken ? `${base}-${fallbackId.slice(-6)}` : base
}

export async function requireSessionOrRedirect() {
  try {
    return await getScope()
  } catch {
    redirect('/login')
  }
}
