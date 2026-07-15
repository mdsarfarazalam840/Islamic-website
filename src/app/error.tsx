"use client"

import { ErrorBoundary } from "@/components/shared/ErrorBoundary"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundary fallback={null}>{null}</ErrorBoundary>
}
