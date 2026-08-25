import { assetPath } from "@/lib/utils"
import type { HadithCollectionId } from "@/types"

/**
 * Resolving a hadith *reference* ("Bukhari 1234") rather than searching its
 * text. Hadith numbers run continuously across a collection's books while the
 * client only ever fetches one book file at a time, so a number on its own says
 * nothing about which file to open. `public/data/hadith/number-index.json`
 * (built by scripts/build-hadith-number-index.mjs) closes that gap in ~34 KB.
 */

/** [firstNumber, lastNumber, bookId] — numbering is mostly sequential per book. */
type NumberRun = [number, number, number]

interface IndexedCollection {
  name: string
  total: number
  /** bookId → book name, as a JSON object so keys are strings. */
  books: Record<string, string>
  runs: NumberRun[]
}

export interface HadithNumberIndex {
  collections: Partial<Record<HadithCollectionId, IndexedCollection>>
}

export interface HadithReferenceHit {
  collection: HadithCollectionId
  collectionName: string
  bookId: number
  bookName: string
  hadithNumber: number
  /** Deep link to the hadith inside its book page. */
  href: string
}

export interface ParsedHadithReference {
  /** null when the query named no collection — resolve across all of them. */
  collection: HadithCollectionId | null
  number: number
}

// Display order for cross-collection results: the two Sahihs first, then the
// Sunan books in canonical order, then the Muwatta.
const COLLECTION_ORDER: HadithCollectionId[] = [
  "bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik",
]

// Alias → collection id, keyed by the normalised (lowercase, alphanumeric-only)
// form so "Sahih al-Bukhari", "sahih albukhari" and "BUKHARI" all collapse to
// the same key. Covers the common English transliterations people actually type.
const COLLECTION_ALIASES: Record<string, HadithCollectionId> = {
  bukhari: "bukhari",
  bukhaari: "bukhari",
  albukhari: "bukhari",
  sahihbukhari: "bukhari",
  sahihalbukhari: "bukhari",
  bukhaaree: "bukhari",

  muslim: "muslim",
  sahihmuslim: "muslim",

  abudawud: "abudawud",
  abudaud: "abudawud",
  abudawood: "abudawud",
  abidawud: "abudawud",
  dawud: "abudawud",
  daud: "abudawud",
  sunanabidawud: "abudawud",
  sunanabudawud: "abudawud",

  tirmidhi: "tirmidhi",
  tirmizi: "tirmidhi",
  attirmidhi: "tirmidhi",
  altirmidhi: "tirmidhi",
  jamiattirmidhi: "tirmidhi",
  sunantirmidhi: "tirmidhi",

  nasai: "nasai",
  nasaai: "nasai",
  annasai: "nasai",
  alnasai: "nasai",
  sunanannasai: "nasai",
  sunannasai: "nasai",

  ibnmajah: "ibnmajah",
  ibnmaja: "ibnmajah",
  majah: "ibnmajah",
  sunanibnmajah: "ibnmajah",

  malik: "malik",
  muwatta: "malik",
  muwattamalik: "malik",
  muwattaimalik: "malik",
  malikmuwatta: "malik",
}

// Words that carry no collection meaning but show up in typed references, e.g.
// "hadith no 1234" or "sahih 1234".
const FILLER_WORDS = new Set(["hadith", "hadeeth", "no", "num", "number", "sahih", "sunan", "jami", "book"])

function normalise(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/**
 * Read a hadith reference out of a free-text query. Handles a bare number, a
 * collection plus number in either order, and the usual separators — "1234",
 * "bukhari 1234", "Sahih al-Bukhari #1234", "muslim:234", "hadith no 45",
 * "1234 bukhari". Returns null when the query is not a reference, in which case
 * the caller should fall back to full-text search.
 */
export function parseHadithReference(query: string): ParsedHadithReference | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  // Split on whitespace and the separators people use between name and number.
  const tokens = trimmed.split(/[\s:#,.\-–—/]+/).filter(Boolean)
  if (tokens.length === 0) return null

  let number: number | null = null
  const nameParts: string[] = []

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      // More than one number is a range or a book:hadith pair — not something
      // this lookup can answer unambiguously, so bail out to text search.
      if (number !== null) return null
      number = Number(token)
      continue
    }
    // A token mixing letters and digits (e.g. "b1234", "v2") is not a form we
    // claim to understand; treat the whole query as text.
    if (/\d/.test(token)) return null
    nameParts.push(token)
  }

  if (number === null || number <= 0 || !Number.isSafeInteger(number)) return null

  const words = nameParts.map(normalise).filter((w) => w && !FILLER_WORDS.has(w))

  if (words.length === 0) return { collection: null, number }

  // Try the whole remaining name first ("al bukhari" → "albukhari"), then each
  // word on its own, so "Sahih al-Bukhari 1234" and "bukhari 1234" both land.
  const joined = words.join("")
  const collection = COLLECTION_ALIASES[joined] ?? words.map((w) => COLLECTION_ALIASES[w]).find(Boolean)

  // Words present but none of them name a collection: the query is prose that
  // happens to contain a number ("prayer 5 times"), so let text search have it.
  return collection ? { collection, number } : null
}

/** Locate the book holding `number`, or null when the collection has no such hadith. */
function findBookId(runs: NumberRun[], number: number): number | null {
  // Runs are sorted by first number and never overlap, so binary search works.
  let lo = 0
  let hi = runs.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const [first, last, bookId] = runs[mid]
    if (number < first) hi = mid - 1
    else if (number > last) lo = mid + 1
    else return bookId
  }
  return null
}

/**
 * Every hadith matching the parsed reference. A collection-scoped reference
 * yields at most one hit; a bare number yields one per collection that has a
 * hadith with that number (the numbering is independent, so they are genuinely
 * different hadiths — the reader picks).
 */
export function resolveHadithReference(
  index: HadithNumberIndex,
  parsed: ParsedHadithReference,
): HadithReferenceHit[] {
  const ids = parsed.collection
    ? [parsed.collection]
    : COLLECTION_ORDER.filter((id) => index.collections[id])

  const hits: HadithReferenceHit[] = []
  for (const id of ids) {
    const entry = index.collections[id]
    if (!entry) continue
    const bookId = findBookId(entry.runs, parsed.number)
    if (bookId === null) continue
    hits.push({
      collection: id,
      collectionName: entry.name,
      bookId,
      bookName: entry.books[String(bookId)] ?? `Book ${bookId}`,
      hadithNumber: parsed.number,
      href: `/hadith/${id}/${bookId}#hadith-${id}-${parsed.number}`,
    })
  }
  return hits
}

// One fetch per page load, shared by every caller. Kept as the promise (not the
// resolved value) so concurrent callers during the initial load coalesce.
let indexPromise: Promise<HadithNumberIndex> | null = null

/** Fetch (once) the hadith number index. Rejects if the asset is missing. */
export function loadHadithNumberIndex(): Promise<HadithNumberIndex> {
  if (!indexPromise) {
    indexPromise = fetch(assetPath("/data/hadith/number-index.json"))
      .then((res) => {
        if (!res.ok) throw new Error(`Hadith number index unavailable (${res.status})`)
        return res.json() as Promise<HadithNumberIndex>
      })
      .catch((err) => {
        // Let a later attempt retry rather than caching the failure forever.
        indexPromise = null
        throw err
      })
  }
  return indexPromise
}
