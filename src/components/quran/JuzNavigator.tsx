"use client"

import { ChevronLeft, ChevronRight, Bookmark } from "lucide-react"
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
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => hasPrev && onJump(boundaries[currentIndex - 1].juz)}
          disabled={!hasPrev}
          className={cn(
            "rounded-lg p-2 transition-all",
            hasPrev
              ? "text-secondary hover:bg-secondary/10"
              : "text-muted-foreground/30 cursor-not-allowed",
          )}
          aria-label="Previous juz"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Bookmark className="size-4 text-secondary" />
            <span className="text-sm font-medium text-foreground">Juz {currentJuz}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {boundaries.length} juz in this surah
          </p>
        </div>

        <button
          onClick={() => hasNext && onJump(boundaries[currentIndex + 1].juz)}
          disabled={!hasNext}
          className={cn(
            "rounded-lg p-2 transition-all",
            hasNext
              ? "text-secondary hover:bg-secondary/10"
              : "text-muted-foreground/30 cursor-not-allowed",
          )}
          aria-label="Next juz"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {boundaries.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {boundaries.map((b) => (
            <button
              key={b.juz}
              onClick={() => onJump(b.juz)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200",
                b.juz === currentJuz
                  ? "bg-secondary text-secondary-foreground shadow-sm"
                  : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-light",
              )}
            >
              Juz {b.juz}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
