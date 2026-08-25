import type { KnowledgeArticleMeta } from "@/types"
import { KNOWLEDGE_CATEGORY_IDS } from "./categories"

/**
 * The minimum an article needs to be ordered. Accepting a Pick rather than a
 * full article lets this take both KnowledgeArticle and the body-stripped
 * KnowledgeArticleMeta, and keeps the unit tests free of fixture bodies.
 */
export type Orderable = Pick<
  KnowledgeArticleMeta,
  "slug" | "category" | "title" | "order" | "prophetNumber" | "surahNumber"
>

/**
 * An article's position within its category. `order` is the explicit override;
 * "prophets" and "surahs" fall back to the numbering their JSON already
 * carries, so those categories need no extra data. Articles with no sequence
 * at all (concepts, quranic, hadith-stories) return Infinity and sort last,
 * where the title tiebreak takes over.
 */
export function sequenceOf(a: Orderable): number {
  return a.order ?? a.prophetNumber ?? a.surahNumber ?? Number.POSITIVE_INFINITY
}

/** Category display rank, from the single source of truth in ./categories. */
function categoryRank(a: Orderable): number {
  const i = KNOWLEDGE_CATEGORY_IDS.indexOf(a.category)
  // An unknown category sorts last rather than first; articles.ts already
  // warns about these in dev.
  return i === -1 ? KNOWLEDGE_CATEGORY_IDS.length : i
}

/**
 * Total, deterministic order for Knowledge Base articles: category display
 * order, then sequence within the category, then English title, then slug.
 *
 * The tiebreaks are the point of this function — without them the order falls
 * back to `fs.readdirSync`, which is filesystem-dependent and not guaranteed
 * stable between machines. `slug` is unique per article, so the chain resolves
 * for any realistic slug.
 *
 * Collation is pinned to "en" rather than left to the environment default. A
 * container with no LANG/LC_ALL resolves to a POSIX collation, where case
 * ordering is the reverse of "en" — that would make the tiebreaks
 * machine-dependent, which is the very thing this module exists to prevent.
 *
 * Sequences are compared with `!==`/`<` rather than by subtraction: the
 * "no sequence" sentinel is Infinity, and `Infinity - Infinity` is NaN. Sort
 * coerces a NaN comparator result to +0 (ECMA-262 CompareArrayElements), so
 * the two articles would be treated as *equal* and the stable sort would leave
 * them in filesystem order.
 */
export function compareArticles(a: Orderable, b: Orderable): number {
  const rankA = categoryRank(a)
  const rankB = categoryRank(b)
  if (rankA !== rankB) return rankA - rankB

  const seqA = sequenceOf(a)
  const seqB = sequenceOf(b)
  if (seqA !== seqB) return seqA < seqB ? -1 : 1

  const byTitle = a.title.en.localeCompare(b.title.en, "en")
  if (byTitle !== 0) return byTitle

  return a.slug.localeCompare(b.slug, "en")
}
