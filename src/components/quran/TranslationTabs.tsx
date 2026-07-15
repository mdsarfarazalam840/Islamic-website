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

export function TranslationTabs({ active, onChange, showAll = true }: TranslationTabsProps) {
  const languages: Language[] = ["en", "hi", "ur"]

  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface p-1" role="tablist">
      {showAll && (
        <button
          role="tab"
          aria-selected={active === "en"}
          onClick={() => onChange("en")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
            active === "en"
              ? "bg-secondary/20 text-secondary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {labels.en}
        </button>
      )}
      {languages.map((lang) => (
        <button
          key={lang}
          role="tab"
          aria-selected={active === lang}
          onClick={() => onChange(lang)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
            active === lang
              ? "bg-secondary/20 text-secondary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {labels[lang]}
        </button>
      ))}
    </div>
  )
}
