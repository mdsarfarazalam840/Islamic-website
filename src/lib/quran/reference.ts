import type { Surah } from "@/types"
import type { JuzEntry } from "./juz"

/**
 * Resolving a Quran *reference* ("2:255", "al-baqarah 255", "juz 5") rather than
 * searching ayah text. Readers arrive knowing the citation far more often than a
 * phrase, and following one used to mean finding the surah in a 114-card grid and
 * then stepping through juz until the ayah appeared.
 *
 * Everything here is synchronous: surah numbers, names and ayah counts all live
 * in the bundled `src/data/quran/surahs.json`, and the 30-entry juz index is
 * handed down as a prop. Shaped after `src/lib/hadith/numberIndex.ts` — same
 * tokenising, same "bail out to text search rather than guess" posture.
 */

export type QuranReference =
  | { kind: "ayah"; surah: number; ayah: number }
  | { kind: "surah"; surah: number }
  | { kind: "juz"; juz: number }

export interface QuranReferenceHit {
  reference: QuranReference
  title: string
  subtitle: string
  /** Deep link into the reader; `?ayah=` is a within-surah number. */
  href: string
}

// Words that carry no meaning of their own in a reference: "surah 2 ayah 255",
// "verse 100", "quran 18:10".
const FILLER_WORDS = new Set([
  "surah", "surat", "sura", "soorah", "suratul", "chapter",
  "ayah", "ayat", "aayat", "ayaat", "aya", "verse", "verses",
  "quran", "quraan", "koran", "holyquran", "alquran",
  "no", "num", "number", "the", "of",
])

// Any of these marks the query as a juz reference ("juz 5", "para 5").
const JUZ_WORDS = new Set(["juz", "juzz", "juza", "juzu", "jooz", "para", "parah", "sipara", "siparah"])

// Definite-article prefixes on transliterated surah names ("Al-Baqarah",
// "An-Nisa", "Ash-Shu'ara"). Longest first so "ash" wins over "as".
const ARTICLES = ["ash", "ath", "adh", "al", "an", "ar", "as", "at", "ad", "az"]

function normalise(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/**
 * Collapse a transliterated name to a spelling-tolerant key. Transliteration is
 * not standardised, so "Yaseen"/"Ya-Sin", "Fatiha"/"Fatihah" and "Baqara"/
 * "Al-Baqarah" all have to land on the same key. Applied to both the catalog
 * names and the typed word, so consistency matters more than the exact folding.
 */
function fold(word: string): string {
  let w = normalise(word)
  if (!w) return w
  for (const article of ARTICLES) {
    if (w.startsWith(article) && w.length - article.length >= 3) {
      w = w.slice(article.length)
      break
    }
  }
  w = w
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/ay/g, "ai")
    .replace(/(.)\1+/g, "$1") // dropped doubles: "hajj" → "haj", "muzzammil" → "muzamil"
    // Ta marbuta transliterated either way: "Al-Fatihah"/"Al-Fatiha",
    // "Al-Baqarah"/"Al-Baqara". Both sides of every comparison are folded, so a
    // collision this creates would be dropped as ambiguous, not mis-resolved.
    .replace(/h$/, "")
  return w
}

interface NameIndex {
  /** folded name → surah number; ambiguous keys are dropped. */
  byFolded: Map<string, number>
  /** raw Arabic name → surah number. */
  byArabic: Map<string, number>
  /** surah number → every folded word appearing in its names. */
  wordsByNumber: Map<number, Set<string>>
}

// The catalog is a module singleton in practice, but keying the derived index by
// the array itself keeps this correct if a caller ever passes a subset.
const nameIndexCache = new WeakMap<Surah[], NameIndex>()

function getNameIndex(surahs: Surah[]): NameIndex {
  const cached = nameIndexCache.get(surahs)
  if (cached) return cached

  const byFolded = new Map<string, number>()
  const ambiguous = new Set<string>()
  const byArabic = new Map<string, number>()
  const wordsByNumber = new Map<number, Set<string>>()

  const add = (key: string, number: number) => {
    if (!key || key.length < 2) return
    const existing = byFolded.get(key)
    if (existing !== undefined && existing !== number) {
      ambiguous.add(key)
      return
    }
    byFolded.set(key, number)
  }

  for (const surah of surahs) {
    add(fold(surah.name), surah.number)
    add(normalise(surah.name), surah.number)
    add(fold(surah.nameTranslated), surah.number)
    // "The Cow" is also worth matching as "cow".
    add(fold(surah.nameTranslated.replace(/^the\s+/i, "")), surah.number)
    byArabic.set(surah.nameArabic.replace(/\s+/g, ""), surah.number)

    const words = new Set<string>()
    for (const part of `${surah.name} ${surah.nameTranslated}`.split(/[^A-Za-z0-9]+/)) {
      const normalised = normalise(part)
      if (normalised) {
        words.add(normalised)
        words.add(fold(part))
      }
    }
    wordsByNumber.set(surah.number, words)
  }
  for (const key of ambiguous) byFolded.delete(key)

  const index = { byFolded, byArabic, wordsByNumber }
  nameIndexCache.set(surahs, index)
  return index
}

