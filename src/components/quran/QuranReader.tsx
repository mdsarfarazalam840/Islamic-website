"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, Languages, ChevronLeft, ChevronRight } from "lucide-react"
import type { Ayah, Surah } from "@/types"
import { AyahDisplay } from "./AyahDisplay"
import { TranslationTabs } from "./TranslationTabs"
import { JuzNavigator } from "./JuzNavigator"
import type { JuzBoundary } from "./JuzNavigator"
import { AyahJump } from "./AyahJump"
import { getAllSurahs } from "@/lib/quran/surahs"
import { cn } from "@/lib/utils"
import { useFontSize, getFontSizeClass } from "@/hooks/useFontSize"
import { saveReadingProgress } from "@/hooks/useReadingProgress"
import { SaveQuranSpotButton } from "@/components/shared/SaveSpotButton"
import { useAudioPlayer } from "./AudioPlayerContext"

interface QuranReaderProps {
  surah: Surah
  ayahs: Ayah[]
}

type TranslationLang = "en" | "hi" | "ur"

export function QuranReader({ surah, ayahs }: QuranReaderProps) {
  const [translationLang, setTranslationLang] = useState<TranslationLang>("en")
  const [showTranslation, setShowTranslation] = useState(true)
  const [currentJuz, setCurrentJuz] = useState<number>(ayahs[0]?.juz ?? 1)
  // Element to scroll to once it has rendered. Switching juz and scrolling can't
  // happen in one pass — the target isn't in the DOM until the new juz renders.
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null)
  const { level } = useFontSize()
  const versesRef = useRef<HTMLDivElement>(null)
  const { playingAyahId } = useAudioPlayer()

  // Follow the recitation: when the playing ayah changes, make sure its Juz is
  // the one on screen (the reader renders a single Juz at a time), then scroll
  // it into view so the reader can see exactly where the audio is.
  useEffect(() => {
    if (playingAyahId == null) return
    const ayah = ayahs.find((a) => a.number === playingAyahId)
    if (!ayah) return
    const timer = setTimeout(() => {
      // If the playing ayah lives in another Juz, switch to it first; the
      // effect re-runs on the currentJuz change and scrolls once it renders.
      if (ayah.juz !== currentJuz) {
        setCurrentJuz(ayah.juz)
        return
      }
      document
        .getElementById(`ayah-${playingAyahId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 120)
    return () => clearTimeout(timer)
  }, [playingAyahId, ayahs, currentJuz])

  // Resolve a deep link on mount. Two forms arrive here: `?ayah=N`, a within-surah
  // number produced by the reference jump box on /quran, and `#ayah-N`, the global
  // ayah anchor already emitted by search results, bookmarks and share links.
  //
  // Both used to be handled by a scroll-only effect, which meant any link into a
  // juz other than the surah's first landed on the wrong content: the reader shows
  // one juz at a time, so the target element simply wasn't in the DOM. Switching
  // juz first is what makes those links work.
  //
  // `window.location` rather than `useSearchParams`: this is a static export, where
  // the search params hook would force a Suspense boundary and a client-only render
  // of the whole reader for a value that is only read once.
  //
  // Read in a frame callback rather than in the effect body. The URL is an external
  // system feeding state that is read exactly once, and letting the hydrated render
  // commit first makes the juz switch an ordinary update instead of a render
  // cascading out of the first one.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search)
      const withinSurah = Number(params.get("ayah"))
      const hash = window.location.hash
      const globalMatch = hash.match(/^#ayah-(\d+)$/)

      const target = withinSurah
        ? ayahs.find((a) => a.ayahNumber === withinSurah)
        : globalMatch
          ? ayahs.find((a) => a.number === Number(globalMatch[1]))
          : undefined

      if (target) {
        setCurrentJuz(target.juz)
        setPendingScrollId(`ayah-${target.number}`)
        return
      }
      // Some other anchor on the page (tafsir panel, section heading): scroll only.
      if (hash) setPendingScrollId(hash.slice(1))
    })
    return () => cancelAnimationFrame(frame)
  }, [ayahs])

  // Scroll to whatever the last jump asked for, once it exists. The target may not
  // be in the DOM yet: switching juz re-renders, and AnimatePresence mode="wait"
  // holds the new juz back until the old one has faded out. So retry briefly
  // instead of scrolling once and giving up.
  useEffect(() => {
    if (!pendingScrollId) return
    let attempts = 0
    const timer = setInterval(() => {
      const el = document.getElementById(pendingScrollId)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        setPendingScrollId(null)
        return
      }
      // ~2s of trying. Past that the id isn't going to appear (a stale anchor).
      if (++attempts >= 20) setPendingScrollId(null)
    }, 100)
    return () => clearInterval(timer)
  }, [pendingScrollId])

  // Track the top-most visible ayah as the user scrolls and persist it as
  // reading progress. The rootMargin defines an "active band" near the top of
  // the viewport (below the sticky header, above the lower ~55%), so the ayah
  // recorded is the one the reader is actually on, not one barely peeking in.
  useEffect(() => {
    const container = versesRef.current
    if (!container || typeof IntersectionObserver === "undefined") return

    const visible = new Set<number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = Number((entry.target as HTMLElement).dataset.ayahGlobal)
          if (!Number.isFinite(id)) continue
          if (entry.isIntersecting) visible.add(id)
          else visible.delete(id)
        }
        if (visible.size === 0) return
        const topMost = Math.min(...visible)
        const ayah = ayahs.find((a) => a.number === topMost)
        if (ayah) {
          saveReadingProgress({
            surahNumber: surah.number,
            surahName: surah.name,
            ayahNumber: ayah.ayahNumber,
            ayahId: ayah.number,
          })
        }
      },
      { rootMargin: "-100px 0px -55% 0px", threshold: 0 },
    )

    const els = container.querySelectorAll<HTMLElement>("[data-ayah-global]")
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ayahs, surah.number, surah.name, currentJuz])

  // One entry per juz this surah spans, with the ayah range it covers, so the
  // navigator can label each option instead of showing anonymous dots.
  const juzBoundaries = useMemo(() => {
    const boundaries: JuzBoundary[] = []
    for (const ayah of ayahs) {
      const last = boundaries[boundaries.length - 1]
      if (last && last.juz === ayah.juz) last.endAyahNumber = ayah.ayahNumber
      else
        boundaries.push({
          juz: ayah.juz,
          ayahNumber: ayah.ayahNumber,
          endAyahNumber: ayah.ayahNumber,
        })
    }
    return boundaries
  }, [ayahs])

  const jumpToJuz = (juz: number) => {
    setCurrentJuz(juz)
    const firstInJuz = ayahs.find((a) => a.juz === juz)
    if (firstInJuz) setPendingScrollId(`ayah-${firstInJuz.number}`)
  }

  /** Jump to an ayah by its within-surah number. False when it isn't loaded. */
  const goToAyah = (ayahNumber: number) => {
    const target = ayahs.find((a) => a.ayahNumber === ayahNumber)
    if (!target) return false
    setCurrentJuz(target.juz)
    setPendingScrollId(`ayah-${target.number}`)
    // Leave a shareable anchor and drop any `?ayah=` the reader arrived with, so
    // the URL describes where the reader actually is. replaceState keeps the back
    // button pointing at the previous page rather than each jump.
    window.history.replaceState(null, "", `${window.location.pathname}#ayah-${target.number}`)
    return true
  }

  const filteredAyahs = ayahs.filter((a) => a.juz === currentJuz)
  const allSurahs = getAllSurahs()
  const currentSurahIndex = allSurahs.findIndex((s) => s.number === surah.number)
  const prevSurah = currentSurahIndex > 0 ? allSurahs[currentSurahIndex - 1] : null
  const nextSurah = currentSurahIndex < allSurahs.length - 1 ? allSurahs[currentSurahIndex + 1] : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-6">
      {/* Left Panel — Navigation & Surah Info */}
      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start lg:order-1 order-1">
        <SaveQuranSpotButton surahNumber={surah.number} surahName={surah.name} />

        <div className="rounded-xl border border-gold-dim/15 bg-card/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="size-4 text-gold-light" />
            <span className="text-xs font-medium text-gold-light uppercase tracking-wider">
              Surah Info
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revelation</span>
              <span className="text-foreground capitalize">{surah.revelationType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verses</span>
              <span className="text-foreground">{surah.ayahCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Juz</span>
              <span className="text-foreground">{surah.juz.join(", ")}</span>
            </div>
          </div>
        </div>

        <JuzNavigator
          currentJuz={currentJuz}
          boundaries={juzBoundaries}
          onJump={jumpToJuz}
        />

        <AyahJump max={surah.ayahCount} onJump={goToAyah} />

        {/* Surah navigation */}
        <div className="flex gap-2">
          {prevSurah && (
            <Link
              href={`/quran/${prevSurah.number}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-gold-light hover:bg-gold-dim/10 transition-all border border-border/20 flex-1"
            >
              <ChevronLeft className="size-3.5" />
              <span className="truncate">{prevSurah.name}</span>
            </Link>
          )}
          {nextSurah && (
            <Link
              href={`/quran/${nextSurah.number}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-gold-light hover:bg-gold-dim/10 transition-all border border-border/20 flex-1"
            >
              <span className="truncate">{nextSurah.name}</span>
              <ChevronRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Center Panel — Arabic Text (Sacred Scroll) */}
      <div ref={versesRef} className="space-y-6 lg:order-2 order-2">
        {/* Surah header */}
        <div className="text-center py-8 border-b border-gold-dim/10">
          <h2 className={cn("font-arabic text-gold-light leading-[2.2]", getFontSizeClass(level, "quranArabic"))} dir="rtl">
            {surah.nameArabic}
          </h2>
          <p className="text-lg font-display text-foreground mt-2 font-semibold">
            {surah.name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {surah.nameTranslated}
          </p>
        </div>

        {/* Basmala */}
        {surah.number !== 1 && surah.number !== 9 && (
          <div className="text-center py-6">
            <p className={cn("font-arabic text-gold-dim/70 leading-[2.2]", getFontSizeClass(level, "quranArabic"))} dir="rtl">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
            <hr className="gold-divider mt-4" />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentJuz}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {filteredAyahs.map((ayah, i) => (
              <AyahDisplay
                key={ayah.number}
                ayah={ayah}
                surah={surah}
                translationLang={translationLang}
                showTranslation={showTranslation}
                index={i}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right Panel — Translations & Controls */}
      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start lg:order-3 order-3">
        <div className="rounded-xl border border-gold-dim/15 bg-card/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gold-light uppercase tracking-wider flex items-center gap-1.5">
              <Languages className="size-3.5" />
              Translation
            </span>
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all tracking-wider uppercase",
                showTranslation
                  ? "bg-gold-dim/15 text-gold-light border border-gold-dim/20"
                  : "bg-space-mid/30 text-muted-foreground hover:text-gold-light border border-transparent"
              )}
              aria-label="Toggle translation"
            >
              {showTranslation ? "Hide" : "Show"}
            </button>
          </div>
          <TranslationTabs active={translationLang} onChange={setTranslationLang} />
        </div>

        {/* Quick stats for current view */}
        <div className="rounded-xl border border-gold-dim/15 bg-card/50 p-4">
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Viewing</span>
              <span className="text-gold-light">
                {filteredAyahs[0]?.ayahNumber}–{filteredAyahs[filteredAyahs.length - 1]?.ayahNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Juz {currentJuz}</span>
              <span className="text-gold-light">{filteredAyahs.length} verses</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
