"use client"

import { X, Play, RotateCcw } from "lucide-react"
import { useEffect, useCallback, useRef, useState } from "react"
import {
  saveVideoProgress,
  clearVideoProgress,
  peekVideoProgress,
  formatTime,
} from "@/hooks/useVideoProgress"

interface YouTubeEmbedProps {
  videoId: string
  title: string
  onClose: () => void
}

// Don't offer to resume from a position this close to the start — just play.
const RESUME_MIN_SECONDS = 5
// How often we poll the player for its current position while playing.
const SAVE_INTERVAL_MS = 5000

// Module-level singleton: inject the IFrame API script once and share the
// ready promise across every player instance / re-mount.
let apiPromise: Promise<void> | null = null

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.YT && window.YT.Player) return Promise.resolve()
  if (apiPromise) return apiPromise

  apiPromise = new Promise<void>((resolve) => {
    // Chain onto any handler the API may already expect.
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      document.head.appendChild(tag)
    }
  })
  return apiPromise
}

export function YouTubeEmbed({ videoId, title, onClose }: YouTubeEmbedProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [resumeAt, setResumeAt] = useState<number | null>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [handleKeyDown])

  // Persist the current position, guarding against a not-yet-ready player.
  const persist = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    try {
      saveVideoProgress(videoId, {
        seconds: player.getCurrentTime(),
        duration: player.getDuration(),
      })
    } catch {
      /* player torn down mid-call — ignore */
    }
  }, [videoId])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    intervalRef.current = setInterval(persist, SAVE_INTERVAL_MS)
  }, [persist, stopPolling])

  // Create the player once the API is ready; tear it down on unmount / id change.
  useEffect(() => {
    let cancelled = false

    loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return

      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 0, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: (event) => {
            const saved = peekVideoProgress(videoId)
            if (saved && !saved.completed && saved.seconds > RESUME_MIN_SECONDS) {
              // Leave paused and let the user choose (Resume / Start over).
              setResumeAt(saved.seconds)
            } else {
              event.target.playVideo()
            }
          },
          onStateChange: (event) => {
            const state = event.data
            const YT = window.YT
            if (!YT) return
            if (state === YT.PlayerState.PLAYING) {
              startPolling()
            } else if (state === YT.PlayerState.ENDED) {
              stopPolling()
              // Force a completed save (snap to end).
              try {
                saveVideoProgress(videoId, {
                  seconds: event.target.getDuration(),
                  duration: event.target.getDuration(),
                })
              } catch {
                /* ignore */
              }
            } else {
              // PAUSED / BUFFERING / CUED — stop polling but capture position.
              stopPolling()
              persist()
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      stopPolling()
      persist()
      try {
        playerRef.current?.destroy()
      } catch {
        /* already gone */
      }
      playerRef.current = null
    }
  }, [videoId, startPolling, stopPolling, persist])

  const handleResume = () => {
    const player = playerRef.current
    if (player && resumeAt != null) {
      player.seekTo(resumeAt, true)
      player.playVideo()
    }
    setResumeAt(null)
  }

  const handleStartOver = () => {
    const player = playerRef.current
    if (player) {
      player.seekTo(0, true)
      player.playVideo()
    }
    clearVideoProgress(videoId)
    setResumeAt(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center veil-overlay p-4"
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
          <div className="relative aspect-video">
            {/* YT.Player replaces this node with the player iframe. */}
            <div ref={hostRef} className="absolute inset-0 size-full" />

            {resumeAt != null && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-space-deep/80 backdrop-blur-sm p-4 text-center">
                <p className="text-gold-light/90 text-sm">
                  You left off at{" "}
                  <span className="font-semibold text-gold-light">
                    {formatTime(resumeAt)}
                  </span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handleResume}
                    className="flex items-center gap-2 rounded-full gold-gradient-bg px-5 py-2 text-sm font-semibold text-space-deep transition-all duration-300 hover:scale-[1.03] gold-shadow-lg"
                  >
                    <Play className="size-4 fill-current" />
                    Resume from {formatTime(resumeAt)}
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="flex items-center gap-2 rounded-full border border-gold-dim/30 px-5 py-2 text-sm font-medium text-gold-light/90 transition-colors hover:text-gold-light hover:border-gold-dim/50"
                  >
                    <RotateCcw className="size-4" />
                    Start over
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <h3 className="text-gold-light text-lg font-medium mt-4 line-clamp-2">{title}</h3>
      </div>
    </div>
  )
}
