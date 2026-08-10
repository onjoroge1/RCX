import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Feature = { title: string; body: string }

export function GenericMarketingPage({
  eyebrow,
  title,
  description,
  items,
  outcome,
}: {
  eyebrow: string
  title: string
  description: string
  items: Feature[]
  outcome?: string
}) {
  const features = items
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <Badge variant="violet">{eyebrow}</Badge>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">Get started free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/app/overview">Explore the workspace</Link>
          </Button>
        </div>
        {outcome && (
          <p className="mt-6 flex items-center gap-2 text-sm font-medium text-success">
            <Check className="size-4" /> {outcome}
          </p>
        )}
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-5">
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          Turn every business event into a customer conversation.
        </h2>
        <Button className="mt-6" size="lg" asChild>
          <Link href="/app/overview">
            Start building <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </>
  )
}
