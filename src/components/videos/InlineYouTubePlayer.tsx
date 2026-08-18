"use client"

import { AlertTriangle, ExternalLink, Play, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  clearVideoProgress,
  formatTime,
  peekVideoProgress,
  saveVideoProgress,
} from "@/hooks/useVideoProgress"

interface InlineYouTubePlayerProps {
  videoId: string
  /** Fired once when the video reaches its end (used to auto-advance a queue). */
  onEnded?: () => void
  /** Merged onto the aspect-video wrapper (e.g. to change rounding). */
  className?: string
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

/**
 * The bare YouTube player: an aspect-video host that the IFrame API turns into
 * an iframe, plus a resume prompt. It owns nothing about layout — no overlay,
 * no Escape handling, no body-scroll lock — so it can be dropped inside a modal
 * theater or any other container. Re-keys its player whenever `videoId` changes.
 */
export function InlineYouTubePlayer({ videoId, onEnded, className = "" }: InlineYouTubePlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [resumeAt, setResumeAt] = useState<number | null>(null)
  // Set when the IFrame API reports the video can't play here (embedding
  // disabled by the owner, removed, or private). We swap YouTube's own dead-end
  // screen for a "Watch on YouTube" fallback that keeps the video reachable.
  const [blocked, setBlocked] = useState(false)
  // Keep the latest onEnded without re-creating the player when the parent
  // passes a fresh closure each render.
  const onEndedRef = useRef(onEnded)
  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

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
              onEndedRef.current?.()
            } else {
              // PAUSED / BUFFERING / CUED — stop polling but capture position.
              stopPolling()
              persist()
            }
          },
          onError: () => {
            // Any error code (101/150 embedding disabled, 100 removed/private,
            // 2/5 unplayable) means we can't play it in-page. Stop polling and
            // reveal the "Watch on YouTube" fallback over the dead player.
            stopPolling()
            setResumeAt(null)
            setBlocked(true)
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
      // Clear any resume prompt / error state so neither lingers onto the next video.
      setResumeAt(null)
      setBlocked(false)
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
    <div className={`relative aspect-video ${className}`}>
      {/* YT.Player replaces this node with the player iframe. */}
      <div ref={hostRef} className="absolute inset-0 size-full" />

      {blocked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-space-deep p-6 text-center">
          <AlertTriangle className="size-8 text-gold-dim" aria-hidden="true" />
          <div>
            <p className="text-gold-light font-medium">This video can’t be played here</p>
            <p className="mt-1 text-sm text-gold-light/70">
              The channel has disabled off-site playback. You can still watch it on YouTube.
            </p>
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full gold-gradient-bg px-5 py-2 text-sm font-semibold text-space-deep transition-all duration-300 hover:scale-[1.03] gold-shadow-lg"
          >
            <ExternalLink className="size-4" />
            Watch on YouTube
          </a>
        </div>
      )}

      {resumeAt != null && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-space-deep/80 backdrop-blur-sm p-4 text-center">
          <p className="text-gold-light/90 text-sm">
            You left off at{" "}
            <span className="font-semibold text-gold-light">{formatTime(resumeAt)}</span>
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
  )
}
