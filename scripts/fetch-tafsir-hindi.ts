import fs from "node:fs"
import path from "node:path"

/**
 * Snapshot the Hindi tafsir edition (`hindi-mokhtasar`) from spa5k/tafsir_api
 * onto disk.
 *
 * Why this exists: src/lib/quran/tafsir.ts fetches every edition straight from
 * jsDelivr at runtime, which is fine for the five editions we only read — but
 * the Hindi one is also an *input* to the AI correction pass
 * (scripts/ai-hindi-pass.ts) and to the search index. Neither can operate on
 * text that only exists on a CDN, so this pulls it local. Once local, the file
 * is the source of truth: the reader prefers it and only falls back to jsDelivr
 * when a surah is missing.
 *
 * Layout: one file per surah, `surah-<n>.json`, shaped `{ "<ayah>": "text" }`.
 * Per-surah rather than per-ayah (which is how the upstream API is keyed)
 * because 114 files diff and batch-edit cleanly where 6,236 do not, and the
 * reader caches a whole surah on first expand instead of paying a request per
 * ayah. The upstream per-surah bundles make this 114 requests, not 6,236.
 *
 * Ayahs whose upstream text is empty are omitted rather than stored as "" —
 * absence is what the panel already renders as "no tafsir for this ayah".
 *
 * Run: npm run fetch:tafsir-hindi
 */

const EDITION = "hindi-mokhtasar"
const BASE = `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${EDITION}`
const OUTPUT_DIR = path.resolve("public/data/tafsir", EDITION)
const SURAH_COUNT = 114

/** Polite spacing between CDN requests; 114 of them, so this costs ~17s total. */
const REQUEST_DELAY_MS = 150

interface UpstreamEntry {
  text?: string
  ayah?: number
  surah?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchSurah(n: number): Promise<UpstreamEntry[] | null> {
  // One retry: jsDelivr occasionally 5xxs on a cold path.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${BASE}/${n}.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as UpstreamEntry[]
      if (!Array.isArray(data)) throw new Error("not an array")
      return data
    } catch (err) {
      if (attempt === 1) {
        console.warn(`  ⚠ surah ${n}: ${(err as Error).message}`)
        return null
      }
      await sleep(1000)
    }
  }
  return null
}

async function main() {
  console.log(`=== Tafsir Snapshot (${EDITION}) ===\n`)
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  let written = 0
  let entries = 0
  let empty = 0

  for (let n = 1; n <= SURAH_COUNT; n++) {
    const data = await fetchSurah(n)
    if (!data) continue

    const map: Record<string, string> = {}
    for (const e of data) {
      const text = e.text?.trim()
      if (!text) {
        empty++
        continue
      }
      map[String(e.ayah)] = text
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, `surah-${n}.json`), JSON.stringify(map, null, 2))
    written++
    entries += Object.keys(map).length

    if (n % 20 === 0 || n === SURAH_COUNT) {
      console.log(`  ${n}/${SURAH_COUNT} surahs — ${entries} entries so far`)
    }
    await sleep(REQUEST_DELAY_MS)
  }

  console.log(
    `\n✓ ${written}/${SURAH_COUNT} surah files written to ${path.relative(process.cwd(), OUTPUT_DIR)}`,
  )
  console.log(`  ${entries} ayahs with tafsir, ${empty} empty upstream entries skipped\n`)
}

main().catch((err) => {
  console.error("Error snapshotting tafsir:", err)
  process.exit(1)
})
