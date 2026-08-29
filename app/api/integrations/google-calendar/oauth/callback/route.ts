import { NextRequest, NextResponse } from 'next/server'

import { PERMISSIONS, requirePermission } from '@/lib/auth/permissions'
import { getScope } from '@/lib/db/scope'
import { saveGoogleCalendarOauthConnection } from '@/lib/integrations/google-connection'
import { exchangeGoogleAuthorizationCode, googleOAuthRedirectUri } from '@/lib/integrations/google-oauth'
import { assertGoogleOauthScope, readGoogleOauthState } from '@/lib/integrations/oauth-state'

export const dynamic = 'force-dynamic'

const GOOGLE_OAUTH_COOKIE = 'rcx_google_calendar_oauth'

function integrationRedirect(
  request: NextRequest,
  params: Record<string, string>,
  clearCookie = true,
): NextResponse {
  const target = new URL('/app/integrations', request.url)
  target.searchParams.set('connect', 'google-calendar')
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value)
  const response = NextResponse.redirect(target)
  if (clearCookie) {
    response.cookies.set(GOOGLE_OAUTH_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/integrations/google-calendar/oauth',
    })
  }
  return response
}

export async function GET(request: NextRequest) {
  const returnedState = request.nextUrl.searchParams.get('state')
  const code = request.nextUrl.searchParams.get('code')
  const oauthError = request.nextUrl.searchParams.get('error')
  const cookieValue = request.cookies.get(GOOGLE_OAUTH_COOKIE)?.value

  if (oauthError) return integrationRedirect(request, { oauth_error: 'consent_denied' })
  if (!returnedState || !cookieValue) {
    return integrationRedirect(request, { oauth_error: 'oauth_state_missing' })
  }

  try {
    await requirePermission(PERMISSIONS.INTEGRATION_MANAGE)
    const scope = await getScope()
    const state = readGoogleOauthState(cookieValue, returnedState)
    assertGoogleOauthScope(state, scope)
    if (!code) return integrationRedirect(request, { oauth_error: 'authorization_code_missing' })

    const tokens = await exchangeGoogleAuthorizationCode({
      code,
      redirectUri: googleOAuthRedirectUri(request.nextUrl.origin),
    })
    const connectionId = await saveGoogleCalendarOauthConnection({
      scope,
      tokens,
      calendarId: state.calendarId,
      sendUpdates: state.sendUpdates,
    })

    return integrationRedirect(request, {
      oauth: 'connected',
      connection: connectionId,
    })
  } catch (error) {
    const errorCode =
      error instanceof Error && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'oauth_callback_failed'
    return integrationRedirect(request, { oauth_error: errorCode })
  }
}
