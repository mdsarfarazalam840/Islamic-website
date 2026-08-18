"use client"

import { X } from "lucide-react"
import { useCallback, useEffect } from "react"
import { InlineYouTubePlayer } from "./InlineYouTubePlayer"

interface YouTubeEmbedProps {
  videoId: string
  title: string
  onClose: () => void
}

export function YouTubeEmbed({ videoId, title, onClose }: YouTubeEmbedProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center veil-overlay p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Playing: ${title}`}
    >
      <div className="relative w-full max-w-4xl">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex items-center gap-2 text-sm text-gold-light/80 hover:text-gold-light transition-colors"
          aria-label="Close video"
        >
          <X className="size-4" />
          Close
        </button>
        <div className="relative rounded-xl overflow-hidden bg-space-deep border border-gold-dim/20 shadow-2xl gold-shadow">
          <InlineYouTubePlayer videoId={videoId} />
        </div>
        <h3 className="text-gold-light text-lg font-medium mt-4 line-clamp-2">{title}</h3>
      </div>
    </div>
  )
}
