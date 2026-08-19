import { createSign } from 'node:crypto'

import { ProviderError } from '../runtime-types'

export const GOOGLE_RBM_SCOPE = 'https://www.googleapis.com/auth/rcsbusinessmessaging'
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token'

export type GoogleServiceAccount = {
  client_email: string
  private_key: string
  token_uri?: string
}

type CachedToken = { accessToken: string; expiresAtMs: number }
const tokenCache = new Map<string, CachedToken>()

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export function buildServiceAccountAssertion(
  serviceAccount: GoogleServiceAccount,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Google service account must include client_email and private_key')
  }

  const tokenUri = serviceAccount.token_uri || DEFAULT_TOKEN_URI
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' })
  const claims = base64UrlJson({
    iss: serviceAccount.client_email,
    scope: GOOGLE_RBM_SCOPE,
    aud: tokenUri,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  })
  const unsigned = `${header}.${claims}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const signature = signer.sign(serviceAccount.private_key).toString('base64url')
  return `${unsigned}.${signature}`
}

export async function getGoogleAccessToken(
  serviceAccount: GoogleServiceAccount,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const key = serviceAccount.client_email
  const cached = tokenCache.get(key)
  if (cached && cached.expiresAtMs - Date.now() > 5 * 60_000) return cached.accessToken

  const tokenUri = serviceAccount.token_uri || DEFAULT_TOKEN_URI
  const assertion = buildServiceAccountAssertion(serviceAccount)
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })

  let response: Response
  try {
    response = await fetchImpl(tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch (error) {
    throw new ProviderError('Google OAuth token exchange could not reach Google', {
      code: 'transient',
      retryable: true,
      cause: error,
    })
  }

  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!response.ok || !payload.access_token) {
    throw new ProviderError(
      `Google OAuth token exchange failed (${response.status}): ${payload.error_description || payload.error || 'unknown error'}`,
      {
        code: response.status >= 500 || response.status === 429 ? 'transient' : 'authentication',
        retryable: response.status >= 500 || response.status === 429,
        statusCode: response.status,
        raw: payload,
      },
    )
  }

  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 3600
  tokenCache.set(key, {
    accessToken: payload.access_token,
    expiresAtMs: Date.now() + expiresIn * 1000,
  })
  return payload.access_token
}

export function clearGoogleTokenCacheForTests(): void {
  tokenCache.clear()
}
