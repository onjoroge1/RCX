import { PageContainer } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-[34rem]" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>
    </PageContainer>
  )
}
