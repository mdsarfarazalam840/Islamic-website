"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Search, BookOpen, Loader2, ArrowRight, X, MessageSquareText, Video, Library } from "lucide-react"
import Fuse from "fuse.js"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { getAllSurahs } from "@/lib/quran/surahs"
import { COLLECTION_DISPLAY_NAMES } from "@/lib/hadith/collections"
import { parseHadithReference } from "@/lib/hadith/numberIndex"
import {
  HadithReferenceResults,
  type HadithReferenceResolution,
} from "@/components/hadith/HadithReferenceResults"
import { useDebounce } from "@/hooks/useDebounce"
import { loadVideosForSearch } from "./videoData"
import { getPagefind, type PagefindResultData } from "./pagefind"
import type { Ayah, Hadith, Video as VideoType } from "@/types"

const SEARCH_OPTIONS = {
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
}

// Upper bound on how many hits we keep refs for per type. Refs are cheap
// (id + a lazy data() thunk); we only pay the fragment fetch when a page is
// actually shown.
const MAX_RESULTS = 100
// How many results to hydrate/render per "page" in each section.
const PAGE_SIZE = 10

// A single un-hydrated Pagefind hit: the fragment is fetched lazily via data().
type PagefindRef = { id: string; data: () => Promise<PagefindResultData> }

interface QuranResult {
  type: "quran"
  ayah: Ayah
  excerpt?: string
}

interface HadithResult {
  type: "hadith"
  hadith: Hadith
  excerpt?: string
}

interface VideoResult {
  type: "video"
  video: VideoType
}

interface KnowledgeResult {
  type: "knowledge"
  url: string
  title: string
  category: string
  categoryName: string
  excerpt?: string
}

function pagefindToQuran(d: PagefindResultData): QuranResult | null {
  const m = d.meta
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
      arabic: "",
      translations: { en: "", hi: "", ur: "" },
    } as Ayah,
  }
}

