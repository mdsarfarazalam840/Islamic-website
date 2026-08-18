import fs from "node:fs"
import path from "node:path"
import { scholars } from "@/config/scholars"
import {
  collectPlaylistVideos,
  extractYouTubeConfig,
  fetchWithRetry,
  mergePlaylistRefresh,
  normalizePlaylist,
  playlistHasLongForm,
} from "@/lib/youtube/playlist-fetch"
import { createEmbeddabilityProber, filterPlaylistVideos } from "@/lib/youtube/embeddable"
import { mergePlaylistVideos, parsePlaylistPage } from "@/lib/youtube/playlist-parser"
import type { Video, Playlist, PlaylistVideo } from "@/types"

// Fetches each scholar's latest LONG-FORM videos and writes them as static JSON
// under public/data/youtube/. This runs at BUILD time (see the deploy workflow)
// on a US-based runner, so channels that are region-restricted still resolve,
// and there is no API key, quota, or billing/payment method involved.
//
// Why not the RSS feed? The channel RSS (videos.xml) returns only the ~15 most
// recent *uploads* with no duration, and for high-volume channels those recent
// uploads are almost all Shorts — so the grid ended up showing only Shorts.
// Instead we read the channel's public "/videos" tab, which:
//   - lists ~30 videos per channel (double the RSS),
//   - EXCLUDES Shorts by definition (Shorts live on a separate "/shorts" tab),
//   - carries real durations and view counts.
// We additionally drop anything <= 60s as a safety net, so a stray Short that
// leaks into the videos tab never appears.
//
// The site is a static export on GitHub Pages, so there is no request-time
// server: pre-generating JSON is the only way to ship real video data. The
// runtime loader (src/lib/youtube/api.ts) reads these files and falls back to
// mock data only when a file is missing or empty.

const OUTPUT_DIR = path.resolve("public/data/youtube")
// Playlists live in a sibling subdir so per-scholar video/playlist files never
// collide (both are keyed by scholar id): public/data/youtube/playlists/<id>.json.
const PLAYLIST_OUTPUT_DIR = path.resolve("public/data/youtube/playlists")

// Minimum duration (seconds) for a video to count as long-form. YouTube Shorts
// are capped at 3 minutes but historically 60s; anything <= 60s we treat as a
// Short and drop. Long-form talks/lectures are always well above this.
// NOTE: this filter applies ONLY to the main videos grid (parseLockup below).
// Playlists keep every video regardless of length; an all-Shorts playlist is
// dropped wholesale via playlistHasLongForm, not by filtering its videos.
const MIN_DURATION_SECONDS = 61

function isValidChannelId(id: string): boolean {
  return id.startsWith("UC") && id.length > 10
}

// Space out requests to YouTube. We now hit two tabs per scholar (videos +
// playlists) — ~2x the old volume — and firing them back-to-back trips YouTube's
// rate limiter, which then serves throttled pages with zero parseable items
// (observed: channels with 20+ real playlists returning 0). A short delay
// between every request keeps us under that threshold. At ~23 scholars × 2 tabs
// this adds well under a minute to the CI build.
const REQUEST_DELAY_MS = 800
const MAX_TOTAL_REQUESTS = 600
const MAX_CONTINUATION_PAGES = 4
const MAX_RETRIES = 2
const MAX_API_REQUESTS = 40
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
let totalRequests = 0
let apiRequests = 0

// Run-scoped embeddability prober (keyless oEmbed). One instance for the whole
// run so its cache dedupes ids shared by the videos grid and playlists. Kept
// deliberately OFF the requestYouTube budget above: oEmbed is a separate,
// lightweight endpoint, and routing hundreds of probes through the 800ms
// channel-page throttle would balloon the build and exhaust MAX_TOTAL_REQUESTS.
const embeddabilityProber = createEmbeddabilityProber()

async function requestYouTube(url: string, init?: RequestInit, officialApi = false): Promise<Response> {
  return fetchWithRetry(async () => {
    if (totalRequests >= MAX_TOTAL_REQUESTS) throw new Error("YouTube per-run request budget exhausted")
    if (officialApi && apiRequests >= MAX_API_REQUESTS) throw new Error("YouTube Data API per-run request budget exhausted")
    await sleep(REQUEST_DELAY_MS)
    totalRequests++
    if (officialApi) apiRequests++
    return fetch(url, init)
  }, { retries: MAX_RETRIES })
}

