"use client"

import { useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { RotateCcw, Trash2, Undo2, Vibrate, VibrateOff } from "lucide-react"
import { DHIKR_PRESETS } from "@/lib/tasbih/dhikr"
import { cn } from "@/lib/utils"

interface TasbihStatsProps {
  activeId: string
  activeLabel: string
  rounds: Record<string, number>
  lifetime: Record<string, number>
  sessionTotal: number
  haptics: boolean
  /** Whether the device exposes navigator.vibrate at all. */
  hapticsAvailable: boolean
  canUndo: boolean
  onUndo: () => void
  onResetRound: () => void
  onResetAll: () => void
  onToggleHaptics: () => void
}

const control =
  "flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-gold-dim/25 hover:text-gold-light disabled:pointer-events-none disabled:opacity-40"

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gold-dim/15 bg-card/30 px-4 py-3 text-center">
      <p className="font-display text-2xl font-semibold tabular-nums text-gold-light">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground/70">{label}</p>
    </div>
  )
}

/**
 * Totals and the controls that are not the orb. Reset-all is two-step because it
 * clears lifetime counts, which nothing else on the page can restore.
 */
export function TasbihStats({
  activeId,
  activeLabel,
  rounds,
  lifetime,
  sessionTotal,
  haptics,
  hapticsAvailable,
  canUndo,
  onUndo,
  onResetRound,
  onResetAll,
  onToggleHaptics,
}: TasbihStatsProps) {
  const reduceMotion = useReducedMotion()
  const [confirmingReset, setConfirmingReset] = useState(false)

  const counted = DHIKR_PRESETS.filter((preset) => (lifetime[preset.id] ?? 0) > 0).sort(
    (a, b) => (lifetime[b.id] ?? 0) - (lifetime[a.id] ?? 0),
  )
  const lifetimeTotal = Object.values(lifetime).reduce((sum, n) => sum + n, 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={`${activeLabel} rounds`} value={rounds[activeId] ?? 0} />
        <Tile label="This session" value={sessionTotal} />
        <Tile label={`${activeLabel} total`} value={lifetime[activeId] ?? 0} />
        <Tile label="All dhikr" value={lifetimeTotal} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onUndo} disabled={!canUndo} className={control}>
          <Undo2 className="size-3.5" aria-hidden />
          Undo
        </button>
        <button type="button" onClick={onResetRound} className={control}>
          <RotateCcw className="size-3.5" aria-hidden />
          Reset round
        </button>

        <AnimatePresence mode="wait" initial={false}>
          {confirmingReset ? (
            <motion.span
              key="confirm"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.18 }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => {
                  onResetAll()
                  setConfirmingReset(false)
                }}
                className={cn(control, "border-destructive/40 text-destructive hover:border-destructive/60 hover:text-destructive")}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Clear every count
              </button>
              <button type="button" onClick={() => setConfirmingReset(false)} className={control}>
                Keep them
              </button>
            </motion.span>
          ) : (
            <motion.button
              key="ask"
              type="button"
              onClick={() => setConfirmingReset(true)}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.18 }}
              className={control}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Reset all
            </motion.button>
          )}
        </AnimatePresence>

        {hapticsAvailable && (
          <button
            type="button"
            onClick={onToggleHaptics}
            aria-pressed={haptics}
            className={cn(control, haptics && "border-gold-dim/40 text-gold-light")}
          >
            {haptics ? <Vibrate className="size-3.5" aria-hidden /> : <VibrateOff className="size-3.5" aria-hidden />}
            {haptics ? "Vibration on" : "Vibration off"}
          </button>
        )}
      </div>

      {counted.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Lifetime by dhikr
          </h2>
          <ul className="flex flex-col gap-1.5">
            {counted.map((preset) => {
              const total = lifetime[preset.id] ?? 0
              const share = lifetimeTotal > 0 ? (total / lifetimeTotal) * 100 : 0
              return (
                <li key={preset.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">{preset.label}</span>
                  {/* block, not the default inline: an inline span ignores the
                      track's height and width. */}
                  <span
                    className="block h-1 w-16 shrink-0 overflow-hidden rounded-full bg-border sm:w-24"
                    aria-hidden
                  >
                    <motion.span
                      className="block h-full rounded-full gold-gradient-bg"
                      animate={{ width: `${share}%` }}
                      transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right text-xs tabular-nums text-gold-dim">
                    {total}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
