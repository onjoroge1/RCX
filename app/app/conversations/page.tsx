import type { Metadata } from 'next'

import { PageContainer, PageHeader } from '@/components/app/page-header'
import { ConversationsInbox } from '@/components/app/conversations-inbox'
import {
  getConversationContext,
  getThread,
  listConversations,
} from '@/lib/db/queries/conversations'

export const metadata: Metadata = { title: 'Conversations · RCX' }

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const { c } = await searchParams
  const conversations = await listConversations()

  // Selection rides in the URL so a thread is shareable and loads server-side.
  // Falling back to the first row keeps the page useful with no query param.
  const activeId = conversations.some((x) => x.id === c) ? c! : conversations[0]?.id

  const [thread, context] = activeId
    ? await Promise.all([getThread(activeId), getConversationContext(activeId)])
    : [[], null]

  return (
    <PageContainer>
      <PageHeader
        title="Conversations"
        description="Every two-way customer thread, with the automation context an agent needs to take over without asking the customer to repeat themselves."
      />
      <div className="mt-6">
        <ConversationsInbox
          conversations={conversations}
          thread={thread}
          context={context}
          now={Date.now()}
        />
      </div>
    </PageContainer>
  )
}
