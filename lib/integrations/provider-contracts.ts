import { z } from 'zod'

import type { IntegrationHttpMethod } from './runtime-types'

export type FirstClassProviderConnectionPolicy = {
  providerKey: 'stripe' | 'google-calendar'
  authType: 'api_key' | 'oauth2'
  baseUrl: string
  allowedMethods: IntegrationHttpMethod[]
  allowedPathPrefixes: string[]
  operationBindings: Record<
    string,
    {
      method: IntegrationHttpMethod
      path: string
      externalIdPath?: string
      maxAttempts: number
    }
  >
  scopes: string[]
}

export function stripeConnectionPolicy(): FirstClassProviderConnectionPolicy {
  return {
    providerKey: 'stripe',
    authType: 'api_key',
    baseUrl: 'https://api.stripe.com',
    allowedMethods: ['POST'],
    allowedPathPrefixes: ['/v1/payment_links'],
    operationBindings: {
      generate_payment_link: {
        method: 'POST',
        path: '/v1/payment_links',
        externalIdPath: 'id',
        maxAttempts: 4,
      },
    },
    scopes: [],
  }
}

const googleCalendarOptionsSchema = z.object({
  calendarId: z.string().min(1).max(512).default('primary'),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all'),
})

export function googleCalendarConnectionPolicy(
  options: { calendarId?: string; sendUpdates?: 'all' | 'externalOnly' | 'none' } = {},
): FirstClassProviderConnectionPolicy {
  const parsed = googleCalendarOptionsSchema.parse(options)
  const calendarId = encodeURIComponent(parsed.calendarId)
  const eventPath = `/calendar/v3/calendars/${calendarId}/events`
  return {
    providerKey: 'google-calendar',
    authType: 'oauth2',
    baseUrl: 'https://www.googleapis.com',
    allowedMethods: ['POST'],
    allowedPathPrefixes: [eventPath],
    operationBindings: {
      create_booking: {
        method: 'POST',
        path: `${eventPath}?sendUpdates=${parsed.sendUpdates}`,
        externalIdPath: 'id',
        maxAttempts: 4,
      },
    },
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  }
}

export function firstClassProviderConnectionPolicy(
  providerKey: string,
): FirstClassProviderConnectionPolicy | null {
  if (providerKey === 'stripe') return stripeConnectionPolicy()
  if (providerKey === 'google-calendar') return googleCalendarConnectionPolicy()
  return null
}
