import { randomUUID } from 'node:crypto'

import { getGoogleAccessToken, type GoogleServiceAccount } from './google-auth'
import { toGoogleAgentMessage } from './google-rbm-payload'
import {
  ProviderError,
  type AgentEvent,
  type MessagingProvider,
  type ProviderCapabilities,
  type ProviderSendRequest,
  type ProviderSendResult,
} from '../runtime-types'

export type GoogleRbmProviderConfig = {
  agentId: string
  region?: string | null
  serviceAccount: GoogleServiceAccount
  fetchImpl?: typeof fetch
}

function endpoint(region?: string | null): string {
  if (!region) return 'https://rcsbusinessmessaging.googleapis.com'
  const clean = region.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!clean) return 'https://rcsbusinessmessaging.googleapis.com'
  return `https://${clean}-rcsbusinessmessaging.googleapis.com`
}

async function responsePayload(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { body: text.slice(0, 2000) }
  }
}

function providerError(status: number, raw: unknown, operation: string): ProviderError {
  if (status === 404) {
    return new ProviderError(`Google RBM ${operation}: recipient is not reachable`, {
      code: 'not_reachable',
      statusCode: status,
      raw,
    })
  }
  if (status === 401 || status === 403) {
    return new ProviderError(`Google RBM ${operation}: authentication/authorization failed`, {
      code: 'authentication',
      statusCode: status,
      raw,
    })
  }
  if (status === 429) {
    return new ProviderError(`Google RBM ${operation}: rate limited`, {
      code: 'rate_limited',
      retryable: true,
      statusCode: status,
      raw,
    })
  }
  if (status >= 500) {
    return new ProviderError(`Google RBM ${operation}: provider unavailable`, {
      code: 'transient',
      retryable: true,
      statusCode: status,
      raw,
    })
  }
  if (status === 400) {
    return new ProviderError(`Google RBM ${operation}: invalid request`, {
      code: 'invalid_request',
      statusCode: status,
      raw,
    })
  }
  return new ProviderError(`Google RBM ${operation} failed with HTTP ${status}`, {
    code: 'permanent',
    statusCode: status,
    raw,
  })
}

export class GoogleRbmProvider implements MessagingProvider {
  readonly key = 'google_rbm'
  readonly channel = 'rcs' as const

  private readonly agentId: string
  private readonly region?: string | null
  private readonly serviceAccount: GoogleServiceAccount
  private readonly fetchImpl: typeof fetch

  constructor(config: GoogleRbmProviderConfig) {
    if (!config.agentId.trim()) throw new Error('Google RBM agentId is required')
    this.agentId = config.agentId.trim()
    this.region = config.region
    this.serviceAccount = config.serviceAccount
    this.fetchImpl = config.fetchImpl ?? fetch
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await getGoogleAccessToken(this.serviceAccount, this.fetchImpl)
    return {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'rcx/1.0 rcs-business-messaging',
    }
  }

  private async request(url: URL, init: RequestInit, operation: string): Promise<Response> {
    const headers = await this.headers()
    try {
      return await this.fetchImpl(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) } })
    } catch (error) {
      throw new ProviderError(`Google RBM ${operation}: network request failed`, {
        code: 'transient',
        retryable: true,
        cause: error,
      })
    }
  }

  async getCapabilities(recipient: string): Promise<ProviderCapabilities> {
    const url = new URL(`${endpoint(this.region)}/v1/phones/${recipient}/capabilities`)
    url.searchParams.set('requestId', randomUUID())
    url.searchParams.set('agentId', this.agentId)

    const response = await this.request(url, { method: 'GET' }, 'capability check')
    if (response.status === 404) {
      return { reachable: false, features: [], checkedAt: new Date(), raw: await responsePayload(response) }
    }
    const raw = await responsePayload(response)
    if (!response.ok) throw providerError(response.status, raw, 'capability check')

    const features =
      raw && typeof raw === 'object' && Array.isArray((raw as { features?: unknown }).features)
        ? (raw as { features: unknown[] }).features.filter((value): value is string => typeof value === 'string')
        : []

    return { reachable: true, features, checkedAt: new Date(), raw }
  }

  async send(request: ProviderSendRequest): Promise<ProviderSendResult> {
    const url = new URL(`${endpoint(this.region)}/v1/phones/${request.recipient}/agentMessages`)
    url.searchParams.set('messageId', request.idempotencyKey)
    url.searchParams.set('agentId', this.agentId)

    const body = toGoogleAgentMessage(request.message)
    if (request.ttlSeconds && request.ttlSeconds > 0) body.ttl = `${Math.floor(request.ttlSeconds)}s`

    const response = await this.request(
      url,
      { method: 'POST', body: JSON.stringify(body) },
      'send',
    )
    const raw = await responsePayload(response)
    if (!response.ok) throw providerError(response.status, raw, 'send')

    return {
      providerMessageId: request.idempotencyKey,
      channel: 'rcs',
      acceptedAt: new Date(),
      raw,
    }
  }

  async revoke(recipient: string, providerMessageId: string): Promise<void> {
    const url = new URL(`${endpoint(this.region)}/v1/phones/${recipient}/agentMessages/${providerMessageId}`)
    url.searchParams.set('agentId', this.agentId)
    const response = await this.request(url, { method: 'DELETE' }, 'revoke')
    if (!response.ok) throw providerError(response.status, await responsePayload(response), 'revoke')
  }

  async sendAgentEvent(recipient: string, event: AgentEvent): Promise<void> {
    const url = new URL(`${endpoint(this.region)}/v1/phones/${recipient}/agentEvents`)
    url.searchParams.set('eventId', randomUUID())
    url.searchParams.set('agentId', this.agentId)
    const body =
      event.kind === 'read'
        ? { eventType: 'READ', messageId: event.providerMessageId }
        : { eventType: 'IS_TYPING' }

    const response = await this.request(
      url,
      { method: 'POST', body: JSON.stringify(body) },
      'agent event',
    )
    if (!response.ok) throw providerError(response.status, await responsePayload(response), 'agent event')
  }
}
