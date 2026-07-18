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
    description: "The most authentic Hadith collection compiled by Imam Muhammad al-Bukhari.",
    author: "Muhammad al-Bukhari",
    editions: {
      arabic: "ara-bukhari",
      english: "eng-bukhari",
      urdu: "urd-bukhari",
    },
  },
  {
    id: "muslim" as const,
    name: "Sahih Muslim",
    nameArabic: "صحيح مسلم",
    description: "The second most authentic Hadith collection compiled by Imam Muslim ibn al-Hajjaj.",
    author: "Muslim ibn al-Hajjaj",
    editions: {
      arabic: "ara-muslim",
      english: "eng-muslim",
      urdu: "urd-muslim",
    },
  },
  {
    id: "abudawud" as const,
    name: "Sunan Abi Dawud",
    nameArabic: "سنن أبي داود",
    description: "A comprehensive collection on Islamic law compiled by Imam Abu Dawud, focusing on jurisprudence and daily practice.",
    author: "Abu Dawud",
    editions: {
      arabic: "ara-abudawud",
      english: "eng-abudawud",
      urdu: "urd-abudawud",
    },
  },
  {
    id: "tirmidhi" as const,
    name: "Jami at-Tirmidhi",
    nameArabic: "جامع الترمذي",
    description: "A unique collection that grades each hadith for authenticity and includes scholarly opinions on jurisprudential matters.",
    author: "Al-Tirmidhi",
    editions: {
      arabic: "ara-tirmidhi",
      english: "eng-tirmidhi",
      urdu: "urd-tirmidhi",
    },
  },
  {
    id: "nasai" as const,
    name: "Sunan an-Nasa'i",
    nameArabic: "سنن النسائي",
    description: "A highly regarded collection known for its rigorous authentication process, considered the most accurate of the Sunan books.",
    author: "Al-Nasa'i",
    editions: {
      arabic: "ara-nasai",
      english: "eng-nasai",
      urdu: "urd-nasai",
    },
  },
  {
    id: "ibnmajah" as const,
    name: "Sunan Ibn Majah",
    nameArabic: "سنن ابن ماجه",
    description: "The sixth canonical collection, containing many unique hadith not found in the other five books.",
    author: "Ibn Majah",
    editions: {
      arabic: "ara-ibnmajah",
      english: "eng-ibnmajah",
      urdu: "urd-ibnmajah",
    },
  },
  {
    id: "malik" as const,
    name: "Muwatta Malik",
    nameArabic: "موطأ مالك",
    description: "One of the earliest collections of hadith compiled by Imam Malik ibn Anas, forming the foundation of Maliki jurisprudence.",
    author: "Malik ibn Anas",
    editions: {
      arabic: "ara-malik",
      english: "eng-malik",
      urdu: "urd-malik",
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
  urdu: ApiEdition | null,
): {
  number: number
  arabic: string
  english: string
  urdu: string
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

  const urdMap = new Map<number, ApiHadith>()
  if (urdu) {
    for (const h of urdu.hadiths) {
      urdMap.set(h.hadithnumber, h)
    }
  }

  const allNumbers = new Set([
    ...english.hadiths.map((h) => h.hadithnumber),
    ...arabic.hadiths.map((h) => h.hadithnumber),
  ])

  for (const num of allNumbers) {
    const eng = engMap.get(num)
    const ara = araMap.get(num)
    const urd = urdMap.get(num)
    const ref = eng?.reference ?? ara?.reference

    if (!ref) continue

    const engText = eng?.text ?? ""
    const araText = ara?.text ?? ""
    const urdText = urd?.text ?? ""
    const narratorMatch = engText.match(/^Narrated\s+(.+?):/)
    const narrator = narratorMatch ? narratorMatch[1] : ""
    const cleanEnglish = narratorMatch ? engText.replace(/^Narrated\s+(.+?):\s*/, "") : engText

    const gradeObj = eng?.grades?.[0]
    const grade = gradeObj?.grade ?? ""

    merged.push({
      number: num,
      arabic: araText,
      english: cleanEnglish,
      urdu: urdText,
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
      let arabic: ApiEdition | null = null
      let english: ApiEdition | null = null
      let urdu: ApiEdition | null = null

      try {
        ;[arabic, english] = await Promise.all([
          fetchEdition(collection.editions.arabic),
          fetchEdition(collection.editions.english),
        ])
      } catch {
        english = await fetchEdition(collection.editions.english)
        console.log(`  Warning: Arabic edition unavailable, using English only`)
      }

      if (!english) throw new Error("English edition is required")
      if (!arabic) {
        arabic = { metadata: { name: "", sections: {} }, hadiths: [] }
      }

      try {
        urdu = await fetchEdition(collection.editions.urdu)
        console.log(`  Urdu: ${urdu.hadiths.length} hadiths`)
      } catch {
        console.log(`  Warning: Urdu edition unavailable for ${collection.name}`)
      }

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

      const merged = mergeHadiths(arabic, english, urdu)
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

      // Save combined file for client-side search (no pretty-print to minimize size)
      const allForCollection = Object.values(groupedByBook).flat()
      fs.writeFileSync(
        path.join(dir, `${collection.id}-all.json`),
        JSON.stringify(allForCollection),
      )
      console.log(`  ✓ Saved ${collection.id}-all.json (${allForCollection.length} hadiths)`)
    } catch (err) {
      console.error(`  ✗ Failed to fetch: ${err instanceof Error ? err.message : err}`)
    }
  }

  // Build combined hadith file + search index for all collections (used by client-side search)
  let allHadithsCombined: any[] = []
  for (const collection of COLLECTIONS) {
    const combinedPath = path.join(OUTPUT_DIR, collection.id, `${collection.id}-all.json`)
    if (fs.existsSync(combinedPath)) {
      const data = JSON.parse(fs.readFileSync(combinedPath, "utf-8"))
      allHadithsCombined.push(...data.map((h: any) => ({ ...h, collection: collection.id })))
    }
  }

  if (allHadithsCombined.length > 0) {
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "hadith-all.json"),
      JSON.stringify(allHadithsCombined),
    )
    console.log(`  ✓ Saved hadith-all.json (${allHadithsCombined.length} hadiths from all collections)`)
  }

  console.log("\n✓ Hadith data fetch complete!\n")
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
