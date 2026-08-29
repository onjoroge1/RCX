import { getPath } from '@/lib/journeys/conditions'
import { IntegrationExecutionError } from './runtime-types'

const MAX_DEPTH = 12
const MAX_NODES = 5_000

type ResolveState = { nodes: number }

function resolveValue(value: unknown, subject: unknown, depth: number, state: ResolveState): unknown {
  state.nodes += 1
  if (state.nodes > MAX_NODES) {
    throw new IntegrationExecutionError('Integration input is too large', {
      code: 'input_too_large',
      retryable: false,
    })
  }
  if (depth > MAX_DEPTH) {
    throw new IntegrationExecutionError('Integration input nesting is too deep', {
      code: 'input_too_deep',
      retryable: false,
    })
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((child) => resolveValue(child, subject, depth + 1, state))
  }

  if (!value || typeof value !== 'object') {
    throw new IntegrationExecutionError('Integration input must be JSON-compatible', {
      code: 'invalid_input',
      retryable: false,
    })
  }

  const row = value as Record<string, unknown>
  const keys = Object.keys(row)
  if (keys.length === 1 && keys[0] === '$path') {
    if (typeof row.$path !== 'string' || !row.$path.trim()) {
      throw new IntegrationExecutionError('Integration $path must be a non-empty string', {
        code: 'invalid_mapping',
        retryable: false,
      })
    }
    const resolved = getPath(subject, row.$path)
    if (resolved === undefined) {
      throw new IntegrationExecutionError(`Integration mapping path not found: ${row.$path}`, {
        code: 'mapping_missing',
        retryable: false,
      })
    }
    return resolveValue(resolved, subject, depth + 1, state)
  }

  const output: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(row)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      throw new IntegrationExecutionError('Unsafe integration input key', {
        code: 'unsafe_input_key',
        retryable: false,
      })
    }
    output[key] = resolveValue(child, subject, depth + 1, state)
  }
  return output
}

/**
 * Resolve a JSON input template using only literal values and {$path: "..."} lookups.
 * There is deliberately no JavaScript, templating language, function call, or expression evaluation.
 */
export function resolveIntegrationInput(template: unknown, subject: unknown): unknown {
  if (template === undefined) return null
  return resolveValue(template, subject, 0, { nodes: 0 })
}
