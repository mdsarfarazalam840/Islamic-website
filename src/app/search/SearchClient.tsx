"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Search, BookOpen, Loader2, ArrowRight, X, MessageSquareText, Video } from "lucide-react"
import Fuse from "fuse.js"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { getAllSurahs } from "@/lib/quran/surahs"
import { COLLECTION_DISPLAY_NAMES } from "@/lib/hadith/collections"
import { loadVideosForSearch } from "./videoData"
import { getPagefind, type PagefindResultData } from "./pagefind"
import type { Ayah, Hadith, Video as VideoType } from "@/types"

// Quran & Hadith are searched via the static Pagefind index (fragment fetches,
// tens of KB per query). Only Videos — a tiny in-memory list — still use Fuse.
const SEARCH_OPTIONS = {
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
}

// How many Pagefind hits to hydrate per query. Each hydration is a small
// fragment fetch, so cap it to keep a search cheap.
const MAX_RESULTS = 30

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export type ContentTab = "quran" | "hadith" | "videos"

const tabLabels: Record<ContentTab, { label: string; icon: typeof Search }> = {
  quran: { label: "Quran", icon: BookOpen },
  hadith: { label: "Hadith", icon: MessageSquareText },
  videos: { label: "Videos", icon: Video },
}

interface QuranResult {
  type: "quran"
  ayah: Ayah
  excerpt?: string
  score?: number
}

interface HadithResult {
  type: "hadith"
  hadith: Hadith
  excerpt?: string
  score?: number
}

interface VideoResult {
  type: "video"
  video: VideoType
  score?: number
}

type SearchResult = QuranResult | HadithResult | VideoResult

const VALID_TABS: ContentTab[] = ["quran", "hadith", "videos"]

/** Parse the surah/ayah numbers Pagefind encoded in a Quran result's meta. */
function pagefindToQuran(d: PagefindResultData): QuranResult | null {
  const m = d.meta
  // url looks like /quran/{surah}#ayah-{globalNumber}
  const num = Number(d.url.split("#ayah-")[1] ?? "")
  const surahNumber = Number(m.surah ?? "0")
  const ayahNumber = Number(m.ayah ?? "0")
  if (!surahNumber || !ayahNumber) return null
  return {
    type: "quran",
    excerpt: d.excerpt,
    ayah: {
      number: Number.isFinite(num) ? num : 0,
      surahNumber,
      ayahNumber,
      juz: Number(m.juz ?? "0"),
      // Text comes from the highlighted excerpt; the card falls back to it.
      arabic: "",
      translations: { en: "", hi: "", ur: "" },
    } as Ayah,
  }
}

/** Rebuild a Hadith card object from a Pagefind hadith result's meta. */
function pagefindToHadith(d: PagefindResultData): HadithResult | null {
  const m = d.meta
  const collection = (m.collection ?? "") as Hadith["collection"]
  const hadithNumber = Number(m.hadithNumber ?? "0")
  // url looks like /hadith/{collection}/{bookId}#hadith-{collection}-{number}
  const bookId = Number(d.url.split("/")[3]?.split("#")[0] ?? "0")
  if (!collection || !hadithNumber) return null
  return {
    type: "hadith",
    excerpt: d.excerpt,
    hadith: {
      id: `${collection}-${hadithNumber}`,
      collection,
      bookId,
      bookName: m.book ?? "",
      chapterId: 0,
      chapterName: "",
      hadithNumber,
      arabic: "",
      english: "",
      urdu: "",
      narrator: m.narrator ?? "",
      grade: m.grade ?? "",
      reference: {
        collection: m.collectionName ?? COLLECTION_DISPLAY_NAMES[collection] ?? collection,
        book: m.book ?? "",
        hadithNumber,
        bookNumber: bookId,
      },
      tags: [],
    } as Hadith,
  }
}

