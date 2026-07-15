"use client"

import { motion } from "framer-motion"
import { Bookmark, Copy, Check, Quote } from "lucide-react"
import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { useBookmarks } from "@/hooks/useBookmarks"
import { getGradeColor, getGradeBadge } from "@/lib/hadith/references"
import type { Hadith } from "@/types"

interface HadithCardProps {
  hadith: Hadith
  index?: number
}

export function HadithCard({ hadith, index = 0 }: HadithCardProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const [copied, setCopied] = useState(false)

  const bookmarkId = `hadith-${hadith.id}`
  const gradeBadge = getGradeBadge(hadith.grade)
  const gradeColor = getGradeColor(hadith.grade)

  const handleCopy = useCallback(async () => {
    const text = `${hadith.english}\n\n— ${hadith.reference.collection}, ${hadith.reference.book} (Hadith ${hadith.hadithNumber})${hadith.narrator ? `\nNarrated by ${hadith.narrator}` : ""}${hadith.grade ? `\nGrade: ${hadith.grade}` : ""}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [hadith])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="group relative rounded-xl border border-border/30 bg-card/50 p-5 transition-all duration-200 hover:border-secondary/20 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Quote className="size-4 text-secondary/40 shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">
            Hadith {hadith.hadithNumber}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {gradeBadge && (
            <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-surface", gradeColor)}>
              {gradeBadge}
            </span>
          )}
          <button
            onClick={() =>
              toggleBookmark({
                id: bookmarkId,
                type: "hadith",
                reference: `${hadith.reference.collection} ${hadith.hadithNumber}`,
                text: hadith.english.slice(0, 100),
              })
            }
            className={cn(
              "rounded-lg p-1.5 transition-all",
              isBookmarked(bookmarkId)
                ? "text-secondary bg-secondary/10"
                : "text-muted-foreground hover:text-secondary hover:bg-secondary/5 opacity-0 group-hover:opacity-100",
            )}
            aria-label={isBookmarked(bookmarkId) ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark className={cn("size-3.5", isBookmarked(bookmarkId) && "fill-secondary")} />
          </button>
          <button
            onClick={handleCopy}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-secondary hover:bg-secondary/5 opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Copy hadith"
          >
            {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {hadith.arabic && (
        <p className="text-xl leading-[2.2] font-arabic text-foreground mb-3 text-right" dir="rtl">
          {hadith.arabic}
        </p>
      )}

      {hadith.narrator && (
        <p className="text-xs text-secondary/70 mb-1.5 font-medium">
          {hadith.narrator} narrated:
        </p>
      )}

      <p className="text-sm leading-relaxed text-foreground/90">
        {hadith.english}
      </p>

      <div className="mt-3 pt-3 border-t border-border/20 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>{hadith.reference.collection}</span>
        <span>{hadith.reference.book}</span>
        {hadith.grade && (
          <span className={gradeColor}>
            {hadith.grade}
          </span>
        )}
      </div>
    </motion.div>
  )
}
