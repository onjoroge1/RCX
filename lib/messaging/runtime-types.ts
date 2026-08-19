export type MessageChannel = 'rcs' | 'sms'

export type CanonicalSuggestion =
  | {
      kind: 'reply'
      label: string
      postbackData: string
    }
  | {
      kind: 'open_url'
      label: string
      postbackData: string
      url: string
    }
  | {
      kind: 'dial'
      label: string
      postbackData: string
      phoneNumber: string
    }

export type CanonicalMessage =
  | {
      kind: 'text'
      text: string
      suggestions?: CanonicalSuggestion[]
      smsFallback?: string | null
    }
  | {
      kind: 'rich_card'
      title: string
      description?: string
      mediaUrl?: string | null
      mediaAltText?: string | null
      cardSuggestions?: CanonicalSuggestion[]
      suggestions?: CanonicalSuggestion[]
      smsFallback?: string | null
    }

export type ProviderCapabilities = {
  reachable: boolean
  features: string[]
  checkedAt: Date
  raw?: unknown
}

export type ProviderSendRequest = {
  recipient: string
  message: CanonicalMessage
  /**
   * Provider-stable identifier. For Google RBM this is a UUID and MUST be reused
   * for a retry of the same logical message so a retry cannot create a duplicate.
   */
  idempotencyKey: string
  ttlSeconds?: number
}

export type ProviderSendResult = {
  providerMessageId: string
  channel: MessageChannel
  acceptedAt: Date
  raw?: unknown
}

export type ProviderEvent =
  | {
      kind: 'delivery'
      providerEventId: string
      providerMessageId: string
      agentId: string
      senderPhoneNumber: string
      status: 'delivered' | 'read' | 'expired'
      occurredAt: Date
      raw: unknown
    }
  | {
      kind: 'inbound_message'
      providerEventId: string
      providerMessageId: string
      agentId: string
      senderPhoneNumber: string
      occurredAt: Date
      text: string | null
      suggestion: { text: string; postbackData: string | null; type: string | null } | null
      raw: unknown
    }
  | {
      kind: 'typing'
      providerEventId: string
      agentId: string
      senderPhoneNumber: string
      occurredAt: Date
      raw: unknown
    }
  | {
      kind: 'consent'
      providerEventId: string
      agentId: string
      senderPhoneNumber: string
      state: 'subscribed' | 'unsubscribed'
      occurredAt: Date
      raw: unknown
    }
  | {
      kind: 'agent_state'
      providerEventId: string
      agentId: string
      occurredAt: Date
      state: string
      raw: unknown
    }

export type ProviderEventEnvelope = {
  event: ProviderEvent
  dedupeKey: string
}

export type AgentEvent =
  | { kind: 'read'; providerMessageId: string }
  | { kind: 'typing' }

export interface MessagingProvider {
  readonly key: string
  readonly channel: MessageChannel

  getCapabilities?(recipient: string): Promise<ProviderCapabilities>
  send(request: ProviderSendRequest): Promise<ProviderSendResult>
  revoke?(recipient: string, providerMessageId: string): Promise<void>
  sendAgentEvent?(recipient: string, event: AgentEvent): Promise<void>
}

export type ProviderErrorCode =
  | 'not_reachable'
  | 'unsupported_content'
  | 'authentication'
  | 'rate_limited'
  | 'transient'
  | 'invalid_request'
  | 'permanent'

export class ProviderError extends Error {
  readonly code: ProviderErrorCode
  readonly retryable: boolean
  readonly statusCode?: number
  readonly raw?: unknown

  constructor(
    message: string,
    options: {
      code: ProviderErrorCode
      retryable?: boolean
      statusCode?: number
      raw?: unknown
      cause?: unknown
    },
  ) {
    super(message, { cause: options.cause })
    this.name = 'ProviderError'
    this.code = options.code
    this.retryable = options.retryable ?? false
    this.statusCode = options.statusCode
    this.raw = options.raw
  }
}
