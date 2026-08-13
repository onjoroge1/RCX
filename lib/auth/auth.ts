import 'server-only'

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/lib/db'
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema'
import { verifyPassword } from './password'

/**
 * SESSION STRATEGY — a correction to the approved plan.
 *
 * The plan specified a database session strategy. That is not achievable
 * alongside email/password login: @auth/core states plainly that "the Credentials
 * provider can only be used if JSON Web Tokens are enabled for sessions"
 * (providers/credentials.d.ts:75). Auth.js never writes a session row for a
 * credentials sign-in, so `strategy: 'database'` would produce a user who is
 * authenticated but has no resolvable session.
 *
 * Resolution: JWT sessions carrying only the user id. Everything that actually
 * governs access — workspace membership, role, permissions — is resolved from the
 * database on every request in lib/db/scope.ts. The token is an identity claim,
 * never an authorization claim, so a revoked membership or changed role takes
 * effect immediately rather than at next login.
 *
 * The `sessions` table stays in the schema: it costs nothing, the adapter expects
 * it, and it becomes live if SSO providers are added later.
 */

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login', newUser: '/signup' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Work email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const email = parsed.data.email.trim().toLowerCase()
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

        // verifyPassword runs a real comparison even when user is undefined, so an
        // unregistered email costs the same time as a wrong password.
        const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? null)
        if (!ok || !user || user.status !== 'active') return null

        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
})

/** The current user id, or null. Does not resolve workspace — see getScope(). */
export async function getUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}
