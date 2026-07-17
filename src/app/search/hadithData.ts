import type { Hadith } from "@/types"
import { COLLECTION_DISPLAY_NAMES } from "@/lib/hadith/collections"

function getCollectionDir(collection: string) {
  return `/data/hadith/${collection}`
}

function transformHadith(h: any, collection: string): Hadith {
  return {
    id: `${collection}-${h.number}`,
    collection: collection as Hadith["collection"],
    bookId: h.bookId,
    bookName: h.bookName,
    chapterId: h.chapterId,
    chapterName: h.chapterName,
    hadithNumber: h.number,
    arabic: h.arabic || "",
    english: h.english || "",
    urdu: h.urdu || "",
    narrator: h.narrator || "",
    grade: h.grade || "",
    reference: {
      collection: COLLECTION_DISPLAY_NAMES[collection as keyof typeof COLLECTION_DISPLAY_NAMES] ?? collection,
      book: h.bookName,
      hadithNumber: h.number,
      bookNumber: h.bookId,
    },
    tags: [],
  }
}

export async function loadHadithCollectionMeta(collection: string): Promise<{
  books: Record<string, string>
  totalHadith: number
} | null> {
  try {
    const res = await fetch(`${getCollectionDir(collection)}/metadata.json`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function loadCollectionHadiths(collection: string): Promise<Hadith[]> {
  try {
    const res = await fetch(`${getCollectionDir(collection)}/${collection}-all.json`)
    if (res.ok) {
      const raw = await res.json()
      return raw.map((h: any) => transformHadith(h, collection))
    }
  } catch {
    // Fall through to book-by-book loading
  }

  const meta = await loadHadithCollectionMeta(collection)
  if (!meta) return []

  const bookIds = Object.keys(meta.books).map(Number)
  const all: Hadith[] = []

  const batchSize = 5
  for (let i = 0; i < bookIds.length; i += batchSize) {
    const batch = bookIds.slice(i, i + batchSize)
    const promises = batch.map(async (bookId) => {
      try {
        const res = await fetch(`${getCollectionDir(collection)}/books/book-${bookId}.json`)
        if (!res.ok) return []
        const raw = await res.json()
        return raw.map((h: any) => transformHadith(h, collection))
      } catch {
        return []
      }
    })
    const results = await Promise.all(promises)
    all.push(...results.flat())
  }

  return all
}

const ALL_COLLECTIONS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]

export async function loadAllHadiths(): Promise<Hadith[]> {
  const results = await Promise.all(
    ALL_COLLECTIONS.map((c) => loadCollectionHadiths(c)),
  )
  return results.flat()
}
