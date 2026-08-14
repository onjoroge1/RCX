import { PageContainer } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-[30rem]" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-3 h-2 w-full rounded-full" />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </Card>
          ))}
        </div>
        <Card className="h-fit p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
        </Card>
      </div>
    </PageContainer>
  )
}
