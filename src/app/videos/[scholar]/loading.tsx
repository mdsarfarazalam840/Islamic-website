import { Skeleton } from "@/components/shared/Skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <Skeleton className="h-6 w-40 mb-6" />
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <Skeleton className="size-32 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-full max-w-lg" />
        </div>
      </div>
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4">
            <Skeleton className="aspect-video w-full rounded-lg mb-3" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
