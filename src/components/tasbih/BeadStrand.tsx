"use client"

import { motion, useReducedMotion } from "framer-motion"
import { beadFill, beadLayout } from "@/lib/tasbih/beads"
import { cn } from "@/lib/utils"

interface BeadStrandProps {
  count: number
  target: number
  className?: string
}

/**
 * The strand under the orb: one bead per count on a 33-style round, or grouped
 * beads on longer targets (see beadLayout). Beads settle in on a spring, so a run
 * of taps reads as beads dropping one after another rather than a bar sliding.
 */
export function BeadStrand({ count, target, className }: BeadStrandProps) {
  const reduceMotion = useReducedMotion()
  const { beads, per } = beadLayout(target)

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex max-w-md flex-wrap items-center justify-center gap-1.5" aria-hidden="true">
        {Array.from({ length: beads }, (_, i) => {
          const fill = beadFill(i, count, per)
          return (
            <motion.span
              key={i}
              className={cn(
                "size-3 rounded-full sm:size-3.5",
                fill >= 1 ? "gold-gradient-bg gold-ring-glow" : "bg-gold-dim/25",
              )}
              animate={{
                scale: 0.72 + fill * 0.28,
                opacity: 0.35 + fill * 0.65,
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 24 }
              }
            />
          )
        })}
      </div>

      {per > 1 && (
        <p className="text-[11px] text-muted-foreground/60">
          1 bead = {per} counts
        </p>
      )}
    </div>
  )
}
