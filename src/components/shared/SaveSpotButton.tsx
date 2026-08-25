"use client"

import { Bookmark, BookmarkCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBookmarks, type NewBookmark } from "@/hooks/useBookmarks"
import { useReadingProgress } from "@/hooks/useReadingProgress"
import { useHadithProgress } from "@/hooks/useHadithProgress"

/**
 * "Save my spot" — bookmarks the reader's current position so it shows up in
 * /saved. Unlike the per-ayah and per-hadith icons this is always visible and
 * never hover-gated: on a touch device it's the primary save affordance.
 *
 * The three wrappers below each subscribe to their own progress store so the
 * label names the spot that will actually be saved, and so the saved/unsaved
 * state stays correct as the reader scrolls. They're leaf components, so the
 * re-render per position change costs one small button — the readers
 * themselves still don't subscribe.
 */
function SaveSpotControl({
  bookmark,
  spotLabel,
  className,
}: {
  bookmark: NewBookmark
  spotLabel: string
  className?: string
}) {
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const active = isBookmarked(bookmark.id)

  return (
    <button
      onClick={() => toggleBookmark(bookmark)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
        active
          ? "border-gold-dim/40 bg-gold-dim/15"
          : "border-gold-dim/20 bg-card/50 hover:border-gold-dim/40 hover:bg-gold-dim/10",
        className,
      )}
      aria-label={active ? `Remove saved spot: ${spotLabel}` : `Save my spot: ${spotLabel}`}
      aria-pressed={active}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border text-gold-light",
          active ? "border-gold-dim/40 bg-gold-dim/20" : "border-gold-dim/20 bg-gold-dim/10",
        )}
      >
        {active ? (
          <BookmarkCheck className="size-4" />
        ) : (
          <Bookmark className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {active ? "Spot saved" : "Save my spot"}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{spotLabel}</span>
      </span>
    </button>
  )
}

/**
 * Saves the ayah the reader is currently on. The progress store holds a single
 * position across the whole Quran, so it only counts when it points at this
 * surah — otherwise (nothing tracked yet, or tracked elsewhere) we save the
 * surah itself.
 */
export function SaveQuranSpotButton({
  surahNumber,
  surahName,
  className,
}: {
  surahNumber: number
  surahName: string
  className?: string
}) {
  const { progress } = useReadingProgress()
  const here = progress?.surahNumber === surahNumber ? progress : null

  const bookmark: NewBookmark = here
    ? {
        id: `ayah-${here.ayahId}`,
        type: "ayah",
        reference: `${here.surahName} · Ayah ${here.ayahNumber}`,
        text: `Surah ${here.surahName}`,
        href: `/quran/${here.surahNumber}#ayah-${here.ayahId}`,
      }
    : {
        id: `surah-${surahNumber}`,
        type: "ayah",
        reference: `Surah ${surahName}`,
        text: `Surah ${surahName}`,
        href: `/quran/${surahNumber}`,
      }

  return (
    <SaveSpotControl
      bookmark={bookmark}
      spotLabel={here ? `${surahName} · Ayah ${here.ayahNumber}` : `Surah ${surahName}`}
      className={className}
    />
  )
}

/** Saves the hadith the reader is currently on, or the book if none tracked. */
export function SaveHadithSpotButton({
  collection,
  bookId,
  bookName,
  className,
}: {
  collection: string
  bookId: number
  bookName: string
  className?: string
}) {
  const { progress } = useHadithProgress()
  const here =
    progress?.collection === collection && progress?.bookId === bookId ? progress : null

  const bookmark: NewBookmark = here
    ? {
        id: `hadith-${here.hadithId}`,
        type: "hadith",
        reference: `${here.collectionName} · Hadith ${here.hadithNumber}`,
        text: here.bookName,
        href: `/hadith/${here.collection}/${here.bookId}#hadith-${here.hadithId}`,
      }
    : {
        id: `hadith-book-${collection}-${bookId}`,
        type: "hadith",
        reference: bookName,
        text: `Book ${bookId}`,
        href: `/hadith/${collection}/${bookId}`,
      }

  return (
    <SaveSpotControl
      bookmark={bookmark}
      spotLabel={here ? `${bookName} · Hadith ${here.hadithNumber}` : bookName}
      className={className}
    />
  )
}

/** Articles are a single unit — the whole article is the spot. */
export function SaveArticleButton({
  category,
  slug,
  title,
  categoryLabel,
  className,
}: {
  category: string
  slug: string
  title: string
  categoryLabel: string
  className?: string
}) {
  return (
    <SaveSpotControl
      bookmark={{
        id: `article-${slug}`,
        type: "article",
        reference: title,
        text: categoryLabel,
        href: `/knowledge-base/${category}/${slug}`,
      }}
      spotLabel={title}
      className={className}
    />
  )
}
