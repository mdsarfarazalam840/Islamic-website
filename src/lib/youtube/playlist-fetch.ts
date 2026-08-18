import type { Playlist, PlaylistVideo } from "@/types"
import { durationSeconds, mergePlaylistVideos } from "./playlist-parser"

// A playlist is kept only when it contains at least one long-form video. Every
// video inside a kept playlist is shown regardless of length (parseRenderer /
// parseLockup no longer filter by duration) — but a playlist made *entirely* of
// short clips (e.g. a channel's "Shorts" playlist) is dropped so the Playlists
// tab stays long-form, mirroring the videos grid. "Mixed" playlists (>= 1
// long-form video) are retained in full.
const MIN_LONG_FORM_SECONDS = 61

export function playlistHasLongForm(playlist: Playlist, minSeconds = MIN_LONG_FORM_SECONDS): boolean {
  return playlist.videos.some((video) => durationSeconds(video.duration) >= minSeconds)
}

export function normalizePlaylist(value: unknown): Playlist | null {
  if (!value || typeof value !== "object") return null
  const playlist = value as Partial<Playlist>
  if (
    typeof playlist.id !== "string"
    || typeof playlist.playlistId !== "string"
    || typeof playlist.title !== "string"
    || typeof playlist.scholarId !== "string"
    || typeof playlist.scholarName !== "string"
    || typeof playlist.thumbnail !== "string"
    || typeof playlist.videoCount !== "number"
    || typeof playlist.firstVideoId !== "string"
  ) {
    return null
  }

  return {
    ...playlist,
    videos: Array.isArray(playlist.videos) ? playlist.videos : [],
  } as Playlist
}

export interface ParsedPlaylistPage {
  videos: PlaylistVideo[]
  continuationTokens: string[]
}

interface YouTubeConfig {
  initialData: unknown
  apiKey?: string
  context?: Record<string, unknown>
}

function extractJsonAfter(source: string, marker: string): unknown {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error(`${marker} not found`)
  const start = source.indexOf("{", markerIndex + marker.length)
  if (start < 0) throw new Error(`${marker} JSON not found`)

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < source.length; index++) {
    const char = source[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === "{") depth++
    else if (char === "}" && --depth === 0) return JSON.parse(source.slice(start, index + 1))
  }
  throw new Error(`${marker} JSON is incomplete`)
}

export function extractYouTubeConfig(html: string): YouTubeConfig {
  const initialData = extractJsonAfter(html, "ytInitialData")
  const config: Record<string, unknown> = {}
  let offset = 0
  while (offset < html.length) {
    const index = html.indexOf("ytcfg.set(", offset)
    if (index < 0) break
    try {
      Object.assign(config, extractJsonAfter(html.slice(index), "ytcfg.set("))
    } catch {
      // The initial page remains useful even when continuations are unavailable.
    }
    offset = index + 10
  }
  return {
    initialData,
    apiKey: typeof config.INNERTUBE_API_KEY === "string" ? config.INNERTUBE_API_KEY : undefined,
    context: config.INNERTUBE_CONTEXT && typeof config.INNERTUBE_CONTEXT === "object"
      ? config.INNERTUBE_CONTEXT as Record<string, unknown>
      : undefined,
  }
}

export async function collectPlaylistVideos(
  initialPage: ParsedPlaylistPage,
  fetchContinuation: (token: string) => Promise<ParsedPlaylistPage>,
  maxContinuationPages: number,
): Promise<PlaylistVideo[]> {
  const pages = [initialPage.videos]
  const pending = [...initialPage.continuationTokens]
  const seenTokens = new Set<string>()
  let fetched = 0

  while (pending.length > 0 && fetched < maxContinuationPages) {
    const token = pending.shift()!
    if (seenTokens.has(token)) continue
    seenTokens.add(token)
    const page = await fetchContinuation(token)
    pages.push(page.videos)
    pending.push(...page.continuationTokens.filter((next) => !seenTokens.has(next)))
    fetched++
  }
  return mergePlaylistVideos(pages)
}

interface RetryOptions {
  retries: number
  sleep?: (ms: number) => Promise<void>
  random?: () => number
  baseDelayMs?: number
}

function retryAfterMs(response: Response): number | undefined {
  const value = response.headers.get("Retry-After")
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now())
}

export async function fetchWithRetry(
  request: () => Promise<Response>,
  options: RetryOptions,
): Promise<Response> {
  const wait = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const random = options.random ?? Math.random
  const baseDelay = options.baseDelayMs ?? 1000

  for (let attempt = 0; ; attempt++) {
    try {
      const response = await request()
      const transient = response.status === 429 || response.status >= 500
      if (!transient || attempt >= options.retries) return response
      const backoff = baseDelay * 2 ** attempt + random() * baseDelay
      await wait(retryAfterMs(response) ?? backoff)
    } catch (error) {
      if (attempt >= options.retries) throw error
      await wait(baseDelay * 2 ** attempt + random() * baseDelay)
    }
  }
}

export function mergePlaylistRefresh(
  discovered: Playlist[],
  hydrated: ReadonlyMap<string, Playlist>,
  stale: Playlist[],
): Playlist[] {
  const staleById = new Map(stale.map((item) => [item.playlistId, item]))
  const refreshed = discovered.map((item) => hydrated.get(item.playlistId) ?? staleById.get(item.playlistId) ?? item)
  const discoveredIds = new Set(discovered.map((item) => item.playlistId))
  return [...refreshed, ...stale.filter((item) => !discoveredIds.has(item.playlistId))]
}
