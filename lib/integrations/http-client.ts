import { lookup as dnsLookup } from 'node:dns/promises'
import { request as httpsRequest } from 'node:https'

import { assertPublicResolvedAddresses } from './policy'
import { IntegrationExecutionError, type IntegrationExecutionResult, type IntegrationHttpMethod } from './runtime-types'

export type ControlledHttpRequest = {
  url: URL
  method: IntegrationHttpMethod
  body: unknown
  headers: Record<string, string>
  timeoutMs: number
  maxResponseBytes: number
  externalIdPath?: string | null
}

function responsePath(value: unknown, path: string | null | undefined): unknown {
  if (!path) return undefined
  let current: unknown = value
  for (const part of path.split('.').filter(Boolean)) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function classifyStatus(statusCode: number): { retryable: boolean; code: string } {
  if (statusCode === 408) return { retryable: true, code: 'http_408' }
  if (statusCode === 425) return { retryable: true, code: 'http_425' }
  if (statusCode === 429) return { retryable: true, code: 'http_429' }
  if (statusCode >= 500) return { retryable: true, code: 'http_5xx' }
  if (statusCode >= 300 && statusCode < 400) return { retryable: false, code: 'redirect_blocked' }
  return { retryable: false, code: 'http_4xx' }
}

function parseResponseBody(buffer: Buffer, contentType: string | undefined): unknown {
  const text = buffer.toString('utf8')
  if (!text) return null
  const isJson = contentType?.toLowerCase().includes('application/json') || contentType?.toLowerCase().includes('+json')
  if (!isJson) return text
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new IntegrationExecutionError('Integration returned invalid JSON', {
      code: 'invalid_json_response',
      retryable: false,
      cause: error,
    })
  }
}

/**
 * Executes one controlled HTTPS request. DNS is resolved once, every resolved
 * address is checked against the SSRF policy, and the request is pinned to one
 * validated address via a custom lookup callback. Redirects are never followed.
 */
export async function executeControlledHttps(input: ControlledHttpRequest): Promise<IntegrationExecutionResult> {
  let resolved: Awaited<ReturnType<typeof dnsLookup>>
  try {
    resolved = await dnsLookup(input.url.hostname, { all: true, verbatim: true })
  } catch (error) {
    throw new IntegrationExecutionError('Integration DNS lookup failed', {
      code: 'dns_failure',
      retryable: true,
      cause: error,
    })
  }

  const addresses = Array.isArray(resolved) ? resolved : [resolved]
  assertPublicResolvedAddresses(addresses.map((row) => row.address))
  const pinned = addresses[0]!

  let bodyBuffer: Buffer | null = null
  if (input.method !== 'GET') {
    let bodyText: string
    try {
      bodyText = JSON.stringify(input.body ?? null)
    } catch (error) {
      throw new IntegrationExecutionError('Integration request body is not JSON serializable', {
        code: 'invalid_request_body',
        retryable: false,
        cause: error,
      })
    }
    bodyBuffer = Buffer.from(bodyText, 'utf8')
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'RCX-Integration-Worker/1.0',
    ...input.headers,
  }
  if (bodyBuffer) {
    headers['Content-Type'] = 'application/json'
    headers['Content-Length'] = String(bodyBuffer.byteLength)
  }

  const startedAt = Date.now()
  return new Promise<IntegrationExecutionResult>((resolve, reject) => {
    let settled = false
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      if (error instanceof IntegrationExecutionError) reject(error)
      else {
        reject(
          new IntegrationExecutionError(error instanceof Error ? error.message : 'Integration network request failed', {
            code: 'network_failure',
            retryable: true,
            cause: error,
          }),
        )
      }
    }

    const req = httpsRequest(
      input.url,
      {
        method: input.method,
        headers,
        servername: input.url.hostname,
        lookup: (_hostname, _options, callback) => {
          callback(null, pinned.address, pinned.family)
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        let bytes = 0

        res.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          bytes += buffer.byteLength
          if (bytes > input.maxResponseBytes) {
            req.destroy(
              new IntegrationExecutionError('Integration response exceeded the configured size limit', {
                code: 'response_too_large',
                retryable: false,
              }),
            )
            return
          }
          chunks.push(buffer)
        })

        res.on('end', () => {
          if (settled) return
          const statusCode = res.statusCode ?? 0
          const response = parseResponseBody(Buffer.concat(chunks), res.headers['content-type'])
          const durationMs = Date.now() - startedAt

          if (statusCode < 200 || statusCode >= 300) {
            const classification = classifyStatus(statusCode)
            fail(
              new IntegrationExecutionError(`Integration returned HTTP ${statusCode}`, {
                code: classification.code,
                retryable: classification.retryable,
                statusCode,
              }),
            )
            return
          }

          const rawExternalId = responsePath(response, input.externalIdPath)
          const externalId =
            typeof rawExternalId === 'string' || typeof rawExternalId === 'number'
              ? String(rawExternalId)
              : null
          settled = true
          resolve({ statusCode, response, externalId, durationMs })
        })
      },
    )

    req.setTimeout(input.timeoutMs, () => {
      req.destroy(
        new IntegrationExecutionError('Integration request timed out', {
          code: 'timeout',
          retryable: true,
        }),
      )
    })
    req.on('error', fail)
    if (bodyBuffer) req.write(bodyBuffer)
    req.end()
  })
}
