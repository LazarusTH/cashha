import { Suspense } from 'react'
import { WithdrawalsClient } from './client'
import { Skeleton } from '@/components/ui/skeleton'

export default function WithdrawalsPage() {
  return (
    <Suspense fallback={<WithdrawalsSkeleton />}>
      <WithdrawalsClient />
    </Suspense>
  )
}

function WithdrawalsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-[200px]" />
          <div className="grid grid-cols-4 gap-4 mt-4">
          {Array(4).fill(null).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
          </div>
      </div>

      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-4">
            {Array(5).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>

        <div className="flex justify-center gap-2">
        <Skeleton className="h-10 w-[100px]" />
        <Skeleton className="h-10 w-[100px]" />
        </div>
    </div>
  )
}
