"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, Languages, ChevronLeft, ChevronRight } from "lucide-react"
import type { Ayah, Surah } from "@/types"
import { AyahDisplay } from "./AyahDisplay"
import { TranslationTabs } from "./TranslationTabs"
import { JuzNavigator } from "./JuzNavigator"
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

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    const id = hash.slice(1)
    const timer = setTimeout(() => {
      const el = document.getElementById(id)
      el?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
    return () => clearTimeout(timer)
  }, [])

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

  const juzBoundaries = useMemo(() => {
    const boundaries: { juz: number; ayahNumber: number }[] = []
    for (let i = 0; i < ayahs.length; i++) {
      if (i === 0 || ayahs[i].juz !== ayahs[i - 1].juz) {
        boundaries.push({ juz: ayahs[i].juz, ayahNumber: ayahs[i].ayahNumber })
      }
    }
    return boundaries
  }, [ayahs])

  const jumpToJuz = (juz: number) => {
    setCurrentJuz(juz)
    const firstInJuz = ayahs.find((a) => a.juz === juz)
    if (firstInJuz) {
      const el = document.getElementById(`ayah-${firstInJuz.number}`)
      el?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
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
