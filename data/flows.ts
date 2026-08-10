// RCX prototype — customer-facing RCS flows (spec §22).
//
// Every flow is scripted data, not markup. The flow player (components/shared/flow-player.tsx)
// renders these through the shared phone-preview kit.
//
// Spec §22 requires all six stages in every flow:
//   trigger → context → decision → action → confirmation → recovery
//
// All entities are fictional demo data per §26.

import type { CarouselCard } from '@/components/shared/phone-preview'

export const FLOW_STAGES = [
  'trigger',
  'context',
  'decision',
  'action',
  'confirmation',
  'recovery',
] as const

export type FlowStage = (typeof FLOW_STAGES)[number]

export const stageLabel: Record<FlowStage, string> = {
  trigger: 'Trigger',
  context: 'Context',
  decision: 'Decision',
  action: 'Action',
  confirmation: 'Confirmation',
  recovery: 'Recovery',
}

/** A single rendered element inside the phone. */
export type FlowNode =
  | { kind: 'system'; text: string }
  | { kind: 'business'; text: string }
  | { kind: 'customer'; text: string }
  | { kind: 'typing' }
  | { kind: 'receipt'; status: 'sent' | 'delivered' | 'read'; time?: string }
  | { kind: 'chips'; chips: string[] }
  | { kind: 'sms'; text: string }
  | {
      kind: 'richCard'
      heading: string
      description: string
      actions: string[]
      image?: boolean
      imageSrc?: string
      time?: string
    }
  | { kind: 'carousel'; cards: CarouselCard[] }
  | { kind: 'payment'; business: string; invoice: string; amount: string; due: string }
  | { kind: 'bookingConfirmed'; title: string; time: string; location: string }
  | {
      kind: 'brandSheet'
      name: string
      category: string
      phone: string
      website: string
      privacy: string
    }
  | {
      kind: 'quote'
      title: string
      items: { label: string; price: string; recommended?: boolean }[]
      actions: string[]
    }
  | { kind: 'tracker'; title: string; steps: { label: string; done: boolean }[]; note?: string }

export type FlowStep = {
  id: string
  stage: FlowStage
  /** Short label for the stage rail. */
  label: string
  /** What is happening on the business side while this step plays. */
  systemNote: string
  /** The customer tap or reply that advanced the conversation into this step. */
  customerChoice?: string
  nodes: FlowNode[]
}

export type CustomerFlow = {
  id: string
  name: string
  useCase: string
  summary: string
  brand: string
  /** The business outcome this flow exists to produce (§2.1 outcome over message). */
  outcome: string
  /** What the same journey looks like when RCS is unavailable (§2.5). */
  smsFallback: string
  steps: FlowStep[]
}

/* ------------------------------------------------------------------ *
 * §22.1 — First-time trust
 * ------------------------------------------------------------------ */

