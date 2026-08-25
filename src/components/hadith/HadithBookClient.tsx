"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { HadithCard } from "./HadithCard"
import type { Hadith, HadithCollectionId } from "@/types"
import { getCollectionDisplayName } from "@/lib/hadith/collections"
import { saveHadithProgress } from "@/hooks/useHadithProgress"
import { SaveHadithSpotButton } from "@/components/shared/SaveSpotButton"
import { assetPath } from "@/lib/utils"

interface RawHadith {
  number: number
  bookId: number
  bookName: string
  chapterId?: number
  chapterName?: string
  arabic: string
  english: string
  urdu?: string
  narrator?: string
  grade?: string
}

interface Props {
  collection: HadithCollectionId
  bookId: number
  bookName: string
  totalHadiths: number
}

// Books can hold hundreds of hadiths; render them in pages so the initial
// paint (and the framer-motion mount animation) stays cheap.
const PAGE_SIZE = 20

function mapHadith(h: RawHadith, collection: HadithCollectionId): Hadith {
  return {
    id: `${collection}-${h.number}`,
    collection,
    bookId: h.bookId,
    bookName: h.bookName,
    chapterId: h.chapterId ?? 0,
    chapterName: h.chapterName ?? "",
    hadithNumber: h.number,
    arabic: h.arabic,
    english: h.english,
    urdu: h.urdu ?? "",
    narrator: h.narrator ?? "",
    grade: h.grade ?? "",
    reference: {
      collection: getCollectionDisplayName(collection),
      book: h.bookName,
      hadithNumber: h.number,
      bookNumber: h.bookId,
    },
    tags: [],
  }
}

export function HadithBookClient({ collection, bookId, bookName, totalHadiths }: Props) {
  const [hadiths, setHadiths] = useState<Hadith[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(assetPath(`/data/hadith/${collection}/books/book-${bookId}.json`))
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load hadiths")
        return r.json()
      })
      .then((data: RawHadith[]) => {
        setHadiths(data.map((h) => mapHadith(h, collection)))
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [collection, bookId])

  useEffect(() => {
    if (loading || hadiths.length === 0) return
    const hash = window.location.hash
    if (!hash) return
    const id = hash.slice(1)
    const idx = hadiths.findIndex((h) => `hadith-${h.id}` === id)
    if (idx < 0) return
    const targetPage = Math.ceil((idx + 1) / PAGE_SIZE)
    const timer = setTimeout(() => {
      setPage(targetPage)
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [loading, hadiths])

  // Track the top-most visible hadith as the user scrolls and persist it as
  // reading progress (mirrors the Quran reader). The rootMargin defines an
  // "active band" near the top of the viewport so the hadith recorded is the
  // one the reader is actually on, not one barely peeking in.
  useEffect(() => {
    const container = listRef.current
    if (!container || hadiths.length === 0) return
    if (typeof IntersectionObserver === "undefined") return

    const byElementId = new Map<string, { hadith: Hadith; index: number }>()
    hadiths.forEach((h, index) => {
      byElementId.set(`hadith-${h.id}`, { hadith: h, index })
    })

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id
          if (entry.isIntersecting) visible.add(id)
          else visible.delete(id)
        }
        if (visible.size === 0) return
        let top: Hadith | null = null
        let topIndex = Infinity
        for (const id of visible) {
          const rec = byElementId.get(id)
          if (rec && rec.index < topIndex) {
            topIndex = rec.index
            top = rec.hadith
          }
        }
        if (top) {
          saveHadithProgress({
            collection,
            collectionName: getCollectionDisplayName(collection),
            bookId,
            bookName: top.bookName,
            hadithId: top.id,
            hadithNumber: top.hadithNumber,
          })
        }
      },
      { rootMargin: "-100px 0px -55% 0px", threshold: 0 },
    )

    const els = container.querySelectorAll<HTMLElement>('[id^="hadith-"]')
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [hadiths, page, collection, bookId])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: Math.min(totalHadiths, 5) }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/20 bg-card/40 p-5 animate-pulse">
            <div className="h-4 w-24 bg-muted/20 rounded mb-4" />
            <div className="h-6 w-full bg-muted/10 rounded mb-2" />
            <div className="h-4 w-3/4 bg-muted/10 rounded mb-2" />
            <div className="h-4 w-1/2 bg-muted/10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/40 p-10 text-center">
        <BookOpen className="size-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">Failed to load hadiths.</p>
        <p className="text-sm text-muted-foreground/60 mt-1">{error}</p>
      </div>
    )
  }

  if (hadiths.length === 0) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/40 p-10 text-center">
        <BookOpen className="size-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">No hadith found in this book.</p>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(hadiths.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const visible = hadiths.slice(start, start + PAGE_SIZE)

  const goToPage = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages)
    setPage(next)
    // Jump back to the top of the list so the reader starts at the new page.
    requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: "smooth" }),
    )
  }

  // A compact window of page numbers around the current page (with ellipses),
  // so books with dozens of pages don't render dozens of buttons.
  const pageNumbers = getPageWindow(currentPage, totalPages)

  return (
    <div className="space-y-3">
      <SaveHadithSpotButton
        collection={collection}
        bookId={bookId}
        bookName={bookName}
        className="mb-3 sm:max-w-xs"
      />

      <div ref={listRef} className="space-y-3">
        {visible.map((hadith, i) => (
          <HadithCard key={hadith.id} hadith={hadith} index={i} />
        ))}
      </div>

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap items-center justify-center gap-1.5 pt-6"
          aria-label="Hadith pagination"
        >
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 rounded-lg border border-gold-dim/20 bg-card/40 px-3 py-2 text-sm font-medium text-gold-light transition-all hover:border-gold-dim/40 hover:bg-gold-dim/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gold-dim/20 disabled:hover:bg-card/40"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {pageNumbers.map((p, i) =>
            p === "ellipsis" ? (
              <span
                key={`e-${i}`}
                className="px-2 text-sm text-muted-foreground/60 select-none"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => goToPage(p)}
                aria-current={p === currentPage ? "page" : undefined}
                className={
                  p === currentPage
                    ? "min-w-9 rounded-lg border border-gold-dim/40 bg-gold-dim/15 px-3 py-2 text-sm font-semibold text-gold-light"
                    : "min-w-9 rounded-lg border border-border/20 bg-card/40 px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-gold-dim/30 hover:text-gold-light"
                }
              >
                {p}
              </button>
            ),
          )}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 rounded-lg border border-gold-dim/20 bg-card/40 px-3 py-2 text-sm font-medium text-gold-light transition-all hover:border-gold-dim/40 hover:bg-gold-dim/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gold-dim/20 disabled:hover:bg-card/40"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" />
          </button>
        </nav>
      )}

      {hadiths.length > 0 && (
        <p className="pt-1 text-center text-xs text-muted-foreground">
          Showing {start + 1}–{start + visible.length} of {hadiths.length}
          {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
        </p>
      )}
    </div>
  )
}

// Build a page-number list with ellipses: always show first, last, and a window
// around the current page — e.g. [1, "ellipsis", 4, 5, 6, "ellipsis", 20].
function getPageWindow(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | "ellipsis")[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) out.push("ellipsis")
  for (let p = left; p <= right; p++) out.push(p)
  if (right < total - 1) out.push("ellipsis")
  out.push(total)
  return out
}
