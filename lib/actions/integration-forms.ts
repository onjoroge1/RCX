'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import {
  configureStripeConnection,
  disconnectFirstClassIntegration,
} from './integrations'

const stripeFormSchema = z.object({
  secretKey: z.string().trim().min(16),
  accountLabel: z.string().trim().min(2).max(120),
  accountId: z.string().trim().optional(),
})

function integrationsUrl(params: Record<string, string>): string {
  const query = new URLSearchParams(params)
  return `/app/integrations?${query.toString()}`
}

export async function configureStripeConnectionForm(formData: FormData): Promise<never> {
  const parsed = stripeFormSchema.safeParse({
    secretKey: formData.get('secretKey'),
    accountLabel: formData.get('accountLabel'),
    accountId: formData.get('accountId') || undefined,
  })
  if (!parsed.success) {
    redirect(integrationsUrl({ connect: 'stripe', error: parsed.error.issues[0]?.message ?? 'Invalid Stripe setup.' }))
  }

  const result = await configureStripeConnection(parsed.data)
  if (!result.ok) redirect(integrationsUrl({ connect: 'stripe', error: result.error }))
  redirect(integrationsUrl({ connect: 'stripe', saved: '1', connection: result.id }))
}

export async function disconnectFirstClassIntegrationForm(formData: FormData): Promise<never> {
  const providerKey = String(formData.get('providerKey') || '')
  if (providerKey !== 'stripe' && providerKey !== 'google-calendar') {
    redirect(integrationsUrl({ error: 'Unsupported integration provider.' }))
  }

  const result = await disconnectFirstClassIntegration(providerKey)
  if (!result.ok) redirect(integrationsUrl({ connect: providerKey, error: result.error }))
  redirect(integrationsUrl({ disconnected: providerKey }))
}
