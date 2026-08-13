import { PageContainer } from '@/components/app/page-header'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-[32rem]" />
      </div>
      <div className="mt-6 flex h-[calc(100vh-8.5rem)] overflow-hidden rounded-xl border border-border bg-card">
        <div className="w-full max-w-xs shrink-0 border-r border-border p-3">
          <Skeleton className="h-9 w-full" />
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border px-5 py-3">
            <Skeleton className="h-9 w-56" />
          </div>
          <div className="flex-1 space-y-4 bg-muted/30 px-5 py-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className={i % 2 ? 'ml-auto h-14 w-2/3' : 'h-14 w-1/2'} />
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
