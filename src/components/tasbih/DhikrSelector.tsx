"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ExternalLink, Repeat } from "lucide-react"
import { DHIKR_PRESETS, TARGET_CHOICES, TASBIH_FATIMAH_SEQUENCE, getDhikr } from "@/lib/tasbih/dhikr"
import { cn } from "@/lib/utils"

interface DhikrSelectorProps {
  activeId: string
  target: number
  sequenceMode: boolean
  onSelect: (id: string) => void
  onTarget: (target: number) => void
  onToggleSequence: () => void
}

const chip =
  "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"

export function DhikrSelector({
  activeId,
  target,
  sequenceMode,
  onSelect,
  onTarget,
  onToggleSequence,
}: DhikrSelectorProps) {
  const reduceMotion = useReducedMotion()
  const active = getDhikr(activeId) ?? DHIKR_PRESETS[0]
  const [custom, setCustom] = useState("")

  const sequenceSummary = TASBIH_FATIMAH_SEQUENCE.map((s) => s.target).join(" · ")

  function commitCustom() {
    const parsed = Number(custom)
    if (Number.isFinite(parsed) && parsed >= 1) onTarget(Math.min(10000, Math.floor(parsed)))
    setCustom("")
  }

  return (
    <div className="flex flex-col gap-5">
      {/* On a phone the chips scroll rather than wrapping to four lines — the
          same pattern as the filter row in SavedClient.tsx. From sm up they
          wrap instead: the scrollbar is hidden, and a pointer has no way to
          swipe, so a scrolling row there leaves the later dhikr unreachable. */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-x-visible sm:pb-0"
        role="group"
        aria-label="Choose a dhikr"
      >
        {DHIKR_PRESETS.map((preset) => {
          const isActive = preset.id === active.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              aria-pressed={isActive}
              className={cn(
                chip,
                isActive
                  ? "border-gold-dim/40 bg-gold-dim/15 text-gold-light"
                  : "border-border/40 text-muted-foreground hover:border-gold-dim/25 hover:text-gold-dim",
              )}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-gold-dim/20 bg-card/40 p-5 sm:p-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: "easeOut" }}
            className="flex flex-col gap-3 text-center"
          >
            <p dir="rtl" lang="ar" className="font-arabic text-2xl leading-relaxed text-gold-light sm:text-3xl">
              {active.arabic}
            </p>
            <p className="text-sm italic text-muted-foreground">{active.transliteration}</p>
            <p className="text-sm text-foreground/90">{active.translation}</p>
            <p className="text-xs text-muted-foreground/70">
              {active.note}
              {active.source && (
                <>
                  {" "}
                  <Link
                    href={`/search?q=${encodeURIComponent(active.source.query)}`}
                    className="inline-flex items-center gap-1 text-gold-dim hover:text-gold-light transition-colors"
                  >
                    {active.source.label}
                    <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </>
              )}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Round target">
          <span className="text-xs uppercase tracking-wider text-muted-foreground/70">Target</span>
          {TARGET_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => onTarget(choice)}
              aria-pressed={target === choice}
              className={cn(
                chip,
                "tabular-nums",
                target === choice
                  ? "border-gold-dim/40 bg-gold-dim/15 text-gold-light"
                  : "border-border/40 text-muted-foreground hover:border-gold-dim/25 hover:text-gold-dim",
              )}
            >
              {choice}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={10000}
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commitCustom()
              }
            }}
            placeholder="Custom"
            aria-label="Custom round target"
            className="w-20 rounded-lg border border-border/40 bg-transparent px-2 py-1.5 text-xs tabular-nums text-foreground placeholder:text-muted-foreground/50 focus:border-gold-dim/40 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onToggleSequence}
          aria-pressed={sequenceMode}
          className={cn(
            "flex items-center gap-2 self-start rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:self-auto",
            sequenceMode
              ? "border-gold-dim/40 bg-gold-dim/15 text-gold-light"
              : "border-border/40 text-muted-foreground hover:border-gold-dim/25 hover:text-gold-dim",
          )}
        >
          <Repeat className="size-3.5" aria-hidden />
          Tasbih of Fatimah
          <span className="tabular-nums text-muted-foreground/60">{sequenceSummary}</span>
        </button>
      </div>
    </div>
  )
}
