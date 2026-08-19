"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { pick, langDir, langFont } from "@/lib/knowledge/lang"
import { getCategoryInfo } from "@/lib/knowledge/categories"
import { Breadcrumbs } from "@/components/shared/Breadcrumbs"
import { KnowledgeLanguageTabs } from "./KnowledgeLanguageTabs"
import { BlockRenderer } from "./BlockRenderer"
import { SourceTagBadge } from "./SourceTagBadge"
import { SourceLegend } from "./SourceLegend"
import type { HydratedArticle, KnowledgeArticleMeta, Language } from "@/types"

interface ArticleViewProps {
  article: HydratedArticle
  related: KnowledgeArticleMeta[]
}

/** Full article page body. Owns the KB-local language state; everything renders from it. */
export function ArticleView({ article, related }: ArticleViewProps) {
  const [lang, setLang] = useState<Language>("en")
  const info = getCategoryInfo(article.category)
  const dir = langDir(lang)
  const font = langFont(lang)

  return (
    <article>
      <Breadcrumbs
        items={[
          { label: "Knowledge", href: "/knowledge-base" },
          { label: info ? pick(info.label, lang) : article.category, href: `/knowledge-base/${article.category}` },
          { label: pick(article.title, lang) },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div dir={dir} className={cn(font, "flex-1")}>
          <h1 className="text-3xl font-display gold-gradient-text font-bold leading-tight">
            {pick(article.title, lang)}
          </h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            {pick(article.summary, lang)}
          </p>
        </div>
        <KnowledgeLanguageTabs active={lang} onChange={setLang} className="shrink-0" />
      </div>

      {article.sources.length > 0 && (
        <div className="mb-8 rounded-xl border border-border/20 bg-card/30 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {article.sources.map((s, i) => (
              <SourceTagBadge key={i} source={s} />
            ))}
          </div>
          <SourceLegend />
        </div>
      )}

      <BlockRenderer blocks={article.body[lang]} lang={lang} />

      {related.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gold-dim/10">
          <h2 className="text-sm font-semibold text-gold-light uppercase tracking-wider mb-4">
            Related
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {related.map((r) => {
              const rInfo = getCategoryInfo(r.category)
              return (
                <Link
                  key={r.slug}
                  href={`/knowledge-base/${r.category}/${r.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-card/40 px-4 py-3 transition-all hover:border-gold-dim/30 hover:bg-card/60"
                >
                  <div dir={langDir(lang)} className={cn(langFont(lang), "min-w-0")}>
                    {rInfo && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-gold-dim">
                        {pick(rInfo.label, lang)}
                      </span>
                    )}
                    <p className="text-sm font-medium text-foreground group-hover:text-gold-light transition-colors truncate">
                      {pick(r.title, lang)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-gold-light opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </article>
  )
}
