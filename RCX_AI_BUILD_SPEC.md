# RCX — Master AI Agent Website & SaaS Prototype Build Specification

**Version:** 1.0  
**Purpose:** Source-of-truth product, UX, visual, interaction, and prototype specification for an AI coding/design agent.  
**Product:** RCX — RCS customer-conversation operating platform  
**Prototype mode:** High-fidelity, responsive, interactive SaaS demo using mocked local data.  
**Primary goal:** Build a credible enterprise product that demonstrates how businesses can create, send, receive, automate, integrate, govern, and measure branded RCS customer journeys with SMS fallback.

---

# 0. AI AGENT EXECUTION INSTRUCTION

Build this product as a **real interactive web application**, not as a static design image.

The agent must:

1. Use the visual references in `./renderings/` as the primary style and layout target.
2. Preserve the RCX brand system defined below.
3. Implement the public marketing site and authenticated application shell.
4. Implement every core route and interaction described in this document.
5. Use reusable components and mocked local data only unless explicitly instructed otherwise.
6. Make navigation, tabs, filters, dialogs, message previews, workflow nodes, search, integration states, and toast notifications functional.
7. Design the product around **user outcomes** rather than around channel features.
8. Ensure the customer-facing RCS experience is shown inside realistic device previews wherever it helps explain the value.
9. Treat SMS fallback as a first-class state, not an afterthought.
10. Include empty, loading, error, permission, disconnected, pending-review, and success states where defined.
11. Do not invent customer logos, endorsements, or production performance claims.
12. Do not require live RCS credentials to run the prototype.

Recommended implementation:
- Next.js App Router + TypeScript
- React
- Tailwind CSS
- shadcn/ui or equivalent accessible primitives
- Lucide icons
- Recharts or equivalent for charts
- Local mocked JSON/TS data
- Client-side state for prototype interactions
- `next/font` using Geist or Inter

A simpler React/Vite implementation is acceptable if needed, but the information architecture and UX behavior must remain the same.

---

# 1. PRODUCT DEFINITION

## 1.1 Product statement

RCX is the operating platform businesses use to turn business events into verified, interactive customer conversations.

RCX connects existing systems such as CRMs, booking tools, payment processors, order-management platforms, support applications, and custom APIs to RCS journeys that customers can complete from their native messaging experience.

Core promise:

> **Turn every business event into a customer conversation.**

Secondary promise:

> **Design, automate, send, receive, govern, and measure branded RCS journeys from one workspace—with automatic SMS fallback.**

## 1.2 What RCX is

RCX combines:

- Visual RCS message creation
- Rich-card and carousel composition
- Journey/workflow automation
- Two-way conversation handling
- Live-agent handoff
- SMS/MMS fallback
- Brand and sender onboarding
- CRM / booking / payment / commerce integrations
- REST API and webhooks
- Campaign and transactional messaging
- Consent and opt-out controls
- Delivery and conversion analytics
- Developer logs and sandbox
- Multi-workspace governance

## 1.3 What RCX is not

Do not present RCX as:

- A new mobile messaging app customers must install
- A generic SMS blast tool
- A social network
- A telecom carrier
- A replacement for every CRM or contact center
- A payment processor
- An AI chatbot product first

RCX orchestrates the customer journey and integrates with systems of record.

---

# 2. PRODUCT PRINCIPLES

Every screen should reinforce these principles:

### 2.1 Outcome over message
Primary analytics are completed bookings, payments, resolved support cases, approvals, purchases, and qualified leads—not merely messages sent.

### 2.2 Customer control
Customers must be able to understand, choose, act, get help, change their mind, and recover from failure.

### 2.3 Verified trust
The verified brand, sender identity, logo, support identity, privacy information, and secure actions must feel central.

### 2.4 Progressive automation
Automation should handle predictable tasks and make human handoff obvious when needed.

### 2.5 Channel resilience
RCS is preferred when supported; SMS fallback must preserve the intent of the journey.

### 2.6 Integration first
RCX should visibly connect to the systems businesses already operate.

### 2.7 Governance by default
Consent, opt-out state, sender status, approvals, logs, roles, and audit history are product surfaces, not hidden backend concerns.

---

# 3. TARGET USERS & JOBS TO BE DONE

## 3.1 Operations / CX Manager

**Goal:** Know whether customer messaging is working and whether workflows are completing.

Needs:
- System health
- Completed customer outcomes
- Failures requiring attention
- Journey performance
- Agent handoffs
- Provider/fallback status
- Easy drill-down into root cause

Primary pages:
- Overview
- Analytics
- Conversations
- Journey health
- Integrations

## 3.2 Customer Support Agent

**Goal:** Resolve customer issues without making customers repeat information.

Needs:
- Conversation history
- Customer context
- Automation history
- Suggested actions
- Human takeover
- Internal notes
- CRM deep link
- Return conversation to automation

Primary page:
- Conversations

## 3.3 Journey / Marketing Manager

**Goal:** Create and optimize customer journeys without engineering every interaction.

Needs:
- Templates
- Message builder
- Journey builder
- Test send
- Approval
- Audience / campaign tools
- Conversion analytics
- SMS fallback preview

Primary pages:
- Messages
- Journeys
- Campaigns
- Templates
- Analytics

## 3.4 Developer / Integration Engineer

**Goal:** Connect business systems safely and debug production behavior.

Needs:
- API keys
- Webhooks
- SDK docs
- Event logs
- Correlation IDs
- Retry/replay
- Sandbox
- Provider responses
- Integration health

Primary pages:
- Developers
- Integrations

## 3.5 Compliance / Platform Administrator

**Goal:** Ensure senders, messages, access, consent, and retention meet internal requirements.

Needs:
- Brand verification
- Consent source
- Opt-out policy
- Role management
- Audit trail
- Template approval
- Data retention
- Sender status

Primary pages:
- Brand
- Settings
- Templates

## 3.6 Executive / Business Owner

**Goal:** Understand business value.

Needs:
- Revenue attributed
- Bookings completed
- Conversion rate
- Cost avoided
- Support resolution rate
- RCS vs SMS performance
- Trend direction

Primary pages:
- Overview
- Analytics

---

# 4. GLOBAL INFORMATION ARCHITECTURE

## 4.1 Public marketing routes

```text
/
├── /product
│   ├── /product/message-builder
│   ├── /product/journeys
│   ├── /product/conversations
│   ├── /product/analytics
│   ├── /product/integrations
│   └── /product/developer-platform
├── /solutions
│   ├── /solutions/booking
│   ├── /solutions/payments
│   ├── /solutions/order-tracking
│   ├── /solutions/support
│   ├── /solutions/reminders
│   └── /solutions/lead-conversion
├── /industries
│   ├── /industries/automotive
│   ├── /industries/home-services
│   ├── /industries/retail
│   ├── /industries/hospitality
│   └── /industries/financial-services
├── /developers
├── /pricing
├── /resources
├── /login
└── /signup
```

Only the homepage must be fully complete in the initial prototype. Secondary marketing routes may share reusable hero/solution layouts but must not 404.

## 4.2 Authenticated app routes

```text
/app
├── /app/overview
├── /app/conversations
├── /app/messages
│   ├── /app/messages/new
│   └── /app/messages/:id
├── /app/journeys
│   ├── /app/journeys/new
│   └── /app/journeys/:id
├── /app/campaigns
├── /app/templates
├── /app/contacts
├── /app/analytics
├── /app/integrations
├── /app/developers
│   ├── /app/developers/api-keys
│   ├── /app/developers/webhooks
│   ├── /app/developers/logs
│   ├── /app/developers/sandbox
│   ├── /app/developers/sdks
│   └── /app/developers/docs
├── /app/brand
└── /app/settings
    ├── /app/settings/general
    ├── /app/settings/team
    ├── /app/settings/roles
    ├── /app/settings/consent
    ├── /app/settings/billing
    └── /app/settings/audit
```

---

# 5. VISUAL SOURCE OF TRUTH

Use the files in `./renderings/`.

## 5.1 Primary reference board

![RCX reference board](./renderings/rcx-design-reference-board.png)

