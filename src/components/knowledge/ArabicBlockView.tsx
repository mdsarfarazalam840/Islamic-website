"use client"

import { cn } from "@/lib/utils"
import { langDir, langFont } from "@/lib/knowledge/lang"
import type { ArabicBlock, Language } from "@/types"

interface ArabicBlockViewProps {
  block: ArabicBlock
  lang: Language
}

/**
 * Devotional Arabic that is not a Qur'an ayah — a kalima, the azaan, imaan-e-mujmal.
 * Mirrors VerseBlockView's scriptorium panel, minus the /quran deep link (there is
 * nothing to link to), plus an optional transliteration line so a reader who cannot
 * read Arabic script can still recite it.
 */
export function ArabicBlockView({ block, lang }: ArabicBlockViewProps) {
  const dir = langDir(lang)
  const font = langFont(lang)

  return (
    <figure className="my-6 rounded-xl border border-gold-dim/20 bg-gold-dim/5 p-6 scriptorium-glow">
      {block.label && (
        <figcaption
          dir={dir}
          className={cn(
            font,
            "mb-3 text-xs font-medium uppercase tracking-wide text-gold-light/80",
          )}
        >
          {block.label}
        </figcaption>
      )}

      {/* whitespace-pre-line so a multi-line text — the azaan, called line by
          line — keeps its line breaks. Single-line blocks are unaffected. */}
      <p
        className="font-arabic whitespace-pre-line text-foreground leading-[2.2] text-right text-2xl"
        dir="rtl"
      >
        {block.text}
      </p>

      {block.transliteration && (
        <p
          className="mt-4 whitespace-pre-line text-sm italic leading-relaxed text-gold-light/90"
          dir="ltr"
        >
          {block.transliteration}
        </p>
      )}

      {block.translation && (
        <p
          dir={dir}
          className={cn("mt-3 whitespace-pre-line leading-relaxed text-muted-foreground", font)}
        >
          {block.translation}
        </p>
      )}
    </figure>
  )
}
