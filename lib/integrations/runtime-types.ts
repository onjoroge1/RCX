import { z } from 'zod'

export const integrationHttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
export type IntegrationHttpMethod = z.infer<typeof integrationHttpMethodSchema>

export const operationBindingSchema = z.object({
  method: integrationHttpMethodSchema,
  path: z.string().min(1).max(800),
  externalIdPath: z.string().min(1).max(240).optional(),
  maxAttempts: z.number().int().min(1).max(8).default(4),
})

export const operationBindingsSchema = z.record(z.string().min(1).max(120), operationBindingSchema)
export type OperationBinding = z.infer<typeof operationBindingSchema>

export const integrationNodeConfigSchema = z.object({
  /** Legacy/direct binding. Provider key is preferred so one journey version can promote Test -> Live. */
  connectionId: z.string().min(1).max(80).optional(),
  providerKey: z.string().min(1).max(120).optional(),
  /** Required for generic http_request. Semantic nodes use their node type as the operation key. */
  operation: z.string().min(1).max(120).optional(),
  input: z.unknown().optional(),
})

export type IntegrationNodeConfig = z.infer<typeof integrationNodeConfigSchema>

export const encryptedConnectionCredentialSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('bearer'), token: z.string().min(1).max(16_384) }),
  z.object({
    type: z.literal('api_key'),
    headerName: z.string().min(1).max(100),
    value: z.string().min(1).max(16_384),
  }),
  z.object({
    type: z.literal('basic'),
    username: z.string().max(4_096),
    password: z.string().max(16_384),
  }),
])

export type EncryptedConnectionCredential = z.infer<typeof encryptedConnectionCredentialSchema>

export type IntegrationRequestSnapshot = {
  operation: string
  method: IntegrationHttpMethod
  path: string
  input: unknown
  externalIdPath?: string
}

export type IntegrationExecutionResult = {
  statusCode: number
  response: unknown
  externalId: string | null
  durationMs: number
}

export class IntegrationExecutionError extends Error {
  readonly retryable: boolean
  readonly code: string
  readonly statusCode?: number

  constructor(
    message: string,
    options: { retryable?: boolean; code?: string; statusCode?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'IntegrationExecutionError'
    this.retryable = options.retryable ?? false
    this.code = options.code ?? 'integration_error'
    this.statusCode = options.statusCode
  }
}