const firstTimeTrust: CustomerFlow = {
  id: 'first-time-trust',
  name: 'First-time trust',
  useCase: 'Verified brand identity',
  summary:
    'A customer receives their first branded message and can check who is really messaging them before acting.',
  brand: 'Northstar Auto Care',
  outcome: 'Verified sender confirmed, appointment booked',
  smsFallback:
    'Northstar Auto: your Camry is due for service. Book: rcx.link/bk4821. Verify this number at northstarauto.example/contact. Reply STOP to opt out.',
  steps: [
    {
      id: 't1',
      stage: 'trigger',
      label: 'Message arrives',
      systemNote: 'CRM emits appointment_due. RCX checks RCS capability, then sends as verified sender.',
      nodes: [
        { kind: 'system', text: 'Today' },
        {
          kind: 'richCard',
          image: true,
          imageSrc: '/service-car.png',
          heading: 'Time for your next service',
          description:
            'Hi James — your 2022 Camry is due for its 30,000 mile service. We have openings this week.',
          actions: ['Book appointment', 'View services', 'Call us'],
          time: '9:41 AM',
        },
      ],
    },
    {
      id: 't2',
      stage: 'context',
      label: 'Who is this?',
      systemNote: 'Customer opens the sender profile. No RCX call — this is native to the messaging app.',
      customerChoice: 'Tap the sender name',
      nodes: [
        {
          kind: 'brandSheet',
          name: 'Northstar Auto Care',
          category: 'Automotive services',
          phone: '+1 (404) 555-0100',
          website: 'northstarauto.example',
          privacy: 'northstarauto.example/privacy',
        },
      ],
    },
    {
      id: 't3',
      stage: 'decision',
      label: 'Weigh the options',
      systemNote: 'Suggested replies are defined on the message, not generated at send time.',
      customerChoice: 'Back to conversation',
      nodes: [
        { kind: 'business', text: 'Anything you want to know before booking?' },
        { kind: 'chips', chips: ['What does it include?', 'How long does it take?', 'Book now'] },
      ],
    },
    {
      id: 't4',
      stage: 'action',
      label: 'Take action',
      systemNote: 'Postback fires to the booking integration. Slot held for 20 minutes.',
      customerChoice: 'Book now',
      nodes: [
        { kind: 'customer', text: 'Book now' },
        { kind: 'typing' },
        {
          kind: 'business',
          text: 'Great — next available is Thursday 10:00 AM at Northstar Midtown. Shall I hold it?',
        },
        { kind: 'chips', chips: ['Yes, hold it', 'Pick another time'] },
      ],
    },
    {
      id: 't5',
      stage: 'confirmation',
      label: 'Confirmed',
      systemNote: 'Booking created in the source system. Confirmation written back to the CRM record.',
      customerChoice: 'Yes, hold it',
      nodes: [
        { kind: 'customer', text: 'Yes, hold it' },
        {
          kind: 'bookingConfirmed',
          title: 'Appointment confirmed',
          time: 'Thursday, 10:00 AM',
          location: 'Northstar Midtown, 1200 Peachtree St',
        },
        { kind: 'receipt', status: 'read', time: '9:43 AM' },
      ],
    },
    {
      id: 't6',
      stage: 'recovery',
      label: 'Still unsure',
      systemNote:
        'If the customer doubts the sender, the verified profile and a real support number are always one tap away.',
      customerChoice: 'Is this really you?',
      nodes: [
        { kind: 'customer', text: 'How do I know this is really Northstar?' },
        {
          kind: 'business',
          text: 'Fair question. This conversation is a verified business channel — look for the check beside our name. You can also call us on +1 (404) 555-0100, the number listed on our website.',
        },
        { kind: 'chips', chips: ['Call the listed number', 'View verified profile'] },
      ],
    },
  ],
}

/* ------------------------------------------------------------------ *
 * §22.2 — Booking and rescheduling
 * ------------------------------------------------------------------ */

const serviceCards: CarouselCard[] = [
  {
    imageSrc: '/service-car.png',
    heading: '30k mile service',
    description: 'Full inspection, oil, filters and fluid top-up.',
    price: '$189',
    action: 'Choose',
  },
  {
    imageSrc: '/service-tires.png',
    heading: 'Tires & alignment',
    description: 'Rotation, balance and four-wheel alignment.',
    price: '$140',
    action: 'Choose',
  },
  {
    imageSrc: '/service-detail.png',
    heading: 'Detail package',
    description: 'Interior and exterior detail while you wait.',
    price: '$95',
    action: 'Choose',
  },
]

