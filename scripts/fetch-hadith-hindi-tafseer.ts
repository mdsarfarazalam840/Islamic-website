import fs from "node:fs"
import path from "node:path"

/**
 * Hindi tafseer (explanation) for hadith, from hadeethenc.com.
 *
 * Our hadith corpus (fawazahmed0/hadith-api) has Arabic, English and Urdu but no
 * Hindi and no explanation in any language. hadeethenc.com is the only source that
 * carries Hindi hadith text *together with* a Hindi explanation and hints — but it
 * is a curated set of a few thousand entries and its records have no hadith
 * numbers, so they cannot be joined on an identifier. The only shared key is the
 * Arabic matn, which is why this script exists: it matches on normalised Arabic and
 * writes per-book sidecars for whatever it can match.
 *
 * Coverage is therefore partial by construction. The script prints the real
 * numbers and records them in hindi-tafseer-coverage.json so the UI can be honest
 * about which hadiths have an explanation and which do not.
 *
 *   npm run fetch:hadith-hindi
 *   npm run fetch:hadith-hindi -- --offline            # match from cache, no network
 *   npm run fetch:hadith-hindi -- --collections=bukhari
 *   npm run fetch:hadith-hindi -- --dry-run            # report only, write nothing
 *
 * Roughly 20 minutes on a cold run (one request per entry, 250 ms apart).
 * Responses are cached under .cache/hadeethenc/, so tuning the match thresholds
 * afterwards costs nothing.
 */

const API = "https://hadeethenc.com/api/v1"
const HADITH_DIR = path.resolve("public/data/hadith")
const CACHE_DIR = path.resolve(".cache/hadeethenc")

/** Between requests. The YouTube scraper in this repo learned the hard way that
 *  bursts get throttled into silently empty responses. */
const REQUEST_DELAY_MS = 250
const PER_PAGE = 100

/** Distinct 5-word Arabic shingles a local hadith must share with an entry. */
const MIN_SHINGLE_HITS = 5
/** ...and that share, as a fraction of the entry's own shingles. */
const MIN_SHINGLE_RATIO = 0.5
/**
 * ...and that many of the shared shingles must be *consecutive*.
 *
 * All three guards were set from a measured run, not guessed. At 3 hits / 0.3
 * ratio and no contiguity guard, 58 entries claimed 1037 local hadiths — 18 each,
 * which cross-collection duplication cannot explain. The cause is that the ratio
 * divides by the entry's own shingle count, so a short entry has a tiny
 * denominator: the honorific formula alone (8 words once normalised, hence 4
 * shingles) carried a 13-shingle entry past a 0.3 ratio. Stripping the formulae
 * removes most of that, and requiring a consecutive run removes the rest —
 * scattered hits on repeated phrases can no longer add up to a match.
 */
const MIN_SHINGLE_RUN = 4
const SHINGLE_SIZE = 5

/**
 * A run this long is accepted on its own evidence, at a lower ratio. Measured
 * again: the same hadith told at different lengths gives runs of 11–23 shingles
 * (that is 15–27 identical consecutive words) at ratios of 0.45–0.49, just under
 * the ratio bar. Meanwhile the false positives at the *same* hit count run only
 * 7 — 27 scattered hits, no long passage. Length of the shared passage separates
 * them where the hit count cannot.
 */
const STRONG_RUN = 8
const STRONG_RUN_MIN_RATIO = 0.3

/**
 * Hits needed when the hadith contains the entry *entirely* and contiguously
 * (ratio 1, run equal to the entry's whole shingle count). A short entry has few
 * shingles to share, so the general hit floor rejects verbatim containment — the
 * strongest evidence there is.
 */
const CONTAINED_MIN_HITS = 3

const COLLECTIONS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]

// --- CLI -------------------------------------------------------------------

const argv = process.argv.slice(2)
const hasFlag = (name: string) => argv.includes(`--${name}`)
const flagValue = (name: string) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

