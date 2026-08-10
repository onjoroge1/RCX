// RCX prototype mock data — fictional demo entities for Northstar Auto workspace.

export type KpiTrend = 'up' | 'down' | 'flat'

export const kpis = [
  { id: 'outcomes', label: 'Completed outcomes', value: '12,604', change: '+14.2%', trend: 'up' as KpiTrend, spark: [8, 9, 8, 11, 10, 13, 14], hint: 'Bookings, payments, approvals, resolutions and purchases customers finished from the conversation.' },
  { id: 'revenue', label: 'Attributed revenue', value: '$84,240', change: '+9.1%', trend: 'up' as KpiTrend, spark: [40, 52, 48, 60, 66, 72, 84], hint: 'Revenue tied to a completed journey outcome.' },
  { id: 'rcs', label: 'RCS eligibility', value: '78.4%', change: '+2.3%', trend: 'up' as KpiTrend, spark: [72, 73, 74, 75, 76, 77, 78], hint: 'Share of recipients able to receive rich RCS.' },
  { id: 'delivery', label: 'Delivery rate', value: '97.2%', change: '+0.4%', trend: 'up' as KpiTrend, spark: [96, 96, 97, 97, 97, 97, 97], hint: 'Messages delivered across RCS and SMS fallback.' },
  { id: 'action', label: 'Action rate', value: '26.1%', change: '+3.8%', trend: 'up' as KpiTrend, spark: [19, 21, 22, 23, 24, 25, 26], hint: 'Recipients who tapped a button or replied.' },
  { id: 'fallback', label: 'SMS fallback rate', value: '21.6%', change: '-1.9%', trend: 'down' as KpiTrend, spark: [26, 25, 24, 23, 23, 22, 21], hint: 'Share routed to SMS because RCS was unavailable.' },
]

export const secondaryKpis = [
  { label: 'Messages sent', value: '48,240' },
  { label: 'Read', value: '37,625' },
  { label: 'Replies', value: '8,440' },
  { label: 'Opt-out rate', value: '0.31%' },
]

export type OutcomePoint = {
  day: string
  bookings: number
  payments: number
  resolutions: number
  purchases: number
}

export const outcomesOverTime: OutcomePoint[] = [
  { day: 'Mon', bookings: 320, payments: 210, resolutions: 140, purchases: 90 },
  { day: 'Tue', bookings: 360, payments: 260, resolutions: 160, purchases: 110 },
  { day: 'Wed', bookings: 300, payments: 240, resolutions: 150, purchases: 130 },
  { day: 'Thu', bookings: 420, payments: 300, resolutions: 190, purchases: 140 },
  { day: 'Fri', bookings: 470, payments: 360, resolutions: 210, purchases: 180 },
  { day: 'Sat', bookings: 380, payments: 280, resolutions: 130, purchases: 120 },
  { day: 'Sun', bookings: 260, payments: 180, resolutions: 90, purchases: 80 },
]

export type JourneyRow = {
  id: string
  name: string
  status: 'published' | 'draft' | 'paused'
  trigger: string
  entered: number
  completion: number
  rcsRate: number
  value: string
  failure: number
  updated: string
}

export const journeys: JourneyRow[] = [
  { id: 'service-reminder', name: 'Service reminder', status: 'published', trigger: 'CRM: appointment due', entered: 4820, completion: 62, rcsRate: 81, value: '$28,400', failure: 1.2, updated: '2h ago' },
  { id: 'payment-collection', name: 'Payment collection', status: 'published', trigger: 'API: invoice created', entered: 3110, completion: 54, rcsRate: 74, value: '$41,900', failure: 2.4, updated: '1d ago' },
  { id: 'delivery-update', name: 'Delivery update', status: 'published', trigger: 'Order status changed', entered: 2680, completion: 71, rcsRate: 79, value: '$6,200', failure: 0.9, updated: '3h ago' },
  { id: 'lead-qualification', name: 'New lead qualification', status: 'paused', trigger: 'Webhook: form submitted', entered: 1240, completion: 38, rcsRate: 68, value: '$5,100', failure: 3.1, updated: '4d ago' },
  { id: 'appointment-reschedule', name: 'Appointment reschedule', status: 'draft', trigger: 'Contact event', entered: 0, completion: 0, rcsRate: 0, value: '$0', failure: 0, updated: '6d ago' },
]

export type Attention = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  href: string
}

