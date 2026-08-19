import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getArticleMetaByCategory } from "@/lib/knowledge/articles"
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_CATEGORY_IDS,
  getCategoryInfo,
} from "@/lib/knowledge/categories"
import { KnowledgeIndexClient } from "@/components/knowledge/KnowledgeIndexClient"
import type { KnowledgeCategory } from "@/types"

interface Props {
  params: Promise<{ category: string }>
}

export function generateStaticParams() {
  return KNOWLEDGE_CATEGORIES.map((c) => ({ category: c.id }))
}

function isCategory(value: string): value is KnowledgeCategory {
  return (KNOWLEDGE_CATEGORY_IDS as string[]).includes(value)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  if (!isCategory(category)) return {}
  const info = getCategoryInfo(category)
  if (!info) return {}
  return {
    title: `${info.label.en} — Knowledge Base — Noor`,
    description: info.blurb.en,
  }
}

export default async function KnowledgeCategoryPage({ params }: Props) {
  const { category } = await params
  if (!isCategory(category)) notFound()

  const info = getCategoryInfo(category)
  if (!info) notFound()

  const articles = getArticleMetaByCategory(category)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <KnowledgeIndexClient
        articles={articles}
        title={info.label.en}
        subtitle={`${articles.length} article${articles.length !== 1 ? "s" : ""} · English · हिन्दी · اردو`}
      />
    </div>
  )
}
