import type { Ayah } from "@/types"
import { getSurahAyahs } from "./translations"

/**
 * Where each of the 30 juz starts and ends, in (surah, ayah-within-surah) terms.
 *
 * A juz boundary usually falls mid-surah, so "go to juz 5" is unanswerable from
 * `surahs.json` alone — it lists which juz a surah spans, not where each juz
 * begins. This walks the ayah data once at build time to produce the ~2 KB of
 * facts the client needs, small enough to hand down as a prop.
 */
export interface JuzEntry {
  juz: number
  startSurah: number
  startAyah: number
  /** Global ayah number of the juz's first ayah — the reader's anchor id. */
  startGlobal: number
  endSurah: number
  endAyah: number
}

let cache: JuzEntry[] | null = null

export function getJuzIndex(): JuzEntry[] {
  if (cache) return cache

  const byJuz = new Map<number, JuzEntry>()
  const record = (ayah: Ayah) => {
    const existing = byJuz.get(ayah.juz)
    if (!existing) {
      byJuz.set(ayah.juz, {
        juz: ayah.juz,
        startSurah: ayah.surahNumber,
        startAyah: ayah.ayahNumber,
        startGlobal: ayah.number,
        endSurah: ayah.surahNumber,
        endAyah: ayah.ayahNumber,
      })
      return
    }
    // Surahs are walked in order and ayahs within them are ordered, so the last
    // ayah seen for a juz is its end.
    existing.endSurah = ayah.surahNumber
    existing.endAyah = ayah.ayahNumber
  }

  // Per-surah files rather than quran-all.json: this runs at build time only, and
  // reading 114 small files keeps the 6 MB combined file out of the build's heap
  // when nothing else needs it.
  for (let surah = 1; surah <= 114; surah++) {
    for (const ayah of getSurahAyahs(surah)) record(ayah)
  }

  cache = [...byJuz.values()].sort((a, b) => a.juz - b.juz)
  return cache
}
