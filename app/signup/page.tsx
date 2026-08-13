import type { Metadata } from 'next'
import { AuthPanel } from '@/components/marketing/auth-panel'

export const metadata: Metadata = {
  title: 'Get started — RCX',
  description: 'Create your RCX workspace.',
}

export default function Page() {
  return (
    <AuthPanel
      mode="signup"
      demoEnabled={Boolean(process.env.DEMO_USER_EMAIL && process.env.DEMO_USER_PASSWORD)}
    />
  )
}
