"use client"

import { useEffect, useMemo, useState } from "react"
import { VideoGrid } from "@/components/videos/VideoGrid"
import { YouTubeEmbed } from "@/components/videos/YouTubeEmbed"
import { CategoryFilter } from "@/components/videos/CategoryFilter"
import { Pagination } from "@/components/shared/Pagination"
import { useScholarVideos } from "@/hooks/useYouTube"
import { getScholarCategories } from "@/lib/youtube/videos"
import type { Video } from "@/types"

// How many videos to show per page.
const PAGE_SIZE = 12

interface ScholarClientProps {
  scholarId: string
}

export function ScholarClient({ scholarId }: ScholarClientProps) {
  const { data: videos, isLoading } = useScholarVideos(scholarId)
  const [activeCategory, setActiveCategory] = useState("all")
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null)
  const [page, setPage] = useState(1)

  const categories = getScholarCategories(scholarId)

  const filteredVideos = useMemo(
    () =>
      activeCategory === "all"
        ? videos || []
        : (videos || []).filter((v) => v.category === activeCategory),
    [videos, activeCategory],
  )

  // Reset to the first page whenever the active category changes.
  useEffect(() => {
    setPage(1)
  }, [activeCategory])

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const visibleVideos = filteredVideos.slice(start, start + PAGE_SIZE)

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages))
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }))
  }

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
        videos={visibleVideos}
        onPlay={setPlayingVideo}
        isLoading={isLoading}
        emptyMessage="No videos available for this scholar."
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />
      {!isLoading && filteredVideos.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {start + 1}–{start + visibleVideos.length} of {filteredVideos.length}
          {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
        </p>
      )}
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
