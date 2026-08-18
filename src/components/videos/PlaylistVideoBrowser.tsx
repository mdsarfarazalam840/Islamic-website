"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, ImageOff, ListVideo, Play, X } from "lucide-react"
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { InlineYouTubePlayer } from "@/components/videos/InlineYouTubePlayer"
import { cn } from "@/lib/utils"
import type { Playlist } from "@/types"

interface PlaylistVideoBrowserProps {
  playlist: Playlist
  onClose: () => void
}

function Thumbnail({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(!src)

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-space-mid/70", className)}>
        <ImageOff className="size-5 text-gold-dim/50" aria-hidden="true" />
      </div>
    )
  }

  return (
    // YouTube thumbnails are remote and use an inline fallback on failure.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      draggable={false}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  )
}

export function PlaylistVideoBrowser({ playlist, onClose }: PlaylistVideoBrowserProps) {
  const videos = playlist.videos
  const [activeVideoId, setActiveVideoId] = useState(videos[0]?.youtubeId ?? "")
  const [isPlaying, setIsPlaying] = useState(false)
  const reduceMotion = useReducedMotion()

  const titleRef = useRef<HTMLHeadingElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const activeIndex = useMemo(() => {
    const index = videos.findIndex((video) => video.youtubeId === activeVideoId)
    return index >= 0 ? index : 0
  }, [videos, activeVideoId])
  const activeVideo = videos[activeIndex]

  const select = useCallback((youtubeId: string, play: boolean) => {
    setActiveVideoId(youtubeId)
    if (play) setIsPlaying(true)
  }, [])

  const step = useCallback(
    (delta: number) => {
      const next = activeIndex + delta
      if (next < 0 || next >= videos.length) return
      setActiveVideoId(videos[next].youtubeId)
    },
    [activeIndex, videos],
  )

  // When a video finishes, roll on to the next one (staying in the player);
  // drop back to the poster once the queue is exhausted.
  const handleEnded = useCallback(() => {
    if (activeIndex < videos.length - 1) {
      setActiveVideoId(videos[activeIndex + 1].youtubeId)
    } else {
      setIsPlaying(false)
    }
  }, [activeIndex, videos])

  const closeBrowser = useEffectEvent(() => onClose())

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    titleRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeBrowser()
    }
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [])

  return (
    <div
      // Above the site header / bottom nav (z-50) so nothing overlaps the theater.
      className="fixed inset-0 z-[60] flex items-center justify-center veil-overlay p-2 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-browser-title"
    >
      <div className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gold-dim/25 bg-space-deep shadow-2xl gold-shadow sm:max-h-[calc(100dvh-2rem)]">
        <header className="shrink-0 border-b border-gold-dim/15 px-4 py-4 pr-14 sm:px-6">
          <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gold-dim">
            <ListVideo className="size-4" aria-hidden="true" />
            Playlist
          </p>
          <h2
            id="playlist-browser-title"
            ref={titleRef}
            tabIndex={-1}
            className="line-clamp-2 text-lg font-semibold text-gold-light outline-none sm:text-xl"
          >
            {playlist.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close playlist video browser"
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full border border-gold-dim/25 text-gold-light/80 transition-colors hover:bg-gold-dim/10 hover:text-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light sm:right-4 sm:top-4"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        {!activeVideo ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-gold-dim/20 bg-space-mid/40">
              <ListVideo className="size-7 text-gold-dim/60" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-foreground">No videos available</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              This playlist does not currently contain any videos.
            </p>
          </div>
        ) : (
          // Below `lg` this is the ONE scroll region: video, meta and the full
          // queue flow inside it and scroll together, so nothing can collapse on
          // short/scaled viewports. At `lg` it becomes a fixed two-pane row and
          // each pane owns its own scroll (see the min-h-0 chains below).
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:flex-row lg:gap-6 lg:overflow-hidden">
            {/* Stage — the video plays inline right here. */}
            <div className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
              <div className="overflow-hidden rounded-xl border-2 border-gold-dim/35 bg-space-mid shadow-2xl gold-shadow">
                {isPlaying ? (
                  <InlineYouTubePlayer
                    key={activeVideo.youtubeId}
                    videoId={activeVideo.youtubeId}
                    onEnded={handleEnded}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    aria-label={`Play ${activeVideo.title}`}
                    className="group relative block aspect-video w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light"
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.div
                        key={activeVideo.youtubeId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0.1 : 0.3 }}
                        className="absolute inset-0"
                      >
                        <Thumbnail src={activeVideo.thumbnail} className="size-full" />
                      </motion.div>
                    </AnimatePresence>
                    <span className="absolute inset-0 bg-gradient-to-t from-space-deep/80 via-space-deep/10 to-transparent" aria-hidden="true" />
                    <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                      <span className="flex size-16 items-center justify-center rounded-full gold-gradient-bg text-space-deep shadow-lg transition-transform duration-300 group-hover:scale-110">
                        <Play className="size-7 translate-x-0.5 fill-current" />
                      </span>
                    </span>
                    <span className="absolute bottom-0 right-0 px-4 pb-3 font-mono text-xs text-gold-light/85" aria-hidden="true">
                      {activeIndex + 1} / {videos.length}
                    </span>
                  </button>
                )}
              </div>

              <div className="mt-4 min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold-dim">
                  Video {activeIndex + 1}
                </p>
                <h3 className="mt-1.5 line-clamp-2 text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  {activeVideo.title}
                </h3>
                {activeVideo.duration && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{activeVideo.duration}</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={activeIndex === 0}
                  aria-label="Previous video"
                  className="flex size-11 items-center justify-center rounded-full border border-gold-dim/30 text-gold-light transition-colors hover:bg-gold-dim/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={activeIndex === videos.length - 1}
                  aria-label="Next video"
                  className="flex size-11 items-center justify-center rounded-full border border-gold-dim/30 text-gold-light transition-colors hover:bg-gold-dim/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
                {!isPlaying && (
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="ml-1 flex min-h-11 items-center gap-2 rounded-full gold-gradient-bg px-5 py-2 text-sm font-semibold text-space-deep transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light gold-shadow"
                  >
                    <Play className="size-4 fill-current" aria-hidden="true" />
                    Play video
                  </button>
                )}
              </div>
            </div>

            {/* Queue — every video in the playlist. */}
            <div className="flex min-w-0 flex-col lg:min-h-0 lg:w-80 lg:shrink-0 lg:overflow-hidden lg:border-l lg:border-gold-dim/10 lg:pl-6 xl:w-96">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-foreground">Up next</h3>
                <span className="text-xs text-muted-foreground">
                  {videos.length} {videos.length === 1 ? "video" : "videos"}
                </span>
              </div>
              <ol
                className="space-y-2 pr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain"
                aria-label="Playlist videos"
              >
                {videos.map((video, index) => {
                  const isActive = video.youtubeId === activeVideoId
                  const nowPlaying = isActive && isPlaying
                  return (
                    <li key={video.youtubeId}>
                      <button
                        type="button"
                        onClick={() => select(video.youtubeId, true)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light",
                          isActive
                            ? "border-gold-dim/45 bg-gold-dim/10"
                            : "border-border/15 bg-space-mid/20 hover:border-gold-dim/25 hover:bg-space-mid/40",
                        )}
                      >
                        <span className="relative shrink-0">
                          <Thumbnail
                            src={video.thumbnail}
                            className="aspect-video w-28 rounded-md sm:w-32"
                          />
                          {nowPlaying && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-md bg-space-deep/55">
                              <span className="flex items-end gap-0.5" aria-hidden="true">
                                <span className="w-1 animate-pulse rounded-full bg-gold-light" style={{ height: "0.55rem" }} />
                                <span className="w-1 animate-pulse rounded-full bg-gold-light [animation-delay:150ms]" style={{ height: "0.9rem" }} />
                                <span className="w-1 animate-pulse rounded-full bg-gold-light [animation-delay:300ms]" style={{ height: "0.65rem" }} />
                              </span>
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="mb-1 block text-xs text-gold-dim">
                            {index + 1} of {videos.length}
                          </span>
                          <span
                            className={cn(
                              "line-clamp-2 text-sm font-medium leading-snug",
                              isActive ? "text-gold-light" : "text-foreground group-hover:text-gold-light",
                            )}
                          >
                            {video.title}
                          </span>
                          {nowPlaying ? (
                            <span className="mt-1 block text-xs font-medium text-gold-light">Now playing</span>
                          ) : (
                            video.duration && (
                              <span className="mt-1 block text-xs text-muted-foreground">{video.duration}</span>
                            )
                          )}
                        </span>
                        {!nowPlaying && (
                          <Play
                            className={cn(
                              "mr-1 hidden size-4 shrink-0 sm:block",
                              isActive
                                ? "fill-current text-gold-light"
                                : "text-gold-dim/50 group-hover:text-gold-light",
                            )}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
