"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "noor-article-progress"

export interface ArticleProgress {
  category: string
  slug: string
  title: string
  updatedAt: number
}

function readProgress(): ArticleProgress | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as ArticleProgress) : null
  } catch {
    return null
  }
}

function writeProgress(progress: ArticleProgress | null) {
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
 * Record the article the reader last opened. Articles are short enough to read
 * in one screenful or two, so unlike the Quran and hadith readers there's no
 * scroll observer — opening the article is the whole signal. No-ops when it's
 * already the stored article, keeping writes to one per article visited.
 */
export function saveArticleProgress(next: Omit<ArticleProgress, "updatedAt">) {
  if (typeof window === "undefined") return
  const current = readProgress()
  if (current && current.slug === next.slug) return
  writeProgress({ ...next, updatedAt: Date.now() })
}

export function clearArticleProgress() {
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

let cachedSnapshot: ArticleProgress | null = null

function getSnapshot(): ArticleProgress | null {
  const current = readProgress()
  if (
    (current === null) !== (cachedSnapshot === null) ||
    (current &&
      cachedSnapshot &&
      (current.slug !== cachedSnapshot.slug ||
        current.updatedAt !== cachedSnapshot.updatedAt))
  ) {
    cachedSnapshot = current
  }
  return cachedSnapshot
}

/** Read-and-subscribe hook for surfacing "continue reading" UI. */
export function useArticleProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const clearProgress = useCallback(() => clearArticleProgress(), [])
  return { progress, clearProgress }
}
