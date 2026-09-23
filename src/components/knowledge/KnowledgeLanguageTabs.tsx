"use client"

import { cn } from "@/lib/utils"
import { DISPLAY_LANG_LABELS } from "@/lib/lang"
import type { DisplayLang } from "@/types"

interface KnowledgeLanguageTabsProps {
  active: DisplayLang
  onChange: (lang: DisplayLang) => void
  className?: string
}

/**
 * Language toggle for the Knowledge Base. Local state, mirrors TranslationTabs.
 *
 * Four tabs over three authored languages: Hinglish is the Hindi text in Latin
 * script, transliterated at render time (see src/lib/translit/hinglish.ts).
 */
export function KnowledgeLanguageTabs({ active, onChange, className }: KnowledgeLanguageTabsProps) {
  const languages: DisplayLang[] = ["en", "hi", "hi-Latn", "ur"]

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-lg bg-space-mid/20 p-1 border border-gold-dim/10",
        className,
      )}
      role="tablist"
      aria-label="Article language"
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
