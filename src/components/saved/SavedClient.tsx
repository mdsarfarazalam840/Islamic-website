"use client"

import { useState } from "react"
import { Bookmark as BookmarkIcon, Filter, X } from "lucide-react"
import { useBookmarks, type BookmarkKind } from "@/hooks/useBookmarks"
import { ContinueSection } from "./ContinueSection"
import { SavedItemCard } from "./SavedItemCard"
import { cn } from "@/lib/utils"

type FilterType = "all" | BookmarkKind

// "Learn" rather than "Knowledge" so all four chips plus "Clear all" fit on a
// 360px screen without the last one being cut off; it also matches the label the
// mobile nav uses for the same section.
const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ayah", label: "Quran" },
  { value: "hadith", label: "Hadith" },
  { value: "article", label: "Learn" },
]

/**
 * Everything the reader has kept on this device: resume positions on top, then
 * the bookmark list. All of it lives in localStorage, so this renders empty on
 * the server and fills in after hydration.
 */
export function SavedClient() {
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarks()
  const [filter, setFilter] = useState<FilterType>("all")

  const visible =
    filter === "all" ? bookmarks : bookmarks.filter((b) => b.type === filter)

  return (
    <div className="space-y-8">
      <ContinueSection heading="Pick up where you left off" />

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="size-5 text-gold-light" />
            <h2 className="text-lg font-display font-semibold text-foreground">
              Saved items
            </h2>
            {bookmarks.length > 0 && (
              <span className="rounded-lg bg-gold-dim/15 px-2 py-0.5 text-[10px] font-medium text-gold-light border border-gold-dim/20">
                {bookmarks.length}
              </span>
            )}
          </div>

          {bookmarks.length > 0 && (
            // Four filters plus "Clear all" overflow a 360px screen on one line,
            // so the filter group scrolls horizontally and the clear button sits
            // outside it where it stays reachable.
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-space-mid/20 border border-gold-dim/10 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                      filter === f.value
                        ? "bg-gold-dim/20 text-gold-light border border-gold-dim/20"
                        : "text-muted-foreground hover:text-gold-dim border border-transparent",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={clearBookmarks}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-gold-dim/10 hover:text-gold-light"
                aria-label="Remove all saved items"
              >
                <X className="size-3.5" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookmarkIcon className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-foreground">Nothing saved yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Tap the bookmark icon on any ayah or hadith, or use &ldquo;Save my
              spot&rdquo; while reading, and it will show up here.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Filter className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-foreground">
              Nothing saved in this category
            </p>
            <button
              onClick={() => setFilter("all")}
              className="mt-4 text-sm text-gold-light hover:underline"
            >
              Show all saved items
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visible.map((bookmark) => (
              <SavedItemCard
                key={bookmark.id}
                bookmark={bookmark}
                onRemove={removeBookmark}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
