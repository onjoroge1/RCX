import { z } from 'zod'

import { decryptSecret } from '@/lib/crypto/secrets'
import { GoogleRbmProvider } from './google-rbm'
import { SimulatorMessagingProvider } from './simulator'
import { TwilioSmsProvider } from './twilio-sms'
import type { MessagingProvider } from '../runtime-types'

const googleCredentialsSchema = z.object({
  version: z.literal(1),
  provider: z.literal('google_rbm'),
  serviceAccount: z.object({
    client_email: z.string().email(),
    private_key: z.string().min(1),
    token_uri: z.string().url().optional(),
  }),
})

const twilioCredentialsSchema = z.object({
  version: z.literal(1),
  provider: z.literal('twilio_sms'),
  accountSid: z.string().min(1),
  authToken: z.string().min(1),
  messagingServiceSid: z.string().min(1).optional(),
  from: z.string().min(1).optional(),
})

export type ProviderRuntimeConfig = {
  providerKey: string
  credentialsEncrypted?: Buffer | null
  externalAgentId?: string | null
  region?: string | null
}

function parseEncryptedJson(payload: Buffer | null | undefined): unknown {
  if (!payload) throw new Error('Provider credentials are not configured')
  const plaintext = decryptSecret(payload)
  try {
    return JSON.parse(plaintext)
  } catch (error) {
    throw new Error('Provider credentials are not valid JSON', { cause: error })
  }
}

export function createMessagingProvider(config: ProviderRuntimeConfig): MessagingProvider {
  if (config.providerKey === 'simulator') return new SimulatorMessagingProvider()

  if (config.providerKey === 'google_rbm') {
    if (!config.externalAgentId) throw new Error('Google RBM provider binding is missing externalAgentId')
    const credentials = googleCredentialsSchema.parse(parseEncryptedJson(config.credentialsEncrypted))
    return new GoogleRbmProvider({
      agentId: config.externalAgentId,
      region: config.region,
      serviceAccount: credentials.serviceAccount,
    })
  }

  if (config.providerKey === 'twilio_sms') {
    const credentials = twilioCredentialsSchema.parse(parseEncryptedJson(config.credentialsEncrypted))
    return new TwilioSmsProvider({
      accountSid: credentials.accountSid,
      authToken: credentials.authToken,
      messagingServiceSid: credentials.messagingServiceSid,
      from: credentials.from,
    })
  }

  throw new Error(`Unsupported messaging provider: ${config.providerKey}`)
}

export const providerCredentialSchemas = {
  google_rbm: googleCredentialsSchema,
  twilio_sms: twilioCredentialsSchema,
}