This establishes:
- Light enterprise SaaS mood
- Navy application navigation
- Violet/blue accents
- Spacious cards
- Phone-based rich-message preview
- Dense but readable dashboard
- Minimal gradients
- Soft border and shadow system

## 5.2 Homepage rendering

![RCX homepage rendering](./renderings/rcx-homepage-render.png)

## 5.3 Dashboard rendering

![RCX dashboard rendering](./renderings/rcx-dashboard-render.png)

## 5.4 Mobile rendering

![RCX mobile rendering](./renderings/rcx-mobile-render.png)

## 5.5 Customer-facing RCS examples

### Booking
![Booking](./renderings/rcs-booking-flow.png)

### Payment
![Payment](./renderings/rcs-payment-flow.png)

### Order tracking
![Order tracking](./renderings/rcs-order-tracking-flow.png)

### Reminder and reschedule
![Reminder](./renderings/rcs-reminder-reschedule-flow.png)

These RCS visuals are conceptual references. Recreate them as HTML/CSS device previews where practical rather than relying only on raster screenshots.

---

# 6. BRAND & DESIGN SYSTEM

## 6.1 Mood

- Modern
- Minimal
- Trusted
- Professional
- Friendly but not playful
- Technically sophisticated
- Calm
- Enterprise-ready

Avoid:
- Excessive neon
- Crypto-dashboard aesthetics
- Cartoon illustrations
- Heavy glassmorphism
- Giant empty hero sections
- Excessive gradient text
- Overuse of pill-shaped controls
- Generic stock-photo people at laptops

## 6.2 Color tokens

```css
--navy: #0D1238;
--violet: #6554E8;
--signal-blue: #3B82F6;
--light-violet: #EEF0FF;
--page: #F7F8FC;
--card: #FFFFFF;
--text: #15182B;
--muted: #6B7280;
--success: #16A36A;
--warning: #E8A317;
--error: #DC4C64;
--border: #E6E8F0;
--nav-muted: #AEB4D1;
```

Optional supporting colors:
- Cyan accent: `#22D3EE`
- Slate surface: `#F1F4F9`
- Dark developer section: `#080D25`

## 6.3 Typography

Preferred:
- Geist Sans
- Inter

Monospace:
- Geist Mono
- IBM Plex Mono

Suggested scale:

```text
Display XL: 60–72 / 1.02 / -0.04em
Display:    48–56 / 1.05 / -0.035em
H1:         40–48 / 1.1
H2:         32–38 / 1.15
H3:         22–26 / 1.2
Body L:     18 / 1.6
Body:       15–16 / 1.55
Small:      13–14 / 1.45
Micro:      11–12 / 1.35
```

## 6.4 Spacing

Use an 8px base grid.

Common:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48
- 64
- 80
- 96

App content padding:
- Desktop: 28–32px
- Tablet: 20–24px
- Mobile: 16px

## 6.5 Radius

- Inputs/buttons: 8–10px
- Cards: 12–16px
- Large surfaces/device shells: 20–28px

## 6.6 Shadow

Very restrained.

```css
box-shadow:
  0 1px 2px rgba(15,23,42,.04),
  0 8px 24px rgba(15,23,42,.05);
```

## 6.7 Icons

Use a single icon family, preferably Lucide.
Icons should be:
- 16px in compact controls
- 18–20px in navigation
- 20–24px in feature cards

---

# 7. GLOBAL APP SHELL

## 7.1 Desktop

Left sidebar:
- Width: 232–248px
- Background: dark navy
- RCX logo at top
- Workspace selector below logo or in top bar
- Navigation grouped by task
- Help and user controls anchored near bottom

Recommended grouping:

```text
WORKSPACE
Overview
Conversations

BUILD
Messages
Journeys
Campaigns
Templates

DATA
Contacts
Analytics

PLATFORM
Integrations
Developers
Brand

ADMIN
Settings
```

Top application bar:
- Page title / breadcrumb
- Workspace selector
- Environment badge: `Test` / `Live`
- Search or command palette trigger
- Notifications
- Help
- Avatar

## 7.2 Tablet

- Sidebar collapses to icon rail
- Expand with button
- Content remains two-column where possible

## 7.3 Mobile

Use:
- Top bar with logo / title / menu
- Drawer navigation
- Optional bottom nav only for 4 high-frequency destinations:
  - Overview
  - Conversations
  - Create
  - Analytics

The message builder and journey builder should become limited editor/preview experiences on phones rather than squeezing all three desktop panels.

---

# 8. PUBLIC HOMEPAGE

## 8.1 Navigation

Sticky header.

Left:
- RCX logo

Center:
- Product
- Solutions
- Industries
- Developers
- Pricing
- Resources

Right:
- Sign in
- Get started free

Behavior:
- Sticky with subtle blur and bottom border after scroll
- Dropdown menus on desktop
- Drawer menu on mobile

## 8.2 Hero

Eyebrow:

> THE OPERATING PLATFORM FOR BUSINESS RCS

Headline:

> **Richer conversations. Stronger connections.**

Supporting copy:

> Create, automate, and scale branded RCS experiences that turn ordinary customer messages into completed bookings, payments, purchases, and support outcomes.

Actions:
- Primary: **Get started free**
- Secondary: **View product demo**

Trust metadata:
- RCS + SMS fallback
- Two-way messaging
- API-first
- Provider independent

Right side:
- Realistic phone preview
- Northstar Auto verified sender
- Service reminder rich card
- Image
- Book appointment
- View services
- Call
- Suggested replies

Surround phone with subtle animated connection lines:
- Salesforce
- Booking API
- Stripe
- SMS fallback

Do not make this animation distracting.

## 8.3 Benefit strip

Six cards:

1. Branded & verified
2. Rich interactive messages
3. Two-way conversations
4. Powerful integrations
5. Actionable analytics
6. Secure & governed

Each card:
- Icon
- 2–4 word heading
- 1 sentence benefit
- No long copy

## 8.4 Workflow explanation

Heading:

> **From system event to completed action.**

Horizontal flow:

```text
Business event
→ RCX journey
→ Branded RCS
→ Customer action
→ Source system updated
```

Example beneath:

```text
Invoice created
→ Payment message sent
→ Customer pays
→ Receipt delivered
→ CRM updated
```

## 8.5 Product showcase

Tabs:
- Message Builder
- Journey Builder
- Conversations
- Analytics
- Integrations
- Developer Tools

Behavior:
- Selecting a tab changes the large product preview
- Tabs work with keyboard navigation
- Use real product UI, not abstract illustrations

## 8.6 Use cases

Cards:
- Booking & rescheduling
- Payments & deposits
- Order tracking
- Customer support
- Reminders
- Lead conversion

Each card must show:
- Customer problem
- Tiny message preview
- Business outcome
- CTA: Explore solution

Example:
**Booking & rescheduling**
“Let customers choose a slot, confirm, reschedule, and add to calendar without calling.”

## 8.7 Integrations

Heading:

> **Connect the systems you already use.**

Integration tiles:
- Salesforce
- HubSpot
- Stripe
- Shopify
- Zendesk
- Google Calendar
- Microsoft Dynamics
- REST API
- Webhooks

Group by:
- CRM
- Payments
- Commerce
- Support
- Scheduling
- Developer

## 8.8 RCS vs SMS fallback

Side-by-side cards.

RCS:
- Verified brand
- Rich image/card
- Buttons
- Suggested replies
- Read/action tracking

SMS:
- Brand name in text
- Concise content
- Secure link
- Reply HELP / STOP
- Delivery status

Key copy:

> **Every journey should still work when RCS does not.**

## 8.9 Developer section

Dark background.

Heading:

> **One API for every customer conversation.**

Code:

```javascript
await rcx.messages.send({
  recipient: "+14045550123",
  journey: "appointment-reminder",
  data: {
    customerName: "James",
    appointmentTime: "2026-08-07T10:00:00-04:00"
  }
});
```

Capabilities:
- REST API
- Webhooks
- Node SDK
- Python SDK
- Java SDK
- Idempotency
- Sandbox
- API logs

## 8.10 Security / governance

Cards:
- Consent controls
- Opt-out enforcement
- RBAC
- Audit logs
- Template approvals
- Signed webhook verification

