import { test } from "node:test"
import assert from "node:assert/strict"
import { DUA_CATEGORIES, DUA_CHAPTERS, DUA_ENTRIES, DUAS, DUA_SOURCE, HADITH_DUAS, HADITH_DUA_SOURCE } from "@/lib/duas"

test("ships the complete OpenDua Hisn al-Muslim catalogue", () => {
  assert.equal(DUA_SOURCE.chapterCount, 132)
  assert.equal(DUA_SOURCE.duaCount, 262)
  assert.equal(DUA_CHAPTERS.length, 132)
  assert.equal(DUAS.length, 262)
  assert.equal(new Set(DUAS.map((dua) => dua.id)).size, DUAS.length)
  assert.equal(DUAS.filter((dua) => dua.audioUrl).length, 261)
})

test("every catalogued recitation has complete display metadata", () => {
  const categoryIds = new Set(DUA_CATEGORIES.map((category) => category.id))

  for (const dua of DUAS) {
    assert.ok(categoryIds.has(dua.category))
    assert.ok(dua.title.length > 0)
    assert.ok(dua.arabic.length > 0)
    assert.ok(dua.transliteration.length > 0)
    assert.ok(dua.translation.length > 0)
    assert.ok(dua.reference.length > 0)
    assert.ok(dua.chapterNumber >= 1 && dua.chapterNumber <= 132)
  }
})

test("indexes hadith-backed duas from every local collection", () => {
  assert.equal(HADITH_DUA_SOURCE.scannedHadithCount, 36390)
  assert.equal(HADITH_DUAS.length, HADITH_DUA_SOURCE.selectedHadithCount)
  assert.equal(DUA_ENTRIES.length, DUAS.length + HADITH_DUAS.length)
  assert.equal(new Set(HADITH_DUAS.map((dua) => dua.id)).size, HADITH_DUAS.length)

  for (const [collection, counts] of Object.entries(HADITH_DUA_SOURCE.collectionCounts)) {
    assert.ok(counts.scanned > 0, `${collection} should be scanned`)
    assert.ok(counts.selected > 0, `${collection} should contribute hadith duas`)
  }

  for (const dua of HADITH_DUAS) {
    assert.equal(dua.source, "hadith")
    assert.ok(dua.arabic.length > 0)
    assert.ok(dua.translation.length > 0)
    assert.ok(dua.hadithHref?.startsWith(`/hadith/${dua.hadithCollection}/`))
    assert.ok((dua.bookId ?? -1) >= 0)
    assert.ok((dua.hadithNumber ?? 0) > 0)
  }
})
