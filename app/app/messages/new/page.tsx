import type { Metadata } from 'next'

import { PageHeader } from '@/components/app/page-header'
import { MessageBuilder } from '@/components/app/message-builder'

export const metadata: Metadata = { title: 'New Message · RCX' }

export default function NewMessagePage() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Create message"
        description="Compose an RCX-owned rich-message version with an explicit SMS fallback before it is published."
      />
      <MessageBuilder />
    </div>
  )
}
