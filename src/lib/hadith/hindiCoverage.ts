import fs from "node:fs"
import path from "node:path"

/**
 * Build-time read of the Hindi tafseer coverage report written by
 * scripts/fetch-hadith-hindi-tafseer.ts.
 *
 * Server-only (`node:fs`) — the client-side loader for the tafseer text itself is
 * src/lib/hadith/hindiTafseer.ts. Coverage is partial because the source is
 * matched onto our corpus by Arabic text, so pages state the real numbers instead
 * of leaving readers to discover the gaps card by card.
 */

const COVERAGE_FILE = path.join(
  process.cwd(),
  "public",
  "data",
  "hadith",
  "hindi-tafseer-coverage.json",
)

interface CollectionCoverage {
  matched: number
  total: number
  /** bookId → hadiths matched in that book. */
  byBook: Record<string, number>
}

type CoverageReport = Record<string, CollectionCoverage>

let cache: CoverageReport | null = null

function readCoverage(): CoverageReport {
  if (cache) return cache
  // Absent until the fetch script has run, which is the state a fresh clone is in.
  cache = fs.existsSync(COVERAGE_FILE)
    ? (JSON.parse(fs.readFileSync(COVERAGE_FILE, "utf-8")) as CoverageReport)
    : {}
  return cache
}

/** Hadiths in this book with a Hindi tafseer, or 0 when there is no data. */
export function getHindiTafseerBookCount(collection: string, bookId: number): number {
  return readCoverage()[collection]?.byBook[String(bookId)] ?? 0
}
