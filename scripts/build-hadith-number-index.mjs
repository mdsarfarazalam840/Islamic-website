/**
 * Build a compact hadith-number → book lookup table so the browser can resolve
 * a reference like "Bukhari 1234" without downloading any hadith text.
 *
 * Why an index at all: hadith numbering is per-collection and continuous across
 * books, but the client only ever fetches one book file at a time. Without a map
 * there is no way to know that Bukhari 1234 lives in book 23 short of fetching
 * all 98 book files (~22 MB for Bukhari alone).
 *
 * Why run-length ranges: numbering is *mostly* sequential per book, so the
 * 36,000 hadiths across all seven collections collapse into ~1,400 runs. The
 * whole file lands around 40 KB — small enough to fetch once and keep, versus
 * ~300 KB for a flat number→book object.
 *
 * Output: `public/data/hadith/number-index.json`, committed alongside the rest
 * of `public/data`. Regenerate with `npm run build:hadith-index` (also chained
 * into `fetch:hadith` and `build:static`).
 */
import fs from "node:fs"
import path from "node:path"

const HADITH_DIR = path.resolve("public/data/hadith")
const OUTPUT_FILE = path.join(HADITH_DIR, "number-index.json")

// Mirrors src/lib/hadith/collections.ts, which is TS and can't be imported here.
const COLLECTION_DISPLAY_NAMES = {
  bukhari: "Sahih al-Bukhari",
  muslim: "Sahih Muslim",
  abudawud: "Sunan Abi Dawud",
  tirmidhi: "Jami at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  ibnmajah: "Sunan Ibn Majah",
  malik: "Muwatta Malik",
}

/** Collapse sorted [number, bookId] pairs into [firstNumber, lastNumber, bookId] runs. */
function toRuns(pairs) {
  const runs = []
  for (const [number, bookId] of pairs) {
    const last = runs[runs.length - 1]
    if (last && last[2] === bookId && number === last[1] + 1) {
      last[1] = number
      continue
    }
    runs.push([number, number, bookId])
  }
  return runs
}

function indexCollection(collectionId) {
  const booksDir = path.join(HADITH_DIR, collectionId, "books")
  if (!fs.existsSync(booksDir)) return null

  const pairs = []
  const books = {}

  for (const file of fs.readdirSync(booksDir)) {
    if (!file.startsWith("book-") || !file.endsWith(".json")) continue
    const hadiths = JSON.parse(fs.readFileSync(path.join(booksDir, file), "utf-8"))
    for (const h of hadiths) {
      if (typeof h.number !== "number" || typeof h.bookId !== "number") continue
      pairs.push([h.number, h.bookId])
      if (h.bookName && !books[h.bookId]) books[h.bookId] = h.bookName
    }
  }

  if (pairs.length === 0) return null

  // Sort by number so runs are contiguous. Duplicate numbers (none today, but
  // the upstream data could grow them) stay as separate runs and both resolve.
  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1])

  return {
    name: COLLECTION_DISPLAY_NAMES[collectionId] ?? collectionId,
    total: pairs.length,
    books,
    runs: toRuns(pairs),
  }
}

function main() {
  if (!fs.existsSync(HADITH_DIR)) {
    console.error(`No hadith data at ${HADITH_DIR} — run "npm run fetch:hadith" first.`)
    process.exit(1)
  }

  const collections = {}
  const dirs = fs
    .readdirSync(HADITH_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort()

  for (const id of dirs) {
    const entry = indexCollection(id)
    if (!entry) continue
    collections[id] = entry
    console.log(
      `  ${id.padEnd(10)} ${String(entry.total).padStart(5)} hadiths → ${entry.runs.length} runs`,
    )
  }

  if (Object.keys(collections).length === 0) {
    console.error("No hadith books found — nothing to index.")
    process.exit(1)
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ collections }))
  const kb = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_FILE)} (${kb} KB)`)
}

main()
