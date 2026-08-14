import type { Metadata } from 'next'

import { PageContainer, PageHeader } from '@/components/app/page-header'
import { TemplatesGrid } from '@/components/app/templates-grid'
import { listTemplateCategories, listTemplates } from '@/lib/db/queries/templates'

export const metadata: Metadata = { title: 'Templates · RCX' }

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const activeCategory = category ?? 'All'

  const [templates, categories] = await Promise.all([
    listTemplates(activeCategory),
    listTemplateCategories(),
  ])

  return (
    <PageContainer>
      <PageHeader
        title="Templates"
        description="Purpose-built starting points for booking, payments, commerce, and support. Every template has a job to finish."
      />
      <div className="mt-6">
        <TemplatesGrid
          templates={templates}
          categories={categories}
          activeCategory={activeCategory}
          now={Date.now()}
        />
      </div>
    </PageContainer>
  )
}
