"use client"

import Link from "next/link"
import { MessageSquareText, X } from "lucide-react"
import { useHadithProgress } from "@/hooks/useHadithProgress"

export function ContinueReadingHadith() {
  const { progress, clearProgress } = useHadithProgress()

  if (!progress) return null

  return (
    <div className="mb-8 flex items-center gap-4 rounded-xl border border-gold-dim/20 bg-gold-dim/5 p-4">
      <Link
        href={`/hadith/${progress.collection}/${progress.bookId}#hadith-${progress.hadithId}`}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-dim/15 border border-gold-dim/20">
          <MessageSquareText className="size-5 text-gold-light" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gold-light">
            Continue reading
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {progress.collectionName} &middot; {progress.bookName} &middot; Hadith{" "}
            {progress.hadithNumber}
          </p>
        </div>
      </Link>
      <button
        onClick={clearProgress}
        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-gold-dim/10 hover:text-gold-light"
        aria-label="Clear hadith reading progress"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
