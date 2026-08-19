import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/page-header'
import { MessageBuilder, type MessageBuilderInitial } from '@/components/app/message-builder'
import { getMessageBuilder } from '@/lib/db/queries/messages'

export const metadata: Metadata = { title: 'Message Builder · RCX' }

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const message = await getMessageBuilder(id)
  if (!message) notFound()

  const initial: MessageBuilderInitial = {
    id: message.id,
    name: message.name,
    description: message.description,
    category: message.category,
    status: message.status,
    version: message.version,
    content: message.content,
    smsFallback: message.smsFallback,
  }

  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title={message.name}
        description={message.description ?? 'Edit this message by creating a new immutable version.'}
      />
      <MessageBuilder initial={initial} />
    </div>
  )
}
