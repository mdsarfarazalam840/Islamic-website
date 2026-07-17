"use client"

import { cn } from "@/lib/utils"

type Language = "en" | "hi" | "ur"

interface TranslationTabsProps {
  active: Language
  onChange: (lang: Language) => void
  showAll?: boolean
}

const labels: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  ur: "اردو",
}

export function TranslationTabs({ active, onChange }: TranslationTabsProps) {
  const languages: Language[] = ["en", "hi", "ur"]

  return (
    <div className="flex items-center gap-1 rounded-lg bg-space-mid/20 p-1 border border-gold-dim/10" role="tablist">
      {languages.map((lang) => (
        <button
          key={lang}
          role="tab"
          aria-selected={active === lang}
          onClick={() => onChange(lang)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 flex-1",
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
