'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { recordAudit } from '@/lib/audit'
import { PERMISSIONS, requirePermission, ForbiddenError } from '@/lib/auth/permissions'
import { getTxDb } from '@/lib/db'
import {
  journeyEdges,
  journeyNodes,
  journeyPublications,
  journeys,
  journeyVersions,
} from '@/lib/db/schema'
import { getScope, scoped } from '@/lib/db/scope'
import { newId } from '@/lib/ids'
import { prepareJourneyVersionForPublication } from '@/lib/journeys/validation'
import { cloneJourneyVersion } from '@/lib/journeys/versioning'

export type JourneyActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

const idSchema = z.string().min(1).max(80)
const createSchema = z.object({
  name: z.string().trim().min(2, 'Journey name is required.').max(120),
  description: z.string().trim().max(500).optional(),
  triggerSummary: z.string().trim().max(200).optional(),
})

export async function createJourney(input: {
  name: string
  description?: string
  triggerSummary?: string
}): Promise<JourneyActionResult> {
  try {
    await requirePermission(PERMISSIONS.JOURNEY_PUBLISH)
    const parsed = createSchema.parse(input)
    const scope = await getScope()
    const journeyId = newId('journey')
    const versionId = newId('journeyVersion')
    const startId = newId('journeyNode')
    const endId = newId('journeyNode')
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      await t.insert(journeys).values({
        id: journeyId,
        workspaceId: scope.workspaceId,
        name: parsed.name,
        description: parsed.description || null,
        triggerSummary: parsed.triggerSummary || null,
        status: 'draft',
        createdBy: scope.userId,
      })

      await t.insert(journeyVersions).values({
        id: versionId,
        journeyId,
        version: 1,
        notes: 'Initial draft',
        createdBy: scope.userId,
      })

      await t.insert(journeyNodes).values([
        {
          id: startId,
          journeyVersionId: versionId,
          key: 'start',
          kind: 'start',
          type: 'api_event',
          name: 'Journey started',
          description: parsed.triggerSummary || 'API or business event',
          positionX: 0,
          positionY: 0,
          config: {},
        },
        {
          id: endId,
          journeyVersionId: versionId,
          key: 'complete',
          kind: 'end',
          type: 'end',
          name: 'Journey complete',
          description: 'End journey',
          positionX: 0,
          positionY: 240,
          config: {},
        },
      ])

      await t.insert(journeyEdges).values({
        id: newId('journeyEdge'),
        journeyVersionId: versionId,
        fromNodeId: startId,
        toNodeId: endId,
        kind: 'default',
        ordinal: 0,
      })

      await t
        .update(journeys)
        .set({ currentVersionId: versionId, updatedAt: new Date() })
        .where(and(scoped(journeys, scope), eq(journeys.id, journeyId)))

      await recordAudit(t, scope, {
        action: 'journey.created',
        resourceType: 'journey',
        resourceId: journeyId,
        resourceLabel: parsed.name,
        after: { version: 1, status: 'draft' },
      })
    })

    revalidatePath('/app/journeys')
    revalidatePath('/app/overview')
    return { ok: true, id: journeyId }
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to create journeys.' }
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? 'Invalid journey.' }
    return { ok: false, error: error instanceof Error ? error.message : 'Journey creation failed.' }
  }
}

const nodeSchema = z.object({
  journeyId: idSchema,
  nodeId: idSchema,
  label: z.string().trim().min(1, 'Node label is required.').max(120),
  description: z.string().trim().max(300),
})

export async function updateJourneyNode(input: {
  journeyId: string
  nodeId: string
  label: string
  description: string
}): Promise<JourneyActionResult> {
  try {
    await requirePermission(PERMISSIONS.JOURNEY_PUBLISH)
    const parsed = nodeSchema.parse(input)
    const scope = await getScope()
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      const [owned] = await t
        .select({
          nodeId: journeyNodes.id,
          nodeKey: journeyNodes.key,
          nodeVersionId: journeyNodes.journeyVersionId,
          journeyName: journeys.name,
          currentVersionId: journeys.currentVersionId,
          oldName: journeyNodes.name,
          oldDescription: journeyNodes.description,
          versionPublishedAt: journeyVersions.publishedAt,
        })
        .from(journeyNodes)
        .innerJoin(journeyVersions, eq(journeyVersions.id, journeyNodes.journeyVersionId))
        .innerJoin(journeys, eq(journeys.id, journeyVersions.journeyId))
        .where(
          and(
            scoped(journeys, scope),
            eq(journeys.id, parsed.journeyId),
            eq(journeyNodes.id, parsed.nodeId),
          ),
        )
        .limit(1)
        .for('update')

      if (!owned) throw new Error('Journey node not found.')
      if (owned.currentVersionId !== owned.nodeVersionId) {
        throw new Error('This journey changed since you opened it. Reload before editing.')
      }

      let targetNodeId = owned.nodeId
      let createdDraftVersion: number | null = null
      if (owned.versionPublishedAt) {
        const draft = await cloneJourneyVersion(t, {
          journeyId: parsed.journeyId,
          sourceVersionId: owned.nodeVersionId,
          createdBy: scope.userId,
          notes: 'Draft created automatically on edit',
        })
        const clonedNodeId = draft.nodeIdByKey.get(owned.nodeKey)
        if (!clonedNodeId) throw new Error('Cloned journey version is missing the edited node.')
        targetNodeId = clonedNodeId
        createdDraftVersion = draft.version
      }

      await t
        .update(journeyNodes)
        .set({ name: parsed.label, description: parsed.description || null })
        .where(eq(journeyNodes.id, targetNodeId))

      await t
        .update(journeys)
        .set({ updatedAt: new Date() })
        .where(and(scoped(journeys, scope), eq(journeys.id, parsed.journeyId)))

      await recordAudit(t, scope, {
        action: 'journey.node_updated',
        resourceType: 'journey',
        resourceId: parsed.journeyId,
        resourceLabel: owned.journeyName,
        before: { nodeId: owned.nodeId, name: owned.oldName, description: owned.oldDescription },
        after: {
          nodeId: targetNodeId,
          name: parsed.label,
          description: parsed.description || null,
          ...(createdDraftVersion ? { createdDraftVersion } : {}),
        },
      })
    })

    revalidatePath(`/app/journeys/${parsed.journeyId}`)
    revalidatePath('/app/journeys')
    return { ok: true, id: parsed.journeyId }
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to edit journeys.' }
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? 'Invalid journey node.' }
    return { ok: false, error: error instanceof Error ? error.message : 'Journey update failed.' }
  }
}

