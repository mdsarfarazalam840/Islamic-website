import fs from "node:fs"
import path from "node:path"
import Fuse from "fuse.js"
import type { Ayah } from "@/types"
import { getAllAyahs } from "./translations"

const DATA_DIR = path.join(process.cwd(), "public", "data", "quran")

let fuseInstance: Fuse<Ayah> | null = null

function getFuse(): Fuse<Ayah> {
  if (!fuseInstance) {
    const ayahs = getAllAyahs()
    const indexPath = path.join(DATA_DIR, "quran-search-index.json")

    // Use pre-built index if available
    if (fs.existsSync(indexPath)) {
      const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"))
      const index = Fuse.parseIndex<Ayah>(indexData)
      fuseInstance = new Fuse(ayahs, {
        threshold: 0.4,
        distance: 100,
        includeScore: true,
        minMatchCharLength: 2,
      }, index)
    } else {
      // Fallback: build index at runtime
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