export const attention: Attention[] = [
  { id: 'a1', severity: 'critical', title: '18 failed webhooks', detail: 'Delivery update journey — endpoint returned 5xx', href: '/app/developers' },
  { id: 'a2', severity: 'warning', title: 'Carrier review pending', detail: 'Northstar Sales agent awaiting carrier approval', href: '/app/brand' },
  { id: 'a3', severity: 'warning', title: '4 conversations waiting for an agent', detail: 'Needs-agent queue above target', href: '/app/conversations' },
  { id: 'a4', severity: 'info', title: 'Payment completion dropped 12%', detail: 'Payment collection journey, last 24h', href: '/app/analytics' },
  { id: 'a5', severity: 'warning', title: 'Stripe auth expires in 6 days', detail: 'Reauthorize to avoid interruption', href: '/app/integrations' },
  { id: 'a6', severity: 'info', title: '52 customers received SMS fallback', detail: 'Unsupported RCS capability', href: '/app/analytics' },
  { id: 'a7', severity: 'info', title: '1 template awaiting approval', detail: 'Quote approval v2 pending compliance', href: '/app/templates' },
]

export type IntegrationState = 'connected' | 'available' | 'warning' | 'error'

export type Integration = {
  id: string
  name: string
  category: string
  state: IntegrationState
  lastEvent: string
  failedEvents: number
  latency: string
  short: string
}