const bookingReschedule: CustomerFlow = {
  id: 'booking-reschedule',
  name: 'Booking and rescheduling',
  useCase: 'Booking',
  summary:
    'A customer picks a service, chooses a time, and later moves the appointment — without calling anyone.',
  brand: 'Northstar Auto Care',
  outcome: 'Appointment booked and rescheduled, no inbound call',
  smsFallback:
    'Northstar Auto: your Camry is due for service. Pick a time: rcx.link/bk4821. Reply HELP for help, STOP to opt out.',
  steps: [
    {
      id: 'b1',
      stage: 'trigger',
      label: 'Service reminder',
      systemNote: 'Scheduled journey node fires 7 days before the service window closes.',
      nodes: [
        { kind: 'system', text: 'Today' },
        {
          kind: 'richCard',
          image: true,
          imageSrc: '/service-car.png',
          heading: 'Your Camry is due for service',
          description: 'Pick the service you need and we will show you the next available times.',
          actions: ['View services', 'Call us'],
          time: '8:12 AM',
        },
      ],
    },
    {
      id: 'b2',
      stage: 'context',
      label: 'Choose a service',
      systemNote: 'Carousel is populated from the service catalogue integration, with live pricing.',
      customerChoice: 'View services',
      nodes: [
        { kind: 'customer', text: 'View services' },
        { kind: 'carousel', cards: serviceCards },
      ],
    },
    {
      id: 'b3',
      stage: 'decision',
      label: 'Pick a time',
      systemNote: 'Available slots fetched from Google Calendar for the selected location.',
      customerChoice: '30k mile service',
      nodes: [
        { kind: 'customer', text: '30k mile service — $189' },
        { kind: 'typing' },
        { kind: 'business', text: 'Northstar Midtown has these openings. Which suits you?' },
        { kind: 'chips', chips: ['Tomorrow 10:00 AM', 'Thursday 2:30 PM', 'Saturday 9:00 AM'] },
      ],
    },
    {
      id: 'b4',
      stage: 'action',
      label: 'Confirm booking',
      systemNote: 'Booking created. Deposit not required for this service type.',
      customerChoice: 'Tomorrow 10:00 AM',
      nodes: [
        { kind: 'customer', text: 'Tomorrow 10:00 AM' },
        {
          kind: 'bookingConfirmed',
          title: 'Booked — 30k mile service',
          time: 'Tomorrow, 10:00 AM',
          location: 'Northstar Midtown, 1200 Peachtree St',
        },
      ],
    },
    {
      id: 'b5',
      stage: 'confirmation',
      label: 'Reminder and check-in',
      systemNote: 'Reminder node fires 2 hours out with a check-in action.',
      customerChoice: 'Add to calendar',
      nodes: [
        { kind: 'system', text: 'Tomorrow, 8:00 AM' },
        {
          kind: 'business',
          text: 'See you at 10:00 AM. Reply when you arrive and we will bring your paperwork out.',
        },
        { kind: 'chips', chips: ['I have arrived', 'Running late', 'Reschedule'] },
        { kind: 'receipt', status: 'delivered', time: '8:00 AM' },
      ],
    },
    {
      id: 'b6',
      stage: 'recovery',
      label: 'Plans change',
      systemNote:
        'Reschedule re-enters the slot-selection node. The original booking is released back to the calendar.',
      customerChoice: 'Running late',
      nodes: [
        { kind: 'customer', text: 'Running about 20 minutes late' },
        { kind: 'typing' },
        {
          kind: 'business',
          text: 'No problem — your technician is holding the bay until 10:30. If you would rather move it, these are still open.',
        },
        { kind: 'chips', chips: ['I will be there by 10:30', 'Move to Thursday 2:30 PM'] },
      ],
    },
  ],
}

/* ------------------------------------------------------------------ *
 * §22.3 — Payment and deposit
 * ------------------------------------------------------------------ */

