import fs from "node:fs"
import path from "node:path"
import Fuse from "fuse.js"
import type { Hadith } from "@/types"
import { getAllHadiths } from "./translations"

const DATA_DIR = path.join(process.cwd(), "public", "data", "hadith")

const cache = new Map<string, Fuse<Hadith>>()

function getFuse(collectionId: string): Fuse<Hadith> | null {
  if (cache.has(collectionId)) return cache.get(collectionId)!

  const hadiths = getAllHadiths(collectionId)
  if (hadiths.length === 0) return null

  const indexPath = path.join(DATA_DIR, collectionId, `${collectionId}-search-index.json`)

  let fuse: Fuse<Hadith>
  // Use pre-built index if available
  if (fs.existsSync(indexPath)) {
    const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"))
    const index = Fuse.parseIndex<Hadith>(indexData)
    fuse = new Fuse(hadiths, {
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 2,
    }, index)
  } else {
    // Fallback: build index at runtime
    fuse = new Fuse(hadiths, {
      keys: [
        { name: "english", weight: 1 },
        { name: "arabic", weight: 0.6 },
        { name: "narrator", weight: 0.4 },
        { name: "bookName", weight: 0.3 },
      ],
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 2,
    })
  }

  cache.set(collectionId, fuse)
  return fuse
}

export function searchHadiths(
  collectionId: string,
  query: string,
  options?: { grade?: string; bookId?: number },
  limit = 50,
): Hadith[] {
  if (!query.trim()) return []
  const fuse = getFuse(collectionId)
  if (!fuse) return []

  let results = fuse.search(query.trim()).map((r) => r.item)

  if (options?.grade) {
    results = results.filter((h) => h.grade.toLowerCase().includes(options.grade!.toLowerCase()))
  }

  if (options?.bookId) {
    results = results.filter((h) => h.bookId === options!.bookId)
  }

  return results.slice(0, limit)
}

export function getGrades(collectionId: string): string[] {
  const hadiths = getAllHadiths(collectionId)
  const grades = new Set<string>()
  for (const h of hadiths) {
    if (h.grade) {
      const g = h.grade.toLowerCase()
      if (g.includes("sahih")) grades.add("Sahih")
      else if (g.includes("hasan")) grades.add("Hasan")
      else if (g.includes("daif") || g.includes("da'if")) grades.add("Da'if")
      else grades.add(g)
    }
  }
  return Array.from(grades)
}
