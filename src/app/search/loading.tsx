import { Skeleton } from "@/components/shared/Skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <Skeleton className="h-10 w-40 mb-8" />
      <Skeleton className="h-12 w-full mb-6" />
      <div className="flex gap-1 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 flex-1 rounded-lg" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
