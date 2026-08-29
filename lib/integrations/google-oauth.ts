import 'server-only'

import { z } from 'zod'

import { IntegrationExecutionError } from './runtime-types'

export const GOOGLE_CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
export const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

const tokenResponseSchema = z.object({
  access_token: z.string().min(1).max(16_384),
  expires_in: z.number().int().positive().max(86_400),
  refresh_token: z.string().min(1).max(16_384).optional(),
  scope: z.string().optional(),
  token_type: z.string().default('Bearer'),
})

const tokenErrorSchema = z.object({
  error: z.string().optional(),
  error_description: z.string().optional(),
})

export type GoogleOAuthTokenSet = {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scopes: string[]
  tokenType: string
}

export function googleOAuthClientConfig(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new IntegrationExecutionError('Google OAuth is not configured for this RCX deployment', {
      code: 'oauth_not_configured',
      retryable: false,
    })
  }
  return { clientId, clientSecret }
}

export function googleOAuthRedirectUri(origin: string): string {
  const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()
  if (configured) {
    const url = new URL(configured)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      throw new IntegrationExecutionError('GOOGLE_OAUTH_REDIRECT_URI must use HTTPS outside localhost', {
        code: 'oauth_not_configured',
        retryable: false,
      })
    }
    return url.toString()
  }

  const base = new URL(origin)
  return new URL('/api/integrations/google-calendar/oauth/callback', base).toString()
}

export function buildGoogleCalendarAuthorizationUrl(input: {
  state: string
  redirectUri: string
}): string {
  const { clientId } = googleOAuthClientConfig()
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_CALENDAR_EVENTS_SCOPE)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  // A connector setup/reconnect needs a durable refresh token. Google otherwise
  // returns refresh_token only on the first authorization for a client/user pair.
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', input.state)
  return url.toString()
}

async function tokenRequest(body: URLSearchParams): Promise<GoogleOAuthTokenSet> {
  let response: Response
  try {
    response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
      cache: 'no-store',
    })
  } catch (error) {
    throw new IntegrationExecutionError('Google OAuth token endpoint could not be reached', {
      code: 'oauth_network_failure',
      retryable: true,
      cause: error,
    })
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    throw new IntegrationExecutionError('Google OAuth token endpoint returned invalid JSON', {
      code: 'oauth_invalid_response',
      retryable: response.status >= 500,
      statusCode: response.status,
      cause: error,
    })
  }

  if (!response.ok) {
    const parsedError = tokenErrorSchema.safeParse(payload)
    const code = parsedError.success ? parsedError.data.error : undefined
    const description = parsedError.success ? parsedError.data.error_description : undefined
    const retryable = response.status === 429 || response.status >= 500
    throw new IntegrationExecutionError(
      description || `Google OAuth token request failed with HTTP ${response.status}`,
      {
        code: code === 'invalid_grant' ? 'oauth_reauthorization_required' : 'oauth_token_rejected',
        retryable,
        statusCode: response.status,
      },
    )
  }

  const parsed = tokenResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new IntegrationExecutionError('Google OAuth token response is missing required fields', {
      code: 'oauth_invalid_response',
      retryable: false,
      cause: parsed.error,
    })
  }

  return {
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token,
    expiresAt: new Date(Date.now() + parsed.data.expires_in * 1_000),
    scopes: (parsed.data.scope || GOOGLE_CALENDAR_EVENTS_SCOPE).split(/\s+/).filter(Boolean),
    tokenType: parsed.data.token_type,
  }
}

export async function exchangeGoogleAuthorizationCode(input: {
  code: string
  redirectUri: string
}): Promise<GoogleOAuthTokenSet> {
  const { clientId, clientSecret } = googleOAuthClientConfig()
  return tokenRequest(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
      grant_type: 'authorization_code',
    }),
  )
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleOAuthTokenSet> {
  const { clientId, clientSecret } = googleOAuthClientConfig()
  return tokenRequest(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  )
}
