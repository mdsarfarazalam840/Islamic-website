import fs from "node:fs"
import path from "node:path"

/**
 * Repair malformed Devanagari across every Hindi surface, deterministically.
 *
 * This is the job the "proofread" sections of scripts/ai-hindi-pass.ts were
 * going to do, done without a model — because for this particular task a model
 * is the wrong tool. The defects measured by scripts/scan-devanagari.ts are not
 * judgement calls; they are a handful of mechanical encoding faults repeated
 * across the corpus:
 *
 *   ॉ  (U+0949) written where ाँ belongs      हालॉकि -> हालाँकि   (359 hits)
 *   ॅ  (U+0945) written where ँ  belongs      हॅसी   -> हँसी      (46 hits)
 *   ़्  virama before nuqta, not after        कुफ़्र  -> कुफ़्र     (23 hits)
 *   ाे ीे ाा  stacked/duplicated matras       काे    -> को        (28 hits)
 *   अा अौ आे  matra attached to a full vowel  अौर    -> और        (14 hits)
 *   ़x      word-initial orphan nuqta          ़ज़िना  -> ज़िना
 *   Â       latin-1 mis-decode of ख़/ख        Âुदा   -> ख़ुदा
 *
 * Rules beat an LLM here on every axis that matters: the output is identical
 * every run, the whole change is reviewable as a diff, it cannot reword
 * scripture, it needs no API, and it costs nothing. The only cases a rule
 * cannot settle are listed explicitly in WORD_FIXES / PHRASE_FIXES / KEEP, so
 * every judgement call is visible in one place instead of buried in a prompt.
 *
 * What this does NOT do: translate. The hadith corpus has no Hindi to repair,
 * and producing it genuinely needs a model.
 *
 * Run: npx tsx scripts/fix-devanagari.ts            # dry run, reports only
 *      npx tsx scripts/fix-devanagari.ts --write    # apply
 * Then: npx tsx scripts/scan-devanagari.ts          # confirm nothing is left
 */

const QURAN_DIR = path.resolve("public/data/quran")
const TAFSIR_DIR = path.resolve("public/data/tafsir/hindi-mokhtasar")
const KNOWLEDGE_DIR = path.resolve("src/data/knowledge/articles")

const WRITE = process.argv.includes("--write")
/**
 * Print the first N before/after pairs. Scripture should not be rewritten on
 * the strength of a summary table alone — this is how you read what actually
 * changes before passing --write.
 */
const PREVIEW = Number(process.argv.find((a) => a.startsWith("--preview"))?.split("=")[1] ?? "0")
const previews: { where: string; before: string; after: string }[] = []

/** Record a changed string for --preview, trimmed to the neighbourhood of the first difference. */
function notePreview(where: string, before: string, after: string) {
  if (previews.length >= PREVIEW) return
  let i = 0
  while (i < before.length && before[i] === after[i]) i++
  const a = Math.max(0, i - 40)
  previews.push({
    where,
    before: (a ? "…" : "") + before.slice(a, i + 40) + "…",
    after: (a ? "…" : "") + after.slice(a, i + 40) + "…",
  })
}

// --- Tokens left alone -----------------------------------------------------

/**
 * Words where ॉ is correct — it is the regular vowel for English loanwords, so
 * the ॉ -> ाँ rule must not touch them.
 *
 * `रिकॉर्ड`, `कॉपी` and `हॉल` are the three that actually occur in this corpus;
 * the rest are listed so the rule stays safe as the knowledge base grows. `हॉल`
 * was caught by --preview turning into `हाँल` — which is why you read the
 * preview before passing --write.
 */
const KEEP = new Set([
  "रिकॉर्ड",
  "रिकॉर्डिंग",
  "कॉपी",
  "हॉल",
  "डॉक्टर",
  "डॉलर",
  "कॉलेज",
  "कॉल",
  "कॉफ़ी",
  "ऑफ़िस",
  "ऑनलाइन",
  "रिपोर्ट",
  "मॉडल",
  "फ़ॉर्म",
  "बॉल",
  "स्कॉलर",
])

// --- Cases a rule cannot settle --------------------------------------------

