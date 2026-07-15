"use client"

import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBookmarks } from "@/hooks/useBookmarks"
import { cn } from "@/lib/utils"

interface BookmarkButtonProps {
  type: "ayah" | "hadith"
  id: string
  reference: string
  text: string
  className?: string
}

export function BookmarkButton({ type, id, reference, text, className }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const active = isBookmarked(id)

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggleBookmark({ id, type, reference, text })}
      className={cn(active && "text-secondary", className)}
      aria-label={active ? "Remove bookmark" : `Bookmark ${reference}`}
    >
      <Bookmark className={cn("size-4", active && "fill-secondary")} />
    </Button>
  )
}
