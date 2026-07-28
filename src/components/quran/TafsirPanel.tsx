"use client"

import { useState, useCallback } from "react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchTafsir, TAFSIR_EDITIONS, type TafsirSlug } from "@/lib/quran/tafsir"

interface TafsirPanelProps {
  surahNumber: number
  ayahNumber: number // within-surah
}

export function TafsirPanel({ surahNumber, ayahNumber }: TafsirPanelProps) {
  const [open, setOpen] = useState(false)
  const [activeSlug, setActiveSlug] = useState<TafsirSlug>(TAFSIR_EDITIONS[0].slug)
  const [texts, setTexts] = useState<Partial<Record<TafsirSlug, string | null>>>({})
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (slug: TafsirSlug) => {
      if (slug in texts) return
      setLoading(true)
      const text = await fetchTafsir(slug, surahNumber, ayahNumber)
      setTexts((prev) => ({ ...prev, [slug]: text }))
      setLoading(false)
    },
    [texts, surahNumber, ayahNumber],
  )

  const handleToggle = useCallback(async () => {
    const next = !open
    setOpen(next)
    if (next) await load(activeSlug)
  }, [open, activeSlug, load])

  const handleEdition = useCallback(
    async (slug: TafsirSlug) => {
      setActiveSlug(slug)
      await load(slug)
    },
    [load],
  )

  const activeEdition = TAFSIR_EDITIONS.find((e) => e.slug === activeSlug)!
  const text = texts[activeSlug]

  return (
    <div className="mt-3 border-t border-gold-dim/10 pt-3">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-gold-light transition-colors"
        aria-expanded={open}
      >
        <span className="uppercase tracking-wider">Tafsir</span>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Edition selector */}
          <div className="flex flex-wrap gap-1.5">
            {TAFSIR_EDITIONS.map((ed) => (
              <button
                key={ed.slug}
                onClick={() => handleEdition(ed.slug)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all border",
                  ed.lang === "ur" ? "font-arabic" : "",
                  activeSlug === ed.slug
                    ? "bg-gold-dim/15 text-gold-light border-gold-dim/20"
                    : "text-muted-foreground border-border/20 hover:text-gold-dim hover:border-gold-dim/15",
                )}
              >
                {ed.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div
            className={cn(
              "rounded-lg bg-card/60 border border-gold-dim/10 p-3 text-sm leading-relaxed",
              activeEdition.lang === "ur" ? "text-right font-arabic" : "text-muted-foreground",
            )}
            dir={activeEdition.lang === "ur" ? "rtl" : "ltr"}
          >
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Loading…
              </span>
            ) : text === null ? (
              <span className="text-muted-foreground/60 text-xs">
                Tafsir not available for this verse.
              </span>
            ) : (
              <p>{text}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
