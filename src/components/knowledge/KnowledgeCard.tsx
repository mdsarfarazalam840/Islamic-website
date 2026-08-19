import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { pick, langDir, langFont } from "@/lib/knowledge/lang"
import { getCategoryInfo } from "@/lib/knowledge/categories"
import { SourceTagBadge } from "./SourceTagBadge"
import type { KnowledgeArticleMeta, Language } from "@/types"

interface KnowledgeCardProps {
  article: KnowledgeArticleMeta
  lang: Language
}

// How many source badges to show on a teaser before collapsing to "+N".
const MAX_BADGES = 3

/** Article teaser card (title/summary in the selected language + source badges). */
export function KnowledgeCard({ article, lang }: KnowledgeCardProps) {
  const dir = langDir(lang)
  const font = langFont(lang)
  const info = getCategoryInfo(article.category)
  const extra = article.sources.length - MAX_BADGES

  return (
    <Link
      href={`/knowledge-base/${article.category}/${article.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border/20 bg-card/40 p-5 transition-all duration-300 hover:border-gold-dim/30 hover:bg-card/60 hover:gold-shadow"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        {info && (
          <span className="rounded-md bg-gold-dim/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold-dim">
            {pick(info.label, lang)}
          </span>
        )}
        <ArrowRight className="size-4 text-gold-light opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      <div dir={dir} className={cn(font, "flex-1")}>
        <h3 className="font-display font-semibold text-foreground group-hover:text-gold-light transition-colors leading-snug">
          {pick(article.title, lang)}
        </h3>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
          {pick(article.summary, lang)}
        </p>
      </div>

      {article.sources.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {article.sources.slice(0, MAX_BADGES).map((s, i) => (
            <SourceTagBadge key={i} source={s} className="text-[10px] px-2 py-0" />
          ))}
          {extra > 0 && (
            <span className="text-[10px] text-muted-foreground">+{extra}</span>
          )}
        </div>
      )}
    </Link>
  )
}
