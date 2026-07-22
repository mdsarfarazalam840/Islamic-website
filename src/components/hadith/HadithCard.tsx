"use client"

import { motion } from "framer-motion"
import { Bookmark, Copy, Check, Quote } from "lucide-react"
import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useFontSize, getFontSizeClass } from "@/hooks/useFontSize"
import { getGradeColor, getGradeBadge } from "@/lib/hadith/references"
import type { Hadith } from "@/types"

interface HadithCardProps {
  hadith: Hadith
  index?: number
}

function SanadChain({ narrators }: { narrators?: string }) {
  if (!narrators) return null
  const hasArrow = narrators.includes(" → ")
  const chain = hasArrow ? narrators.split(" → ") : null

  if (!chain) {
    return (
      <div className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-gold-dim/5 border border-gold-dim/10 mb-3">
        <span className="text-[10px] text-gold-dim/40">Sanad</span>
        <span className="text-[11px] text-gold-light/80 font-medium">{narrators}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap py-2 px-3 rounded-lg bg-gold-dim/5 border border-gold-dim/10 mb-3">
      {chain.map((name, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-[11px] text-gold-light/80 font-medium">{name.trim()}</span>
          {i < chain.length - 1 && (
            <span className="text-gold-dim/30 text-[10px]">◆</span>
          )}
        </span>
      ))}
    </div>
  )
}

export function HadithCard({ hadith, index = 0 }: HadithCardProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const { level } = useFontSize()
  const [copied, setCopied] = useState(false)

  const bookmarkId = `hadith-${hadith.id}`
  const gradeBadge = getGradeBadge(hadith.grade)
  const gradeColor = getGradeColor(hadith.grade)

  const handleCopy = useCallback(async () => {
    const parts = [hadith.english]
    if (hadith.urdu) parts.push(hadith.urdu)
    const text = `${parts.join("\n\n")}\n\n— ${hadith.reference.collection}, ${hadith.reference.book} (Hadith ${hadith.hadithNumber})${hadith.narrator ? `\nNarrated by ${hadith.narrator}` : ""}${hadith.grade ? `\nGrade: ${hadith.grade}` : ""}`
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
      id={`hadith-${hadith.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.03, ease: "easeOut" }}
      className="group relative rounded-xl border border-border/20 bg-card/40 p-5 transition-all duration-300 hover:border-gold-dim/15 hover:bg-card/60"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Quote className="size-4 text-gold-dim/40 shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">
            Hadith {hadith.hadithNumber}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {gradeBadge && (
            <span className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              hadith.grade?.toLowerCase().includes("sahih")
                ? "bg-emerald/10 text-emerald border border-emerald/20"
                : hadith.grade?.toLowerCase().includes("hasan")
                ? "bg-gold-dim/10 text-gold-light border border-gold-dim/20"
                : "bg-space-mid/30 text-muted-foreground border border-border/20"
            )}>
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
                ? "text-gold-light bg-gold-dim/10"
                : "text-muted-foreground hover:text-gold-light hover:bg-gold-dim/5 opacity-0 group-hover:opacity-100",
            )}
            aria-label={isBookmarked(bookmarkId) ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark className={cn("size-3.5", isBookmarked(bookmarkId) && "fill-gold-light")} />
          </button>
          <button
            onClick={handleCopy}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-gold-light hover:bg-gold-dim/5 opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Copy hadith"
          >
            {copied ? <Check className="size-3.5 text-emerald" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {hadith.narrator && (
        <SanadChain narrators={hadith.narrator} />
      )}

      {hadith.arabic && (
        <p className={cn("leading-[2.2] font-arabic text-foreground mb-3 text-right", getFontSizeClass(level, "hadithArabic"))} dir="rtl">
          {hadith.arabic}
        </p>
      )}

      {hadith.narrator && (
        <p className="text-xs text-gold-dim/70 mb-1.5 font-medium">
          {hadith.narrator.includes(" → ")
            ? hadith.narrator.split(" → ").pop()?.trim()
            : hadith.narrator} narrated:
        </p>
      )}

      <p className={cn("leading-relaxed text-foreground/90", getFontSizeClass(level, "translation"))}>
        {hadith.english}
      </p>

      {hadith.urdu && (
        <p className={cn("leading-relaxed text-foreground/80 mt-3 pt-3 border-t border-border/10 font-arabic", getFontSizeClass(level, "translation"))} dir="rtl">
          {hadith.urdu}
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-gold-dim/10 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>{hadith.reference.collection}</span>
        <span>{hadith.reference.book}</span>
        {hadith.grade && (
          <span className={cn(
            hadith.grade.toLowerCase().includes("sahih")
              ? "text-emerald"
              : hadith.grade.toLowerCase().includes("hasan")
              ? "text-gold-light"
              : "text-muted-foreground"
          )}>
            {hadith.grade}
          </span>
        )}
      </div>
    </motion.div>
  )
}
