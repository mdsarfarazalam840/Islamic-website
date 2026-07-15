"use client"

import { useQuery } from "@tanstack/react-query"
import { getAllVideos, getVideosByScholar, getVideosByCategory } from "@/lib/youtube/api"
import type { Video } from "@/types"

export function useAllVideos() {
  return useQuery<Video[]>({
    queryKey: ["youtube", "all"],
    queryFn: getAllVideos,
    staleTime: 5 * 60 * 1000,
  })
}

export function useScholarVideos(scholarId: string) {
  return useQuery<Video[]>({
    queryKey: ["youtube", "scholar", scholarId],
    queryFn: () => getVideosByScholar(scholarId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCategoryVideos(category: string) {
  return useQuery<Video[]>({
    queryKey: ["youtube", "category", category],
    queryFn: () => getVideosByCategory(category),
    staleTime: 5 * 60 * 1000,
  })
}
