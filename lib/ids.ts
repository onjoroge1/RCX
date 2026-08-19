import { customAlphabet } from 'nanoid'

// No look-alike characters (0/O, 1/l/I). These IDs appear on screen in API logs
// and webhook payloads, so they get read aloud and retyped by humans.
const alphabet = '23456789abcdefghijkmnopqrstuvwxyz'
const generate = customAlphabet(alphabet, 16)

export const ID_PREFIXES = {
  organization: 'org',
  workspace: 'ws',
  user: 'usr',
  member: 'mem',
  invitation: 'inv',
  role: 'rol',
  contact: 'ct',
  contactRecord: 'rec',
  contactImport: 'imp',
  segment: 'seg',
  consentEvent: 'cse',
  suppression: 'sup',
  brandAgent: 'ba',
  checklistItem: 'bci',
  testDevice: 'dev',
  message: 'msg',
  messageVersion: 'mv',
  messageAction: 'ma',
  messageVariable: 'mvar',
  template: 'tpl',
  savedReply: 'sr',
  variableDefinition: 'vd',
  journey: 'jr',
  journeyVersion: 'jv',
  journeyNode: 'jn',
  journeyEdge: 'je',
  journeyRun: 'run',
  journeyRunStep: 'rst',
  journeyRunWait: 'jwait',
  journeyEffect: 'jfx',
  goal: 'goal',
  outcome: 'out',
  conversation: 'cv',
  conversationMessage: 'cm',
  conversationEvent: 'cev',
  campaign: 'cmp',
  campaignAudience: 'aud',
  campaignRecipient: 'cr',
  connection: 'con',
  integrationEvent: 'iev',
  fieldMapping: 'fm',
  apiKey: 'key',
  webhookEndpoint: 'whe',
  webhookDelivery: 'whd',
  platformEvent: 'evt',
  apiRequestLog: 'req',
  deliveryEvent: 'de',
  providerAccount: 'pa',
  providerAgentBinding: 'pab',
  messageDispatch: 'dsp',
  providerWebhookEvent: 'pwe',
  auditLog: 'aud_log',
  lead: 'lead',
  demoFlow: 'flow',
  demoFlowStep: 'fst',
  demoFlowNode: 'fnd',
  marketingPlan: 'plan',
} as const

export type IdPrefix = keyof typeof ID_PREFIXES

export function newId(kind: IdPrefix): string {
  return `${ID_PREFIXES[kind]}_${generate()}`
}

export function seedId(kind: IdPrefix, slug: string): string {
  return `${ID_PREFIXES[kind]}_${slug.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`
}
