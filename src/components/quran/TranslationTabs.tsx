"use client"

import { cn } from "@/lib/utils"
import { DISPLAY_LANG_LABELS } from "@/lib/lang"
import type { DisplayLang } from "@/types"

interface TranslationTabsProps {
  active: DisplayLang
  onChange: (lang: DisplayLang) => void
  showAll?: boolean
}

/**
 * Translation language picker for the reader. Four choices over three
 * translations: Hinglish is the Hindi translation in Latin script, produced at
 * render time by src/lib/translit/hinglish.ts.
 *
 * Laid out 2x2 rather than in a row — four labels do not fit across the reader's
 * side panel without truncating.
 */
export function TranslationTabs({ active, onChange }: TranslationTabsProps) {
  const languages: DisplayLang[] = ["en", "hi", "hi-Latn", "ur"]

  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-lg bg-space-mid/20 p-1 border border-gold-dim/10"
      role="tablist"
    >
      {languages.map((lang) => (
        <button
          key={lang}
          role="tab"
          aria-selected={active === lang}
          onClick={() => onChange(lang)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
            active === lang
              ? "bg-gold-dim/20 text-gold-light border border-gold-dim/20"
              : "text-muted-foreground hover:text-gold-dim border border-transparent",
          )}
        >
          {DISPLAY_LANG_LABELS[lang]}
        </button>
      ))}
    </div>
  )
}
