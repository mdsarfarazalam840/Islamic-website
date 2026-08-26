"use client"

import { motion } from "framer-motion"
import { Play, Eye, Clock, Check } from "lucide-react"
import type { Video } from "@/types"
import { formatViewCount, formatPublishedAt } from "@/lib/youtube/api"
import { useVideoProgress, getVideoProgress } from "@/hooks/useVideoProgress"

interface VideoCardProps {
  video: Video
  onPlay: (video: Video) => void
  index?: number
}

export function VideoCard({ video, onPlay, index = 0 }: VideoCardProps) {
  const { progress } = useVideoProgress()
  const entry = getVideoProgress(progress, video.youtubeId)
  const watchedPct =
    entry && entry.duration > 0
      ? Math.min(100, Math.round((entry.seconds / entry.duration) * 100))
      : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="group cursor-pointer rounded-xl border border-border/20 bg-card/40 overflow-hidden transition-all duration-300 hover:border-gold-dim/30 hover:gold-shadow"
      onClick={() => onPlay(video)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPlay(video) }}
      aria-label={`Play ${video.title}`}
    >
      <div className="relative aspect-video bg-space-mid/30 overflow-hidden">
        {/* Remote YouTube thumbnail: the static export has no image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnail}
          alt={video.title}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/images/icons/favicon.svg"
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-space-deep/0 transition-all duration-500 group-hover:bg-space-deep/50">
          <div className="flex size-14 items-center justify-center rounded-full gold-gradient-bg text-space-deep opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110 gold-shadow-lg">
            <Play className="size-6 fill-current ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 rounded-md bg-space-deep/90 px-2 py-0.5 text-xs text-gold-light border border-gold-dim/20">
          {video.duration}
        </div>
        <div className="absolute top-2 left-2 rounded-md bg-gold-dim/90 px-2 py-0.5 text-xs font-medium text-space-deep">
          {video.category}
        </div>
        {entry?.completed && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-emerald/90 px-2 py-0.5 text-xs font-medium text-space-deep">
            <Check className="size-3" />
            Watched
          </div>
        )}
        {watchedPct > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-space-deep/60">
            <div
              className="h-full gold-gradient-bg"
              style={{ width: `${watchedPct}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-gold-light transition-colors duration-300">
          {video.title}
        </h3>
        <p className="text-xs text-gold-dim/70">{video.scholarName}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="size-3" />
            {formatViewCount(video.views)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatPublishedAt(video.publishedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
