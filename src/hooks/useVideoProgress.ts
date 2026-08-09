"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "noor-video-progress"

// Watched to within this fraction of the end counts as "completed".
const COMPLETE_THRESHOLD = 0.95

export interface VideoProgressEntry {
  seconds: number // last playback position
  duration: number // total length (from getDuration)
  completed: boolean // true once watched to ~end
  updatedAt: number
}

export type VideoProgressMap = Record<string, VideoProgressEntry>

function readProgress(): VideoProgressMap {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as VideoProgressMap) : {}
  } catch {
    return {}
  }
}

function writeProgress(map: VideoProgressMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  // Same custom event the bookmarks/reading-progress stores use — keeps same-tab
  // subscribers in sync; native "storage" covers other tabs.
  window.dispatchEvent(new Event("storage-update"))
}

/**
 * Persist playback position for a video. This is a plain function, not a hook,
 * so the caller (the player's polling loop) does NOT subscribe and won't
 * re-render as the video plays. No-ops when the position hasn't meaningfully
 * moved, keeping localStorage writes down to roughly one per poll interval.
 */
export function saveVideoProgress(
  youtubeId: string,
  next: { seconds: number; duration: number },
) {
  if (typeof window === "undefined") return
  if (!youtubeId || !(next.duration > 0)) return

  const completed = next.seconds / next.duration >= COMPLETE_THRESHOLD
  // Snap to the end so the card's bar reads full once completed.
  const seconds = completed ? next.duration : next.seconds

  const map = readProgress()
  const current = map[youtubeId]
  if (
    current &&
    current.completed === completed &&
    Math.abs(current.seconds - seconds) < 2
  ) {
    return
  }

  map[youtubeId] = { seconds, duration: next.duration, completed, updatedAt: Date.now() }
  writeProgress(map)
}

/** Clear progress for one video, or all videos when no id is given. */
export function clearVideoProgress(youtubeId?: string) {
  if (typeof window === "undefined") return
  if (!youtubeId) {
    writeProgress({})
    return
  }
  const map = readProgress()
  if (map[youtubeId]) {
    delete map[youtubeId]
    writeProgress(map)
  }
}

export function getVideoProgress(
  map: VideoProgressMap,
  youtubeId: string,
): VideoProgressEntry | undefined {
  return map[youtubeId]
}

/**
 * Read a single video's saved progress without subscribing. Used by the player
 * on open to decide whether to offer a resume prompt.
 */
export function peekVideoProgress(youtubeId: string): VideoProgressEntry | undefined {
  return readProgress()[youtubeId]
}

/** Seconds → "M:SS" (or "H:MM:SS" past an hour). */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}

function subscribe(callback: () => void) {
  window.addEventListener("storage-update", callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener("storage-update", callback)
    window.removeEventListener("storage", callback)
  }
}

let cachedSnapshot: VideoProgressMap = {}
let cachedSerialized = ""

function getSnapshot(): VideoProgressMap {
  const raw =
    typeof window === "undefined" ? "" : localStorage.getItem(STORAGE_KEY) || ""
  if (raw !== cachedSerialized) {
    cachedSerialized = raw
    cachedSnapshot = readProgress()
  }
  return cachedSnapshot
}

const EMPTY: VideoProgressMap = {}

/** Read-and-subscribe hook for surfacing watched-progress UI on cards. */
export function useVideoProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
  const clear = useCallback((youtubeId?: string) => clearVideoProgress(youtubeId), [])
  return { progress, clearVideoProgress: clear }
}
