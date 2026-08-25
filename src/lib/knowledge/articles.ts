import fs from "node:fs"
import path from "node:path"
import type {
  KnowledgeArticle,
  KnowledgeArticleMeta,
  KnowledgeCategory,
} from "@/types"
import { KNOWLEDGE_CATEGORY_IDS } from "./categories"
import { compareArticles } from "./order"

// One JSON file per article. Both this loader and the Pagefind indexer
// (scripts/build-pagefind-index.mjs) read this directory directly via `fs` —
// the indexer is plain ESM and cannot import TS, so plain JSON read from disk
// is the shared source of truth. Lives under src/ (not public/) because the
// client never fetches article JSON: bodies are hydrated into static HTML at
// build time, so shipping them in the out/ artifact would be dead weight.
const DATA_DIR = path.join(process.cwd(), "src", "data", "knowledge", "articles")

let articlesCache: KnowledgeArticle[] | null = null

/** Dev-only integrity check. Warns (never throws) so the build can't be broken by data. */
function validate(articles: KnowledgeArticle[]): void {
  if (process.env.NODE_ENV === "production") return
  const seen = new Set<string>()
  for (const a of articles) {
    if (seen.has(a.slug)) console.warn(`[knowledge] duplicate slug: ${a.slug}`)
    seen.add(a.slug)
    if (!KNOWLEDGE_CATEGORY_IDS.includes(a.category)) {
      console.warn(`[knowledge] ${a.slug}: unknown category "${a.category}"`)
    }
    for (const field of ["title", "summary"] as const) {
      for (const lang of ["en", "hi", "ur"] as const) {
        if (!a[field]?.[lang]?.trim()) {
          console.warn(`[knowledge] ${a.slug}: missing ${field}.${lang}`)
        }
      }
    }
  }
}

export function getAllArticles(): KnowledgeArticle[] {
  if (articlesCache) return articlesCache
  if (!fs.existsSync(DATA_DIR)) {
    articlesCache = []
    return articlesCache
  }
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"))
  const articles: KnowledgeArticle[] = []
  for (const file of files) {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8")
    articles.push(JSON.parse(raw) as KnowledgeArticle)
  }
  validate(articles)
  // Sort once, here, rather than at each call site. getArticlesByCategory,
  // getAllArticleMeta and getArticleMetaByCategory are all pure derivations of
  // this cached array, so they inherit the order and cannot drift out of sync.
  // getRelatedArticles is the deliberate exception: it indexes by slug to
  // preserve the author's relatedSlugs order.
  articles.sort(compareArticles)
  articlesCache = articles
  return articles
}

export function getArticle(slug: string): KnowledgeArticle | null {
  return getAllArticles().find((a) => a.slug === slug) ?? null
}

export function getArticlesByCategory(category: KnowledgeCategory): KnowledgeArticle[] {
  return getAllArticles().filter((a) => a.category === category)
}

function stripBody(a: KnowledgeArticle): KnowledgeArticleMeta {
  const { body: _body, ...meta } = a
  return meta
}

export function getAllArticleMeta(): KnowledgeArticleMeta[] {
  return getAllArticles().map(stripBody)
}

export function getArticleMetaByCategory(category: KnowledgeCategory): KnowledgeArticleMeta[] {
  return getArticlesByCategory(category).map(stripBody)
}

/** Resolve related-article slugs to their meta (skips any that don't exist). */
export function getRelatedArticles(slugs: string[]): KnowledgeArticleMeta[] {
  const meta = getAllArticleMeta()
  const bySlug = new Map(meta.map((m) => [m.slug, m]))
  return slugs.map((s) => bySlug.get(s)).filter((m): m is KnowledgeArticleMeta => m != null)
}
