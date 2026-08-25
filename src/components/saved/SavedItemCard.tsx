"use client"

import Link from "next/link"
import { BookOpen, MessageSquareText, Library, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Bookmark, BookmarkKind } from "@/hooks/useBookmarks"
import { formatRelativeTime } from "@/lib/utils"

const icons: Record<BookmarkKind, LucideIcon> = {
  ayah: BookOpen,
  hadith: MessageSquareText,
  article: Library,
}

interface SavedItemCardProps {
  bookmark: Bookmark
  onRemove: (id: string) => void
}

/**
 * One saved item. Bookmarks written before hrefs were stored may not be
 * resolvable to a URL — those render as plain text so the reader can still see
 * and delete them rather than tapping a dead link.
 */
export function SavedItemCard({ bookmark, onRemove }: SavedItemCardProps) {
  const Icon = icons[bookmark.type] ?? BookOpen

  const body = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-dim/10 border border-gold-dim/20">
        <Icon className="size-5 text-gold-light" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{bookmark.reference}</p>
        {bookmark.text && (
          <p className="truncate text-xs text-muted-foreground mt-0.5">{bookmark.text}</p>
        )}
        <p className="text-[11px] text-gold-dim/60 mt-1">
          Saved {formatRelativeTime(bookmark.timestamp)}
        </p>
      </div>
    </>
  )

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/20 bg-card/40 p-4 transition-all duration-300 hover:border-gold-dim/25 hover:bg-card/60">
      {bookmark.href ? (
        <Link href={bookmark.href} className="flex flex-1 items-center gap-4 min-w-0">
          {body}
        </Link>
      ) : (
        <div className="flex flex-1 items-center gap-4 min-w-0">{body}</div>
      )}
      <button
        onClick={() => onRemove(bookmark.id)}
        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-gold-dim/10 hover:text-gold-light"
        aria-label={`Remove ${bookmark.reference} from saved`}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
