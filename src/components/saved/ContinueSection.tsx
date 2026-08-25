"use client"

import Link from "next/link"
import { BookOpen, MessageSquareText, Library, Video, X, History } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useReadingProgress } from "@/hooks/useReadingProgress"
import { useHadithProgress } from "@/hooks/useHadithProgress"
import { useArticleProgress } from "@/hooks/useArticleProgress"
import { useVideoProgress, formatTime } from "@/hooks/useVideoProgress"
import { formatRelativeTime } from "@/lib/utils"

interface ResumeRow {
  key: string
  icon: LucideIcon
  href: string
  label: string
  detail: string
  updatedAt: number
  onDismiss: () => void
  dismissLabel: string
}

interface ContinueSectionProps {
  /** Section heading; omit to render the rows bare (e.g. on the home page). */
  heading?: string
  className?: string
}

/**
 * Every "pick up where you left off" position in one list — Quran, hadith,
 * knowledge article, and video — newest first. The per-section pages keep their
 * own focused cards (ContinueReading, ContinueReadingHadith, ContinueWatching);
 * this is the cross-cutting view for /saved and the home page.
 */
export function ContinueSection({ heading, className }: ContinueSectionProps) {
  const { progress: quran, clearProgress: clearQuran } = useReadingProgress()
  const { progress: hadith, clearProgress: clearHadith } = useHadithProgress()
  const { progress: article, clearProgress: clearArticle } = useArticleProgress()
  const { progress: videos, clearVideoProgress } = useVideoProgress()

  const rows: ResumeRow[] = []

  if (quran) {
    rows.push({
      key: "quran",
      icon: BookOpen,
      href: `/quran/${quran.surahNumber}#ayah-${quran.ayahId}`,
      label: "Continue reading",
      detail: `Surah ${quran.surahName} · Ayah ${quran.ayahNumber}`,
      updatedAt: quran.updatedAt,
      onDismiss: clearQuran,
      dismissLabel: "Clear Quran reading progress",
    })
  }

  if (hadith) {
    rows.push({
      key: "hadith",
      icon: MessageSquareText,
      href: `/hadith/${hadith.collection}/${hadith.bookId}#hadith-${hadith.hadithId}`,
      label: "Continue reading",
      detail: `${hadith.collectionName} · ${hadith.bookName} · Hadith ${hadith.hadithNumber}`,
      updatedAt: hadith.updatedAt,
      onDismiss: clearHadith,
      dismissLabel: "Clear hadith reading progress",
    })
  }

  if (article) {
    rows.push({
      key: "article",
      icon: Library,
      href: `/knowledge-base/${article.category}/${article.slug}`,
      label: "Continue learning",
      detail: article.title,
      updatedAt: article.updatedAt,
      onDismiss: clearArticle,
      dismissLabel: "Clear knowledge base progress",
    })
  }

  // The video store keeps every video watched; surface only the most recent
  // unfinished one. /videos already renders the full Continue Watching grid.
  let latestVideoId: string | null = null
  let latestVideo: (typeof videos)[string] | null = null
  for (const [youtubeId, entry] of Object.entries(videos)) {
    if (entry.completed || entry.seconds <= 5) continue
    if (!latestVideo || entry.updatedAt > latestVideo.updatedAt) {
      latestVideo = entry
      latestVideoId = youtubeId
    }
  }
  if (latestVideo && latestVideoId) {
    const entry = latestVideo
    const id = latestVideoId
    rows.push({
      key: "video",
      icon: Video,
      href: "/videos",
      label: "Continue watching",
      detail: `Stopped at ${formatTime(entry.seconds)} of ${formatTime(entry.duration)}`,
      updatedAt: entry.updatedAt,
      onDismiss: () => clearVideoProgress(id),
      dismissLabel: "Clear video progress",
    })
  }

  if (rows.length === 0) return null

  rows.sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <section className={className}>
      {heading && (
        <div className="flex items-center gap-2 mb-4">
          <History className="size-5 text-gold-light" />
          <h2 className="text-lg font-display font-semibold text-foreground">{heading}</h2>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map(({ key, icon: Icon, href, label, detail, updatedAt, onDismiss, dismissLabel }) => (
          <div
            key={key}
            className="flex items-center gap-4 rounded-xl border border-gold-dim/20 bg-gold-dim/5 p-4"
          >
            <Link href={href} className="flex flex-1 items-center gap-4 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-dim/15 border border-gold-dim/20">
                <Icon className="size-5 text-gold-light" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gold-light">
                  {label}
                </p>
                <p className="truncate text-sm font-medium text-foreground">{detail}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatRelativeTime(updatedAt)}
                </p>
              </div>
            </Link>
            <button
              onClick={onDismiss}
              className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-gold-dim/10 hover:text-gold-light"
              aria-label={dismissLabel}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