// Walk an arbitrarily-nested object collecting every value found under `key`.
function collect(obj: unknown, key: string, out: unknown[] = []): unknown[] {
  if (!obj || typeof obj !== "object") return out
  const rec = obj as Record<string, unknown>
  if (rec[key] !== undefined) out.push(rec[key])
  for (const k in rec) collect(rec[k], key, out)
  return out
}

// "12:34" -> 754, "1:02:03" -> 3723, "" -> 0
function parseDuration(text: string): number {
  const parts = text.split(":").map((p) => Number(p))
  if (parts.some((n) => Number.isNaN(n))) return 0
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

// "152K views" -> 152000, "1.2M views" -> 1200000, "934 views" -> 934
function parseViews(text: string): number {
  const m = text.match(/([\d.]+)\s*([KMB]?)/i)
  if (!m) return 0
  const n = Number(m[1])
  if (Number.isNaN(n)) return 0
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()] ?? 1
  return Math.round(n * mult)
}

// "7 days ago" / "3 weeks ago" / "1 month ago" -> approximate ISO date.
// YouTube only exposes relative times on the videos tab; we anchor them to
// `now` so ordering (newest first, already the tab's order) stays correct and
// formatPublishedAt() can render a sensible "X ago" at runtime.
function relativeToISO(text: string, now: number): string {
  const m = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i)
  if (!m) return new Date(now).toISOString()
  const n = Number(m[1])
  const unit = m[2].toLowerCase()
  const secs: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2592000, // 30d
    year: 31536000,
  }
  return new Date(now - n * (secs[unit] ?? 0) * 1000).toISOString()
}

interface Lockup {
  contentId?: string
  // "LOCKUP_CONTENT_TYPE_VIDEO" | "LOCKUP_CONTENT_TYPE_PLAYLIST" | …
  contentType?: string
  metadata?: {
    lockupMetadataViewModel?: {
      title?: { content?: string }
      metadata?: {
        contentMetadataViewModel?: {
          metadataRows?: { metadataParts?: { text?: { content?: string } }[] }[]
        }
      }
    }
  }
  contentImage?: {
    thumbnailViewModel?: {
      overlays?: {
        thumbnailBottomOverlayViewModel?: {
          badges?: { thumbnailBadgeViewModel?: { text?: string } }[]
        }
      }[]
    }
  }
}

function parseLockup(lv: Lockup, scholarId: string, scholarName: string, category: string, index: number, now: number): Video | null {
  const youtubeId = lv.contentId
  if (!youtubeId || typeof youtubeId !== "string") return null

  const meta = lv.metadata?.lockupMetadataViewModel
  const title = meta?.title?.content ?? ""
  if (!title) return null

  // Duration badge — also our Shorts filter. A missing/zero duration means the
  // lockup isn't a normal long-form video (live, upcoming, or a Short); skip it.
  const badges =
    lv.contentImage?.thumbnailViewModel?.overlays?.flatMap(
      (o) => o.thumbnailBottomOverlayViewModel?.badges ?? [],
    ) ?? []
  const durationText = badges.map((b) => b.thumbnailBadgeViewModel?.text ?? "").find((t) => /^\d+(:\d+)+$/.test(t)) ?? ""
  const durationSecs = parseDuration(durationText)
  if (durationSecs < MIN_DURATION_SECONDS) return null

  // Metadata parts are typically ["152K views", "7 days ago"].
  const parts =
    meta?.metadata?.contentMetadataViewModel?.metadataRows
      ?.flatMap((r) => r.metadataParts ?? [])
      .map((p) => p.text?.content ?? "")
      .filter(Boolean) ?? []
  const viewsPart = parts.find((p) => /view/i.test(p)) ?? ""
  const agoPart = parts.find((p) => /ago/i.test(p)) ?? ""

  return {
    id: `yt-${scholarId}-${index}`,
    youtubeId,
    title,
    description: "",
    scholarId,
    scholarName,
    thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    duration: durationText,
    publishedAt: relativeToISO(agoPart, now),
    category,
    views: parseViews(viewsPart),
  }
}

// ── Playlists ──────────────────────────────────────────────────────────────
// The channel "/playlists" tab embeds the SAME lockupViewModel container as the
// "/videos" tab, but each lockup describes a playlist: contentId is the playlist
// id, contentType is "LOCKUP_CONTENT_TYPE_PLAYLIST", the tap command carries the
// first video's id, and an overlay/metadata part reads "N videos". We parse all
// of that defensively — YouTube reshapes these blobs often, so anything we can't
// find degrades to a sensible empty/zero rather than throwing.

