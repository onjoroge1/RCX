import 'server-only'

import { and, desc, eq, inArray, sql } from 'drizzle-orm'

import type { Tx } from '@/lib/audit'
import {
  contacts,
  conversationMessages,
  conversations,
  goals,
  journeyRunWaits,
  journeyRuns,
  messageVersions,
  outcomes,
  platformEvents,
} from '@/lib/db/schema'
import type { Environment } from '@/lib/db/scope'
import { newId } from '@/lib/ids'
import { queueIntegrationDispatch } from '@/lib/integrations/outbox'
import { integrationNodeConfigSchema } from '@/lib/integrations/runtime-types'
import { queueOutboundConversationMessage } from '@/lib/messaging/outbox'
import { resolvePersonalizationContext } from '@/lib/messaging/personalization-context'
import { resolveMessageSnapshot } from '@/lib/messaging/personalization'
import { completeJourneyEffect, ensureJourneyEffect } from './effects'
import { getPath } from './conditions'
import {
  goalRuntimeConfigSchema,
  messageRuntimeConfigSchema,
  publishEventConfigSchema,
  timeWindowConfigSchema,
  waitConfigSchema,
  type NodeExecutionOutcome,
} from './runtime-types'

export type RuntimeRun = {
  id: string
  workspaceId: string
  environment: Environment
  journeyId: string
  journeyVersionId: string
  contactId: string | null
  conversationId: string | null
  context: Record<string, unknown>
}

export type RuntimeNode = {
  id: string
  key: string
  kind: 'start' | 'message' | 'logic' | 'integration' | 'human' | 'end'
  type:
    | 'api_event'
    | 'webhook'
    | 'schedule'
    | 'contact_event'
    | 'crm_field_changed'
    | 'payment_due'
    | 'order_status'
    | 'send_message'
    | 'present_replies'
    | 'send_fallback'
    | 'request_free_text'
    | 'wait'
    | 'condition'
    | 'split'
    | 'capability_check'
    | 'time_window'
    | 'http_request'
    | 'create_booking'
    | 'generate_payment_link'
    | 'update_crm'
    | 'create_ticket'
    | 'publish_event'
    | 'assign_agent'
    | 'pause_automation'
    | 'notify_team'
    | 'approval'
    | 'goal'
    | 'end'
  config: unknown
  timeoutSeconds: number | null
  messageId: string | null
  messageVersionId: string | null
  goalId: string | null
}

export type RuntimeStep = {
  id: string
  attempts: number
  startedAt: Date
}

function runtimeSubject(run: RuntimeRun, output?: Record<string, unknown>) {
  return {
    run: { id: run.id, contactId: run.contactId, conversationId: run.conversationId },
    context: run.context,
    output: output ?? {},
  }
}

function resolveMatchTemplates(
  match: Record<string, string | number | boolean | null> | undefined,
  run: RuntimeRun,
) {
  if (!match) return undefined
  return Object.fromEntries(
    Object.entries(match).map(([key, value]) => {
      if (value === '$runId') return [key, run.id]
      if (value === '$contactId') return [key, run.contactId]
      if (value === '$conversationId') return [key, run.conversationId]
      return [key, value]
    }),
  ) as Record<string, string | number | boolean | null>
}

async function loadExistingWait(tx: Tx, stepId: string) {
  const [wait] = await tx
    .select({
      id: journeyRunWaits.id,
      status: journeyRunWaits.status,
      resolution: journeyRunWaits.resolution,
      timeoutAt: journeyRunWaits.timeoutAt,
    })
    .from(journeyRunWaits)
    .where(eq(journeyRunWaits.stepId, stepId))
    .limit(1)
  return wait ?? null
}

