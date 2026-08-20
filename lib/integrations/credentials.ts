import { decryptSecret } from '@/lib/crypto/secrets'
import { assertSafeHeaderName } from './policy'
import { encryptedConnectionCredentialSchema, IntegrationExecutionError } from './runtime-types'

export function integrationAuthHeaders(payload: Buffer | null): Record<string, string> {
  if (!payload) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(decryptSecret(payload))
  } catch (error) {
    throw new IntegrationExecutionError('Integration credentials could not be decrypted or parsed', {
      code: 'invalid_credentials',
      retryable: false,
      cause: error,
    })
  }

  const credential = encryptedConnectionCredentialSchema.safeParse(parsed)
  if (!credential.success) {
    throw new IntegrationExecutionError('Integration credentials do not match a supported credential format', {
      code: 'invalid_credentials',
      retryable: false,
      cause: credential.error,
    })
  }

  switch (credential.data.type) {
    case 'none':
      return {}
    case 'bearer':
      return { Authorization: `Bearer ${credential.data.token}` }
    case 'basic': {
      const encoded = Buffer.from(`${credential.data.username}:${credential.data.password}`, 'utf8').toString('base64')
      return { Authorization: `Basic ${encoded}` }
    }
    case 'api_key':
      assertSafeHeaderName(credential.data.headerName)
      return { [credential.data.headerName]: credential.data.value }
  }
}
