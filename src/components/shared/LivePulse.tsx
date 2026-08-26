"use client"

import { cn } from "@/lib/utils"

/**
 * Pulsing dot shared by every "right now" indicator — the footer badge, the
 * per-surah reader counts, and the homepage activity panel — so they all read as
 * the same signal.
 */
export function LivePulse({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2", className)} aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald/70" />
      <span className="relative inline-flex size-full rounded-full bg-emerald" />
    </span>
  )
}
