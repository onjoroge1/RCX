/**
 * KPI definitions. These are product copy, not data — §10.3's tooltip text lives
 * here rather than in a `hint` column, which is where data/mock.ts had it.
 */
export type KpiFormat = 'count' | 'currency' | 'percent'

export type KpiDef = {
  id: string
  label: string
  format: KpiFormat
  hint: string
  /** Whether an increase is good. SMS fallback rising is not. */
  positive: boolean
}

export const KPI_DEFS: KpiDef[] = [
  {
    id: 'outcomes',
    label: 'Completed outcomes',
    format: 'count',
    positive: true,
    hint: 'Bookings, payments, approvals, resolutions and purchases customers finished from the conversation.',
  },
  {
    id: 'revenue',
    label: 'Attributed revenue',
    format: 'currency',
    positive: true,
    hint: 'Revenue tied to a completed journey outcome.',
  },
  {
    id: 'rcs',
    label: 'RCS eligibility',
    format: 'percent',
    positive: true,
    hint: 'Share of recipients able to receive rich RCS.',
  },
  {
    id: 'delivery',
    label: 'Delivery rate',
    format: 'percent',
    positive: true,
    hint: 'Messages delivered across RCS and SMS fallback.',
  },
  {
    id: 'action',
    label: 'Action rate',
    format: 'percent',
    positive: true,
    hint: 'Recipients who tapped a button or replied.',
  },
  {
    id: 'fallback',
    label: 'SMS fallback rate',
    format: 'percent',
    positive: false,
    hint: 'Share routed to SMS because RCS was unavailable.',
  },
]
