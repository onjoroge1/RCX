/**
 * Permission keys, deliberately free of `server-only` so that seed scripts and
 * any future client-side affordance checks can import them. The enforcement
 * logic lives in lib/auth/permissions.ts, which is server-only.
 *
 * The nine from spec §21.3 are marked; the rest exist because §21.3's list does
 * not describe handling a conversation at all, which would leave the Support
 * Agent role with no permissions. The settings matrix renders only §21.3's rows.
 */
export const PERMISSIONS = {
  // §21.3
  ANALYTICS_VIEW: 'analytics.view',
  MESSAGE_CREATE: 'message.create',
  JOURNEY_PUBLISH: 'journey.publish',
  CAMPAIGN_SEND: 'campaign.send',
  DEVELOPER_KEYS_ACCESS: 'developer.keys.access',
  INTEGRATION_MANAGE: 'integration.manage',
  BRAND_MANAGE: 'brand.manage',
  TEAM_MANAGE: 'team.manage',
  AUDIT_VIEW: 'audit.view',
  // superset
  CONVERSATION_VIEW: 'conversation.view',
  CONVERSATION_TAKEOVER: 'conversation.takeover',
  CONTACT_VIEW: 'contact.view',
  CONTACT_EDIT: 'contact.edit',
  TEMPLATE_APPROVE: 'template.approve',
  CAMPAIGN_APPROVE: 'campaign.approve',
  SETTINGS_MANAGE: 'settings.manage',
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
