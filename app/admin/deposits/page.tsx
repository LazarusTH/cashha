import { Suspense } from 'react'
import { DepositsClient } from './client'
import { Skeleton } from '@/components/ui/skeleton'

export default function DepositsPage() {
    return (
    <Suspense fallback={<DepositsSkeleton />}>
      <DepositsClient />
    </Suspense>
  )
}

function DepositsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-[200px]" />
      </div>

      <div className="rounded-md border">
        <div className="p-4">
          <Skeleton className="h-8 w-[150px] mb-4" />
          <div className="space-y-4">
            {Array(5).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
      </div>
        </div>
      </div>
    </div>
  )
}
