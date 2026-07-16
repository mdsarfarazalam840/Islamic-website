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

export function getJuzAyahs(juzNumber: number): Ayah[] {
  return getAllAyahs().filter((a) => a.juz === juzNumber)
}

export function getJuzBoundaries(): { juz: number; surah: number; ayah: number }[] {
  const ayahs = getAllAyahs()
  const boundaries: { juz: number; surah: number; ayah: number }[] = []
  let currentJuz = 1
  for (const ayah of ayahs) {
    if (ayah.juz > currentJuz) {
      boundaries.push({ juz: currentJuz, surah: ayah.surahNumber, ayah: ayah.ayahNumber })
      currentJuz = ayah.juz
    }
  }
  if (boundaries.length === 0) {
    for (let j = 1; j <= 30; j++) {
      const first = ayahs.find((a) => a.juz === j)
      if (first) {
        boundaries.push({ juz: j, surah: first.surahNumber, ayah: first.ayahNumber })
      }
    }
  }
  return boundaries
}
