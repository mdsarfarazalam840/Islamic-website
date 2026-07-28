"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "noor-reading-progress"

export interface ReadingProgress {
  surahNumber: number
  surahName: string
  ayahNumber: number // within-surah number, for display
  ayahId: number // global ayah number, matches the `#ayah-{id}` anchor
  updatedAt: number
}

function readProgress(): ReadingProgress | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as ReadingProgress) : null
  } catch {
    return null
  }
}

function writeProgress(progress: ReadingProgress | null) {
  if (progress === null) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }
  // Same custom event the bookmarks store uses — keeps same-tab subscribers in
  // sync; native "storage" covers other tabs.
  window.dispatchEvent(new Event("storage-update"))
}

/**
 * Persist the user's current position. Called from a scroll observer, so it
 * no-ops when the position hasn't actually moved to a new ayah — that keeps
 * localStorage writes (and subscriber re-renders) down to one per ayah change.
 * This is a plain function, not a hook, so the caller does NOT subscribe and
 * won't re-render as the reader scrolls.
 */
export function saveReadingProgress(next: Omit<ReadingProgress, "updatedAt">) {
  if (typeof window === "undefined") return
  const current = readProgress()
  if (
    current &&
    current.surahNumber === next.surahNumber &&
    current.ayahId === next.ayahId
  ) {
    return
  }
  writeProgress({ ...next, updatedAt: Date.now() })
}

export function clearReadingProgress() {
  if (typeof window === "undefined") return
  writeProgress(null)
}

function subscribe(callback: () => void) {
  window.addEventListener("storage-update", callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener("storage-update", callback)
    window.removeEventListener("storage", callback)
  }
}

let cachedSnapshot: ReadingProgress | null = null

function getSnapshot(): ReadingProgress | null {
  const current = readProgress()
  if (
    (current === null) !== (cachedSnapshot === null) ||
    (current &&
      cachedSnapshot &&
      (current.surahNumber !== cachedSnapshot.surahNumber ||
        current.ayahId !== cachedSnapshot.ayahId ||
        current.updatedAt !== cachedSnapshot.updatedAt))
  ) {
    cachedSnapshot = current
  }
  return cachedSnapshot
}

/** Read-and-subscribe hook for surfacing "continue reading" UI. */
export function useReadingProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const clearProgress = useCallback(() => clearReadingProgress(), [])
  return { progress, clearProgress }
}
