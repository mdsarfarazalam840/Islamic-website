"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Search, Loader2, X, Filter } from "lucide-react"
import Fuse from "fuse.js"
import { HadithCard } from "./HadithCard"
import {
  HadithReferenceResults,
  type HadithReferenceResolution,
} from "./HadithReferenceResults"
import { cn, assetPath } from "@/lib/utils"
import { COLLECTION_DISPLAY_NAMES } from "@/lib/hadith/collections"
import { parseHadithReference } from "@/lib/hadith/numberIndex"
import { useDebounce } from "@/hooks/useDebounce"
import type { Hadith, HadithBook, HadithCollectionId } from "@/types"

interface HadithSearchProps {
  collectionId: string
  books: HadithBook[]
}

const MAX_TEXT_RESULTS = 50

export function HadithSearch({ collectionId, books }: HadithSearchProps) {
  const [query, setQuery] = useState("")
  const [selectedBook, setSelectedBook] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keystroke-rate Fuse queries over thousands of hadiths are wasteful. Clearing
  // the box skips the debounce so results disappear the moment it empties.
  const debounced = useDebounce(query, 250)
  const trimmed = query.trim() === "" ? "" : debounced.trim()

  // A reference query ("1234", "Bukhari 1234") is answered from the number index
  // alone, so the keyword search sits it out.
  const reference = useMemo(() => parseHadithReference(trimmed), [trimmed])
  const [referenceState, setReferenceState] = useState<HadithReferenceResolution | null>(null)

  // Keyword results are stored against the query+book filter they belong to, so
  // "which results are current" and "are we still loading" are both derived
  // rather than tracked with extra state.
  const textKey = !trimmed || reference ? null : `${trimmed} ${selectedBook ?? ""}`
  const [textState, setTextState] = useState<{ key: string; results: Hadith[] } | null>(null)
  const [textError, setTextError] = useState<{ key: string; message: string } | null>(null)

  const fuseRef = useRef<Fuse<Hadith> | null>(null)
  const loadRef = useRef<Promise<Fuse<Hadith>> | null>(null)

  /**
   * Build the full-text index on first keyword search rather than on mount.
   * It needs every book file in the collection (~22 MB for Bukhari), which is a
   * lot to spend on a reader who only wants to jump to a hadith number — the
   * number index answers that in 34 KB.
   */
  const ensureTextIndex = useCallback((): Promise<Fuse<Hadith>> => {
    if (fuseRef.current) return Promise.resolve(fuseRef.current)
    if (loadRef.current) return loadRef.current

    const collectionName =
      COLLECTION_DISPLAY_NAMES[collectionId as HadithCollectionId] ?? collectionId

    loadRef.current = (async () => {
      const pages = await Promise.all(
        books.map(async (book) => {
          const res = await fetch(
            assetPath(`/data/hadith/${collectionId}/books/book-${book.id}.json`),
          )
          if (!res.ok) throw new Error(`Failed to load book ${book.id}`)
          return res.json()
        }),
      )

      const allHadiths: Hadith[] = []
      for (const page of pages) {
        for (const h of page) {
          allHadiths.push({
            id: `${collectionId}-${h.number}`,
            collection: collectionId as HadithCollectionId,
            bookId: h.bookId,
            bookName: h.bookName,
            chapterId: h.chapterId,
            chapterName: h.chapterName,
            hadithNumber: h.number,
            arabic: h.arabic,
            english: h.english,
            urdu: h.urdu ?? "",
            narrator: h.narrator,
            grade: h.grade,
            reference: {
              collection: collectionName,
              book: h.bookName,
              hadithNumber: h.number,
              bookNumber: h.bookId,
            },
            tags: [],
          })
        }
      }

      const fuse = new Fuse(allHadiths, {
        keys: [
          { name: "english", weight: 1 },
          { name: "arabic", weight: 0.6 },
          { name: "narrator", weight: 0.4 },
          { name: "bookName", weight: 0.3 },
        ],
        threshold: 0.4,
        distance: 100,
        minMatchCharLength: 2,
      })
      fuseRef.current = fuse
      return fuse
    })()

    loadRef.current.catch(() => {
      // Let the next keyword search retry instead of caching the rejection.
      loadRef.current = null
    })
    return loadRef.current
  }, [collectionId, books])

  useEffect(() => {
    if (!textKey) return

    let cancelled = false
    ensureTextIndex()
      .then((fuse) => {
        if (cancelled) return
        let raw = fuse.search(trimmed).map((r) => r.item)
        if (selectedBook) raw = raw.filter((h) => h.bookId === selectedBook)
        setTextState({ key: textKey, results: raw.slice(0, MAX_TEXT_RESULTS) })
      })
      .catch((err) => {
        console.error("Failed to load hadith data:", err)
        if (cancelled) return
        setTextError({
          key: textKey,
          message: "Could not load the hadith text for this collection. Check your connection and try again.",
        })
      })

    return () => {
      cancelled = true
    }
  }, [textKey, trimmed, selectedBook, ensureTextIndex])

  const results = textState?.key === textKey ? textState.results : []
  const errorMessage = textError?.key === textKey ? textError.message : null
  const searchingText = textKey !== null && textState?.key !== textKey && errorMessage === null

  const referenceResolved = referenceState?.query === trimmed
  // A number the index doesn't know — say that, rather than falling through to a
  // keyword "no results" message that misdescribes the problem.
  const missingReference = !!reference && referenceResolved && referenceState.count === 0

  const clearSearch = () => {
    setQuery("")
    setSelectedBook(null)
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keyword or hadith number…"
            className="w-full rounded-xl border border-border/20 bg-card/40 px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold-dim/40 transition-colors"
            aria-label="Search hadith by keyword or number"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "shrink-0 rounded-xl border p-3 transition-all",
            showFilters || selectedBook
              ? "border-gold-dim/30 bg-gold-dim/10 text-gold-light"
              : "border-border/20 bg-card/40 text-muted-foreground hover:text-gold-dim",
          )}
          aria-label="Filter by book"
          aria-pressed={showFilters}
        >
          <Filter className="size-4" />
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-gold-dim/15 bg-card/40 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Book Filter</p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            <button
              onClick={() => setSelectedBook(null)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                !selectedBook
                  ? "bg-gold-dim/20 text-gold-light border border-gold-dim/20"
                  : "bg-space-mid/20 text-muted-foreground hover:text-gold-dim border border-transparent",
              )}
            >
              All Books
            </button>
            {books.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelectedBook(book.id)}
                className={cn(
                  "max-w-full truncate rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  selectedBook === book.id
                    ? "bg-gold-dim/20 text-gold-light border border-gold-dim/20"
                    : "bg-space-mid/20 text-muted-foreground hover:text-gold-dim border border-transparent",
                )}
              >
                {book.id}. {book.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <HadithReferenceResults
        query={trimmed}
        scopeCollection={collectionId as HadithCollectionId}
        onResolve={setReferenceState}
      />

      {reference && !referenceResolved && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="size-5 animate-spin text-gold-light" />
          <p className="text-sm text-muted-foreground">Looking up hadith {reference.number}…</p>
        </div>
      )}

      {missingReference && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-foreground">No hadith numbered {reference.number}</p>
          <p className="text-sm text-muted-foreground">Check the number, or search by keyword instead.</p>
        </div>
      )}

      {searchingText && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="size-5 animate-spin text-gold-light" />
          <p className="text-sm text-muted-foreground">Searching hadith text…</p>
        </div>
      )}

      {errorMessage && (
        <p className="rounded-xl border border-border/20 bg-card/40 p-4 text-sm text-muted-foreground">
          {errorMessage}
        </p>
      )}

      {textKey && !searchingText && !errorMessage && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-foreground">No hadith found</p>
          <p className="text-sm text-muted-foreground">Try a different keyword.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Found {results.length} result{results.length !== 1 ? "s" : ""}
            {results.length === MAX_TEXT_RESULTS ? " (showing the closest matches)" : ""}
          </p>
          <div className="space-y-3">
            {results.map((hadith, i) => (
              <HadithCard key={hadith.id} hadith={hadith} index={i} />
            ))}
          </div>
        </div>
      )}

      {!trimmed && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground text-sm">
            Search across {books.length} books and{" "}
            {books.reduce((s, b) => s + b.hadithCount, 0).toLocaleString()} hadiths
          </p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            Type a hadith number to jump straight to it.
          </p>
        </div>
      )}
    </div>
  )
}
