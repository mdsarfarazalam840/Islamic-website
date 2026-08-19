import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getAllArticles, getArticle, getRelatedArticles } from "@/lib/knowledge/articles"
import { getCategoryInfo } from "@/lib/knowledge/categories"
import { hydrateArticle } from "@/lib/knowledge/hydrate"
import { getCollectionDisplayName } from "@/lib/hadith/collections"
import { ArticleView } from "@/components/knowledge/ArticleView"
import type { SourceTag } from "@/types"

interface Props {
  params: Promise<{ category: string; slug: string }>
}

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ category: a.category, slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}
  const info = getCategoryInfo(article.category)
  return {
    title: `${article.title.en} — Knowledge Base — Noor`,
    description: article.summary.en,
    keywords: info ? [info.label.en, "Islam", "Knowledge Base"] : undefined,
  }
}

/** Human-readable citation string for one source, for the Article JSON-LD. */
function citationText(source: SourceTag): string {
  switch (source.type) {
    case "quran":
      return `Qur'an ${source.ref}`
    case "hadith":
      return `${getCollectionDisplayName(source.collection)} ${source.ref} (${source.grade})`
    case "tafsir":
      return `Tafsir ${source.scholar}`
    case "seerah":
      return "Seerah"
  }
}

export default async function KnowledgeArticlePage({ params }: Props) {
  const { category, slug } = await params
  const article = getArticle(slug)

  // Enforce canonical URLs: the article must exist and live under this exact
  // category segment (relatedSlugs reference by slug alone, so a slug could be
  // requested under the wrong category — 404 that instead of duplicating).
  if (!article || article.category !== category) notFound()

  const hydrated = hydrateArticle(article)
  const related = getRelatedArticles(article.relatedSlugs)
  const info = getCategoryInfo(article.category)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title.en,
    description: article.summary.en,
    inLanguage: ["en", "hi", "ur"],
    articleSection: info?.label.en ?? article.category,
    citation: article.sources.map(citationText),
    isPartOf: {
      "@type": "WebSite",
      name: "Noor",
    },
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href={`/knowledge-base/${article.category}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold-light mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to {info?.label.en ?? "Knowledge Base"}
      </Link>

      <ArticleView article={hydrated} related={related} />
    </div>
  )
}
