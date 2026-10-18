import fs from "node:fs"
import path from "node:path"

/**
 * Find malformed Devanagari across every Hindi surface, by structural rule.
 *
 * This is the measurement step behind scripts/fix-devanagari.ts. The defect
 * classes below are not stylistic judgements — each one is a sequence that
 * cannot occur in well-formed Devanagari, so every hit is a real error in the
 * source data rather than an unusual spelling.
 *
 * Run: npx tsx scripts/scan-devanagari.ts [--examples=N]
 */

const QURAN_ALL = path.resolve("public/data/quran/quran-all.json")
const TAFSIR_DIR = path.resolve("public/data/tafsir/hindi-mokhtasar")
const KNOWLEDGE_DIR = path.resolve("src/data/knowledge/articles")

const EXAMPLES = Number(process.argv.find((a) => a.startsWith("--examples="))?.split("=")[1] ?? "6")

// Devanagari character classes.
const INDEP_VOWEL = "अ-औ" // अ..औ
const MATRA = "ा-ौ" // ा..ौ
const VIRAMA = "्" // ्
const NUKTA = "़" // ़
const CONSONANT = "क-हक़-य़"
const SIGNS = "ँ-ः" // ँ ं ः
const DEV = "ऀ-ॿ"

/**
 * Each rule is a sequence that well-formed Devanagari cannot produce.
 *
 * `independent + matra` is the अौर class: अ is a standalone vowel, so a
 * dependent matra cannot attach to it. `virama + matra` is the हडड्ी class —
 * a virama kills the inherent vowel, so nothing can follow it but a consonant.
 * `stacked matras` is साीधा. `leading matra` is the ुम class, where the base
 * consonant was lost. And so on.
 *
 * Deliberately NOT a rule: a word-final virama. `अर्थात्`, `दयावान्`,
 * `महिमावान्`, `पश्चात्` are correct tatsama spellings and account for 183 hits
 * in this corpus — every one a false positive. Flagging them would bury the
 * real defects.
 */
const RULES: { id: string; re: RegExp; note: string }[] = [
  { id: "independent+matra", re: new RegExp(`[${INDEP_VOWEL}][${MATRA}]`, "g"), note: "अौर for और" },
  { id: "virama+matra", re: new RegExp(`${VIRAMA}[${MATRA}]`, "g"), note: "हडड्ी for हड्डी" },
  { id: "double-virama", re: new RegExp(`${VIRAMA}{2,}`, "g"), note: "गिरफ््तार" },
  { id: "stacked-matras", re: new RegExp(`[${MATRA}]{2,}`, "g"), note: "साीधा for सीधा" },
  { id: "leading-matra", re: new RegExp(`(?:^|[^${DEV}])[${MATRA}${SIGNS}${NUKTA}${VIRAMA}]`, "gm"), note: "ुम for तुम" },
  { id: "nukta-misplaced", re: new RegExp(`[${MATRA}${VIRAMA}${SIGNS}]${NUKTA}`, "g"), note: "virama before nuqta" },
  { id: "sign-before-matra", re: new RegExp(`[${SIGNS}][${MATRA}]`, "g"), note: "anusvara then matra" },
  { id: "chandra-vowel", re: /[ॅॉ]/g, note: "ॅ ॉ — हालॉकि for हालाँकि" },
  { id: "matra-after-space", re: new RegExp(`\\s[${MATRA}]`, "g"), note: "orphaned matra" },
  { id: "lone-nukta", re: new RegExp(`(?:^|[^${CONSONANT}])${NUKTA}`, "gm"), note: "nuqta with no base" },
  { id: "mojibake", re: /[ÂÃÅÎÔ�]/g, note: "Âैरात — latin-1 mis-decode" },
]

interface Hit {
  rule: string
  word: string
  where: string
}

/** The whitespace-delimited token containing offset `i`. */
function wordAt(text: string, i: number): string {
  let a = i
  let b = i
  while (a > 0 && !/\s/.test(text[a - 1])) a--
  while (b < text.length && !/\s/.test(text[b])) b++
  return text.slice(a, b)
}

function scan(text: string, where: string, hits: Hit[]) {
  if (!text) return
  for (const rule of RULES) {
    rule.re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = rule.re.exec(text)) !== null) {
      hits.push({ rule: rule.id, word: wordAt(text, m.index), where })
      if (m[0].length === 0) rule.re.lastIndex++
    }
  }
}

