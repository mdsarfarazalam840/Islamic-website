"use client"

import { X } from "lucide-react"
import { useEffect, useCallback } from "react"

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
    [onClose]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Playing: ${title}`}
    >
      <div className="relative w-full max-w-4xl">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
          aria-label="Close video"
        >
          <X className="size-4" />
          Close
        </button>
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-2xl shadow-black/50">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <h3 className="text-white text-lg font-medium mt-3 line-clamp-2">{title}</h3>
      </div>
    </div>
  )
}
