import fs from "node:fs"
import path from "node:path"

const CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1"
const OUTPUT_DIR = path.resolve("public/data/hadith")

interface ApiHadith {
  hadithnumber: number
  arabicnumber: number
  text: string
  grades: { name: string; grade: string }[]
  reference: { book: number; hadith: number }
}

interface ApiEdition {
  metadata: {
    name: string
    sections: Record<string, string>
  }
  hadiths: ApiHadith[]
}

const COLLECTIONS = [
  {
    id: "bukhari" as const,
    name: "Sahih al-Bukhari",
    nameArabic: "صحيح البخاري",
    totalHadith: 7563,
    totalBooks: 97,
    description: "The most authentic Hadith collection compiled by Imam Muhammad al-Bukhari.",
    author: "Muhammad al-Bukhari",
    editions: {
      arabic: "ara-bukhari",
      english: "eng-bukhari",
    },
  },
  {
    id: "muslim" as const,
    name: "Sahih Muslim",
    nameArabic: "صحيح مسلم",
    totalHadith: 7563,
    totalBooks: 57,
    description: "The second most authentic Hadith collection compiled by Imam Muslim ibn al-Hajjaj.",
    author: "Muslim ibn al-Hajjaj",
    editions: {
      arabic: "ara-muslim",
      english: "eng-muslim",
    },
  },
]

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json()
}

async function fetchEdition(editionName: string): Promise<ApiEdition> {
  const url = `${CDN}/editions/${editionName}.min.json`
  return fetchJson(url)
}

function mergeHadiths(
  arabic: ApiEdition,
  english: ApiEdition,
): {
  number: number
  arabic: string
  english: string
  narrator: string
  grade: string
  bookId: number
  chapterId: number
  bookName: string
  chapterName: string
}[] {
  const merged: any[] = []
  const sections = english.metadata.sections

  const engMap = new Map<number, ApiHadith>()
  for (const h of english.hadiths) {
    engMap.set(h.hadithnumber, h)
  }

  const araMap = new Map<number, ApiHadith>()
  for (const h of arabic.hadiths) {
    araMap.set(h.hadithnumber, h)
  }

  const allNumbers = new Set([
    ...english.hadiths.map((h) => h.hadithnumber),
    ...arabic.hadiths.map((h) => h.hadithnumber),
  ])

  for (const num of allNumbers) {
    const eng = engMap.get(num)
    const ara = araMap.get(num)
    const ref = eng?.reference ?? ara?.reference

    if (!ref) continue

    const engText = eng?.text ?? ""
    const araText = ara?.text ?? ""
    const narratorMatch = engText.match(/^Narrated\s+(.+?):/)
    const narrator = narratorMatch ? narratorMatch[1] : ""
    const cleanEnglish = narratorMatch ? engText.replace(/^Narrated\s+(.+?):\s*/, "") : engText

    const gradeObj = eng?.grades?.[0]
    const grade = gradeObj?.grade ?? ""

    merged.push({
      number: num,
      arabic: araText,
      english: cleanEnglish,
      narrator,
      grade,
      bookId: ref.book,
      chapterId: ref.hadith,
      bookName: sections[ref.book.toString()] ?? `Book ${ref.book}`,
      chapterName: "",
    })
  }

  merged.sort((a, b) => a.number - b.number)
  return merged
}

async function main() {
  console.log("=== Hadith Data Fetcher ===\n")

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  for (const collection of COLLECTIONS) {
    const dir = path.join(OUTPUT_DIR, collection.id)
    const booksDir = path.join(dir, "books")
    fs.mkdirSync(booksDir, { recursive: true })

    console.log(`Downloading ${collection.name}...`)

    try {
      const [arabic, english] = await Promise.all([
        fetchEdition(collection.editions.arabic),
        fetchEdition(collection.editions.english),
      ])

      console.log(`  Arabic: ${arabic.hadiths.length} hadiths`)
      console.log(`  English: ${english.hadiths.length} hadiths`)

      const sections = english.metadata.sections
      const bookNames: Record<string, string> = {}
      for (const [key, name] of Object.entries(sections)) {
        if (key !== "0" && name) {
          bookNames[key] = name
        }
      }

      const metadata = {
        id: collection.id,
        name: collection.name,
        nameArabic: collection.nameArabic,
        author: collection.author,
        totalHadith: english.hadiths.length,
        totalBooks: Object.keys(bookNames).length,
        books: bookNames,
        description: collection.description,
      }

      fs.writeFileSync(
        path.join(dir, "metadata.json"),
        JSON.stringify(metadata, null, 2),
      )
      console.log(`  ✓ Saved metadata (${Object.keys(bookNames).length} books)`)

      const merged = mergeHadiths(arabic, english)
      console.log(`  Merged: ${merged.length} hadiths`)

      const groupedByBook: Record<number, any[]> = {}
      for (const hadith of merged) {
        if (!groupedByBook[hadith.bookId]) {
          groupedByBook[hadith.bookId] = []
        }
        groupedByBook[hadith.bookId].push(hadith)
      }

      let totalSaved = 0
      for (const [bookId, hadiths] of Object.entries(groupedByBook)) {
        const filename = `book-${bookId}.json`
        fs.writeFileSync(
          path.join(booksDir, filename),
          JSON.stringify(hadiths, null, 2),
        )
        totalSaved += hadiths.length
      }

      console.log(`  ✓ Saved ${totalSaved} hadiths across ${Object.keys(groupedByBook).length} books`)
    } catch (err) {
      console.error(`  ✗ Failed to fetch: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log("\n✓ Hadith data fetch complete!\n")
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