interface Block {
  kind?: string
  text?: string
  note?: string
  label?: string
  translation?: string
  transliteration?: string
  items?: { text?: string }[]
}

function main() {
  const hits: Hit[] = []
  let scanned = 0

  if (fs.existsSync(QURAN_ALL)) {
    const ayahs = JSON.parse(fs.readFileSync(QURAN_ALL, "utf-8")) as {
      number: number
      surahNumber: number
      ayahNumber: number
      translations?: { hi?: string }
    }[]
    for (const a of ayahs) {
      const hi = a.translations?.hi
      if (!hi) continue
      scanned++
      scan(hi, `quran ${a.surahNumber}:${a.ayahNumber}`, hits)
    }
  }

  if (fs.existsSync(TAFSIR_DIR)) {
    for (const file of fs.readdirSync(TAFSIR_DIR).filter((f) => f.endsWith(".json"))) {
      const surah = file.match(/\d+/)![0]
      const map = JSON.parse(fs.readFileSync(path.join(TAFSIR_DIR, file), "utf-8")) as Record<string, string>
      for (const [ayah, text] of Object.entries(map)) {
        scanned++
        scan(text, `tafsir ${surah}:${ayah}`, hits)
      }
    }
  }

  if (fs.existsSync(KNOWLEDGE_DIR)) {
    for (const file of fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".json"))) {
      const a = JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, file), "utf-8")) as {
        slug: string
        title?: Record<string, string>
        summary?: Record<string, string>
        body?: Record<string, Block[]>
      }
      const strings: string[] = []
      if (a.title?.hi) strings.push(a.title.hi)
      if (a.summary?.hi) strings.push(a.summary.hi)
      for (const b of a.body?.hi ?? []) {
        for (const v of [b.text, b.note, b.label, b.translation, b.transliteration]) if (v) strings.push(v)
        for (const it of b.items ?? []) if (it.text) strings.push(it.text)
      }
      for (const s of strings) {
        scanned++
        scan(s, `knowledge ${a.slug}`, hits)
      }
    }
  }

  console.log(`=== Devanagari scan === (${scanned} strings)\n`)

  const byRule = new Map<string, Hit[]>()
  for (const h of hits) {
    if (!byRule.has(h.rule)) byRule.set(h.rule, [])
    byRule.get(h.rule)!.push(h)
  }

  const order = RULES.map((r) => r.id).filter((id) => byRule.has(id))
  for (const id of order) {
    const list = byRule.get(id)!
    const note = RULES.find((r) => r.id === id)!.note
    const words = new Map<string, number>()
    for (const h of list) words.set(h.word, (words.get(h.word) ?? 0) + 1)
    const top = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, EXAMPLES)
    console.log(`${id}  —  ${list.length} hit(s), ${words.size} distinct word(s)   (${note})`)
    for (const [word, n] of top) console.log(`    ${String(n).padStart(4)}x  ${word}`)
    console.log(`    e.g. ${list[0].where}`)
    console.log("")
  }

  if (hits.length === 0) {
    console.log("No malformed sequences found.\n")
    return
  }
  console.log(`TOTAL ${hits.length} hit(s) across ${new Set(hits.map((h) => h.where)).size} string(s)\n`)

  // --list prints every distinct defective token with its count, which is the
  // input to the correction table in scripts/fix-devanagari.ts. Word-level
  // replacement rather than regex rewriting is deliberate: several of these
  // need a reading to repair (बेिहश्त -> बहिश्त reorders two matras around a
  // consonant), and a wrong regex on scripture is worse than a slow table.
  if (process.argv.includes("--list")) {
    const words = new Map<string, { n: number; rules: Set<string>; where: string }>()
    for (const h of hits) {
      const e = words.get(h.word) ?? { n: 0, rules: new Set<string>(), where: h.where }
      e.n++
      e.rules.add(h.rule)
      words.set(h.word, e)
    }
    console.log(`--- ${words.size} distinct defective token(s) ---`)
    for (const [word, e] of [...words.entries()].sort((a, b) => b[1].n - a[1].n)) {
      console.log(`${String(e.n).padStart(4)}x  ${word}\t[${[...e.rules].join(",")}]\t${e.where}`)
    }
    console.log("")
  }
}

main()
