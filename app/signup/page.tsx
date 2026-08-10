import type { Metadata } from 'next'
import { AuthPanel } from '@/components/marketing/auth-panel'

export const metadata: Metadata = {
  title: 'Get started — RCX',
  description: 'Create your RCX workspace and start building RCS journeys.',
}

export default function Page() {
  return <AuthPanel mode="signup" />
}
