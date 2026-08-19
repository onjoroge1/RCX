import { redirect } from 'next/navigation'

export default function LegacyMessageBuilderPage() {
  redirect('/app/messages/new')
}
