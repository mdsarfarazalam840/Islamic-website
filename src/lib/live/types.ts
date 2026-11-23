/**
 * Types and helpers for the Cloudflare presence Worker (`workers/live`).
 *
 * Shared by the live provider, the /live dashboard, and its polling hook. The
 * Worker is deployed separately from the Pages site, so its base URL is a build
 * time env var; when it is unset every live surface degrades to nothing.
 */

export interface LivePageRow {
  path: string
  readers: number
  /** Surah name when this path is a surah page, otherwise null. */
  name: string | null
}

export interface LiveSurahRow {
  surah: number
  name: string
  readers: number
  listeners: number
}

/** Full aggregate returned by GET /stats on the presence Worker. */
export interface LiveStats {
  total: number
  pages: LivePageRow[]
  surahs: LiveSurahRow[]
  visits: number
  /** Epoch ms when the Durable Object built this snapshot. */
  ts: number
}

/** Base URL of the presence Worker, or "" when the live layer is not configured. */
export function liveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_LIVE_URL?.trim().replace(/\/+$/, "") || ""
  )
}

export function isLiveConfigured(): boolean {
  return liveBaseUrl().length > 0
}

/** GET /stats. Throws on a non-2xx response so callers can show an error. */
export async function fetchLiveStats(signal?: AbortSignal): Promise<LiveStats> {
  const response = await fetch(`${liveBaseUrl()}/stats`, {
    cache: "no-store",
    signal,
  })
  if (!response.ok) throw new Error(`Live stats failed (${response.status})`)
  return (await response.json()) as LiveStats
}
