"use client"

import { useEffect, useState } from "react"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ur", label: "Urdu" },
]

const STORAGE_KEY = "noor-language"

export function LanguageSwitcher() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [language, setLanguageState] = useState("en")

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setLanguageState(stored)
  }, [])

  function setLanguage(value: string) {
    setLanguageState(value)
    localStorage.setItem(STORAGE_KEY, value)
    window.dispatchEvent(new CustomEvent("noor:languageChange", { detail: { language: value } }))
    setOpen(false)
  }

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled aria-label="Language" className="size-8"><div className="size-4" /></Button>
  }

  const current = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0]

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label={`Language: ${current.label}`} className="size-8">
        <Languages className="size-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-32 rounded-lg border border-border bg-popover p-1 shadow-lg">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted aria-[current=true]:text-secondary"
                aria-current={language === lang.value}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
