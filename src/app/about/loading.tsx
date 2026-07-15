import { Skeleton } from "@/components/shared/Skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <Skeleton className="h-10 w-48 mb-8" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-6" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-8" />
      <Skeleton className="h-6 w-40 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}
