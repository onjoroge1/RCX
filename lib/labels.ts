/**
 * Enum values are lowercase snake_case in the database. Display casing lives here.
 *
 * data/mock.ts mixed the two — 'Active' and 'Live' alongside 'automated' and
 * 'approved' — which is why the same concept rendered differently on different
 * screens. One map per enum, one place to change.
 */

type LabelMap = Record<string, string>

function labeller(map: LabelMap) {
  return (value: string | null | undefined): string => {
    if (!value) return '—'
    return map[value] ?? value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  }
}

export const environmentLabel = labeller({ test: 'Test', live: 'Live' })

export const memberStatusLabel = labeller({
  active: 'Active',
  invited: 'Invited',
  suspended: 'Suspended',
  removed: 'Removed',
})

export const consentStateLabel = labeller({
  opted_in: 'Opted in',
  opted_out: 'Opted out',
  unknown: 'Unknown',
  pending: 'Pending consent',
})

export const conversationStatusLabel = labeller({
  automated: 'Automated',
  waiting_customer: 'Waiting on customer',
  needs_agent: 'Needs agent',
  agent_active: 'Agent active',
  resolved: 'Resolved',
})

export const journeyStatusLabel = labeller({
  draft: 'Draft',
  published: 'Published',
  paused: 'Paused',
  archived: 'Archived',
})

export const messageStatusLabel = labeller({
  draft: 'Draft',
  testing: 'Testing',
  approved: 'Approved',
  live: 'Live',
  archived: 'Archived',
})

export const campaignStatusLabel = labeller({
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
})

export const verificationStateLabel = labeller({
  not_started: 'Not started',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
})

export const carrierReviewLabel = labeller({
  not_started: 'Not started',
  pending: 'Pending carrier',
  approved: 'Approved',
})

export const launchStateLabel = labeller({ test: 'Test', ready: 'Ready', live: 'Live' })

export const checklistStatusLabel = labeller({
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  pending: 'Pending review',
  blocked: 'Blocked',
})

export const connectionStateLabel = labeller({
  connected: 'Connected',
  warning: 'Needs attention',
  error: 'Error',
  disconnected: 'Disconnected',
})

export const channelLabel = labeller({ rcs: 'RCS', sms: 'SMS', mms: 'MMS' })

export const deliveryStatusLabel = labeller({
  queued: 'Queued',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  expired: 'Expired',
})

/** §17.7's failure reasons, as displayed in the analytics chart. */
export const failureReasonLabel = labeller({
  unsupported_capability: 'Unsupported capability',
  invalid_number: 'Invalid number',
  provider_rejected: 'Provider rejected',
  webhook_timeout: 'Webhook timeout',
  integration_error: 'Integration error',
  consent_missing: 'Consent missing',
  message_validation: 'Message validation',
  action_expired: 'Customer action expired',
})

export const outcomeKindLabel = labeller({
  booking: 'Bookings',
  payment: 'Payments',
  purchase: 'Purchases',
  approval: 'Approvals',
  resolution: 'Resolutions',
  qualified_lead: 'Qualified leads',
  custom: 'Other',
})

export const journeyRunStatusLabel = labeller({
  active: 'Active',
  waiting: 'Waiting',
  completed: 'Completed',
  failed: 'Failed',
  exited: 'Exited',
  cancelled: 'Cancelled',
})

export const apiKeyStatusLabel = labeller({ active: 'Active', revoked: 'Revoked', expired: 'Expired' })

export const webhookStatusLabel = labeller({ active: 'Active', disabled: 'Disabled', failing: 'Failing' })

/** Maps a status to the Badge variant used across the app. */
export function statusVariant(
  status: string | null | undefined,
): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'active':
    case 'live':
    case 'approved':
    case 'complete':
    case 'connected':
    case 'delivered':
    case 'read':
    case 'completed':
    case 'resolved':
    case 'opted_in':
    case 'published':
      return 'success'
    case 'pending':
    case 'in_progress':
    case 'testing':
    case 'warning':
    case 'waiting':
    case 'needs_agent':
    case 'scheduled':
    case 'invited':
      return 'warning'
    case 'failed':
    case 'error':
    case 'rejected':
    case 'blocked':
    case 'revoked':
    case 'suspended':
    case 'opted_out':
      return 'error'
    default:
      return 'neutral'
  }
}
