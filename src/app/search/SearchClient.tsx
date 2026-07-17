"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Search, BookOpen, Loader2, ArrowRight, X, MessageSquareText, Video } from "lucide-react"
import Fuse from "fuse.js"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getAllSurahs } from "@/lib/quran/surahs"
import { COLLECTION_DISPLAY_NAMES } from "@/lib/hadith/collections"
import { loadAllHadiths } from "./hadithData"
import { loadVideosForSearch } from "./videoData"
import type { Ayah, Surah, Hadith, Video as VideoType } from "@/types"

const QURAN_KEYS = [
  { name: "translations.en", weight: 1 },
  { name: "translations.hi", weight: 0.8 },
  { name: "translations.ur", weight: 0.8 },
  { name: "arabic", weight: 0.6 },
]

const HADITH_KEYS = [
  { name: "english", weight: 1 },
  { name: "arabic", weight: 0.6 },
  { name: "narrator", weight: 0.4 },
  { name: "bookName", weight: 0.3 },
]

const SEARCH_OPTIONS = {
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
}

type ContentTab = "quran" | "hadith" | "videos"

const tabLabels: Record<ContentTab, { label: string; icon: typeof Search }> = {
  quran: { label: "Quran", icon: BookOpen },
  hadith: { label: "Hadith", icon: MessageSquareText },
  videos: { label: "Videos", icon: Video },
}

interface QuranResult {
  type: "quran"
  ayah: Ayah
  score?: number
}

interface HadithResult {
  type: "hadith"
  hadith: Hadith
  score?: number
}

interface VideoResult {
  type: "video"
  video: VideoType
  score?: number
}

type SearchResult = QuranResult | HadithResult | VideoResult

