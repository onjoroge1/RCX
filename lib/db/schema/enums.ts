import { pgEnum } from 'drizzle-orm/pg-core'

// Every enum value is lowercase snake_case. The mock data mixes Title Case
// ('Active', 'Live') with lowercase ('automated', 'approved'); display casing
// belongs in lib/labels.ts, not in the database.

/* ---------- tenancy ---------- */
export const environmentEnum = pgEnum('environment', ['test', 'live'])
export const memberStatusEnum = pgEnum('member_status', ['active', 'invited', 'suspended', 'removed'])
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted'])

/* ---------- contacts and consent ---------- */
export const consentStateEnum = pgEnum('consent_state', ['opted_in', 'opted_out', 'unknown', 'pending'])
export const consentSourceEnum = pgEnum('consent_source', [
  'import',
  'api',
  'integration',
  'keyword_reply',
  'preference_center',
  'agent',
  'web_form',
])
export const segmentKindEnum = pgEnum('segment_kind', ['dynamic', 'static', 'system'])
export const contactRecordTypeEnum = pgEnum('contact_record_type', [
  'vehicle',
  'order',
  'invoice',
  'work_order',
  'booking',
  'payment',
  'subscription',
  'account',
])
export const importStatusEnum = pgEnum('import_status', ['pending', 'processing', 'completed', 'failed'])

/* ---------- brand ---------- */
export const verificationStateEnum = pgEnum('verification_state', [
  'not_started',
  'pending',
  'approved',
  'rejected',
])
export const carrierReviewStateEnum = pgEnum('carrier_review_state', ['not_started', 'pending', 'approved'])
export const launchStateEnum = pgEnum('launch_state', ['test', 'ready', 'live'])
export const checklistItemStatusEnum = pgEnum('checklist_item_status', [
  'not_started',
  'in_progress',
  'complete',
  'pending',
  'blocked',
])
export const useCaseCategoryEnum = pgEnum('use_case_category', [
  'transactional',
  'support',
  'marketing',
  'authentication',
  'booking',
  'payments',
  'delivery',
])

/* ---------- messaging ---------- */
export const messageStatusEnum = pgEnum('message_status', ['draft', 'testing', 'approved', 'live', 'archived'])
export const channelEnum = pgEnum('channel', ['rcs', 'sms', 'mms'])
export const messageActionKindEnum = pgEnum('message_action_kind', [
  'open_url',
  'dial',
  'create_calendar_event',
  'view_location',
  'share_location',
  'postback',
  'suggested_reply',
])
export const variableTypeEnum = pgEnum('variable_type', ['text', 'number', 'currency', 'datetime', 'url'])
export const variableSourceEnum = pgEnum('variable_source', [
  'contact_field',
  'contact_attribute',
  'record_field',
  'journey_output',
  'manual',
])

/* ---------- journeys ---------- */
export const journeyStatusEnum = pgEnum('journey_status', ['draft', 'published', 'paused', 'archived'])
export const journeyNodeKindEnum = pgEnum('journey_node_kind', [
  'start',
  'message',
  'logic',
  'integration',
  'human',
  'end',
])
/** The full §13.2 node library, verbatim. */
export const journeyNodeTypeEnum = pgEnum('journey_node_type', [
  'api_event',
  'webhook',
  'schedule',
  'contact_event',
  'crm_field_changed',
  'payment_due',
  'order_status',
  'send_message',
  'present_replies',
  'send_fallback',
  'request_free_text',
  'wait',
  'condition',
  'split',
  'capability_check',
  'time_window',
  'http_request',
  'create_booking',
  'generate_payment_link',
  'update_crm',
  'create_ticket',
  'publish_event',
  'assign_agent',
  'pause_automation',
  'notify_team',
  'approval',
  'goal',
  'end',
])
export const edgeKindEnum = pgEnum('edge_kind', ['default', 'branch', 'error', 'timeout'])
export const journeyRunStatusEnum = pgEnum('journey_run_status', [
  'active',
  'waiting',
  'completed',
  'failed',
  'exited',
  'cancelled',
])
export const runStepStatusEnum = pgEnum('run_step_status', ['pending', 'running', 'succeeded', 'failed', 'skipped'])
export const journeyWaitStatusEnum = pgEnum('journey_wait_status', [
  'pending',
  'resolved',
  'timed_out',
  'cancelled',
])
export const journeyWaitKindEnum = pgEnum('journey_wait_kind', ['timer', 'event'])
export const journeyEffectStatusEnum = pgEnum('journey_effect_status', [
  'pending',
  'completed',
  'failed',
])
export const outcomeKindEnum = pgEnum('outcome_kind', [
  'booking',
  'payment',
  'purchase',
  'approval',
  'resolution',
  'qualified_lead',
  'custom',
])

