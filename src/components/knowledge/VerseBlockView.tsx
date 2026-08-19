"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { langDir, langFont } from "@/lib/knowledge/lang"
import type { HydratedVerseBlock, Language } from "@/types"

interface VerseBlockViewProps {
  block: HydratedVerseBlock
  lang: Language
}

/**
 * A live Quran verse embedded in an article: Arabic (always RTL + Arabic font)
 * with the translation for the selected language beneath, plus a reference chip
 * linking into the reader. Mirrors AyahDisplay's Arabic/translation idiom.
 */
export function VerseBlockView({ block, lang }: VerseBlockViewProps) {
  const translation = block.translations[lang]?.trim() || block.translations.en
  const transDir = langDir(lang)
  const transFont = langFont(lang)

  return (
    <figure className="my-6 rounded-xl border border-gold-dim/20 bg-gold-dim/5 p-6 scriptorium-glow">
      <p className="font-arabic text-foreground leading-[2.2] text-right text-2xl" dir="rtl">
        {block.arabic}
        <span className="text-gold-dim/60 text-lg mr-2">﴿{block.ayah}﴾</span>
      </p>

      <p
        dir={transDir}
        className={cn("mt-4 leading-relaxed text-muted-foreground", transFont)}
      >
        {translation}
      </p>

      {block.note && (
        <p className="mt-3 text-sm text-gold-dim/70 italic leading-relaxed">{block.note}</p>
      )}

      <figcaption className="mt-4 pt-4 border-t border-gold-dim/10">
        <Link
          href={`/quran/${block.surah}#ayah-${block.globalNumber}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-light hover:text-gold-dim transition-colors"
        >
          Surah {block.surahName} · {block.surah}:{block.ayah}
          <ArrowUpRight className="size-3.5" />
        </Link>
      </figcaption>
    </figure>
  )
}
