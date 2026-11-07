"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  CloudRain,
  Compass,
  Heart,
  HeartPulse,
  Headphones,
  Home,
  MessageCircle,
  MoonStar,
  Pause,
  Plane,
  Repeat2,
  Search,
  Shield,
  Sparkles,
  Sun,
  Sunrise,
  Users,
  X,
} from "lucide-react"
import { BookmarkButton } from "@/components/shared/BookmarkButton"
import { Pagination } from "@/components/shared/Pagination"
import { useBookmarks } from "@/hooks/useBookmarks"
import { DUA_CATEGORIES, DUA_CHAPTERS, DUA_ENTRIES, DUAS, DUA_SOURCE, HADITH_DUAS, HADITH_DUA_SOURCE, type DuaCategoryId } from "@/lib/duas"
import { cn } from "@/lib/utils"

const categoryIcons: Record<DuaCategoryId, typeof Sun> = {
  "daily-life": Home,
  prayer: Sparkles,
  "morning-evening": Sunrise,
  sleep: MoonStar,
  anxiety: Heart,
  family: Users,
  protection: Shield,
  health: HeartPulse,
  weather: CloudRain,
  ramadan: Sparkles,
  social: MessageCircle,
  travel: Plane,
  hajj: Compass,
  remembrance: Repeat2,
}

const categoryColors: Record<DuaCategoryId, string> = {
  "daily-life": "text-gold-light bg-gold-dim/10",
  prayer: "text-emerald bg-emerald/10",
  "morning-evening": "text-indigo-300 bg-indigo-400/10",
  sleep: "text-violet-300 bg-violet-400/10",
  anxiety: "text-rose-300 bg-rose-400/10",
  family: "text-pink-300 bg-pink-400/10",
  protection: "text-violet-300 bg-violet-400/10",
  health: "text-cyan-300 bg-cyan-400/10",
  weather: "text-sky-300 bg-sky-400/10",
  ramadan: "text-amber-300 bg-amber-400/10",
  social: "text-teal-300 bg-teal-400/10",
  travel: "text-sky-300 bg-sky-400/10",
  hajj: "text-lime-300 bg-lime-400/10",
  remembrance: "text-gold-light bg-gold-dim/10",
}

const PAGE_SIZE = 12

let activeAudio: HTMLAudioElement | null = null

function AudioButton({ duaId, text, audioUrl }: { duaId: string; text: string; audioUrl?: string }) {
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const speechSupported = typeof window === "undefined" || "speechSynthesis" in window

  useEffect(() => {
    const audio = audioRef.current
    return () => {
      audio?.pause()
      if (typeof window !== "undefined") window.speechSynthesis.cancel()
    }
  }, [])

  function toggleAudio() {
    if (audioUrl && audioRef.current) {
      if (speaking) {
        audioRef.current.pause()
        setSpeaking(false)
        return
      }
      if (activeAudio && activeAudio !== audioRef.current) activeAudio.pause()
      activeAudio = audioRef.current
      void audioRef.current.play().then(() => setSpeaking(true)).catch(() => setSpeaking(false))
      return
    }

    if (!speechSupported || typeof window === "undefined") return
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "ar-SA"
    utterance.rate = 0.78
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <button
      type="button"
      onClick={toggleAudio}
      disabled={!audioUrl && !speechSupported}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        speaking
          ? "border-gold-dim/40 bg-gold-dim/10 text-gold-light"
          : "border-border/60 text-muted-foreground hover:border-gold-dim/30 hover:text-gold-light",
        !audioUrl && !speechSupported && "cursor-not-allowed opacity-50",
      )}
      aria-label={audioUrl || speechSupported ? `${speaking ? "Stop" : "Play"} Arabic audio` : "Audio is not supported in this browser"}
      data-dua-audio={duaId}
    >
      {speaking ? <Pause className="size-3.5" aria-hidden="true" /> : <Headphones className="size-3.5" aria-hidden="true" />}
      {speaking ? "Stop" : "Listen"}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="none" onPlay={() => setSpeaking(true)} onPause={() => setSpeaking(false)} onEnded={() => setSpeaking(false)} aria-hidden="true" />}
    </button>
  )
}

