import type { DisplayLang, HydratedBlock, LocalizedText } from "@/types"
import { dataLang, displayDir, displayFont, displayText } from "@/lib/lang"

/**
 * Knowledge Base language helpers. Thin wrappers over src/lib/lang.ts, kept at
 * their existing names and import path so KB callers do not all have to change.
 *
 * All three accept a DisplayLang, which is a superset of Language — existing
 * callers passing "en" | "hi" | "ur" are unaffected.
 */

/** Text direction for a language. Urdu is right-to-left; the rest are left-to-right. */
export function langDir(lang: DisplayLang): "rtl" | "ltr" {
  return displayDir(lang)
}

/**
 * Font class for a language. Urdu reuses the Arabic (Noto Naskh) font — there
 * is no dedicated Urdu face loaded. Hindi falls back to the system Devanagari
 * font (none is bundled) and Hinglish is Latin, so neither gets a class.
 */
export function langFont(lang: DisplayLang): string {
  return displayFont(lang)
}

/**
 * Pick a localized string for the selected language, falling back to English
 * when that translation is empty. This keeps partially-authored articles from
 * rendering blank while translations are still being reviewed.
 *
 * Hinglish reads the Hindi field and transliterates it; a fallback to English
 * is returned as authored, since English is already Latin script.
 */
export function pick(text: LocalizedText, lang: DisplayLang): string {
  const key = dataLang(lang)
  const value = text[key]?.trim()
  if (!value) return text.en
  return displayText(text[key], lang)
}

/**
 * Render an article body for the selected display language.
 *
 * The caller has already chosen the array — `article.body[dataLang(lang)]` — so
 * all this does is transliterate the authored text inside each block for
 * Hinglish, and return the blocks untouched for every other language. Doing it
 * here rather than in each block view keeps the renderers language-agnostic:
 * they receive text that is already in the script they should show.
 *
 * Left alone: Arabic (`text`), an authored `transliteration` (already Latin),
 * and a hadith block's English/Urdu, none of which are Devanagari.
 */
export function displayBlocks(blocks: HydratedBlock[], lang: DisplayLang): HydratedBlock[] {
  if (lang !== "hi-Latn") return blocks

  const t = (s: string) => displayText(s, lang)
  const opt = (s: string | undefined) => (s === undefined ? undefined : t(s))

  return blocks.map((block): HydratedBlock => {
    switch (block.kind) {
      case "p":
      case "heading":
        return { ...block, text: t(block.text) }
      case "list":
        return { ...block, items: block.items.map((item) => ({ ...item, text: t(item.text) })) }
      case "arabic":
        return { ...block, label: opt(block.label), translation: opt(block.translation) }
      case "verse":
        return {
          ...block,
          note: opt(block.note),
          translations: { ...block.translations, hi: t(block.translations.hi) },
        }
      case "hadith":
        return { ...block, note: opt(block.note) }
    }
  })
}
