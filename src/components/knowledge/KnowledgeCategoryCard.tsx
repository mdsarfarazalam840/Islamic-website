import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { pick, langDir, langFont } from "@/lib/knowledge/lang"
import type { KnowledgeCategoryInfo } from "@/lib/knowledge/categories"
import type { Language } from "@/types"

interface KnowledgeCategoryCardProps {
  info: KnowledgeCategoryInfo
  count: number
  lang: Language
}

/** Landing tile for one Knowledge Base category. */
export function KnowledgeCategoryCard({ info, count, lang }: KnowledgeCategoryCardProps) {
  const Icon = info.icon
  const dir = langDir(lang)
  const font = langFont(lang)
  return (
    <Link
      href={`/knowledge-base/${info.id}`}
      className="group relative overflow-hidden rounded-xl border border-border/20 bg-card/40 p-6 transition-all duration-500 hover:border-gold-dim/30 hover:gold-shadow"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-gold-dim/20 to-gold-dim/5 bg-gradient-to-br" />
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gold-dim/10 text-gold-light">
            <Icon className="size-5" />
          </div>
          <span className="rounded-full bg-gold-dim/10 px-2.5 py-0.5 text-xs font-medium text-gold-dim">
            {count} article{count !== 1 ? "s" : ""}
          </span>
        </div>
        <div dir={dir} className={cn(font)}>
          <h3 className="font-semibold text-foreground group-hover:text-gold-light transition-colors duration-300">
            {pick(info.label, lang)}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {pick(info.blurb, lang)}
          </p>
        </div>
        <ArrowRight className="size-4 text-gold-light opacity-0 group-hover:opacity-100 transition-all translate-x-[-8px] group-hover:translate-x-0 duration-300" />
      </div>
    </Link>
  )
}
