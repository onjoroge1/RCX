import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { FlowGallery } from '@/components/app/flow-gallery'

export const metadata: Metadata = { title: 'Customer flows · RCX' }

export default function FlowsPage() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Customer flows"
        description="What the person on the other end actually sees. Step through each journey from the trigger to the outcome — including what happens when something goes wrong."
      />
      <FlowGallery />
    </div>
  )
}
