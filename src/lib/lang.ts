import type { DisplayLang, Language } from "@/types"
import { toHinglish } from "@/lib/translit/hinglish"

/**
 * App-wide helpers for the display-language layer.
 *
 * The split these enforce: `Language` ("en" | "hi" | "ur") is what the *data*
 * has, `DisplayLang` adds "hi-Latn" for what the *reader* sees. Data lookups go
 * through `dataLang()`, and the string that comes back goes through
 * `displayText()`. Nothing else in the app needs to know Hinglish exists.
 */

/** The language whose data backs a display choice — Hinglish reads Hindi. */
export function dataLang(lang: DisplayLang): Language {
  return lang === "hi-Latn" ? "hi" : lang
}

/** Render `text` for the chosen display language, transliterating for Hinglish. */
export function displayText(text: string, lang: DisplayLang): string {
  return lang === "hi-Latn" ? toHinglish(text) : text
}

/** Text direction. Urdu is right-to-left; en/hi/hi-Latn are left-to-right. */
export function displayDir(lang: DisplayLang): "rtl" | "ltr" {
  return lang === "ur" ? "rtl" : "ltr"
}

/**
 * Font class. Urdu reuses the Arabic (Noto Naskh) face — no dedicated Urdu font
 * is loaded. Hindi falls back to the system Devanagari font (none is bundled),
 * and Hinglish is Latin, so neither needs a class.
 */
export function displayFont(lang: DisplayLang): string {
  return lang === "ur" ? "font-arabic" : ""
}

/** Human label for the language switcher and tab strips. */
export const DISPLAY_LANG_LABELS: Record<DisplayLang, string> = {
  en: "English",
  hi: "हिन्दी",
  "hi-Latn": "Hinglish",
  ur: "اردو",
}