const OFFLINE = hasFlag("offline")
const DRY_RUN = hasFlag("dry-run")
const LIMIT = Number(flagValue("limit") ?? "0") || 0
const TARGET_COLLECTIONS = (flagValue("collections")?.split(",").filter(Boolean) ?? COLLECTIONS)
  .map((c) => c.trim())
  .filter((c) => {
    if (COLLECTIONS.includes(c)) return true
    console.warn(`  ! Unknown collection "${c}" — skipping`)
    return false
  })

// --- Arabic normalisation --------------------------------------------------

/**
 * Fixed phrases that carry no identifying information, written in their
 * post-normalisation spelling (no diacritics, `ى`→`ي`, `ة`→`ه`, hamza forms
 * folded) because they are removed after the folding above.
 *
 * These are the reason naive matching fails. The honorific after the Prophet's
 * name is 5 words and appears in most hadiths in both sources; normalised, it is
 * 4 of the 5-word shingles this script compares on. A short entry therefore
 * cleared a 0.3 shingle ratio on the honorific alone, matching thousands of
 * unrelated hadiths. Removing the formulae leaves "قال رسول الله" — 3 words,
 * too few to form a shingle by itself.
 */
const FORMULAE: RegExp[] = [
  /صلي الله عليه( وعلي اله)?( وصحبه)? وسلم/g,
  /علي(ه|ها|هم|هما) السلام/g,
  /رضي الله عن(ه|ها|هم|هما)/g,
  /سبحانه وتعالي/g,
  /تبارك وتعالي/g,
  /عز وجل/g,
  /جل جلاله/g,
]

/**
 * Isnad scaffolding, removed as whole words. The narrator chain differs between
 * the two sources for the same hadith (they cite different routes), so these
 * words only ever add noise. Both sides get the identical treatment, so removing
 * them keeps the two texts comparable.
 */
const ISNAD_WORDS = new Set([
  "حدثنا", "حدثني", "حدثهم", "اخبرنا", "اخبرني", "انبانا", "سمعت",
  "قال", "قالت", "قالوا", "عن", "بن", "ابن",
])

/**
 * Fold Arabic to a comparable form. Necessary, not precautionary: searching
 * `إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ` verbatim in bukhari/books/book-1.json finds nothing,
 * because the two sources vowel and spell it differently. The same text folded
 * finds it. Diacritics, tatweel, hamza forms, alif maqsura, ta marbuta and the
 * ya/hamza-on-ya pairs are all places the two sources disagree without meaning
 * anything different.
 */
function normalizeArabic(input: string): string {
  let text = input
    .normalize("NFC")
    .replace(/\p{Mn}/gu, "")
    .replace(/ـ/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  for (const formula of FORMULAE) text = text.replace(formula, " ")
  return text
    .split(" ")
    .filter((word) => word && !ISNAD_WORDS.has(word))
    .join(" ")
}

function shingles(normalized: string): string[] {
  const words = normalized.split(" ").filter(Boolean)
  if (words.length < SHINGLE_SIZE) return []
  const out: string[] = []
  for (let i = 0; i + SHINGLE_SIZE <= words.length; i++) {
    out.push(words.slice(i, i + SHINGLE_SIZE).join(" "))
  }
  return out
}

// --- hadeethenc client -----------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function cachePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.json`)
}

function readCache<T>(key: string): T | null {
  const file = cachePath(key)
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T
  } catch {
    return null
  }
}

function writeCache(key: string, value: unknown) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(cachePath(key), JSON.stringify(value))
}

/** Cache-first GET. Returns null rather than throwing so one bad id can't end the run. */
async function getJson<T>(url: string, key: string): Promise<T | null> {
  const cached = readCache<T>(key)
  if (cached) return cached
  if (OFFLINE) return null

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as T
      writeCache(key, json)
      await sleep(REQUEST_DELAY_MS)
      return json
    } catch (err) {
      if (attempt === 3) {
        console.warn(`  ! ${key}: ${err instanceof Error ? err.message : err}`)
        return null
      }
      await sleep(REQUEST_DELAY_MS * attempt * 4)
    }
  }
  return null
}

interface EncCategory {
  id: string | number
  title?: string
}

