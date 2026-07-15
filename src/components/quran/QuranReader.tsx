"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, Languages } from "lucide-react"
import type { Ayah, Surah } from "@/types"
import { AyahDisplay } from "./AyahDisplay"
import { TranslationTabs } from "./TranslationTabs"
import { JuzNavigator } from "./JuzNavigator"
import { cn } from "@/lib/utils"

interface QuranReaderProps {
  surah: Surah
  ayahs: Ayah[]
}

type TranslationLang = "en" | "hi" | "ur"

export function QuranReader({ surah, ayahs }: QuranReaderProps) {
  const [translationLang, setTranslationLang] = useState<TranslationLang>("en")
  const [showTranslation, setShowTranslation] = useState(true)
  const [currentJuz, setCurrentJuz] = useState<number>(ayahs[0]?.juz ?? 1)

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <TranslationTabs active={translationLang} onChange={setTranslationLang} />
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              showTranslation
                ? "bg-secondary/10 text-secondary"
                : "bg-surface text-muted-foreground hover:text-foreground",
            )}
            aria-label="Toggle translation"
          >
            <Languages className="size-3.5" />
            {showTranslation ? "Hide" : "Show"}
          </button>
        </div>

        {surah.number !== 1 && surah.number !== 9 && (
          <div className="text-center py-6">
            <p className="text-2xl font-arabic text-secondary/60 leading-[2]" dir="rtl">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
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

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <JuzNavigator
          currentJuz={currentJuz}
          boundaries={juzBoundaries}
          onJump={jumpToJuz}
        />

        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="size-4 text-secondary" />
            <span className="text-xs font-medium text-foreground uppercase tracking-wider">
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
            {ayahs.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current View</span>
                <span className="text-foreground">
                  {filteredAyahs[0]?.ayahNumber}–{filteredAyahs[filteredAyahs.length - 1]?.ayahNumber}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
