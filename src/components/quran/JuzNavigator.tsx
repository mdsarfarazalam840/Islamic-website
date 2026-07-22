"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface JuzBoundary {
  juz: number
  ayahNumber: number
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

      {boundaries.length > 1 && (
        <div className="flex items-center gap-1.5 justify-center">
          {boundaries.map((b) => (
            <button
              key={b.juz}
              onClick={() => onJump(b.juz)}
              className={cn(
                "size-2.5 rounded-full transition-all duration-200",
                b.juz === currentJuz
                  ? "bg-gold-light gold-ring-glow scale-125"
                  : "bg-gold-dim/30 hover:bg-gold-dim/50"
              )}
              aria-label={`Jump to Juz ${b.juz}`}
              title={`Juz ${b.juz}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
