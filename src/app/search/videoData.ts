import type { Video } from "@/types"
import { getAllVideos } from "@/lib/youtube/api"

// Search indexes the same real video data the /videos page shows (build-time
// YouTube RSS -> static JSON, mock only as fallback). getAllVideos already
// handles caching and the mock fallback.
export async function loadVideosForSearch(): Promise<Video[]> {
  try {
    return await getAllVideos()
  } catch {
    return []
  }
}
