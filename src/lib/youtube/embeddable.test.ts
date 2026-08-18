import assert from "node:assert/strict"
import test from "node:test"
import type { PlaylistVideo } from "@/types"
import {
  createEmbeddabilityProber,
  type EmbeddableStatus,
  filterPlaylistVideos,
  oembedStatus,
} from "./embeddable"

// A fake fetch returning a fixed HTTP status, so oembedStatus never touches the
// network (mirrors how playlist-fetch.test.ts hand-builds Response objects).
function fetchReturning(status: number): typeof fetch {
  return (async () => new Response(status === 200 ? "{}" : "", { status })) as unknown as typeof fetch
}

function fetchThrowing(): typeof fetch {
  return (async () => {
    throw new Error("network down")
  }) as unknown as typeof fetch
}

// An injected classifier driven by an id->status map, counting calls per id so
// tests can assert cache/budget behavior without HTTP.
function classifierFrom(map: Record<string, EmbeddableStatus>) {
  const calls: Record<string, number> = {}
  const probe = async (id: string): Promise<EmbeddableStatus> => {
    calls[id] = (calls[id] ?? 0) + 1
    return map[id] ?? "ok"
  }
  return { probe, calls }
}

function pv(youtubeId: string, position: number): PlaylistVideo {
  return { youtubeId, title: youtubeId, thumbnail: `t-${youtubeId}`, duration: "10:00", position }
}

test("oembedStatus maps 200 to ok", async () => {
  assert.equal(await oembedStatus("vid", { fetch: fetchReturning(200) }), "ok")
})

test("oembedStatus maps 401 and 404 to blocked", async () => {
  assert.equal(await oembedStatus("vid", { fetch: fetchReturning(401) }), "blocked")
  assert.equal(await oembedStatus("vid", { fetch: fetchReturning(404) }), "blocked")
})

test("oembedStatus maps other statuses to unknown (fail-open)", async () => {
  assert.equal(await oembedStatus("vid", { fetch: fetchReturning(429) }), "unknown")
  assert.equal(await oembedStatus("vid", { fetch: fetchReturning(500) }), "unknown")
})

test("oembedStatus maps network errors to unknown (fail-open)", async () => {
  assert.equal(await oembedStatus("vid", { fetch: fetchThrowing() }), "unknown")
})

test("oembedStatus queries the oEmbed endpoint with the encoded watch URL", async () => {
  let requested = ""
  const capture = (async (url: string) => {
    requested = String(url)
    return new Response("{}", { status: 200 })
  }) as unknown as typeof fetch
  await oembedStatus("abc123", { fetch: capture })
  assert.match(requested, /^https:\/\/www\.youtube\.com\/oembed\?/)
  assert.match(requested, /format=json/)
  assert.ok(requested.includes(encodeURIComponent("https://www.youtube.com/watch?v=abc123")))
})

test("keep() drops only blocked ids and keeps ok and unknown (fail-open)", async () => {
  const { probe } = classifierFrom({ a: "ok", b: "blocked", c: "unknown", d: "blocked" })
  const prober = createEmbeddabilityProber({ probe, delayMs: 0, sleep: async () => {} })
  const kept = await prober.keep(["a", "b", "c", "d"])
  assert.deepEqual([...kept].sort(), ["a", "c"])
  assert.equal(prober.stats().blocked, 2)
})

test("keep() probes each unique id once, across calls and duplicates", async () => {
  const { probe, calls } = classifierFrom({ a: "ok", b: "blocked" })
  const prober = createEmbeddabilityProber({ probe, delayMs: 0, sleep: async () => {} })
  await prober.keep(["a", "a", "b"])
  await prober.keep(["a", "b"])
  assert.equal(calls.a, 1)
  assert.equal(calls.b, 1)
  assert.equal(prober.stats().probed, 2)
})

test("keep() stops probing at the budget and keeps the remainder (never mass-drops)", async () => {
  const { probe } = classifierFrom({ a: "blocked", b: "blocked", c: "blocked" })
  // concurrency 1 makes the order deterministic: a, b consume the budget, c is
  // never probed and so survives despite being "blocked" in the map.
  const prober = createEmbeddabilityProber({ probe, budget: 2, concurrency: 1, delayMs: 0, sleep: async () => {} })
  const kept = await prober.keep(["a", "b", "c"])
  assert.equal(prober.stats().probed, 2)
  assert.equal(prober.stats().budgetExhausted, true)
  assert.equal(kept.has("a"), false)
  assert.equal(kept.has("b"), false)
  assert.ok(kept.has("c"))
})

test("filterPlaylistVideos returns the same playlist when nothing is dropped", () => {
  const playlist = { videos: [pv("a", 1), pv("b", 2)], firstVideoId: "a", thumbnail: "thumb-a", videoCount: 50 }
  const result = filterPlaylistVideos(playlist, new Set(["a", "b"]))
  assert.equal(result, playlist)
})

test("filterPlaylistVideos recomputes seed fields when the head video is dropped", () => {
  const playlist = {
    videos: [pv("a", 1), pv("b", 2), pv("c", 3)],
    firstVideoId: "a",
    thumbnail: "https://i.ytimg.com/vi/a/hqdefault.jpg",
    videoCount: 50,
  }
  const result = filterPlaylistVideos(playlist, new Set(["b", "c"]))
  assert.deepEqual(result.videos.map((v) => v.youtubeId), ["b", "c"])
  assert.equal(result.firstVideoId, "b")
  assert.equal(result.thumbnail, "https://i.ytimg.com/vi/b/hqdefault.jpg")
  assert.equal(result.videoCount, 50)
})

test("filterPlaylistVideos leaves seed fields intact when only a non-head video is dropped", () => {
  const playlist = { videos: [pv("a", 1), pv("b", 2), pv("c", 3)], firstVideoId: "a", thumbnail: "thumb-a", videoCount: 50 }
  const result = filterPlaylistVideos(playlist, new Set(["a", "c"]))
  assert.deepEqual(result.videos.map((v) => v.youtubeId), ["a", "c"])
  assert.equal(result.firstVideoId, "a")
  assert.equal(result.thumbnail, "thumb-a")
})

test("filterPlaylistVideos empties videos and clears seed fields when all are dropped", () => {
  const playlist = { videos: [pv("a", 1), pv("b", 2)], firstVideoId: "a", thumbnail: "thumb-a", videoCount: 50 }
  const result = filterPlaylistVideos(playlist, new Set<string>())
  assert.deepEqual(result.videos, [])
  assert.equal(result.firstVideoId, "")
  assert.equal(result.thumbnail, "")
})
