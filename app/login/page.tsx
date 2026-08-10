import type { Metadata } from 'next'
import { AuthPanel } from '@/components/marketing/auth-panel'

export const metadata: Metadata = {
  title: 'Sign in — RCX',
  description: 'Sign in to your RCX operating workspace.',
}

export default function Page() {
  return <AuthPanel mode="login" />
}
