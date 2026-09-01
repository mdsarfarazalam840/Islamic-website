"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { useTasbih, useTasbihHydrated } from "@/hooks/useTasbih"
import { DEFAULT_DHIKR_ID, getDhikr } from "@/lib/tasbih/dhikr"
import { BeadStrand } from "./BeadStrand"
import { CounterOrb } from "./CounterOrb"
import { DhikrSelector } from "./DhikrSelector"
import { TasbihStats } from "./TasbihStats"

/** Stable empty maps, so the pre-hydration render does not hand down a new object each time. */
const NO_COUNTS: Record<string, number> = {}

const CELEBRATION_MS = 1100

interface Celebration {
  /** Bumped on every completion so a repeat of the same round still re-triggers. */
  id: number
  label: string
  target: number
}

/**
 * The tasbih counter. Counts live in localStorage (see hooks/useTasbih.ts), so
 * the prerendered HTML shows a fresh counter and the reader's real totals appear
 * once hydration has run — the same rule the saved views follow.
 */
export function TasbihClient() {
  const reduceMotion = useReducedMotion()
  const hydrated = useTasbihHydrated()
  const store = useTasbih()

  const [tapId, setTapId] = useState(0)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current)
    }
  }, [])

  // Read once hydration has run, so the check never differs from the prerender.
  // iOS Safari has no navigator.vibrate, and the toggle is pointless there.
  const hapticsAvailable =
    hydrated && typeof navigator !== "undefined" && typeof navigator.vibrate === "function"

  const fallbackTarget = getDhikr(DEFAULT_DHIKR_ID)?.defaultTarget ?? 33

  const activeId = hydrated ? store.activeId : DEFAULT_DHIKR_ID
  const target = hydrated ? store.target : fallbackTarget
  const count = hydrated ? store.count : 0
  const rounds = hydrated ? store.rounds : NO_COUNTS
  const lifetime = hydrated ? store.lifetime : NO_COUNTS
  const sessionTotal = hydrated ? store.sessionTotal : 0
  const sequenceMode = hydrated ? store.sequenceMode : false
  const haptics = hydrated ? store.haptics : true

  const activeLabel = getDhikr(activeId)?.label ?? activeId

  const handleCount = useCallback(() => {
    // The dhikr that is finishing, captured before tick — in sequence mode the
    // active dhikr has already moved on by the time this returns.
    const finishingLabel = getDhikr(useTasbih.getState().activeId)?.label ?? ""
    const completed = store.tick()

    setTapId((n) => n + 1)

    if (store.haptics && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(completed ? [30, 40, 30] : 10)
    }

    if (completed !== null) {
      setCelebration((prev) => ({
        id: (prev?.id ?? 0) + 1,
        label: finishingLabel,
        target: completed,
      }))
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current)
      celebrationTimer.current = setTimeout(() => setCelebration(null), CELEBRATION_MS)
    }
  }, [store])

  return (
    <div className="flex flex-col gap-10">
      <DhikrSelector
        activeId={activeId}
        target={target}
        sequenceMode={sequenceMode}
        onSelect={store.selectDhikr}
        onTarget={store.setTarget}
        onToggleSequence={store.toggleSequence}
      />

      <div className="flex flex-col items-center gap-6">
        <CounterOrb
          count={count}
          target={target}
          label={activeLabel}
          celebrating={celebration !== null}
          tapId={tapId}
          onCount={handleCount}
        />

        <BeadStrand count={count} target={target} />

        {/* Fixed height so the banner appearing does not push the strand around. */}
        <div className="flex h-7 items-center justify-center">
          <AnimatePresence mode="wait">
            {celebration && (
              <motion.p
                key={celebration.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.25, ease: "easeOut" }}
                className="flex items-center gap-2 rounded-lg border border-gold-dim/30 bg-gold-dim/10 px-3 py-1.5 text-xs font-medium text-gold-light"
              >
                <Sparkles className="size-3.5" aria-hidden />
                {celebration.label} &times;{celebration.target} complete
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Only round completions are announced. A live region updated on every tap
          would read the count out continuously, which makes the page unusable
          with a screen reader. */}
      <p role="status" aria-live="polite" className="sr-only">
        {celebration ? `${celebration.label}, round of ${celebration.target} complete` : ""}
      </p>

      <hr className="gold-divider" />

      <TasbihStats
        activeId={activeId}
        activeLabel={activeLabel}
        rounds={rounds}
        lifetime={lifetime}
        sessionTotal={sessionTotal}
        haptics={haptics}
        hapticsAvailable={hapticsAvailable}
        canUndo={count > 0}
        onUndo={store.undo}
        onResetRound={store.resetRound}
        onResetAll={store.resetAll}
        onToggleHaptics={store.toggleHaptics}
      />
    </div>
  )
}
