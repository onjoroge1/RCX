import 'server-only'

import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'

import { db, getTxDb } from '@/lib/db'
import {
  contacts,
  journeyNodes,
  journeyPublications,
  journeyRuns,
  journeys,
  platformEvents,
} from '@/lib/db/schema'
import type { Environment } from '@/lib/db/scope'
import { newId } from '@/lib/ids'

export type StartJourneyRunInput = {
  workspaceId: string
  environment: Environment
  journeyId: string
  contactId?: string | null
  conversationId?: string | null
  triggerKey?: string
  context?: Record<string, unknown>
}

export type StartJourneyRunResult = {
  runId: string
  created: boolean
  triggerKey: string
}

export async function startJourneyRun(input: StartJourneyRunInput): Promise<StartJourneyRunResult> {
  const triggerKey = input.triggerKey?.trim() || randomUUID()
  if (triggerKey.length > 200) throw new Error('Journey trigger key is too long')

  const [publication] = await db
    .select({
      versionId: journeyPublications.versionId,
      journeyStatus: journeys.status,
    })
    .from(journeyPublications)
    .innerJoin(journeys, eq(journeys.id, journeyPublications.journeyId))
    .where(
      and(
        eq(journeyPublications.journeyId, input.journeyId),
        eq(journeyPublications.environment, input.environment),
        eq(journeys.workspaceId, input.workspaceId),
      ),
    )
    .limit(1)

  if (!publication) throw new Error('Journey is not published in this environment')
  if (publication.journeyStatus !== 'published') throw new Error('Journey is not currently active')

  const [startNode] = await db
    .select({ id: journeyNodes.id })
    .from(journeyNodes)
    .where(
      and(
        eq(journeyNodes.journeyVersionId, publication.versionId),
        eq(journeyNodes.kind, 'start'),
      ),
    )
    .limit(1)
  if (!startNode) throw new Error('Published journey has no start node')

  if (input.contactId) {
    const [contact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.id, input.contactId),
          eq(contacts.workspaceId, input.workspaceId),
          eq(contacts.environment, input.environment),
        ),
      )
      .limit(1)
    if (!contact) throw new Error('Journey contact does not belong to this workspace/environment')
  }

  const txDb = getTxDb()
  return txDb.transaction(async (tx) => {
    const runId = newId('journeyRun')
    const [created] = await tx
      .insert(journeyRuns)
      .values({
        id: runId,
        workspaceId: input.workspaceId,
        environment: input.environment,
        journeyId: input.journeyId,
        journeyVersionId: publication.versionId,
        contactId: input.contactId ?? null,
        conversationId: input.conversationId ?? null,
        triggerKey,
        status: 'active',
        currentNodeId: startNode.id,
        context: input.context ?? {},
      })
      .onConflictDoNothing({
        target: [
          journeyRuns.workspaceId,
          journeyRuns.environment,
          journeyRuns.journeyId,
          journeyRuns.triggerKey,
        ],
      })
      .returning({ id: journeyRuns.id })

    if (!created) {
      const [existing] = await tx
        .select({ id: journeyRuns.id })
        .from(journeyRuns)
        .where(
          and(
            eq(journeyRuns.workspaceId, input.workspaceId),
            eq(journeyRuns.environment, input.environment),
            eq(journeyRuns.journeyId, input.journeyId),
            eq(journeyRuns.triggerKey, triggerKey),
          ),
        )
        .limit(1)
      if (!existing) throw new Error('Journey trigger dedupe conflict could not be resolved')
      return { runId: existing.id, created: false, triggerKey }
    }

    await tx.insert(platformEvents).values({
      id: newId('platformEvent'),
      workspaceId: input.workspaceId,
      environment: input.environment,
      key: 'journey.started',
      resourceType: 'journey_run',
      resourceId: runId,
      payload: {
        journeyId: input.journeyId,
        journeyVersionId: publication.versionId,
        contactId: input.contactId ?? null,
        triggerKey,
      },
    })

    return { runId, created: true, triggerKey }
  })
}
