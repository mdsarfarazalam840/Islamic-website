import { assetPath } from "@/lib/utils"
import type { HadithCollectionId } from "@/types"

/**
 * Hindi explanation (tafseer) for hadith, from the per-book sidecars written by
 * scripts/fetch-hadith-hindi-tafseer.ts.
 *
 * Kept out of `book-<id>.json` — the file every hadith page already downloads —
 * on purpose: coverage is partial, so most readers would be paying for text that
 * isn't there. Fetched on first expand instead, one book at a time, which also
 * means neither the `Hadith` type nor the book payload has to carry it.
 */

export interface HindiTafseer {
  /** Hindi rendering of the hadith itself; may be empty when only the explanation exists. */
  text: string
  explanation: string
  hints: string[]
  attribution: string
  grade: string
  /** hadeethenc.com id this came from, for attribution. */
  sourceId: string
  /**
   * How `text` was produced, when it was not authored by hadeethenc:
   *
   *   "ur"          translated from the Urdu — the scholarly translation of the
   *                 Arabic, so one hop. Hand-checked.
   *   "en"          translated from the English, for the ~2,700 hadiths with no
   *                 Urdu. Two hops, so weaker provenance.
   *   "ur-translit" machine transliteration of the Urdu by
   *                 src/lib/translit/urdu.ts. Urdu and Hindi are one language in
   *                 two scripts, so this is script conversion rather than
   *                 translation — but it is unreviewed, and short vowels are
   *                 guessed wherever the lexicon has no entry.
   *
   * Absent on hadeethenc-authored entries. The UI should disclose the weaker
   * three rather than presenting all four identically.
   */
  textSource?: "ur" | "en" | "ur-translit"
}

/** hadith number (as a string key) → its Hindi entry. */
export type HindiTafseerBook = Record<string, HindiTafseer>

// One fetch per (collection, book) per page load, shared by every card on the
// page. Kept as the promise so cards expanding at the same time coalesce.
const cache = new Map<string, Promise<HindiTafseerBook>>()

/**
 * Hindi entries for one book. Resolves to an empty map when the book has no
 * sidecar (nothing matched, or the data hasn't been fetched) — absence is the
 * normal case here, not an error.
 */
export function fetchHindiTafseerBook(
  collection: HadithCollectionId | string,
  bookId: number | string,
): Promise<HindiTafseerBook> {
  const key = `${collection}/${bookId}`
  const cached = cache.get(key)
  if (cached) return cached

  const promise = fetch(assetPath(`/data/hadith/${collection}/hindi/book-${bookId}.json`))
    .then((res) => {
      if (res.status === 404) return {} as HindiTafseerBook
      if (!res.ok) throw new Error(`Hindi tafseer unavailable (${res.status})`)
      return res.json() as Promise<HindiTafseerBook>
    })
    .catch((err) => {
      // Let a later expand retry rather than caching a network blip forever. A
      // missing file is not a failure and never reaches here.
      cache.delete(key)
      throw err
    })

  cache.set(key, promise)
  return promise
}