async function createWait(
  tx: Tx,
  run: RuntimeRun,
  node: RuntimeNode,
  step: RuntimeStep,
  wait: {
    kind: 'timer' | 'event'
    eventKey?: string
    match?: Record<string, string | number | boolean | null>
    listenAfter: Date
    timeoutAt?: Date | null
  },
) {
  await tx
    .insert(journeyRunWaits)
    .values({
      id: newId('journeyRunWait'),
      workspaceId: run.workspaceId,
      environment: run.environment,
      runId: run.id,
      stepId: step.id,
      nodeId: node.id,
      kind: wait.kind,
      eventKey: wait.eventKey ?? null,
      match: wait.match,
      listenAfter: wait.listenAfter,
      timeoutAt: wait.timeoutAt ?? null,
      status: 'pending',
    })
    .onConflictDoNothing({ target: journeyRunWaits.stepId })
}

async function resolvedWaitOutcome(tx: Tx, step: RuntimeStep): Promise<NodeExecutionOutcome | null> {
  const wait = await loadExistingWait(tx, step.id)
  if (!wait) return null
  if (wait.status === 'pending') {
    return {
      kind: 'waiting',
      wait: {
        kind: 'event',
        listenAfter: step.startedAt,
        timeoutAt: wait.timeoutAt,
      },
    }
  }
  if (wait.status === 'timed_out') {
    return { kind: 'timeout', output: { wait: wait.resolution ?? { reason: 'timeout' } } }
  }
  if (wait.status === 'resolved') {
    return { kind: 'success', output: { wait: wait.resolution ?? { reason: 'resolved' } } }
  }
  throw new Error('Journey wait was cancelled')
}