/** Resolve a run of words to a surah number, or null when they name none. */
function findSurahByName(words: string[], rawWords: string[], surahs: Surah[]): number | null {
  const { byFolded, byArabic, wordsByNumber } = getNameIndex(surahs)

  const arabicJoined = rawWords.join("").replace(/\s+/g, "")
  if (arabicJoined && byArabic.has(arabicJoined)) return byArabic.get(arabicJoined)!

  const joined = words.join("")
  const direct = byFolded.get(fold(joined)) ?? byFolded.get(joined)
  if (direct !== undefined) return direct

  /**
   * A single word matching is enough on its own, but in a longer query it has to
   * account for its neighbours too: "the patience of prophets" contains the name
   * of Surah Al-Anbiya ("The Prophets") and is still prose, not a reference. So
   * every remaining word must belong to the same surah's names.
   */
  const verify = (candidate: number): number | null => {
    if (words.length <= 1) return candidate
    const own = wordsByNumber.get(candidate)
    if (!own) return null
    return words.every((w) => own.has(w) || own.has(fold(w))) ? candidate : null
  }

  for (const word of words) {
    const hit = byFolded.get(fold(word)) ?? byFolded.get(word)
    if (hit !== undefined) return verify(hit)
  }

  // Last resort: a unique prefix ("baqa" → Al-Baqarah). Only for words long
  // enough that the prefix is a real intent and not a coincidence.
  if (words.length === 1 && fold(words[0]).length >= 4) {
    const prefix = fold(words[0])
    let found: number | null = null
    for (const [key, number] of byFolded) {
      if (!key.startsWith(prefix)) continue
      if (found !== null && found !== number) return null
      found = number
    }
    if (found !== null) return found
  }

  return null
}

interface Tokenised {
  /** At most two, both positive integers. */
  numbers: number[]
  rawWords: string[]
  /** Words that could name a surah: filler and juz keywords removed. */
  meaningful: string[]
  isJuz: boolean
}

/** Split a query into numbers and words, or null if it can't be a reference. */
function tokenise(query: string): Tokenised | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const tokens = trimmed.split(/[\s:#,.\-–—/]+/).filter(Boolean)
  if (tokens.length === 0) return null

  const numbers: number[] = []
  const rawWords: string[] = []

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      numbers.push(Number(token))
      continue
    }
    // "juz5" / "surah2": a word glued to its number is a single token, so split
    // it. Anything else mixing letters and digits ("b1c2") is not a form we
    // claim to read.
    const glued = token.match(/^(\D+?)(\d+)$/)
    if (glued) {
      rawWords.push(glued[1])
      numbers.push(Number(glued[2]))
      continue
    }
    if (/\d/.test(token)) return null
    rawWords.push(token)
  }

  if (numbers.some((n) => n <= 0 || !Number.isSafeInteger(n))) return null
  if (numbers.length > 2) return null

  const words = rawWords.map(normalise).filter(Boolean)
  return {
    numbers,
    rawWords,
    meaningful: words.filter((w) => !FILLER_WORDS.has(w) && !JUZ_WORDS.has(w)),
    isJuz: words.some((w) => JUZ_WORDS.has(w)),
  }
}

/**
 * Read a Quran reference out of a free-text query. Handles "2:255", "2 255",
 * "surah 2 ayah 255", "al-baqarah 255", "baqarah", "36", "juz 5", "para 5".
 * Returns null when the query is not a reference (prose, out-of-range numbers,
 * an unknown name), in which case the caller should fall back to text search.
 */
export function parseQuranReference(query: string, surahs: Surah[]): QuranReference | null {
  const parts = tokenise(query)
  if (!parts) return null
  const { numbers, rawWords, meaningful, isJuz } = parts

  if (isJuz) {
    // "juz 5" only — a juz reference carrying a surah name or two numbers is
    // ambiguous, and juz have no sub-numbering to hang a second number on.
    if (numbers.length !== 1 || meaningful.length > 0) return null
    const juz = numbers[0]
    return juz >= 1 && juz <= 30 ? { kind: "juz", juz } : null
  }

  // Arabic names survive tokenising but not `normalise` (which keeps a-z0-9), so
  // ask by raw words too — that's the path an Arabic query like "البقرة" takes.
  const named = rawWords.length > 0 ? findSurahByName(meaningful, rawWords, surahs) : null
  // Words that name nothing mean this is prose that happens to hold a number
  // ("pray 5 times"); let text search have it.
  if (meaningful.length > 0 && named === null) return null

  const surahNumber = named ?? (numbers.length >= 1 ? numbers[0] : null)
  if (surahNumber === null) return null

  const surah = surahs.find((s) => s.number === surahNumber)
  if (!surah) return null

  // A named surah spends its numbers on the ayah; a bare "2 255" spends the
  // first on the surah.
  const ayah = named !== null ? (numbers.length === 1 ? numbers[0] : null) : numbers.length === 2 ? numbers[1] : null
  if (named !== null && numbers.length > 1) return null

  if (ayah !== null) {
    return ayah <= surah.ayahCount ? { kind: "ayah", surah: surah.number, ayah } : null
  }
  return { kind: "surah", surah: surah.number }
}