function pagefindToHadith(d: PagefindResultData): HadithResult | null {
  const m = d.meta
  const collection = (m.collection ?? "") as Hadith["collection"]
  const hadithNumber = Number(m.hadithNumber ?? "0")
  const bookIdFromUrl = d.url.split("#")[0].split("/").filter(Boolean).pop() ?? ""
  const bookId = Number(m.bookId ?? bookIdFromUrl ?? "0")
  if (!collection || !hadithNumber || !Number.isFinite(bookId)) return null
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

function pagefindToKnowledge(d: PagefindResultData): KnowledgeResult | null {
  const m = d.meta
  // Prefer the meta-provided path parts; fall back to the record URL so a
  // record missing meta still links somewhere sensible.
  const category = m.category ?? ""
  const slug = m.slug ?? ""
  const url = category && slug ? `/knowledge-base/${category}/${slug}` : d.url
  if (!url) return null
  return {
    type: "knowledge",
    url,
    title: m.title ?? slug,
    category,
    categoryName: m.categoryName ?? category,
    excerpt: d.excerpt,
  }
}

export function SearchClient() {
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") ?? ""
  const [query, setQuery] = useState(initialQ)
  const [searched, setSearched] = useState(!!initialQ.trim())
  const [videoFuse, setVideoFuse] = useState<Fuse<VideoType> | null>(null)
  // Un-hydrated hit refs per type (up to MAX_RESULTS), plus the mapped results
  // hydrated so far and a cursor tracking how many refs we've consumed.
  const [quranRefs, setQuranRefs] = useState<PagefindRef[]>([])
  const [hadithRefs, setHadithRefs] = useState<PagefindRef[]>([])
  const [knowledgeRefs, setKnowledgeRefs] = useState<PagefindRef[]>([])
  const [quranResults, setQuranResults] = useState<QuranResult[]>([])
  const [hadithResults, setHadithResults] = useState<HadithResult[]>([])
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeResult[]>([])
  const [quranCursor, setQuranCursor] = useState(0)
  const [hadithCursor, setHadithCursor] = useState(0)
  const [knowledgeCursor, setKnowledgeCursor] = useState(0)
  const [videoShown, setVideoShown] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState<"quran" | "hadith" | "knowledge" | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)
  const trimmedQuery = debouncedQuery.trim()

  // Numeric queries are hadith citations far more often than they are text to
  // match, and Pagefind can only rank them as text. Resolve them as references
  // and show that above the ranked results.
  const hadithReference = useMemo(() => parseHadithReference(trimmedQuery), [trimmedQuery])
  const [referenceState, setReferenceState] = useState<HadithReferenceResolution | null>(null)
  const referenceCount = referenceState?.query === trimmedQuery ? referenceState.count : 0

  const surahs = getAllSurahs()
  const surahMap = useMemo(() => new Map(surahs.map((s) => [s.number, s])), [surahs])

  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    const qs = params.toString()
    history.replaceState(null, "", `/search${qs ? `?${qs}` : ""}`)
  }, [query])

  const videoLoadedRef = useRef(false)
  useEffect(() => {
    if (!searched || videoLoadedRef.current) return
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
    return () => { cancelled = true }
  }, [searched])

  const handleSearch = (q: string) => {
    setQuery(q)
    setSearched(!!q.trim())
    // Reset pagination on new query
    setQuranResults([])
    setHadithResults([])
    setKnowledgeResults([])
    setQuranRefs([])
    setHadithRefs([])
    setKnowledgeRefs([])
    setQuranCursor(0)
    setHadithCursor(0)
    setKnowledgeCursor(0)
    setVideoShown(PAGE_SIZE)
  }

  // Fetch refs (cheap) for both types, then hydrate first page immediately.
  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    let cancelled = false
    ;(async () => {
      if (!trimmed) {
        setQuranRefs([]); setHadithRefs([]); setKnowledgeRefs([])
        setQuranResults([]); setHadithResults([]); setKnowledgeResults([])
        setQuranCursor(0); setHadithCursor(0); setKnowledgeCursor(0)
        return
      }
      setLoadingData(true)
      try {
        const pf = await getPagefind()
        const [quranSearch, hadithSearch, knowledgeSearch] = await Promise.all([
          pf.search(trimmed, { filters: { type: "quran" } }),
          pf.search(trimmed, { filters: { type: "hadith" } }),
          pf.search(trimmed, { filters: { type: "knowledge" } }),
        ])
        if (cancelled) return
        const qRefs = quranSearch.results.slice(0, MAX_RESULTS)
        const hRefs = hadithSearch.results.slice(0, MAX_RESULTS)
        const kRefs = knowledgeSearch.results.slice(0, MAX_RESULTS)
        setQuranRefs(qRefs)
        setHadithRefs(hRefs)
        setKnowledgeRefs(kRefs)
        // Hydrate first page of each
        const [qData, hData, kData] = await Promise.all([
          Promise.all(qRefs.slice(0, PAGE_SIZE).map((r) => r.data())),
          Promise.all(hRefs.slice(0, PAGE_SIZE).map((r) => r.data())),
          Promise.all(kRefs.slice(0, PAGE_SIZE).map((r) => r.data())),
        ])
        if (cancelled) return
        setQuranResults(qData.map(pagefindToQuran).filter((r): r is QuranResult => r !== null))
        setHadithResults(hData.map(pagefindToHadith).filter((r): r is HadithResult => r !== null))
        setKnowledgeResults(kData.map(pagefindToKnowledge).filter((r): r is KnowledgeResult => r !== null))
        setQuranCursor(PAGE_SIZE)
        setHadithCursor(PAGE_SIZE)
        setKnowledgeCursor(PAGE_SIZE)
      } catch (err) {
        console.error("Pagefind search failed:", err)
        if (!cancelled) { setQuranResults([]); setHadithResults([]); setKnowledgeResults([]) }
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    })()
    return () => { cancelled = true }
  }, [debouncedQuery])

  const loadMoreQuran = async () => {
    const next = quranRefs.slice(quranCursor, quranCursor + PAGE_SIZE)
    if (!next.length) return
    setLoadingMore("quran")
    const data = await Promise.all(next.map((r) => r.data()))
    setQuranResults((prev) => [...prev, ...data.map(pagefindToQuran).filter((r): r is QuranResult => r !== null)])
    setQuranCursor((c) => c + PAGE_SIZE)
    setLoadingMore(null)
  }

  const loadMoreHadith = async () => {
    const next = hadithRefs.slice(hadithCursor, hadithCursor + PAGE_SIZE)
    if (!next.length) return
    setLoadingMore("hadith")
    const data = await Promise.all(next.map((r) => r.data()))
    setHadithResults((prev) => [...prev, ...data.map(pagefindToHadith).filter((r): r is HadithResult => r !== null)])
    setHadithCursor((c) => c + PAGE_SIZE)
    setLoadingMore(null)
  }

  const loadMoreKnowledge = async () => {
    const next = knowledgeRefs.slice(knowledgeCursor, knowledgeCursor + PAGE_SIZE)
    if (!next.length) return
    setLoadingMore("knowledge")
    const data = await Promise.all(next.map((r) => r.data()))
    setKnowledgeResults((prev) => [...prev, ...data.map(pagefindToKnowledge).filter((r): r is KnowledgeResult => r !== null)])
    setKnowledgeCursor((c) => c + PAGE_SIZE)
    setLoadingMore(null)
  }

  // All matching videos (in-memory); we render only the first `videoShown`.
  const allVideoResults = useMemo<VideoResult[]>(() => {
    const trimmed = debouncedQuery.trim()
    if (!trimmed || !videoFuse) return []
    return videoFuse.search(trimmed).slice(0, MAX_RESULTS).map((r) => ({ type: "video" as const, video: r.item }))
  }, [debouncedQuery, videoFuse])
  const videoResults = allVideoResults.slice(0, videoShown)

  // Counts reflect total available matches, not just what's rendered.
  const totalCount = quranRefs.length + hadithRefs.length + knowledgeRefs.length + allVideoResults.length

  const clearSearch = () => {
    setQuery("")
    setSearched(false)
    setQuranRefs([]); setHadithRefs([]); setKnowledgeRefs([])
    setQuranResults([]); setHadithResults([]); setKnowledgeResults([])
    setQuranCursor(0); setHadithCursor(0); setKnowledgeCursor(0)
    setVideoShown(PAGE_SIZE)
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
          <p className="text-sm text-muted-foreground">Search across Quran, Hadith, Knowledge Base, and Videos</p>
        </div>
      </div>

      <div className="relative flex-1 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(query) }}
          placeholder="Search by keyword, or a hadith number…"
          className="w-full rounded-xl border border-border/50 bg-card px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-secondary/50 transition-colors"
          aria-label="Search"
        />
        {query && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
            <X className="size-4" />
          </button>
        )}
      </div>

      <HadithReferenceResults
        query={trimmedQuery}
        onResolve={setReferenceState}
        className="mt-2 mb-6"
      />

      {loadingData && (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin text-gold-light" />
          <span>Searching…</span>
        </div>
      )}

      {searched && !loadingData && totalCount === 0 && referenceCount === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-12 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-medium text-foreground">No results found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {hadithReference
              ? `No hadith is numbered ${hadithReference.number}. Check the number, or search by keyword.`
              : "Try a different keyword."}
          </p>
        </div>
      )}

      {totalCount > 0 && (
        <div className="mt-2 space-y-8">
          {/* Quran section */}
          {quranResults.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="size-4 text-gold-light" />
                <span className="text-xs font-medium text-gold-light uppercase tracking-wider">Quran</span>
                <span className="rounded-full bg-gold-dim/15 px-2 py-0.5 text-[10px] text-gold-dim">{quranRefs.length}</span>
              </div>
              <div className="space-y-2">
                {quranResults.map((r) => {
                  const surah = surahMap.get(r.ayah.surahNumber)
                  return (
                    <Link key={`quran-${r.ayah.number}`} href={`/quran/${r.ayah.surahNumber}#ayah-${r.ayah.number}`}
                      className="group block rounded-xl border border-border/30 bg-card/50 p-4 transition-all duration-200 hover:border-secondary/20 hover:bg-card">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-gold-dim/15 px-2 py-0.5 text-xs font-medium text-gold-light">{r.ayah.surahNumber}:{r.ayah.ayahNumber}</span>
                          {surah && <span className="text-xs text-muted-foreground">{surah.name} · Juz {r.ayah.juz}</span>}
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      {r.excerpt && <p className="text-sm text-muted-foreground leading-relaxed pf-excerpt" dangerouslySetInnerHTML={{ __html: r.excerpt }} />}
                    </Link>
                  )
                })}
              </div>
              {quranCursor < quranRefs.length && (
                <button onClick={loadMoreQuran} disabled={loadingMore === "quran"}
                  className="mt-3 flex items-center gap-2 text-xs text-gold-light hover:text-gold-dim transition-colors disabled:opacity-50">
                  {loadingMore === "quran" ? <Loader2 className="size-3 animate-spin" /> : null}
                  Load more ({quranRefs.length - quranCursor} remaining)
                </button>
              )}
            </section>
          )}

          {/* Hadith section */}
          {hadithResults.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquareText className="size-4 text-emerald" />
                <span className="text-xs font-medium text-emerald uppercase tracking-wider">Hadith</span>
                <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] text-emerald">{hadithRefs.length}</span>
              </div>
              <div className="space-y-2">
                {hadithResults.map((r) => {
                  const h = r.hadith
                  return (
                    <Link key={`hadith-${h.id}`} href={`/hadith/${h.collection}/${h.bookId}#hadith-${h.id}`}
                      className="group block rounded-xl border border-border/30 bg-card/50 p-4 transition-all duration-200 hover:border-secondary/20 hover:bg-card">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("rounded px-2 py-0.5 text-xs font-medium text-emerald bg-emerald/10")}>{h.reference.collection}</span>
                          <span className="text-xs text-muted-foreground">{h.bookName} · Hadith {h.hadithNumber}</span>
                          {h.grade && <span className="rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald">{h.grade}</span>}
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      {h.narrator && <p className="text-xs text-muted-foreground/60 mb-1.5 italic">Narrated by {h.narrator}</p>}
                      {r.excerpt && <p className="text-sm text-foreground leading-relaxed line-clamp-3 pf-excerpt" dangerouslySetInnerHTML={{ __html: r.excerpt }} />}
                    </Link>
                  )
                })}
              </div>
              {hadithCursor < hadithRefs.length && (
                <button onClick={loadMoreHadith} disabled={loadingMore === "hadith"}
                  className="mt-3 flex items-center gap-2 text-xs text-emerald hover:opacity-70 transition-opacity disabled:opacity-50">
                  {loadingMore === "hadith" ? <Loader2 className="size-3 animate-spin" /> : null}
                  Load more ({hadithRefs.length - hadithCursor} remaining)
                </button>
              )}
            </section>
          )}

          {/* Knowledge Base section */}
          {knowledgeResults.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Library className="size-4 text-gold-light" />
                <span className="text-xs font-medium text-gold-light uppercase tracking-wider">Knowledge</span>
                <span className="rounded-full bg-gold-dim/15 px-2 py-0.5 text-[10px] text-gold-dim">{knowledgeRefs.length}</span>
              </div>
              <div className="space-y-2">
                {knowledgeResults.map((r) => (
                  <Link key={`knowledge-${r.url}`} href={r.url}
                    className="group block rounded-xl border border-border/30 bg-card/50 p-4 transition-all duration-200 hover:border-secondary/20 hover:bg-card">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-gold-dim/15 px-2 py-0.5 text-xs font-medium text-gold-light">{r.title}</span>
                        {r.categoryName && <span className="text-xs text-muted-foreground">{r.categoryName}</span>}
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    {r.excerpt && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 pf-excerpt" dangerouslySetInnerHTML={{ __html: r.excerpt }} />}
                  </Link>
                ))}
              </div>
              {knowledgeCursor < knowledgeRefs.length && (
                <button onClick={loadMoreKnowledge} disabled={loadingMore === "knowledge"}
                  className="mt-3 flex items-center gap-2 text-xs text-gold-light hover:text-gold-dim transition-colors disabled:opacity-50">
                  {loadingMore === "knowledge" ? <Loader2 className="size-3 animate-spin" /> : null}
                  Load more ({knowledgeRefs.length - knowledgeCursor} remaining)
                </button>
              )}
            </section>
          )}

          {/* Videos section */}
          {videoResults.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Video className="size-4 text-accent" />
                <span className="text-xs font-medium text-accent uppercase tracking-wider">Videos</span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">{allVideoResults.length}</span>
              </div>
              <div className="space-y-2">
                {videoResults.map((r) => {
                  const v = r.video
                  return (
                    <Link key={`video-${v.id}`} href={`/videos/${v.scholarId}`}
                      className="group block rounded-xl border border-border/30 bg-card/50 p-4 transition-all duration-200 hover:border-secondary/20 hover:bg-card">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-24 aspect-video rounded-lg overflow-hidden bg-surface">
                          <img src={v.thumbnail} alt="" className="size-full object-cover" loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-gold-light transition-colors">{v.title}</h3>
                            <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{v.scholarName}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="rounded bg-gold-dim/15 px-1.5 py-0.5 text-[10px] font-medium text-gold-light">{v.category}</span>
                            {v.duration && <span className="text-[10px] text-muted-foreground">{v.duration}</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              {videoShown < allVideoResults.length && (
                <button onClick={() => setVideoShown((n) => n + PAGE_SIZE)}
                  className="mt-3 text-xs text-accent hover:opacity-70 transition-opacity">
                  Load more ({allVideoResults.length - videoShown} remaining)
                </button>
              )}
            </section>
          )}
        </div>
      )}

      {!searched && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground text-sm">Search for any word or phrase across Quran, Hadith, Knowledge Base, and Videos</p>
          <p className="text-muted-foreground/70 text-xs mt-1">Or type a hadith number — &ldquo;1234&rdquo;, &ldquo;Bukhari 1234&rdquo; — to jump straight to it.</p>
        </div>
      )}
    </div>
  )
}
