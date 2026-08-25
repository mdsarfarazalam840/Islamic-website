"use client"

import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBookmarks, type BookmarkKind } from "@/hooks/useBookmarks"
import { cn } from "@/lib/utils"

interface BookmarkButtonProps {
  type: BookmarkKind
  id: string
  reference: string
  text: string
  /** Deep link back to the saved spot, e.g. "/quran/2#ayah-149". */
  href: string
  className?: string
}

export function BookmarkButton({ type, id, reference, text, href, className }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const active = isBookmarked(id)

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggleBookmark({ id, type, reference, text, href })}
      className={cn(active && "text-secondary", className)}
      aria-label={active ? "Remove bookmark" : `Bookmark ${reference}`}
    >
      <Bookmark className={cn("size-4", active && "fill-secondary")} />
    </Button>
  )
}