No unsupported compliance badges or certifications.

## 8.11 Final CTA

Headline:

> **Turn every business event into a customer conversation.**

Actions:
- Start building
- Talk to an RCS specialist

---

# 9. AUTHENTICATION & ONBOARDING

## 9.1 Sign up

Fields:
- Work email
- Password or SSO placeholder
- Company
- Country
- Role

Simple, premium layout.
Avoid asking for carrier/RCS implementation details before the user sees value.

## 9.2 Initial product onboarding

Step 1:
> What do you want to accomplish?

Cards:
- Book appointments
- Collect payments
- Send order updates
- Automate support
- Send reminders
- Build from scratch

Step 2:
> How will RCX connect to your business?

Options:
- Use an integration
- Use API / webhooks
- Upload contacts
- I am exploring

Step 3:
> Create your first experience

Open template with a simulated brand and live phone preview.

Step 4:
> Send a test

Test recipient or demo simulation.

Step 5:
> Set up your branded RCS agent

Move into brand onboarding.

## 9.3 Activation milestone

Consider the user “activated” when they:
- Create one message
- Create or use an SMS fallback
- Send or simulate a test
- Connect one source or choose manual audience
- Start RCS brand setup

---

# 10. OVERVIEW DASHBOARD — PRIMARY PRODUCT HOME

The dashboard must answer four questions in under 10 seconds:

1. Is messaging operating normally?
2. Are customers engaging?
3. Are journeys producing business outcomes?
4. What needs my attention?

## 10.1 Page header

Left:
- `Overview`
- Brief contextual subtitle: `Here is how your customer journeys are performing.`

Right:
- Date range
- Workspace / brand selector
- Environment: Test / Live
- Export
- `Create` primary button

## 10.2 Quick actions

Prominent but compact:

- Create message
- Build journey
- Start campaign
- Import contacts

Do not let quick actions dominate the page.

## 10.3 KPI scorecard

Primary row should favor outcomes:

- Completed outcomes
- RCS eligibility
- Delivery rate
- Action rate
- SMS fallback rate
- Attributed revenue

Secondary details:
- Messages sent
- Read
- Replies
- Opt-outs

Example demo data:

```text
Messages sent        48,240
RCS eligibility      78.4%
Delivered            46,912
Read                  37,625
Action rate           26.1%
Replies               8,440
Completed outcomes    12,604
SMS fallback          21.6%
Attributed revenue    $84,240
Opt-out rate          0.31%
```

Cards need:
- Main number
- Change vs prior period
- Tiny sparkline if appropriate
- Tooltip explaining definition

## 10.4 Business outcomes section

Large chart:

**Completed outcomes over time**

Stack or filter by:
- Bookings
- Payments
- Approvals
- Resolutions
- Purchases
- Qualified leads

Display:
- Total completed
- Value associated
- Trend

## 10.5 Journey performance table

Columns:
- Journey
- Status
- Sent / entered
- Completion rate
- RCS rate
- Value
- Failure rate
- Last updated
- Action menu

Example journeys:
- Service reminder
- Payment collection
- Delivery update
- New lead qualification
- Appointment reschedule

## 10.6 Requires attention panel

This is one of the most important dashboard elements.

Examples:
- 18 failed webhooks
- Carrier review pending
- 4 conversations waiting for an agent
- Payment journey completion dropped 12%
- Stripe integration authentication expires soon
- 52 customers received SMS fallback due to unsupported capability
- One message template awaiting approval

Clicking any item takes the user to the relevant page/filter.

Severity:
- Info
- Warning
- Critical

## 10.7 Integration health

Show:
- Salesforce — Healthy
- Stripe — Healthy
- Google Calendar — 2 failed events
- HubSpot — Reauthorization needed

Data:
- Last event
- Error count
- Latency indicator

## 10.8 Recent conversations

Rows:
- Avatar / initials
- Customer
- Current intent
- Journey
- Last message
- Status
- Time
- Channel badge

Statuses:
- Automated
- Waiting on customer
- Needs agent
- Resolved

## 10.9 Active RCS agents

Small card:
- Northstar Auto Care — Live / Approved
- Northstar Sales — Test / Pending carrier
- SMS fallback — Active

Click → Brand page.

## 10.10 Dashboard states

Empty:
> No live journeys yet. Build your first customer journey.

Partial setup:
> Your agent is not live yet. You can continue testing while verification is pending.

Error:
> Some metrics could not be loaded. Operational messaging is unaffected.

---

# 11. CONVERSATIONS

Purpose: unified two-way operational inbox.

## 11.1 Desktop layout

Three columns:

### Left — Queue

Width: 300–340px.

Contains:
- Search
- Filter chips
- Status tabs
- Conversation list
- Unread marker
- Assignment avatar
- Channel badge

Filters:
- All
- Needs agent
- Waiting for customer
- Automated
- Resolved
- RCS
- SMS
- Journey
- Assignee

### Center — Conversation

Header:
- Customer
- Channel
- Current journey
- Automation state
- Assignee
- `Take over` / `Resume automation`

Content:
- Timestamped messages
- Rich cards
- Buttons
- Suggested replies
- Customer selections
- System events in subtle inline format
- Payment / booking completion confirmations
- Agent messages

Composer:
- Text
- Attach
- Rich message
- Saved reply
- Emoji optional
- Send
- Internal note mode

### Right — Context

Cards:
- Customer identity
- Phone
- RCS capable
- Consent status
- Preferred language
- CRM record
- Account / vehicle / order data
- Journey state
- Conversation owner
- Recent business events
- Internal notes
- View in CRM

## 11.2 Handoff behavior

Automation active:
- Banner: `RCX is handling this conversation`
- Button: `Take over`

After takeover:
- Banner: `Automation paused`
- Agent composer active
- Button: `Return to automation`

Before resuming:
- Optional dialog summarizing next automation step

## 11.3 Demo conversation

Northstar Auto / James Carter.

Flow:
1. Service reminder
2. Customer chooses Reschedule
3. Available slots returned
4. Customer chooses Tomorrow 10:00 AM
5. Booking confirmed
6. Add to Calendar
7. Customer asks: “Can I wait at the dealership?”
8. Automation offers answer or agent handoff

## 11.4 Conversation edge states

- Customer opted out
- SMS fallback
- Customer sent unsupported file
- Webhook failure
- API action failed
- Payment expired
- Agent joined
- Conversation closed
- Spam / abuse flag
- Consent missing

---

# 12. MESSAGE LIBRARY & MESSAGE BUILDER

## 12.1 Messages list

Columns/cards:
- Name
- Type
- Channel support
- Last edited
- Status
- Used in journeys
- Performance
- Menu

Statuses:
- Draft
- Testing
- Approved
- Live
- Archived

Actions:
- New message
- Duplicate
- Test
- Edit
- Archive

## 12.2 Builder layout

Desktop three-panel layout.

### Left — Components

Categories:

**Content**
- Text
- Image
- Video placeholder
- Rich card
- Carousel
- Divider

**Replies**
- Suggested reply

**Actions**
- Open URL
- Call
- Calendar
- Location
- Custom postback

**Data**
- Variable
- Conditional content placeholder

### Center — Canvas

Editable message composition.

Service reminder example:
- Hero image
- Heading: `Time for your next service`
- Description
- Book appointment
- View services
- Call us

Behaviors:
- Select component
- Reorder
- Duplicate
- Delete
- Edit inline
- Show validation issue inline

### Right — Device preview / inspector

Toggle:
- Android
- iOS

Channel toggle:
- RCS
- SMS fallback

Tabs:
- Preview
- Component settings

Phone preview updates as the builder changes.

## 12.3 Bottom configuration tabs

- Variables
- Validation
- Accessibility
- Fallback
- Tracking

### Variables

Examples:
- `{{first_name}}`
- `{{vehicle}}`
- `{{appointment_time}}`
- `{{balance_due}}`

Allow demo values.

### Validation

Warnings:
- Missing SMS fallback
- Button label too long
- Missing alt text
- Missing URL
- Required variable not mapped
- Unsupported action in fallback
- Too many actions
- Message likely exceeds SMS segment budget

