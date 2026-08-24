import assert from "node:assert/strict"
import test from "node:test"
import type { KnowledgeCategory } from "@/types"
import { compareArticles, sequenceOf, type Orderable } from "@/lib/knowledge/order"

/**
 * Minimal orderable fixture. The default slug is derived from the category and
 * title so every fixture in a given sort is distinct: a shared placeholder slug
 * would silently mask the slug tiebreak. Pass `slug` in `extra` to test that
 * tiebreak directly.
 */
function a(
  category: KnowledgeCategory,
  titleEn: string,
  extra: Partial<Orderable> = {},
): Orderable {
  return {
    slug: `${category}-${titleEn.toLowerCase()}`,
    category,
    title: { en: titleEn, hi: titleEn, ur: titleEn },
    ...extra,
  }
}

test("sequenceOf prefers explicit order", () => {
  assert.equal(sequenceOf(a("creed", "x", { order: 3 })), 3)
})

test("sequenceOf falls back to prophetNumber then surahNumber", () => {
  assert.equal(sequenceOf(a("prophets", "x", { prophetNumber: 14 })), 14)
  assert.equal(sequenceOf(a("surahs", "x", { surahNumber: 67 })), 67)
})

test("sequenceOf returns Infinity when nothing is set", () => {
  assert.equal(sequenceOf(a("concepts", "x")), Number.POSITIVE_INFINITY)
})

// Guards `??` against a regression to `||`. Zero is falsy, so with `||` an
// explicit sequence of 0 would be discarded and fall through to the next
// candidate — here, to Infinity.
test("sequenceOf keeps a sequence of zero", () => {
  assert.equal(sequenceOf(a("basics", "x", { order: 0 })), 0)
  assert.equal(sequenceOf(a("prophets", "x", { prophetNumber: 0 })), 0)
})

test("order wins over prophetNumber when both are present", () => {
  assert.equal(sequenceOf(a("prophets", "x", { order: 2, prophetNumber: 9 })), 2)
})

test("sorts by category display order first", () => {
  // KNOWLEDGE_CATEGORY_IDS order is: basics, concepts, creed, prophets,
  // seerah, quranic, hadith-stories, surahs.
  const sorted = [
    a("surahs", "s", { surahNumber: 1 }),
    a("basics", "b", { order: 99 }),
    a("creed", "c", { order: 1 }),
  ].sort(compareArticles)
  assert.deepEqual(
    sorted.map((x) => x.category),
    ["basics", "creed", "surahs"],
  )
})

// categoryRank's `indexOf === -1` branch is unreachable for well-typed input,
// but articles.ts loads unvalidated JSON, so a bogus category can reach here.
// The cast is deliberate and stays local to this test.
test("an unknown category sorts after every known one", () => {
  const bogus = "not-a-category" as KnowledgeCategory
  const sorted = [
    // Lowest possible sequence and a first-alphabetically title, so only the
    // category rank can push it last.
    a(bogus, "Aaa", { order: 0 }),
    a("surahs", "Zzz", { surahNumber: 114 }),
    a("basics", "Mmm", { order: 1 }),
  ].sort(compareArticles)
  assert.deepEqual(
    sorted.map((x) => x.category),
    ["basics", "surahs", bogus],
  )
})

test("sorts by sequence within a category", () => {
  const sorted = [
    a("creed", "fifth", { order: 5 }),
    a("creed", "first", { order: 1 }),
    a("creed", "third", { order: 3 }),
  ].sort(compareArticles)
  assert.deepEqual(sorted.map((x) => x.title.en), ["first", "third", "fifth"])
})

test("sequenced articles sort before unsequenced ones", () => {
  const sorted = [a("concepts", "aaa"), a("concepts", "zzz", { order: 1 })].sort(
    compareArticles,
  )
  assert.deepEqual(sorted.map((x) => x.title.en), ["zzz", "aaa"])
})

// Guards the Infinity - Infinity === NaN trap. Sort coerces a NaN comparator
// result to +0, so subtraction would make unsequenced articles compare equal
// and leave them in filesystem order; they must reach the title tiebreak.
test("unsequenced articles fall back to alphabetical title.en", () => {
  const sorted = [
    a("concepts", "Tawakkul"),
    a("concepts", "Ikhlas"),
    a("concepts", "Sabr"),
  ].sort(compareArticles)
  assert.deepEqual(sorted.map((x) => x.title.en), ["Ikhlas", "Sabr", "Tawakkul"])
})

