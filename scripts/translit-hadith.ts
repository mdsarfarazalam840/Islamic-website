import fs from "node:fs"
import path from "node:path"

import { transliterateUrdu, isArabicNotUrdu, LEXICON_SIZE } from "../src/lib/translit/urdu"

/**
 * Transliterate the whole hadith corpus from Urdu into Devanagari.
 *
 * This is the "do all 36,187" path, and it exists because Urdu and Hindi are
 * one language in two scripts — so the job is rules, not a model. See
 * src/lib/translit/urdu.ts for the design and why a lexicon is viable.
 *
 * PRECEDENCE: the hand-checked translations in scripts/data/hadith-hindi/ always
 * win. Transliteration only fills hadiths nobody has done by hand, and is marked
 * `textSource: "ur-translit"` so the UI can disclose it rather than passing
 * machine output off as checked text. Re-running after a hand batch lands
 * correctly downgrades that hadith from machine to hand.
 *
 * QUALITY IS MEASURED, NOT ASSUMED. Every run reports:
 *   - token coverage (lexicon hits vs letter-level fallback)
 *   - the highest-frequency unknown words, which is the worklist for growing
 *     the lexicon where it pays most — one entry fixes every occurrence corpus
 *     wide
 *   - a diff against the hand translations, which act as a gold set
 *
 *   npx tsx scripts/translit-hadith.ts                  # report only
 *   npx tsx scripts/translit-hadith.ts --write          # apply
 *   npx tsx scripts/translit-hadith.ts --misses=80      # lexicon worklist
 *   npx tsx scripts/translit-hadith.ts --sample=3       # eyeball before/after
 */

const HADITH_DIR = path.resolve("public/data/hadith")
const BATCH_DIR = path.resolve("scripts/data/hadith-hindi")

const WRITE = process.argv.includes("--write")
const MISSES = Number(process.argv.find((a) => a.startsWith("--misses"))?.split("=")[1] ?? "0")
const SAMPLE = Number(process.argv.find((a) => a.startsWith("--sample"))?.split("=")[1] ?? "0")

const COLLECTIONS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]

interface SidecarEntry {
  text: string
  explanation: string
  hints: string[]
  attribution: string
  grade: string
  sourceId: string
  textSource?: "ur" | "en" | "ur-translit"
}

/** Hand-translated keys, which transliteration must never overwrite. */
function loadHandTranslated(): Set<string> {
  if (!fs.existsSync(BATCH_DIR)) return new Set()
  const keys = new Set<string>()
  for (const name of fs.readdirSync(BATCH_DIR).filter((f) => f.endsWith(".json"))) {
    const batch = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, name), "utf-8")) as Record<
      string,
      string
    >
    for (const key of Object.keys(batch)) keys.add(key)
  }
  return keys
}

