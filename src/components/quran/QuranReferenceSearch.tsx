"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Hash, X } from "lucide-react"
import type { Surah } from "@/types"
import type { JuzEntry } from "@/lib/quran/juz"
import {
  explainQuranReferenceMiss,
  parseQuranReference,
  resolveQuranReference,
} from "@/lib/quran/reference"
import { useDebounce } from "@/hooks/useDebounce"

interface QuranReferenceSearchProps {
  surahs: Surah[]
  juzIndex: JuzEntry[]
  className?: string
}

/**
 * Go-to-reference box for the Quran landing page. Readers arrive with a citation
 * ("2:255", "juz 5") far more often than with a phrase, and following one used to
 * mean finding the surah in the grid and then stepping through juz until the
 * ayah showed up — the reader renders one juz at a time.
 *
 * Resolution is synchronous: surah numbers, names and ayah counts are bundled in
 * `src/data/quran/surahs.json` and the 30-entry juz index arrives as a prop, so
 * there is nothing to fetch and no stale-answer race to guard against.
 */
export function QuranReferenceSearch({ surahs, juzIndex, className }: QuranReferenceSearchProps) {
  const [query, setQuery] = useState("")
  const debounced = useDebounce(query, 250)
  const trimmed = debounced.trim()

  const reference = useMemo(() => parseQuranReference(trimmed, surahs), [trimmed, surahs])
  const hit = useMemo(
    () => (reference ? resolveQuranReference(reference, surahs, juzIndex) : null),
    [reference, surahs, juzIndex],
  )
  // "2:300" and "juz 31" were plainly reference attempts; say what's wrong with
  // them instead of claiming they aren't references at all.
  const miss = useMemo(
    () => (reference || !trimmed ? null : explainQuranReferenceMiss(trimmed, surahs)),
    [reference, trimmed, surahs],
  )

  return (
    <section className={className} aria-label="Go to an ayah or juz">
      <div className="flex items-center gap-2 mb-3">
        <Hash className="size-4 text-gold-light" />
        <h2 className="text-sm font-medium text-foreground">Go to an ayah or juz</h2>
      </div>

      <div className="relative">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. 2:255, al-baqarah 255, juz 5, yaseen"
          className="w-full rounded-xl border border-border/20 bg-card/40 px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold-dim/40 transition-colors"
          aria-label="Ayah, surah or juz reference"
          inputMode="text"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {hit && (
        <Link
          href={hit.href}
          className="group mt-4 flex items-center gap-3 rounded-xl border border-gold-dim/25 bg-gold-dim/5 p-3 sm:p-4 transition-all duration-200 hover:border-gold-dim/45 hover:bg-gold-dim/10"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold-dim/25 bg-gold-dim/10 text-xs font-semibold text-gold-light">
            {hit.reference.kind === "juz" ? `J${hit.reference.juz}` : hit.reference.surah}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{hit.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-gold-dim/60 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {miss && (
        <p className="mt-4 rounded-xl border border-border/20 bg-card/40 p-4 text-sm text-muted-foreground">
          {miss}
        </p>
      )}

      {trimmed && !reference && !miss && (
        <p className="mt-4 rounded-xl border border-border/20 bg-card/40 p-4 text-sm text-muted-foreground">
          That doesn&apos;t look like a reference. Try &ldquo;2:255&rdquo;, a surah name with an
          ayah number, or &ldquo;juz 5&rdquo;. To search ayah text instead, use{" "}
          <Link href="/search" className="text-gold-light hover:underline">
            search
          </Link>
          .
        </p>
      )}
    </section>
  )
}