export function SearchClient() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [activeTab, setActiveTab] = useState<ContentTab>("quran")
  const [quranFuse, setQuranFuse] = useState<Fuse<Ayah> | null>(null)
  const [hadithFuse, setHadithFuse] = useState<Fuse<Hadith> | null>(null)
  const [videoFuse, setVideoFuse] = useState<Fuse<VideoType> | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [dataStatus, setDataStatus] = useState({ quran: false, hadith: false, videos: false })
  const inputRef = useRef<HTMLInputElement>(null)

  const surahs = getAllSurahs()
  const surahMap = useMemo(() => new Map(surahs.map((s) => [s.number, s])), [surahs])

  useEffect(() => {
    async function loadAll() {
      setLoadingData(true)
      const status = { quran: false, hadith: false, videos: false }

      // Load Quran: single combined file + pre-built search index
      try {
        const [ayahsRes, indexRes] = await Promise.all([
          fetch("/data/quran/quran-all.json"),
          fetch("/data/quran/quran-search-index.json"),
        ])
        if (ayahsRes.ok && indexRes.ok) {
          const [allAyahs, indexData] = await Promise.all([
            ayahsRes.json() as Promise<Ayah[]>,
            indexRes.json(),
          ])
          const index = Fuse.parseIndex<Ayah>(indexData)
          setQuranFuse(new Fuse(allAyahs, SEARCH_OPTIONS, index))
          status.quran = true
        }
      } catch (err) {
        console.error("Failed to load Quran data:", err)
      }
      // Fallback: if pre-built index failed, try loading individual files
      if (!status.quran) {
        try {
          const allAyahs: Ayah[] = []
          for (let i = 1; i <= 114; i++) {
            const res = await fetch(`/data/quran/surah-${i}.json`)
            const data: Ayah[] = await res.json()
            allAyahs.push(...data)
          }
          setQuranFuse(new Fuse(allAyahs, { keys: QURAN_KEYS, ...SEARCH_OPTIONS }))
          status.quran = true
        } catch (err) {
          console.error("Failed to load Quran data (fallback):", err)
        }
      }

      // Load Hadith: single combined file + pre-built search index
      try {
        const [hadithRes, indexRes] = await Promise.all([
          fetch("/data/hadith/hadith-all.json"),
          fetch("/data/hadith/hadith-search-index.json"),
        ])
        if (hadithRes.ok && indexRes.ok) {
          const [allHadithsRaw, indexData] = await Promise.all([
            hadithRes.json(),
            indexRes.json(),
          ])
          const allHadiths: Hadith[] = allHadithsRaw.map((h: any) => ({
            id: `${h.collection}-${h.number}`,
            collection: h.collection,
            bookId: h.bookId,
            bookName: h.bookName || "",
            chapterId: h.chapterId,
            chapterName: h.chapterName || "",
            hadithNumber: h.number,
            arabic: h.arabic || "",
            english: h.english || "",
            urdu: h.urdu || "",
            narrator: h.narrator || "",
            grade: h.grade || "",
            reference: {
              collection: COLLECTION_DISPLAY_NAMES[h.collection as keyof typeof COLLECTION_DISPLAY_NAMES] ?? h.collection,
              book: h.bookName || "",
              hadithNumber: h.number,
              bookNumber: h.bookId,
            },
            tags: [],
          }))
          const index = Fuse.parseIndex<Hadith>(indexData)
          setHadithFuse(new Fuse(allHadiths, SEARCH_OPTIONS, index))
          status.hadith = true
        }
      } catch (err) {
        console.error("Failed to load Hadith data:", err)
      }
      // Fallback: load via individual book files
      if (!status.hadith) {
        try {
          const allHadiths = await loadAllHadiths()
          if (allHadiths.length > 0) {
            setHadithFuse(new Fuse(allHadiths, { keys: HADITH_KEYS, ...SEARCH_OPTIONS }))
          }
          status.hadith = true
        } catch (err) {
          console.error("Failed to load Hadith data (fallback):", err)
        }
      }

      // Load Videos
      try {
        const allVideos = await loadVideosForSearch()
        if (allVideos.length > 0) {
          setVideoFuse(
            new Fuse(allVideos, {
              keys: [
                { name: "title", weight: 1 },
                { name: "description", weight: 0.7 },
                { name: "scholarName", weight: 0.4 },
              ],
              ...SEARCH_OPTIONS,
            })
          )
        }
        status.videos = true
      } catch (err) {
        console.error("Failed to load Video data:", err)
      }

      setDataStatus(status)
      setLoadingData(false)
    }
    loadAll()
  }, [])

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q)
      if (!q.trim()) {
        setResults([])
        setSearched(false)
        return
      }
      setLoading(true)
      setSearched(true)

      const trimmed = q.trim()
      const allResults: SearchResult[] = []

      if (activeTab === "quran" && quranFuse) {
        const raw = quranFuse.search(trimmed)
        allResults.push(
          ...raw.slice(0, 30).map((r) => ({ type: "quran" as const, ayah: r.item, score: r.score }))
        )
      }

      if (activeTab === "hadith" && hadithFuse) {
        const raw = hadithFuse.search(trimmed)
        allResults.push(
          ...raw.slice(0, 30).map((r) => ({ type: "hadith" as const, hadith: r.item, score: r.score }))
        )
      }

      if (activeTab === "videos" && videoFuse) {
        const raw = videoFuse.search(trimmed)
        allResults.push(
          ...raw.slice(0, 30).map((r) => ({ type: "video" as const, video: r.item, score: r.score }))
        )
      }

      allResults.sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      setResults(allResults.slice(0, 50))
      setLoading(false)
    },
    [activeTab, quranFuse, hadithFuse, videoFuse],
  )

  const clearSearch = () => {
    setQuery("")
    setResults([])
    setSearched(false)
    inputRef.current?.focus()
  }

  const allLoaded = dataStatus.quran && dataStatus.hadith && dataStatus.videos

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 relative">
      <div className="search-beam absolute inset-0 pointer-events-none" />
      <div className="flex items-center gap-3 mb-6 relative">
        <Search className="size-6 text-gold-light" />
        <div>
          <h1 className="text-2xl font-display gold-gradient-text font-bold">Search</h1>
          <p className="text-sm text-muted-foreground">
            Search across Quran, Hadith, and Videos
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(query) }}
            placeholder={
              loadingData
                ? "Loading search data..."
                : `Search ${activeTab} by keyword...`
            }
            disabled={loadingData}
            className="w-full rounded-xl border border-border/50 bg-card px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-secondary/50 transition-colors disabled:opacity-50"
            aria-label="Search"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-surface p-1" role="tablist" aria-label="Search content type">
            {(Object.entries(tabLabels) as [ContentTab, typeof tabLabels[ContentTab]][]).map(([key, { label, icon: Icon }]) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => { setActiveTab(key); if (query) handleSearch(query) }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  activeTab === key
                    ? "gold-gradient-bg text-space-deep shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          {!loadingData && allLoaded && results.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {loadingData && (
        <div className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="size-5 animate-spin text-gold-light" />
          <div>
            <p className="text-sm text-foreground">Loading search data...</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dataStatus.quran ? "✓" : "..."} Quran &middot;
              {dataStatus.hadith ? " ✓" : " ..."} Hadith &middot;
              {dataStatus.videos ? " ✓" : " ..."} Videos
            </p>
          </div>
        </div>
      )}

      {!loadingData && loading && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="size-5 animate-spin text-gold-light" />
          <p className="text-sm text-muted-foreground">Searching...</p>
        </div>
      )}

      {!loadingData && !loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-12 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-medium text-foreground">No results found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different keyword or switch to another content type.
          </p>
        </div>
      )}

      {!loadingData && results.length > 0 && (
        <div className="mt-6 space-y-3">
          {results.map((r) => {
            if (r.type === "quran") {
              const surah = surahMap.get(r.ayah.surahNumber)
              return (
                <Link
                  key={`quran-${r.ayah.number}`}
                  href={`/quran/${r.ayah.surahNumber}#ayah-${r.ayah.number}`}
                  className="group block rounded-xl border border-border/30 bg-card/50 p-4 transition-all duration-200 hover:border-secondary/20 hover:bg-card"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gold-dim/15 px-2 py-0.5 text-xs font-medium text-gold-light">
                        {r.ayah.surahNumber}:{r.ayah.ayahNumber}
                      </span>
                      {surah && (
                        <span className="text-xs text-muted-foreground">
                          {surah.name} &middot; Juz {r.ayah.juz}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <p className="text-lg font-arabic text-foreground leading-[2] mb-2" dir="rtl">
                    {r.ayah.arabic}
                  </p>
                  {r.ayah.translations.en && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {r.ayah.translations.en}
                    </p>
                  )}
                </Link>
              )
            }

            if (r.type === "hadith") {
              const h = r.hadith
              const collectionColor = h.collection === "bukhari" ? "text-gold-light" : "text-emerald"
              return (
                <Link
                  key={`hadith-${h.id}`}
                  href={`/hadith/${h.collection}/${h.bookId}#hadith-${h.hadithNumber}`}
                  className="group block rounded-xl border border-border/30 bg-card/50 p-4 transition-all duration-200 hover:border-secondary/20 hover:bg-card"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("rounded px-2 py-0.5 text-xs font-medium", collectionColor, "bg-current/10")}>
                        {h.reference.collection}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {h.bookName} &middot; Hadith {h.hadithNumber}
                      </span>
                      {h.grade && (
                        <span className="rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald">
                          {h.grade}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  {h.narrator && (
                    <p className="text-xs text-muted-foreground/60 mb-1.5 italic">
                      Narrated by {h.narrator}
                    </p>
                  )}
                  <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                    {h.english}
                  </p>
                </Link>
              )
            }

            if (r.type === "video") {
              const v = r.video
              return (
                <Link
                  key={`video-${v.id}`}
                  href={`/videos/${v.scholarId}`}
                  className="group block rounded-xl border border-border/30 bg-card/50 p-4 transition-all duration-200 hover:border-secondary/20 hover:bg-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-24 aspect-video rounded-lg overflow-hidden bg-surface">
                      <img
                        src={v.thumbnail}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-gold-light transition-colors">
                          {v.title}
                        </h3>
                        <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{v.scholarName}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">{v.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="rounded bg-gold-dim/15 px-1.5 py-0.5 text-[10px] font-medium text-gold-light">
                          {v.category}
                        </span>
                        {v.duration && (
                          <span className="text-[10px] text-muted-foreground">{v.duration}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            }

            return null
          })}
        </div>
      )}

      {!loadingData && !searched && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground text-sm">
            Search for any word or phrase across Quran, Hadith, and Videos
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Select a content type above to narrow your search
          </p>
        </div>
      )}
    </div>
  )
}
