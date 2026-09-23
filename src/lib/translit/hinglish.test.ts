import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { toHinglish } from "./hinglish"

// --- golden cases ----------------------------------------------------------
// One case per rule, so a regression names the rule it broke rather than just
// failing somewhere in a corpus.

test("deletes the word-final inherent schwa, but not on monosyllables", () => {
  assert.equal(toHinglish("नमाज़"), "namaaz")
  assert.equal(toHinglish("का"), "ka")
  assert.equal(toHinglish("जो"), "jo")
  assert.equal(toHinglish("व"), "va")
})

test("deletes medial schwas right to left, never the first syllable", () => {
  assert.equal(toHinglish("रहमान"), "rahmaan")
  assert.equal(toHinglish("करने"), "karne")
  assert.equal(toHinglish("उसके"), "uske")
})

test("keeps a cluster-final schwa before a semivowel, drops it otherwise", () => {
  assert.equal(toHinglish("वाक्य"), "vaakya")
  assert.equal(toHinglish("सब्र"), "sabr")
})

test("long a is aa in a closed syllable, a in an open one", () => {
  assert.equal(toHinglish("नाम"), "naam")
  assert.equal(toHinglish("जज़ा"), "jaza")
  assert.equal(toHinglish("खिलाने"), "khilane")
})

test("word-initial long a survives, monosyllables excepted", () => {
  assert.equal(toHinglish("पानी"), "paani")
  assert.equal(toHinglish("आमादा"), "aamada")
  assert.equal(toHinglish("मालिक"), "maalik")
  assert.equal(toHinglish("का"), "ka")
})

test("both vowel lengths collapse to i and u", () => {
  assert.equal(toHinglish("रोज़े"), "roze")
  assert.equal(toHinglish("दुआ"), "dua")
  assert.equal(toHinglish("मीठा"), "mitha")
})

test("nuqta forms map to q kh gh z r rh f, composed or decomposed", () => {
  assert.equal(toHinglish("क़"), "qa")
  assert.equal(toHinglish("क़"), "qa") // base + U+093C
  assert.equal(toHinglish("ज़"), "za")
  assert.equal(toHinglish("ग़"), "gha")
  assert.equal(toHinglish("बड़ा"), "bara")
})

test("anusvara is n before dentals and m before labials", () => {
  assert.equal(toHinglish("संदेश"), "sandesh")
  assert.equal(toHinglish("अंबर"), "ambar")
  assert.equal(toHinglish("लोगों"), "logon")
})

test("collapses vowel runs created at unit boundaries", () => {
  // Without the collapse this is *qiraaat*: र carries an undeleted schwa and आ
  // brings its own long a.
  assert.equal(toHinglish("क़िरआत"), "qiraat")
})

test("overrides win, and near-identical words stay distinct", () => {
  assert.equal(toHinglish("में"), "mein")
  assert.equal(toHinglish("मैं"), "main")
  assert.equal(toHinglish("नहीं"), "nahi")
  assert.equal(toHinglish("अल्लाह"), "Allah")
  // The bare-spelling variants our sources actually use.
  assert.equal(toHinglish("काफिर"), "kafir")
  assert.equal(toHinglish("काफ़िर"), "kafir")
})

test("danda becomes a full stop without swallowing the word before it", () => {
  assert.equal(toHinglish("है।"), "hai.")
  assert.equal(toHinglish("है॥"), "hai.")
})

test("Devanagari digits become ASCII", () => {
  assert.equal(toHinglish("२०२६"), "2026")
})

test("leaves non-Devanagari alone and handles empty input", () => {
  assert.equal(toHinglish(""), "")
  assert.equal(toHinglish("Surah Al-Baqarah 2:255"), "Surah Al-Baqarah 2:255")
  assert.equal(toHinglish("بِسْمِ اللَّهِ"), "بِسْمِ اللَّهِ")
  assert.equal(toHinglish("Ayah २ — नाम"), "Ayah 2 — naam")
})

test("transliterates a full ayah", () => {
  assert.equal(
    toHinglish("अल्लाह के नाम से जो रहमान व रहीम है।"),
    "Allah ke naam se jo rahmaan va raheem hai.",
  )
})

test("recovers from malformed Devanagari found in the real corpus", () => {
  // Every case below is a verbatim word from public/data/quran/quran-all.json.
  assert.equal(toHinglish("अौर"), "aur") // अ + ौ instead of और
  assert.equal(toHinglish("हडड्ी"), "haddi") // matra after a virama
  assert.equal(toHinglish("गिरफ््तार"), "giraphtaar") // doubled virama; nuqta-less फ is ph by rule
  assert.equal(toHinglish("ुम"), "um") // word-initial matra
  assert.equal(toHinglish("़ज़बाह"), "zabaah") // word-initial nuqta
})

// --- corpus invariant ------------------------------------------------------
// The single test that matters most: no Devanagari code point may survive
// transliteration. Any matra, sign or rare letter missing from the tables shows
// up here instead of shipping as mojibake in the middle of an ayah.

const DEVANAGARI_LEFT = /[ऀ-ॿ]/

function assertNoDevanagariLeft(label: string, samples: Iterable<string>) {
  const offenders = new Map<string, string>()
  for (const source of samples) {
    const out = toHinglish(source)
    for (const ch of out) {
      if (DEVANAGARI_LEFT.test(ch) && !offenders.has(ch)) {
        offenders.set(ch, `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`)
      }
    }
  }
  assert.equal(
    offenders.size,
    0,
    `${label}: untransliterated Devanagari survived — ${[...offenders.values()].join(", ")}`,
  )
}

test("no Devanagari survives the whole Quran Hindi translation", () => {
  const file = path.join(process.cwd(), "public", "data", "quran", "quran-all.json")
  // Build-time data; a fresh clone that has not run fetch:quran has no corpus to
  // check, and skipping beats failing on a missing input.
  if (!fs.existsSync(file)) return
  const ayahs = JSON.parse(fs.readFileSync(file, "utf-8")) as {
    translations?: { hi?: string }
  }[]
  assert.ok(ayahs.length > 6000, `expected the full corpus, got ${ayahs.length} ayahs`)
  assertNoDevanagariLeft(
    "Quran",
    ayahs.map((a) => a.translations?.hi ?? ""),
  )
})

test("no Devanagari survives the knowledge base", () => {
  const dir = path.join(process.cwd(), "src", "data", "knowledge", "articles")
  if (!fs.existsSync(dir)) return
  const strings: string[] = []
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    // Every authored Hindi string in the file, whatever block shape holds it.
    const raw = fs.readFileSync(path.join(dir, name), "utf-8")
    for (const match of raw.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      if (DEVANAGARI_LEFT.test(match[1])) strings.push(match[1])
    }
  }
  assert.ok(strings.length > 100, `expected authored Hindi text, found ${strings.length} strings`)
  assertNoDevanagariLeft("knowledge base", strings)
})