### Accessibility

- Image alt text
- Descriptive button text
- Contrast warning
- Avoid emoji-only actions

### Fallback

Editable SMS representation:

> Northstar Auto: Your Camry is due for service. Book: rcx.link/a81K. Need help? Reply HELP. STOP to opt out.

### Tracking

Toggle:
- Track read
- Track button actions
- Conversion goal mapping
- UTM-like metadata
- Campaign / journey attribution

## 12.4 Builder controls

Top:
- Message name
- Draft status
- Save
- Send test
- Preview
- More

Test action:
- Opens modal
- Select test recipient
- Preview channel
- Simulate success
- Toast: `Test message sent`

---

# 13. JOURNEYS

## 13.1 Journey list

Cards/table:
- Journey name
- Trigger
- Status
- Active contacts
- Completion rate
- Value
- Last published

Actions:
- New
- Duplicate
- Pause
- Archive
- View analytics

## 13.2 Journey builder

Three panels.

### Left — Node library

Groups:

**Start**
- API event
- Webhook
- Schedule
- Contact event
- CRM field changed
- Payment due
- Order status

**Message**
- Send message
- Present reply options
- Send fallback
- Request free text

**Logic**
- Wait
- Condition
- Split
- Capability check
- Time window

**Integrations**
- HTTP request
- Create booking
- Generate payment link
- Update CRM
- Create support ticket
- Publish event

**Human**
- Assign agent
- Pause automation
- Notify team
- Approval

**End**
- Goal
- End journey

### Center — Canvas

Example flow:

```text
Appointment created
        ↓
Send reminder
        ↓
Wait for response
        ↓
   ┌────┴────┐
Confirm   Reschedule
   │          │
   │      Fetch slots
   │          ↓
   │      Present slots
   │          ↓
   │      Update booking
   │          │
   └────┬─────┘
        ↓
Send confirmation
        ↓
Add to calendar
        ↓
Booking completed
```

Nodes:
- Selectable
- Draggable-looking
- Connections visible
- Validation badges
- Error path shown where configured

### Right — Node inspector

Fields vary by node.

Common:
- Name
- Description
- Input mapping
- Output mapping
- Timeout
- Retry
- Error path
- Environment

API node:
- Method
- Endpoint
- Authentication
- Headers
- Request mapping
- Response mapping

## 13.3 Journey top controls

- Back
- Journey name
- Draft/Published badge
- Version
- Test
- Save draft
- Publish

## 13.4 Test mode

Click Test:
- Opens side panel
- Choose sample customer
- Step through execution
- Highlight active node
- Show simulated event payloads
- Allow branch selection
- Show final outcome

## 13.5 Journey health

For live journeys, show:
- Entrants
- Currently waiting
- Completed
- Failed
- Average duration
- Drop-off node
- Fallback share

---

# 14. CAMPAIGNS

Campaigns are for planned outbound sends to an audience. Keep them distinct from event-driven journeys.

## 14.1 Campaign list

- Draft
- Scheduled
- Sending
- Completed
- Paused

Columns:
- Campaign
- Audience
- Channel
- Schedule
- Delivered
- Action rate
- Conversion
- Status

## 14.2 Four-step campaign builder

### Step 1 — Audience

Options:
- Saved segment
- Contact list
- CSV
- CRM query
- Test audience

Display:
- Audience size
- Valid phone numbers
- Consent-qualified
- Estimated RCS capable
- Estimated SMS fallback
- Suppressed/opted out

### Step 2 — Message

- Select template
- Create message
- Preview
- SMS fallback
- Personalization variables

### Step 3 — Schedule

- Send now
- Schedule
- Time zone behavior
- Quiet-hour check
- Rate limit placeholder

### Step 4 — Review

Show:
- Audience
- RCS estimate
- Fallback estimate
- Message preview
- Missing variables
- Compliance checks
- Cost estimate placeholder
- Approval status

Actions:
- Send test
- Save draft
- Schedule / Send

---

# 15. TEMPLATES

## 15.1 Library

Search + filter.

Filters:
- All
- RCS
- SMS
- Transactional
- Support
- Commerce
- Booking
- Payments
- Delivery

Templates:
- Appointment reminder
- Booking confirmation
- Reschedule request
- Payment reminder
- Invoice ready
- Payment receipt
- Quote approval
- Order shipped
- Delivery update
- Delivery exception
- Customer welcome
- Support follow-up
- Lead qualification
- OTP verification

## 15.2 Card information

- Preview thumbnail
- Name
- Use case
- Channels
- Last updated
- Usage count
- Conversion rate if demo data exists

Actions:
- Preview
- Use template
- Duplicate

## 15.3 Template detail

Tabs:
- Preview
- Content
- Fallback
- Usage
- Performance
- Version history

---

# 16. CONTACTS

Purpose: enough customer-data UX for demo, without pretending RCX replaces a CRM.

## 16.1 List

Columns:
- Customer
- Phone
- RCS capability
- Consent
- Segment
- Last interaction
- Journey
- Status

Filters:
- RCS capable
- SMS only
- Opted in
- Opted out
- Segment
- Last activity

## 16.2 Contact detail drawer/page

Sections:
- Identity
- Channel capability
- Consent timeline
- Messaging preferences
- Active journeys
- Conversation history
- Source system
- Custom attributes
- Suppression status

Actions:
- Start conversation
- Add to journey
- Opt out
- View in source system

---

# 17. ANALYTICS

Analytics must connect messaging activity to business outcomes.

## 17.1 Global filters

- Date
- Agent / brand
- Journey
- Campaign
- Provider
- Country
- Carrier
- Channel
- Customer segment

Filters should visibly update labels/data in prototype.

## 17.2 Overview metrics

- Messages sent
- Delivered
- Read
- Actions
- Replies
- Completed outcomes
- Revenue
- Bookings
- RCS share
- SMS fallback
- Opt-out rate

## 17.3 Conversion funnel

```text
Entered / Sent
→ Delivered
→ Read
→ Action
→ Business outcome
```

Show counts and percentages.

## 17.4 RCS vs SMS

Comparison:
- Delivered
- Click/action
- Completion
- Revenue/value
- Opt-out

Avoid implying causal lift unless demo copy labels it clearly as sample data.

## 17.5 Journey performance table

Columns:
- Journey
- Entered
- Completion
- Median time to completion
- RCS share
- Fallback share
- Value
- Failure
- Opt-out

## 17.6 Channel performance

Donut:
- RCS
- SMS fallback
- MMS if included

## 17.7 Failure reasons

Bar chart/table:
- Unsupported capability
- Invalid number
- Provider rejected
- Webhook timeout
- Integration error
- Consent missing
- Message validation
- Customer action expired

## 17.8 Top customer actions

- Book appointment
- Pay balance
- Track order
- Reschedule
- Talk to agent
- Approve quote

## 17.9 Executive outcome section

Cards:
- Revenue attributed
- Bookings completed
- Payments completed
- Support cases resolved
- Calls avoided placeholder
- Average completion time

---

# 18. INTEGRATIONS

## 18.1 Integration catalog

Connected:
- Salesforce
- HubSpot
- Stripe
- Google Calendar

Available:
- Zendesk
- Shopify
- Microsoft Dynamics
- ServiceNow
- Calendly
- WooCommerce

Developer:
- REST API
- Webhooks
- Custom connector

## 18.2 Integration card

Show:
- Logo/icon
- Name
- Category
- Connected state
- Health
- Last successful sync
- Failed events
- Configure

## 18.3 Integration detail

Tabs:
- Overview
- Authentication
- Events
- Data mapping
- Logs

Overview:
- Connection status
- Account/workspace
- Last event
- Latency
- Failure rate

Events:
- Toggle event subscriptions

Data mapping:
- Source field → RCX field

Logs:
- Recent events
- Status
- Duration
- Retry

## 18.4 Connect interaction

`Connect` opens modal:
- Permissions summary
- Mock authorize
- Select workspace
- Confirm

On success:
- Card becomes Connected
- Toast
- Integration health entry appears

---

# 19. DEVELOPER CONSOLE

## 19.1 Developer overview

