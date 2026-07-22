import type { Metadata } from "next"
import { Suspense } from "react"
import { SearchClient } from "./SearchClient"

export const metadata: Metadata = {
  title: "Search — Noor",
  description: "Search across the entire Quran with translations in English, Hindi, and Urdu.",
}

function SearchFallback() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-6 rounded bg-muted animate-pulse" />
        <div>
          <div className="h-7 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-56 bg-muted rounded mt-1 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchClient />
    </Suspense>
  )
}
