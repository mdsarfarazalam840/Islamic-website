"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

/** Geometry of the ring, in the SVG's own 200×200 user space. */
const RADIUS = 92
const BURST_PARTICLES = 12
const BURST_DISTANCE = 132

interface CounterOrbProps {
  count: number
  target: number
  /** Short name of the dhikr being counted, shown under the number. */
  label: string
  /** True for a moment after a round completes; drives the burst. */
  celebrating: boolean
  /** Monotonic id of the last tap, so the ripple re-fires even when count resets to 0. */
  tapId: number
  onCount: () => void
}

/**
 * The tap target: a gold progress ring around a big count. One press is one
 * dhikr, so this is the only control on the page a reader needs to touch —
 * everything else sits outside the orb deliberately.
 */
export function CounterOrb({
  count,
  target,
  label,
  celebrating,
  tapId,
  onCount,
}: CounterOrbProps) {
  const reduceMotion = useReducedMotion()
  const progress = Math.min(1, count / Math.max(1, target))

  return (
    <div className="relative mx-auto size-[272px] sm:size-[320px]">
      {/* Ambient glow, brightened while celebrating. */}
      <motion.div
        className="pointer-events-none absolute -inset-6 rounded-full lantern-glow"
        animate={{ opacity: celebrating ? 1 : 0.55 }}
        transition={{ duration: reduceMotion ? 0 : 0.4 }}
      />

      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 size-full -rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tasbih-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5d77b" />
            <stop offset="55%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#b8922e" />
          </linearGradient>
        </defs>

        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          className="stroke-gold-dim/15"
        />
        {/* pathLength lets framer drive the dash offsets, so no circumference
            arithmetic has to stay in sync with RADIUS. */}
        <motion.circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke="url(#tasbih-ring)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress }}
          transition={
            reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }
          }
        />
      </svg>

      {/* Tap ripple. Keyed on the tap id rather than the count, which returns to
          zero at the end of a round and would otherwise skip a ripple. */}
      {!reduceMotion && (
        <AnimatePresence initial={false}>
          <motion.span
            key={tapId}
            className="pointer-events-none absolute inset-3 rounded-full border border-gold-light/60"
            initial={{ opacity: 0.5, scale: 0.92 }}
            animate={{ opacity: 0, scale: 1.12 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </AnimatePresence>
      )}

      {/* Round-complete burst. */}
      {!reduceMotion && (
        <AnimatePresence>
          {celebrating && (
            <motion.span
              className="pointer-events-none absolute inset-0 grid place-items-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {Array.from({ length: BURST_PARTICLES }, (_, i) => {
                const angle = (i / BURST_PARTICLES) * Math.PI * 2
                return (
                  <motion.span
                    key={i}
                    className="absolute size-1.5 rounded-full bg-gold-light gold-ring-glow"
                    initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                    animate={{
                      opacity: [1, 1, 0],
                      scale: [0.5, 1.15, 0.7],
                      x: Math.cos(angle) * BURST_DISTANCE,
                      y: Math.sin(angle) * BURST_DISTANCE,
                    }}
                    transition={{ duration: 0.85, ease: "easeOut" }}
                  />
                )
              })}
            </motion.span>
          )}
        </AnimatePresence>
      )}

      <motion.button
        type="button"
        onClick={onCount}
        whileTap={reduceMotion ? undefined : { scale: 0.95 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "absolute inset-4 flex flex-col items-center justify-center gap-1 rounded-full",
          "glass-gold cursor-pointer select-none outline-none",
          "transition-shadow duration-300 hover:gold-shadow focus-visible:gold-shadow-lg",
          "focus-visible:ring-2 focus-visible:ring-gold-light/60",
          celebrating && "gold-shadow-lg",
        )}
        aria-label={`Count ${label}. ${count} of ${target}.`}
      >
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
          Tap to count
        </span>

        <span className="relative flex h-20 items-center justify-center sm:h-24">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={count}
              className="font-display text-6xl font-bold tabular-nums gold-gradient-text sm:text-7xl"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18 }}
              transition={
                reduceMotion ? { duration: 0.1 } : { type: "spring", stiffness: 420, damping: 30 }
              }
            >
              {count}
            </motion.span>
          </AnimatePresence>
        </span>

        <span className="text-sm text-muted-foreground tabular-nums">of {target}</span>
        <span className="max-w-[80%] truncate text-xs text-gold-dim/80">{label}</span>
      </motion.button>
    </div>
  )
}
