import { getClientId } from "./client"

const API_BASE = "/api"

interface Bookmark {
  surah_number: number
  ayah_number: number
  created_at: string
}

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const clientId = getClientId()
  if (!clientId) return []
  const data = await apiRequest<{ bookmarks: Bookmark[] }>(
    `/bookmarks?client_id=${encodeURIComponent(clientId)}`,
  )
  return data.bookmarks
}

export async function addBookmark(surahNumber: number, ayahNumber: number): Promise<void> {
  const clientId = getClientId()
  if (!clientId) return
  await apiRequest("/bookmarks", {
    method: "POST",
    body: JSON.stringify({ client_id: clientId, surah_number: surahNumber, ayah_number: ayahNumber }),
  })
}

export async function removeBookmark(surahNumber: number, ayahNumber: number): Promise<void> {
  const clientId = getClientId()
  if (!clientId) return
  await apiRequest("/bookmarks", {
    method: "DELETE",
    body: JSON.stringify({ client_id: clientId, surah_number: surahNumber, ayah_number: ayahNumber }),
  })
}

export async function isBookmarked(surahNumber: number, ayahNumber: number): Promise<boolean> {
  const bookmarks = await getBookmarks()
  return bookmarks.some((b) => b.surah_number === surahNumber && b.ayah_number === ayahNumber)
}
