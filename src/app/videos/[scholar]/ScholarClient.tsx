"use client"

import { useState } from "react"
import { VideoGrid } from "@/components/videos/VideoGrid"
import { YouTubeEmbed } from "@/components/videos/YouTubeEmbed"
import { CategoryFilter } from "@/components/videos/CategoryFilter"
import { useScholarVideos } from "@/hooks/useYouTube"
import { getScholarCategories } from "@/lib/youtube/videos"
import type { Video } from "@/types"

interface ScholarClientProps {
  scholarId: string
}

export function ScholarClient({ scholarId }: ScholarClientProps) {
  const { data: videos, isLoading } = useScholarVideos(scholarId)
  const [activeCategory, setActiveCategory] = useState("all")
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null)

  const categories = getScholarCategories(scholarId)

  const filteredVideos =
    activeCategory === "all" ? videos || [] : (videos || []).filter((v) => v.category === activeCategory)

  return (
    <div className="space-y-6">
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      )}
      <VideoGrid
        videos={filteredVideos}
        onPlay={setPlayingVideo}
        isLoading={isLoading}
        emptyMessage="No videos available for this scholar."
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
