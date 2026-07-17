"use client"

import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollectionCardProps {
  id: string
  name: string
  nameArabic: string
  description: string
  totalHadith: number
  totalBooks: number
}

export function CollectionCard({
  id,
  name,
  nameArabic,
  description,
  totalHadith,
  totalBooks,
}: CollectionCardProps) {
  return (
    <Link
      href={`/hadith/${id}`}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/20 bg-card/40 p-6 transition-all duration-300 hover:border-gold-dim/30 hover:gold-shadow",
        "arch-card pt-10"
      )}
    >
      <div className="absolute inset-0 geometric-bg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 bg-gradient-to-br from-gold-dim/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="size-5 text-gold-light" />
              <h2 className="text-lg font-display font-bold text-foreground group-hover:text-gold-light transition-colors">
                {name}
              </h2>
            </div>
            <span className="text-base font-arabic text-gold-dim/60">{nameArabic}</span>
          </div>
          <ArrowRight className="size-5 text-gold-light opacity-0 group-hover:opacity-100 transition-all translate-x-[-8px] group-hover:translate-x-0 duration-300" />
        </div>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="rounded-lg bg-gold-dim/10 px-2.5 py-1 text-gold-light font-medium border border-gold-dim/20">
            {totalHadith.toLocaleString()} hadiths
          </span>
          <span className="rounded-lg bg-space-mid/20 px-2.5 py-1 border border-border/20">
            {totalBooks} books
          </span>
        </div>
      </div>
    </Link>
  )
}
