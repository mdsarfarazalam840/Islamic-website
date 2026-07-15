import { Skeleton } from "@/components/shared/Skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-96 mb-8" />
      <Skeleton className="h-10 w-full max-w-md mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