/**
 * Exact-token replacements, applied before the character rules.
 *
 * These are the irregulars: the intended vowel is not the systematic one
 * (`जहॉन` is जहान, with ा, not जहाँन), the fault reorders characters around a
 * consonant (`बेिहश्त` -> बहिश्त), or the source is mojibake whose target
 * varies (`Âाओ` -> खाओ but `Âुदा` -> ख़ुदा — one with nuqta, one without).
 *
 * Every entry was checked against the ayah it occurs in. Three candidates were
 * REJECTED on that evidence; they are recorded here so nobody re-adds them:
 *
 *   वक्त -> वक़्त   278 hits, and wrong. The nuqta is optional on waqt, and
 *                  `(वक्ते ़ज़िबाह)` is izafat — correct as written. The real
 *                  defect in that phrase is the leading nuqta on ़ज़िबाह.
 *                  Changing it would be a spelling preference, which is exactly
 *                  what a proofread pass must not do.
 *   जहन्न -> जहन्नम The token is a fragment of `जहन्न ुम` — a space landing
 *                  inside जहन्नुम. Appending म would have corrupted it. Handled
 *                  in PHRASE_FIXES instead.
 *   हव्ी -> वह्य   Q37:53 reads "मिट्टी और हव्ी (होकर)", and the Arabic is
 *                  عظام, bones. It is हड्डी — the same word that `हडड्ी` is
 *                  corrupted from elsewhere in the corpus.
 */
const WORD_FIXES: Record<string, string> = {
  // ॉ standing in for ा, not ाँ — Persian/Arabic loans.
  जहॉन: "जहान",
  जहॉनों: "जहानों",

  // Mojibake. Â is a latin-1 mis-decode of ख़ in some words and plain ख in others.
  Âैरात: "ख़ैरात",
  Âुदा: "ख़ुदा",
  Âाओ: "खाओ",

  // Matra written before the consonant it belongs after.
  बेिहश्त: "बहिश्त",
  "(ख्ािंच)": "(खींच)",

  // Both of these are हड्डी ("bones", Q37:53 / عظام), corrupted two different ways.
  हव्ी: "हड्डी",
  हडड्ी: "हड्डी",

  // Independent vowel carrying a matra, where the target is not the systematic one.
  एैन: "ऐन",
  औॅर: "और",
  आेर: "और",

  // Nuqta on the wrong base, rather than merely on the wrong side of a virama.
  खू़ब: "ख़ूब",
  ची़ज़ों: "चीज़ों",
  "उम्मुल-कु़रा": "उम्मुल-क़ुरा",

  // Stray matra left outside the bracket it belongs inside.
  "को)े": "को)",
  "का)े": "का)",
  "मज़े)े": "मज़े)",

  // One-off typos, each read in context before being listed. These are the
  // long tail left after the systematic rules run — 24 across 14,465 strings.
  एैका: "ऐका", // Q15:78, अस्हाबे ऐका
  ओेर: "और",
  औैर: "और",
  बनाएा: "बनाए", // Q43:45 "और माबूद बनाए थे"
  हेै: "है", // Q26:81
  साीधा: "सीधा",
  परवरगिार: "परवरदिगार", // Q38:41
  महिाओं: "महिलाओं", // tafsir 11:79
  अुनसार: "अनुसार", // tafsir 22:67
  आख़िारत: "आख़िरत",
  अैलहिस्सलाम: "अलैहिस्सलाम",
  अलैैहिस्सलाम: "अलैहिस्सलाम",

  // Orphan anusvara stranded at the start of the string.
  "ं(नेको": "(नेको", // Q41:4

  // Transposed characters — a rule cannot know which order was intended.
  प्रकृित: "प्रकृति", // tafsir 21:37
  रूसलूों: "रसूलों", // tafsir 4:136
}

/**
 * Multi-token repairs: a space landing inside a word, or a mark stranded at the
 * start of the next one.
 *
 * Three occurrences in the whole corpus, so they are listed exactly rather than
 * risked on a regex — and they do not share a shape. The two `ंसे` cases need
 * the anusvara moved onto the previous word with the space KEPT
 * (`उनमे ंसे` -> `उनमें से`), while `जहन्न ुम` needs the space REMOVED. One
 * rule covering both would corrupt one of them.
 */
