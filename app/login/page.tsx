import type { Metadata } from 'next'
import { AuthPanel } from '@/components/marketing/auth-panel'

export const metadata: Metadata = {
  title: 'Sign in — RCX',
  description: 'Sign in to your RCX operating workspace.',
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <AuthPanel
      mode="login"
      next={next}
      demoEnabled={Boolean(process.env.DEMO_USER_EMAIL && process.env.DEMO_USER_PASSWORD)}
    />
  )
}
