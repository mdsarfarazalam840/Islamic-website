"use client"

import { cn } from "@/lib/utils"
import { langDir, langFont } from "@/lib/knowledge/lang"
import { VerseBlockView } from "./VerseBlockView"
import { HadithBlockView } from "./HadithBlockView"
import { ArabicBlockView } from "./ArabicBlockView"
import type { HydratedBlock, Language } from "@/types"

interface BlockRendererProps {
  blocks: HydratedBlock[]
  lang: Language
}

/** Renders one language's hydrated body: text blocks respect lang dir/font; verse/hadith delegate. */
export function BlockRenderer({ blocks, lang }: BlockRendererProps) {
  const dir = langDir(lang)
  const font = langFont(lang)

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "p":
            return (
              <p key={i} dir={dir} className={cn(font, "leading-relaxed text-foreground/90")}>
                {block.text}
              </p>
            )
          case "heading":
            return block.level === 2 ? (
              <h2
                key={i}
                dir={dir}
                className={cn(font, "text-xl font-display font-semibold text-gold-light mt-8 mb-1")}
              >
                {block.text}
              </h2>
            ) : (
              <h3
                key={i}
                dir={dir}
                className={cn(font, "text-lg font-display font-semibold text-foreground mt-6 mb-1")}
              >
                {block.text}
              </h3>
            )
          case "list":
            return (
              <ul
                key={i}
                dir={dir}
                className={cn(
                  font,
                  "space-y-1.5 text-foreground/90",
                  dir === "rtl" ? "pr-5" : "pl-5",
                  "list-disc marker:text-gold-dim",
                )}
              >
                {block.items.map((item, j) => (
                  <li key={j} className="leading-relaxed">
                    {item.text}
                  </li>
                ))}
              </ul>
            )
          case "verse":
            return <VerseBlockView key={i} block={block} lang={lang} />
          case "hadith":
            return <HadithBlockView key={i} block={block} lang={lang} />
          case "arabic":
            return <ArabicBlockView key={i} block={block} lang={lang} />
        }
      })}
    </div>
  )
}