const PHRASE_FIXES: [RegExp, string, string][] = [
  [/उनमे ंसे/g, "उनमें से", "misplaced space (उनमे ंसे -> उनमें से)"],
  [/वालो ंसे/g, "वालों से", "misplaced space (वालो ंसे -> वालों से)"],
  [/जहन्न ुम/g, "जहन्नुम", "space inside जहन्नुम"],
]

// --- Systematic character rules --------------------------------------------

/**
 * Applied in order; the order is load-bearing.
 *
 * The ॅ rules run most-specific-first: `सकॅू` is सकूँ, so the ॅ+ū pair has to be
 * rewritten as ū+candrabindu before the bare `ॅ -> ँ` rule reaches it and leaves
 * the marks in the wrong order. `औॅ -> औ` precedes it for the same reason.
 */
const CHAR_RULES: { from: RegExp; to: string; why: string }[] = [
  { from: /ॅू/g, to: "ूँ", why: "ॅ+ū -> ū+candrabindu (सकॅू -> सकूँ)" },
  { from: /ॅु/g, to: "ुँ", why: "ॅ+u -> u+candrabindu" },
  { from: /औॅ/g, to: "औ", why: "औ cannot take ॅ" },
  { from: /ॅ/g, to: "ँ", why: "ॅ -> candrabindu (हॅसी -> हँसी)" },
  { from: /ॉ/g, to: "ाँ", why: "ॉ -> ā+candrabindu (हालॉकि -> हालाँकि)" },
  // Written with explicit codepoints because the two orderings are visually
  // identical in a source file: U+094D VIRAMA then U+093C NUQTA is the broken
  // form, NUQTA then VIRAMA is correct. Getting this backwards silently
  // rewrites 176 correct spellings with themselves and reports it as work done.
  { from: /़्/g, to: "़्", why: "virama before nuqta -> nuqta before virama (कुफ़्र -> कुफ़्र)" },
  { from: /अा/g, to: "आ", why: "अ+ā -> आ" },
  { from: /अौ/g, to: "औ", why: "अ+au -> औ (अौर -> और)" },
  { from: /आे/g, to: "औ", why: "आ+e -> औ (आेर -> और)" },
  { from: /ाे/g, to: "ो", why: "ā+e -> o (काे -> को)" },
  { from: /ाै/g, to: "ौ", why: "ā+ai -> au" },
  { from: /ीे/g, to: "ी", why: "ī+e -> ī (कहीें -> कहीं)" },
  { from: /ैे/g, to: "ै", why: "ai+e -> ai (हैें -> हैं)" },
  { from: /िा/g, to: "ि", why: "i+ā -> i (आख़िारत -> आख़िरत)" },
  // ā followed by any other matra is a leftover from the first spelling; the
  // second matra is the intended one. Must run AFTER ाे -> ो and ाै -> ौ, which
  // are genuine combinations rather than leftovers.
  { from: /ा(?=[िीुूृेैोौ])/g, to: "", why: "ā before another matra (लोगाों -> लोगों)" },
  // Any matra doubled on one consonant — ाा ीी ेे ृृ and the rest.
  { from: /([ािीुूृेैोौ])\1+/g, to: "$1", why: "doubled matra (उसकेे -> उसके)" },
  // A matra stranded after a closing bracket has no consonant to attach to.
  { from: /\)[ािीुूृेैोौंँः]+/g, to: ")", why: "matra after a bracket (मज़े)े -> मज़े))" },
  { from: /ाा/g, to: "ा", why: "doubled ā (कुत्ताा -> कुत्ता)" },
  { from: /ीी/g, to: "ी", why: "doubled ī" },
  { from: /़़+/g, to: "़", why: "doubled nuqta (आख़़िरत -> आख़िरत)" },
  { from: /््+/g, to: "्", why: "doubled virama (गिरफ््तार -> गिरफ़्तार)" },
]

