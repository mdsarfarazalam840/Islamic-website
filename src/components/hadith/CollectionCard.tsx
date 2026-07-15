"use client"

import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"

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
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="size-5 text-secondary" />
              <h2 className="text-lg font-display font-bold text-foreground group-hover:text-secondary transition-colors">
                {name}
              </h2>
            </div>
            <span className="text-base font-arabic text-secondary/70">{nameArabic}</span>
          </div>
          <ArrowRight className="size-5 text-secondary opacity-0 group-hover:opacity-100 transition-all translate-x-[-8px] group-hover:translate-x-0" />
        </div>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="rounded-lg bg-secondary/10 px-2.5 py-1 text-secondary font-medium">
            {totalHadith.toLocaleString()} hadiths
          </span>
          <span className="rounded-lg bg-surface px-2.5 py-1">
            {totalBooks} books
          </span>
        </div>
      </div>
    </Link>
  )
}