async function ensureConversationAndQueueMessage(
  tx: Tx,
  run: RuntimeRun,
  node: RuntimeNode,
  step: RuntimeStep,
  requestedChannel: 'rcs' | 'sms',
): Promise<{ conversationId: string; messageId: string; dispatchId: string }> {
  if (!node.messageVersionId || !node.messageId) {
    throw new Error(`Journey node ${node.key} has no pinned message version`)
  }
  if (!run.contactId) throw new Error(`Journey node ${node.key} requires a contact`)

  const effect = await ensureJourneyEffect(
    tx,
    { workspaceId: run.workspaceId, environment: run.environment, runId: run.id, stepId: step.id },
    {
      effectKey: 'send_message',
      kind: 'message_dispatch',
      request: { messageId: node.messageId, messageVersionId: node.messageVersionId, requestedChannel },
    },
  )
  if (effect.status === 'completed' && effect.result && typeof effect.result === 'object') {
    const result = effect.result as Record<string, unknown>
    if (
      typeof result.conversationId === 'string' &&
      typeof result.messageId === 'string' &&
      typeof result.dispatchId === 'string'
    ) {
      return {
        conversationId: result.conversationId,
        messageId: result.messageId,
        dispatchId: result.dispatchId,
      }
    }
  }

  const [contact] = await tx
    .select({ phoneE164: contacts.phoneE164 })
    .from(contacts)
    .where(
      and(
        eq(contacts.id, run.contactId),
        eq(contacts.workspaceId, run.workspaceId),
        eq(contacts.environment, run.environment),
      ),
    )
    .limit(1)
  if (!contact) throw new Error('Journey contact no longer exists')

  const config = messageRuntimeConfigSchema.parse(node.config ?? {})
  const brandAgentId = config.brandAgentId ?? null
  let conversationId = run.conversationId

  if (conversationId) {
    const [owned] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.workspaceId, run.workspaceId),
          eq(conversations.environment, run.environment),
        ),
      )
      .limit(1)
      .for('update')
    if (!owned) throw new Error('Journey conversation no longer exists')
  } else {
    const [existing] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.workspaceId, run.workspaceId),
          eq(conversations.environment, run.environment),
          eq(conversations.contactId, run.contactId),
          inArray(conversations.status, ['automated', 'waiting_customer', 'needs_agent', 'agent_active']),
        ),
      )
      .orderBy(desc(conversations.openedAt))
      .limit(1)
      .for('update')

    if (existing) {
      conversationId = existing.id
    } else {
      conversationId = newId('conversation')
      await tx.insert(conversations).values({
        id: conversationId,
        workspaceId: run.workspaceId,
        environment: run.environment,
        contactId: run.contactId,
        brandAgentId,
        channel: requestedChannel,
        status: 'automated',
        journeyId: run.journeyId,
        journeyRunId: run.id,
      })
    }

    await tx.update(journeyRuns).set({ conversationId }).where(eq(journeyRuns.id, run.id))
    run.conversationId = conversationId
  }

  const [version] = await tx
    .select({ content: messageVersions.content, smsFallback: messageVersions.smsFallback })
    .from(messageVersions)
    .where(and(eq(messageVersions.id, node.messageVersionId), eq(messageVersions.messageId, node.messageId)))
    .limit(1)
  if (!version) throw new Error('Pinned message version no longer exists')

  const personalization = await resolvePersonalizationContext(tx, {
    workspaceId: run.workspaceId,
    environment: run.environment,
    contactId: run.contactId,
    messageVersionId: node.messageVersionId,
    runContext: run.context,
  })
  const snapshot = resolveMessageSnapshot(version.content, version.smsFallback, personalization)

  const [seq] = await tx
    .select({ value: sql<number>`coalesce(max(${conversationMessages.sequence}), 0)::int + 1` })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))

  const conversationMessageId = newId('conversationMessage')
  await tx.insert(conversationMessages).values({
    id: conversationMessageId,
    workspaceId: run.workspaceId,
    environment: run.environment,
    conversationId,
    sequence: seq?.value ?? 1,
    direction: 'outbound',
    actor: 'automation',
    contentType: 'rich_card',
    body: snapshot.content.heading,
    content: snapshot,
    messageVersionId: node.messageVersionId,
    journeyNodeId: node.id,
    channel: requestedChannel,
  })

  const queued = await queueOutboundConversationMessage(
    tx,
    { workspaceId: run.workspaceId, environment: run.environment },
    {
      conversationMessageId,
      brandAgentId,
      recipientPhone: contact.phoneE164,
      requestedChannel,
    },
  )

  await tx
    .update(conversations)
    .set({
      journeyId: run.journeyId,
      journeyRunId: run.id,
      lastMessageAt: new Date(),
      lastMessagePreview: snapshot.content.heading.slice(0, 140),
      channel: requestedChannel,
    })
    .where(eq(conversations.id, conversationId))

  const result = { conversationId, messageId: conversationMessageId, dispatchId: queued.dispatchId }
  await completeJourneyEffect(tx, effect.id, { externalId: conversationMessageId, result })
  return result
}

async function messageNode(
  tx: Tx,
  run: RuntimeRun,
  node: RuntimeNode,
  step: RuntimeStep,
  requestedChannel: 'rcs' | 'sms',
  waitEvent?: 'customer.suggested_reply_selected' | 'customer.message_received',
): Promise<NodeExecutionOutcome> {
  const existingWait = await resolvedWaitOutcome(tx, step)
  if (existingWait) return existingWait

  const sent = await ensureConversationAndQueueMessage(tx, run, node, step, requestedChannel)
  if (!waitEvent) return { kind: 'success', output: sent }

  const config = messageRuntimeConfigSchema.parse(node.config ?? {})
  const timeoutSeconds = node.timeoutSeconds ?? config.timeoutSeconds ?? 24 * 60 * 60
  const wait = {
    kind: 'event' as const,
    eventKey: waitEvent,
    match: { resourceId: sent.conversationId },
    listenAfter: step.startedAt,
    timeoutAt: new Date(Date.now() + timeoutSeconds * 1000),
  }
  await createWait(tx, run, node, step, wait)
  return { kind: 'waiting', wait, output: sent }
}

