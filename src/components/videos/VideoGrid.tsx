"use client"

import type { Video } from "@/types"
import { VideoCard } from "./VideoCard"

interface VideoGridProps {
  videos: Video[]
  onPlay: (video: Video) => void
  isLoading?: boolean
  emptyMessage?: string
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden animate-pulse">
      <div className="aspect-video bg-surface" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-surface rounded w-3/4" />
        <div className="h-3 bg-surface rounded w-1/2" />
        <div className="flex gap-3">
          <div className="h-3 bg-surface rounded w-16" />
          <div className="h-3 bg-surface rounded w-16" />
        </div>
      </div>
    </div>
  )
}

export function VideoGrid({ videos, onPlay, isLoading, emptyMessage }: VideoGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-surface mb-4">
          <span className="text-2xl">🎬</span>
        </div>
        <p className="text-muted-foreground">
          {emptyMessage || "No videos found"}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((video, index) => (
        <VideoCard key={video.id} video={video} onPlay={onPlay} index={index} />
      ))}
    </div>
  )
}
