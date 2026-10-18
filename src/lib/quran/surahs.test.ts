import assert from "node:assert/strict"
import test from "node:test"

import { getAllSurahs, surahMatches, searchSurahs } from "./surahs"

const all = getAllSurahs()
const numbersFor = (query: string) => all.filter((s) => surahMatches(s, query)).map((s) => s.number)

test("every surah carries a Hindi name and meaning", () => {
  assert.equal(all.length, 114)
  const missing = all.filter((s) => !s.nameHi?.trim() || !s.nameTranslatedHi?.trim())
  assert.deepEqual(
    missing.map((s) => s.number),
    [],
  )
})

test("authored Hindi is well-formed Devanagari", () => {
  // The same structural faults scripts/scan-devanagari.ts looks for. None of
  // these sequences can occur in correct Devanagari, so a hit is a typo in the
  // table in scripts/add-surah-hindi.ts.
  const malformed: RegExp[] = [
    /[अ-औ][ा-ौ]/, // independent vowel carrying a matra
    /्[ा-ौ]/, // matra after a virama
    /[ा-ौ]{2,}/, // stacked matras
    /[ॅॉ]/, // chandra vowels — ाँ / ँ were intended
    /्{2,}/, // doubled virama
    /^[ा-ौंःँ़]/, // word-initial mark with no base
  ]
  const bad: string[] = []
  for (const s of all) {
    for (const value of [s.nameHi, s.nameTranslatedHi]) {
      if (value && malformed.some((re) => re.test(value))) bad.push(`${s.number}: ${value}`)
    }
  }
  assert.deepEqual(bad, [])
})

test("surahMatches finds a surah by English name, number and Arabic", () => {
  assert.ok(numbersFor("Al-Kahf").includes(18))
  assert.ok(numbersFor("the cave").includes(18))
  assert.ok(numbersFor("18").includes(18))
  assert.ok(numbersFor("الكهف").includes(18))
})

test("surahMatches finds a surah by its Hindi name and meaning", () => {
  assert.ok(numbersFor("फ़ातिहा").includes(1))
  assert.ok(numbersFor("खोलने").includes(1))
  assert.ok(numbersFor("गाय").includes(2))
  assert.ok(numbersFor("चाँद").includes(54))
})

test("surahMatches finds a surah by Hinglish, which is derived not stored", () => {
  // This is the payoff of keeping Devanagari as the only stored form: a reader
  // on the Hinglish tab types Latin script and still lands on the right surah.
  assert.ok(numbersFor("faatiha").includes(1))
  assert.ok(numbersFor("kholne").includes(1))
  assert.ok(numbersFor("gaay").includes(2))
  assert.ok(numbersFor("ghaar").includes(18))
})

test("surahMatches is case-insensitive and ignores surrounding space", () => {
  assert.ok(numbersFor("  AL-KAHF  ").includes(18))
  assert.ok(numbersFor("FaAtIhA").includes(1))
})

test("an empty query matches everything", () => {
  assert.equal(numbersFor("").length, 114)
  assert.equal(numbersFor("   ").length, 114)
})

test("a query that matches nothing returns nothing", () => {
  assert.deepEqual(numbersFor("zzzzqqq"), [])
})

test("searchSurahs delegates to the same matcher", () => {
  assert.deepEqual(
    searchSurahs("faatiha").map((s) => s.number),
    numbersFor("faatiha"),
  )
})
