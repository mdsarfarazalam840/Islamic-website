import type { Video } from "@/types"
import { getMockVideos } from "@/lib/youtube/videos"

export async function loadVideosForSearch(): Promise<Video[]> {
  try {
    const mockData = getMockVideos()
    return mockData
  } catch {
    return []
  }
}
