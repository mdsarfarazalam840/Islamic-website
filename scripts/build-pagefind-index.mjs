/**
 * Build a static Pagefind search index directly from the Quran + Hadith JSON
 * data, using Pagefind's Node API (`addCustomRecord`).
 *
 * Why the custom-record API instead of Pagefind's default HTML crawl:
 * the ayah/hadith text is fetched client-side at runtime, so it never appears
 * in the exported static HTML. Crawling `out/` would therefore index nothing.
 * Building records straight from the source JSON indexes the real content.
 *
 * Output: `public/pagefind/` — a fragment-based index the browser loads on
 * demand (tens of KB per query) instead of downloading the whole corpus.
 *
 * Plain ESM (.mjs) + `node`: the `pagefind` package is ESM-only and tsx's
 * TS path resolver can't load its export map, so we skip tsx here.
 *
 * Run after the data exists. The folder lives in `public/`, so `next build`
 * copies it into `out/`. See package.json scripts.
 */
import fs from "node:fs"
import path from "node:path"
import * as pagefind from "pagefind"

const QURAN_DIR = path.resolve("public/data/quran")
const HADITH_DIR = path.resolve("public/data/hadith")
const OUTPUT_DIR = path.resolve("public/pagefind")

const COLLECTIONS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]

const COLLECTION_DISPLAY = {
  bukhari: "Sahih al-Bukhari",
  muslim: "Sahih Muslim",
  abudawud: "Sunan Abi Dawud",
  tirmidhi: "Jami' at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  ibnmajah: "Sunan Ibn Majah",
  malik: "Muwatta Malik",
}

async function main() {
  console.log("=== Build Pagefind Index ===\n")

  // A clean rebuild each time so stale fragments never linger.
  if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })

  const { index } = await pagefind.createIndex({})
  if (!index) throw new Error("Failed to create Pagefind index")

  let quranCount = 0
  let hadithCount = 0

  // The Pagefind service parallelizes internally; adding records concurrently
  // in batches is dramatically faster than awaiting each one serially.
  const BATCH = 256
  async function addAll(records) {
    for (let i = 0; i < records.length; i += BATCH) {
      await Promise.all(records.slice(i, i + BATCH).map((r) => index.addCustomRecord(r)))
    }
  }

  // --- Quran: one record per ayah ---
  const quranAllPath = path.join(QURAN_DIR, "quran-all.json")
  if (fs.existsSync(quranAllPath)) {
    console.log("Indexing Quran ayahs...")
    const ayahs = JSON.parse(fs.readFileSync(quranAllPath, "utf-8"))
    const quranRecords = ayahs.map((a) => {
      const parts = [a.arabic, a.translations?.en, a.translations?.ur, a.translations?.hi]
        .filter(Boolean)
        .join("  ")
      return {
        url: `/quran/${a.surahNumber}#ayah-${a.number}`,
        content: parts,
        // Multilingual content in one record; "en" keeps a single unified index
        // that still matches Arabic/Urdu/Hindi substrings (Pagefind indexes the
        // raw content regardless of the declared language's stemmer).
        language: "en",
        meta: {
          type: "quran",
          title: `Surah ${a.surahNumber}:${a.ayahNumber}`,
          surah: String(a.surahNumber),
          ayah: String(a.ayahNumber),
          juz: String(a.juz),
        },
        filters: { type: ["quran"] },
      }
    })
    await addAll(quranRecords)
    quranCount = quranRecords.length
    console.log(`  ✓ ${quranCount} ayahs indexed`)
  } else {
    console.warn("  ⚠ quran-all.json not found, skipping Quran")
  }

  // --- Hadith: one record per hadith, read per-collection to bound memory ---
  console.log("Indexing Hadith...")
  for (const col of COLLECTIONS) {
    const colAllPath = path.join(HADITH_DIR, col, `${col}-all.json`)
    if (!fs.existsSync(colAllPath)) {
      console.warn(`  ⚠ ${col}-all.json not found, skipping ${col}`)
      continue
    }
    const hadiths = JSON.parse(fs.readFileSync(colAllPath, "utf-8"))
    const records = hadiths.map((h) => {
      const parts = [h.english, h.arabic, h.urdu, h.narrator, h.bookName]
        .filter(Boolean)
        .join("  ")
      return {
        url: `/hadith/${col}/${h.bookId ?? 1}#hadith-${col}-${h.number}`,
        content: parts,
        language: "en",
        meta: {
          type: "hadith",
          title: `${COLLECTION_DISPLAY[col] ?? col} — Hadith ${h.number}`,
          collection: col,
          collectionName: COLLECTION_DISPLAY[col] ?? col,
          book: h.bookName ?? "",
          hadithNumber: String(h.number),
          narrator: h.narrator ?? "",
          grade: h.grade ?? "",
        },
        filters: { type: ["hadith"], collection: [col] },
      }
    })
    await addAll(records)
    hadithCount += records.length
    console.log(`  ✓ ${col}: ${hadiths.length} hadiths`)
  }

  console.log(`\nWriting index to ${OUTPUT_DIR} ...`)
  await index.writeFiles({ outputPath: OUTPUT_DIR })
  await pagefind.close()

  console.log(`\n✓ Pagefind index built: ${quranCount} ayahs + ${hadithCount} hadiths\n`)
}

main().catch((err) => {
  console.error("Error building Pagefind index:", err)
  process.exit(1)
})