Cards:
- API status
- Requests today
- Webhook success rate
- Avg response
- Errors
- Sandbox status

Quick links:
- Create API key
- Add webhook
- Send test request
- View docs

## 19.2 API keys

Table:
- Name
- Prefix
- Environment
- Created
- Last used
- Status

Create key:
- Name
- Scope
- Environment
- Expiration optional

Prototype must display secret once in modal and then mask it.

## 19.3 Webhooks

Table:
- Endpoint
- Events
- Status
- Success rate
- Last delivery

Actions:
- Add
- Test
- Disable
- Rotate signing secret placeholder

## 19.4 API logs

Columns:
- Time
- Method
- Endpoint
- Status
- Duration
- Correlation ID

Expandable row shows:
- Request
- Response
- Provider request
- Provider response
- Retry history
- Related customer
- Related conversation
- Replay webhook action

Example:

```text
14:04:21  POST  /v1/messages          202  184ms  req_91LA
14:04:19  POST  /v1/webhook-events   200   42ms  req_91K7
14:03:55  POST  /v1/journeys/execute 422   31ms  req_91JN
```

## 19.5 Sandbox

Controls:
- Sample phone/customer
- RCS capable toggle
- SMS-only toggle
- Select template
- Send simulated message
- Simulate inbound reply
- Simulate read receipt
- Simulate delivery failure

## 19.6 Docs / SDKs

Cards:
- Node
- Python
- Java
- cURL
- Webhooks
- API reference

Show copyable starter snippets.

---

# 20. BRAND & RCS AGENT ONBOARDING

This should be a first-class guided workflow.

## 20.1 Brand list

Each agent:
- Name
- Logo
- Environment
- Verification state
- Launch state
- Countries
- Fallback sender

## 20.2 Setup checklist

1. Business identity
2. Brand assets
3. Messaging use cases
4. Consent & policies
5. SMS fallback
6. Test devices
7. Verification submission
8. Launch status

## 20.3 Example statuses

```text
Business identity       Complete
Brand assets            Complete
Compliance review       Complete
RCS verification        Approved
Carrier review          Pending
SMS fallback            Active
Production traffic      Not enabled
```

Use:
- Green = complete/approved
- Amber = pending/review
- Red = blocked/error
- Gray = not started

## 20.4 Brand profile

Fields:
- Legal name
- Public agent name
- Logo
- Hero/banner
- Brand color
- Website
- Privacy URL
- Terms URL
- Support phone
- Support email
- Description

## 20.5 Messaging use cases

Select:
- Transactional
- Support
- Marketing
- Authentication
- Booking
- Payments
- Delivery

Include sample-message review.

## 20.6 Test devices

Table:
- Phone
- Device label
- Capability
- Added by
- Last tested

---

# 21. SETTINGS

## 21.1 General

- Workspace name
- Time zone
- Default country
- Default language
- Data retention placeholder
- Environment

## 21.2 Team

Table:
- Name
- Email
- Role
- Last active
- Status

Actions:
- Invite
- Remove
- Suspend

## 21.3 Roles

Default roles:
- Owner
- Admin
- Developer
- Journey Manager
- Support Agent
- Analyst
- Compliance Reviewer

Permission matrix:
- View analytics
- Create message
- Publish journey
- Send campaign
- Access developer keys
- Manage integrations
- Manage brand
- Manage team
- View audit logs

## 21.4 Consent

Settings:
- Default opt-out keywords display
- Consent source tracking
- Suppression policy
- Marketing vs transactional categories
- Preference center placeholder
- Quiet hours

## 21.5 Billing

Prototype only:
- Plan
- Message usage
- Platform usage
- Estimated monthly total
- Payment method placeholder

No real payment collection needed.

## 21.6 Audit log

Columns:
- Time
- User
- Action
- Resource
- Result
- IP/location placeholder

Filters:
- User
- Action
- Date
- Resource

---

# 22. CUSTOMER-CENTERED RCS FLOWS TO MOCK

These are critical. The product must demonstrate the experience of the **person receiving the message**, not just the business operator.

Every flow must contain six states:

1. Trigger
2. Context
3. Decision
4. Action
5. Confirmation
6. Recovery

## 22.1 First-time trust flow

Scenario:
Customer receives first Northstar Auto RCS message.

Flow:
```text
Verified message arrives
→ Customer opens brand identity
→ Sees logo, verified status, support and privacy
→ Returns to message
→ Chooses action
→ Confirmation
```

Mock:
- Notification
- Verified sender header
- Business info sheet
- Rich card
- Action
- Success

Purpose:
Explain why verified branded messaging creates more trust than an unfamiliar short code.

## 22.2 Full booking and rescheduling

Flow:
```text
Service reminder
→ Select service
→ Choose location
→ Select date/time
→ Confirm price/deposit if needed
→ Book
→ Add to calendar
→ Reminder
→ Check in
```

Recovery:
- Slot unavailable
- Different location
- Cancel
- API failure
- SMS fallback

## 22.3 Payment and deposit

Flow:
```text
Invoice ready
→ View invoice
→ Ask question OR pay
→ Choose deposit/full balance
→ Secure hosted checkout
→ Payment confirmation
→ Receipt
```

Recovery:
- Declined
- Expired link
- Dispute amount
- Already paid
- Payment plan request

Never collect raw card data inside the RCS conversation.

## 22.4 Quote review and partial approval

Ideal verticals:
- Automotive
- Home services
- Insurance
- Professional services

Example:

```text
Recommended repairs

Brake pads         $280
Air filter          $45
Wheel alignment    $110

[Approve all]
[Choose services]
[Ask a question]
```

Flow:
- Quote ready
- Review items
- Expand details
- Approve all / partial
- Generate revised total
- Pay deposit
- Schedule work

## 22.5 Order delivery exception

Normal:
```text
Order shipped
→ Track
→ Out for delivery
→ View window
→ Delivered
```

Exception:
```text
Delivery attempt failed
→ Deliver tomorrow
→ Pickup location
→ Leave with neighbor
→ Contact support
→ Confirmation
```

This demonstrates two-way operational control.

## 22.6 Customer support + human handoff

Flow:
```text
Customer asks question
→ Intent identified
→ Helpful options
→ Guided diagnostic
→ Resolve OR escalate
→ Agent receives context
→ Agent joins
→ Resolution
```

Important:
- Customer must not repeat information
- Show `A team member has joined the conversation`
- Automation pauses visibly
- Agent can return conversation to automation

## 22.7 Reminder / no-show prevention

Stages:
- 7 days
- 1 day
- 2 hours

Actions:
- Confirm
- Reschedule
- Cancel
- Running late
- Join waitlist
- Check in

Interesting branch:
Customer says “I’m running 15 minutes late.”
RCX updates the booking system and replies with policy/status.

## 22.8 Renewal / subscription management

Flow:
- Renewal approaching
- Review plan
- Keep
- Upgrade/downgrade
- Update payment method
- Confirm renewal

Recovery:
- Payment expired
- Price changed
- Ask retention/support

## 22.9 Abandoned action recovery

Flow:
```text
Customer starts booking/payment
→ Leaves
→ Follow-up
→ Resume exact step
→ Completion
```

Example:
> Your appointment was not reserved. The 10:00 AM slot is still available for the next 20 minutes.

Actions:
- Finish booking
- Choose another time

## 22.10 Lead qualification

Flow:
- Customer expresses interest
- Product/service selection
- 2–3 qualifying questions
- Recommendation
- Appointment / consultation
- Sales handoff with context

Customer should receive value, not feel like they are completing a form.

## 22.11 Messaging preferences

Allow:
- Transactional updates
- Appointment reminders
- Promotional offers
- Delivery alerts
- Preferred language
- Quiet hours
- Preferred channel

## 22.12 Opt-out / resubscribe

Flow:
- Customer sends STOP
- Immediate confirmation
- Explain essential messages if applicable
- Preference-center link
- Re-subscription placeholder

## 22.13 Identity verification

For sensitive actions:
- Secure verification prompt
- One-time code / signed link concept
- Success
- Expired state
- Suspicious request state

---

# 23. INTERNAL USER FLOWS TO MOCK