export function DuaLibrary() {
  const [activeSource, setActiveSource] = useState<"all" | "hisn" | "hadith">("all")
  const [activeCategory, setActiveCategory] = useState<DuaCategoryId | "all">("all")
  const [activeChapter, setActiveChapter] = useState<number | "all">("all")
  const [search, setSearch] = useState("")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const chaptersRef = useRef<HTMLDetailsElement>(null)
  const { bookmarks } = useBookmarks()
  const favoriteIds = useMemo(() => new Set(bookmarks.filter((bookmark) => bookmark.type === "dua").map((bookmark) => bookmark.id)), [bookmarks])

  const visibleDuas = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return DUA_ENTRIES.filter((dua) => {
      const sourceMatches = activeSource === "all" || dua.source === activeSource
      const categoryMatches = activeCategory === "all" || dua.category === activeCategory
      const chapterMatches = activeChapter === "all" || dua.chapterNumber === activeChapter
      const favoriteMatches = !favoritesOnly || favoriteIds.has(dua.id)
      const searchMatches = !query || [dua.title, dua.chapterTitle, dua.bookName ?? "", dua.narrator ?? "", dua.grade ?? "", dua.arabic, dua.transliteration, dua.translation, dua.reference]
        .some((value) => value.toLocaleLowerCase().includes(query))
      return sourceMatches && categoryMatches && chapterMatches && favoriteMatches && searchMatches
    })
  }, [activeCategory, activeChapter, activeSource, favoriteIds, favoritesOnly, search])

  const totalPages = Math.max(1, Math.ceil(visibleDuas.length / PAGE_SIZE))
  const effectivePage = Math.min(currentPage, totalPages)
  const pageDuas = visibleDuas.slice((effectivePage - 1) * PAGE_SIZE, effectivePage * PAGE_SIZE)
  const firstVisible = visibleDuas.length === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1
  const lastVisible = Math.min(effectivePage * PAGE_SIZE, visibleDuas.length)

  function goToPage(page: number) {
    setCurrentPage(Math.min(Math.max(1, page), totalPages))
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }))
  }

  function selectChapter(chapter: number | "all") {
    setActiveChapter(chapter)
    setCurrentPage(1)
    if (chaptersRef.current) chaptersRef.current.open = false
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden geometric-bg">
      <div className="pointer-events-none absolute inset-0 lantern-glow opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8 flex flex-col gap-5 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-dim">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Remembrance & supplication
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Duas & Adhkar</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A quiet collection of supplications for the moments that shape your day. Read, listen, and keep the words closest to your heart.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-display text-2xl text-gold-light">{DUA_ENTRIES.length}</span>
            <span>recitations & hadiths</span>
          </div>
        </header>

        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Dua categories">
          <button
            type="button"
            onClick={() => { setActiveSource("all"); setActiveCategory("all"); setActiveChapter("all"); setCurrentPage(1) }}
            className={cn(
              "group flex min-h-24 items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeCategory === "all" ? "border-gold-dim/40 bg-gold-dim/10" : "border-border/30 bg-card/40 hover:border-gold-dim/25 hover:bg-card/60",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-dim/10 text-gold-light"><BookOpen className="size-5" aria-hidden="true" /></span>
            <span><span className="block text-sm font-semibold text-foreground">All duas</span><span className="mt-1 block text-xs text-muted-foreground">Browse the collection</span></span>
          </button>
          {DUA_CATEGORIES.map((category) => {
            const Icon = categoryIcons[category.id]
            const active = activeCategory === category.id
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => { setActiveCategory(category.id); setActiveChapter("all"); setCurrentPage(1) }}
                className={cn(
                  "group flex min-h-24 items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-gold-dim/40 bg-gold-dim/10" : "border-border/30 bg-card/40 hover:border-gold-dim/25 hover:bg-card/60",
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", categoryColors[category.id])}><Icon className="size-5" aria-hidden="true" /></span>
                <span><span className="block text-sm font-semibold text-foreground">{category.label}</span><span className="mt-1 block line-clamp-1 text-xs text-muted-foreground">{category.description}</span></span>
              </button>
            )
          })}
        </section>

        <div className="mb-6 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-1 rounded-lg border border-input bg-background/60 p-1" role="group" aria-label="Filter by source">
              <button type="button" onClick={() => { setActiveSource("all"); setActiveChapter("all"); setCurrentPage(1) }} aria-pressed={activeSource === "all"} className={cn("whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors", activeSource === "all" ? "bg-gold-dim/15 text-gold-light" : "text-muted-foreground hover:text-foreground")}>All sources</button>
              <button type="button" onClick={() => { setActiveSource("hisn"); setActiveChapter("all"); setCurrentPage(1) }} aria-pressed={activeSource === "hisn"} className={cn("whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors", activeSource === "hisn" ? "bg-gold-dim/15 text-gold-light" : "text-muted-foreground hover:text-foreground")}>Hisn al-Muslim · {DUAS.length}</button>
              <button type="button" onClick={() => { setActiveSource("hadith"); setActiveChapter("all"); setCurrentPage(1) }} aria-pressed={activeSource === "hadith"} className={cn("whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors", activeSource === "hadith" ? "bg-gold-dim/15 text-gold-light" : "text-muted-foreground hover:text-foreground")}>Hadith · {HADITH_DUAS.length}</button>
            </div>
            <label className="relative block min-w-0 flex-1 sm:basis-64">
              <span className="sr-only">Search duas</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }}
                placeholder="Search Arabic, transliteration, meaning, or reference…"
                className="h-11 w-full rounded-lg border border-input bg-background/60 pl-10 pr-10 text-sm outline-none transition focus:border-gold-dim focus:ring-2 focus:ring-ring/40"
              />
              {search && <button type="button" onClick={() => { setSearch(""); setCurrentPage(1) }} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Clear search"><X className="size-4" /></button>}
            </label>
            <button
              type="button"
              onClick={() => { setFavoritesOnly((value) => !value); setCurrentPage(1) }}
              className={cn("inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", favoritesOnly ? "border-gold-dim/40 bg-gold-dim/10 text-gold-light" : "border-input text-muted-foreground hover:border-gold-dim/30 hover:text-gold-light")}
              aria-pressed={favoritesOnly}
            >
              {favoritesOnly ? <Check className="size-4" aria-hidden="true" /> : <Heart className="size-4" aria-hidden="true" />}
              Favorites{favoriteIds.size > 0 && ` · ${favoriteIds.size}`}
            </button>
          </div>

          <details ref={chaptersRef} className="group rounded-xl border border-gold-dim/15 bg-card/40">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium text-foreground transition-colors hover:text-gold-light [&::-webkit-details-marker]:hidden">
              <BookMarked className="size-4 shrink-0 text-gold-light" aria-hidden="true" />
              <span className="min-w-0 truncate">
                {activeChapter === "all"
                  ? `Browse all ${DUA_CHAPTERS.length} chapters`
                  : `Chapter ${activeChapter} · ${DUA_CHAPTERS.find((chapter) => chapter.number === activeChapter)?.title ?? ""}`}
              </span>
              {activeChapter !== "all" && (
                <span className="shrink-0 rounded-full bg-gold-dim/15 px-2 py-0.5 text-[10px] font-semibold text-gold-light">Filtered</span>
              )}
              <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-gold-dim/10 p-4">
              <div className="max-h-80 overflow-y-auto">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => selectChapter("all")}
                    aria-pressed={activeChapter === "all"}
                    className={cn(
                      "group/chapter flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                      activeChapter === "all"
                        ? "border-gold-dim/30 bg-gold-dim/10"
                        : "border-border/20 bg-space-mid/20 hover:border-gold-dim/30 hover:bg-gold-dim/5",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded bg-gold-dim/10 text-[10px] font-medium text-gold-light">All</span>
                      <span className="truncate text-xs text-foreground transition-colors group-hover/chapter:text-gold-light">All chapters</span>
                    </div>
                    <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{DUA_ENTRIES.length}</span>
                  </button>
                  {DUA_CHAPTERS.map((chapter) => (
                    <button
                      key={chapter.id}
                      type="button"
                      onClick={() => selectChapter(chapter.number)}
                      aria-pressed={activeChapter === chapter.number}
                      className={cn(
                        "group/chapter flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                        activeChapter === chapter.number
                          ? "border-gold-dim/30 bg-gold-dim/10"
                          : "border-border/20 bg-space-mid/20 hover:border-gold-dim/30 hover:bg-gold-dim/5",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-gold-dim/10 text-[10px] font-medium text-gold-light">{chapter.number}</span>
                        <span className="truncate text-xs text-foreground transition-colors group-hover/chapter:text-gold-light">{chapter.title}</span>
                      </div>
                      <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{chapter.entryCount}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </div>

        <section className="space-y-5" aria-label="Dua collection">
          {pageDuas.map((dua) => {
            const category = DUA_CATEGORIES.find((item) => item.id === dua.category)
            const Icon = categoryIcons[dua.category]
            return (
              <article key={dua.id} className="group overflow-hidden rounded-2xl border border-border/30 bg-card/40 transition-all duration-300 hover:border-gold-dim/25 hover:bg-card/60">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 px-5 py-4 sm:px-7">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", categoryColors[dua.category])}><Icon className="size-4" aria-hidden="true" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{dua.title}</p><p className="mt-0.5 truncate text-xs text-gold-dim">{category?.label} · {dua.source === "hadith" ? "Hadith source" : `Chapter ${dua.chapterNumber}`}</p></div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <AudioButton duaId={dua.id} text={dua.arabic} audioUrl={dua.audioUrl} />
                    <BookmarkButton type="dua" id={dua.id} reference={dua.title} text={dua.translation.slice(0, 100)} href={`/duas#${dua.id}`} className="text-muted-foreground hover:text-gold-light" />
                  </div>
                </div>
                  <div className="px-5 py-6 sm:px-7 sm:py-8">
                    <p dir="rtl" lang="ar" className="font-arabic text-right text-2xl leading-[2.1] text-gold-light sm:text-3xl">{dua.arabic}</p>
                    <div className="mt-6 border-t border-gold-dim/15 pt-5">
                      {dua.transliteration && <p className="text-sm italic leading-7 text-gold-dim/90">{dua.transliteration}</p>}
                      {dua.source === "hadith" && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">English translation of the hadith</p>}
                      <p className="mt-4 text-sm leading-7 text-muted-foreground">{dua.translation}</p>
                      {dua.source === "hadith" && (dua.narrator || dua.grade) && <p className="mt-4 text-xs text-gold-dim/80">{dua.narrator && `Narrated by ${dua.narrator}`}{dua.narrator && dua.grade && " · "}{dua.grade && `Grade: ${dua.grade}`}</p>}
                    </div>
                  </div>
                  <footer className="flex items-center gap-2 border-t border-border/20 bg-background/20 px-5 py-3 text-xs text-muted-foreground sm:px-7">
                    <span className="size-1.5 rounded-full bg-gold-dim" aria-hidden="true" />
                    <span className="min-w-0 flex-1">{dua.reference}</span>
                    {dua.hadithHref && <a href={dua.hadithHref} className="shrink-0 text-gold-dim underline-offset-4 hover:text-gold-light hover:underline">Open hadith</a>}
                  </footer>
              </article>
            )
          })}
          {visibleDuas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-16 text-center">
              <Heart className="mx-auto size-8 text-muted-foreground/40" aria-hidden="true" />
              <h2 className="mt-4 font-display text-xl font-semibold text-foreground">No duas found</h2>
              <p className="mt-2 text-sm text-muted-foreground">Try another search, category, or save a dua as a favorite.</p>
            </div>
          )}
        </section>

        {visibleDuas.length > 0 && (
          <div className="mt-7 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">Showing {firstVisible}–{lastVisible} of {visibleDuas.length} recitations</p>
            <Pagination currentPage={effectivePage} totalPages={totalPages} onPageChange={goToPage} />
          </div>
        )}

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-6 text-muted-foreground/70">
          Complete Hisn al-Muslim release: {DUA_SOURCE.duaCount} recitations across {DUA_SOURCE.chapterCount} chapters, plus {HADITH_DUA_SOURCE.selectedHadithCount} hadith-sourced remembrance entries from a scan of {HADITH_DUA_SOURCE.scannedHadithCount} local hadiths. Text and audio are provided by <a href={DUA_SOURCE.catalogueUrl} target="_blank" rel="noreferrer" className="text-gold-dim underline-offset-4 hover:underline">OpenDua</a>; hadith entries link to Noor&apos;s local collections. Always verify references with a trusted scholar or primary source.
        </p>
      </div>
    </div>
  )
}
