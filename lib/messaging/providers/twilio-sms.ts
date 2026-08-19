import {
  ProviderError,
  type MessagingProvider,
  type ProviderSendRequest,
  type ProviderSendResult,
} from '../runtime-types'

export type TwilioSmsProviderConfig = {
  accountSid: string
  authToken: string
  messagingServiceSid?: string | null
  from?: string | null
  fetchImpl?: typeof fetch
}

export class TwilioSmsProvider implements MessagingProvider {
  readonly key = 'twilio_sms'
  readonly channel = 'sms' as const

  private readonly accountSid: string
  private readonly authToken: string
  private readonly messagingServiceSid?: string | null
  private readonly from?: string | null
  private readonly fetchImpl: typeof fetch

  constructor(config: TwilioSmsProviderConfig) {
    if (!config.accountSid || !config.authToken) throw new Error('Twilio accountSid and authToken are required')
    if (!config.messagingServiceSid && !config.from) {
      throw new Error('Twilio SMS provider requires messagingServiceSid or from')
    }
    this.accountSid = config.accountSid
    this.authToken = config.authToken
    this.messagingServiceSid = config.messagingServiceSid
    this.from = config.from
    this.fetchImpl = config.fetchImpl ?? fetch
  }

  async send(request: ProviderSendRequest): Promise<ProviderSendResult> {
    if (request.message.kind !== 'text') {
      throw new ProviderError('Twilio SMS fallback only accepts canonical text messages', {
        code: 'unsupported_content',
      })
    }

    const body = new URLSearchParams({ To: request.recipient, Body: request.message.text })
    if (this.messagingServiceSid) body.set('MessagingServiceSid', this.messagingServiceSid)
    else if (this.from) body.set('From', this.from)

    const response = await this.fetchImpl(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'rcx/1.0',
        },
        body,
      },
    )

    const raw = (await response.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number }
    if (!response.ok || !raw.sid) {
      const code = response.status === 401 || response.status === 403
        ? 'authentication'
        : response.status === 429
          ? 'rate_limited'
          : response.status >= 500
            ? 'transient'
            : 'permanent'
      // Twilio's Message create endpoint does not give RCX a provider-side
      // idempotency key equivalent to Google's messageId. Even a transient network
      // error can be ambiguous, so this adapter fails closed rather than blindly
      // retrying and risking a duplicate SMS.
      throw new ProviderError(
        `Twilio SMS send failed (${response.status}): ${raw.message || 'unknown error'}`,
        { code, retryable: false, statusCode: response.status, raw },
      )
    }

    return { providerMessageId: raw.sid, channel: 'sms', acceptedAt: new Date(), raw }
  }
}
