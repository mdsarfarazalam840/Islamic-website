import type { PlaylistVideo } from "@/types"

// Detects videos that can't be embedded off-site — the "Video unavailable —
// playback on other websites has been disabled by the video owner" case (IFrame
// player error 101/150), plus removed/private videos — WITHOUT a YouTube API
// key. It leans on YouTube's public oEmbed endpoint, which returns a plain HTTP
// status we can read at build time:
//
//   200      -> "ok"       public and embeddable
//   401/404  -> "blocked"  embedding disabled by owner, or removed/private
//   anything else / thrown -> "unknown"
//
// CRITICAL — fail OPEN. "unknown" is deliberately NOT treated as "blocked":
// a transient hiccup (429, 5xx, a dropped connection) must never silently
// delete a healthy video. We only ever drop on a definitive 401/404. This was
// verified empirically: a full sweep of the site's data flagged the genuinely
// blocked videos with a *stable* 401, while one healthy video returned a
// one-off connection error and was fine on retry — exactly the false positive
// this rule prevents.

export type EmbeddableStatus = "ok" | "blocked" | "unknown"

const OEMBED_ENDPOINT = "https://www.youtube.com/oembed"

// A browser-like UA, matching the channel-page scraper's convention. oEmbed is
// lenient, but staying consistent avoids any bot-walling surprises.
const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
}

export interface ProbeDeps {
  // Injectable so tests never touch the network. Defaults to global fetch.
  fetch?: typeof fetch
  headers?: Record<string, string>
}

// Classify a single video via the keyless oEmbed endpoint. Never throws:
// network errors collapse to "unknown" so callers keep the video (fail-open).
export async function oembedStatus(youtubeId: string, deps: ProbeDeps = {}): Promise<EmbeddableStatus> {
  const doFetch = deps.fetch ?? fetch
  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`
  const url = `${OEMBED_ENDPOINT}?url=${encodeURIComponent(watchUrl)}&format=json`
  try {
    const res = await doFetch(url, { headers: deps.headers ?? DEFAULT_HEADERS })
    if (res.status === 200) return "ok"
    if (res.status === 401 || res.status === 404) return "blocked"
    return "unknown"
  } catch {
    return "unknown"
  }
}

export interface ProberOptions extends ProbeDeps {
  // Hard cap on oEmbed requests for this prober's lifetime. Once hit, every
  // further id resolves to "unknown" (kept) so a partial sweep can never
  // mass-drop videos. Sized comfortably above a full run (~600 videos).
  budget?: number
  // Max in-flight probes. oEmbed is light; a small pool clears hundreds of ids
  // in seconds without tripping YouTube's rate limiter.
  concurrency?: number
  // Pause each worker takes after a probe, to stay gentle on the endpoint.
  delayMs?: number
  sleep?: (ms: number) => Promise<void>
  // Injectable classifier — tests stub this to exercise pool/cache/budget logic
  // without building HTTP responses. Defaults to oembedStatus.
  probe?: (youtubeId: string, deps: ProbeDeps) => Promise<EmbeddableStatus>
}

export interface ProberStats {
  probed: number
  blocked: number
  unknown: number
  budgetExhausted: boolean
}

export interface EmbeddabilityProber {
  // Given youtube ids, return the subset to KEEP (everything except a definitive
  // "blocked"). Deduplicates input and memoizes across calls, so an id shared by
  // the videos grid and several playlists is probed at most once per run.
  keep(ids: readonly string[]): Promise<Set<string>>
  stats(): ProberStats
}

// Build a run-scoped prober. The scraper creates ONE and passes it to both the
// videos-grid and playlist paths, so its cache spans the whole run.
export function createEmbeddabilityProber(options: ProberOptions = {}): EmbeddabilityProber {
  const budget = options.budget ?? 5000
  const concurrency = Math.max(1, options.concurrency ?? 8)
  const delayMs = options.delayMs ?? 80
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
  const probe = options.probe ?? oembedStatus
  const deps: ProbeDeps = { fetch: options.fetch, headers: options.headers }

  const cache = new Map<string, EmbeddableStatus>()
  let probed = 0
  let blocked = 0
  let unknown = 0
  let budgetExhausted = false

  async function statusOf(id: string): Promise<EmbeddableStatus> {
    const cached = cache.get(id)
    if (cached) return cached
    // The check and the increment are synchronous (no await between them), so
    // concurrent workers can't overshoot the budget.
    if (probed >= budget) {
      budgetExhausted = true
      // Don't cache a budget-driven unknown — it reflects the cap, not the video.
      return "unknown"
    }
    probed++
    const status = await probe(id, deps)
    cache.set(id, status)
    if (status === "blocked") blocked++
    else if (status === "unknown") unknown++
    if (delayMs > 0) await sleep(delayMs)
    return status
  }

  async function keep(ids: readonly string[]): Promise<Set<string>> {
    const unique = [...new Set(ids)]
    const keepSet = new Set<string>()
    let cursor = 0
    const worker = async () => {
      while (cursor < unique.length) {
        const id = unique[cursor++]
        if ((await statusOf(id)) !== "blocked") keepSet.add(id)
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker))
    return keepSet
  }

  return {
    keep,
    stats: () => ({ probed, blocked, unknown, budgetExhausted }),
  }
}

// ── Helpers the scraper uses to apply a keep-set to its two data shapes ──────

// Filter a playlist's hydrated videos down to the embeddable ones, repairing the
// build-time seed fields when the head video was dropped. firstVideoId/thumbnail
// are only used to build the card's poster + the (optional) embed seed — the
// browser actually starts from videos[0] — but they MUST stay strings or
// normalizePlaylist() drops the whole playlist at runtime. videoCount is left
// as the channel's true count (it already legitimately exceeds videos.length),
// and PlaylistVideo.position is left untouched (unused by the UI; order is the
// array index). A playlist emptied by this filter is handled by the caller's
// existing playlistHasLongForm gate, which drops it.
export function filterPlaylistVideos<
  T extends { videos: PlaylistVideo[]; firstVideoId: string; thumbnail: string },
>(playlist: T, keepSet: ReadonlySet<string>): T {
  const videos = playlist.videos.filter((video) => keepSet.has(video.youtubeId))
  if (videos.length === playlist.videos.length) return playlist

  const head = videos[0]
  const headDropped = playlist.videos[0]?.youtubeId !== head?.youtubeId
  return {
    ...playlist,
    videos,
    firstVideoId: headDropped ? head?.youtubeId ?? "" : playlist.firstVideoId,
    thumbnail: headDropped
      ? (head ? `https://i.ytimg.com/vi/${head.youtubeId}/hqdefault.jpg` : "")
      : playlist.thumbnail,
  }
}
