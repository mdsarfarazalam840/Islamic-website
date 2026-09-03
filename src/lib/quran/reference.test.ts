import assert from "node:assert/strict"
import test from "node:test"
import surahsData from "@/data/quran/surahs.json"
import type { Surah } from "@/types"
import { globalAyahNumber, parseQuranReference } from "./reference"

const surahs = surahsData as Surah[]
const parse = (q: string) => parseQuranReference(q, surahs)

test("reads surah:ayah in the shapes people type", () => {
  const expected = { kind: "ayah", surah: 2, ayah: 255 }
  for (const query of ["2:255", "2 255", "2.255", "2/255", "2-255", "surah 2 ayah 255", "quran 2:255"]) {
    assert.deepEqual(parse(query), expected, query)
  }
})

test("reads a surah by name, with or without an ayah", () => {
  assert.deepEqual(parse("al-baqarah 255"), { kind: "ayah", surah: 2, ayah: 255 })
  assert.deepEqual(parse("baqarah 255"), { kind: "ayah", surah: 2, ayah: 255 })
  assert.deepEqual(parse("baqara 255"), { kind: "ayah", surah: 2, ayah: 255 })
  assert.deepEqual(parse("Al-Kahf"), { kind: "surah", surah: 18 })
  assert.deepEqual(parse("kahf 10"), { kind: "ayah", surah: 18, ayah: 10 })
  assert.deepEqual(parse("البقرة"), { kind: "surah", surah: 2 })
})

test("tolerates transliteration variants", () => {
  assert.deepEqual(parse("yaseen"), { kind: "surah", surah: 36 })
  assert.deepEqual(parse("yasin"), { kind: "surah", surah: 36 })
  assert.deepEqual(parse("fatihah"), { kind: "surah", surah: 1 })
  assert.deepEqual(parse("fatiha"), { kind: "surah", surah: 1 })
  assert.deepEqual(parse("ikhlaas"), { kind: "surah", surah: 112 })
})

test("matches translated names", () => {
  assert.deepEqual(parse("the cow"), { kind: "surah", surah: 2 })
  assert.deepEqual(parse("the cave 10"), { kind: "ayah", surah: 18, ayah: 10 })
})

test("reads a bare surah number", () => {
  assert.deepEqual(parse("36"), { kind: "surah", surah: 36 })
  assert.deepEqual(parse("114"), { kind: "surah", surah: 114 })
})

test("reads juz references", () => {
  for (const query of ["juz 5", "juz5", "juz' 5", "para 5", "sipara 5"]) {
    assert.deepEqual(parse(query), { kind: "juz", juz: 5 }, query)
  }
  assert.deepEqual(parse("juz 30"), { kind: "juz", juz: 30 })
})

test("rejects out-of-range references", () => {
  assert.equal(parse("2:300"), null) // Al-Baqarah has 286 ayahs
  assert.equal(parse("115"), null)
  assert.equal(parse("juz 31"), null)
  assert.equal(parse("juz 0"), null)
  assert.equal(parse("baqarah 999"), null)
})

test("rejects anything that is not a reference", () => {
  for (const query of ["", "   ", "mercy of allah", "pray 5 times a day", "1 2 3", "b1c2", "juz", "the patience of prophets"]) {
    assert.equal(parse(query), null, query)
  }
})

test("global ayah numbering matches the sequential Quran numbering", () => {
  assert.equal(globalAyahNumber(surahs, 1, 1), 1)
  assert.equal(globalAyahNumber(surahs, 2, 1), 8)
  assert.equal(globalAyahNumber(surahs, 2, 255), 262)
  assert.equal(globalAyahNumber(surahs, 114, 6), 6236)
})
