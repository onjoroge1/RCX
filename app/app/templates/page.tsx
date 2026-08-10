import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { TemplatesGrid } from '@/components/app/templates-grid'

export const metadata: Metadata = { title: 'Templates · RCX' }

export default function TemplatesPage() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Templates"
        description="Purpose-built starting points for booking, payments, commerce, and support. Every template has a job to finish."
      />
      <TemplatesGrid />
    </div>
  )
}