## 23.1 Operations manager recovery

```text
Dashboard alert
→ 18 failed webhooks
→ Open filtered logs
→ Inspect root cause
→ Retry/replay
→ Confirm recovery
→ Dashboard clears alert
```

## 23.2 Support agent

```text
Needs-agent queue
→ Open conversation
→ See automation context
→ Take over
→ Respond
→ Update CRM placeholder
→ Resolve
→ Return to automation or close
```

## 23.3 Journey manager

```text
Choose template
→ Customize message
→ Configure fallback
→ Build journey
→ Test with sample customer
→ Request/mark approval
→ Publish
→ View analytics
```

## 23.4 Developer

```text
Create API key
→ Sandbox request
→ Receive simulated webhook
→ Inspect logs
→ Trigger failure
→ Replay
→ Mark integration production-ready
```

## 23.5 Compliance reviewer

```text
Template pending approval
→ Review content
→ Check consent category
→ Review fallback/opt-out
→ Approve
→ Audit event recorded
```

---

# 24. GLOBAL INTERACTION REQUIREMENTS

The prototype must include:

- Navigation between all app pages
- Marketing product tabs
- Date/filter changes on dashboard
- Search
- Filter chips
- Conversation switching
- Takeover/resume automation
- Message builder edits update preview
- RCS/SMS toggle
- Android/iOS toggle
- Journey node selection updates inspector
- Journey test mode
- Template search/filter
- Integration Connect modal
- Integration state change
- API log expansion
- Sandbox simulation
- Brand checklist status
- Settings tabs
- Save/test/publish toasts
- Confirmation dialogs for destructive actions
- At least one empty-state example
- At least one error-state example

Prototype can use in-memory state; refresh persistence is optional.

---

# 25. DEMO DATA MODEL

Suggested normalized prototype objects.

## 25.1 Workspace

```ts
type Workspace = {
  id: string
  name: string
  environment: "test" | "live"
  timezone: string
}
```

## 25.2 BrandAgent

```ts
type BrandAgent = {
  id: string
  name: string
  logoUrl: string
  verification: "not_started" | "pending" | "approved" | "rejected"
  carrierReview: "not_started" | "pending" | "approved"
  launchState: "test" | "ready" | "live"
  fallbackActive: boolean
}
```

## 25.3 Contact

```ts
type Contact = {
  id: string
  name: string
  phone: string
  rcsCapable: boolean
  consent: "opted_in" | "opted_out" | "unknown"
  language: string
  segment: string[]
  sourceSystem?: string
  attributes: Record<string, string | number | boolean>
}
```

## 25.4 Conversation

```ts
type Conversation = {
  id: string
  contactId: string
  channel: "rcs" | "sms"
  status: "automated" | "waiting_customer" | "needs_agent" | "agent_active" | "resolved"
  journeyId?: string
  assignee?: string
  messages: MessageEvent[]
}
```

## 25.5 MessageTemplate

```ts
type MessageTemplate = {
  id: string
  name: string
  category: string
  status: "draft" | "approved" | "live" | "archived"
  rcsContent: unknown
  smsFallback: string
  variables: string[]
}
```

## 25.6 Journey

```ts
type Journey = {
  id: string
  name: string
  status: "draft" | "published" | "paused"
  trigger: string
  nodes: JourneyNode[]
  metrics: {
    entered: number
    completed: number
    failed: number
    value: number
  }
}
```

## 25.7 Integration

```ts
type Integration = {
  id: string
  name: string
  category: string
  state: "available" | "connected" | "warning" | "error"
  lastEvent?: string
  failedEvents?: number
}
```

---

# 26. SAMPLE DEMO ENTITIES

Workspace:
- Northstar Auto

Brand:
- Northstar Auto Care

Contacts:
- James Carter
- Sophia Nguyen
- David Lee
- Emily Davis
- Michael Brown
- Olivia Wilson

Journeys:
- Service Reminder
- Payment Collection
- Booking Follow-up
- Delivery Update
- New Customer Welcome

Integrations:
- Salesforce
- HubSpot
- Stripe
- Google Calendar
- Zendesk
- Shopify

Use realistic but fictional phone numbers and data.

---

# 27. STATES & EDGE CONDITIONS

Every major page should support relevant states.

## 27.1 Loading

Use skeletons, not permanent spinners.

## 27.2 Empty

Always tell the user:
- What is missing
- Why it matters
- What action to take

Example:
> No journeys yet. Start with a booking, payment, support, or delivery template.

## 27.3 Error

Show:
- What failed
- Whether customer messaging is affected
- Retry
- View details if technical

## 27.4 Permission denied

Explain role restriction and who can perform the action.

## 27.5 Pending approval

Common in:
- Brand
- Template
- Live launch

Use amber state with clear next step.

## 27.6 Disconnected integration

Show impact:
> New booking slots cannot be fetched until Google Calendar is reconnected.

Do not merely say “Disconnected.”

---

# 28. RESPONSIVE SPECIFICATION

## 28.1 Breakpoints

Suggested:
- Mobile: < 768px
- Tablet: 768–1099px
- Desktop: 1100px+

## 28.2 Marketing

Mobile:
- Hero text first, phone below
- Buttons stacked or 2-up if space
- Benefit cards 1 column
- Workflow converts to vertical timeline
- Product tabs horizontally scroll
- Code block horizontally scrolls

## 28.3 App

Desktop:
- Full sidebar
- Multi-panel workspaces

Tablet:
- Collapsible icon rail
- Context panel may become drawer

Mobile:
- Drawer navigation
- Single-panel conversations with list/detail navigation
- Analytics cards stacked
- Tables become cards or horizontally scroll
- Builders show:
  - Preview
  - Component list
  - Selected component edit
  - No unrestricted freeform canvas requirement

---

# 29. ACCESSIBILITY

Minimum requirements:

- Semantic landmarks
- Visible focus states
- Keyboard-accessible tabs/dialogs/menus
- Logical tab order
- `aria-label` where icon buttons lack text
- Minimum 4.5:1 body contrast where applicable
- Do not use color as the sole status indicator
- Alt text for meaningful images
- Reduced-motion support
- Focus trap in dialogs
- Escape closes dialogs where appropriate
- Tables use proper headers
- Error text connected to inputs

---

# 30. CONTENT & COPY STYLE

Voice:
- Clear
- Operational
- Confident
- Concise
- Not hype-heavy

Prefer:
> Your payment reminder journey completed 842 payments this month.

Avoid:
> Revolutionize customer engagement with next-generation hyper-personalized communications.

Buttons should use verbs:
- Create message
- Build journey
- Send test
- Publish
- Take over
- Resume automation
- Retry event
- Connect Stripe

---

# 31. SECURITY & GOVERNANCE UX

Prototype should visually account for:

- Consent state
- Opt-out state
- Role-based permissions
- Audit history
- API-key masking
- Webhook signing concept
- PII redaction in logs
- Environment separation
- Test vs Live
- Template approval
- Sender verification
- Secure-payment redirects

Never display raw payment-card numbers.

---

# 32. REUSABLE COMPONENT INVENTORY

Build reusable components for:

### Foundation
- Button
- IconButton
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- Tabs
- Tooltip
- Badge
- Avatar
- Divider
- Skeleton

### Overlays
- Dialog
- Drawer
- Popover
- Dropdown
- Command palette
- Toast

### Data
- MetricCard
- StatusCard
- Table
- FilterBar
- DateRange
- Sparkline
- ChartCard
- EmptyState

### RCX specific
- AppSidebar
- WorkspaceSwitcher
- EnvironmentBadge
- ChannelBadge
- RCSCapabilityBadge
- ConsentBadge
- AgentStatus
- PhonePreview
- RichCardPreview
- SMSPreview
- MessageBubble
- ConversationRow
- JourneyNode
- JourneyConnector
- IntegrationCard
- BrandChecklist
- APIRequestRow
- AttentionItem
- OutcomeMetric

---

# 33. IMPLEMENTATION STRUCTURE

Recommended:

