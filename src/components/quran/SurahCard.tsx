"use client"

import Link from "next/link"
import type { Surah } from "@/types"

interface SurahCardProps {
  surah: Surah
}

export function SurahCard({ surah }: SurahCardProps) {
  return (
    <Link
      href={`/quran/${surah.number}`}
      className="group flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/5"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-sm font-medium text-secondary">
          {surah.number}
        </span>
        <div>
          <p className="font-medium text-foreground group-hover:text-secondary transition-colors">
            {surah.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {surah.revelationType} &middot; {surah.ayahCount} verses
            {surah.juz.length > 0 && ` \u00b7 Juz ${surah.juz.join(", ")}`}
          </p>
        </div>
      </div>
      <span className="text-lg font-arabic text-secondary/70">{surah.nameArabic}</span>
    </Link>
  )
}
