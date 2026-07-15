"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "noor-bookmarks"

interface Bookmark {
  id: string
  type: "ayah" | "hadith"
  reference: string
  text: string
  timestamp: number
}

function getBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setBookmarks(bookmarks: Bookmark[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
  window.dispatchEvent(new Event("storage-update"))
}

function subscribe(callback: () => void) {
  window.addEventListener("storage-update", callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener("storage-update", callback)
    window.removeEventListener("storage", callback)
  }
}

let cachedSnapshot: Bookmark[] | null = null

function getSnapshot(): Bookmark[] {
  const current = getBookmarks()
  if (
    !cachedSnapshot ||
    current.length !== cachedSnapshot.length ||
    current.some((b, i) => b.id !== cachedSnapshot![i].id || b.timestamp !== cachedSnapshot![i].timestamp)
  ) {
    cachedSnapshot = current
  }
  return cachedSnapshot
}

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(subscribe, getSnapshot, () => [])

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks],
  )

  const toggleBookmark = useCallback(
    (bookmark: Omit<Bookmark, "timestamp">) => {
      const current = getBookmarks()
      const existing = current.findIndex((b) => b.id === bookmark.id)
      if (existing >= 0) {
        current.splice(existing, 1)
      } else {
        current.push({ ...bookmark, timestamp: Date.now() })
      }
      setBookmarks(current)
    },
    [],
  )

  const removeBookmark = useCallback((id: string) => {
    const current = getBookmarks()
    setBookmarks(current.filter((b) => b.id !== id))
  }, [])

  const clearBookmarks = useCallback(() => {
    setBookmarks([])
  }, [])

  return { bookmarks, isBookmarked, toggleBookmark, removeBookmark, clearBookmarks }
}
