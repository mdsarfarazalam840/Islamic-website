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
  revelationType: "meccan" | "medinan"
  ayahCount: number
  juz: number[]
}

export interface Juz {
  number: number
  surah: number
  ayah: number
}