async function waitNode(tx: Tx, run: RuntimeRun, node: RuntimeNode, step: RuntimeStep): Promise<NodeExecutionOutcome> {
  const existing = await resolvedWaitOutcome(tx, step)
  if (existing) return existing

  const config = waitConfigSchema.parse(node.config)
  if (config.mode === 'duration') {
    const wait = {
      kind: 'timer' as const,
      listenAfter: step.startedAt,
      timeoutAt: new Date(step.startedAt.getTime() + config.seconds * 1000),
    }
    await createWait(tx, run, node, step, wait)
    return { kind: 'waiting', wait }
  }

  const wait = {
    kind: 'event' as const,
    eventKey: config.eventKey,
    match: resolveMatchTemplates(config.match, run),
    listenAfter: step.startedAt,
    timeoutAt: config.timeoutSeconds
      ? new Date(step.startedAt.getTime() + config.timeoutSeconds * 1000)
      : null,
  }
  await createWait(tx, run, node, step, wait)
  return { kind: 'waiting', wait }
}

async function integrationNode(
  tx: Tx,
  run: RuntimeRun,
  node: RuntimeNode,
  step: RuntimeStep,
): Promise<NodeExecutionOutcome> {
  const existing = await resolvedWaitOutcome(tx, step)
  if (existing) return existing

  const config = integrationNodeConfigSchema.parse(node.config ?? {})
  if (!config.connectionId && !config.providerKey) {
    throw new Error(`Integration node ${node.key} has no provider or connection binding`)
  }

  const operation = node.type === 'http_request' ? config.operation : node.type
  if (!operation) throw new Error(`Integration node ${node.key} has no configured operation`)

  const queued = await queueIntegrationDispatch(
    tx,
    {
      workspaceId: run.workspaceId,
      environment: run.environment,
      runId: run.id,
      stepId: step.id,
      nodeId: node.id,
    },
    {
      connectionId: config.connectionId,
      providerKey: config.providerKey,
      operation,
      inputTemplate: config.input,
      subject: runtimeSubject(run),
    },
  )

  const wait = {
    kind: 'event' as const,
    eventKey: 'integration.execution_succeeded',
    match: { resourceId: queued.dispatchId },
    listenAfter: step.startedAt,
    timeoutAt: null,
  }
  await createWait(tx, run, node, step, wait)
  return {
    kind: 'waiting',
    wait,
    output: { dispatchId: queued.dispatchId, operation, connectionId: queued.connectionId },
  }
}

async function publishEventNode(tx: Tx, run: RuntimeRun, node: RuntimeNode, step: RuntimeStep) {
  const config = publishEventConfigSchema.parse(node.config)
  const effect = await ensureJourneyEffect(
    tx,
    { workspaceId: run.workspaceId, environment: run.environment, runId: run.id, stepId: step.id },
    { effectKey: 'publish_event', kind: 'platform_event', request: config },
  )
  if (effect.status === 'completed') {
    return { kind: 'success', output: (effect.result as Record<string, unknown>) ?? {} } as const
  }

  const subject = runtimeSubject(run)
  const resourceId = config.resourceIdPath ? getPath(subject, config.resourceIdPath) : run.id
  const eventId = newId('platformEvent')
  await tx.insert(platformEvents).values({
    id: eventId,
    workspaceId: run.workspaceId,
    environment: run.environment,
    key: config.eventKey,
    resourceType: config.resourceType ?? 'journey_run',
    resourceId: typeof resourceId === 'string' ? resourceId : run.id,
    payload: { ...(config.payload ?? {}), runId: run.id, contactId: run.contactId, conversationId: run.conversationId },
  })
  const result = { eventId, eventKey: config.eventKey }
  await completeJourneyEffect(tx, effect.id, { externalId: eventId, result })
  return { kind: 'success', output: result } as const
}

