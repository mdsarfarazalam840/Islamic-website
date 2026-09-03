"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface JuzBoundary {
  juz: number
  /** First ayah of this juz within the surah. */
  ayahNumber: number
  /** Last ayah of this juz within the surah. */
  endAyahNumber: number
}

interface JuzNavigatorProps {
  currentJuz: number
  boundaries: JuzBoundary[]
  onJump: (juz: number) => void
}

export function JuzNavigator({ currentJuz, boundaries, onJump }: JuzNavigatorProps) {
  const currentIndex = boundaries.findIndex((b) => b.juz === currentJuz)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < boundaries.length - 1

  return (
    <div className="rounded-xl border border-gold-dim/15 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => hasPrev && onJump(boundaries[currentIndex - 1].juz)}
          disabled={!hasPrev}
          className={cn(
            "rounded-lg p-1.5 transition-all",
            hasPrev
              ? "text-gold-light hover:bg-gold-dim/10"
              : "text-muted-foreground/30 cursor-not-allowed",
          )}
          aria-label="Previous juz"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="text-center">
          <span className="text-sm font-medium text-gold-light">Juz {currentJuz}</span>
        </div>

        <button
          onClick={() => hasNext && onJump(boundaries[currentIndex + 1].juz)}
          disabled={!hasNext}
          className={cn(
            "rounded-lg p-1.5 transition-all",
            hasNext
              ? "text-gold-light hover:bg-gold-dim/10"
              : "text-muted-foreground/30 cursor-not-allowed",
          )}
          aria-label="Next juz"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/*
        A labelled list of the surah's juz with their ayah ranges. This replaced a
        row of unlabelled dots, which gave no clue which juz held which ayah — the
        reason reaching a known ayah meant clicking through them one at a time.

        A native select rather than the Base UI wrapper in `components/ui/select.tsx`:
        that wrapper exports no Root, has no consumer anywhere in the repo, and omits
        the Positioner its version needs, so it would have to be rebuilt before it
        could be used here. Native also gives keyboard and mobile pickers for free.
      */}
      {boundaries.length > 1 && (
        <div className="relative">
          <select
            value={currentJuz}
            onChange={(e) => onJump(Number(e.target.value))}
            aria-label="Jump to juz"
            className="w-full appearance-none rounded-lg border border-border/20 bg-space-mid/20 px-3 py-2 pr-8 text-xs text-foreground outline-none focus:border-gold-dim/40 transition-colors cursor-pointer"
          >
            {boundaries.map((b) => (
              <option key={b.juz} value={b.juz}>
                Juz {b.juz} &middot; ayah {b.ayahNumber}
                {b.endAyahNumber > b.ayahNumber ? `–${b.endAyahNumber}` : ""}
              </option>
            ))}
          </select>
          <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-gold-dim/60" />
        </div>
      )}
    </div>
  )
}