interface EncListPage {
  data?: { id: string | number }[]
  meta?: { current_page?: number; last_page?: number }
}

interface EncHadith {
  id?: string | number
  title?: string
  hadeeth?: string
  /** Narrator preamble, e.g. "अबू हुरैरा (रज़ि॰) कहते हैं". */
  hadeeth_intro?: string
  /** Arabic matn, present in every language's payload — this is the join key. */
  hadeeth_ar?: string
  explanation?: string
  hints?: string[]
  attribution?: string
  grade?: string
}

async function collectHadithIds(): Promise<string[]> {
  const categories = await getJson<EncCategory[]>(
    `${API}/categories/list/?language=hi`,
    "categories-hi",
  )
  if (!categories?.length) {
    console.error("Could not list categories. Without them there are no ids to fetch.")
    return []
  }
  console.log(`Categories: ${categories.length}`)

  // Entries are filed under several categories, so ids repeat across pages.
  const ids = new Set<string>()
  let announced = 0
  for (const category of categories) {
    let page = 1
    for (;;) {
      const key = `list-hi-${category.id}-${page}`
      const payload = await getJson<EncListPage>(
        `${API}/hadeeths/list/?language=hi&category_id=${category.id}&page=${page}&per_page=${PER_PAGE}`,
        key,
      )
      if (!payload?.data?.length) break
      for (const entry of payload.data) ids.add(String(entry.id))
      const last = payload.meta?.last_page ?? page
      if (page >= last) break
      page++
    }
    // Only when it moves: most of the 449 categories are subsets of ones already
    // walked, and reprinting the same total for each fills the log with noise.
    if (ids.size !== announced) {
      announced = ids.size
      process.stdout.write(`\r  ids so far: ${ids.size}   `)
    }
  }
  process.stdout.write("\n")
  return [...ids]
}

interface EncEntry {
  id: string
  title: string
  hindi: string
  explanation: string
  hints: string[]
  attribution: string
  grade: string
  arabic: string
}

const ARABIC_LETTER = /[ء-ي]/

async function fetchEntry(id: string): Promise<EncEntry | null> {
  const hi = await getJson<EncHadith>(`${API}/hadeeths/one/?language=hi&id=${id}`, `hi-${id}`)
  if (!hi) return null

  // The Hindi payload carries the Arabic matn in `hadeeth_ar` (verified against
  // live entries), so one request per id is enough. The language=ar request is
  // only a fallback for entries that omit it.
  let arabic = typeof hi.hadeeth_ar === "string" ? hi.hadeeth_ar : ""
  if (!arabic && typeof hi.hadeeth === "string" && ARABIC_LETTER.test(hi.hadeeth)) {
    arabic = hi.hadeeth
  }
  if (!arabic) {
    const ar = await getJson<EncHadith>(`${API}/hadeeths/one/?language=ar&id=${id}`, `ar-${id}`)
    arabic = typeof ar?.hadeeth === "string" ? ar.hadeeth : ""
  }

  const body = typeof hi.hadeeth === "string" && !ARABIC_LETTER.test(hi.hadeeth) ? hi.hadeeth : ""
  const intro = typeof hi.hadeeth_intro === "string" ? hi.hadeeth_intro : ""
  const hindi = [intro, body].filter(Boolean).join(" ")
  const explanation = typeof hi.explanation === "string" ? hi.explanation : ""
  if (!arabic || (!hindi && !explanation)) return null

  return {
    id,
    title: typeof hi.title === "string" ? hi.title : "",
    hindi,
    explanation,
    hints: Array.isArray(hi.hints) ? hi.hints.filter((h): h is string => typeof h === "string") : [],
    attribution: typeof hi.attribution === "string" ? hi.attribution : "",
    grade: typeof hi.grade === "string" ? hi.grade : "",
    arabic,
  }
}

// --- Matching --------------------------------------------------------------

interface IndexedEntry extends EncEntry {
  normalized: string
  shingleSet: Set<string>
  shingleCount: number
  wordCount: number
}