```text
src/
├── app/
│   ├── (marketing)/
│   ├── app/
│   │   ├── overview/
│   │   ├── conversations/
│   │   ├── messages/
│   │   ├── journeys/
│   │   ├── campaigns/
│   │   ├── templates/
│   │   ├── contacts/
│   │   ├── analytics/
│   │   ├── integrations/
│   │   ├── developers/
│   │   ├── brand/
│   │   └── settings/
│   ├── login/
│   └── signup/
├── components/
│   ├── ui/
│   ├── marketing/
│   ├── app-shell/
│   ├── messaging/
│   ├── journeys/
│   ├── conversations/
│   ├── analytics/
│   └── integrations/
├── data/
│   └── mock/
├── lib/
├── hooks/
└── styles/
```

Keep mocked business data separate from components.

---

# 34. PERFORMANCE & QUALITY

Prototype quality expectations:

- No broken routes
- No console errors
- No missing keys / obvious React warnings
- Avoid unnecessary client components
- Lazy-load heavy secondary visualizations if needed
- Mobile layout should not overflow horizontally except intentional tables/code
- Phone preview should stay proportionate
- Navigation state should be obvious
- Avoid large layout shift
- Buttons and controls should have hover/focus/disabled states

---

# 35. ACCEPTANCE CRITERIA

The build is complete when:

## Marketing
- Homepage is polished and responsive
- Hero contains believable interactive RCS preview
- Product tabs work
- Use cases are visible
- Integrations are visible
- RCS/SMS fallback is explained
- Developer section is implemented
- Secondary nav routes do not 404

## App shell
- Sidebar navigation works
- Mobile navigation works
- Workspace and environment UI are visible

## Overview
- KPIs render
- Filters change visible state
- Outcome chart renders
- Attention items link/drill into appropriate destination
- Integration health and recent conversations render

## Conversations
- Customer selection changes chat
- Human takeover works
- Resume automation works
- Context panel contains realistic customer information

## Messages
- Components can be selected/reordered or convincingly simulated
- Edits update phone preview
- RCS/SMS toggle works
- Test send opens modal/toast
- Validation/fallback tabs work

## Journeys
- Nodes are visible and selectable
- Inspector changes by node
- Test mode simulates path
- Save/Publish produce feedback

## Campaigns
- Four steps work
- Audience estimates show
- Review summarizes campaign

## Templates
- Search works
- Category filters work
- Template preview/use action works

## Contacts
- Filters work
- Contact detail opens
- Consent and RCS capability visible

## Analytics
- Funnel
- RCS vs SMS
- Journey table
- Failure reasons
- Outcome/value metrics
- Filters

## Integrations
- Connected and available sections
- Connect modal
- State changes
- Health data

## Developers
- API keys
- Webhooks
- Logs
- Expandable request details
- Sandbox simulation
- SDK/docs views

## Brand
- 8-step onboarding
- Status display
- Test devices
- Verification states

## Settings
- Team
- Roles
- Consent
- Audit
- Billing placeholder

## Cross-cutting
- Responsive
- Accessible focus states
- Toasts
- Error / empty states
- No live credentials required

---

# 36. PRIORITY BUILD ORDER

If the agent cannot complete everything in one pass, use this order:

### P0 — Demonstrable product
1. Design system
2. Homepage
3. App shell
4. Overview dashboard
5. Conversations
6. Message builder
7. Journey builder

### P1 — Commercial completeness
8. Analytics
9. Templates
10. Integrations
11. Brand onboarding
12. Developer console

### P2 — Operational breadth
13. Campaigns
14. Contacts
15. Settings
16. Secondary marketing pages

At the end of each phase, ensure no route is visibly broken.

---

# 37. FINAL PRODUCT TEST

A first-time prospect should understand within roughly ten seconds that:

1. RCX is for business RCS.
2. It connects existing systems.
3. It creates branded interactive customer journeys.
4. Customers can reply and take actions.
5. RCS can fall back to SMS.
6. Businesses can operate and measure those conversations.
7. RCX is more than a campaign sender.

A product buyer should be able to demo this sequence without explanation:

```text
Dashboard
→ Open Service Reminder journey
→ Inspect rich message
→ Toggle RCS/SMS
→ Test journey
→ Open customer conversation
→ Take over from automation
→ Open analytics
→ Show completed bookings/revenue
→ Show integration and API logs
```

That is the core RCX sales narrative.

---

# 38. OPTIONAL NEXT-PHASE FEATURES — DO NOT BLOCK V1

Future ideas:

- Visual no-code data mapper
- AI intent classification
- Agent assist
- Conversation summaries
- Template recommendations
- A/B message experiments
- Provider routing policies
- Multi-brand organization hierarchy
- Usage-based billing
- Approval workflows
- SLA dashboards
- Carrier/country capability explorer
- Journey version rollback
- Webhook dead-letter queue UI
- Marketplace integrations
- Customer preference-center hosted page
- Embedded “RCX actions” widgets
- Localization management
- AI-assisted journey generation

Do not add these at the expense of core V1 clarity.

---

# 39. REFERENCE PROTOTYPE

A previously generated local prototype is included under:

```text
./reference-prototype/
```

Use it as a functional/layout reference only. The new build should follow this specification if there is any conflict.

---

# 40. FINAL AGENT PROMPT

If this Markdown file is being supplied directly to an AI coding agent, use:

> Build RCX exactly from this specification. Treat the Markdown as the product and UX source of truth and the files in `renderings/` as the visual source of truth. Build a responsive, customer-demo-quality SaaS prototype with functional navigation and mocked local data. Prioritize the homepage, app shell, outcome-focused dashboard, conversations, message builder, journey builder, analytics, integrations, developer console, and brand onboarding. Do not reduce the product to a static dashboard or a generic SMS campaign tool. Make RCS rich experiences, two-way customer action, SMS fallback, integrations, operational recovery, and measurable business outcomes obvious throughout the interface.

---

# 41. BUILD STATUS — AUDIT 2026-08-09

**Audited against:** the working tree at `~/Documents/rcx` (Next.js 16.3.0 / React 19 / Tailwind v4).
**Method:** full source read, `tsc --noEmit`, HTTP smoke test of all 25 routes, browser verification of rendered pages.
**Not yet under version control** — the repo has zero commits.

## 41.1 Missing spec inputs — resolved 2026-08-09

Two directories this document treats as sources of truth **do not exist in the repo**:

- `./renderings/` — the visual source of truth referenced by §5 and §40
- `./reference-prototype/` — referenced by §39

**Decision: do not recreate either. Both are obsolete, for different reasons.**

`reference-prototype/` was meant to be a prior build to compare against. **The repo itself is now that artifact.** §39's instruction ("functional/layout reference only; this specification wins any conflict") is satisfied by the working app. Treat §39 as spent.

`renderings/` was an *input* to a build that has already happened. Generating images now would invert the dependency — producing a design target from the implementation it was supposed to guide — and would leave two sources of truth that can drift apart. Note also that **§5.5 already anticipated this**: it says to recreate the customer-facing RCS examples "as HTML/CSS device previews where practical rather than relying only on raster screenshots." The §22 flow player does exactly that, so the most valuable renderings are now live code.

What replaces them:

1. **A living style guide route** — tokens, type scale, spacing, and the component inventory rendered from the real components. Cannot go stale the way a PNG can. This is the honest successor to §5.1's reference board.
2. **Committed screenshots of the running app** under `renderings/`, if a visual baseline is wanted for regression comparison. Cheap, and satisfies §5 without claiming to be a design authority.

What to avoid: generating AI mockups to fill the folder. They would be fiction contradicting a working app, and §5's "primary style and layout target" would then point at something nobody built.

**Caveat, and the one thing worth a human decision:** if a specific visual direction was envisioned that the current build does *not* match, there is no way to detect that from inside the repo. Reviewing the running app against that intent is a judgement call only the product owner can make.

## 41.2 Fixed in this pass

Routing and correctness:

- React `key`-in-spread warning on the Overview KPI row (violated §34). `kpis[].key` renamed to `id`.
- Dead route `/app/journeys` — the sidebar and Overview linked to it while the page lived at `/app/journey-builder`. Directory renamed to `/app/journeys`, matching §4.2.
- Dead route `/app/developers/logs` in the attention feed, retargeted to `/app/developers`.

