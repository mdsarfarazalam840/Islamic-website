"use client"

import { useMemo, useState } from "react"
import { Hash, Loader2, X } from "lucide-react"
import {
  HadithReferenceResults,
  type HadithReferenceResolution,
} from "./HadithReferenceResults"
import { parseHadithReference } from "@/lib/hadith/numberIndex"
import { useDebounce } from "@/hooks/useDebounce"

/**
 * Go-to-hadith-by-number box for the collections landing page. Readers arrive
 * with a citation ("Bukhari 1234") far more often than with a phrase to search,
 * and following a citation used to mean guessing which of 98 books held it.
 *
 * Bare numbers resolve across every collection at once — hadith numbering is
 * per-collection, so "1234" is a real hadith in each of them and the reader
 * chooses. Naming a collection narrows it to one hit.
 */
export function HadithReferenceSearch() {
  const [query, setQuery] = useState("")
  const debounced = useDebounce(query, 250)
  const trimmed = debounced.trim()

  const reference = useMemo(() => parseHadithReference(trimmed), [trimmed])
  const [resolution, setResolution] = useState<HadithReferenceResolution | null>(null)
  const resolved = resolution?.query === trimmed

  return (
    <section className="mb-8" aria-label="Go to hadith by number">
      <div className="flex items-center gap-2 mb-3">
        <Hash className="size-4 text-gold-light" />
        <h2 className="text-sm font-medium text-foreground">Go to a hadith by number</h2>
      </div>

      <div className="relative">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. 1234, Bukhari 1234, Sahih Muslim 500"
          className="w-full rounded-xl border border-border/20 bg-card/40 px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold-dim/40 transition-colors"
          aria-label="Hadith number or reference"
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

      <HadithReferenceResults query={trimmed} onResolve={setResolution} className="mt-4" />

      {reference && !resolved && (
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin text-gold-light" />
          <span>Looking up hadith {reference.number}…</span>
        </div>
      )}

      {reference && resolved && resolution.count === 0 && (
        <p className="mt-4 rounded-xl border border-border/20 bg-card/40 p-4 text-sm text-muted-foreground">
          No collection here has a hadith numbered {reference.number}.
        </p>
      )}

      {trimmed && !reference && (
        <p className="mt-4 rounded-xl border border-border/20 bg-card/40 p-4 text-sm text-muted-foreground">
          That doesn&apos;t look like a hadith reference. Try a number on its own, or a
          collection followed by a number — &ldquo;Bukhari 1234&rdquo;.
        </p>
      )}
    </section>
  )
}