export function SearchClient() {
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") ?? ""
  const initialTab = searchParams.get("tab") as ContentTab ?? "quran"
  const [query, setQuery] = useState(initialQ)
  const [searched, setSearched] = useState(!!initialQ.trim())
  const [activeTab, setActiveTab] = useState<ContentTab>(VALID_TABS.includes(initialTab) ? initialTab : "quran")
  // Videos are a tiny in-memory list — still Fuse. Quran/Hadith use Pagefind.
  const [videoFuse, setVideoFuse] = useState<Fuse<VideoType> | null>(null)
  const [pfResults, setPfResults] = useState<SearchResult[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  const surahs = getAllSurahs()
  const surahMap = useMemo(() => new Map(surahs.map((s) => [s.number, s])), [surahs])

  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (activeTab !== "quran") params.set("tab", activeTab)
    const qs = params.toString()
    const url = `/search${qs ? `?${qs}` : ""}`
    history.replaceState(null, "", url)
  }, [query, activeTab])

  // Videos are tiny and stay client-side; load the Fuse index lazily the first
  // time the user actually searches the Videos tab.
  const videoLoadedRef = useRef(false)
  useEffect(() => {
    if (activeTab !== "videos" || !searched || videoLoadedRef.current) return
    videoLoadedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const allVideos = await loadVideosForSearch()
        if (cancelled || allVideos.length === 0) return
        setVideoFuse(
          new Fuse(allVideos, {
            keys: [
              { name: "title", weight: 1 },
              { name: "description", weight: 0.7 },
              { name: "scholarName", weight: 0.4 },
            ],
            ...SEARCH_OPTIONS,
          }),
        )
      } catch (err) {
        console.error("Failed to load Video data:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeTab, searched])

  // Plain function — the React Compiler handles memoization; a manual
  // useCallback([]) trips its preserve-memoization check on the setState refs.
  const handleSearch = (q: string) => {
    setQuery(q)
    setSearched(!!q.trim())
  }

  // Quran & Hadith: query the static Pagefind index. Each query pulls only the
  // matching index chunks + result fragments (tens of KB), never the corpus.
  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    let cancelled = false

    ;(async () => {
      // Empty query or the Videos tab (handled by Fuse below) → no PF results.
      if (!trimmed || activeTab === "videos") {
        setPfResults((prev) => (prev.length ? [] : prev))
        return
      }
      setLoadingData(true)
      try {
        const pf = await getPagefind()
        const search = await pf.search(trimmed, { filters: { type: activeTab } })
        const top = search.results.slice(0, MAX_RESULTS)
        const data = await Promise.all(top.map((r) => r.data()))
        if (cancelled) return
        const mapped = data
          .map((d) => (activeTab === "quran" ? pagefindToQuran(d) : pagefindToHadith(d)))
          .filter((r): r is QuranResult | HadithResult => r !== null)
        setPfResults(mapped)
      } catch (err) {
        console.error("Pagefind search failed:", err)
        if (!cancelled) setPfResults([])
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, activeTab])

  // Videos remain a synchronous in-memory Fuse search.
  const results = useMemo(() => {
    const trimmed = debouncedQuery.trim()
    if (!trimmed) return []

    if (activeTab === "videos") {
      if (!videoFuse) return []
      return videoFuse
        .search(trimmed)
        .slice(0, MAX_RESULTS)
        .map((r) => ({ type: "video" as const, video: r.item, score: r.score }))
    }

    // Quran & Hadith results come from the async Pagefind effect above.
    return pfResults
  }, [debouncedQuery, activeTab, videoFuse, pfResults])

  const clearSearch = () => {
    setQuery("")
    setSearched(false)
    history.replaceState(null, "", "/search")
    inputRef.current?.focus()
  }

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
            placeholder={`Search ${activeTab} by keyword...`}
            className="w-full rounded-xl border border-border/50 bg-card px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-secondary/50 transition-colors"
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
                onClick={() => { setActiveTab(key) }}
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

          {results.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {loadingData && (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin text-gold-light" />
          <span>Loading {tabLabels[activeTab].label}…</span>
        </div>
      )}

      {searched && !loadingData && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-12 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-medium text-foreground">No results found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different keyword or switch to another content type.
          </p>
        </div>
      )}

      {results.length > 0 && (
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
                  {r.excerpt && (
                    <p
                      className="text-sm text-muted-foreground leading-relaxed pf-excerpt"
                      // Pagefind excerpts are HTML-entity-encoded with <mark> highlights; safe to render.
                      dangerouslySetInnerHTML={{ __html: r.excerpt }}
                    />
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
                  href={`/hadith/${h.collection}/${h.bookId}#hadith-${h.id}`}
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
                  {r.excerpt && (
                    <p
                      className="text-sm text-foreground leading-relaxed line-clamp-3 pf-excerpt"
                      // Pagefind excerpts are HTML-entity-encoded with <mark> highlights; safe to render.
                      dangerouslySetInnerHTML={{ __html: r.excerpt }}
                    />
                  )}
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

      {!searched && (
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
