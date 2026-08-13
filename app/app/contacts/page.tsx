import type { Metadata } from 'next'

import { PageContainer, PageHeader } from '@/components/app/page-header'
import { ContactsTable } from '@/components/app/contacts-table'
import { getContactDetail, listContacts } from '@/lib/db/queries/contacts'

export const metadata: Metadata = { title: 'Contacts · RCX' }

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; consent?: string; page?: string; contact?: string }>
}) {
  const params = await searchParams

  const [list, detail] = await Promise.all([
    listContacts({
      query: params.q,
      consent: params.consent,
      page: params.page ? Number(params.page) : 1,
    }),
    params.contact ? getContactDetail(params.contact) : Promise.resolve(null),
  ])

  return (
    <PageContainer>
      <PageHeader
        title="Contacts"
        description="Channel capability, consent state and journey membership for everyone you can message. RCX mirrors your systems of record rather than replacing them."
      />
      <div className="mt-6">
        <ContactsTable
          rows={list.rows}
          total={list.total}
          page={list.page}
          pageCount={list.pageCount}
          detail={detail}
          now={Date.now()}
        />
      </div>
    </PageContainer>
  )
}
