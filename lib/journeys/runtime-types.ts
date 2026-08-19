import { z } from 'zod'

export const primitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

export const conditionSchema = z.object({
  path: z.string().min(1).max(200),
  operator: z.enum([
    'eq',
    'neq',
    'exists',
    'not_exists',
    'in',
    'not_in',
    'gt',
    'gte',
    'lt',
    'lte',
    'contains',
    'starts_with',
  ]),
  value: z.unknown().optional(),
})

export type JourneyCondition = z.infer<typeof conditionSchema>

export const waitConfigSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('duration'),
    seconds: z.number().int().min(1).max(60 * 60 * 24 * 365),
  }),
  z.object({
    mode: z.literal('event'),
    eventKey: z.string().min(1).max(160),
    match: z.record(z.string(), primitiveSchema).optional(),
    timeoutSeconds: z.number().int().min(1).max(60 * 60 * 24 * 30).optional(),
  }),
])

export const messageRuntimeConfigSchema = z.object({
  brandAgentId: z.string().min(1).max(80).optional(),
  timeoutSeconds: z.number().int().min(1).max(60 * 60 * 24 * 30).optional(),
})

export const publishEventConfigSchema = z.object({
  eventKey: z.string().min(1).max(160),
  resourceType: z.string().min(1).max(80).optional(),
  resourceIdPath: z.string().min(1).max(200).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export const goalRuntimeConfigSchema = z.object({
  kind: z.enum(['booking', 'payment', 'purchase', 'approval', 'resolution', 'qualified_lead', 'custom']).optional(),
  value: z.union([z.string(), z.number()]).optional(),
  valuePath: z.string().min(1).max(200).optional(),
  currency: z.string().length(3).default('USD'),
  attributes: z.record(z.string(), z.unknown()).optional(),
})

export const timeWindowConfigSchema = z.object({
  startHourUtc: z.number().int().min(0).max(23),
  endHourUtc: z.number().int().min(0).max(24),
})

export const retryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(10).default(3),
  baseDelaySeconds: z.number().int().min(1).max(3600).default(30),
  maxDelaySeconds: z.number().int().min(1).max(24 * 3600).default(900),
})

export type WaitConfig = z.infer<typeof waitConfigSchema>
export type RetryPolicy = z.infer<typeof retryPolicySchema>

export type RuntimeEventView = {
  id: string
  key: string
  resourceType: string | null
  resourceId: string | null
  payload: unknown
  occurredAt: string
}

export type NodeExecutionOutcome =
  | { kind: 'success'; output?: Record<string, unknown>; route?: 'default' | 'branch' }
  | {
      kind: 'waiting'
      wait: {
        kind: 'timer' | 'event'
        eventKey?: string
        match?: Record<string, string | number | boolean | null>
        listenAfter: Date
        timeoutAt?: Date | null
      }
      output?: Record<string, unknown>
    }
  | { kind: 'timeout'; output?: Record<string, unknown> }
  | { kind: 'complete'; output?: Record<string, unknown> }
