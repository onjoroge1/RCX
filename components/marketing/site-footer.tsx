import Link from 'next/link'
import { Logo } from '@/components/shared/logo'

const groups = [
  {
    title: 'Product',
    links: [
      { label: 'Message Builder', href: '/product/message-builder' },
      { label: 'Journeys', href: '/product/journeys' },
      { label: 'Overview', href: '/product' },
      { label: 'Open the app', href: '/app' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Booking', href: '/solutions' },
      { label: 'Payments', href: '/solutions' },
      { label: 'Order tracking', href: '/solutions' },
      { label: 'Support', href: '/solutions' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'API', href: '/developers' },
      { label: 'Webhooks', href: '/developers' },
      { label: 'Documentation', href: '/developers' },
      { label: 'Industries', href: '/industries' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Resources', href: '/resources' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Security', href: '/resources' },
      { label: 'Contact', href: '/demo' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            The operating platform for business RCS.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-sm font-semibold text-foreground">{g.title}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {g.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <p>© 2026 RCX. A demonstration prototype. Fictional data.</p>
          <p>RCS + SMS fallback · API-first · Provider independent</p>
        </div>
      </div>
    </footer>
  )
}
