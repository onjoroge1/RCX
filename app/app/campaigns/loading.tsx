import { PageContainer } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-2 h-4 w-[32rem]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-2 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-20" />
          </Card>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-border">
        <Skeleton className="h-10 w-full rounded-b-none" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mx-3 my-3 h-8" />
        ))}
      </div>
    </PageContainer>
  )
}
