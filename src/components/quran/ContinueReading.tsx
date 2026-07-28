"use client"

import Link from "next/link"
import { BookOpen, X } from "lucide-react"
import { useReadingProgress } from "@/hooks/useReadingProgress"

export function ContinueReading() {
  const { progress, clearProgress } = useReadingProgress()

  if (!progress) return null

  return (
    <div className="mb-6 flex items-center gap-4 rounded-xl border border-gold-dim/20 bg-gold-dim/5 p-4">
      <Link
        href={`/quran/${progress.surahNumber}#ayah-${progress.ayahId}`}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-dim/15 border border-gold-dim/20">
          <BookOpen className="size-5 text-gold-light" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gold-light">
            Continue reading
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            Surah {progress.surahName} &middot; Ayah {progress.ayahNumber}
          </p>
        </div>
      </Link>
      <button
        onClick={clearProgress}
        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-gold-dim/10 hover:text-gold-light"
        aria-label="Clear reading progress"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
