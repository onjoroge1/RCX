import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { ConversationsInbox } from '@/components/app/conversations-inbox'

export const metadata: Metadata = { title: 'Conversations · RCX' }

export default function ConversationsPage() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Conversations"
        description="A unified two-way inbox. Automation handles routine replies; take over any thread when a human is needed."
      />
      <ConversationsInbox />
    </div>
  )
}
