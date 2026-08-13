import { PageContainer } from '@/components/app/page-header'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-[34rem]" />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="rounded-xl border border-border">
          <Skeleton className="h-10 w-full rounded-b-none" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="mx-3 my-3 h-8" />
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
