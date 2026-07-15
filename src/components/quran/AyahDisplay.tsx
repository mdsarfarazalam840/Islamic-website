"use client"

import { motion } from "framer-motion"
import type { Ayah, Surah } from "@/types"
import { AyahActions } from "./AyahActions"

interface AyahDisplayProps {
  ayah: Ayah
  surah: Surah
  translationLang: "en" | "hi" | "ur"
  showTranslation: boolean
  index: number
}

export function AyahDisplay({ ayah, surah, translationLang, showTranslation, index }: AyahDisplayProps) {
  return (
    <motion.div
      id={`ayah-${ayah.number}`}
      data-ayah-global={ayah.number}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      className="group relative rounded-xl border border-border/30 bg-card/50 p-5 transition-all duration-200 hover:border-secondary/20 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-xs font-medium text-secondary">
          {ayah.ayahNumber}
        </span>
        <AyahActions ayah={ayah} surah={surah} />
      </div>

      <div className="mt-3 text-right">
        <p className="text-2xl leading-[2.2] font-arabic text-foreground" dir="rtl">
          {ayah.arabic}
        </p>
      </div>

      {showTranslation && (
        <div className="mt-3 border-t border-border/20 pt-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {ayah.translations[translationLang] || "Translation not available"}
          </p>
        </div>
      )}
    </motion.div>
  )
}
