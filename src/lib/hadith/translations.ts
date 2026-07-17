import fs from "node:fs"
import path from "node:path"
import type { Hadith, HadithCollectionId } from "@/types"
import { getCollectionDisplayName } from "./collections"

const DATA_DIR = path.join(process.cwd(), "public", "data", "hadith")

export interface HadithBookMeta {
  id: number
  collection: HadithCollectionId
  name: string
  hadithCount: number
}

export interface HadithCollectionMeta {
  id: string
  name: string
  nameArabic: string
  author: string
  totalHadith: number
  totalBooks: number
  books: Record<string, string>
  description: string
}

function readCollectionMeta(collectionId: string): HadithCollectionMeta | null {
  const filePath = path.join(DATA_DIR, collectionId, "metadata.json")
  if (!fs.existsSync(filePath)) return null
  const data = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(data)
}

function readBookHadiths(collectionId: string, bookId: number): Hadith[] {
  const filePath = path.join(DATA_DIR, collectionId, "books", `book-${bookId}.json`)
  if (!fs.existsSync(filePath)) return []
  const data = fs.readFileSync(filePath, "utf-8")
  const raw = JSON.parse(data)
  return raw.map((h: any) => ({
    id: `${collectionId}-${h.number}`,
    collection: collectionId as HadithCollectionId,
    bookId: h.bookId,
    bookName: h.bookName,
    chapterId: h.chapterId,
    chapterName: h.chapterName,
    hadithNumber: h.number,
    arabic: h.arabic,
    english: h.english,
    urdu: h.urdu ?? "",
    narrator: h.narrator,
    grade: h.grade,
    reference: {
      collection: getCollectionDisplayName(collectionId),
      book: h.bookName,
      hadithNumber: h.number,
      bookNumber: h.bookId,
    },
    tags: [],
  }))
}

export function getCollections(): HadithCollectionMeta[] {
  const collections: HadithCollectionMeta[] = []
  if (!fs.existsSync(DATA_DIR)) return collections
  const dirs = fs.readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
  for (const dir of dirs) {
    const meta = readCollectionMeta(dir.name)
    if (meta) collections.push(meta)
  }
  return collections
}

export function getCollection(id: string): HadithCollectionMeta | null {
  return readCollectionMeta(id)
}

export function getBooksForCollection(collectionId: string): HadithBookMeta[] {
  const dir = path.join(DATA_DIR, collectionId, "books")
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("book-") && f.endsWith(".json"))
  const meta = readCollectionMeta(collectionId)
  const books: HadithBookMeta[] = []

  for (const file of files) {
    const bookId = Number(file.replace("book-", "").replace(".json", ""))
    const data = fs.readFileSync(path.join(dir, file), "utf-8")
    const hadiths = JSON.parse(data)
    const name = meta?.books?.[bookId.toString()] ?? `Book ${bookId}`
    books.push({
      id: bookId,
      collection: collectionId as HadithCollectionId,
      name,
      hadithCount: hadiths.length,
    })
  }

  books.sort((a, b) => a.id - b.id)
  return books
}

export function getBookHadiths(collectionId: string, bookId: number): Hadith[] {
  return readBookHadiths(collectionId, bookId)
}

export function getAllHadiths(collectionId: string): Hadith[] {
  const combinedPath = path.join(DATA_DIR, collectionId, `${collectionId}-all.json`)
  if (fs.existsSync(combinedPath)) {
    const data = fs.readFileSync(combinedPath, "utf-8")
    const raw = JSON.parse(data)
    return raw.map((h: any) => ({
      id: `${collectionId}-${h.number}`,
      collection: collectionId as HadithCollectionId,
      bookId: h.bookId,
      bookName: h.bookName,
      chapterId: h.chapterId,
      chapterName: h.chapterName,
      hadithNumber: h.number,
      arabic: h.arabic,
      english: h.english,
      urdu: h.urdu ?? "",
      narrator: h.narrator,
      grade: h.grade,
      reference: {
        collection: getCollectionDisplayName(collectionId),
        book: h.bookName,
        hadithNumber: h.number,
        bookNumber: h.bookId,
      },
      tags: [],
    }))
  }

  const meta = readCollectionMeta(collectionId)
  if (!meta) return []
  const bookIds = Object.keys(meta.books).map(Number)
  const all: Hadith[] = []
  for (const bookId of bookIds) {
    const hadiths = readBookHadiths(collectionId, bookId)
    all.push(...hadiths)
  }
  return all
}

export function getHadithById(id: string): Hadith | null {
  const [collection, num] = id.split("-")
  const numId = Number(num)

  const combinedPath = path.join(DATA_DIR, collection, `${collection}-all.json`)
  if (fs.existsSync(combinedPath)) {
    const all = getAllHadiths(collection)
    return all.find((h) => h.hadithNumber === numId) || null
  }

  const meta = readCollectionMeta(collection)
  if (!meta) return null
  const bookIds = Object.keys(meta.books).map(Number)
  for (const bookId of bookIds) {
    const hadiths = readBookHadiths(collection, bookId)
    const found = hadiths.find((h) => h.hadithNumber === numId)
    if (found) return found
  }
  return null
}
