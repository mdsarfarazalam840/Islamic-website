import fs from "node:fs"
import path from "node:path"
import Fuse from "fuse.js"
import type { Ayah, Hadith } from "@/types"

const QURAN_DIR = path.resolve("public/data/quran")
const HADITH_DIR = path.resolve("public/data/hadith")

const COLLECTIONS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]

const SEARCH_OPTIONS = {
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
}

const QURAN_KEYS = [
  { name: "translations.en", weight: 1 },
  { name: "translations.hi", weight: 0.8 },
  { name: "translations.ur", weight: 0.8 },
  { name: "arabic", weight: 0.6 },
]

const HADITH_KEYS = [
  { name: "english", weight: 1 },
  { name: "arabic", weight: 0.6 },
  { name: "narrator", weight: 0.4 },
  { name: "bookName", weight: 0.3 },
]

function buildIndex<T>(items: T[], keys: Fuse.FuseOptionKey<T>[]): Fuse.IFuseIndex<T> {
  const fuse = new Fuse(items, { keys, ...SEARCH_OPTIONS })
  return fuse.getIndex()
}

async function main() {
  console.log("=== Build Search Indices ===\n")

  // --- Quran search index ---
  const quranAllPath = path.join(QURAN_DIR, "quran-all.json")
  if (fs.existsSync(quranAllPath)) {
    console.log("Building Quran search index...")
    const ayahs: Ayah[] = JSON.parse(fs.readFileSync(quranAllPath, "utf-8"))
    const index = buildIndex(ayahs, QURAN_KEYS)
    fs.writeFileSync(
      path.join(QURAN_DIR, "quran-search-index.json"),
      JSON.stringify(index),
    )
    console.log(`  ✓ quran-search-index.json (${ayahs.length} ayahs)`)
  } else {
    console.warn("  ⚠ quran-all.json not found, skipping Quran index")
  }

  // --- Combined Hadith search index (for client-side /search) ---
  const hadithAllPath = path.join(HADITH_DIR, "hadith-all.json")
  if (fs.existsSync(hadithAllPath)) {
    console.log("Building combined Hadith search index...")
    const hadiths: Hadith[] = JSON.parse(fs.readFileSync(hadithAllPath, "utf-8"))
    const index = buildIndex(hadiths, HADITH_KEYS)
    fs.writeFileSync(
      path.join(HADITH_DIR, "hadith-search-index.json"),
      JSON.stringify(index),
    )
    console.log(`  ✓ hadith-search-index.json (${hadiths.length} hadiths)`)
  } else {
    console.warn("  ⚠ hadith-all.json not found, skipping combined Hadith index")
  }

  // --- Per-collection Hadith search indices (for server-side search) ---
  for (const col of COLLECTIONS) {
    const colAllPath = path.join(HADITH_DIR, col, `${col}-all.json`)
    if (fs.existsSync(colAllPath)) {
      console.log(`Building ${col} search index...`)
      const hadiths: Hadith[] = JSON.parse(fs.readFileSync(colAllPath, "utf-8"))
      const index = buildIndex(hadiths, HADITH_KEYS)
      fs.writeFileSync(
        path.join(HADITH_DIR, col, `${col}-search-index.json`),
        JSON.stringify(index),
      )
      console.log(`  ✓ ${col}-search-index.json (${hadiths.length} hadiths)`)
    } else {
      console.warn(`  ⚠ ${col}-all.json not found, skipping ${col} index`)
    }
  }

  console.log("\n✓ Search indices built successfully!\n")
}

main().catch((err) => {
  console.error("Error building search indices:", err)
  process.exit(1)
})
