import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { PERMISSIONS, requirePermission } from '@/lib/auth/permissions'
import { getScope } from '@/lib/db/scope'
import { buildGoogleCalendarAuthorizationUrl, googleOAuthRedirectUri } from '@/lib/integrations/google-oauth'
import { createGoogleOauthState } from '@/lib/integrations/oauth-state'

export const dynamic = 'force-dynamic'

const GOOGLE_OAUTH_COOKIE = 'rcx_google_calendar_oauth'
const querySchema = z.object({
  calendarId: z.string().trim().min(1).max(512).default('primary'),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all'),
})

function integrationError(request: NextRequest, code: string): NextResponse {
  const target = new URL('/app/integrations', request.url)
  target.searchParams.set('connect', 'google-calendar')
  target.searchParams.set('oauth_error', code)
  return NextResponse.redirect(target)
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.INTEGRATION_MANAGE)
    const scope = await getScope()
    const parsed = querySchema.safeParse({
      calendarId: request.nextUrl.searchParams.get('calendarId') || undefined,
      sendUpdates: request.nextUrl.searchParams.get('sendUpdates') || undefined,
    })
    if (!parsed.success) return integrationError(request, 'invalid_setup')

    const { state, cookieValue } = createGoogleOauthState(scope, parsed.data)
    const redirectUri = googleOAuthRedirectUri(request.nextUrl.origin)
    const response = NextResponse.redirect(
      buildGoogleCalendarAuthorizationUrl({ state, redirectUri }),
    )
    response.cookies.set(GOOGLE_OAUTH_COOKIE, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/api/integrations/google-calendar/oauth',
    })
    return response
  } catch (error) {
    const code = error instanceof Error && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'oauth_start_failed'
    return integrationError(request, code)
  }
}
