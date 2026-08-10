import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { DevelopersPanel } from '@/components/app/developers-panel'

export const metadata: Metadata = { title: 'Developers · RCX' }

export default function DevelopersPage() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Developer tools"
        description="One canonical API for every customer conversation. Signed webhooks, sandbox recipients, and detailed delivery logs across providers."
      />
      <DevelopersPanel />
    </div>
  )
}