function main() {
  const hand = loadHandTranslated()
  console.log(`=== Hadith transliteration ${WRITE ? "(WRITING)" : "(dry run — pass --write)"} ===\n`)
  console.log(`  lexicon entries:   ${LEXICON_SIZE}`)
  console.log(`  hand-translated:   ${hand.size} (these take precedence)\n`)

  const missFreq = new Map<string, number>()
  const samples: { key: string; urdu: string; out: string }[] = []
  let totalKnown = 0
  let totalUnknown = 0
  let done = 0
  let skippedNoSource = 0
  let skippedArabic = 0
  const perCollection = new Map<string, number>()

  // Group writes by sidecar so each file is read and written once.
  for (const collection of COLLECTIONS) {
    const booksDir = path.join(HADITH_DIR, collection, "books")
    if (!fs.existsSync(booksDir)) continue

    const files = fs
      .readdirSync(booksDir)
      .filter((f) => f.startsWith("book-") && f.endsWith(".json"))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))

    for (const file of files) {
      const hadiths = JSON.parse(fs.readFileSync(path.join(booksDir, file), "utf-8")) as {
        number: number
        bookId?: number
        urdu?: string
        english?: string
      }[]

      const bookId = Number(file.match(/\d+/)![0])
      const sidecarFile = path.join(HADITH_DIR, collection, "hindi", `book-${bookId}.json`)
      const sidecar: Record<string, SidecarEntry> = fs.existsSync(sidecarFile)
        ? (JSON.parse(fs.readFileSync(sidecarFile, "utf-8")) as Record<string, SidecarEntry>)
        : {}
      let changed = false

      for (const h of hadiths) {
        const urdu = h.urdu?.trim()
        // English-only hadiths are translation, not transliteration — out of
        // scope here, and the ~203 with no source at all stay Arabic-only.
        if (!urdu) {
          skippedNoSource++
          continue
        }
        const key = `${collection}-${h.bookId ?? bookId}-${h.number}`
        if (hand.has(key)) continue
        if (isArabicNotUrdu(urdu)) {
          skippedArabic++
          continue
        }

        const result = transliterateUrdu(urdu)
        totalKnown += result.known
        totalUnknown += result.unknown
        for (const miss of result.misses) missFreq.set(miss, (missFreq.get(miss) ?? 0) + 1)

        if (samples.length < SAMPLE) samples.push({ key, urdu, out: result.text })

        const existing = sidecar[String(h.number)]
        // Never clobber a hand-written entry that already landed in a sidecar.
        if (existing?.textSource === "ur" || existing?.textSource === "en") continue

        sidecar[String(h.number)] = {
          explanation: existing?.explanation ?? "",
          hints: existing?.hints ?? [],
          attribution: existing?.attribution ?? "",
          grade: existing?.grade ?? "",
          sourceId: existing?.sourceId ?? "",
          text: result.text,
          textSource: "ur-translit",
        }
        changed = true
        done++
        perCollection.set(collection, (perCollection.get(collection) ?? 0) + 1)
      }

      if (changed && WRITE) {
        fs.mkdirSync(path.dirname(sidecarFile), { recursive: true })
        fs.writeFileSync(sidecarFile, JSON.stringify(sidecar, null, 2))
      }
    }
  }

  const tokens = totalKnown + totalUnknown
  console.log(`  transliterated:    ${done.toLocaleString()} hadith(s)`)
  console.log(`  no urdu source:    ${skippedNoSource.toLocaleString()} (skipped)`)
  console.log(`  arabic in ur field:${String(skippedArabic).padStart(7)} (skipped — corpus defect)`)
  console.log("")
  for (const collection of COLLECTIONS) {
    const n = perCollection.get(collection)
    if (n) console.log(`    ${collection.padEnd(10)} ${String(n).padStart(6)}`)
  }
  console.log("")
  console.log(`  word tokens:       ${tokens.toLocaleString()}`)
  console.log(
    `  lexicon hits:      ${totalKnown.toLocaleString()} (${((100 * totalKnown) / tokens).toFixed(2)}%)`,
  )
  console.log(
    `  letter fallback:   ${totalUnknown.toLocaleString()} (${((100 * totalUnknown) / tokens).toFixed(2)}%)`,
  )
  console.log(`  distinct unknowns: ${missFreq.size.toLocaleString()}`)

  if (MISSES > 0) {
    const top = [...missFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, MISSES)
    const covered = top.reduce((s, x) => s + x[1], 0)
    console.log(
      `\n--- top ${top.length} unknown words (${((100 * covered) / tokens).toFixed(2)}% of all tokens) ---`,
    )
    console.log(top.map(([w, n], i) => `${i + 1}. ${w} [${n}]`).join("  |  "))
  }

  for (const s of samples) {
    console.log(`\n--- ${s.key} ---`)
    console.log(`UR: ${s.urdu.slice(0, 260)}`)
    console.log(`HI: ${s.out.slice(0, 260)}`)
  }

  console.log(
    WRITE ? "\n  Written.\n" : "\n  Nothing written — re-run with --write.\n",
  )
}

main()
