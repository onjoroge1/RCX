import type { Metadata } from 'next'

export const SITE_NAME = 'RCX'
export const SITE_DESCRIPTION =
  'Create, automate, and scale branded RCS customer journeys for bookings, payments, purchases, support, and two-way conversations with automatic SMS fallback.'

const FALLBACK_SITE_URL = 'https://rcx-eight.vercel.app'

export function getSiteUrl(): URL {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    FALLBACK_SITE_URL

  try {
    return new URL(/^https?:\/\//i.test(configured) ? configured : `https://${configured}`)
  } catch {
    return new URL(FALLBACK_SITE_URL)
  }
}

export function absoluteUrl(path = '/'): string {
  return new URL(path, getSiteUrl()).toString()
}

export function marketingMetadata(input: {
  title: string
  description: string
  path: string
}): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: input.path,
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
    },
  }
}
