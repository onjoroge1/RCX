import type { Metadata } from 'next'
import { AppShell } from '@/components/app/app-shell'

export const metadata: Metadata = {
  title: 'Workspace — RCX',
  description: 'The RCX operating workspace for business RCS.',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
