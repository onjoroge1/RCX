import { createHash } from 'node:crypto'

import { z } from 'zod'

import { IntegrationExecutionError } from './runtime-types'

export type IntegrationBodyEncoding = 'json' | 'form'

export type ProviderAdapterContext = {
  providerKey: string
  operation: string
  dispatchId: string
  runId: string
  idempotencyKey: string
}

export type PreparedProviderRequest = {
  body: unknown
  bodyEncoding: IntegrationBodyEncoding
}

export type ProviderStatusReconciliation = {
  response: unknown
  externalId: string
} | null

const stripeMetadataSchema = z
  .record(z.string().min(1).max(40), z.string().max(500))
  .refine((value) => Object.keys(value).length <= 45, 'Stripe metadata supports at most 45 RCX-supplied entries')
  .refine((value) => Object.keys(value).every((key) => !key.startsWith('rcx_')), 'Metadata keys beginning with rcx_ are reserved')

const stripePaymentLinkSchema = z
  .object({
    priceId: z.string().regex(/^price_[A-Za-z0-9]+$/, 'Stripe priceId must be a Stripe Price ID'),
    quantity: z.number().int().min(1).max(999_999).default(1),
    submitType: z.enum(['auto', 'book', 'donate', 'pay', 'subscribe']).default('pay'),
    allowPromotionCodes: z.boolean().optional(),
    afterCompletionUrl: z
      .string()
      .url()
      .max(2_048)
      .refine((value) => new URL(value).protocol === 'https:', 'afterCompletionUrl must use HTTPS')
      .optional(),
    metadata: stripeMetadataSchema.optional(),
  })
  .strict()

const calendarDateTimeSchema = z
  .object({
    dateTime: z.string().datetime({ offset: true }),
    timeZone: z.string().min(1).max(100).optional(),
  })
  .strict()

const googleCalendarBookingSchema = z
  .object({
    summary: z.string().min(1).max(1_024),
    description: z.string().max(8_192).optional(),
    location: z.string().max(1_024).optional(),
    start: calendarDateTimeSchema,
    end: calendarDateTimeSchema,
    attendees: z
      .array(z.object({ email: z.string().email(), displayName: z.string().max(256).optional() }).strict())
      .max(200)
      .optional(),
    visibility: z.enum(['default', 'public', 'private', 'confidential']).optional(),
    guestsCanInviteOthers: z.boolean().optional(),
    guestsCanModify: z.boolean().optional(),
    guestsCanSeeOtherGuests: z.boolean().optional(),
  })
  .strict()

function providerError(message: string, cause?: unknown): IntegrationExecutionError {
  return new IntegrationExecutionError(message, {
    code: 'invalid_provider_request',
    retryable: false,
    cause,
  })
}

function stripePaymentLink(input: unknown, context: ProviderAdapterContext): PreparedProviderRequest {
  const parsed = stripePaymentLinkSchema.safeParse(input)
  if (!parsed.success) throw providerError('Stripe payment-link input is invalid', parsed.error)

  const form = new URLSearchParams()
  form.set('line_items[0][price]', parsed.data.priceId)
  form.set('line_items[0][quantity]', String(parsed.data.quantity))
  form.set('submit_type', parsed.data.submitType)
  if (parsed.data.allowPromotionCodes !== undefined) {
    form.set('allow_promotion_codes', String(parsed.data.allowPromotionCodes))
  }
  if (parsed.data.afterCompletionUrl) {
    form.set('after_completion[type]', 'redirect')
    form.set('after_completion[redirect][url]', parsed.data.afterCompletionUrl)
  }

  for (const key of Object.keys(parsed.data.metadata ?? {}).sort()) {
    form.set(`metadata[${key}]`, parsed.data.metadata![key]!)
  }
  form.set('metadata[rcx_dispatch_id]', context.dispatchId)
  form.set('metadata[rcx_run_id]', context.runId)
  form.set('metadata[rcx_idempotency_key]', context.idempotencyKey)

  return { body: form.toString(), bodyEncoding: 'form' }
}

