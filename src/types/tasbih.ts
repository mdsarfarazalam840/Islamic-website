/**
 * A dhikr the tasbih counter can count. The Arabic is the phrase itself; the
 * transliteration and translation are what a reader who does not read Arabic
 * follows along with.
 */
export interface DhikrPreset {
  id: string
  /** Short name used on chips and in the stats list. */
  label: string
  arabic: string
  transliteration: string
  translation: string
  /** Count one round runs to, e.g. 33 or 100. */
  defaultTarget: number
  /** One line on where the count comes from, shown under the selected dhikr. */
  note: string
  /**
   * Citation for `note`. `query` is fed to /search, which resolves hadith
   * references like "Bukhari 6405" to the hadith itself
   * (see parseHadithReference in lib/hadith/numberIndex.ts) — so the link keeps
   * working even if book ids shift under a re-fetch.
   */
  source?: { label: string; query: string }
}

/** One leg of a fixed dhikr sequence, e.g. the 33/33/34 tasbih of Fatimah. */
export interface DhikrSequenceStep {
  id: string
  target: number
}
