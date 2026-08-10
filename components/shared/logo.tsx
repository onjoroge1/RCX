import { cn } from '@/lib/utils'

export function Logo({
  className,
  dark = false,
  variant,
}: {
  className?: string
  dark?: boolean
  variant?: 'light' | 'dark'
}) {
  if (variant === 'light') dark = true
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="grid grid-cols-2 gap-[3px]" aria-hidden="true">
        <span className="size-2 rounded-full bg-violet" />
        <span className="size-2 rounded-full bg-signal-blue" />
        <span className="size-2 rounded-full bg-signal-blue/60" />
        <span className="size-2 rounded-full bg-violet" />
      </span>
      <span className={cn('text-lg font-bold tracking-tight', dark ? 'text-white' : 'text-foreground')}>
        RCX
      </span>
    </span>
  )
}
