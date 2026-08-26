"use client"

import { useEffect } from "react"
import { useRealtime } from "@/components/realtime/RealtimeProvider"
import { LivePulse } from "@/components/shared/LivePulse"
import { cn } from "@/lib/utils"

interface SurahPresenceProps {
  surah: number
  /** Passed down from the page's server render, so no surah catalog is bundled here. */
  name: string
  className?: string
}

/**
 * Publishes "this tab is reading surah N" and renders how many others are here.
 *
 * The count comes off the shared presence snapshot in `RealtimeProvider`, so it
 * costs no connection and no request of its own.
 */
export function SurahPresence({ surah, name, className }: SurahPresenceProps) {
  const { bySurah, report } = useRealtime()

  // Cleared on the way out so a reader stops being counted here the moment they
  // navigate away — audio state goes with it, since leaving stops playback.
  useEffect(() => {
    report({ s: surah, n: name })
    return () => report({ s: null, n: null, p: false, r: null })
  }, [surah, name, report])

  const readers = bySurah.get(surah)?.readers ?? 0
  if (readers < 1) return null

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs text-emerald/80",
        className,
      )}
    >
      <LivePulse />
      <span className="tabular-nums">{readers}</span>
      {readers === 1 ? "reader here now" : "readers here now"}
    </p>
  )
}
