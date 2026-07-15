"use client"

import { useState } from "react"
import { VideoGrid } from "@/components/videos/VideoGrid"
import { YouTubeEmbed } from "@/components/videos/YouTubeEmbed"
import { CategoryFilter } from "@/components/videos/CategoryFilter"
import { useAllVideos } from "@/hooks/useYouTube"
import { getCategories } from "@/lib/youtube/videos"
import type { Video } from "@/types"

export function VideosClient() {
  const { data: videos, isLoading } = useAllVideos()
  const [activeCategory, setActiveCategory] = useState("all")
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null)

  const categories = getCategories()

  const filteredVideos =
    activeCategory === "all" ? videos || [] : (videos || []).filter((v) => v.category === activeCategory)

  return (
    <div className="space-y-6">
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <VideoGrid
        videos={filteredVideos}
        onPlay={setPlayingVideo}
        isLoading={isLoading}
        emptyMessage="No videos available. Configure YouTube API key for live content."
      />
      {playingVideo && (
        <YouTubeEmbed
          videoId={playingVideo.youtubeId}
          title={playingVideo.title}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </div>
  )
}
