// Single entry point for the Drizzle schema. drizzle.config.ts points here.
//
// Scoping tiers (see spec §42.3 — the decision most expensive to reverse):
//   - workspace-scoped, NO environment: tenancy, auth, journeys/messages/templates,
//     segments, goals, variable definitions, consent settings
//   - workspace + environment: contacts, conversations, runs, campaigns, brand agents,
//     api keys, webhooks, logs, connections, outcomes, delivery events, metrics
//   - global: permissions, integration providers, platform templates, demo flows,
//     marketing plans, leads, users

export * from './enums'
export * from './tenancy'
export * from './auth'
export * from './contacts'
export * from './brand'
export * from './messaging'
export * from './journeys'
export * from './conversations'
export * from './campaigns'
export * from './integrations'
export * from './developer'
export * from './analytics'
export * from './audit'
export * from './content'