// The slugs are explicit and ordered against the expected result. The helper's
// default slug is derived from the title, which would reproduce title order and
// let the slug tiebreak answer this on its own; reversing them means the
// assertion holds only if the title comparison runs first.
test("articles with a colliding order fall back to alphabetical title.en", () => {
  const sorted = [
    a("creed", "Beta", { order: 4, slug: "a-creed-beta" }),
    a("creed", "Alpha", { order: 4, slug: "z-creed-alpha" }),
  ].sort(compareArticles)
  assert.deepEqual(sorted.map((x) => x.title.en), ["Alpha", "Beta"])
})

// The title comparison is pinned to the "en" locale. Under "en" collation
// lowercase precedes uppercase; a POSIX collation (an unset LANG/LC_ALL) orders
// by code point and reverses that. This pins the "en" answer so the tiebreak
// cannot start depending on the machine it runs on.
// The slugs are explicit here because the helper lowercases the title to build
// the default, which would give these two the same slug. They are also ordered
// against the expected result, so the assertion holds only if the title
// comparison runs before the slug one.
test("the title tiebreak uses the en locale, not the environment default", () => {
  const sorted = [
    a("concepts", "Sabr", { slug: "a-sabr-upper" }),
    a("concepts", "sabr", { slug: "z-sabr-lower" }),
  ].sort(compareArticles)
  assert.deepEqual(sorted.map((x) => x.title.en), ["sabr", "Sabr"])
})

// The last tiebreak, and the reason the order is total: two articles alike in
// category, sequence and title.en still get a defined order. Without it they
// compare equal and Array.prototype.sort's stability hands the decision back to
// fs.readdirSync — so this asserts against the input order on purpose.
test("articles alike but for slug fall back to slug order", () => {
  const first = a("concepts", "Sabr", { slug: "sabr-endurance" })
  const second = a("concepts", "Sabr", { slug: "sabr-patience" })
  assert.equal(Math.sign(compareArticles(second, first)), 1)
  const sorted = [second, first].sort(compareArticles)
  assert.deepEqual(sorted.map((x) => x.slug), ["sabr-endurance", "sabr-patience"])
})

test("comparator never returns NaN", () => {
  const pairs: [Orderable, Orderable][] = [
    [a("concepts", "a"), a("concepts", "b")],
    [a("concepts", "a"), a("concepts", "a")],
    [a("creed", "a", { order: 1 }), a("concepts", "b")],
  ]
  for (const [x, y] of pairs) {
    assert.equal(Number.isNaN(compareArticles(x, y)), false)
  }
})

// One pair per branch of the comparator, so antisymmetry is checked on the
// category, sequence, title and slug comparisons rather than only the first.
// Every pair is expected to compare -1, and in every pair the keys that come
// *after* the named one are ordered against that -1. So each pair isolates its
// named branch: neuter that branch and a later one answers with +1 (or with 0
// for slug, which nothing follows), and the forward assertion below fails
// rather than passing on a fallback's answer.
test("comparator is antisymmetric", () => {
  const pairs: [string, Orderable, Orderable][] = [
    [
      "category",
      a("creed", "Zulu", { order: 2, slug: "z-creed-zulu" }),
      a("prophets", "Alpha", { prophetNumber: 1, slug: "a-prophets-alpha" }),
    ],
    [
      "sequence",
      a("creed", "Zulu", { order: 1, slug: "z-creed-zulu" }),
      a("creed", "Alpha", { order: 2, slug: "a-creed-alpha" }),
    ],
    [
      "title",
      a("creed", "Alpha", { order: 1, slug: "z-creed-alpha" }),
      a("creed", "Beta", { order: 1, slug: "a-creed-beta" }),
    ],
    [
      "slug",
      a("creed", "Alpha", { order: 1, slug: "alpha-a" }),
      a("creed", "Alpha", { order: 1, slug: "alpha-b" }),
    ],
  ]
  for (const [branch, x, y] of pairs) {
    const forward = Math.sign(compareArticles(x, y))
    assert.equal(forward, -1, `${branch} branch did not decide the pair`)
    assert.equal(forward, -Math.sign(compareArticles(y, x)), `${branch} branch`)
  }
})
