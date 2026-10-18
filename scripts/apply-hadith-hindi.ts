import fs from "node:fs"
import path from "node:path"

/**
 * Apply hand-written Hindi hadith translations to the per-book sidecars.
 *
 * Translating 36,187 hadiths by hand is not one edit, it is hundreds of batches,
 * so the translations live as data rather than in this file:
 *
 *   scripts/data/hadith-hindi/<batch>.json    { "<collection>-<bookId>-<number>": "<hindi>" }
 *
 * Every file in that directory is merged, validated, and written out. Adding a
 * batch is dropping in one new file — nothing existing is touched, so a bad edit
 * cannot silently eat entries the way an append into a single growing map can
 * (which is exactly what happened to three of the first 37).
 *
 * Output is the same shape the AI pass writes and src/lib/hadith/hindiTafseer.ts
 * already reads:
 *   public/data/hadith/<collection>/hindi/book-<bookId>.json
 * with `textSource: "ur"` (or `"en"` where only English existed), so provenance
 * is recorded identically. Anything hadeethenc authored — `explanation`,
 * `hints`, `attribution`, `grade` — is preserved; this only fills `text`.
 *
 *   npx tsx scripts/apply-hadith-hindi.ts              # validate + report coverage
 *   npx tsx scripts/apply-hadith-hindi.ts --write       # apply
 *   npx tsx scripts/apply-hadith-hindi.ts --next=40     # print the next N to translate
 *   npx tsx scripts/apply-hadith-hindi.ts --next=40 --collection=bukhari
 */

const HADITH_DIR = path.resolve("public/data/hadith")
const BATCH_DIR = path.resolve("scripts/data/hadith-hindi")
const KNOWLEDGE_DIR = path.resolve("src/data/knowledge/articles")

const WRITE = process.argv.includes("--write")
const NEXT = Number(process.argv.find((a) => a.startsWith("--next"))?.split("=")[1] ?? "0")
const ONLY_COLLECTION = process.argv.find((a) => a.startsWith("--collection"))?.split("=")[1]
/**
 * Restrict --next to hadiths whose source is Urdu or English.
 *
 * The ~2,720 English-only hadiths are the ones src/lib/translit/urdu.ts cannot
 * touch — transliteration needs Urdu — so they are a separate, hand-translated
 * worklist. They are scattered through the collections (1,809 in Nasa'i alone),
 * which is why filtering beats scrolling.
 */
const ONLY_SOURCE = process.argv.find((a) => a.startsWith("--source"))?.split("=")[1] as
  | "ur"
  | "en"
  | undefined

/** Most-read first, so partial coverage is useful rather than arbitrary. */
const COLLECTIONS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]

interface SidecarEntry {
  text: string
  explanation: string
  hints: string[]
  attribution: string
  grade: string
  sourceId: string
  textSource?: "ur" | "en"
}

interface CorpusHadith {
  key: string
  collection: string
  bookId: number
  number: number
  source: "ur" | "en"
  text: string
}

// --- Validation ------------------------------------------------------------

/**
 * Sequences that cannot occur in correct Devanagari — the same set
 * scripts/scan-devanagari.ts uses on the rest of the corpus. A hit is a typo in
 * a batch file, not a stylistic choice, so it fails the run.
 */
const MALFORMED: [RegExp, string][] = [
  [/[अ-औ][ा-ौ]/, "independent vowel carrying a matra"],
  [/्[ा-ौ]/, "matra after a virama"],
  [/[ा-ौ]{2,}/, "stacked matras"],
  [/[ॅॉ]/, "chandra vowel — ाँ / ँ intended"],
  [/्{2,}/, "doubled virama"],
  [/़़/, "doubled nuqta"],
  [/(^|\s)[ा-ौंःँ़]/, "mark with no base consonant"],
]

const DEVANAGARI = /[ऀ-ॿ]/

// --- Loading ---------------------------------------------------------------

