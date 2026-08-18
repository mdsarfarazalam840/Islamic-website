"use client"

import { useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, ImageOff, Play } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TestimonialItem {
  id: string | number
  title: string
  description: string
  image: string
}

interface TestimonialsCardProps {
  items: TestimonialItem[]
  activeItemId?: TestimonialItem["id"]
  onActiveItemChange?: (item: TestimonialItem) => void
  onItemAction?: (item: TestimonialItem) => void
  actionLabel?: string
  className?: string
}

export function TestimonialsCard({
  items,
  activeItemId,
  onActiveItemChange,
  onItemAction,
  actionLabel = "Play video",
  className,
}: TestimonialsCardProps) {
  const reduceMotion = useReducedMotion()
  const requestedIndex = items.findIndex((item) => item.id === activeItemId)
  const [internalIndex, setInternalIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const activeIndex = requestedIndex >= 0 ? requestedIndex : Math.min(internalIndex, items.length - 1)
  const activeItem = items[activeIndex]

  if (!activeItem) return null

  const selectIndex = (index: number) => {
    if (index < 0 || index >= items.length || index === activeIndex) return
    setDirection(index > activeIndex ? 1 : -1)
    setInternalIndex(index)
    onActiveItemChange?.(items[index])
  }

  return (
    <section
      className={cn("grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,1fr)] lg:items-center", className)}
      aria-label="Active playlist video"
    >
      <div className="relative isolate aspect-video min-w-0" style={{ perspective: "1400px" }}>
        <div aria-hidden="true" className="absolute inset-3 translate-x-2 rotate-2 rounded-xl border border-gold-dim/15 bg-space-mid/50" />
        <div aria-hidden="true" className="absolute inset-1 -translate-x-1 -rotate-1 rounded-xl border border-gold-dim/20 bg-space-mid/80" />
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeItem.id}
            custom={direction}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 45, rotate: direction * 1.5, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -45, rotate: direction * -1.5, scale: 0.97 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 overflow-hidden rounded-xl border-2 border-gold-dim/35 bg-space-mid shadow-2xl gold-shadow"
          >
            {activeItem.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeItem.image}
                alt=""
                className="size-full object-cover"
                draggable={false}
                onError={(event) => {
                  event.currentTarget.hidden = true
                  event.currentTarget.nextElementSibling?.classList.remove("hidden")
                }}
              />
            )}
            <div className={cn("absolute inset-0 items-center justify-center bg-space-mid", activeItem.image ? "hidden" : "flex")}>
              <ImageOff className="size-10 text-gold-dim/50" aria-hidden="true" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-space-deep/90 to-transparent px-4 pb-3 pt-12 text-right font-mono text-xs text-gold-light/85">
              {activeIndex + 1} / {items.length}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex min-h-48 min-w-0 flex-col justify-center">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
            className="min-h-24"
          >
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold-dim">Video {activeIndex + 1}</p>
            <h3 className="mt-2 line-clamp-3 text-lg font-semibold leading-snug text-foreground sm:text-xl">{activeItem.title}</h3>
            {activeItem.description && <p className="mt-2 text-sm text-muted-foreground">{activeItem.description}</p>}
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => selectIndex(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Previous video" className="flex size-10 items-center justify-center rounded-full border border-gold-dim/30 text-gold-light transition-colors hover:bg-gold-dim/10 disabled:cursor-not-allowed disabled:opacity-35">
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => selectIndex(activeIndex + 1)} disabled={activeIndex === items.length - 1} aria-label="Next video" className="flex size-10 items-center justify-center rounded-full border border-gold-dim/30 text-gold-light transition-colors hover:bg-gold-dim/10 disabled:cursor-not-allowed disabled:opacity-35">
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          {onItemAction && (
            <button type="button" onClick={() => onItemAction(activeItem)} className="ml-1 flex min-h-10 items-center gap-2 rounded-full gold-gradient-bg px-5 py-2 text-sm font-semibold text-space-deep transition-transform hover:scale-[1.02] gold-shadow">
              <Play className="size-4 fill-current" aria-hidden="true" />
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default TestimonialsCard