Three empty tables (§35 acceptance failures for Brand and Settings):

- **`DataTable` misuse.** The component accepted only `children`, but three call sites — Brand → RCS agents, Settings → Team, Settings → Audit log — passed a nonexistent `headers`/`rows` API, each rendering a header above an empty table. `DataTable` now supports both modes via a discriminated union: declarative `headers` + `rows` for uniform tables, compositional `children` for bespoke cells.
- **`<Badge variant="danger">`** (`settings-panel.tsx`) is not a valid variant; corrected to `error`. Suspended users were rendering with default styling, violating the §20.3 status-color convention.
- **`channelSplit` field mismatch** — the fixture exposed `name` while `Donut` required `label`.

Type safety:

- **`typescript.ignoreBuildErrors: true` removed from `next.config.mjs`.** This flag was hiding all of the above; it let a broken feature ship green. `tsc --noEmit` now exits 0.

All 25 implemented routes return 200, no internal link 404s, and the type check is clean (§34, §35 "no broken routes").

## 41.3 Known constraint

Cold start after clearing `.next` takes roughly 50 seconds on this machine. Not a defect, but worth knowing before assuming a hung dev server.

## 41.4 Section-by-section status

| Spec | Built | Pending |
|---|---|---|
| §8 Homepage | All 11 subsections present, responsive, phone preview live | — |
| §4.1 Marketing routes | `/product`, `/product/message-builder`, `/product/journeys`, `/solutions`, `/industries`, `/developers`, `/pricing`, `/resources`, `/demo`, `/login`, `/signup` | 4 `/product/*` children; all 6 `/solutions/*`; all 5 `/industries/*`. None are linked, so nothing 404s today |
| §7 App shell | Sidebar (grouped), mobile drawer, topbar with env badge + search + notifications | Tablet icon rail (§7.2) — layout jumps full sidebar → drawer; workspace **selector** (currently static breadcrumb); help control; command palette |
| §9 Auth & onboarding | Login/signup UI | Real auth (form only calls `router.push('/app')`); `/app` is unprotected, no middleware; **entire 5-step onboarding (§9.2) absent** |
| §10 Overview | KPI scorecard + sparklines, secondary metrics, outcomes chart w/ series filter, journey table, attention panel w/ severity + drill-through, channel mix | Date range (§10.1); quick actions (§10.2); KPI tooltips (§10.3 — `hint` data exists but is never rendered); integration health (§10.7); recent conversations (§10.8); active RCS agents card (§10.9); all three dashboard states (§10.10) |
| §11 Conversations | Three-column layout, filter chips, take over / resume automation, composer, context pane, demo thread | Internal-note mode; saved replies; all 10 edge states (§11.4) |
| §12 Messages | Builder: palette, canvas, live phone preview, RCS/SMS + Android/iOS toggles, validation, editable SMS fallback | **Messages list page entirely absent** — no `/app/messages`, and the `messagesList` fixture is unreferenced; Variables / Accessibility / Tracking tabs (§12.3); Send-test modal (§12.4); component reorder / duplicate / delete |
| §13 Journeys | Builder canvas, selectable nodes, inspector, test mode w/ step-through, publish/pause | Journey **list**, `/new`, `/:id`; canvas is a fixed linear chain — no branch/merge as specified in §13.2; node library is 7 flat items vs 5 groups (~25 nodes); API-node inspector fields; version / save draft |
| §14 Campaigns | List with status | **Entire 4-step builder (§14.2)** |
| §15 Templates | Library, search, category filters | Template detail + 6 tabs (§15.3); preview thumbnails; Preview/Use are toast-only |
| §16 Contacts | List, search, consent filter, detail drawer | Consent timeline; active journeys; conversation history; source-system link |
| §17 Analytics | Funnel, outcomes chart, channel donut, failure reasons, top actions, executive cards | All 9 global filters (§17.1); RCS vs SMS comparison (§17.4); journey performance table (§17.5) |
| §18 Integrations | Catalog w/ connected + available, health data, latency, failed events | **Connect modal (§18.4)** and resulting state change; integration detail + 5 tabs (§18.3) |
| §19 Developers | API keys, webhooks, logs, quickstart (tables correctly composed) | Developer overview cards (§19.1); key creation + show-secret-once modal (§19.2); expandable log rows (§19.4); **sandbox (§19.5)**; SDK/docs views; all 6 sub-routes |
| §20 Brand | 8-step checklist, verified sender preview | Agents table **broken** (§41.3); brand profile form (§20.4); use-case selection (§20.5); test devices (§20.6) |
| §21 Settings | General, Roles matrix | Team + Audit tables **broken** (§41.3); Consent tab (§21.4); Billing tab (§21.5); audit filters; all 6 sub-routes |
| §22 Customer RCS flows | Booking/reschedule thread only (partial §22.2) | **12 of 13 flows absent.** §22 calls these critical; none carry the required 6 states (trigger → context → decision → action → confirmation → recovery) |
| §24 Interactions | Nav, tabs, filters, search, conversation switching, takeover, builder→preview binding, both toggles, node selection, test mode, toasts | **`Dialog` is imported nowhere** — no Connect modal, no send-test modal, no destructive-action confirmations; no empty-state example; no error-state example |
| §27 States | — | **None implemented.** No `loading.tsx`, `error.tsx`, or `not-found.tsx` anywhere; no skeletons, empty, permission-denied, pending-approval, or disconnected-integration states |
| §32 Components | Button, Input, Card, Badge, Dialog (unused), Toast + the RCX-specific set (PhonePreview, RichCardPreview, SMSPreview, JourneyNode, IntegrationCard, BrandChecklist, AttentionItem, Sparkline) | Textarea, Select, Checkbox, Radio, Switch, Tabs, Tooltip, Avatar, Skeleton, Drawer, Popover, Dropdown, Command palette, DateRange, EmptyState. Builders currently use raw `<select>` / `<input>` |
| §29 Accessibility | `aria-label` on icon buttons, `aria-current` on nav, semantic landmarks | Reduced-motion support; focus trap (Dialog unused); contrast audit not run |

## 41.5 Structural work required before feature building

Ranked by how much later rework each one prevents.

1. ~~Remove `ignoreBuildErrors` and fix the type errors.~~ **Done** — see §41.2. Keep it removed.
2. **Re-model the mock data.** Every value in `data/mock.ts` is a pre-formatted string — `'12,604'`, `'+14.2%'`, `'$84,240'`, `'2h ago'`. §25 specifies normalized objects with real types. Convert to numbers and ISO timestamps with a formatting layer, or every screen gets touched twice when real data arrives.
3. **Add a data-access seam.** Components import fixtures directly at module scope (`import { journeys } from '@/data/mock'`). Nothing is async, which is why no loading or error state exists anywhere. Route reads through a repository module.
4. **Auth and route protection.** `/app` is fully public.
5. **Expand the primitive set (§32)** before building Campaign wizard, Connect modal, or Sandbox — all three need Dialog, Select, Switch, and Tabs that do not exist yet.
6. **Adopt the §27 state vocabulary as a component** (`EmptyState`, `ErrorState`, skeletons) so states arrive with each feature instead of as a retrofit pass.

## 41.6 Revised priority order

§36's P0 is materially complete: design system, homepage, app shell, overview, conversations, message builder, and journey builder all exist and demo. The gaps below are what stand between the current build and §35.

- **P0 remaining** — fix the three empty tables; Messages list; journey list + `/:id`; the §22 customer flows (these carry the §37 sales narrative).
- **P1** — Connect modal + integration detail; developer sandbox + expandable logs; brand profile / use cases / test devices; analytics filters + RCS-vs-SMS.
- **P2** — campaign 4-step builder; settings Consent + Billing; onboarding (§9.2); secondary marketing routes; §27 states across all pages.

**§37 demo path check.** The stated sales sequence — dashboard → open Service Reminder journey → inspect rich message → toggle RCS/SMS → test journey → open conversation → take over → analytics → integrations and API logs — is **walkable end to end today**, with one seam: "open Service Reminder journey" lands on a generic builder rather than that specific journey, because per-journey routes do not exist.