const paymentDeposit: CustomerFlow = {
  id: 'payment-deposit',
  name: 'Payment and deposit',
  useCase: 'Payments',
  summary:
    'An invoice becomes a completed payment in the conversation, with card details never leaving the secure checkout.',
  brand: 'Northstar Auto Care',
  outcome: 'Balance paid, receipt delivered, CRM updated',
  smsFallback:
    'Northstar Auto: invoice INV-4821 for $482.60 is ready. Pay securely: rcx.link/pay4821. Reply HELP for help, STOP to opt out.',
  steps: [
    {
      id: 'p1',
      stage: 'trigger',
      label: 'Invoice ready',
      systemNote: 'invoice.created webhook from the shop system starts the payment journey.',
      nodes: [
        { kind: 'system', text: 'Today' },
        {
          kind: 'payment',
          business: 'Northstar Auto Care',
          invoice: 'INV-4821',
          amount: '$482.60',
          due: 'Aug 14',
        },
      ],
    },
    {
      id: 'p2',
      stage: 'context',
      label: 'Check the detail',
      systemNote: 'Line items are read from the invoice — RCX does not store the amounts.',
      customerChoice: 'What is this for?',
      nodes: [
        { kind: 'customer', text: 'What is this for?' },
        {
          kind: 'quote',
          title: 'Invoice INV-4821',
          items: [
            { label: '30k mile service', price: '$189.00' },
            { label: 'Brake pads — front', price: '$280.00' },
            { label: 'Shop supplies', price: '$13.60' },
          ],
          actions: ['Pay in full', 'Pay a deposit', 'Ask a question'],
        },
      ],
    },
    {
      id: 'p3',
      stage: 'decision',
      label: 'Full or deposit',
      systemNote: 'Deposit split is configured on the journey node, not hard-coded in the message.',
      customerChoice: 'Pay a deposit',
      nodes: [
        { kind: 'customer', text: 'Can I pay half now?' },
        { kind: 'typing' },
        {
          kind: 'business',
          text: 'Yes — a 50% deposit of $241.30 today, balance on collection. Shall I set that up?',
        },
        { kind: 'chips', chips: ['Pay $241.30 deposit', 'Pay $482.60 in full'] },
      ],
    },
    {
      id: 'p4',
      stage: 'action',
      label: 'Secure checkout',
      systemNote:
        'Customer is handed to the hosted Stripe checkout. Card data never enters the conversation (§22.3, §31).',
      customerChoice: 'Pay $241.30 deposit',
      nodes: [
        { kind: 'customer', text: 'Pay $241.30 deposit' },
        {
          kind: 'payment',
          business: 'Northstar Auto Care',
          invoice: 'INV-4821 · deposit',
          amount: '$241.30',
          due: 'today',
        },
        { kind: 'system', text: 'Opens northstar.checkout.example — secure hosted page' },
      ],
    },
    {
      id: 'p5',
      stage: 'confirmation',
      label: 'Receipt',
      systemNote: 'payment.succeeded webhook returns. Invoice marked part-paid in the shop system.',
      customerChoice: 'Complete payment',
      nodes: [
        { kind: 'typing' },
        {
          kind: 'business',
          text: 'Payment received — thank you. Deposit $241.30 paid, $241.30 due on collection.',
        },
        { kind: 'chips', chips: ['Email my receipt', 'Pay the balance now'] },
        { kind: 'receipt', status: 'read', time: '11:07 AM' },
      ],
    },
    {
      id: 'p6',
      stage: 'recovery',
      label: 'Card declined',
      systemNote:
        'payment.failed re-enters the journey at the checkout node with the reason surfaced, not a dead end.',
      customerChoice: 'Simulate a decline',
      nodes: [
        { kind: 'system', text: 'Payment attempt failed — card declined' },
        {
          kind: 'business',
          text: 'That card was declined by your bank — nothing has been charged. You can try another card, or we can hold the booking and you pay on collection.',
        },
        { kind: 'chips', chips: ['Try another card', 'Pay on collection', 'Talk to someone'] },
      ],
    },
  ],
}

export const customerFlows: CustomerFlow[] = [firstTimeTrust, bookingReschedule, paymentDeposit]

export function getFlow(id: string): CustomerFlow | undefined {
  return customerFlows.find((f) => f.id === id)
}