interface EncIndex {
  entries: Map<string, IndexedEntry>
  /** shingle → entry ids containing it. */
  byShingle: Map<string, string[]>
  /** Entries too short to shingle, matched by containment instead. */
  short: IndexedEntry[]
}

/**
 * Index the hadeethenc side, which is the small one (a few thousand entries
 * against our ~34k hadiths). Indexing our corpus instead would mean millions of
 * shingle keys in memory to answer the same question.
 */
function buildEncIndex(entries: EncEntry[]): EncIndex {
  const indexed = new Map<string, IndexedEntry>()
  const byShingle = new Map<string, string[]>()
  const short: IndexedEntry[] = []

  for (const entry of entries) {
    const normalized = normalizeArabic(entry.arabic)
    const keys = [...new Set(shingles(normalized))]
    const record: IndexedEntry = {
      ...entry,
      normalized,
      shingleSet: new Set(keys),
      shingleCount: keys.length,
      wordCount: normalized.split(" ").filter(Boolean).length,
    }
    indexed.set(entry.id, record)

    if (keys.length === 0) {
      // A four-word matn has no 5-word shingle. Long enough to be distinctive is
      // the bar for matching it by containment instead.
      if (record.wordCount >= 4) short.push(record)
      continue
    }
    for (const key of keys) {
      const bucket = byShingle.get(key)
      if (bucket) bucket.push(entry.id)
      else byShingle.set(key, [entry.id])
    }
  }

  return { entries: indexed, byShingle, short }
}

interface MatchResult {
  entry: IndexedEntry
  hits: number
  ratio: number
  /** Longest stretch of consecutive shared shingles; 0 for short-form matches. */
  run: number
}

/**
 * Longest run of consecutive local shingles the entry also holds. A shared fixed
 * phrase produces a short run wherever it appears; the same hadith told twice
 * produces a long one. This is what separates the two, and neither the hit count
 * nor the ratio can: both are order-blind, so scattered hits on several common
 * phrases score the same as one continuous passage.
 */