async function goalNode(tx: Tx, run: RuntimeRun, node: RuntimeNode, step: RuntimeStep) {
  const config = goalRuntimeConfigSchema.parse(node.config ?? {})
  const effect = await ensureJourneyEffect(
    tx,
    { workspaceId: run.workspaceId, environment: run.environment, runId: run.id, stepId: step.id },
    { effectKey: 'record_goal', kind: 'outcome', request: config },
  )
  if (effect.status === 'completed') {
    return { kind: 'success', output: (effect.result as Record<string, unknown>) ?? {} } as const
  }

  let goal: { id: string; kind: 'booking' | 'payment' | 'purchase' | 'approval' | 'resolution' | 'qualified_lead' | 'custom'; defaultValue: string | null } | null = null
  if (node.goalId) {
    const [row] = await tx
      .select({ id: goals.id, kind: goals.kind, defaultValue: goals.defaultValue })
      .from(goals)
      .where(and(eq(goals.id, node.goalId), eq(goals.workspaceId, run.workspaceId)))
      .limit(1)
    goal = row ?? null
  }

  const subject = runtimeSubject(run)
  const rawValue = config.valuePath ? getPath(subject, config.valuePath) : config.value ?? goal?.defaultValue
  const numericValue = rawValue == null || rawValue === '' ? null : Number(rawValue)
  if (numericValue != null && !Number.isFinite(numericValue)) throw new Error('Goal value is not numeric')

  const outcomeId = newId('outcome')
  await tx.insert(outcomes).values({
    id: outcomeId,
    workspaceId: run.workspaceId,
    environment: run.environment,
    goalId: goal?.id ?? node.goalId,
    kind: config.kind ?? goal?.kind ?? 'custom',
    contactId: run.contactId,
    conversationId: run.conversationId,
    journeyRunId: run.id,
    journeyId: run.journeyId,
    value: numericValue == null ? null : numericValue.toFixed(2),
    currency: config.currency,
    attributes: config.attributes,
  })
  const result = { outcomeId, value: numericValue, currency: config.currency }
  await completeJourneyEffect(tx, effect.id, { externalId: outcomeId, result })
  return { kind: 'success', output: result } as const
}

async function humanNode(tx: Tx, run: RuntimeRun, node: RuntimeNode, step: RuntimeStep): Promise<NodeExecutionOutcome> {
  if (!run.conversationId) throw new Error(`${node.type} requires an active conversation`)
  const effect = await ensureJourneyEffect(
    tx,
    { workspaceId: run.workspaceId, environment: run.environment, runId: run.id, stepId: step.id },
    { effectKey: 'human_handoff', kind: node.type, request: { conversationId: run.conversationId } },
  )

  if (effect.status !== 'completed') {
    await tx
      .update(conversations)
      .set({ status: 'needs_agent', automationPaused: true })
      .where(
        and(
          eq(conversations.id, run.conversationId),
          eq(conversations.workspaceId, run.workspaceId),
          eq(conversations.environment, run.environment),
        ),
      )
    await tx.insert(platformEvents).values({
      id: newId('platformEvent'),
      workspaceId: run.workspaceId,
      environment: run.environment,
      key: 'agent.handoff_requested',
      resourceType: 'conversation',
      resourceId: run.conversationId,
      payload: { runId: run.id, nodeKey: node.key },
    })
    await completeJourneyEffect(tx, effect.id, { result: { conversationId: run.conversationId } })
  }

  const existingWait = await resolvedWaitOutcome(tx, step)
  if (existingWait) return existingWait
  const wait = {
    kind: 'event' as const,
    eventKey: 'conversation.returned_to_automation',
    match: { resourceId: run.conversationId },
    listenAfter: step.startedAt,
    timeoutAt: node.timeoutSeconds ? new Date(step.startedAt.getTime() + node.timeoutSeconds * 1000) : null,
  }
  await createWait(tx, run, node, step, wait)
  return { kind: 'waiting', wait }
}

