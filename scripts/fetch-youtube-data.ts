import fs from "node:fs"
import path from "node:path"
import { scholars } from "@/config/scholars"
import type { Video } from "@/types"

// Fetches each scholar's latest videos from the public YouTube RSS feed and
// writes them as static JSON under public/data/youtube/. This runs at BUILD
// time (see .github/workflows/deploy.yml) on a US-based runner, so channels
// that are API-restricted in some regions still resolve, and there is no API
// key, quota, or billing/payment method involved — the feed is public.
//
// The site is a static export on GitHub Pages, so there is no request-time
// server: pre-generating JSON is the only way to ship real video data. The
// runtime loader (src/lib/youtube/api.ts) reads these files and falls back to
// mock data only when a file is missing or empty.
//
// Trade-off: the RSS feed exposes the ~15 most recent uploads per channel and
// carries no duration field. That is acceptable for a "latest videos" grid.

const OUTPUT_DIR = path.resolve("public/data/youtube")
const RSS_BASE = "https://www.youtube.com/feeds/videos.xml?channel_id="

function isValidChannelId(id: string): boolean {
  return id.startsWith("UC") && id.length > 10
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
}

function extract(block: string, re: RegExp): string {
  const m = block.match(re)
  return m ? decodeXmlEntities(m[1].trim()) : ""
}

// Parse the <entry> elements of a YouTube channel RSS feed into Video objects.
function parseFeed(xml: string, scholarId: string, scholarName: string, category: string): Video[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []
  const videos: Video[] = []

  entries.forEach((entry, index) => {
    const youtubeId = extract(entry, /<yt:videoId>([^<]+)<\/yt:videoId>/)
    if (!youtubeId) return

    const title = extract(entry, /<media:title>([\s\S]*?)<\/media:title>/) || extract(entry, /<title>([\s\S]*?)<\/title>/)
    const description = extract(entry, /<media:description>([\s\S]*?)<\/media:description>/)
    const publishedAt = extract(entry, /<published>([^<]+)<\/published>/)
    const thumbMatch = entry.match(/<media:thumbnail\s+url="([^"]+)"/)
    const viewsMatch = entry.match(/<media:statistics\s+views="(\d+)"/)

    videos.push({
      id: `yt-${scholarId}-${index}`,
      youtubeId,
      title,
      description,
      scholarId,
      scholarName,
      thumbnail: thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
      duration: "",
      publishedAt,
      category,
      views: viewsMatch ? Number(viewsMatch[1]) : 0,
    })
  })

  return videos
}

async function fetchScholar(scholarId: string, channelId: string, scholarName: string, category: string): Promise<Video[]> {
  const res = await fetch(`${RSS_BASE}${channelId}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NoorQuranBuild/1.0)" },
  })
  if (!res.ok) throw new Error(`RSS ${res.status}`)
  const xml = await res.text()
  return parseFeed(xml, scholarId, scholarName, category)
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

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
      const videos = await fetchScholar(scholar.id, scholar.channelId, scholar.name, category)
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
