import fs from "node:fs"
import path from "node:path"
import type { Ayah, HadithCollectionId } from "@/types"
import { getSurahAyahs } from "@/lib/quran/translations"
import { getSurah } from "@/lib/quran/surahs"
import { getCollectionDisplayName } from "@/lib/hadith/collections"

// A single item shown by the "Reminder of the Day" card. These are resolved
// from the real Quran/Hadith data at BUILD time and passed to the client as
// serializable props — the client then picks which one to show based on the
// visitor's local date (see DailyReminder).
export type DailyKind = "quran" | "hadith"

export interface DailyItem {
  kind: DailyKind
  arabic: string
  translation: string
  reference: string
  href: string
  narrator?: string
}

// --- Quran -----------------------------------------------------------------

// Curated list of well-known, uplifting verses (surahNumber, ayahNumber).
// Anything that fails to resolve is silently skipped, so the pool degrades
// gracefully if the underlying data ever changes.
const QURAN_PICKS: [number, number][] = [
  [1, 1], [1, 2], [1, 5], [1, 6],
  [2, 152], [2, 153], [2, 186], [2, 201], [2, 255], [2, 286],
  [3, 8], [3, 26], [3, 139], [3, 159], [3, 173],
  [13, 11], [13, 28],
  [16, 97],
  [24, 35],
  [39, 53],
  [40, 60],
  [49, 13],
  [55, 13],
  [65, 2], [65, 3],
  [93, 4], [93, 5],
  [94, 5], [94, 6],
  [103, 1], [103, 2], [103, 3],
  [112, 1], [112, 2], [112, 3], [112, 4],
]

function buildQuranPool(): DailyItem[] {
  const pool: DailyItem[] = []
  // Cache per-surah reads so we only touch each file once.
  const surahCache = new Map<number, Ayah[]>()

  for (const [surahNumber, ayahNumber] of QURAN_PICKS) {
    let ayahs = surahCache.get(surahNumber)
    if (!ayahs) {
      ayahs = getSurahAyahs(surahNumber)
      surahCache.set(surahNumber, ayahs)
    }
    const ayah = ayahs.find((a) => a.ayahNumber === ayahNumber)
    if (!ayah) continue
    const surah = getSurah(surahNumber)
    if (!surah) continue

    pool.push({
      kind: "quran",
      arabic: ayah.arabic,
      translation: ayah.translations.en,
      reference: `${surah.name} · ${surahNumber}:${ayahNumber}`,
      href: `/quran/${surahNumber}#ayah-${ayah.number}`,
    })
  }
  return pool
}

// --- Hadith ----------------------------------------------------------------

const HADITH_DATA_DIR = path.join(process.cwd(), "public", "data", "hadith")

interface RawHadith {
  number: number
  bookId: number
  arabic?: string
  english?: string
  narrator?: string
  grade?: string
}

// A short, well-known hadith identified by its number in this dataset. Verified
// against the real files; any that fail to resolve are skipped.
const HADITH_PICKS: { collection: HadithCollectionId; number: number }[] = [
  { collection: "bukhari", number: 5070 }, // Deeds are by intentions
  { collection: "bukhari", number: 39 }, // Religion is easy
  { collection: "muslim", number: 6602 }, // Allah is gentle and loves gentleness
  { collection: "tirmidhi", number: 3421 }, // The Prophet's character
]

// How many extra hadiths to auto-select per collection to round out the pool.
const AUTO_PER_COLLECTION = 3
const AUTO_COLLECTIONS: HadithCollectionId[] = [
  "bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik",
]

function readBookFiles(collection: HadithCollectionId): RawHadith[] {
  const dir = path.join(HADITH_DATA_DIR, collection, "books")
  if (!fs.existsSync(dir)) return []
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("book-") && f.endsWith(".json"))
    .sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")))
  const out: RawHadith[] = []
  for (const file of files) {
    const data = fs.readFileSync(path.join(dir, file), "utf-8")
    out.push(...(JSON.parse(data) as RawHadith[]))
  }
  return out
}

function toHadithItem(collection: HadithCollectionId, h: RawHadith): DailyItem | null {
  const english = (h.english ?? "").trim()
  if (!h.arabic || !english) return null
  return {
    kind: "hadith",
    arabic: h.arabic,
    translation: english,
    reference: `${getCollectionDisplayName(collection)} · Hadith ${h.number}`,
    href: `/hadith/${collection}/${h.bookId}#hadith-${collection}-${h.number}`,
    narrator: h.narrator?.trim() || undefined,
  }
}

function buildHadithPool(): DailyItem[] {
  const pool: DailyItem[] = []
  const seen = new Set<string>()

  const add = (collection: HadithCollectionId, h: RawHadith) => {
    const key = `${collection}-${h.number}`
    if (seen.has(key)) return
    const item = toHadithItem(collection, h)
    if (!item) return
    seen.add(key)
    pool.push(item)
  }

  // Cache each collection's hadiths so we read every file at most once.
  const cache = new Map<HadithCollectionId, RawHadith[]>()
  const load = (c: HadithCollectionId) => {
    let list = cache.get(c)
    if (!list) {
      list = readBookFiles(c)
      cache.set(c, list)
    }
    return list
  }

  // 1) Curated, verified picks first.
  for (const pick of HADITH_PICKS) {
    const found = load(pick.collection).find((h) => h.number === pick.number)
    if (found) add(pick.collection, found)
  }

  // 2) Deterministically fill from each collection with concise, readable
  //    hadiths (short enough to fit the card, and preferably graded sahih).
  for (const collection of AUTO_COLLECTIONS) {
    const candidates = load(collection).filter((h) => {
      const len = (h.english ?? "").trim().length
      return h.arabic && len >= 90 && len <= 240
    })
    const sahih = candidates.filter((h) => (h.grade ?? "").toLowerCase().includes("sahih"))
    const ranked = sahih.length >= AUTO_PER_COLLECTION ? sahih : candidates
    let taken = 0
    for (const h of ranked) {
      if (taken >= AUTO_PER_COLLECTION) break
      const before = pool.length
      add(collection, h)
      if (pool.length > before) taken++
    }
  }

  return pool
}

// --- Public API ------------------------------------------------------------

export interface DailyPools {
  quran: DailyItem[]
  hadith: DailyItem[]
}

let poolsCache: DailyPools | null = null

export function getDailyPools(): DailyPools {
  if (poolsCache) return poolsCache
  poolsCache = {
    quran: buildQuranPool(),
    hadith: buildHadithPool(),
  }
  return poolsCache
}