// Real playlist ids begin with a known prefix (PL user-created, UU uploads, FL
// favorites, OL ordered, LL liked). Only used as a fallback when contentType is
// absent; the contentType check is authoritative when present.
function isPlaylistId(id: string): boolean {
  return typeof id === "string" && id.length >= 12 && /^(PL|UU|FL|OL|LL|RD)/.test(id)
}

// First 11-char videoId found anywhere in the lockup (the tap/watch endpoint).
// Seeds the embed URL and the thumbnail; "" if none is present.
function findFirstVideoId(lv: unknown): string {
  const ids = collect(lv, "videoId").filter(
    (v): v is string => typeof v === "string" && v.length === 11,
  )
  return ids[0] ?? ""
}

// "129 videos" / "1,234 videos" -> 129 / 1234. Scans every text/content string
// in the lockup except the title (so a playlist titled "…Videos" can't be
// mistaken for a count). Returns 0 when no count is present.
function parseVideoCount(lv: Lockup, title: string): number {
  const candidates = [...collect(lv, "content"), ...collect(lv, "text")].filter(
    (t): t is string => typeof t === "string" && t !== title,
  )
  for (const t of candidates) {
    const m = t.match(/([\d,]+)\s+(?:videos?|episodes?)/i)
    if (m) return Number(m[1].replace(/,/g, ""))
  }
  return 0
}

function parsePlaylistLockup(lv: Lockup, scholarId: string, scholarName: string, index: number): Playlist | null {
  const playlistId = lv.contentId
  if (!playlistId || typeof playlistId !== "string") return null

  // Keep only genuine playlist lockups. The tab can also surface video lockups
  // (e.g. a "For you" section); the contentType is authoritative when present,
  // otherwise fall back to the id-prefix heuristic.
  const type = lv.contentType ?? ""
  if (type ? !/PLAYLIST/i.test(type) : !isPlaylistId(playlistId)) return null

  const title = lv.metadata?.lockupMetadataViewModel?.title?.content ?? ""
  if (!title) return null

  const firstVideoId = findFirstVideoId(lv)

  return {
    id: `pl-${scholarId}-${index}`,
    playlistId,
    title,
    scholarId,
    scholarName,
    // Playlist thumbnails are the first video's frame; fall back to "" (the card
    // shows a placeholder) when we couldn't recover a seed video id.
    thumbnail: firstVideoId ? `https://i.ytimg.com/vi/${firstVideoId}/hqdefault.jpg` : "",
    videoCount: parseVideoCount(lv, title),
    firstVideoId,
    videos: [],
  }
}

// Shared UA/headers: YouTube serves the desktop ytInitialData blob to a
// browser-like client and a degraded (often bot-walled) page otherwise.
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
}

