import { getTableColumns, getTableName, sql, type Table } from 'drizzle-orm'

import { pool } from '../client'

/**
 * Convergent seed writes.
 *
 * THE PROBLEM THIS SOLVES
 *
 * `onConflictDoNothing` gives a NON-DUPLICATING seed, not a CONVERGENT one:
 *
 *   run 1   insert message {name}                      -> row created
 *   edit    seed now says {name, createdFromTemplateId}
 *   run 2   insert ... on conflict do nothing          -> row exists, skipped
 *   result  createdFromTemplateId is still NULL
 *
 * The seed file and the database now disagree, and — the dangerous part — ROW
 * COUNTS DO NOT CHANGE, so a counts-based idempotency check cannot detect it.
 * That is how `createdFromTemplateId` silently failed to land: every template
 * rendered a dash, which reads as "no data yet" rather than as a bug.
 *
 * `excludedSet` builds an UPDATE SET from Postgres's EXCLUDED pseudo-row — the row
 * that *would* have been inserted — so re-running always makes the database match
 * the seed definition, and a field added later converges with no change here.
 *
 * Deliberately NOT used where the seed already deletes before inserting
 * (tier2-volume regenerates every rollup; auth clears role_permissions), nor on
 * pure link tables whose primary key is their entire content.
 */

/**
 * Column names must be the REAL ones, not the drizzle property names.
 *
 * This schema declares columns as `text()` with no explicit name and relies on
 * `casing: 'snake_case'` in the client config, so `column.name` returns the
 * camelCase property — `excluded."workspaceId"` does not exist and Postgres
 * raises errorMissingColumn. Worse, drizzle-kit and the runtime have disagreed
 * about casing before (`phone_e_164` vs `phone_e164` in migration 0001), so a
 * hand-rolled converter cannot be trusted on its own.
 *
 * So: convert, then VERIFY against information_schema and throw on any mismatch.
 * A loud failure at seed time beats a column silently never converging.
 */
function toSnake(property: string): string {
  return property.replace(/(?<!^)(?=[A-Z])/g, '_').toLowerCase()
}

let actualColumns: Map<string, Set<string>> | null = null

/** Call once before seeding. Caches real column names for verification. */
export async function loadColumnNames() {
  const { rows } = await pool.query<{ table_name: string; column_name: string }>(
    `select table_name, column_name from information_schema.columns where table_schema = 'public'`,
  )
  const map = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!map.has(r.table_name)) map.set(r.table_name, new Set())
    map.get(r.table_name)!.add(r.column_name)
  }
  actualColumns = map
}

export function excludedSet(table: Table, conflictProperties: string[]) {
  const tableName = getTableName(table)
  const known = actualColumns?.get(tableName)
  const columns = getTableColumns(table)
  const set: Record<string, unknown> = {}
  const missing: string[] = []

  for (const [property, column] of Object.entries(columns)) {
    if (conflictProperties.includes(property)) continue
    // Generated columns cannot be assigned — contacts.displayName is one.
    if ((column as { generated?: unknown }).generated) continue

    const columnName = toSnake(property)
    if (known && !known.has(columnName)) {
      missing.push(`${tableName}.${property} -> ${columnName}`)
      continue
    }
    set[property] = sql.raw(`excluded."${columnName}"`)
  }

  if (missing.length > 0) {
    throw new Error(
      `excludedSet(): generated column names that do not exist in the database:\n  ${missing.join('\n  ')}\n` +
        `Fix toSnake() or give the column an explicit name in the schema.`,
    )
  }

  return set
}
