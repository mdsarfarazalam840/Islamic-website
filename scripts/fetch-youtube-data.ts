import fs from "node:fs"
import path from "node:path"
import { scholars } from "@/config/scholars"
import type { Video } from "@/types"

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

// Minimum duration (seconds) for a video to count as long-form. YouTube Shorts
// are capped at 3 minutes but historically 60s; anything <= 60s we treat as a
// Short and drop. Long-form talks/lectures are always well above this.
const MIN_DURATION_SECONDS = 61

function isValidChannelId(id: string): boolean {
  return id.startsWith("UC") && id.length > 10
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

async function fetchScholar(scholar: (typeof scholars)[number], category: string, now: number): Promise<Video[]> {
  // Prefer the channelId URL — it never depends on a handle being current.
  const url = `https://www.youtube.com/channel/${scholar.channelId}/videos`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s)
  if (!m) throw new Error("ytInitialData not found")
  const data = JSON.parse(m[1])

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
  // Re-index ids sequentially after dedupe/filter so they stay stable & unique.
  return videos.map((v, i) => ({ ...v, id: `yt-${scholar.id}-${i}` }))
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const now = Date.now()
  const all: Video[] = []
  let ok = 0
  let failed = 0

  for (const scholar of scholars) {
    if (!isValidChannelId(scholar.channelId)) {
      console.warn(`  skip ${scholar.id}: invalid channelId`)
      continue
    }
    const category = scholar.categories[0] ?? "spirituality"
    try {
      const videos = await fetchScholar(scholar, category, now)
      if (videos.length === 0) throw new Error("no long-form videos parsed")
      fs.writeFileSync(path.join(OUTPUT_DIR, `${scholar.id}.json`), JSON.stringify(videos, null, 2))
      all.push(...videos)
      ok++
      console.log(`  ok   ${scholar.id}: ${videos.length} videos`)
    } catch (err) {
      failed++
      // Write an empty file so the runtime loader gets a clean 200 (empty array)
      // and falls back to mock data for this scholar rather than 404-erroring.
      fs.writeFileSync(path.join(OUTPUT_DIR, `${scholar.id}.json`), "[]")
      console.warn(`  FAIL ${scholar.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, "all.json"), JSON.stringify(all, null, 2))
  console.log(`\nYouTube data: ${ok} channels ok, ${failed} failed, ${all.length} total videos -> ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error("fetch:youtube failed:", err)
  process.exit(1)
})
