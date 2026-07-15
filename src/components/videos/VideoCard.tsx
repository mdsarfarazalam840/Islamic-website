"use client"

import { motion } from "framer-motion"
import { Play, Eye, Clock } from "lucide-react"
import type { Video } from "@/types"
import { formatViewCount, formatPublishedAt } from "@/lib/youtube/api"

interface VideoCardProps {
  video: Video
  onPlay: (video: Video) => void
  index?: number
}

export function VideoCard({ video, onPlay, index = 0 }: VideoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="group cursor-pointer rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/5"
      onClick={() => onPlay(video)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPlay(video) }}
      aria-label={`Play ${video.title}`}
    >
      <div className="relative aspect-video bg-surface overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/images/icons/favicon.svg"
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/40">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary/90 text-background opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110">
            <Play className="size-5 fill-current ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-xs text-white">
          {video.duration}
        </div>
        <div className="absolute top-2 left-2 rounded-md bg-secondary/90 px-2 py-0.5 text-xs font-medium text-background">
          {video.category}
        </div>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-secondary transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground">{video.scholarName}</p>
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
