import assert from "node:assert/strict"
import test from "node:test"
import { mergePlaylistVideos, parsePlaylistPage } from "./playlist-parser"

function playlistVideoRenderer(
  videoId: string,
  title: string,
  duration: string,
  index: number,
) {
  return {
    playlistVideoRenderer: {
      videoId,
      title: { runs: [{ text: title }] },
      index: { simpleText: String(index) },
      lengthText: { simpleText: duration },
      thumbnail: {
        thumbnails: [
          { url: `https://i.ytimg.com/vi/${videoId}/default.jpg`, width: 120 },
          { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, width: 480 },
        ],
      },
    },
  }
}

function playlistVideoLockup(
  videoId: string,
  title: string,
  duration: string,
) {
  return {
    lockupViewModel: {
      contentId: videoId,
      metadata: {
        lockupMetadataViewModel: {
          title: { content: title },
        },
      },
      contentImage: {
        thumbnailViewModel: {
          image: {
            sources: [
              { url: `https://i.ytimg.com/vi/${videoId}/default.jpg`, width: 120 },
              { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, width: 480 },
            ],
          },
          overlays: [{
            thumbnailBottomOverlayViewModel: {
              badges: [{
                thumbnailBadgeViewModel: { text: duration },
              }],
            },
          }],
        },
      },
    },
  }
}

test("parses every playlist video regardless of duration and reads continuation tokens", () => {
  const data = {
    contents: [
      playlistVideoRenderer("aaaaaaaaaaa", "First lecture", "12:34", 1),
      playlistVideoRenderer("bbbbbbbbbbb", "A short", "0:59", 2),
      playlistVideoRenderer("ccccccccccc", "Second lecture", "1:02:03", 3),
      playlistVideoRenderer("ddddddddddd", "Upcoming stream", "", 4),
      {
        continuationItemRenderer: {
          continuationEndpoint: {
            continuationCommand: { token: "NEXT_PAGE" },
          },
        },
      },
    ],
  }

  assert.deepEqual(parsePlaylistPage(data), {
    videos: [
      {
        youtubeId: "aaaaaaaaaaa",
        title: "First lecture",
        thumbnail: "https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg",
        duration: "12:34",
        position: 1,
      },
      {
        youtubeId: "bbbbbbbbbbb",
        title: "A short",
        thumbnail: "https://i.ytimg.com/vi/bbbbbbbbbbb/hqdefault.jpg",
        duration: "0:59",
        position: 2,
      },
      {
        youtubeId: "ccccccccccc",
        title: "Second lecture",
        thumbnail: "https://i.ytimg.com/vi/ccccccccccc/hqdefault.jpg",
        duration: "1:02:03",
        position: 3,
      },
      {
        youtubeId: "ddddddddddd",
        title: "Upcoming stream",
        thumbnail: "https://i.ytimg.com/vi/ddddddddddd/hqdefault.jpg",
        duration: "",
        position: 4,
      },
    ],
    continuationTokens: ["NEXT_PAGE"],
  })
})

test("supports continuation video renderers and deduplicates pages in source order", () => {
  const firstPage = parsePlaylistPage({
    contents: [playlistVideoRenderer("aaaaaaaaaaa", "First", "10:00", 1)],
  })
  const continuationPage = parsePlaylistPage({
    onResponseReceivedActions: [{
      appendContinuationItemsAction: {
        continuationItems: [
          playlistVideoRenderer("aaaaaaaaaaa", "First duplicate", "10:00", 1),
          playlistVideoRenderer("bbbbbbbbbbb", "Second", "20:00", 2),
        ],
      },
    }],
  })

  assert.deepEqual(
    mergePlaylistVideos([firstPage.videos, continuationPage.videos]).map((video) => video.title),
    ["First", "Second"],
  )
})

test("reads compact renderer text and falls back to a canonical thumbnail", () => {
  const data = {
    playlistVideoRenderer: {
      videoId: "eeeeeeeeeee",
      title: { simpleText: "Compact title" },
      lengthText: { runs: [{ text: "2:15" }] },
    },
  }

  assert.deepEqual(parsePlaylistPage(data).videos, [{
    youtubeId: "eeeeeeeeeee",
    title: "Compact title",
    thumbnail: "https://i.ytimg.com/vi/eeeeeeeeeee/hqdefault.jpg",
    duration: "2:15",
    position: 1,
  }])
})

test("parses every playlist lockup regardless of duration", () => {
  const data = {
    contents: [
      playlistVideoLockup("fffffffffff", "Under a minute", "0:59"),
      playlistVideoLockup("ggggggggggg", "Exactly a minute", "1:00"),
      playlistVideoLockup("hhhhhhhhhhh", "Over a minute", "1:01"),
      playlistVideoLockup("iiiiiiiiiii", "Long lecture", "2:03:04"),
      {
        continuationItemRenderer: {
          continuationEndpoint: {
            continuationCommand: { token: "LOCKUP_NEXT_PAGE" },
          },
        },
      },
    ],
  }

  assert.deepEqual(parsePlaylistPage(data), {
    videos: [
      {
        youtubeId: "fffffffffff",
        title: "Under a minute",
        thumbnail: "https://i.ytimg.com/vi/fffffffffff/hqdefault.jpg",
        duration: "0:59",
        position: 1,
      },
      {
        youtubeId: "ggggggggggg",
        title: "Exactly a minute",
        thumbnail: "https://i.ytimg.com/vi/ggggggggggg/hqdefault.jpg",
        duration: "1:00",
        position: 2,
      },
      {
        youtubeId: "hhhhhhhhhhh",
        title: "Over a minute",
        thumbnail: "https://i.ytimg.com/vi/hhhhhhhhhhh/hqdefault.jpg",
        duration: "1:01",
        position: 3,
      },
      {
        youtubeId: "iiiiiiiiiii",
        title: "Long lecture",
        thumbnail: "https://i.ytimg.com/vi/iiiiiiiiiii/hqdefault.jpg",
        duration: "2:03:04",
        position: 4,
      },
    ],
    continuationTokens: ["LOCKUP_NEXT_PAGE"],
  })
})