/* ---------- conversations ---------- */
export const conversationStatusEnum = pgEnum('conversation_status', [
  'automated',
  'waiting_customer',
  'needs_agent',
  'agent_active',
  'resolved',
])
export const messageActorEnum = pgEnum('message_actor', ['customer', 'automation', 'agent', 'system'])
export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound'])
export const conversationEventKindEnum = pgEnum('conversation_event_kind', [
  'assigned',
  'takeover',
  'returned_to_automation',
  'status_changed',
  'note_added',
  'escalated',
  'opted_out',
  'payment_completed',
  'booking_created',
])

/* ---------- delivery ---------- */
export const deliveryStatusEnum = pgEnum('delivery_status', [
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
  'expired',
])
/** §17.7's failure reason list, verbatim. */
export const failureReasonEnum = pgEnum('failure_reason', [
  'unsupported_capability',
  'invalid_number',
  'provider_rejected',
  'webhook_timeout',
  'integration_error',
  'consent_missing',
  'message_validation',
  'action_expired',
])

/* ---------- campaigns ---------- */
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'scheduled',
  'sending',
  'paused',
  'completed',
  'cancelled',
  'failed',
])
export const audienceSourceEnum = pgEnum('audience_source', [
  'segment',
  'contact_list',
  'csv_upload',
  'crm_query',
  'test_audience',
])
export const channelPreferenceEnum = pgEnum('channel_preference', [
  'rcs_with_sms_fallback',
  'rcs_only',
  'sms_only',
])
export const timezoneModeEnum = pgEnum('timezone_mode', ['workspace', 'contact'])
export const recipientStatusEnum = pgEnum('recipient_status', [
  'pending',
  'sent',
  'delivered',
  'read',
  'acted',
  'failed',
  'suppressed',
])

/* ---------- integrations ---------- */
export const integrationCategoryEnum = pgEnum('integration_category', [
  'crm',
  'payments',
  'scheduling',
  'support',
  'commerce',
  'developer',
])
export const connectionStateEnum = pgEnum('connection_state', ['connected', 'warning', 'error', 'disconnected'])
export const mappingDirectionEnum = pgEnum('mapping_direction', ['inbound', 'outbound'])
export const eventStatusEnum = pgEnum('event_status', ['succeeded', 'failed', 'retrying', 'pending'])
export const integrationDispatchStatusEnum = pgEnum('integration_dispatch_status', [
  'pending',
  'processing',
  'retry_wait',
  'succeeded',
  'failed',
  'cancelled',
])

/* ---------- developer ---------- */
export const apiKeyStatusEnum = pgEnum('api_key_status', ['active', 'revoked', 'expired'])
export const webhookStatusEnum = pgEnum('webhook_status', ['active', 'disabled', 'failing'])
export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'pending',
  'succeeded',
  'failed',
  'retrying',
  'dead',
])

/* ---------- audit ---------- */
export const actorTypeEnum = pgEnum('actor_type', ['user', 'api_key', 'system', 'integration', 'platform_admin'])
export const auditResultEnum = pgEnum('audit_result', ['success', 'failure', 'denied'])

/* ---------- demo flows (§22) ---------- */
export const flowStageEnum = pgEnum('flow_stage', [
  'trigger',
  'context',
  'decision',
  'action',
  'confirmation',
  'recovery',
])
export const flowNodeKindEnum = pgEnum('flow_node_kind', [
  'system',
  'business',
  'customer',
  'typing',
  'receipt',
  'chips',
  'sms',
  'rich_card',
  'carousel',
  'payment',
  'booking_confirmed',
  'brand_sheet',
  'quote',
  'tracker',
])

/* ---------- marketing ---------- */
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'closed', 'spam'])