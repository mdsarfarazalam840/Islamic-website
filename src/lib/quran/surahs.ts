import type { Surah } from "@/types"
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

export function searchSurahs(query: string): Surah[] {
  const q = query.toLowerCase()
  return getAllSurahs().filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.nameTranslated.toLowerCase().includes(q) ||
      s.nameArabic.includes(query),
  )
}