function longestSharedRun(localShingles: string[], entry: IndexedEntry): number {
  let best = 0
  let run = 0
  for (const shingle of localShingles) {
    if (entry.shingleSet.has(shingle)) {
      run++
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return best
}

/**
 * Whether a candidate is the same hadith. Three independent kinds of evidence,
 * any one of which suffices — the two sources tell the same hadith at different
 * lengths and with different isnad, so no single score covers every real match.
 */
function accepts(candidate: MatchResult): boolean {
  const { hits, ratio, run, entry } = candidate

  // The entry appears whole and unbroken inside the hadith.
  if (ratio >= 1 && run >= entry.shingleCount && hits >= CONTAINED_MIN_HITS) return true

  // A long shared passage. Fewer of the entry's shingles are present, because the
  // entry is the longer telling — but what is shared is one continuous stretch.
  if (run >= STRONG_RUN && ratio >= STRONG_RUN_MIN_RATIO) return true

  // Neither: hold it to the full bar.
  return hits >= MIN_SHINGLE_HITS && ratio >= MIN_SHINGLE_RATIO && run >= MIN_SHINGLE_RUN
}

function bestMatch(localArabic: string, index: EncIndex): { match: MatchResult | null; runnerUp: MatchResult | null } {
  const normalized = normalizeArabic(localArabic)
  if (!normalized) return { match: null, runnerUp: null }

  const localShingles = shingles(normalized)
  const hits = new Map<string, number>()
  for (const key of new Set(localShingles)) {
    const bucket = index.byShingle.get(key)
    if (!bucket) continue
    for (const id of bucket) hits.set(id, (hits.get(id) ?? 0) + 1)
  }

  const scored: MatchResult[] = []
  for (const [id, count] of hits) {
    const entry = index.entries.get(id)!
    scored.push({ entry, hits: count, ratio: count / entry.shingleCount, run: 0 })
  }

  for (const entry of index.short) {
    if (normalized.includes(entry.normalized)) {
      scored.push({ entry, hits: MIN_SHINGLE_HITS, ratio: 1, run: 0 })
    }
  }

  // Ratio first: a short entry fully contained in a long hadith is a better match
  // than a long entry sharing a few lines of isnad.
  scored.sort((a, b) => b.ratio - a.ratio || b.hits - a.hits)
  const top = scored[0] ?? null
  if (!top) return { match: null, runnerUp: null }

  // Only for the leader — the run is the expensive check and the leader is the
  // only candidate that could be accepted.
  top.run = top.entry.shingleCount === 0 ? MIN_SHINGLE_RUN : longestSharedRun(localShingles, top.entry)

  const accepted = accepts(top) ? top : null
  return { match: accepted, runnerUp: accepted ? null : top }
}

// --- Local corpus ----------------------------------------------------------

interface LocalHadith {
  number: number
  arabic: string
  bookId: number
}

function readCollection(collection: string): LocalHadith[] {
  const combined = path.join(HADITH_DIR, collection, `${collection}-all.json`)
  if (fs.existsSync(combined)) {
    return JSON.parse(fs.readFileSync(combined, "utf-8")) as LocalHadith[]
  }
  // The deploy prune deletes *-all.json, so fall back to the per-book files that
  // ship with the site.
  const booksDir = path.join(HADITH_DIR, collection, "books")
  if (!fs.existsSync(booksDir)) return []
  const all: LocalHadith[] = []
  for (const file of fs.readdirSync(booksDir).filter((f) => f.endsWith(".json"))) {
    all.push(...(JSON.parse(fs.readFileSync(path.join(booksDir, file), "utf-8")) as LocalHadith[]))
  }
  return all
}

interface TafseerRecord {
  text: string
  explanation: string
  hints: string[]
  attribution: string
  grade: string
  sourceId: string
}

// --- Main ------------------------------------------------------------------

async function main() {
  console.log("=== Hadith Hindi Tafseer (hadeethenc.com) ===\n")
  if (OFFLINE) console.log("Offline: using cached responses only.\n")

  const ids = OFFLINE ? cachedIds() : await collectHadithIds()
  if (!ids.length) {
    console.error("\nNo hadeethenc ids available. Nothing to match against.")
    process.exit(1)
  }
  const wanted = LIMIT > 0 ? ids.slice(0, LIMIT) : ids
  console.log(`Fetching ${wanted.length} entries...`)

  const entries: EncEntry[] = []
  for (let i = 0; i < wanted.length; i++) {
    const entry = await fetchEntry(wanted[i])
    if (entry) entries.push(entry)
    if (i % 25 === 0 || i === wanted.length - 1) {
      process.stdout.write(`\r  ${i + 1}/${wanted.length} — usable: ${entries.length}   `)
    }
  }
  process.stdout.write("\n")

  if (!entries.length) {
    console.error("\nNo usable entries (each needs Arabic text plus Hindi text or explanation).")
    process.exit(1)
  }

  const index = buildEncIndex(entries)
  console.log(
    `Indexed ${index.entries.size} entries: ${index.byShingle.size} shingles, ${index.short.length} short-form\n`,
  )

  const coverage: Record<string, { matched: number; total: number; byBook: Record<string, number> }> = {}
  const nearMisses: { collection: string; number: number; ratio: number; hits: number; run: number }[] = []
  /** enc id → local hadiths it was matched to, the precision check. */
  const usedBy = new Map<string, number>()
  let grandMatched = 0
  let grandTotal = 0

  for (const collection of TARGET_COLLECTIONS) {
    const local = readCollection(collection)
    if (!local.length) {
      console.log(`${collection}: no local data — run npm run fetch:hadith first`)
      continue
    }

    const byBook = new Map<number, Record<string, TafseerRecord>>()
    const bookCounts: Record<string, number> = {}
    let matched = 0

    for (const hadith of local) {
      if (!hadith.arabic) continue
      const { match, runnerUp } = bestMatch(hadith.arabic, index)
      if (!match) {
        if (runnerUp && runnerUp.ratio > 0.15) {
          nearMisses.push({
            collection,
            number: hadith.number,
            ratio: Number(runnerUp.ratio.toFixed(3)),
            hits: runnerUp.hits,
            run: runnerUp.run,
          })
        }
        continue
      }

      const book = byBook.get(hadith.bookId) ?? {}
      book[String(hadith.number)] = {
        text: match.entry.hindi,
        explanation: match.entry.explanation,
        hints: match.entry.hints,
        attribution: match.entry.attribution,
        grade: match.entry.grade,
        sourceId: match.entry.id,
      }
      byBook.set(hadith.bookId, book)
      bookCounts[String(hadith.bookId)] = (bookCounts[String(hadith.bookId)] ?? 0) + 1
      usedBy.set(match.entry.id, (usedBy.get(match.entry.id) ?? 0) + 1)
      matched++
    }

    coverage[collection] = { matched, total: local.length, byBook: bookCounts }
    grandMatched += matched
    grandTotal += local.length

    const percent = local.length ? ((matched / local.length) * 100).toFixed(1) : "0.0"
    console.log(`${collection}: ${matched}/${local.length} matched (${percent}%) across ${byBook.size} books`)

    if (DRY_RUN) continue

    const outDir = path.join(HADITH_DIR, collection, "hindi")
    fs.mkdirSync(outDir, { recursive: true })
    // Stale sidecars would keep claiming coverage this run didn't produce.
    for (const file of fs.readdirSync(outDir).filter((f) => f.startsWith("book-") && f.endsWith(".json"))) {
      fs.rmSync(path.join(outDir, file))
    }
    for (const [bookId, records] of byBook) {
      fs.writeFileSync(path.join(outDir, `book-${bookId}.json`), JSON.stringify(records))
    }
  }

  const percent = grandTotal ? ((grandMatched / grandTotal) * 100).toFixed(1) : "0.0"
  console.log(`\nTotal: ${grandMatched}/${grandTotal} hadiths matched (${percent}%)`)

  // Precision, which the match rate alone hides. One entry legitimately matches a
  // few local hadiths — the same hadith appears in several collections, and
  // sometimes twice in one. An entry claiming dozens is matching a shared phrase
  // instead, and that is a threshold problem, not a coverage win.
  const claims = [...usedBy.entries()].sort((a, b) => b[1] - a[1])
  const perEntry = grandMatched && usedBy.size ? (grandMatched / usedBy.size).toFixed(1) : "0"
  console.log(`Entries used: ${usedBy.size}/${index.entries.size} — ${perEntry} hadiths per entry on average`)
  if (claims.length) {
    const worst = claims.slice(0, 5).map(([id, count]) => `${id} (${count})`).join(", ")
    console.log(`Widest-claiming entries: ${worst}`)
  }

  // The thresholds are a judgement call, so show what sat just below them. A long
  // list of 0.45-ratio near misses with a long shared run means the ratio is too
  // strict for this data; near misses with `run` of 1–3 are the shared-phrase
  // rejections the run guard exists for.
  if (nearMisses.length) {
    nearMisses.sort((a, b) => b.ratio - a.ratio)
    console.log(`\nNear misses below the thresholds (${nearMisses.length} total), highest first:`)
    for (const miss of nearMisses.slice(0, 15)) {
      console.log(`  ${miss.collection} #${miss.number}: ratio ${miss.ratio}, ${miss.hits} hits, run ${miss.run}`)
    }
  }

  if (DRY_RUN) {
    console.log("\nDry run — no files written.")
    return
  }

  fs.writeFileSync(
    path.join(HADITH_DIR, "hindi-tafseer-coverage.json"),
    JSON.stringify(coverage),
  )
  console.log("\n✓ Wrote per-book sidecars and hindi-tafseer-coverage.json")
  console.log("  Next: npm run build:pagefind (indexes the Hindi text for search)\n")
}

/** Ids already on disk, for --offline runs. */
function cachedIds(): string[] {
  if (!fs.existsSync(CACHE_DIR)) return []
  const ids = new Set<string>()
  for (const file of fs.readdirSync(CACHE_DIR)) {
    const match = file.match(/^hi-(\d+)\.json$/)
    if (match) ids.add(match[1])
  }
  return [...ids]
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
