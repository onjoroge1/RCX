import { isIP } from 'node:net'

import { IntegrationExecutionError, integrationHttpMethodSchema, type IntegrationHttpMethod } from './runtime-types'

const FORBIDDEN_NODE_HEADERS = new Set([
  'authorization',
  'cookie',
  'host',
  'proxy-authorization',
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
  'connection',
  'upgrade',
  'transfer-encoding',
  'content-length',
  'content-type',
  'te',
  'trailer',
  'expect',
  'idempotency-key',
  'x-rcx-dispatch-id',
])

export function assertSafeHeaderName(name: string): void {
  const normalized = name.trim().toLowerCase()
  if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(normalized) || FORBIDDEN_NODE_HEADERS.has(normalized)) {
    throw new IntegrationExecutionError(`Unsafe integration header: ${name}`, {
      code: 'unsafe_header',
      retryable: false,
    })
  }
}

function ipv4Number(address: string): number | null {
  if (isIP(address) !== 4) return null
  const parts = address.split('.').map(Number)
  return (((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!) >>> 0
}

function inV4Cidr(value: number, base: number, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (value & mask) === (base & mask)
}

function ipv6Bytes(address: string): Uint8Array | null {
  if (isIP(address) !== 6) return null
  let input = address.toLowerCase()
  const zoneIndex = input.indexOf('%')
  if (zoneIndex >= 0) input = input.slice(0, zoneIndex)

  const mappedMatch = input.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/)
  if (mappedMatch) {
    const v4 = ipv4Number(mappedMatch[2]!)
    if (v4 == null) return null
    const hi = ((v4 >>> 16) & 0xffff).toString(16)
    const lo = (v4 & 0xffff).toString(16)
    input = `${mappedMatch[1]}${hi}:${lo}`
  }

  const halves = input.split('::')
  if (halves.length > 2) return null
  const left = halves[0] ? halves[0]!.split(':').filter(Boolean) : []
  const right = halves.length === 2 && halves[1] ? halves[1]!.split(':').filter(Boolean) : []
  const missing = 8 - left.length - right.length
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null
  const groups = [...left, ...Array<string>(missing).fill('0'), ...right]
  if (groups.length !== 8) return null

  const bytes = new Uint8Array(16)
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index]!
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null
    const value = parseInt(group, 16)
    bytes[index * 2] = (value >>> 8) & 0xff
    bytes[index * 2 + 1] = value & 0xff
  }
  return bytes
}

function inV6Cidr(value: Uint8Array, base: Uint8Array, prefix: number): boolean {
  const wholeBytes = Math.floor(prefix / 8)
  const remainingBits = prefix % 8
  for (let i = 0; i < wholeBytes; i += 1) {
    if (value[i] !== base[i]) return false
  }
  if (remainingBits === 0) return true
  const mask = (0xff << (8 - remainingBits)) & 0xff
  return ((value[wholeBytes] ?? 0) & mask) === ((base[wholeBytes] ?? 0) & mask)
}

function v6(address: string): Uint8Array {
  const bytes = ipv6Bytes(address)
  if (!bytes) throw new Error(`Invalid static IPv6 CIDR base: ${address}`)
  return bytes
}

/**
 * Rejects private, loopback, link-local, multicast, documentation, benchmark,
 * unspecified and other non-routable destinations. Only globally routable IPs pass.
 */
export function isPublicIp(address: string): boolean {
  const v4 = ipv4Number(address)
  if (v4 != null) {
    const blocked: Array<[number, number]> = [
      [0x00000000, 8],
      [0x0a000000, 8],
      [0x64400000, 10],
      [0x7f000000, 8],
      [0xa9fe0000, 16],
      [0xac100000, 12],
      [0xc0000000, 24],
      [0xc0000200, 24],
      [0xc0586300, 24],
      [0xc0a80000, 16],
      [0xc6120000, 15],
      [0xc6336400, 24],
      [0xcb007100, 24],
      [0xe0000000, 4],
      [0xf0000000, 4],
    ]
    return !blocked.some(([base, prefix]) => inV4Cidr(v4, base, prefix))
  }

  const value = ipv6Bytes(address)
  if (!value) return false
  const blocked6: Array<[Uint8Array, number]> = [
    [v6('::'), 128],
    [v6('::1'), 128],
    [v6('fc00::'), 7],
    [v6('fe80::'), 10],
    [v6('ff00::'), 8],
    [v6('2001:db8::'), 32],
  ]
  if (blocked6.some(([base, prefix]) => inV6Cidr(value, base, prefix))) return false

  // IPv4-mapped IPv6 ::ffff:0:0/96 inherits the IPv4 policy.
  const mappedBase = v6('::ffff:0:0')
  if (inV6Cidr(value, mappedBase, 96)) {
    const dotted = `${value[12]}.${value[13]}.${value[14]}.${value[15]}`
    return isPublicIp(dotted)
  }
  return true
}

