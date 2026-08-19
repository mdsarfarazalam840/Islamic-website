"use client"

import { useMemo, useState } from "react"
import { Library, Search, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { pick } from "@/lib/knowledge/lang"
import { KNOWLEDGE_CATEGORIES, type KnowledgeCategoryInfo } from "@/lib/knowledge/categories"
import { KnowledgeCategoryCard } from "./KnowledgeCategoryCard"
import { KnowledgeCard } from "./KnowledgeCard"
import { KnowledgeLanguageTabs } from "./KnowledgeLanguageTabs"
import type { KnowledgeArticleMeta, KnowledgeCategory, Language } from "@/types"

interface KnowledgeIndexClientProps {
  articles: KnowledgeArticleMeta[]
  /** When provided, renders the category grid + category filter pills (landing mode). */
  categoryCounts?: Record<KnowledgeCategory, number>
  /** Optional heading override for category pages (shown in the selected language). */
  title?: string
  subtitle?: string
}

type CategoryFilter = KnowledgeCategory | "all"

export function KnowledgeIndexClient({
  articles,
  categoryCounts,
  title,
  subtitle,
}: KnowledgeIndexClientProps) {
  const [lang, setLang] = useState<Language>("en")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("all")

  const isLanding = !!categoryCounts

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return articles.filter((a) => {
      if (isLanding && category !== "all" && a.category !== category) return false
      if (!q) return true
      return (
        pick(a.title, lang).toLowerCase().includes(q) ||
        pick(a.summary, lang).toLowerCase().includes(q) ||
        a.title.en.toLowerCase().includes(q)
      )
    })
  }, [articles, query, category, lang, isLanding])

  const pills: { id: CategoryFilter; label: string }[] = useMemo(() => {
    const list: { id: CategoryFilter; label: string }[] = [{ id: "all", label: "All" }]
    for (const c of KNOWLEDGE_CATEGORIES) {
      list.push({ id: c.id, label: pick(c.label, lang) })
    }
    return list
  }, [lang])

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Library className="size-6 text-gold-light" />
          <div>
            <h1 className="text-2xl font-display gold-gradient-text font-bold">
              {title ?? "Knowledge Base"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {subtitle ?? `${articles.length} article${articles.length !== 1 ? "s" : ""} · English · हिन्दी · اردو`}
            </p>
          </div>
        </div>
        <KnowledgeLanguageTabs active={lang} onChange={setLang} />
      </div>

      {isLanding && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {KNOWLEDGE_CATEGORIES.map((info: KnowledgeCategoryInfo) => (
            <KnowledgeCategoryCard
              key={info.id}
              info={info}
              count={categoryCounts[info.id] ?? 0}
              lang={lang}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter articles..."
            className="w-full rounded-lg border border-border/20 bg-space-mid/20 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold-dim/40 transition-colors"
            aria-label="Filter articles"
          />
        </div>
        {isLanding && (
          <div className="flex items-center gap-1 rounded-lg bg-space-mid/20 border border-gold-dim/10 p-1 overflow-x-auto">
            {pills.map((p) => (
              <button
                key={p.id}
                onClick={() => setCategory(p.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                  category === p.id
                    ? "bg-gold-dim/20 text-gold-light border border-gold-dim/20"
                    : "text-muted-foreground hover:text-gold-dim border border-transparent",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Filter className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-foreground">No articles found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different filter.</p>
          <button
            onClick={() => {
              setQuery("")
              setCategory("all")
            }}
            className="mt-4 text-sm text-gold-light hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <KnowledgeCard key={a.slug} article={a} lang={lang} />
          ))}
        </div>
      )}
    </>
  )
}
