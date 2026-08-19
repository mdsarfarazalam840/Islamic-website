"use client"

import Link from "next/link"
import { ArrowUpRight, Quote } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HydratedHadithBlock, Language } from "@/types"

interface HadithBlockViewProps {
  block: HydratedHadithBlock
  lang: Language
}

// Source-strength coloring for the grade chip (DESIGN.md §9), matching HadithCard.
function gradeChipClass(grade: string): string {
  const g = grade.toLowerCase()
  if (g.includes("sahih")) return "bg-emerald/10 text-emerald border border-emerald/20"
  if (g.includes("hasan")) return "bg-gold-dim/10 text-gold-light border border-gold-dim/20"
  return "bg-space-mid/30 text-muted-foreground border border-border/20"
}

function gradeLabel(grade: string): string {
  const g = grade.toLowerCase()
  if (g.includes("sahih")) return "Sahih"
  if (g.includes("hasan")) return "Hasan"
  if (g.includes("daif") || g.includes("da'if")) return "Da'if"
  return grade
}

/**
 * An inline hadith preview embedded in an article: narrator, grade badge,
 * Arabic (RTL) + translation (Urdu RTL for `ur`, else English — the hadith
 * dataset has no Hindi), and a link out to the full text in the hadith library.
 */
export function HadithBlockView({ block, lang }: HadithBlockViewProps) {
  const showUrdu = lang === "ur" && block.urdu.trim().length > 0
  const grade = gradeLabel(block.grade)

  return (
    <figure className="my-6 rounded-xl border border-border/20 bg-card/40 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Quote className="size-4 text-gold-dim/40 shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">
            {block.collectionName} · Hadith {block.hadith}
          </span>
        </div>
        {grade && (
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shrink-0",
              gradeChipClass(block.grade),
            )}
          >
            {grade}
          </span>
        )}
      </div>

      {block.narrator && (
        <p className="text-xs text-gold-dim/70 mb-2 font-medium">
          {block.narrator.includes(" → ")
            ? block.narrator.split(" → ").pop()?.trim()
            : block.narrator}{" "}
          narrated:
        </p>
      )}

      {block.arabic && (
        <p className="font-arabic text-foreground leading-[2.2] text-right mb-3" dir="rtl">
          {block.arabic}
        </p>
      )}

      {showUrdu ? (
        <p className="font-arabic leading-relaxed text-foreground/90" dir="rtl">
          {block.urdu}
        </p>
      ) : (
        <p className="leading-relaxed text-foreground/90">{block.english}</p>
      )}

      {block.note && (
        <p className="mt-3 text-sm text-gold-dim/70 italic leading-relaxed">{block.note}</p>
      )}

      <figcaption className="mt-4 pt-3 border-t border-border/10">
        <Link
          href={block.href}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-light hover:text-gold-dim transition-colors"
        >
          View in {block.collectionName}
          <ArrowUpRight className="size-3.5" />
        </Link>
      </figcaption>
    </figure>
  )
}