function googleEventId(idempotencyKey: string): string {
  // Google Calendar event IDs allow base32hex characters a-v and 0-9. A SHA-256
  // hex digest is a strict subset of that alphabet and is stable across retries.
  const digest = createHash('sha256').update(idempotencyKey, 'utf8').digest('hex')
  return `rc${digest}`
}

function googleCalendarBooking(input: unknown, context: ProviderAdapterContext): PreparedProviderRequest {
  const parsed = googleCalendarBookingSchema.safeParse(input)
  if (!parsed.success) throw providerError('Google Calendar booking input is invalid', parsed.error)

  const startMs = Date.parse(parsed.data.start.dateTime)
  const endMs = Date.parse(parsed.data.end.dateTime)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw providerError('Google Calendar booking end time must be after its start time')
  }

  return {
    body: {
      id: googleEventId(context.idempotencyKey),
      summary: parsed.data.summary,
      ...(parsed.data.description ? { description: parsed.data.description } : {}),
      ...(parsed.data.location ? { location: parsed.data.location } : {}),
      start: parsed.data.start,
      end: parsed.data.end,
      ...(parsed.data.attendees ? { attendees: parsed.data.attendees } : {}),
      ...(parsed.data.visibility ? { visibility: parsed.data.visibility } : {}),
      ...(parsed.data.guestsCanInviteOthers !== undefined
        ? { guestsCanInviteOthers: parsed.data.guestsCanInviteOthers }
        : {}),
      ...(parsed.data.guestsCanModify !== undefined ? { guestsCanModify: parsed.data.guestsCanModify } : {}),
      ...(parsed.data.guestsCanSeeOtherGuests !== undefined
        ? { guestsCanSeeOtherGuests: parsed.data.guestsCanSeeOtherGuests }
        : {}),
      extendedProperties: {
        private: {
          rcxDispatchId: context.dispatchId,
          rcxRunId: context.runId,
          rcxIdempotencyKey: context.idempotencyKey,
        },
      },
    },
    bodyEncoding: 'json',
  }
}

/**
 * Google documents 409 "identifier already exists" for a caller-supplied event ID.
 * RCX deliberately derives that ID from one logical journey effect, so a 409 on
 * this single-event create means a previous attempt already committed the same
 * logical booking after RCX lost its response. Reconcile it as success instead of
 * creating a second event or failing the journey.
 */
export function reconcileProviderStatus(
  providerKey: string,
  statusCode: number,
  preparedBody: unknown,
): ProviderStatusReconciliation {
  if (providerKey !== 'google-calendar' || statusCode !== 409) return null
  if (!preparedBody || typeof preparedBody !== 'object' || Array.isArray(preparedBody)) return null
  const id = (preparedBody as Record<string, unknown>).id
  if (typeof id !== 'string' || !/^[0-9a-v]{5,1024}$/.test(id)) return null
  return {
    externalId: id,
    response: {
      id,
      duplicate: true,
      providerStatusCode: 409,
    },
  }
}

/**
 * Freeze provider-specific request semantics before the dispatch enters the outbox.
 * First-class providers fail closed on unknown operations. Generic providers keep
 * the Phase 4A JSON pass-through behavior.
 */
export function prepareProviderRequest(
  providerKey: string,
  operation: string,
  input: unknown,
  context: Omit<ProviderAdapterContext, 'providerKey' | 'operation'>,
): PreparedProviderRequest {
  const fullContext: ProviderAdapterContext = { providerKey, operation, ...context }

  if (providerKey === 'stripe') {
    if (operation !== 'generate_payment_link') {
      throw new IntegrationExecutionError(`Stripe operation ${operation} is not implemented by RCX`, {
        code: 'provider_operation_unsupported',
        retryable: false,
      })
    }
    return stripePaymentLink(input, fullContext)
  }

  if (providerKey === 'google-calendar') {
    if (operation !== 'create_booking') {
      throw new IntegrationExecutionError(`Google Calendar operation ${operation} is not implemented by RCX`, {
        code: 'provider_operation_unsupported',
        retryable: false,
      })
    }
    return googleCalendarBooking(input, fullContext)
  }

  return { body: input, bodyEncoding: 'json' }
}
