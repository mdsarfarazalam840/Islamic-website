import fs from "node:fs"
import path from "node:path"
import type { Ayah } from "@/types"

const DATA_DIR = path.join(process.cwd(), "public", "data", "quran")

let allAyahsCache: Ayah[] | null = null

export function getSurahAyahs(surahNumber: number): Ayah[] {
  const filePath = path.join(DATA_DIR, `surah-${surahNumber}.json`)
  if (!fs.existsSync(filePath)) return []
  const data = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(data) as Ayah[]
}

export function getAllAyahs(): Ayah[] {
  if (allAyahsCache) return allAyahsCache

  // Prefer combined file (faster single read)
  const combinedPath = path.join(DATA_DIR, "quran-all.json")
  if (fs.existsSync(combinedPath)) {
    const data = fs.readFileSync(combinedPath, "utf-8")
    allAyahsCache = JSON.parse(data) as Ayah[]
    return allAyahsCache
  }

  // Fallback to per-surah files
  const ayahs: Ayah[] = []
  for (let i = 1; i <= 114; i++) {
    const surahAyahs = getSurahAyahs(i)
    ayahs.push(...surahAyahs)
  }
  allAyahsCache = ayahs
  return ayahs
}

export function getAyah(globalNumber: number): Ayah | undefined {
  return getAllAyahs().find((a) => a.number === globalNumber)
}

/**
 * Resolve an ayah by its (surah, ayah-within-surah) reference. Reads only the
 * one surah file, so it stays cheap when called repeatedly at build time (e.g.
 * hydrating Knowledge Base verse blocks). Returns undefined if unresolved.
 */
export function getAyahByRef(surahNumber: number, ayahNumber: number): Ayah | undefined {
  return getSurahAyahs(surahNumber).find((a) => a.ayahNumber === ayahNumber)
}
