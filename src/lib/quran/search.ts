import Fuse from "fuse.js"
import type { Ayah } from "@/types"
import { getAllAyahs } from "./translations"

let fuseInstance: Fuse<Ayah> | null = null

function getFuse(): Fuse<Ayah> {
  if (!fuseInstance) {
    const ayahs = getAllAyahs()
    fuseInstance = new Fuse(ayahs, {
      keys: [
        { name: "translations.en", weight: 1 },
        { name: "translations.hi", weight: 0.8 },
        { name: "translations.ur", weight: 0.8 },
        { name: "arabic", weight: 0.6 },
      ],
      threshold: 0.4,
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
    })
  }
  return fuseInstance
}

export function searchAyahs(query: string, limit = 50): Ayah[] {
  if (!query.trim()) return []
  const fuse = getFuse()
  return fuse.search(query.trim()).slice(0, limit).map((r) => r.item)
}

export function searchAyahsBySurah(query: string, surahNumber: number): Ayah[] {
  if (!query.trim()) return []
  const results = searchAyahs(query)
  return results.filter((a) => a.surahNumber === surahNumber)
}

export function getSearchStats() {
  const ayahs = getAllAyahs()
  return {
    totalAyahs: ayahs.length,
    surahs: new Set(ayahs.map((a) => a.surahNumber)).size,
  }
}
