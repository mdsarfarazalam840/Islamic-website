"use client"

import { useEffect, useState } from "react"
import { BookOpen } from "lucide-react"
import { HadithCard } from "./HadithCard"
import type { Hadith, HadithCollectionId } from "@/types"
import { getCollectionDisplayName } from "@/lib/hadith/collections"
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

export function HadithBookClient({ collection, bookId, totalHadiths }: Props) {
  const [hadiths, setHadiths] = useState<Hadith[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE_SIZE)

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
    // If the deep-linked hadith is past the current page, reveal up to it.
    // Done inside the timeout callback (async) so it doesn't trip the
    // set-state-in-effect lint — the scroll only needs to happen after paint.
    const idx = hadiths.findIndex((h) => `hadith-${h.id}` === id)
    const timer = setTimeout(() => {
      if (idx >= 0 && idx >= shown) {
        setShown(Math.ceil((idx + 1) / PAGE_SIZE) * PAGE_SIZE)
      }
      // Second tick lets the newly revealed cards mount before we scroll.
      requestAnimationFrame(() => {
        const el = document.getElementById(id)
        el?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [loading, hadiths, shown])

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

  const visible = hadiths.slice(0, shown)

  return (
    <div className="space-y-3">
      {visible.map((hadith, i) => (
        <HadithCard key={hadith.id} hadith={hadith} index={i} />
      ))}
      {shown < hadiths.length && (
        <div className="flex flex-col items-center gap-2 pt-4">
          <button
            onClick={() => setShown((n) => n + PAGE_SIZE)}
            className="rounded-lg border border-gold-dim/20 bg-card/40 px-6 py-2.5 text-sm font-medium text-gold-light hover:border-gold-dim/40 hover:bg-gold-dim/10 transition-all"
          >
            Load more hadith
          </button>
          <span className="text-xs text-muted-foreground">
            Showing {shown} of {hadiths.length}
          </span>
        </div>
      )}
    </div>
  )
}
