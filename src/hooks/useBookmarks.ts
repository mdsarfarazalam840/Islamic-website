"use client"

import { useCallback, useSyncExternalStore } from "react"
import { getAllSurahs } from "@/lib/quran/surahs"

const STORAGE_KEY = "noor-bookmarks"

export type BookmarkKind = "ayah" | "hadith" | "article"

export interface Bookmark {
  id: string
  type: BookmarkKind
  /** Human-readable location, e.g. "Al-Baqarah · Ayah 142". */
  reference: string
  /** Short snippet shown under the reference in the saved list. */
  text: string
  /**
   * Deep link back to the saved spot, e.g. "/quran/2#ayah-149". Empty only for
   * legacy entries stored before hrefs existed that we couldn't reconstruct —
   * those render as plain text with a delete control.
   */
  href: string
  timestamp: number
}

/** A bookmark as callers supply it; the store stamps the timestamp. */
export type NewBookmark = Omit<Bookmark, "timestamp">

/**
 * Map a global ayah number (1–6236) back to its surah by walking cumulative
 * ayah counts. Only needed to rebuild links for bookmarks saved before the
 * `href` field existed — new writes carry their own href.
 */
function surahForGlobalAyah(globalAyah: number): number | null {
  if (!Number.isFinite(globalAyah) || globalAyah < 1) return null
  let seen = 0
  for (const surah of getAllSurahs()) {
    seen += surah.ayahCount
    if (globalAyah <= seen) return surah.number
  }
  return null
}

/**
 * Best-effort link for a bookmark stored before `href` was persisted. Ayahs are
 * fully recoverable from the global number in their id; hadith ids carry the
 * collection but not the book, so those land on the collection page.
 */
function legacyHref(id: string, type: BookmarkKind): string {
  if (type === "ayah") {
    const globalAyah = Number(id.slice("ayah-".length))
    const surahNumber = surahForGlobalAyah(globalAyah)
    return surahNumber ? `/quran/${surahNumber}#ayah-${globalAyah}` : ""
  }
  if (type === "hadith") {
    // id shape: "hadith-{collection}-{number}"
    const collection = id.split("-")[1]
    return collection ? `/hadith/${collection}` : ""
  }
  return ""
}

function getBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as Bookmark[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((b) => ({ ...b, href: b.href || legacyHref(b.id, b.type) }))
      .sort((a, b) => b.timestamp - a.timestamp)
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

const EMPTY: Bookmark[] = []

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks],
  )

  const toggleBookmark = useCallback((bookmark: NewBookmark) => {
    const current = getBookmarks()
    const existing = current.findIndex((b) => b.id === bookmark.id)
    if (existing >= 0) {
      current.splice(existing, 1)
    } else {
      current.push({ ...bookmark, timestamp: Date.now() })
    }
    setBookmarks(current)
  }, [])

  const removeBookmark = useCallback((id: string) => {
    const current = getBookmarks()
    setBookmarks(current.filter((b) => b.id !== id))
  }, [])

  const clearBookmarks = useCallback(() => {
    setBookmarks([])
  }, [])

  return { bookmarks, isBookmarked, toggleBookmark, removeBookmark, clearBookmarks }
}