export function assertPublicResolvedAddresses(addresses: string[]): void {
  if (addresses.length === 0) {
    throw new IntegrationExecutionError('Integration host did not resolve to an address', {
      code: 'dns_no_address',
      retryable: true,
    })
  }
  const unsafe = addresses.find((address) => !isPublicIp(address))
  if (unsafe) {
    throw new IntegrationExecutionError(`Integration destination resolved to a blocked address: ${unsafe}`, {
      code: 'ssrf_blocked',
      retryable: false,
    })
  }
}

function normalizePrefix(prefix: string): string {
  if (!prefix.startsWith('/') || prefix.startsWith('//') || prefix.includes('\\')) {
    throw new IntegrationExecutionError(`Invalid allowed path prefix: ${prefix}`, {
      code: 'invalid_connection_policy',
      retryable: false,
    })
  }
  return prefix.length > 1 ? prefix.replace(/\/+$/, '') : '/'
}

function pathMatchesPrefix(pathname: string, rawPrefix: string): boolean {
  const prefix = normalizePrefix(rawPrefix)
  if (prefix === '/') return true
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function assertSafeRelativePath(rawPath: string): void {
  if (!rawPath.startsWith('/') || rawPath.startsWith('//') || rawPath.includes('\\')) {
    throw new IntegrationExecutionError('Integration operation path must be an absolute path on the configured origin', {
      code: 'unsafe_path',
      retryable: false,
    })
  }
  if (/%2f|%5c/i.test(rawPath)) {
    throw new IntegrationExecutionError('Encoded slash/backslash is not allowed in integration paths', {
      code: 'unsafe_path',
      retryable: false,
    })
  }
  const pathOnly = rawPath.split(/[?#]/, 1)[0]!
  for (const part of pathOnly.split('/')) {
    let decoded: string
    try {
      decoded = decodeURIComponent(part)
    } catch {
      throw new IntegrationExecutionError('Integration path contains invalid percent encoding', {
        code: 'unsafe_path',
        retryable: false,
      })
    }
    if (decoded === '.' || decoded === '..') {
      throw new IntegrationExecutionError('Path traversal is not allowed in integration operations', {
        code: 'unsafe_path',
        retryable: false,
      })
    }
  }
}

export type ControlledEndpointPolicy = {
  baseUrl: string
  allowedMethods: string[] | null | undefined
  allowedPathPrefixes: string[] | null | undefined
}

export function controlledIntegrationUrl(
  policy: ControlledEndpointPolicy,
  methodInput: string,
  operationPath: string,
): { url: URL; method: IntegrationHttpMethod } {
  const method = integrationHttpMethodSchema.parse(methodInput.toUpperCase())
  const allowedMethods = (policy.allowedMethods?.length ? policy.allowedMethods : ['POST']).map((value) => value.toUpperCase())
  if (!allowedMethods.includes(method)) {
    throw new IntegrationExecutionError(`HTTP method ${method} is not allowed by this connection`, {
      code: 'method_not_allowed',
      retryable: false,
    })
  }

  let base: URL
  try {
    base = new URL(policy.baseUrl)
  } catch {
    throw new IntegrationExecutionError('Connection base URL is invalid', {
      code: 'invalid_base_url',
      retryable: false,
    })
  }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw new IntegrationExecutionError('Connection base URL must be an HTTPS origin with no credentials, path, query, or fragment', {
      code: 'invalid_base_url',
      retryable: false,
    })
  }

  assertSafeRelativePath(operationPath)
  const url = new URL(operationPath, base)
  if (url.protocol !== 'https:' || url.origin !== base.origin || url.username || url.password) {
    throw new IntegrationExecutionError('Integration operation escaped the configured HTTPS origin', {
      code: 'ssrf_blocked',
      retryable: false,
    })
  }

  const prefixes = policy.allowedPathPrefixes?.length ? policy.allowedPathPrefixes : ['/']
  if (!prefixes.some((prefix) => pathMatchesPrefix(url.pathname, prefix))) {
    throw new IntegrationExecutionError(`Path ${url.pathname} is not allowed by this connection`, {
      code: 'path_not_allowed',
      retryable: false,
    })
  }

  return { url, method }
}
