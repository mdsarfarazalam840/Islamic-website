import type { Hadith } from "@/types"

function getCollectionDir(collection: string) {
  return `/data/hadith/${collection}`
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
        return raw.map((h: any) => ({
          id: `${collection}-${h.number}`,
          collection,
          bookId: h.bookId,
          bookName: h.bookName,
          chapterId: h.chapterId,
          chapterName: h.chapterName,
          hadithNumber: h.number,
          arabic: h.arabic || "",
          english: h.english || "",
          narrator: h.narrator || "",
          grade: h.grade || "",
          reference: {
            collection: collection === "bukhari" ? "Sahih al-Bukhari" : "Sahih Muslim",
            book: h.bookName,
            hadithNumber: h.number,
            bookNumber: h.bookId,
          },
          tags: [],
        }))
      } catch {
        return []
      }
    })
    const results = await Promise.all(promises)
    all.push(...results.flat())
  }

  return all
}

export async function loadAllHadiths(): Promise<Hadith[]> {
  const [bukhari, muslim] = await Promise.all([
    loadCollectionHadiths("bukhari"),
    loadCollectionHadiths("muslim"),
  ])
  return [...bukhari, ...muslim]
}
