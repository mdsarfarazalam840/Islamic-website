"use client"

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
        <p className="text-muted-foreground">Search is temporarily unavailable.</p>
        <button
          onClick={reset}
          className="text-secondary hover:underline text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
