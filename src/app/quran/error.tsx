"use client"

import { ErrorBoundary } from "@/components/shared/ErrorBoundary"

export default function QuranError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <ErrorBoundary>
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-muted-foreground">Could not load Quran content.</p>
          <button
            onClick={reset}
            className="text-secondary hover:underline text-sm"
          >
            Try again
          </button>
        </div>
      </ErrorBoundary>
    </div>
  )
}