export async function executeJourneyNode(
  tx: Tx,
  run: RuntimeRun,
  node: RuntimeNode,
  step: RuntimeStep,
): Promise<NodeExecutionOutcome> {
  if (node.kind === 'start') return { kind: 'success' }

  switch (node.type) {
    case 'send_message':
      return messageNode(tx, run, node, step, 'rcs')
    case 'present_replies':
      return messageNode(tx, run, node, step, 'rcs', 'customer.suggested_reply_selected')
    case 'request_free_text':
      return messageNode(tx, run, node, step, 'rcs', 'customer.message_received')
    case 'send_fallback':
      return messageNode(tx, run, node, step, 'sms')
    case 'wait':
      return waitNode(tx, run, node, step)
    case 'condition':
    case 'split':
      return { kind: 'success' }
    case 'capability_check': {
      if (!run.contactId) throw new Error('Capability check requires a contact')
      const [contact] = await tx
        .select({ rcsCapable: contacts.rcsCapable, checkedAt: contacts.rcsCapabilityCheckedAt })
        .from(contacts)
        .where(
          and(
            eq(contacts.id, run.contactId),
            eq(contacts.workspaceId, run.workspaceId),
            eq(contacts.environment, run.environment),
          ),
        )
        .limit(1)
      return { kind: 'success', output: { rcsCapable: contact?.rcsCapable ?? null, checkedAt: contact?.checkedAt?.toISOString() ?? null } }
    }
    case 'time_window': {
      const config = timeWindowConfigSchema.parse(node.config)
      const hour = new Date().getUTCHours()
      const within = config.startHourUtc <= config.endHourUtc
        ? hour >= config.startHourUtc && hour < config.endHourUtc
        : hour >= config.startHourUtc || hour < config.endHourUtc
      return { kind: 'success', output: { withinWindow: within, hourUtc: hour } }
    }
    case 'publish_event':
      return publishEventNode(tx, run, node, step)
    case 'assign_agent':
    case 'pause_automation':
      return humanNode(tx, run, node, step)
    case 'notify_team': {
      const effect = await ensureJourneyEffect(
        tx,
        { workspaceId: run.workspaceId, environment: run.environment, runId: run.id, stepId: step.id },
        { effectKey: 'notify_team', kind: 'notification', request: node.config },
      )
      if (effect.status !== 'completed') {
        const eventId = newId('platformEvent')
        await tx.insert(platformEvents).values({
          id: eventId,
          workspaceId: run.workspaceId,
          environment: run.environment,
          key: 'journey.team_notification_requested',
          resourceType: 'journey_run',
          resourceId: run.id,
          payload: { nodeKey: node.key, config: node.config },
        })
        await completeJourneyEffect(tx, effect.id, { externalId: eventId, result: { eventId } })
      }
      return { kind: 'success' }
    }
    case 'approval': {
      const existing = await resolvedWaitOutcome(tx, step)
      if (existing) return existing
      const wait = {
        kind: 'event' as const,
        eventKey: 'journey.approval_completed',
        match: { 'payload.runId': run.id, 'payload.nodeKey': node.key },
        listenAfter: step.startedAt,
        timeoutAt: node.timeoutSeconds ? new Date(step.startedAt.getTime() + node.timeoutSeconds * 1000) : null,
      }
      await createWait(tx, run, node, step, wait)
      return { kind: 'waiting', wait }
    }
    case 'goal':
      return goalNode(tx, run, node, step)
    case 'end':
      return { kind: 'complete' }
    case 'http_request':
    case 'create_booking':
    case 'generate_payment_link':
    case 'update_crm':
    case 'create_ticket':
      return integrationNode(tx, run, node, step)
    case 'api_event':
    case 'webhook':
    case 'schedule':
    case 'contact_event':
    case 'crm_field_changed':
    case 'payment_due':
    case 'order_status':
      return { kind: 'success' }
  }
}