// Fetch a channel tab URL and return its parsed ytInitialData blob. Both the
// "/videos" and "/playlists" tabs embed the same `var ytInitialData = {…};`
// script, so one helper serves both.
async function fetchYtInitialData(url: string): Promise<unknown> {
  // Throttle every request (see REQUEST_DELAY_MS): this is the single choke
  // point all channel-tab fetches pass through, so one sleep here spaces them
  // all without threading delay logic through each caller.
  const res = await requestYouTube(url, { headers: FETCH_HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s)
  if (!m) throw new Error("ytInitialData not found")
  return JSON.parse(m[1])
}

async function fetchPlaylistHtml(playlistId: string): Promise<string> {
  const res = await requestYouTube(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`, {
    headers: FETCH_HEADERS,
  })
  if (!res.ok) throw new Error(`playlist page HTTP ${res.status}`)
  return res.text()
}

async function hydratePlaylistByScraping(playlist: Playlist): Promise<Playlist> {
  const config = extractYouTubeConfig(await fetchPlaylistHtml(playlist.playlistId))
  const firstPage = parsePlaylistPage(config.initialData)
  const canContinue = Boolean(config.apiKey && config.context)
  const videos = await collectPlaylistVideos(firstPage, async (continuation) => {
    if (!config.apiKey || !config.context) throw new Error("playlist continuation client config not found")
    const res = await requestYouTube(
      `https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(config.apiKey)}`,
      {
        method: "POST",
        headers: { ...FETCH_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ context: config.context, continuation }),
      },
    )
    if (!res.ok) throw new Error(`playlist continuation HTTP ${res.status}`)
    return parsePlaylistPage(await res.json())
  }, canContinue ? MAX_CONTINUATION_PAGES : 0)
  if (videos.length === 0) throw new Error("no playlist videos parsed")
  return { ...playlist, videos }
}

interface ApiPlaylistItem {
  snippet?: {
    position?: number
    title?: string
    resourceId?: { videoId?: string }
    thumbnails?: Record<string, { url?: string; width?: number }>
  }
}

// Format an ISO 8601 duration ("PT1H2M3S") as "1:02:03" / "2:03". Used only by
// the playlist API-fallback path, which keeps videos of any length — so no
// minimum-duration gate here (unlike the videos-grid parser above).
function isoDurationToText(value: string): string {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return ""
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`
}

async function fetchApiJson(url: URL): Promise<Record<string, unknown>> {
  const res = await requestYouTube(url.toString(), undefined, true)
  if (!res.ok) throw new Error(`YouTube Data API HTTP ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

async function hydratePlaylistByApi(playlist: Playlist, apiKey: string): Promise<Playlist> {
  const items: ApiPlaylistItem[] = []
  let pageToken = ""
  const seenTokens = new Set<string>()

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems")
    url.searchParams.set("part", "snippet")
    url.searchParams.set("maxResults", "50")
    url.searchParams.set("playlistId", playlist.playlistId)
    url.searchParams.set("key", apiKey)
    if (pageToken) url.searchParams.set("pageToken", pageToken)
    const data = await fetchApiJson(url)
    if (Array.isArray(data.items)) items.push(...data.items as ApiPlaylistItem[])
    const next = typeof data.nextPageToken === "string" ? data.nextPageToken : ""
    if (!next || seenTokens.has(next)) break
    seenTokens.add(next)
    pageToken = next
  } while (apiRequests < MAX_API_REQUESTS)

  const durations = new Map<string, string>()
  const ids = [...new Set(items.map((item) => item.snippet?.resourceId?.videoId).filter((id): id is string => Boolean(id)))]
  for (let index = 0; index < ids.length; index += 50) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos")
    url.searchParams.set("part", "contentDetails")
    url.searchParams.set("id", ids.slice(index, index + 50).join(","))
    url.searchParams.set("key", apiKey)
    const data = await fetchApiJson(url)
    if (!Array.isArray(data.items)) continue
    for (const item of data.items as { id?: string; contentDetails?: { duration?: string } }[]) {
      if (item.id && item.contentDetails?.duration) durations.set(item.id, isoDurationToText(item.contentDetails.duration))
    }
  }

  const videos = mergePlaylistVideos([items.flatMap((item): PlaylistVideo[] => {
    const youtubeId = item.snippet?.resourceId?.videoId
    const title = item.snippet?.title ?? ""
    const duration = youtubeId ? durations.get(youtubeId) ?? "" : ""
    if (!youtubeId || youtubeId.length !== 11 || !title) return []
    const thumbnails = Object.values(item.snippet?.thumbnails ?? {})
    const thumbnail = thumbnails.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url
      ?? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
    return [{ youtubeId, title, thumbnail, duration, position: (item.snippet?.position ?? 0) + 1 }]
  })])
  if (videos.length === 0) throw new Error("YouTube Data API returned no playlist videos")
  return { ...playlist, videos }
}

// Base URL for a channel tab, preferring the handle when provided (some
// channels' UC id is unknown or has changed) and falling back to the channelId.
function channelTabUrl(scholar: (typeof scholars)[number], tab: string): string {
  return scholar.channelHandle
    ? `https://www.youtube.com/@${scholar.channelHandle}/${tab}`
    : `https://www.youtube.com/channel/${scholar.channelId}/${tab}`
}

async function fetchScholar(scholar: (typeof scholars)[number], category: string, now: number): Promise<Video[]> {
  // Both the handle and channelId URLs render the same "/videos" tab and
  // ytInitialData blob; channelTabUrl() picks whichever is available.
  const data = await fetchYtInitialData(channelTabUrl(scholar, "videos"))
  const lockups = collect(data, "lockupViewModel") as Lockup[]
  const videos: Video[] = []
  const seen = new Set<string>()
  lockups.forEach((lv, i) => {
    const v = parseLockup(lv, scholar.id, scholar.name, category, i, now)
    if (v && !seen.has(v.youtubeId)) {
      seen.add(v.youtubeId)
      videos.push(v)
    }
  })
  // Drop videos the owner has made unembeddable (or that were removed): off-site
  // playback is disabled, so they'd only render a dead "watch on YouTube" card in
  // the grid. Fail-open — a probe hiccup keeps the video (see embeddable.ts).
  const keep = await embeddabilityProber.keep(videos.map((v) => v.youtubeId))
  const embeddable = videos.filter((v) => keep.has(v.youtubeId))
  const dropped = videos.length - embeddable.length
  if (dropped > 0) console.log(`    ${dropped} non-embeddable video(s) dropped`)
  // Re-index ids sequentially after dedupe/filter so they stay stable & unique.
  return embeddable.map((v, i) => ({ ...v, id: `yt-${scholar.id}-${i}` }))
}

async function fetchScholarPlaylists(scholar: (typeof scholars)[number]): Promise<Playlist[]> {
  const data = await fetchYtInitialData(channelTabUrl(scholar, "playlists"))
  const lockups = collect(data, "lockupViewModel") as Lockup[]
  const playlists: Playlist[] = []
  const seen = new Set<string>()
  lockups.forEach((lv, i) => {
    const p = parsePlaylistLockup(lv, scholar.id, scholar.name, i)
    if (p && !seen.has(p.playlistId)) {
      seen.add(p.playlistId)
      playlists.push(p)
    }
  })
  // Re-index ids sequentially after dedupe/filter so they stay stable & unique.
  return playlists.map((p, i) => ({ ...p, id: `pl-${scholar.id}-${i}` }))
}

function readJsonArray<T>(file: string): T[] {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    return []
  }
}

function readPlaylists(file: string): Playlist[] {
  return readJsonArray<unknown>(file)
    .map(normalizePlaylist)
    .filter((playlist): playlist is Playlist => playlist !== null)
}

async function hydrateScholarPlaylists(
  discovered: Playlist[],
  stale: Playlist[],
): Promise<{ playlists: Playlist[]; scraped: number; api: number; stale: number; failed: number; dropped: number }> {
  const staleIds = new Set(stale.map((playlist) => playlist.playlistId))
  const hydrated = new Map<string, Playlist>()
  const retainable = new Set<string>()
  let scraped = 0
  let api = 0
  let staleCount = 0
  let failed = 0

  for (const playlist of discovered) {
    try {
      const result = await hydratePlaylistByScraping(playlist)
      hydrated.set(playlist.playlistId, result)
      retainable.add(playlist.playlistId)
      scraped++
      console.log(`    scraped ${playlist.playlistId}: ${result.videos.length} videos`)
      continue
    } catch (scrapeError) {
      const apiKey = process.env.YOUTUBE_API_KEY
      if (apiKey) {
        try {
          const result = await hydratePlaylistByApi(playlist, apiKey)
          hydrated.set(playlist.playlistId, result)
          retainable.add(playlist.playlistId)
          api++
          console.log(`    api     ${playlist.playlistId}: ${result.videos.length} videos`)
          continue
        } catch (apiError) {
          console.warn(`    API fallback failed ${playlist.playlistId}: ${apiError instanceof Error ? apiError.message : apiError}`)
        }
      }

      if (staleIds.has(playlist.playlistId)) {
        retainable.add(playlist.playlistId)
        staleCount++
        console.warn(`    stale   ${playlist.playlistId}: ${scrapeError instanceof Error ? scrapeError.message : scrapeError}`)
      } else {
        failed++
        console.warn(`    failed  ${playlist.playlistId}: ${scrapeError instanceof Error ? scrapeError.message : scrapeError}`)
      }
    }
  }

  const merged = mergePlaylistRefresh(
    discovered.filter((playlist) => retainable.has(playlist.playlistId)),
    hydrated,
    stale,
  )
  // Drop non-embeddable videos (owner-disabled / removed) from each playlist,
  // repairing the seed thumbnail/firstVideoId when a head video goes. One batched
  // probe across every playlist so the shared cache dedupes against the grid.
  const keep = await embeddabilityProber.keep(merged.flatMap((p) => p.videos.map((v) => v.youtubeId)))
  const filtered = merged.map((playlist) => filterPlaylistVideos(playlist, keep))
  // Final business rule: drop playlists that are entirely short clips. Every
  // video inside a retained playlist is kept regardless of length; a playlist
  // with no long-form video at all (e.g. a "Shorts" playlist) is excluded so
  // the Playlists tab mirrors the long-form videos grid. A playlist left empty
  // by the embeddability filter above has no long-form video either, so this
  // same gate removes it — no orphan cards.
  const playlists = filtered.filter(playlistHasLongForm)
  const dropped = filtered.length - playlists.length
  return { playlists, scraped, api, stale: staleCount, failed, dropped }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.mkdirSync(PLAYLIST_OUTPUT_DIR, { recursive: true })

  // Optional scholar scoping for targeted refreshes / spot-checks:
  //   npm run fetch:youtube -- youth-club mufti-menk
  // With no args every scholar is fetched (the CI default). When scoped, we
  // refresh only those scholars' per-scholar files and deliberately DO NOT
  // rewrite all.json (it aggregates every scholar and would otherwise be
  // truncated to just the scoped subset).
  const only = process.argv.slice(2).filter((arg) => !arg.startsWith("-"))
  const targets = only.length > 0 ? scholars.filter((s) => only.includes(s.id)) : scholars
  if (only.length > 0) {
    const missing = only.filter((id) => !scholars.some((s) => s.id === id))
    if (missing.length > 0) console.warn(`  unknown scholar id(s) ignored: ${missing.join(", ")}`)
    console.log(`Scoped run: ${targets.map((s) => s.id).join(", ") || "(none)"} — all.json will not be rewritten`)
  }

  const now = Date.now()
  const all: Video[] = []
  let ok = 0
  let failed = 0
  let playlistOk = 0
  let playlistFailed = 0

  for (const scholar of targets) {
    // A channel is fetchable if it has a handle OR a valid UC id.
    if (!scholar.channelHandle && !isValidChannelId(scholar.channelId)) {
      console.warn(`  skip ${scholar.id}: no channelHandle and invalid channelId`)
      continue
    }
    const category = scholar.categories[0] ?? "spirituality"
    const videoFile = path.join(OUTPUT_DIR, `${scholar.id}.json`)
    const playlistFile = path.join(PLAYLIST_OUTPUT_DIR, `${scholar.id}.json`)
    try {
      const videos = await fetchScholar(scholar, category, now)
      if (videos.length === 0) throw new Error("no long-form videos parsed")
      fs.writeFileSync(videoFile, JSON.stringify(videos, null, 2))
      all.push(...videos)
      ok++
      console.log(`  ok   ${scholar.id}: ${videos.length} videos`)
    } catch (err) {
      failed++
      const staleVideos = readJsonArray<Video>(videoFile)
      all.push(...staleVideos)
      console.warn(`  ${staleVideos.length > 0 ? "stale" : "FAIL "} ${scholar.id}: ${err instanceof Error ? err.message : err}`)
    }

    // Playlists are independent of videos: a playlist failure must not affect
    // the video result above, and vice versa.
    try {
      const stalePlaylists = readPlaylists(playlistFile)
      const discovered = await fetchScholarPlaylists(scholar)
      const result = await hydrateScholarPlaylists(discovered, stalePlaylists)
      fs.writeFileSync(playlistFile, JSON.stringify(result.playlists, null, 2))
      playlistOk++
      console.log(`  ok   ${scholar.id}: ${result.playlists.length} playlists (${result.scraped} scraped, ${result.api} api, ${result.stale} stale, ${result.failed} failed, ${result.dropped} empty/shorts dropped)`)
    } catch (err) {
      playlistFailed++
      const stalePlaylists = readPlaylists(playlistFile)
      console.warn(`  ${stalePlaylists.length > 0 ? "stale" : "FAIL "} ${scholar.id} playlists: ${err instanceof Error ? err.message : err}`)
    }
  }

  // Only rewrite the aggregate on a full run; a scoped run would truncate it.
  if (only.length === 0) {
    fs.writeFileSync(path.join(OUTPUT_DIR, "all.json"), JSON.stringify(all, null, 2))
  }
  console.log(`\nYouTube data: ${ok} channels ok, ${failed} failed, ${all.length} total videos -> ${OUTPUT_DIR}`)
  console.log(`Playlists: ${playlistOk} channels ok, ${playlistFailed} failed -> ${PLAYLIST_OUTPUT_DIR}`)
  const probe = embeddabilityProber.stats()
  console.log(`Embeddability: probed ${probe.probed} video(s), dropped ${probe.blocked} non-embeddable${probe.budgetExhausted ? " (probe budget hit — remainder kept)" : ""}`)
}

main().catch((err) => {
  console.error("fetch:youtube failed:", err)
  process.exit(1)
})
