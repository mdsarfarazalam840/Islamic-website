import type { MetadataRoute } from "next"
import { getAllSurahs } from "@/lib/quran/surahs"
import { scholars } from "@/config/scholars"
import { getAllHadiths, getCollection } from "@/lib/hadith/translations"

export const dynamic = "force-static"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://quran-website.pages.dev"

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1.0 },
    { url: `${baseUrl}/quran`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/hadith`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/videos`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ]

  const surahs = getAllSurahs()
  const surahRoutes: MetadataRoute.Sitemap = surahs.map((s) => ({
    url: `${baseUrl}/quran/${s.number}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  const hadithRoutes: MetadataRoute.Sitemap = []

  const bukhariMeta = getCollection("bukhari")
  if (bukhariMeta) {
    const bookIds = Object.keys(bukhariMeta.books).map(Number)
    for (const bookId of bookIds) {
      hadithRoutes.push({
        url: `${baseUrl}/hadith/bukhari/${bookId}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })
    }
  }

  const muslimMeta = getCollection("muslim")
  if (muslimMeta) {
    const bookIds = Object.keys(muslimMeta.books).map(Number)
    for (const bookId of bookIds) {
      hadithRoutes.push({
        url: `${baseUrl}/hadith/muslim/${bookId}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })
    }
  }

  const scholarRoutes: MetadataRoute.Sitemap = scholars.map((s) => ({
    url: `${baseUrl}/videos/${s.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  return [
    ...staticRoutes,
    ...surahRoutes,
    ...hadithRoutes,
    ...scholarRoutes,
  ]
}
