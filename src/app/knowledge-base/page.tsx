import type { Metadata } from "next"
import { getAllArticleMeta } from "@/lib/knowledge/articles"
import { KNOWLEDGE_CATEGORY_IDS } from "@/lib/knowledge/categories"
import { KnowledgeIndexClient } from "@/components/knowledge/KnowledgeIndexClient"
import type { KnowledgeCategory } from "@/types"

export const metadata: Metadata = {
  title: "Knowledge Base — Noor",
  description:
    "A trilingual, source-graded library on Islam — the pillars, the prophets, core concepts, Quranic stories, and surah virtues, in English, Hindi, and Urdu.",
}

export default function KnowledgeBasePage() {
  const articles = getAllArticleMeta()

  const categoryCounts = KNOWLEDGE_CATEGORY_IDS.reduce(
    (acc, id) => {
      acc[id] = articles.filter((a) => a.category === id).length
      return acc
    },
    {} as Record<KnowledgeCategory, number>,
  )

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <KnowledgeIndexClient articles={articles} categoryCounts={categoryCounts} />
    </div>
  )
}
