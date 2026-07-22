"use client"

import { useState } from "react"
import { BookOpen, Search, Filter } from "lucide-react"
import { SurahCard } from "@/components/quran/SurahCard"
import { cn } from "@/lib/utils"
import type { Surah } from "@/types"

interface QuranIndexClientProps {
  surahs: Surah[]
}

type FilterType = "all" | "meccan" | "medinan"

export function QuranIndexClient({ surahs }: QuranIndexClientProps) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")

  const filtered = surahs.filter((s) => {
    if (filter !== "all" && s.revelationType !== filter) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.nameTranslated.toLowerCase().includes(q) ||
      s.nameArabic.includes(query) ||
      s.number.toString().includes(q)
    )
  })

  const meccanCount = surahs.filter((s) => s.revelationType === "meccan").length
  const medinanCount = surahs.filter((s) => s.revelationType === "medinan").length

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="size-6 text-gold-light" />
          <div>
            <h1 className="text-2xl font-display gold-gradient-text font-bold">Al-Quran</h1>
            <p className="text-sm text-muted-foreground">
              {surahs.length} Surahs &middot; {meccanCount} Meccan &middot; {medinanCount} Medinan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search surahs..."
              className="w-full sm:w-56 rounded-lg border border-border/20 bg-space-mid/20 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold-dim/40 transition-colors"
              aria-label="Search surahs"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-space-mid/20 border border-gold-dim/10 p-1">
            {(["all", "meccan", "medinan"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all",
                  filter === f
                    ? "bg-gold-dim/20 text-gold-light border border-gold-dim/20"
                    : "text-muted-foreground hover:text-gold-dim border border-transparent",
                )}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Filter className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-foreground">No surahs found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filter.
          </p>
          <button
            onClick={() => { setQuery(""); setFilter("all") }}
            className="mt-4 text-sm text-gold-light hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((surah) => (
            <SurahCard key={surah.number} surah={surah} />
          ))}
        </div>
      )}
    </>
  )
}
