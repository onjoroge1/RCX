import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/seo'

const publicRoutes: Array<{
  path: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/product', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/product/journeys', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/product/message-builder', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/solutions', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/industries', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/developers', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/resources', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/demo', changeFrequency: 'monthly', priority: 0.6 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
