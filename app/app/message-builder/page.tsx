import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { MessageBuilder } from '@/components/app/message-builder'

export const metadata: Metadata = { title: 'Message Builder · RCX' }

export default function MessageBuilderPage() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Message Builder"
        description="Compose rich, branded messages with a live device preview. Every message gets an SMS fallback and passes validation before it ships."
      />
      <MessageBuilder />
    </div>
  )
}
