"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

const STORAGE_KEY = "noor-font-size"

export const FONT_SIZE_LEVELS = 5
export const DEFAULT_LEVEL = 2

export interface FontSizeState {
  level: number
  increase: () => void
  decrease: () => void
  reset: () => void
}

export const useFontSize = create<FontSizeState>()(
  persist(
    (set, get) => ({
      level: DEFAULT_LEVEL,
      increase: () => set({ level: Math.min(get().level + 1, FONT_SIZE_LEVELS - 1) }),
      decrease: () => set({ level: Math.max(get().level - 1, 0) }),
      reset: () => set({ level: DEFAULT_LEVEL }),
    }),
    {
      name: STORAGE_KEY,
    },
  ),
)

// Font size mappings: [level0, level1, level2(default), level3, level4]
export const FONT_SIZES = {
  // Quran Arabic text (larger scale)
  quranArabic: ["text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl"] as const,
  quranArabicDesktop: ["text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl"] as const,
  // Hadith Arabic text
  hadithArabic: ["text-base", "text-lg", "text-xl", "text-2xl", "text-3xl"] as const,
  // Translation text (EN/UR)
  translation: ["text-xs", "text-sm", "text-sm", "text-base", "text-lg"] as const,
} as const

export function getFontSizeClass(level: number, type: keyof typeof FONT_SIZES): string {
  const clamped = Math.max(0, Math.min(level, FONT_SIZE_LEVELS - 1))
  return FONT_SIZES[type][clamped]
}