/** Merge every batch file, erroring on a key defined twice. */
function loadBatches(): { hindi: Map<string, string>; files: number } {
  if (!fs.existsSync(BATCH_DIR)) return { hindi: new Map(), files: 0 }
  const hindi = new Map<string, string>()
  const origin = new Map<string, string>()
  const names = fs.readdirSync(BATCH_DIR).filter((f) => f.endsWith(".json")).sort()

  for (const name of names) {
    const batch = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, name), "utf-8")) as Record<
      string,
      string
    >
    for (const [key, text] of Object.entries(batch)) {
      const seen = origin.get(key)
      if (seen) {
        throw new Error(`${key} is defined in both ${seen} and ${name} — remove one.`)
      }
      origin.set(key, name)
      hindi.set(key, text)
    }
  }
  return { hindi, files: names.length }
}

/** Every translatable hadith, in collection order then hadith number. */
function loadCorpus(): CorpusHadith[] {
  const out: CorpusHadith[] = []
  for (const collection of COLLECTIONS) {
    const dir = path.join(HADITH_DIR, collection, "books")
    if (!fs.existsSync(dir)) continue
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("book-") && f.endsWith(".json"))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))

    for (const file of files) {
      const hadiths = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")) as {
        number: number
        bookId?: number
        urdu?: string
        english?: string
      }[]
      for (const h of hadiths) {
        const urdu = h.urdu?.trim()
        const english = h.english?.trim()
        const source = urdu ? "ur" : english ? "en" : null
        // The 203 with neither stay Arabic-only. A corpus gap, not a pipeline
        // gap, and inventing text for them is exactly what this does not do.
        if (!source) continue
        const bookId = h.bookId ?? Number(file.match(/\d+/)![0])
        out.push({
          key: `${collection}-${bookId}-${h.number}`,
          collection,
          bookId,
          number: h.number,
          source,
          text: (source === "ur" ? urdu : english)!,
        })
      }
    }
  }
  out.sort((a, b) => COLLECTIONS.indexOf(a.collection) - COLLECTIONS.indexOf(b.collection) || a.number - b.number)
  return out
}

/** Hadiths cited by knowledge-base articles, as "<collection>:<number>". */
function citedByKnowledgeBase(): Set<string> {
  const refs = new Set<string>()
  if (!fs.existsSync(KNOWLEDGE_DIR)) return refs
  for (const name of fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".json"))) {
    const article = JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, name), "utf-8")) as {
      body?: Record<string, { kind?: string; collection?: string; hadith?: number }[]>
    }
    for (const lang of ["en", "hi", "ur"]) {
      for (const block of article.body?.[lang] ?? []) {
        if (block.kind === "hadith" && block.collection && block.hadith) {
          refs.add(`${block.collection}:${block.hadith}`)
        }
      }
    }
  }
  return refs
}

// --- Main ------------------------------------------------------------------

