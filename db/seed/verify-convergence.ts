/**
 * Convergence check for the seed.
 *
 * A row-count test proves the seed is NON-DUPLICATING. It cannot prove the seed is
 * CONVERGENT — that re-running makes the database match the seed definition —
 * because a skipped update does not change any count. That gap is what let
 * `createdFromTemplateId` silently never land.
 *
 * This corrupts values the seed defines, then tells you to re-seed and re-run with
 * --check. If a value is still corrupted, that write path is not convergent.
 *
 *   pnpm db:verify-convergence          # corrupt
 *   pnpm db:seed
 *   pnpm db:verify-convergence --check  # assert restored
 */
import { pool } from './client'

const PROBES = [
  { table: 'messages', id: 'msg_service_reminder_rich_card', column: 'name', expected: 'Service reminder — rich card' },
  { table: 'brand_agents', id: 'ba_northstar_auto_care', column: 'display_name', expected: 'Northstar Auto Care' },
  { table: 'contacts', id: 'ct_james_carter', column: 'first_name', expected: 'James' },
  { table: 'templates', id: 'tpl_appointment-reminder', column: 'name', expected: 'Appointment reminder' },
  { table: 'demo_flows', id: 'dflow_first-time-trust', column: 'name', expected: 'First-time trust' },
]

const SENTINEL = '__NOT_CONVERGENT__'

async function main() {
  const check = process.argv.includes('--check')
  let pass = 0
  let fail = 0
  let skipped = 0

  for (const p of PROBES) {
    const { rows } = await pool.query(`select ${p.column} as v from ${p.table} where id = $1`, [p.id])
    if (rows.length === 0) {
      console.log(`  SKIP  ${p.table} (${p.id} not found)`)
      skipped++
      continue
    }

    if (check) {
      const ok = rows[0].v === p.expected
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${p.table}.${p.column} = ${JSON.stringify(rows[0].v)}`)
      ok ? pass++ : fail++
    } else {
      await pool.query(`update ${p.table} set ${p.column} = $1 where id = $2`, [SENTINEL, p.id])
      console.log(`  corrupted ${p.table}.${p.column}`)
    }
  }

  if (check) {
    console.log(`\nCONVERGENCE: ${pass} restored, ${fail} still corrupted${skipped ? `, ${skipped} skipped` : ''}`)
    if (fail > 0) {
      console.error('\nA corrupted value survived re-seeding. That write path uses')
      console.error('onConflictDoNothing where it needs excludedSet(). See db/seed/lib/upsert.ts.')
      process.exit(1)
    }
  } else {
    console.log('\nNow run: pnpm db:seed && pnpm db:verify-convergence --check')
  }

  await pool.end()
}

main().catch(async (e) => {
  console.error(e)
  await pool.end()
  process.exit(1)
})
