import * as React from 'react'
import Link from 'next/link'
import { Inbox } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * §27.2: an empty state must say what is missing, why it matters, and what to do
 * next. The description and action are therefore not optional decoration.
 */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string
  description: string
  action?: { label: string; href: string }
  icon?: React.ElementType
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
      <span className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-1 text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-pretty text-xs leading-relaxed text-muted-foreground">{description}</p>
      {action && (
        <Button size="sm" variant="outline" className="mt-2" asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}