export async function publishJourney(rawId: string): Promise<JourneyActionResult> {
  return setJourneyRuntimeState(rawId, 'published')
}

export async function pauseJourney(rawId: string): Promise<JourneyActionResult> {
  return setJourneyRuntimeState(rawId, 'paused')
}

async function setJourneyRuntimeState(
  rawId: string,
  status: 'published' | 'paused',
): Promise<JourneyActionResult> {
  try {
    await requirePermission(PERMISSIONS.JOURNEY_PUBLISH)
    const id = idSchema.parse(rawId)
    const scope = await getScope()
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      const [journey] = await t
        .select({ id: journeys.id, name: journeys.name, status: journeys.status, versionId: journeys.currentVersionId })
        .from(journeys)
        .where(and(scoped(journeys, scope), eq(journeys.id, id)))
        .limit(1)
        .for('update')

      if (!journey) throw new Error('Journey not found.')
      if (!journey.versionId) throw new Error('Journey has no current version.')

      const [beforePublication] = await t
        .select({
          active: journeyPublications.active,
          versionId: journeyPublications.versionId,
        })
        .from(journeyPublications)
        .where(
          and(
            eq(journeyPublications.journeyId, id),
            eq(journeyPublications.environment, scope.environment),
          ),
        )
        .limit(1)

      let globalStatus: 'published' | 'paused' = 'published'
      if (status === 'published') {
        await prepareJourneyVersionForPublication(t, {
          workspaceId: scope.workspaceId,
          versionId: journey.versionId,
        })

        await t
          .insert(journeyPublications)
          .values({
            journeyId: id,
            environment: scope.environment,
            versionId: journey.versionId,
            active: true,
            publishedBy: scope.userId,
            pausedAt: null,
            pausedBy: null,
          })
          .onConflictDoUpdate({
            target: [journeyPublications.journeyId, journeyPublications.environment],
            set: {
              versionId: journey.versionId,
              active: true,
              publishedAt: new Date(),
              publishedBy: scope.userId,
              pausedAt: null,
              pausedBy: null,
            },
          })

        await t
          .update(journeyVersions)
          .set({ publishedAt: new Date() })
          .where(eq(journeyVersions.id, journey.versionId))
      } else {
        const [paused] = await t
          .update(journeyPublications)
          .set({ active: false, pausedAt: new Date(), pausedBy: scope.userId })
          .where(
            and(
              eq(journeyPublications.journeyId, id),
              eq(journeyPublications.environment, scope.environment),
              eq(journeyPublications.active, true),
            ),
          )
          .returning({ journeyId: journeyPublications.journeyId })
        if (!paused) throw new Error(`Journey is not active in ${scope.environment}.`)

        const [otherActive] = await t
          .select({ journeyId: journeyPublications.journeyId })
          .from(journeyPublications)
          .where(and(eq(journeyPublications.journeyId, id), eq(journeyPublications.active, true)))
          .limit(1)
        globalStatus = otherActive ? 'published' : 'paused'
      }

      await t
        .update(journeys)
        .set({ status: globalStatus, updatedAt: new Date() })
        .where(and(scoped(journeys, scope), eq(journeys.id, id)))

      await recordAudit(t, scope, {
        action: status === 'published' ? 'journey.published' : 'journey.paused',
        resourceType: 'journey',
        resourceId: id,
        resourceLabel: journey.name,
        before: {
          authoringStatus: journey.status,
          environment: scope.environment,
          environmentActive: beforePublication?.active ?? false,
          environmentVersionId: beforePublication?.versionId ?? null,
        },
        after: {
          authoringStatus: globalStatus,
          environment: scope.environment,
          environmentActive: status === 'published',
          environmentVersionId: journey.versionId,
        },
      })
    })

    revalidatePath('/app/journeys')
    revalidatePath(`/app/journeys/${id}`)
    revalidatePath('/app/overview')
    return { ok: true, id }
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to publish journeys.' }
    return { ok: false, error: error instanceof Error ? error.message : 'Journey state update failed.' }
  }
}