/**
 * A nuqta with no consonant to sit on, at the start of a token. Covers ़ज़िना,
 * ़ज़िबाह), ़ज़बाह), ़ज़िबहा), ़क़रीब — in every case the following letter already
 * carries its own nuqta, so the leading one is pure noise.
 */
const LEADING_NUKTA = /^़+/

// --- Application -----------------------------------------------------------

const stats = {
  wordFixes: new Map<string, number>(),
  phraseFixes: new Map<string, number>(),
  charRules: new Map<string, number>(),
  stringsChanged: 0,
  filesChanged: 0,
}

/** Repair one string. Returns it unchanged when there is nothing to do. */
export function fixDevanagari(input: string): string {
  if (!input) return input
  let text = input

  for (const [re, to, why] of PHRASE_FIXES) {
    re.lastIndex = 0
    const hits = text.match(re)?.length ?? 0
    if (!hits) continue
    text = text.replace(re, to)
    stats.phraseFixes.set(why, (stats.phraseFixes.get(why) ?? 0) + hits)
  }

  // Token pass. Split on whitespace and keep the separators, so joining back is
  // lossless. Exact-token fixes run before the character rules because several
  // of them would be mangled if the character rules got there first.
  text = text
    .split(/(\s+)/)
    .map((token) => {
      if (!token.trim()) return token

      const exact = WORD_FIXES[token]
      if (exact !== undefined) {
        stats.wordFixes.set(token, (stats.wordFixes.get(token) ?? 0) + 1)
        return exact
      }

      // Punctuation is stripped only to test membership; the token itself is
      // returned untouched so brackets and danda survive.
      if (KEEP.has(token.replace(/[(),।."'’“”]/g, ""))) return token

      let out = token
      if (LEADING_NUKTA.test(out)) {
        out = out.replace(LEADING_NUKTA, "")
        stats.charRules.set(
          "word-initial orphan nuqta (़ज़िना -> ज़िना)",
          (stats.charRules.get("word-initial orphan nuqta (़ज़िना -> ज़िना)") ?? 0) + 1,
        )
      }
      for (const rule of CHAR_RULES) {
        rule.from.lastIndex = 0
        const hits = out.match(rule.from)?.length ?? 0
        if (!hits) continue
        out = out.replace(rule.from, rule.to)
        stats.charRules.set(rule.why, (stats.charRules.get(rule.why) ?? 0) + hits)
      }
      return out
    })
    .join("")

  if (text !== input) stats.stringsChanged++
  return text
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

function write(file: string, contents: string) {
  stats.filesChanged++
  if (WRITE) fs.writeFileSync(file, contents)
}

function fixQuran() {
  const allFile = path.join(QURAN_DIR, "quran-all.json")
  if (!fs.existsSync(allFile)) {
    console.warn("  ⚠ quran-all.json not found, skipping Quran")
    return
  }
  const ayahs = JSON.parse(fs.readFileSync(allFile, "utf-8")) as {
    surahNumber: number
    translations?: { hi?: string }
  }[]

  const touched = new Set<number>()
  for (const a of ayahs) {
    const hi = a.translations?.hi
    if (!hi) continue
    const fixed = fixDevanagari(hi)
    if (fixed !== hi) {
      notePreview(`quran ${a.surahNumber}:${(a as { ayahNumber?: number }).ayahNumber}`, hi, fixed)
      a.translations!.hi = fixed
      touched.add(a.surahNumber)
    }
  }
  if (touched.size === 0) {
    console.log("  quran:     nothing to repair")
    return
  }

  // Same formatting scripts/fetch-quran-data.ts writes, so a later re-fetch
  // produces no spurious diff: quran-all.json compact, per-surah pretty-printed.
  write(allFile, JSON.stringify(ayahs))
  for (const n of touched) {
    const file = path.join(QURAN_DIR, `surah-${n}.json`)
    if (!fs.existsSync(file)) continue
    write(file, JSON.stringify(ayahs.filter((a) => a.surahNumber === n), null, 2))
  }
  console.log(`  quran:     quran-all.json + ${touched.size} surah file(s)`)
}

function fixTafsir() {
  if (!fs.existsSync(TAFSIR_DIR)) {
    console.warn("  ⚠ tafsir snapshot not found (run npm run fetch:tafsir-hindi), skipping")
    return
  }
  let files = 0
  for (const name of fs.readdirSync(TAFSIR_DIR).filter((f) => f.endsWith(".json"))) {
    const file = path.join(TAFSIR_DIR, name)
    const map = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, string>
    let changed = false
    for (const [ayah, text] of Object.entries(map)) {
      const fixed = fixDevanagari(text)
      if (fixed !== text) {
        notePreview(`tafsir ${name.replace(/\D/g, "")}:${ayah}`, text, fixed)
        map[ayah] = fixed
        changed = true
      }
    }
    if (!changed) continue
    files++
    write(file, JSON.stringify(map, null, 2))
  }
  console.log(`  tafsir:    ${files} surah file(s)`)
}

function fixKnowledge() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.warn("  ⚠ knowledge articles not found, skipping")
    return
  }
  let files = 0
  for (const name of fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".json"))) {
    const file = path.join(KNOWLEDGE_DIR, name)
    const raw = fs.readFileSync(file, "utf-8")
    const article = JSON.parse(raw) as {
      title?: Record<string, string>
      summary?: Record<string, string>
      body?: Record<string, Block[]>
    }

    // Collect the edits, then splice them into the ORIGINAL text rather than
    // re-serialising. These files are hand-authored with block objects on one
    // line; JSON.stringify would reflow all of them and bury a one-word repair
    // under ~200 lines of formatting churn. Patching the raw string keeps the
    // diff to exactly what changed.
    const edits: [string, string][] = []
    const fixField = (obj: Record<string, unknown> | undefined, key: string) => {
      if (!obj || typeof obj[key] !== "string") return
      const before = obj[key] as string
      const after = fixDevanagari(before)
      if (after === before) return
      notePreview(`knowledge ${name}`, before, after)
      edits.push([before, after])
    }

    fixField(article.title, "hi")
    fixField(article.summary, "hi")
    for (const block of article.body?.hi ?? []) {
      for (const key of ["text", "note", "label", "translation", "transliteration"]) {
        fixField(block as unknown as Record<string, unknown>, key)
      }
      for (const item of block.items ?? []) fixField(item as Record<string, unknown>, "text")
    }

    if (edits.length === 0) continue

    let out = raw
    for (const [before, after] of edits) {
      // Match the JSON-escaped form, since that is what is on disk.
      const needle = JSON.stringify(before).slice(1, -1)
      const replacement = JSON.stringify(after).slice(1, -1)
      out = out.split(needle).join(replacement)
    }
    if (out === raw) continue
    files++
    write(file, out)
  }
  console.log(`  knowledge: ${files} article(s)`)
}

function main() {
  console.log(
    `=== Devanagari repair ${WRITE ? "(WRITING)" : "(dry run — pass --write to apply)"} ===\n`,
  )

  fixQuran()
  fixTafsir()
  fixKnowledge()

  const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0)

  console.log(`\n--- character rules (${total(stats.charRules)} replacement(s)) ---`)
  for (const [why, n] of [...stats.charRules.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}x  ${why}`)
  }

  console.log(`\n--- word fixes (${total(stats.wordFixes)}) ---`)
  for (const [word, n] of [...stats.wordFixes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}x  ${word} -> ${WORD_FIXES[word]}`)
  }

  console.log(`\n--- phrase fixes (${total(stats.phraseFixes)}) ---`)
  for (const [why, n] of [...stats.phraseFixes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}x  ${why}`)
  }

  if (previews.length) {
    console.log(`\n--- first ${previews.length} change(s) ---`)
    for (const p of previews) {
      console.log(`  ${p.where}`)
      console.log(`    -  ${p.before}`)
      console.log(`    +  ${p.after}`)
    }
  }

  console.log(
    `\n${stats.stringsChanged} string(s) changed across ${stats.filesChanged} file(s).` +
      (WRITE ? " Written.\n" : " Nothing written — re-run with --write.\n"),
  )
  console.log("Verify with: npx tsx scripts/scan-devanagari.ts\n")
}

main()
