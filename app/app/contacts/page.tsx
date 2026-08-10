import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { ContactsTable } from '@/components/app/contacts-table'

export const metadata: Metadata = { title: 'Contacts' }

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Reachability, consent status, and journey history for every customer."
      />
      <ContactsTable />
    </div>
  )
}
