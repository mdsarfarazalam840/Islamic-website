import type { Surah } from "@/types"
import { toHinglish } from "@/lib/translit/hinglish"
import surahsData from "@/data/quran/surahs.json"

export function getAllSurahs(): Surah[] {
  return surahsData as Surah[]
}

export function getSurah(surahNumber: number): Surah | undefined {
  return getAllSurahs().find((s) => s.number === surahNumber)
}

export function getJuzSurahs(juzNumber: number): Surah[] {
  return getAllSurahs().filter((s) => s.juz.includes(juzNumber))
}

export function getRevelationTypeCount(): { meccan: number; medinan: number } {
  const all = getAllSurahs()
  return {
    meccan: all.filter((s) => s.revelationType === "meccan").length,
    medinan: all.filter((s) => s.revelationType === "medinan").length,
  }
}

/**
 * Does `surah` match a free-text query?
 *
 * One matcher for every surah search box — the index page filter, the hook, and
 * `searchSurahs` below all call this, so a reader gets the same behaviour
 * wherever they type.
 *
 * Matches on the English name and meaning, the surah number, the Arabic, and
 * the Hindi pair written by scripts/add-surah-hindi.ts — plus the Hinglish of
 * that Hindi, so "फ़ातिहा", "faatiha" and "kholne" all reach Al-Fatiha. The
 * Hindi fields are optional on the type (the upstream catalog ships neither),
 * hence the guards.
 *
 * Arabic is compared against the raw query rather than the lowercased one;
 * `toLowerCase` is meaningless for it and would only cost a copy.
 */
export function surahMatches(surah: Surah, query: string): boolean {
  const raw = query.trim()
  if (!raw) return true
  const q = raw.toLowerCase()

  const haystack = [
    surah.name,
    surah.nameTranslated,
    String(surah.number),
    surah.nameHi,
    surah.nameTranslatedHi,
    surah.nameHi && toHinglish(surah.nameHi),
    surah.nameTranslatedHi && toHinglish(surah.nameTranslatedHi),
  ]

  return (
    haystack.some((value) => value && value.toLowerCase().includes(q)) ||
    surah.nameArabic.includes(raw)
  )
}

export function searchSurahs(query: string): Surah[] {
  return getAllSurahs().filter((s) => surahMatches(s, query))
}
