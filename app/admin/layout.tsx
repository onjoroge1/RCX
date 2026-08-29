import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform administration',
  robots: { index: false, follow: false, noarchive: true, nocache: true },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children
}