/**
 * Global ayah number (1–6236) for a (surah, ayah) pair. Ayah numbering is
 * sequential across the whole Quran, so the per-surah `ayahCount` totals in the
 * catalog are enough — no ayah data needs loading.
 */
export function globalAyahNumber(surahs: Surah[], surahNumber: number, ayahNumber: number): number {
  let offset = 0
  for (const surah of surahs) {
    if (surah.number === surahNumber) break
    offset += surah.ayahCount
  }
  return offset + ayahNumber
}

/** Which juz an ayah falls in, from the juz index's start positions. */
function juzOfGlobal(juzIndex: JuzEntry[], globalNumber: number): number | null {
  let juz: number | null = null
  for (const entry of juzIndex) {
    if (entry.startGlobal <= globalNumber) juz = entry.juz
    else break
  }
  return juz
}

/**
 * Turn a parsed reference into something linkable. Returns null only when the
 * data needed is missing (e.g. an empty juz index), never for a valid reference.
 */
export function resolveQuranReference(
  reference: QuranReference,
  surahs: Surah[],
  juzIndex: JuzEntry[],
): QuranReferenceHit | null {
  if (reference.kind === "juz") {
    const entry = juzIndex.find((j) => j.juz === reference.juz)
    if (!entry) return null
    const start = surahs.find((s) => s.number === entry.startSurah)
    const end = surahs.find((s) => s.number === entry.endSurah)
    return {
      reference,
      title: `Juz ${entry.juz}`,
      subtitle: `${start?.name ?? `Surah ${entry.startSurah}`} ${entry.startAyah} → ${end?.name ?? `Surah ${entry.endSurah}`} ${entry.endAyah}`,
      href: `/quran/${entry.startSurah}?ayah=${entry.startAyah}`,
    }
  }

  const surah = surahs.find((s) => s.number === reference.surah)
  if (!surah) return null

  if (reference.kind === "surah") {
    return {
      reference,
      title: `Surah ${surah.number} · ${surah.name}`,
      subtitle: `${surah.nameTranslated} · ${surah.ayahCount} verses · Juz ${surah.juz.join(", ")}`,
      href: `/quran/${surah.number}`,
    }
  }

  const juz = juzOfGlobal(juzIndex, globalAyahNumber(surahs, surah.number, reference.ayah))
  return {
    reference,
    title: `${surah.name} ${surah.number}:${reference.ayah}`,
    subtitle: juz ? `Ayah ${reference.ayah} of ${surah.ayahCount} · Juz ${juz}` : `Ayah ${reference.ayah} of ${surah.ayahCount}`,
    href: `/quran/${surah.number}?ayah=${reference.ayah}`,
  }
}

/**
 * Why a reference-shaped query resolved to nothing, for queries that clearly
 * *were* a reference attempt ("2:300", "juz 31"). Returns null when the query is
 * something else entirely, in which case the caller's generic message fits.
 */
export function explainQuranReferenceMiss(query: string, surahs: Surah[]): string | null {
  const parts = tokenise(query)
  if (!parts) return null
  const { numbers, meaningful, isJuz } = parts

  if (isJuz) {
    if (numbers.length === 1 && (numbers[0] < 1 || numbers[0] > 30)) {
      return `The Quran has 30 juz, so there is no juz ${numbers[0]}.`
    }
    return numbers.length === 0 ? "Which juz? Try “juz 5”." : null
  }

  const named = parts.rawWords.length > 0 ? findSurahByName(meaningful, parts.rawWords, surahs) : null
  const surahNumber = named ?? (numbers.length >= 1 ? numbers[0] : null)
  if (surahNumber === null) return null

  const surah = surahs.find((s) => s.number === surahNumber)
  if (!surah) {
    return meaningful.length === 0 && numbers.length === 1
      ? `The Quran has 114 surahs, so there is no surah ${surahNumber}.`
      : null
  }

  const ayah = named !== null ? (numbers.length === 1 ? numbers[0] : null) : numbers.length === 2 ? numbers[1] : null
  if (ayah !== null && ayah > surah.ayahCount) {
    return `Surah ${surah.name} has ${surah.ayahCount} verses, so there is no ayah ${ayah}.`
  }
  return null
}
