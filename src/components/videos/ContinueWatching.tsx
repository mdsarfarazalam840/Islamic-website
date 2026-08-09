"use client"

import { History, X } from "lucide-react"
import type { Video } from "@/types"
import { VideoCard } from "./VideoCard"
import {
  useVideoProgress,
  getVideoProgress,
  type VideoProgressEntry,
} from "@/hooks/useVideoProgress"

interface ContinueWatchingProps {
  videos: Video[]
  onPlay: (video: Video) => void
}

// Ignore videos barely started, and cap how many we surface.
const MIN_SECONDS = 5
const MAX_ITEMS = 4

export function ContinueWatching({ videos, onPlay }: ContinueWatchingProps) {
  const { progress, clearVideoProgress } = useVideoProgress()

  const items: { video: Video; entry: VideoProgressEntry }[] = []
  for (const video of videos) {
    const entry = getVideoProgress(progress, video.youtubeId)
    if (entry && !entry.completed && entry.seconds > MIN_SECONDS) {
      items.push({ video, entry })
    }
  }
  items.sort((a, b) => b.entry.updatedAt - a.entry.updatedAt)
  const recent = items.slice(0, MAX_ITEMS)

  if (recent.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <History className="size-5 text-gold-light" />
          <h2 className="text-lg font-display font-semibold text-foreground">
            Continue Watching
          </h2>
        </div>
        <button
          onClick={() => clearVideoProgress()}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-gold-dim/10 hover:text-gold-light"
          aria-label="Clear watch history"
        >
          <X className="size-3.5" />
          Clear all
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recent.map((item, i) => (
          <VideoCard
            key={item.video.id}
            video={item.video}
            onPlay={onPlay}
            index={i}
          />
        ))}
      </div>
    </section>
  )
}
