"use client"

import { motion } from "framer-motion"
import { Play, ListVideo } from "lucide-react"
import type { Playlist } from "@/types"

interface PlaylistCardProps {
  playlist: Playlist
  onPlay: (playlist: Playlist) => void
  index?: number
}

export function PlaylistCard({ playlist, onPlay, index = 0 }: PlaylistCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="group cursor-pointer rounded-xl border border-border/20 bg-card/40 overflow-hidden transition-all duration-300 hover:border-gold-dim/30 hover:gold-shadow"
      onClick={() => onPlay(playlist)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPlay(playlist) }}
      aria-label={`Play playlist ${playlist.title}`}
    >
      <div className="relative aspect-video bg-space-mid/30 overflow-hidden">
        {/* Stacked-card effect behind the thumbnail hints "this is a playlist". */}
        <div className="absolute inset-x-2 -top-1 h-2 rounded-t-md bg-space-mid/60" />
        <div className="absolute inset-x-1 top-0 h-2 rounded-t-md bg-space-mid/80" />
        {playlist.thumbnail ? (
          <img
            src={playlist.thumbnail}
            alt={playlist.title}
            className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/icons/favicon.svg"
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ListVideo className="size-10 text-gold-dim/40" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-space-deep/0 transition-all duration-500 group-hover:bg-space-deep/50">
          <div className="flex size-14 items-center justify-center rounded-full gold-gradient-bg text-space-deep opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110 gold-shadow-lg">
            <Play className="size-6 fill-current ml-0.5" />
          </div>
        </div>
        {/* Video-count badge, styled to match VideoCard's duration badge. */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-space-deep/90 px-2 py-0.5 text-xs text-gold-light border border-gold-dim/20">
          <ListVideo className="size-3" />
          {playlist.videoCount > 0 ? `${playlist.videoCount} videos` : "Playlist"}
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-gold-light transition-colors duration-300">
          {playlist.title}
        </h3>
        <p className="text-xs text-gold-dim/70">{playlist.scholarName}</p>
      </div>
    </motion.div>
  )
}
