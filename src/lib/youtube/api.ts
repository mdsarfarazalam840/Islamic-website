import { apiConfig } from "@/config/api"
import { scholars } from "@/config/scholars"
import { getMockVideos, getMockVideosByScholar, getMockVideosByCategory } from "./videos"
import type { Video } from "@/types"

interface YouTubeSearchResult {
  id: { videoId: string }
  snippet: {
    title: string
    description: string
    thumbnails: { medium: { url: string }; high: { url: string } }
    publishedAt: string
    channelTitle: string
  }
  contentDetails?: { duration: string }
  statistics?: { viewCount: string }
}

const cache = new Map<string, { data: Video[]; timestamp: number }>()

function getFromCache(key: string): Video[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > apiConfig.youtube.cacheTTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: Video[]) {
  cache.set(key, { data, timestamp: Date.now() })
}

export async function fetchVideosFromYouTube(channelId: string): Promise<Video[]> {
  const cached = getFromCache(`channel:${channelId}`)
  if (cached) return cached

  const apiKey = apiConfig.youtube.apiKey
  if (!apiKey) {
    console.warn("YouTube API key not configured, using mock data")
    return []
  }

  try {
    const searchUrl = new URL(`${apiConfig.youtube.baseUrl}/search`)
    searchUrl.searchParams.set("part", "snippet")
    searchUrl.searchParams.set("channelId", channelId)
    searchUrl.searchParams.set("order", "date")
    searchUrl.searchParams.set("maxResults", "20")
    searchUrl.searchParams.set("type", "video")
    searchUrl.searchParams.set("key", apiKey)

    const response = await fetch(searchUrl.toString())
    if (!response.ok) throw new Error(`YouTube API error: ${response.status}`)

    const data = await response.json()
    const scholar = scholars.find((s) => s.channelId === channelId)

    const videos: Video[] = data.items.map((item: YouTubeSearchResult, index: number) => ({
      id: `yt-${channelId}-${index}`,
      youtubeId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      scholarId: scholar?.id || "unknown",
      scholarName: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.high?.url || "",
      duration: "",
      publishedAt: item.snippet.publishedAt,
      category: "spirituality",
      views: 0,
    }))

    setCache(`channel:${channelId}`, videos)
    return videos
  } catch (error) {
    console.error("Failed to fetch YouTube videos:", error)
    return []
  }
}

export async function getAllVideos(): Promise<Video[]> {
  const cached = getFromCache("all")
  if (cached) return cached

  const apiKey = apiConfig.youtube.apiKey
  if (!apiKey) {
    const mockVideos = getMockVideos()
    setCache("all", mockVideos)
    return mockVideos
  }

  const allVideos: Video[] = []
  for (const scholar of scholars) {
    if (scholar.channelId && scholar.channelId !== "UC...") {
      const videos = await fetchVideosFromYouTube(scholar.channelId)
      allVideos.push(...videos)
    }
  }

  if (allVideos.length === 0) {
    const mockVideos = getMockVideos()
    setCache("all", mockVideos)
    return mockVideos
  }

  setCache("all", allVideos)
  return allVideos
}

export async function getVideosByScholar(scholarId: string): Promise<Video[]> {
  const cached = getFromCache(`scholar:${scholarId}`)
  if (cached) return cached

  const apiKey = apiConfig.youtube.apiKey
  const scholar = scholars.find((s) => s.id === scholarId)

  if (!apiKey || !scholar || scholar.channelId === "UC...") {
    const mockVideos = getMockVideosByScholar(scholarId)
    setCache(`scholar:${scholarId}`, mockVideos)
    return mockVideos
  }

  const videos = await fetchVideosFromYouTube(scholar.channelId)
  const enriched = videos.map((v) => ({ ...v, scholarId, scholarName: scholar.name }))

  if (enriched.length === 0) {
    const mockVideos = getMockVideosByScholar(scholarId)
    setCache(`scholar:${scholarId}`, mockVideos)
    return mockVideos
  }

  setCache(`scholar:${scholarId}`, enriched)
  return enriched
}

export async function getVideosByCategory(category: string): Promise<Video[]> {
  if (!category || category === "all") return getAllVideos()

  const allVideos = await getAllVideos()
  return allVideos.filter((v) => v.category === category)
}

export function formatViewCount(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
  return views.toString()
}

export function formatPublishedAt(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}
