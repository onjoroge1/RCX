import 'server-only'

import { and, asc, eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  brandAgentCountries,
  brandAgents,
  brandChecklistItems,
  brandTestDevices,
} from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'

/**
 * Reads for /app/brand.
 *
 * The checklist is per-agent here, where data/mock.ts had one global list. That
 * is the more truthful shape — Northstar Auto Care is fully approved while
 * Northstar Sales is still waiting on carrier review — and it also demos better,
 * because the two agents visibly differ.
 */

export type BrandChecklistItemDto = {
  id: string
  key: string
  label: string
  status: 'not_started' | 'in_progress' | 'complete' | 'pending' | 'blocked'
  blockedReason: string | null
}

export type BrandAgentDto = {
  id: string
  displayName: string
  legalName: string
  description: string | null
  environment: 'test' | 'live'
  verificationState: 'not_started' | 'pending' | 'approved' | 'rejected'
  carrierReviewState: 'not_started' | 'pending' | 'approved'
  launchState: 'test' | 'ready' | 'live'
  fallbackActive: boolean
  productionTrafficEnabled: boolean
  brandColor: string | null
  websiteUrl: string | null
  privacyUrl: string | null
  supportPhone: string | null
  supportEmail: string | null
  countries: string[]
  checklist: BrandChecklistItemDto[]
  completeCount: number
  testDevices: { id: string; phone: string; label: string | null; capability: string | null; lastTestedAt: Date | null }[]
}

export async function listBrandAgents(): Promise<BrandAgentDto[]> {
  assertNotForcedError()
  const scope = await getScope()

  const agents = await db
    .select()
    .from(brandAgents)
    .where(scoped(brandAgents, scope))
    .orderBy(asc(brandAgents.createdAt))

  if (agents.length === 0) return []

  const ids = agents.map((a) => a.id)

  const [countries, checklist, devices] = await Promise.all([
    db
      .select()
      .from(brandAgentCountries)
      .where(inArray(brandAgentCountries.brandAgentId, ids)),
    db
      .select()
      .from(brandChecklistItems)
      .where(inArray(brandChecklistItems.brandAgentId, ids))
      .orderBy(asc(brandChecklistItems.sortOrder)),
    db
      .select()
      .from(brandTestDevices)
      .where(inArray(brandTestDevices.brandAgentId, ids))
      .orderBy(asc(brandTestDevices.createdAt)),
  ])

  return agents.map((a) => {
    const items = checklist
      .filter((c) => c.brandAgentId === a.id)
      .map((c) => ({
        id: c.id,
        key: c.key,
        label: c.label,
        status: c.status,
        blockedReason: c.blockedReason,
      }))

    return {
      id: a.id,
      displayName: a.displayName,
      legalName: a.legalName,
      description: a.description,
      environment: a.environment,
      verificationState: a.verificationState,
      carrierReviewState: a.carrierReviewState,
      launchState: a.launchState,
      fallbackActive: a.fallbackActive,
      productionTrafficEnabled: a.productionTrafficEnabled,
      brandColor: a.brandColor,
      websiteUrl: a.websiteUrl,
      privacyUrl: a.privacyUrl,
      supportPhone: a.supportPhone,
      supportEmail: a.supportEmail,
      countries: countries.filter((c) => c.brandAgentId === a.id).map((c) => c.country),
      checklist: items,
      completeCount: items.filter((i) => i.status === 'complete').length,
      testDevices: devices
        .filter((d) => d.brandAgentId === a.id)
        .map((d) => ({
          id: d.id,
          phone: d.phoneE164,
          label: d.label,
          capability: d.capability,
          lastTestedAt: d.lastTestedAt,
        })),
    }
  })
}
