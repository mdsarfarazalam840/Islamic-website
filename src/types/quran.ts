export interface Ayah {
  number: number
  surahNumber: number
  ayahNumber: number
  juz: number
  hizb: number
  arabic: string
  translations: {
    en: string
    hi: string
    ur: string
  }
  tafsir?: {
    ibnKathir?: string
    maududi?: string
  }
}

export interface Surah {
  number: number
  name: string
  nameArabic: string
  nameTranslated: string
  /**
   * Hindi forms, written by scripts/ai-hindi-pass.ts (section "surah"):
   * `nameHi` is the name in Devanagari ("अल-फ़ातिहा"), `nameTranslatedHi` its
   * meaning ("खोलने वाली"). Optional because the upstream catalog
   * (scripts/fetch-quran-data.ts) carries neither — a fresh fetch leaves them
   * absent and every caller must fall back to the English pair.
   */
  nameHi?: string
  nameTranslatedHi?: string
  revelationType: "meccan" | "medinan"
  ayahCount: number
  juz: number[]
}

export interface Juz {
  number: number
  surah: number
  ayah: number
}

/**
 * One audio edition from the reciter catalog (scripts/fetch-reciters.ts).
 * A bitrate is non-null only when that shape is actually published for the
 * edition: ayahBitrate means per-ayah files exist, so playback can follow the
 * text verse by verse; surahBitrate means one file per surah.
 */
export interface Reciter {
  id: string
  name: string
  nameArabic: string
  language: string
  type: string
  ayahBitrate: number | null
  surahBitrate: number | null
}
