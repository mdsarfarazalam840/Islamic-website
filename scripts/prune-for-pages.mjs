#!/usr/bin/env node
/**
 * Prune files from the Next static export (`out/`) that must NOT ship to
 * Cloudflare Pages, then leave a lean deployable directory.
 *
 * Why:
 *  - Cloudflare Pages (free) caps a site at 20,000 files. The Pagefind index
 *    is ~43k files, so it is hosted on R2 instead and loaded cross-origin.
 *  - Pages caps a single asset at 25 MiB. hadith-all.json (85MB) and
 *    hadith-search-index.json (54MB) exceed that. They are no longer fetched
 *    by the app (Pagefind replaced client search), so they are dropped here.
 *
 * Run after `next build`, before `wrangler pages deploy out`.
 */
import fs from "node:fs"
import path from "node:path"

const OUT = path.resolve("out")

const REMOVE_DIRS = [
  "pagefind", // ~43k files → hosted on R2
]

const REMOVE_FILES = [
  "data/hadith/hadith-all.json", // 85MB, >25MiB Pages limit, unused by app
  "data/hadith/hadith-search-index.json", // 54MB, unused (Pagefind replaced it)
  "data/quran/quran-search-index.json", // unused (Pagefind replaced it)
]

let removed = 0

for (const d of REMOVE_DIRS) {
  const p = path.join(OUT, d)
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true })
    console.log(`  ✓ removed dir  out/${d}/`)
    removed++
  }
}

for (const f of REMOVE_FILES) {
  const p = path.join(OUT, f)
  if (fs.existsSync(p)) {
    const mb = (fs.statSync(p).size / 1048576).toFixed(1)
    fs.rmSync(p, { force: true })
    console.log(`  ✓ removed file out/${f} (${mb} MB)`)
    removed++
  }
}

// Report final file count against the Pages 20k limit.
function countFiles(dir) {
  let n = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name)
    if (e.isDirectory()) n += countFiles(fp)
    else n++
  }
  return n
}

const total = fs.existsSync(OUT) ? countFiles(OUT) : 0
console.log(`\n  out/ now has ${total.toLocaleString()} files (Cloudflare Pages limit: 20,000)`)
if (total > 20000) {
  console.error("  ✗ Still over the Pages file limit!")
  process.exit(1)
}
console.log(`  ✓ pruned ${removed} item(s); out/ is ready for Pages deploy\n`)
