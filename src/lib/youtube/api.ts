import { apiConfig } from "@/config/api"
import { scholars } from "@/config/scholars"
import { assetPath } from "@/lib/utils"
import { getMockVideos, getMockVideosByScholar } from "./videos"
import type { Video } from "@/types"

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

// Real video data is pre-generated at build time by scripts/fetch-youtube-data.ts
// (scraped from each channel's public "/videos" tab on a US-based CI runner, so
// region-restricted channels still resolve and no API key/quota/billing is
// involved) and shipped as static JSON under public/data/youtube/. Only
// long-form videos are included — Shorts are excluded at fetch time. This site
// is a static export on GitHub Pages — there is no request-time server, so the
// old /api/youtube Cloudflare proxy never runs. We read the static files here
// and fall back to mock data only when a file is missing or empty.
async function fetchStaticJson(file: string): Promise<Video[] | null> {
  try {
    const res = await fetch(assetPath(`/data/youtube/${file}`))
    if (!res.ok) return null
    const data = (await res.json()) as Video[]
    return Array.isArray(data) ? data : null
  } catch (error) {
    console.error("Failed to load YouTube data:", error)
    return null
  }
}

export async function getAllVideos(): Promise<Video[]> {
  const cached = getFromCache("all")
  if (cached) return cached

  const videos = (await fetchStaticJson("all.json")) ?? []

  if (videos.length === 0) {
    const mockVideos = getMockVideos()
    setCache("all", mockVideos)
    return mockVideos
  }

  setCache("all", videos)
  return videos
}

export async function getVideosByScholar(scholarId: string): Promise<Video[]> {
  const cached = getFromCache(`scholar:${scholarId}`)
  if (cached) return cached

  const scholar = scholars.find((s) => s.id === scholarId)

  if (!scholar) {
    const mockVideos = getMockVideosByScholar(scholarId)
    setCache(`scholar:${scholarId}`, mockVideos)
    return mockVideos
  }

  const videos = (await fetchStaticJson(`${scholarId}.json`)) ?? []
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
