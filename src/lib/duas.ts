import catalogue from "@/data/duas/hisn-al-muslim.json"
import hadithCatalogue from "@/data/duas/hadith-duas.json"

export type DuaCategoryId =
  | "daily-life"
  | "prayer"
  | "morning-evening"
  | "sleep"
  | "anxiety"
  | "family"
  | "protection"
  | "health"
  | "weather"
  | "ramadan"
  | "social"
  | "travel"
  | "hajj"
  | "remembrance"

export interface DuaCategory {
  id: DuaCategoryId
  label: string
  description: string
}

export interface DuaChapter {
  id: string
  number: number
  title: string
  entryCount: number
}

export interface Dua {
  id: string
  source: "hisn" | "hadith"
  category: DuaCategoryId
  title: string
  arabic: string
  transliteration: string
  translation: string
  reference: string
  chapterNumber: number
  chapterTitle: string
  variation?: string
  audioUrl?: string
  audioDurationSeconds?: number
  hadithCollection?: string
  hadithNumber?: number
  bookId?: number
  bookName?: string
  narrator?: string
  grade?: string
  hadithHref?: string
}

export const DUA_CATEGORIES: DuaCategory[] = [
  { id: "daily-life", label: "Daily life", description: "Waking, dressing, home, wudu, and the mosque." },
  { id: "prayer", label: "Prayer", description: "Adhkar for salah, Witr, and Istikharah." },
  { id: "morning-evening", label: "Morning & evening", description: "A complete daily remembrance collection." },
  { id: "sleep", label: "Sleep", description: "Before sleep, night waking, and dreams." },
  { id: "anxiety", label: "Anxiety & ease", description: "Worry, grief, hardship, sin, and reliance." },
  { id: "family", label: "Family", description: "Children, marriage, and household blessings." },
  { id: "protection", label: "Protection", description: "Refuge, fear, whispers, and spiritual safety." },
  { id: "health", label: "Health & loss", description: "Illness, visiting the sick, and bereavement." },
  { id: "weather", label: "Weather", description: "Wind, rain, thunder, and the new moon." },
  { id: "ramadan", label: "Ramadan & food", description: "Fasting, breaking fast, eating, and gratitude." },
  { id: "social", label: "Community", description: "Greetings, gatherings, praise, and good conduct." },
  { id: "travel", label: "Travel", description: "Riding, journeys, towns, markets, and return." },
  { id: "hajj", label: "Hajj & Umrah", description: "Talbiyah, Tawaf, Safa, Arafah, and stoning." },
  { id: "remembrance", label: "Remembrance", description: "Repentance, istighfar, tasbih, and daily good." },
]

export const DUA_SOURCE = catalogue.source
export const HADITH_DUA_SOURCE = hadithCatalogue.source
export const DUA_CHAPTERS = catalogue.chapters as DuaChapter[]
export const DUAS = catalogue.duas.map((dua) => ({ ...dua, source: "hisn" as const })) as Dua[]
export const HADITH_DUAS = hadithCatalogue.duas as Dua[]
export const DUA_ENTRIES = [...DUAS, ...HADITH_DUAS]
