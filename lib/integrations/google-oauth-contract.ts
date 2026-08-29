export const GOOGLE_CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
export const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

/** Pure authorization-URL contract. Secret/env lookup remains server-only. */
export function googleCalendarAuthorizationUrl(input: {
  clientId: string
  state: string
  redirectUri: string
}): string {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT)
  url.searchParams.set('client_id', input.clientId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_CALENDAR_EVENTS_SCOPE)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  // A connection/reconnect needs durable offline access. Google otherwise may
  // omit refresh_token after the first client/user authorization.
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', input.state)
  return url.toString()
}