export const integrations: Integration[] = [
  { id: 'salesforce', name: 'Salesforce', category: 'CRM', state: 'connected', lastEvent: '2m ago', failedEvents: 0, latency: '120ms', short: 'S' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', state: 'warning', lastEvent: '3h ago', failedEvents: 0, latency: '180ms', short: 'H' },
  { id: 'stripe', name: 'Stripe', category: 'Payments', state: 'connected', lastEvent: '1m ago', failedEvents: 0, latency: '90ms', short: 'S' },
  { id: 'google-calendar', name: 'Google Calendar', category: 'Scheduling', state: 'error', lastEvent: '5h ago', failedEvents: 2, latency: '210ms', short: 'C' },
  { id: 'zendesk', name: 'Zendesk', category: 'Support', state: 'available', lastEvent: '—', failedEvents: 0, latency: '—', short: 'Z' },
  { id: 'shopify', name: 'Shopify', category: 'Commerce', state: 'available', lastEvent: '—', failedEvents: 0, latency: '—', short: 'S' },
  { id: 'dynamics', name: 'Microsoft Dynamics', category: 'CRM', state: 'available', lastEvent: '—', failedEvents: 0, latency: '—', short: 'D' },
  { id: 'servicenow', name: 'ServiceNow', category: 'Support', state: 'available', lastEvent: '—', failedEvents: 0, latency: '—', short: 'N' },
  { id: 'calendly', name: 'Calendly', category: 'Scheduling', state: 'available', lastEvent: '—', failedEvents: 0, latency: '—', short: 'C' },
  { id: 'woocommerce', name: 'WooCommerce', category: 'Commerce', state: 'available', lastEvent: '—', failedEvents: 0, latency: '—', short: 'W' },
]

export type Contact = {
  id: string
  name: string
  phone: string
  rcsCapable: boolean
  consent: 'opted_in' | 'opted_out' | 'unknown'
  segment: string
  lastInteraction: string
  journey: string
  status: string
  language: string
  vehicle?: string
  source: string
}

export const contacts: Contact[] = [
  { id: 'c1', name: 'James Carter', phone: '+1 (404) 555-0123', rcsCapable: true, consent: 'opted_in', segment: 'Service due', lastInteraction: '4m ago', journey: 'Service reminder', status: 'Active', language: 'English', vehicle: '2022 Toyota Camry', source: 'Salesforce' },
  { id: 'c2', name: 'Sophia Nguyen', phone: '+1 (415) 555-0148', rcsCapable: true, consent: 'opted_in', segment: 'Payment due', lastInteraction: '22m ago', journey: 'Payment collection', status: 'Active', language: 'English', vehicle: '2021 Honda CR-V', source: 'Salesforce' },
  { id: 'c3', name: 'David Lee', phone: '+1 (206) 555-0192', rcsCapable: false, consent: 'opted_in', segment: 'SMS only', lastInteraction: '1h ago', journey: 'Delivery update', status: 'Active', language: 'English', vehicle: '2020 Ford F-150', source: 'HubSpot' },
  { id: 'c4', name: 'Emily Davis', phone: '+1 (312) 555-0177', rcsCapable: true, consent: 'opted_out', segment: 'Suppressed', lastInteraction: '3d ago', journey: '—', status: 'Opted out', language: 'English', source: 'Manual' },
  { id: 'c5', name: 'Michael Brown', phone: '+1 (713) 555-0165', rcsCapable: true, consent: 'opted_in', segment: 'New lead', lastInteraction: '2d ago', journey: 'New lead qualification', status: 'Active', language: 'Spanish', source: 'Webhook' },
  { id: 'c6', name: 'Olivia Wilson', phone: '+1 (617) 555-0139', rcsCapable: false, consent: 'unknown', segment: 'Unverified', lastInteraction: '5d ago', journey: '—', status: 'Pending consent', language: 'English', source: 'CSV import' },
]

export type ConvStatus = 'automated' | 'waiting_customer' | 'needs_agent' | 'agent_active' | 'resolved'

export type ConversationSummary = {
  id: string
  contactId: string
  name: string
  initials: string
  intent: string
  journey: string
  lastMessage: string
  status: ConvStatus
  time: string
  channel: 'rcs' | 'sms'
  unread: boolean
}

export const conversations: ConversationSummary[] = [
  { id: 'conv1', contactId: 'c1', name: 'James Carter', initials: 'JC', intent: 'Reschedule service', journey: 'Service reminder', lastMessage: 'Can I wait at the dealership?', status: 'needs_agent', time: '2m', channel: 'rcs', unread: true },
  { id: 'conv2', contactId: 'c2', name: 'Sophia Nguyen', initials: 'SN', intent: 'Pay balance', journey: 'Payment collection', lastMessage: 'Payment of $340.00 completed', status: 'resolved', time: '22m', channel: 'rcs', unread: false },
  { id: 'conv3', contactId: 'c3', name: 'David Lee', initials: 'DL', intent: 'Delivery window', journey: 'Delivery update', lastMessage: 'Reply 2 to reschedule delivery', status: 'waiting_customer', time: '1h', channel: 'sms', unread: false },
  { id: 'conv4', contactId: 'c5', name: 'Michael Brown', initials: 'MB', intent: 'New vehicle interest', journey: 'New lead qualification', lastMessage: 'What are you looking for?', status: 'automated', time: '2h', channel: 'rcs', unread: false },
  { id: 'conv5', contactId: 'c6', name: 'Olivia Wilson', initials: 'OW', intent: 'Opt-out', journey: '—', lastMessage: 'STOP', status: 'resolved', time: '5d', channel: 'sms', unread: false },
]

export type ChatMsg = {
  id: string
  from: 'business' | 'customer' | 'system' | 'agent'
  time: string
  text?: string
  card?: { image?: boolean; heading: string; description: string; actions: string[] }
  chips?: string[]
  selected?: string
}

export const demoThread: ChatMsg[] = [
  { id: 'm1', from: 'system', time: '9:02 AM', text: 'Journey "Service reminder" started — trigger: appointment due' },
  {
    id: 'm2',
    from: 'business',
    time: '9:02 AM',
    card: {
      image: true,
      heading: 'Your vehicle is due for service',
      description: 'Hi James, your 2022 Toyota Camry is due for its scheduled inspection.',
      actions: ['Book appointment', 'View services', 'Call us'],
    },
    chips: ['Reschedule', 'Not now'],
  },
  { id: 'm3', from: 'customer', time: '9:04 AM', text: 'Reschedule', selected: 'Reschedule' },
  { id: 'm4', from: 'system', time: '9:04 AM', text: 'Fetched available slots from booking system' },
  {
    id: 'm5',
    from: 'business',
    time: '9:04 AM',
    text: 'Here are the next available slots at Northstar Auto Care — Midtown:',
    chips: ['Today 4:30 PM', 'Tomorrow 10:00 AM', 'Fri 9:00 AM'],
  },
  { id: 'm6', from: 'customer', time: '9:05 AM', text: 'Tomorrow 10:00 AM', selected: 'Tomorrow 10:00 AM' },
  { id: 'm7', from: 'system', time: '9:05 AM', text: 'Booking updated in Salesforce — confirmation #A-4821' },
  {
    id: 'm8',
    from: 'business',
    time: '9:05 AM',
    card: {
      heading: 'Appointment confirmed',
      description: 'Tomorrow at 10:00 AM · Northstar Auto Care — Midtown · Confirmation #A-4821',
      actions: ['Add to calendar', 'Get directions'],
    },
  },
  { id: 'm9', from: 'customer', time: '9:07 AM', text: 'Can I wait at the dealership?' },
]

export type ApiLog = {
  id: string
  time: string
  method: string
  endpoint: string
  status: number
  duration: string
  corr: string
}

export const apiLogs: ApiLog[] = [
  { id: 'l1', time: '14:04:21', method: 'POST', endpoint: '/v1/messages', status: 202, duration: '184ms', corr: 'req_91LA' },
  { id: 'l2', time: '14:04:19', method: 'POST', endpoint: '/v1/webhook-events', status: 200, duration: '42ms', corr: 'req_91K7' },
  { id: 'l3', time: '14:03:55', method: 'POST', endpoint: '/v1/journeys/execute', status: 422, duration: '31ms', corr: 'req_91JN' },
  { id: 'l4', time: '14:03:41', method: 'GET', endpoint: '/v1/contacts/c1', status: 200, duration: '58ms', corr: 'req_91H2' },
  { id: 'l5', time: '14:02:10', method: 'POST', endpoint: '/v1/messages', status: 202, duration: '176ms', corr: 'req_90ZZ' },
  { id: 'l6', time: '14:01:58', method: 'POST', endpoint: '/v1/webhook-events', status: 500, duration: '2004ms', corr: 'req_90ZY' },
]

export type TemplateItem = {
  id: string
  name: string
  useCase: string
  channels: ('rcs' | 'sms')[]
  category: string
  usage: number
  conversion: number
  updated: string
}

export const templates: TemplateItem[] = [
  { id: 't1', name: 'Appointment reminder', useCase: 'Reduce no-shows with confirm / reschedule', channels: ['rcs', 'sms'], category: 'Booking', usage: 4820, conversion: 62, updated: '2d ago' },
  { id: 't2', name: 'Booking confirmation', useCase: 'Confirm details and add to calendar', channels: ['rcs', 'sms'], category: 'Booking', usage: 3900, conversion: 88, updated: '5d ago' },
  { id: 't3', name: 'Reschedule request', useCase: 'Offer available slots inline', channels: ['rcs', 'sms'], category: 'Booking', usage: 1200, conversion: 47, updated: '1w ago' },
  { id: 't4', name: 'Payment reminder', useCase: 'Secure link with deposit or full balance', channels: ['rcs', 'sms'], category: 'Payments', usage: 3110, conversion: 54, updated: '3d ago' },
  { id: 't5', name: 'Invoice ready', useCase: 'View invoice and pay from the thread', channels: ['rcs', 'sms'], category: 'Payments', usage: 2100, conversion: 51, updated: '4d ago' },
  { id: 't6', name: 'Payment receipt', useCase: 'Confirm and deliver receipt', channels: ['rcs', 'sms'], category: 'Payments', usage: 2600, conversion: 96, updated: '4d ago' },
  { id: 't7', name: 'Quote approval', useCase: 'Approve all or partial line items', channels: ['rcs'], category: 'Commerce', usage: 640, conversion: 43, updated: '1w ago' },
  { id: 't8', name: 'Order shipped', useCase: 'Track and manage delivery', channels: ['rcs', 'sms'], category: 'Delivery', usage: 2680, conversion: 71, updated: '3d ago' },
  { id: 't9', name: 'Delivery exception', useCase: 'Resolve failed delivery attempts', channels: ['rcs', 'sms'], category: 'Delivery', usage: 320, conversion: 58, updated: '2d ago' },
  { id: 't10', name: 'Customer welcome', useCase: 'Warm first branded message', channels: ['rcs', 'sms'], category: 'Support', usage: 1500, conversion: 34, updated: '2w ago' },
  { id: 't11', name: 'Support follow-up', useCase: 'Check resolution and gather feedback', channels: ['rcs', 'sms'], category: 'Support', usage: 980, conversion: 40, updated: '1w ago' },
  { id: 't12', name: 'Lead qualification', useCase: 'Route high-value prospects', channels: ['rcs', 'sms'], category: 'Support', usage: 1240, conversion: 38, updated: '4d ago' },
  { id: 't13', name: 'OTP verification', useCase: 'One-time code for sensitive actions', channels: ['rcs', 'sms'], category: 'Transactional', usage: 5200, conversion: 92, updated: '1d ago' },
]

export const campaigns = [
  { id: 'camp1', name: 'Winter service special', audience: 'Service due · 4,820', channel: 'RCS + SMS', schedule: 'Oct 12, 9:00 AM', delivered: '4,712', action: '28.4%', conversion: '11.2%', status: 'Completed' },
  { id: 'camp2', name: 'End-of-quarter offers', audience: 'All opted-in · 12,400', channel: 'RCS + SMS', schedule: 'Oct 20, 10:00 AM', delivered: '—', action: '—', conversion: '—', status: 'Scheduled' },
  { id: 'camp3', name: 'Tire rotation reminder', audience: 'Segment: SUV owners · 2,100', channel: 'RCS + SMS', schedule: 'Draft', delivered: '—', action: '—', conversion: '—', status: 'Draft' },
  { id: 'camp4', name: 'Loyalty check-in', audience: 'Repeat customers · 3,300', channel: 'RCS', schedule: 'Sending', delivered: '1,204', action: '31.1%', conversion: '—', status: 'Sending' },
]

export const messagesList = [
  { id: 'msg1', name: 'Service reminder — rich card', type: 'Rich card', channels: ['rcs', 'sms'] as ('rcs' | 'sms')[], status: 'Live', usedIn: 2, edited: '2h ago', perf: '26.1%' },
  { id: 'msg2', name: 'Payment request — invoice', type: 'Rich card', channels: ['rcs', 'sms'] as ('rcs' | 'sms')[], status: 'Live', usedIn: 1, edited: '1d ago', perf: '22.4%' },
  { id: 'msg3', name: 'Delivery status carousel', type: 'Carousel', channels: ['rcs'] as ('rcs' | 'sms')[], status: 'Approved', usedIn: 1, edited: '3d ago', perf: '19.8%' },
  { id: 'msg4', name: 'Quote approval', type: 'Rich card', channels: ['rcs'] as ('rcs' | 'sms')[], status: 'Testing', usedIn: 0, edited: '5d ago', perf: '—' },
  { id: 'msg5', name: 'Welcome message', type: 'Text', channels: ['rcs', 'sms'] as ('rcs' | 'sms')[], status: 'Draft', usedIn: 0, edited: '1w ago', perf: '—' },
]

export const funnel = [
  { stage: 'Sent', value: 48240, pct: 100 },
  { stage: 'Delivered', value: 46912, pct: 97 },
  { stage: 'Read', value: 37625, pct: 78 },
  { stage: 'Action', value: 12604, pct: 26 },
  { stage: 'Outcome', value: 8918, pct: 18 },
]

export const failureReasons = [
  { reason: 'Unsupported capability', count: 412 },
  { reason: 'Invalid number', count: 288 },
  { reason: 'Provider rejected', count: 176 },
  { reason: 'Webhook timeout', count: 154 },
  { reason: 'Integration error', count: 98 },
  { reason: 'Consent missing', count: 64 },
  { reason: 'Message validation', count: 41 },
]

export const topActions = [
  { action: 'Book appointment', count: 4820 },
  { action: 'Pay balance', count: 3110 },
  { action: 'Track order', count: 2680 },
  { action: 'Reschedule', count: 1980 },
  { action: 'Talk to agent', count: 720 },
  { action: 'Approve quote', count: 640 },
]

export const channelSplit = [
  { label: 'RCS', value: 78, color: 'var(--violet)' },
  { label: 'SMS fallback', value: 21, color: 'var(--signal-blue)' },
  { label: 'MMS', value: 1, color: 'var(--cyan)' },
]

export const brandChecklist = [
  { id: 'b1', label: 'Business identity', status: 'complete' as const },
  { id: 'b2', label: 'Brand assets', status: 'complete' as const },
  { id: 'b3', label: 'Messaging use cases', status: 'complete' as const },
  { id: 'b4', label: 'Consent & policies', status: 'complete' as const },
  { id: 'b5', label: 'SMS fallback', status: 'complete' as const },
  { id: 'b6', label: 'Test devices', status: 'pending' as const },
  { id: 'b7', label: 'RCS verification', status: 'complete' as const },
  { id: 'b8', label: 'Carrier review', status: 'pending' as const },
]

export const brandAgents = [
  { id: 'ba1', name: 'Northstar Auto Care', env: 'live', verification: 'approved', launch: 'Live', countries: 'US, CA', fallback: 'Active' },
  { id: 'ba2', name: 'Northstar Sales', env: 'test', verification: 'pending', launch: 'Pending carrier', countries: 'US', fallback: 'Active' },
]

export const apiKeys = [
  { id: 'k1', name: 'Production server', prefix: 'rcx_live_8f2a', env: 'Live', created: 'Aug 1, 2026', lastUsed: '2m ago', status: 'Active' },
  { id: 'k2', name: 'Staging worker', prefix: 'rcx_test_1b9c', env: 'Test', created: 'Jul 18, 2026', lastUsed: '3h ago', status: 'Active' },
  { id: 'k3', name: 'Legacy import', prefix: 'rcx_live_44de', env: 'Live', created: 'Mar 2, 2026', lastUsed: '2mo ago', status: 'Revoked' },
]

export const webhooks = [
  { id: 'w1', endpoint: 'https://api.northstar.example/rcx', events: 'message.*, journey.*', status: 'Active', success: '99.4%', last: '1m ago' },
  { id: 'w2', endpoint: 'https://hooks.northstar.example/delivery', events: 'delivery.*', status: 'Degraded', success: '86.1%', last: '5m ago' },
]

export const team = [
  { id: 'u1', name: 'Alex Rivera', email: 'alex@northstar.example', role: 'Owner', active: 'Now', status: 'Active' },
  { id: 'u2', name: 'Priya Shah', email: 'priya@northstar.example', role: 'Journey Manager', active: '10m ago', status: 'Active' },
  { id: 'u3', name: 'Marcus Chen', email: 'marcus@northstar.example', role: 'Support Agent', active: '1h ago', status: 'Active' },
  { id: 'u4', name: 'Dana White', email: 'dana@northstar.example', role: 'Developer', active: '2d ago', status: 'Active' },
  { id: 'u5', name: 'Sam Ortiz', email: 'sam@northstar.example', role: 'Compliance Reviewer', active: '5d ago', status: 'Suspended' },
]

export const roles = ['Owner', 'Admin', 'Developer', 'Journey Manager', 'Support Agent', 'Analyst', 'Compliance Reviewer']

export const permissions = ['View analytics', 'Create message', 'Publish journey', 'Send campaign', 'Access developer keys', 'Manage integrations', 'Manage brand', 'Manage team', 'View audit logs']

export const auditLog = [
  { id: 'au1', time: 'Oct 9, 14:04', user: 'Alex Rivera', action: 'Published journey', resource: 'Service reminder', result: 'Success', ip: '· Atlanta, US' },
  { id: 'au2', time: 'Oct 9, 13:41', user: 'Priya Shah', action: 'Edited message', resource: 'Payment request', result: 'Success', ip: '· Austin, US' },
  { id: 'au3', time: 'Oct 9, 12:20', user: 'Dana White', action: 'Created API key', resource: 'Staging worker', result: 'Success', ip: '· Remote' },
  { id: 'au4', time: 'Oct 8, 18:02', user: 'Sam Ortiz', action: 'Approved template', resource: 'Invoice ready', result: 'Success', ip: '· Denver, US' },
  { id: 'au5', time: 'Oct 8, 09:15', user: 'Marcus Chen', action: 'Took over conversation', resource: 'James Carter', result: 'Success', ip: '· Atlanta, US' },
]

export const journeyNodes = [
  { id: 'n1', type: 'trigger', label: 'Appointment created', sub: 'CRM field changed', x: 0 },
  { id: 'n2', type: 'message', label: 'Send reminder', sub: 'Service reminder — rich card', x: 1 },
  { id: 'n3', type: 'logic', label: 'Wait for response', sub: 'Timeout 24h', x: 2 },
  { id: 'n4', type: 'branch', label: 'Reschedule', sub: 'Suggested reply', x: 3 },
  { id: 'n5', type: 'integration', label: 'Fetch slots', sub: 'HTTP GET /slots', x: 4 },
  { id: 'n6', type: 'integration', label: 'Update booking', sub: 'Salesforce update', x: 5 },
  { id: 'n7', type: 'message', label: 'Send confirmation', sub: 'Booking confirmation', x: 6 },
  { id: 'n8', type: 'end', label: 'Booking completed', sub: 'Goal reached', x: 7 },
]
