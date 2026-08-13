import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js 16 renamed `middleware` to `proxy`. Do not add a middleware.ts.
 *
 * This is a COOKIE-PRESENCE CHECK ONLY — it must never touch the database.
 * Proxy runs on every request including prefetches, so a DB round-trip here
 * would be one query per hovered link. The real session verification happens in
 * app/app/layout.tsx, and authorization again in lib/db/scope.ts on every query.
 *
 * Treat this purely as a redirect optimisation: it saves an unauthenticated
 * visitor a render, and grants nothing.
 */

const SESSION_COOKIES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
]

export function proxy(request: NextRequest) {
  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name))
  if (hasSessionCookie) return NextResponse.next()

  const url = new URL('/login', request.url)
  url.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/app/:path*', '/admin/:path*'],
}
