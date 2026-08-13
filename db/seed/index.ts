/**
 * Phase C seed. Run with `pnpm db:seed`.
 *
 * Order matters — FKs run: platform catalog → workspace core → activity → volume.
 * Assumes `pnpm db:seed:auth` has already created the demo tenant and system roles.
 *
 * Idempotent by construction: every insert is onConflictDoNothing/DoUpdate against
 * stable seedId()s, so re-running converges rather than duplicating. Use
 * `pnpm db:reseed` to wipe workspace data and re-anchor all timestamps to now.
 */
import { eq } from 'drizzle-orm'

import { pool, seedDb } from './client'
import { workspaces } from '@/lib/db/schema'
import { seedPlatform } from './tier1-platform'
import { seedWorkspaceCore, WS } from './tier1-workspace'
import { seedActivity } from './tier1-activity'
import { seedVolume } from './tier2-volume'
import { formatCount, formatCurrency, formatPercent } from '@/lib/format'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed with NODE_ENV=production.')
  }

  const [ws] = await seedDb.select().from(workspaces).where(eq(workspaces.id, WS)).limit(1)
  if (!ws) {
    throw new Error(`Workspace ${WS} does not exist. Run \`pnpm db:seed:auth\` first.`)
  }

  const t0 = Date.now()

  // One transaction: a partially-seeded database is worse than an unseeded one.
  const result = await seedDb.transaction(async (t) => {
    const platform = await seedPlatform(t)
    const core = await seedWorkspaceCore(t)
    const activity = await seedActivity(t)
    const volume = await seedVolume(t)
    return { platform, core, activity, volume }
  })

  const { platform, core, activity, volume } = result
  const v = volume.totals

  console.log(`\nSeeded in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`)
  console.log('Platform (global)')
  console.log(`  integration providers  ${platform.providers}`)
  console.log(`  pricing plans          ${platform.plans}`)
  console.log(`  platform templates     ${platform.templates}`)
  console.log(`  §22 demo flows         ${platform.flows}`)
  console.log('\nWorkspace: Northstar Auto')
  console.log(`  contacts (hero)        ${core.contacts}`)
  console.log(`  segments               ${core.segments}`)
  console.log(`  messages               ${core.messages}`)
  console.log(`  journeys               ${core.journeys}  (hero graph: ${core.nodes} nodes, ${core.edges} edges)`)
  console.log(`  goals                  ${core.goals}`)
  console.log(`  integration conns      ${core.connections}`)
  console.log(`  conversations          ${activity.conversations}  (James Carter thread: ${activity.threadMessages} messages)`)
  console.log(`  api keys               ${activity.apiKeys}`)
  console.log(`  failed webhooks        ${activity.failedWebhooks}`)
  console.log(`  campaigns              ${activity.campaigns}`)
  console.log(`  audit rows             ${activity.auditRows}`)
  console.log(`\nVolume (${volume.days} days, deterministic)`)
  console.log(`  generated contacts     ${formatCount(volume.contacts)}`)
  console.log(`  journey runs           ${formatCount(volume.runs)}`)
  console.log(`  outcome rows           ${formatCount(volume.outcomeRows)}`)

  console.log('\nHeadline numbers now derived from rows, not literals:')
  console.log(`  Messages sent          ${formatCount(v.sent)}          (mock claimed 48,240)`)
  console.log(`  Delivered              ${formatCount(v.delivered)}`)
  console.log(`  Read                   ${formatCount(v.read)}          (mock claimed 37,625)`)
  console.log(`  Replies                ${formatCount(v.replies)}           (mock claimed 8,440)`)
  console.log(`  Completed outcomes     ${formatCount(v.outcomes)}          (mock claimed 12,604)`)
  console.log(`  Attributed revenue     ${formatCurrency(v.value)}       (mock claimed $84,240)`)
  console.log(`  Delivery rate          ${formatPercent(v.deliveryRate)}           (mock claimed 97.2%)`)
  console.log(`  Action rate            ${formatPercent(v.actionRate)}           (mock claimed 26.1%)`)
  console.log(`  RCS share              ${formatPercent(v.rcsShare)}           (mock claimed 78.4%)`)
  console.log('\nPer §41.5: back-fill any marketing copy from these generated figures,')
  console.log('rather than tuning the generator to hit the old strings.\n')
}

main()
  .then(async () => {
    await pool.end()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('\nSeed failed:', error)
    await pool.end().catch(() => {})
    process.exit(1)
  })
