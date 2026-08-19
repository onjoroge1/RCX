import {
  ProviderError,
  type AgentEvent,
  type MessagingProvider,
  type ProviderCapabilities,
  type ProviderSendRequest,
  type ProviderSendResult,
} from '../runtime-types'

const FULL_FEATURES = [
  'RICHCARD_STANDALONE',
  'RICHCARD_CAROUSEL',
  'ACTION_CREATE_CALENDAR_EVENT',
  'ACTION_DIAL',
  'ACTION_OPEN_URL',
  'ACTION_SHARE_LOCATION',
  'ACTION_VIEW_LOCATION',
]

export type SimulatorMode = 'success' | 'transient_error' | 'permanent_error'

export class SimulatorMessagingProvider implements MessagingProvider {
  readonly key = 'simulator'
  readonly channel = 'rcs' as const

  constructor(private readonly mode: SimulatorMode = 'success') {}

  async getCapabilities(recipient: string): Promise<ProviderCapabilities> {
    // Numbers ending in 0000 are a stable unreachable fixture. This gives product
    // and worker tests a fallback path without random behavior or network calls.
    const reachable = !recipient.endsWith('0000')
    return {
      reachable,
      features: reachable ? FULL_FEATURES : [],
      checkedAt: new Date(),
      raw: { simulated: true, reachable },
    }
  }

  async send(request: ProviderSendRequest): Promise<ProviderSendResult> {
    if (request.recipient.endsWith('0000')) {
      throw new ProviderError('Simulator recipient is not RCS reachable', { code: 'not_reachable' })
    }
    if (this.mode === 'transient_error') {
      throw new ProviderError('Simulated provider timeout', { code: 'transient', retryable: true })
    }
    if (this.mode === 'permanent_error') {
      throw new ProviderError('Simulated provider rejection', { code: 'permanent' })
    }
    return {
      providerMessageId: request.idempotencyKey,
      channel: 'rcs',
      acceptedAt: new Date(),
      raw: { simulated: true, message: request.message },
    }
  }

  async revoke(): Promise<void> {
    return
  }

  async sendAgentEvent(_recipient: string, _event: AgentEvent): Promise<void> {
    return
  }
}
