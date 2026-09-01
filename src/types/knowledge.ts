// Knowledge Base data model.
//
// Articles are trilingual by design: every human-authored text field carries
// { en, hi, ur } and the renderer shows one language at a time (KB-local
// toggle). "verse"/"hadith" blocks are language-agnostic *references* into the
// existing Quran/Hadith data — no scripture is duplicated here; it is resolved
// live at build time (see src/lib/knowledge/hydrate.ts).

/** The three authored languages. Shared across the app; re-exported from src/types/index.ts. */
export type Language = "en" | "hi" | "ur"

/** A localized string: the same text in each supported language. */
export interface LocalizedText {
  en: string
  hi: string
  ur: string
}

export type KnowledgeCategory =
  | "basics"
  | "salah"
  | "prophets"
  | "quranic"
  | "surahs"
  | "concepts"
  | "seerah"
  | "hadith-stories"
  | "creed"

/** Hadith authenticity grade, as carried on a source tag. */
export type HadithGrade = "sahih" | "hasan" | "daif"

/**
 * A graded, referenced source backing an article. Rendered as a strength-colored
 * badge (emerald = sahih/Quran, gold = hasan, muted = da'if) per DESIGN.md §9.
 */
export type SourceTag =
  | { type: "quran"; ref: string }
  | { type: "hadith"; collection: string; ref: string; grade: HadithGrade }
  | { type: "tafsir"; scholar: string }
  | { type: "seerah" }

// --- Content blocks --------------------------------------------------------
// Text blocks carry a plain string; the language is implied by which body array
// (body.en / body.hi / body.ur) the block lives in. verse/hadith blocks are
// language-agnostic refs, so they are repeated verbatim across the three arrays.

export interface ParagraphBlock {
  kind: "p"
  text: string
}
export interface HeadingBlock {
  kind: "heading"
  level: 2 | 3
  text: string
}
export interface ListBlock {
  kind: "list"
  items: { text: string }[]
}
export interface VerseBlock {
  kind: "verse"
  surah: number
  ayah: number
  note?: string
}
/**
 * A devotional Arabic text that is NOT a Qur'an ayah — a kalima, the words of
 * the azaan, imaan-e-mujmal, and the like. `text` is the Arabic and is repeated
 * verbatim across the three language bodies; `transliteration`, `translation`
 * and `label` are authored per language, like a verse block's `note`.
 */
export interface ArabicBlock {
  kind: "arabic"
  text: string
  transliteration?: string
  translation?: string
  label?: string
}
export interface HadithBlock {
  kind: "hadith"
  collection: string
  /** Optional human label only; the authoritative bookId is resolved at build time. */
  book?: string
  hadith: number
  note?: string
}

export type Block = ParagraphBlock | HeadingBlock | ListBlock | VerseBlock | HadithBlock | ArabicBlock

export interface KnowledgeArticle {
  slug: string
  category: KnowledgeCategory
  title: LocalizedText
  summary: LocalizedText
  body: {
    en: Block[]
    hi: Block[]
    ur: Block[]
  }
  sources: SourceTag[]
  relatedSlugs: string[]
  /**
   * Explicit display sequence within the category. Resolved by
   * src/lib/knowledge/order.ts as order ?? prophetNumber ?? surahNumber, then
   * alphabetically by title.en, then by slug. Optional: "prophets" and "surahs"
   * use the numbers they already carry, and concepts/quranic/hadith-stories are
   * alphabetical by design.
   */
  order?: number
  /** Set for category "surahs": links the article to a surah. */
  surahNumber?: number
  /** Set for category "prophets": 1-based ordering of the 25 named prophets. */
  prophetNumber?: number
  featured?: boolean
}

/** An article without its (potentially large) body — for cards, listings, related links. */
export type KnowledgeArticleMeta = Omit<KnowledgeArticle, "body">

// --- Build-time hydrated view ----------------------------------------------
// The server resolves every verse/hadith ref against the real data and hands
// the client a fully hydrated article as serializable props (no client fetch).

export interface HydratedVerseBlock extends VerseBlock {
  arabic: string
  translations: LocalizedText
  surahName: string
  /** Global ayah number, for the /quran/{surah}#ayah-{globalNumber} deep link. */
  globalNumber: number
}

export interface HydratedHadithBlock extends HadithBlock {
  bookId: number
  href: string
  narrator: string
  grade: string
  arabic: string
  english: string
  urdu: string
  collectionName: string
}

export type HydratedBlock =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | ArabicBlock
  | HydratedVerseBlock
  | HydratedHadithBlock

export interface HydratedArticle extends KnowledgeArticleMeta {
  body: {
    en: HydratedBlock[]
    hi: HydratedBlock[]
    ur: HydratedBlock[]
  }
}
