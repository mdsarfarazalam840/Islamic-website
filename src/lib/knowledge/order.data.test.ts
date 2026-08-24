import assert from "node:assert/strict"
import test from "node:test"
import { getArticleMetaByCategory } from "@/lib/knowledge/articles"

test("prophets are ordered by prophetNumber, not filename", () => {
  const slugs = getArticleMetaByCategory("prophets").map((a) => a.slug)
  assert.equal(slugs.length, 25)
  assert.equal(slugs[0], "prophet-adam")
  assert.equal(slugs[1], "prophet-idris")
  assert.equal(slugs[24], "prophet-muhammad")
})

test("surahs are ordered by surahNumber", () => {
  const nums = getArticleMetaByCategory("surahs").map((a) => a.surahNumber)
  assert.deepEqual(nums, [1, 2, 8, 18, 36, 56, 67, 112, 113, 114])
})

test("unsequenced categories are alphabetical by title.en", () => {
  const titles = getArticleMetaByCategory("concepts").map((a) => a.title.en)
  const expected = [...titles].sort((x, y) => x.localeCompare(y))
  assert.deepEqual(titles, expected)
})

// The creed category is the one place where the taught sequence and the
// alphabetical one disagree completely ("Fifth" sorts before "First"), so every
// article carries an explicit `order`. This pins the syllabus order: the
// overview, then the six kalimas, then the two statements of faith, then the
// azaan.
test("creed articles follow the taught sequence, not the alphabet", () => {
  const slugs = getArticleMetaByCategory("creed").map((a) => a.slug)
  assert.deepEqual(slugs, [
    "creed-six-kalimas",
    "creed-kalima-tayyibah",
    "creed-kalima-shahadah",
    "creed-kalima-tamjeed",
    "creed-kalima-tawheed",
    "creed-kalima-astaghfar",
    "creed-kalima-radd-e-kufr",
    "creed-imaan-e-mujmal",
    "creed-imaan-e-mufassal",
    "creed-azaan",
  ])
})

// An `order` collision would silently hand two creed articles to the title
// tiebreak, which is the alphabetical order this category exists to override.
test("every creed article has a distinct order", () => {
  const orders = getArticleMetaByCategory("creed").map((a) => a.order)
  assert.equal(orders.some((o) => o === undefined), false)
  assert.equal(new Set(orders).size, orders.length)
})
