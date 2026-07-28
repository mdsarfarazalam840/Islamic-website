"use client"

import { motion } from "framer-motion"
import { Play, Pause } from "lucide-react"
import type { Ayah, Surah } from "@/types"
import { AyahActions } from "./AyahActions"
import { TafsirPanel } from "./TafsirPanel"
import { useAudioPlayer } from "./AudioPlayerContext"
import { cn } from "@/lib/utils"
import { useFontSize, getFontSizeClass } from "@/hooks/useFontSize"

interface AyahDisplayProps {
  ayah: Ayah
  surah: Surah
  translationLang: "en" | "hi" | "ur"
  showTranslation: boolean
  index: number
}

export function AyahDisplay({ ayah, surah, translationLang, showTranslation, index }: AyahDisplayProps) {
  const isFirstAyah = ayah.ayahNumber === 1 && index === 0
  const { level } = useFontSize()
  const { playingAyahId, isPlaying, playAyah } = useAudioPlayer()
  const isActive = playingAyahId === ayah.number
  const isThisPlaying = isActive && isPlaying

  return (
    <motion.div
      id={`ayah-${ayah.number}`}
      data-ayah-global={ayah.number}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.03, ease: "easeOut" }}
      className={cn(
        "group relative rounded-xl border transition-all duration-300",
        isActive
          ? "border-gold-dim/50 bg-gold-dim/10 scriptorium-glow ring-1 ring-gold-dim/30"
          : isFirstAyah
            ? "border-gold-dim/20 bg-gold-dim/5 scriptorium-glow"
            : "border-border/20 bg-card/40 hover:border-gold-dim/15 hover:bg-card/60"
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold-dim/10 text-xs font-medium text-gold-light border border-gold-dim/20">
              {ayah.ayahNumber}
            </span>
            <button
              onClick={() => playAyah(ayah.number)}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
                isActive
                  ? "border-gold-dim/40 bg-gold-dim/20 text-gold-light"
                  : "border-border/20 text-muted-foreground hover:border-gold-dim/20 hover:text-gold-light hover:bg-gold-dim/10",
              )}
              aria-label={isThisPlaying ? `Pause ayah ${ayah.ayahNumber}` : `Play ayah ${ayah.ayahNumber}`}
            >
              {isThisPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 translate-x-px" />}
            </button>
          </div>
          <AyahActions ayah={ayah} surah={surah} />
        </div>

        <div className="mt-3 text-right">
          <p
            className={cn(
              "font-arabic text-foreground leading-[2.2]",
              getFontSizeClass(level, "quranArabic"),
            )}
            dir="rtl"
          >
            {isFirstAyah && (
              <span className="gold-drop-cap font-display font-black">
                {ayah.arabic.charAt(0)}
              </span>
            )}
            <span className={isFirstAyah ? "" : ""}>
              {isFirstAyah ? ayah.arabic.slice(1) : ayah.arabic}
            </span>
            <span className="text-gold-dim/60 text-lg mr-2">﴿{ayah.ayahNumber}﴾</span>
          </p>
        </div>

        {showTranslation && (
          <div className="mt-4 border-t border-gold-dim/10 pt-4">
            <p className={cn("leading-relaxed text-muted-foreground", getFontSizeClass(level, "translation"))}>
              {ayah.translations[translationLang] || "Translation not available"}
            </p>
          </div>
        )}

        <TafsirPanel surahNumber={ayah.surahNumber} ayahNumber={ayah.ayahNumber} />
      </div>
    </motion.div>
  )
}
