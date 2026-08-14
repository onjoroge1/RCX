'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

import { PageContainer } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * §27.3: say what failed, whether customer messaging is affected, and offer a retry.
 * "Something went wrong" alone is not an error state.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Templates failed to load:", error)
  }, [error])

  return (
    <PageContainer>
      <Card className="mx-auto mt-10 max-w-lg p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-error/12 text-error">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground">Templates could not be loaded</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer messaging is unaffected — journeys are still running and replies are still being
              received. This is a display problem only.
            </p>
            {error.digest && (
              <p className="mt-3 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
            )}
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={reset}>
                <RotateCcw className="size-3.5" /> Try again
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="/app/overview">Go to overview</a>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </PageContainer>
  )
}
