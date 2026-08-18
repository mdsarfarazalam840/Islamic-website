import type { PlaylistVideo } from "@/types"

// Playlists are curated collections: keep every video regardless of length.
// The Shorts filter (a minimum duration) lives only in the videos-grid parser
// in scripts/fetch-youtube-data.ts — never here. A playlist made entirely of
// short clips is dropped at the hydration layer (see playlistHasLongForm in
// playlist-fetch.ts), not by filtering individual videos out of it.

interface TextValue {
  simpleText?: string
  runs?: { text?: string }[]
}

interface PlaylistVideoRenderer {
  videoId?: string
  title?: TextValue
  index?: TextValue
  lengthText?: TextValue
  thumbnail?: { thumbnails?: { url?: string; width?: number }[] }
}

interface PlaylistVideoLockup {
  contentId?: string
  metadata?: {
    lockupMetadataViewModel?: {
      title?: { content?: string }
    }
  }
  contentImage?: {
    thumbnailViewModel?: {
      image?: { sources?: { url?: string; width?: number }[] }
      overlays?: {
        thumbnailBottomOverlayViewModel?: {
          badges?: {
            thumbnailBadgeViewModel?: { text?: string }
          }[]
        }
      }[]
    }
  }
}

type PlaylistVideoEntry =
  | { kind: "renderer"; value: PlaylistVideoRenderer }
  | { kind: "lockup"; value: PlaylistVideoLockup }

function collect(obj: unknown, key: string, out: unknown[] = []): unknown[] {
  if (!obj || typeof obj !== "object") return out
  const record = obj as Record<string, unknown>
  if (record[key] !== undefined) out.push(record[key])
  for (const value of Object.values(record)) collect(value, key, out)
  return out
}

function collectVideoEntries(obj: unknown, out: PlaylistVideoEntry[] = []): PlaylistVideoEntry[] {
  if (!obj || typeof obj !== "object") return out

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "playlistVideoRenderer") {
      out.push({ kind: "renderer", value: value as PlaylistVideoRenderer })
    } else if (key === "lockupViewModel") {
      out.push({ kind: "lockup", value: value as PlaylistVideoLockup })
    }
    collectVideoEntries(value, out)
  }

  return out
}

function readText(value?: TextValue): string {
  return value?.simpleText ?? value?.runs?.map((run) => run.text ?? "").join("") ?? ""
}

export function durationSeconds(text: string): number {
  const parts = text.split(":").map(Number)
  if (parts.length < 2 || parts.some(Number.isNaN)) return 0
  return parts.reduce((total, part) => total * 60 + part, 0)
}

function parseRenderer(renderer: PlaylistVideoRenderer, fallbackPosition: number): PlaylistVideo | null {
  const youtubeId = renderer.videoId
  const title = readText(renderer.title)
  const duration = readText(renderer.lengthText)
  if (!youtubeId || youtubeId.length !== 11 || !title) {
    return null
  }

  const thumbnails = renderer.thumbnail?.thumbnails ?? []
  const thumbnail = thumbnails
    .filter((item) => item.url)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url
    ?? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
  const parsedPosition = Number(readText(renderer.index).replace(/[^\d]/g, ""))

  return {
    youtubeId,
    title,
    thumbnail,
    duration,
    position: parsedPosition > 0 ? parsedPosition : fallbackPosition,
  }
}

function parseLockup(lockup: PlaylistVideoLockup, position: number): PlaylistVideo | null {
  const youtubeId = lockup.contentId
  const title = lockup.metadata?.lockupMetadataViewModel?.title?.content ?? ""
  const thumbnailViewModel = lockup.contentImage?.thumbnailViewModel
  const duration = thumbnailViewModel?.overlays
    ?.flatMap((overlay) => overlay.thumbnailBottomOverlayViewModel?.badges ?? [])
    .map((badge) => badge.thumbnailBadgeViewModel?.text ?? "")
    .find((text) => durationSeconds(text) > 0) ?? ""

  if (!youtubeId || youtubeId.length !== 11 || !title) {
    return null
  }

  const thumbnail = (thumbnailViewModel?.image?.sources ?? [])
    .filter((item) => item.url)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url
    ?? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`

  return { youtubeId, title, thumbnail, duration, position }
}

export function parsePlaylistPage(data: unknown): {
  videos: PlaylistVideo[]
  continuationTokens: string[]
} {
  const videos = collectVideoEntries(data)
    .map((entry, index) => entry.kind === "renderer"
      ? parseRenderer(entry.value, index + 1)
      : parseLockup(entry.value, index + 1))
    .filter((video): video is PlaylistVideo => video !== null)
  const continuationTokens = collect(data, "continuationCommand")
    .map((command) => (command as { token?: unknown })?.token)
    .filter((token): token is string => typeof token === "string" && token.length > 0)

  return { videos, continuationTokens: [...new Set(continuationTokens)] }
}

export function mergePlaylistVideos(pages: PlaylistVideo[][]): PlaylistVideo[] {
  const seen = new Set<string>()
  return pages.flat().filter((video) => {
    if (seen.has(video.youtubeId)) return false
    seen.add(video.youtubeId)
    return true
  })
}
