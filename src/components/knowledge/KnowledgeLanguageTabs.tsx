"use client"

import { cn } from "@/lib/utils"
import type { Language } from "@/types"

interface KnowledgeLanguageTabsProps {
  active: Language
  onChange: (lang: Language) => void
  className?: string
}

const labels: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  ur: "اردو",
}

/** en/hi/ur toggle for the Knowledge Base. Local state, mirrors TranslationTabs. */
export function KnowledgeLanguageTabs({ active, onChange, className }: KnowledgeLanguageTabsProps) {
  const languages: Language[] = ["en", "hi", "ur"]

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg bg-space-mid/20 p-1 border border-gold-dim/10",
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
          {labels[lang]}
        </button>
      ))}
    </div>
  )
}
