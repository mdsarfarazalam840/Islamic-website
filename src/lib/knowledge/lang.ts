import type { Language, LocalizedText } from "@/types"

/** Text direction for a language. Urdu is right-to-left; en/hi are left-to-right. */
export function langDir(lang: Language): "rtl" | "ltr" {
  return lang === "ur" ? "rtl" : "ltr"
}

/**
 * Font class for a language. Urdu reuses the Arabic (Noto Naskh) font — there
 * is no dedicated Urdu face loaded. Hindi falls back to the system Devanagari
 * font (none is bundled), so no class is applied.
 */
export function langFont(lang: Language): string {
  return lang === "ur" ? "font-arabic" : ""
}

/**
 * Pick a localized string for the selected language, falling back to English
 * when that translation is empty. This keeps partially-authored articles from
 * rendering blank while translations are still being reviewed.
 */
export function pick(text: LocalizedText, lang: Language): string {
  const value = text[lang]?.trim()
  return value ? text[lang] : text.en
}
