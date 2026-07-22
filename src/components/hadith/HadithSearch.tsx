"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Search, Loader2, X, Filter } from "lucide-react"
import Fuse from "fuse.js"
import { HadithCard } from "./HadithCard"
import { cn, assetPath } from "@/lib/utils"
import { COLLECTION_DISPLAY_NAMES } from "@/lib/hadith/collections"
import type { Hadith, HadithBook } from "@/types"

interface HadithSearchProps {
  collectionId: string
  books: HadithBook[]
}

export function HadithSearch({ collectionId, books }: HadithSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Hadith[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [searched, setSearched] = useState(false)
  const [selectedBook, setSelectedBook] = useState<number | null>(null)
  const [fuse, setFuse] = useState<Fuse<Hadith> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const allHadiths: Hadith[] = []
        for (const book of books) {
          const res = await fetch(assetPath(`/data/hadith/${collectionId}/books/book-${book.id}.json`))
          const data = await res.json()
          const mapped: Hadith[] = data.map((h: any) => ({
            id: `${collectionId}-${h.number}`,
            collection: collectionId,
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
              collection: COLLECTION_DISPLAY_NAMES[collectionId as keyof typeof COLLECTION_DISPLAY_NAMES] ?? collectionId,
              book: h.bookName,
              hadithNumber: h.number,
              bookNumber: h.bookId,
            },
            tags: [],
          }))
          allHadiths.push(...mapped)
        }
        const f = new Fuse(allHadiths, {
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
        setFuse(f)
      } catch (err) {
        console.error("Failed to load hadith data:", err)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [collectionId, books])

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q)
      if (!q.trim() || !fuse) {
        if (!q.trim()) setResults([])
        setSearched(false)
        return
      }
      setLoading(true)
      setSearched(true)
      let raw = fuse.search(q.trim()).map((r) => r.item)
      if (selectedBook) {
        raw = raw.filter((h) => h.bookId === selectedBook)
      }
      setResults(raw.slice(0, 50))
      setLoading(false)
    },
    [fuse, selectedBook],
  )

  const clearSearch = () => {
    setQuery("")
    setResults([])
    setSearched(false)
    setSelectedBook(null)
    inputRef.current?.focus()
  }

  const filteredBooks = selectedBook
    ? books.filter((b) => b.id === selectedBook)
    : books

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={loadingData ? "Loading hadith data..." : "Search hadith by keyword..."}
            disabled={loadingData}
            className="w-full rounded-xl border border-border/20 bg-card/40 px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold-dim/40 transition-colors disabled:opacity-50"
            aria-label="Search hadith"
          />
          {query && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "rounded-xl border p-3 transition-all",
            showFilters || selectedBook
              ? "border-gold-dim/30 bg-gold-dim/10 text-gold-light"
              : "border-border/20 bg-card/40 text-muted-foreground hover:text-gold-dim",
          )}
          aria-label="Filter"
        >
          <Filter className="size-4" />
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-gold-dim/15 bg-card/40 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Book Filter</p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            <button
              onClick={() => { setSelectedBook(null); if (query) handleSearch(query) }}
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
                onClick={() => { setSelectedBook(book.id); if (query) handleSearch(query) }}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  selectedBook === book.id
                    ? "bg-gold-dim/20 text-gold-light border border-gold-dim/20"
                    : "bg-space-mid/20 text-muted-foreground hover:text-gold-dim border border-transparent",
                )}
              >
                {book.id}. {book.name.length > 25 ? book.name.slice(0, 25) + "..." : book.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loadingData && (
        <div className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="size-5 animate-spin text-gold-light" />
          <p className="text-sm text-muted-foreground">Loading hadith data...</p>
        </div>
      )}

      {!loadingData && loading && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="size-5 animate-spin text-gold-light" />
          <p className="text-sm text-muted-foreground">Searching...</p>
        </div>
      )}

      {!loadingData && !loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-foreground">No hadith found</p>
          <p className="text-sm text-muted-foreground">Try a different keyword.</p>
        </div>
      )}

      {!loadingData && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Found {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {results.map((hadith, i) => (
              <HadithCard key={hadith.id} hadith={hadith} index={i} />
            ))}
          </div>
        </div>
      )}

      {!loadingData && !searched && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground text-sm">
            Search across {books.length} books and {books.reduce((s, b) => s + b.hadithCount, 0).toLocaleString()} hadiths
          </p>
        </div>
      )}
    </div>
  )
}
