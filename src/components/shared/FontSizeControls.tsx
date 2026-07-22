"use client"

import { Minus, Plus, Type } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFontSize, FONT_SIZE_LEVELS, DEFAULT_LEVEL } from "@/hooks/useFontSize"

interface FontSizeControlsProps {
  className?: string
}

export function FontSizeControls({ className }: FontSizeControlsProps) {
  const { level, increase, decrease, reset } = useFontSize()

  const canDecrease = level > 0
  const canIncrease = level < FONT_SIZE_LEVELS - 1
  const isDefault = level === DEFAULT_LEVEL

  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-50",
        "bottom-24 md:bottom-6",
        "flex items-center gap-1 rounded-full",
        "bg-card/90 backdrop-blur-md border border-gold-dim/20",
        "px-2 py-1.5 shadow-lg shadow-black/10",
        className,
      )}
    >
      <button
        onClick={decrease}
        disabled={!canDecrease}
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-all",
          canDecrease
            ? "text-muted-foreground hover:text-gold-light hover:bg-gold-dim/10"
            : "text-muted-foreground/30 cursor-not-allowed",
        )}
        aria-label="Decrease font size"
      >
        <Minus className="size-4" />
      </button>

      <button
        onClick={reset}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all",
          "text-xs font-medium",
          isDefault
            ? "text-gold-light bg-gold-dim/10"
            : "text-muted-foreground hover:text-gold-light hover:bg-gold-dim/5",
        )}
        aria-label="Reset font size"
        title="Reset to default"
      >
        <Type className="size-3.5" />
        <span className="w-4 text-center">{level + 1}</span>
      </button>

      <button
        onClick={increase}
        disabled={!canIncrease}
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-all",
          canIncrease
            ? "text-muted-foreground hover:text-gold-light hover:bg-gold-dim/10"
            : "text-muted-foreground/30 cursor-not-allowed",
        )}
        aria-label="Increase font size"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}