function main() {
  const { hindi, files } = loadBatches()
  const corpus = loadCorpus()
  const byKey = new Map(corpus.map((h) => [h.key, h]))

  // --next prints source text for the next untranslated hadiths. This is the
  // input side of each batch, so the loop is mechanical rather than guesswork.
  if (NEXT > 0) {
    const pending = corpus
      .filter((h) => !hindi.has(h.key))
      .filter((h) => !ONLY_COLLECTION || h.collection === ONLY_COLLECTION)
      .filter((h) => !ONLY_SOURCE || h.source === ONLY_SOURCE)
      .slice(0, NEXT)
    for (const h of pending) {
      console.log(`### ${h.key} [${h.source}]`)
      console.log(h.text)
      console.log("")
    }
    console.error(
      `${pending.length} shown, ${pending.reduce((n, h) => n + h.text.length, 0).toLocaleString()} source chars`,
    )
    return
  }

  console.log(`=== Hadith Hindi ${WRITE ? "(WRITING)" : "(dry run — pass --write)"} ===\n`)
  console.log(`  ${files} batch file(s), ${hindi.size} translation(s)`)

  // Keys must name a hadith that exists, or the translation goes nowhere.
  const orphans = [...hindi.keys()].filter((k) => !byKey.has(k)).sort()
  if (orphans.length) {
    throw new Error(
      `${orphans.length} translation(s) do not match any hadith: ${orphans.slice(0, 10).join(", ")}` +
        `${orphans.length > 10 ? ` (+${orphans.length - 10} more)` : ""}`,
    )
  }

  const problems: string[] = []
  for (const [key, text] of hindi) {
    if (!text.trim()) problems.push(`${key}: empty`)
    else if (!DEVANAGARI.test(text)) problems.push(`${key}: no Devanagari`)
    for (const [re, why] of MALFORMED) {
      const m = re.exec(text)
      if (m) {
        problems.push(`${key}: ${why} near "${text.slice(Math.max(0, m.index - 20), m.index + 20)}"`)
      }
    }
  }
  if (problems.length) {
    throw new Error(`Malformed translation(s):\n  ${problems.slice(0, 20).join("\n  ")}`)
  }
  console.log(`  all ${hindi.size} pass the Devanagari check`)

  // Coverage, overall and for the subset that is visible in articles today.
  const cited = citedByKnowledgeBase()
  const citedDone = [...cited].filter((ref) => {
    const [collection, number] = ref.split(":")
    return [...hindi.keys()].some((k) => k.startsWith(`${collection}-`) && k.endsWith(`-${number}`))
  }).length
  const pct = ((100 * hindi.size) / corpus.length).toFixed(2)
  console.log(`  corpus coverage:   ${hindi.size}/${corpus.length} (${pct}%)`)
  console.log(`  cited by articles: ${citedDone}/${cited.size}`)

  const perCollection = new Map<string, number>()
  for (const key of hindi.keys()) {
    const collection = byKey.get(key)!.collection
    perCollection.set(collection, (perCollection.get(collection) ?? 0) + 1)
  }
  const totals = new Map<string, number>()
  for (const h of corpus) totals.set(h.collection, (totals.get(h.collection) ?? 0) + 1)
  console.log("")
  for (const collection of COLLECTIONS) {
    if (!totals.has(collection)) continue
    const done = perCollection.get(collection) ?? 0
    console.log(`  ${collection.padEnd(10)} ${String(done).padStart(6)} / ${totals.get(collection)}`)
  }

  // Group by sidecar so each file is read and written once.
  const byBook = new Map<string, Map<string, { text: string; source: "ur" | "en" }>>()
  for (const [key, text] of hindi) {
    const h = byKey.get(key)!
    const file = `${h.collection}/${h.bookId}`
    if (!byBook.has(file)) byBook.set(file, new Map())
    byBook.get(file)!.set(String(h.number), { text, source: h.source })
  }

  for (const [bookKey, hadiths] of byBook) {
    const [collection, bookId] = bookKey.split("/")
    const dir = path.join(HADITH_DIR, collection, "hindi")
    const file = path.join(dir, `book-${bookId}.json`)
    const sidecar: Record<string, SidecarEntry> = fs.existsSync(file)
      ? (JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, SidecarEntry>)
      : {}

    for (const [number, { text, source }] of hadiths) {
      const existing = sidecar[number]
      sidecar[number] = {
        explanation: existing?.explanation ?? "",
        hints: existing?.hints ?? [],
        attribution: existing?.attribution ?? "",
        grade: existing?.grade ?? "",
        sourceId: existing?.sourceId ?? "",
        text,
        textSource: source,
      }
    }
    if (WRITE) {
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(file, JSON.stringify(sidecar, null, 2))
    }
  }

  console.log(
    `\n  ${hindi.size} hadith(s) across ${byBook.size} sidecar file(s).` +
      (WRITE ? " Written.\n" : " Nothing written — re-run with --write.\n"),
  )
}

main()
