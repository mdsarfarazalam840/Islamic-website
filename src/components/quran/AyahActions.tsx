"use client"

import { useState, useCallback } from "react"
import { Bookmark, Copy, Share2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBookmarks } from "@/hooks/useBookmarks"
import type { Ayah, Surah } from "@/types"

interface AyahActionsProps {
  ayah: Ayah
  surah: Surah
}

export function AyahActions({ ayah, surah }: AyahActionsProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  const bookmarkId = `ayah-${ayah.number}`

  const handleCopy = useCallback(async () => {
    const text = `${ayah.arabic}\n\n${ayah.translations.en}\n\n— ${surah.name} ${ayah.ayahNumber}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [ayah, surah])

  const handleShare = useCallback(async () => {
    const text = `${ayah.arabic}\n\n${ayah.translations.en}\n\n— ${surah.name} ${ayah.ayahNumber}\n\nhttps://noor-quran.vercel.app/quran/${surah.number}#ayah-${ayah.number}`
    try {
      if (navigator.share) {
        await navigator.share({ title: surah.name, text })
        return
      }
    } catch {
      // User cancelled
    }
    await navigator.clipboard.writeText(text)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }, [ayah, surah])

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={() =>
          toggleBookmark({
            id: bookmarkId,
            type: "ayah",
            reference: `${surah.name} ${ayah.ayahNumber}`,
            text: ayah.translations.en.slice(0, 100),
          })
        }
        className={cn(
          "rounded-lg p-2 transition-all duration-200",
          isBookmarked(bookmarkId)
            ? "text-secondary bg-secondary/10"
            : "text-muted-foreground hover:text-secondary hover:bg-secondary/5",
        )}
        aria-label={isBookmarked(bookmarkId) ? "Remove bookmark" : "Bookmark this ayah"}
      >
        <Bookmark className={cn("size-4", isBookmarked(bookmarkId) && "fill-secondary")} />
      </button>

      <button
        onClick={handleCopy}
        className="rounded-lg p-2 text-muted-foreground hover:text-secondary hover:bg-secondary/5 transition-all duration-200"
        aria-label="Copy ayah"
      >
        {copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
      </button>

      <button
        onClick={handleShare}
        className="rounded-lg p-2 text-muted-foreground hover:text-secondary hover:bg-secondary/5 transition-all duration-200"
        aria-label="Share ayah"
      >
        {shared ? <Check className="size-4 text-accent" /> : <Share2 className="size-4" />}
      </button>
    </div>
  )
}
