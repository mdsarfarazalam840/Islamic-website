import assert from "node:assert/strict"
import test from "node:test"
import type { Playlist, PlaylistVideo } from "@/types"
import {
  collectPlaylistVideos,
  extractYouTubeConfig,
  fetchWithRetry,
  mergePlaylistRefresh,
  normalizePlaylist,
  playlistHasLongForm,
} from "./playlist-fetch"

function video(youtubeId: string, position: number): PlaylistVideo {
  return {
    youtubeId,
    title: youtubeId,
    thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    duration: "10:00",
    position,
  }
}

function shortVideo(youtubeId: string, position: number, duration = "0:45"): PlaylistVideo {
  return { ...video(youtubeId, position), duration }
}

function playlist(playlistId: string, videos: PlaylistVideo[]): Playlist {
  return {
    id: `pl-scholar-${playlistId}`,
    playlistId,
    title: playlistId,
    scholarId: "scholar",
    scholarName: "Scholar",
    thumbnail: "thumbnail",
    videoCount: videos.length,
    firstVideoId: videos[0]?.youtubeId ?? "",
    videos,
  }
}

test("extracts the internal client config without using an official API key", () => {
  const html = `
    <script>ytcfg.set({"INNERTUBE_API_KEY":"internal-key","INNERTUBE_CONTEXT":{"client":{"clientName":"WEB","clientVersion":"1.2"}}});</script>
    <script>var ytInitialData = {"contents":[]};</script>
  `

  assert.deepEqual(extractYouTubeConfig(html), {
    initialData: { contents: [] },
    apiKey: "internal-key",
    context: { client: { clientName: "WEB", clientVersion: "1.2" } },
  })
})

test("merges internal client config split across ytcfg calls", () => {
  const html = `
    <script>ytcfg.set({"INNERTUBE_API_KEY":"internal-key"});</script>
    <script>ytcfg.set({"INNERTUBE_CONTEXT":{"client":{"clientName":"WEB","clientVersion":"1.2"}}});</script>
    <script>var ytInitialData = {"contents":[]};</script>
  `

  assert.deepEqual(extractYouTubeConfig(html), {
    initialData: { contents: [] },
    apiKey: "internal-key",
    context: { client: { clientName: "WEB", clientVersion: "1.2" } },
  })
})

test("paginates, deduplicates, and stops at a repeated continuation token", async () => {
  const requested: string[] = []
  const result = await collectPlaylistVideos(
    { videos: [video("aaaaaaaaaaa", 1)], continuationTokens: ["PAGE_2"] },
    async (token) => {
      requested.push(token)
      if (token === "PAGE_2") {
        return {
          videos: [video("aaaaaaaaaaa", 1), video("bbbbbbbbbbb", 2)],
          continuationTokens: ["PAGE_3"],
        }
      }
      return { videos: [video("ccccccccccc", 3)], continuationTokens: ["PAGE_3"] }
    },
    10,
  )

  assert.deepEqual(requested, ["PAGE_2", "PAGE_3"])
  assert.deepEqual(result.map((item) => item.youtubeId), ["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"])
})

test("caps continuation requests", async () => {
  let calls = 0
  const result = await collectPlaylistVideos(
    { videos: [video("aaaaaaaaaaa", 1)], continuationTokens: ["PAGE_1"] },
    async () => {
      calls++
      return { videos: [video(`${calls}`.padStart(11, "b"), calls + 1)], continuationTokens: [`PAGE_${calls + 1}`] }
    },
    2,
  )

  assert.equal(calls, 2)
  assert.equal(result.length, 3)
})

test("retries transient responses and honors Retry-After", async () => {
  const delays: number[] = []
  let attempts = 0
  const response = await fetchWithRetry(
    async () => {
      attempts++
      return attempts === 1
        ? new Response("busy", { status: 429, headers: { "Retry-After": "2" } })
        : new Response("ok")
    },
    { retries: 2, sleep: async (ms) => { delays.push(ms) }, random: () => 0 },
  )

  assert.equal(response.status, 200)
  assert.equal(attempts, 2)
  assert.deepEqual(delays, [2000])
})

test("does not retry permanent client failures", async () => {
  let attempts = 0
  const response = await fetchWithRetry(async () => {
    attempts++
    return new Response("bad request", { status: 400 })
  }, { retries: 3, sleep: async () => {}, random: () => 0 })

  assert.equal(response.status, 400)
  assert.equal(attempts, 1)
})

test("preserves stale playlist entries and hydrated videos after partial refresh failures", () => {
  const oldVideo = video("aaaaaaaaaaa", 1)
  const freshVideo = video("bbbbbbbbbbb", 1)
  const stale = [playlist("STALE", [oldVideo]), playlist("MISSING", [oldVideo])]
  const discovered = [playlist("STALE", []), playlist("FRESH", [])]
  const hydrated = new Map([["FRESH", playlist("FRESH", [freshVideo])]])

  const result = mergePlaylistRefresh(discovered, hydrated, stale)

  assert.deepEqual(result.map((item) => item.playlistId), ["STALE", "FRESH", "MISSING"])
  assert.deepEqual(result[0].videos, [oldVideo])
  assert.deepEqual(result[1].videos, [freshVideo])
  assert.deepEqual(result[2].videos, [oldVideo])
})

test("normalizes legacy playlist JSON without a videos array", () => {
  const legacy = {
    id: "pl-scholar-legacy",
    playlistId: "LEGACY",
    title: "Legacy playlist",
    scholarId: "scholar",
    scholarName: "Scholar",
    thumbnail: "thumbnail",
    videoCount: 5,
    firstVideoId: "aaaaaaaaaaa",
  }

  assert.deepEqual(normalizePlaylist(legacy), { ...legacy, videos: [] })
  assert.equal(normalizePlaylist({ playlistId: "BROKEN" }), null)
})

test("playlistHasLongForm keeps mixed playlists and drops shorts-only ones", () => {
  // Mixed: one long-form video among short clips -> retained (shows all videos).
  assert.equal(
    playlistHasLongForm(playlist("MIXED", [shortVideo("aaaaaaaaaaa", 1), video("bbbbbbbbbbb", 2)])),
    true,
  )
  // Exactly 61s counts as long-form (>= threshold).
  assert.equal(playlistHasLongForm(playlist("EDGE", [shortVideo("ccccccccccc", 1, "1:01")])), true)
  // Every clip under a minute -> dropped.
  assert.equal(
    playlistHasLongForm(playlist("SHORTS", [shortVideo("ddddddddddd", 1), shortVideo("eeeeeeeeeee", 2, "0:59")])),
    false,
  )
  // Videos with no duration (live/upcoming) do not count as long-form.
  assert.equal(playlistHasLongForm(playlist("EMPTY_DUR", [shortVideo("fffffffffff", 1, "")])), false)
  // Genuinely empty playlist -> dropped.
  assert.equal(playlistHasLongForm(playlist("EMPTY", [])), false)
})
