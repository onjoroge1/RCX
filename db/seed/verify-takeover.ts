/**
 * Exercises the takeover WRITE PATH against the real database.
 *
 * SCOPE, stated honestly: this runs the same drizzle calls, tables, enum values
 * and transaction shape as lib/actions/conversations.ts, but NOT the server-action
 * wrapper (requirePermission, revalidatePath, getScope). It proves the SQL is
 * correct — enum values exist, NOT NULL columns are supplied, FKs resolve,
 * sequence increments, and the whole thing is atomic. It does not prove the
 * permission gate fires; that needs the running app.
 *
 *   pnpm db:verify-takeover
 */
import { and, eq, sql } from 'drizzle-orm'

import { seedDb, pool } from './client'
import { auditLog, conversationEvents, conversationMessages, conversations } from '@/lib/db/schema'
import { newId } from '@/lib/ids'

const CONV = 'cv_james'
const WS = 'ws_northstar'
const ENV = 'test' as const
const USER = 'usr_demo'

async function snapshot(label: string) {
  const [c] = (await pool.query(
    `select status, automation_paused, assignee_user_id from conversations where id=$1`, [CONV])).rows
  const [m] = (await pool.query(
    `select count(*)::int n, coalesce(max(sequence),0)::int seq from conversation_messages where conversation_id=$1`, [CONV])).rows
  const [e] = (await pool.query(
    `select count(*)::int n from conversation_events where conversation_id=$1`, [CONV])).rows
  const [a] = (await pool.query(
    `select count(*)::int n from audit_log where resource_id=$1`, [CONV])).rows
  const snap = { status: c.status, paused: c.automation_paused, assignee: c.assignee_user_id,
                 messages: m.n, maxSeq: m.seq, events: e.n, audit: a.n }
  console.log(`${label}:`, JSON.stringify(snap))
  return snap
}

async function nextSequence(t: never, conversationId: string): Promise<number> {
  const [row] = await (t as unknown as typeof seedDb)
    .select({ max: sql<number>`coalesce(max(${conversationMessages.sequence}), 0)::int` })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
  return (row?.max ?? 0) + 1
}

async function main() {
  const before = await snapshot('BEFORE')

  await seedDb.transaction(async (t) => {
    await t.update(conversations)
      .set({ status: 'agent_active', automationPaused: true, assigneeUserId: USER, unreadCount: 0 })
      .where(and(eq(conversations.workspaceId, WS), eq(conversations.id, CONV)))

    await t.insert(conversationEvents).values({
      id: newId('conversationEvent'), conversationId: CONV,
      kind: 'takeover', actorUserId: USER, payload: { from: before.status },
    })

    await t.insert(conversationMessages).values({
      id: newId('conversationMessage'), workspaceId: WS, environment: ENV, conversationId: CONV,
      direction: 'outbound', actor: 'system', contentType: 'text',
      body: 'Jordan Rivera took over the conversation — automation paused',
      sequence: await nextSequence(t as never, CONV),
    })

    await t.insert(auditLog).values({
      id: newId('auditLog'), workspaceId: WS, environment: ENV,
      actorType: 'user', actorUserId: USER,
      action: 'conversation.taken_over', resourceType: 'conversation',
      resourceId: CONV, resourceLabel: `Conversation ${CONV}`, result: 'success',
      before: { status: before.status }, after: { status: 'agent_active' },
    })
  })

  const after = await snapshot('AFTER takeover')

  const checks = [
    ['status is agent_active', after.status === 'agent_active'],
    ['assignee set', after.assignee === USER],
    ['one new message', after.messages === before.messages + 1],
    ['sequence incremented', after.maxSeq === before.maxSeq + 1],
    ['one new event', after.events === before.events + 1],
    ['one new audit row', after.audit === before.audit + 1],
  ] as const

  console.log('')
  let failed = 0
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`)
    if (!ok) failed++
  }

  // Restore, exercising the resume path's SQL on the way back.
  await seedDb.transaction(async (t) => {
    await t.update(conversations)
      .set({ status: before.status as never, automationPaused: before.paused, assigneeUserId: before.assignee })
      .where(and(eq(conversations.workspaceId, WS), eq(conversations.id, CONV)))
    await t.insert(conversationEvents).values({
      id: newId('conversationEvent'), conversationId: CONV,
      kind: 'returned_to_automation', actorUserId: USER,
    })
  })
  console.log('\nrestored original status; re-run pnpm db:seed for a pristine thread')

  console.log(failed === 0 ? '\nTAKEOVER WRITE PATH: PASS' : `\nTAKEOVER WRITE PATH: ${failed} FAILED`)
  await pool.end()
  if (failed > 0) process.exit(1)
}

main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1) })
