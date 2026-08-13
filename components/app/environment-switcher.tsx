'use client'

import { useTransition } from 'react'
import { FlaskConical, Radio } from 'lucide-react'

import { switchEnvironmentAction } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'
import { useSession } from './session-context'

/**
 * §7.1's Test/Live badge, now a real control. Environment is a cookie validated
 * server-side on every query (lib/db/scope.ts), never a URL segment — §4.2's route
 * table has no environment segment and adding one would rewrite every Link.
 *
 * Trade-off accepted knowingly: a shared URL renders differently for two users in
 * different environments. This badge is the mitigation — it is always visible.
 */
export function EnvironmentSwitcher() {
  const { environment } = useSession()
  const [pending, startTransition] = useTransition()

  const isLive = environment === 'live'
  const Icon = isLive ? Radio : FlaskConical

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await switchEnvironmentAction(isLive ? 'test' : 'live')
        })
      }
      aria-label={`Environment: ${isLive ? 'Live' : 'Test'}. Switch to ${isLive ? 'Test' : 'Live'}.`}
      title={`Switch to ${isLive ? 'Test' : 'Live'}`}
      className={cn(
        'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors sm:inline-flex',
        pending && 'opacity-60',
        isLive
          ? 'border-success/30 bg-success/10 text-success hover:bg-success/20'
          : 'border-warning/30 bg-warning/10 text-warning hover:bg-warning/20',
      )}
    >
      <Icon className="size-3.5" />
      {isLive ? 'Live' : 'Test'}
    </button>
  )
}
