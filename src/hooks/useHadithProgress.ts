"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "noor-hadith-progress"

export interface HadithProgress {
  collection: string
  collectionName: string
  bookId: number
  bookName: string
  hadithId: string // matches the `#hadith-{id}` anchor
  hadithNumber: number
  updatedAt: number
}

function readProgress(): HadithProgress | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as HadithProgress) : null
  } catch {
    return null
  }
}

function writeProgress(progress: HadithProgress | null) {
  if (progress === null) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }
  // Same custom event the bookmarks/reading-progress stores use — keeps
  // same-tab subscribers in sync; native "storage" covers other tabs.
  window.dispatchEvent(new Event("storage-update"))
}

/**
 * Persist the reader's current hadith. Called from a scroll observer, so it
 * no-ops when the position hasn't actually moved to a new hadith — that keeps
 * localStorage writes down to one per hadith change. Plain function (not a
 * hook) so the caller doesn't subscribe or re-render as the reader scrolls.
 */
export function saveHadithProgress(next: Omit<HadithProgress, "updatedAt">) {
  if (typeof window === "undefined") return
  const current = readProgress()
  if (
    current &&
    current.collection === next.collection &&
    current.bookId === next.bookId &&
    current.hadithId === next.hadithId
  ) {
    return
  }
  writeProgress({ ...next, updatedAt: Date.now() })
}

export function clearHadithProgress() {
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

let cachedSnapshot: HadithProgress | null = null

function getSnapshot(): HadithProgress | null {
  const current = readProgress()
  if (
    (current === null) !== (cachedSnapshot === null) ||
    (current &&
      cachedSnapshot &&
      (current.collection !== cachedSnapshot.collection ||
        current.bookId !== cachedSnapshot.bookId ||
        current.hadithId !== cachedSnapshot.hadithId ||
        current.updatedAt !== cachedSnapshot.updatedAt))
  ) {
    cachedSnapshot = current
  }
  return cachedSnapshot
}

/** Read-and-subscribe hook for surfacing "continue reading" UI. */
export function useHadithProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const clearProgress = useCallback(() => clearHadithProgress(), [])
  return { progress, clearProgress }
}
