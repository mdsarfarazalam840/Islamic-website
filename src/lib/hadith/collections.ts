import type { HadithCollection, HadithCollectionId } from "@/types"

export const COLLECTION_DISPLAY_NAMES: Record<HadithCollectionId, string> = {
  bukhari: "Sahih al-Bukhari",
  muslim: "Sahih Muslim",
  abudawud: "Sunan Abi Dawud",
  tirmidhi: "Jami at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  ibnmajah: "Sunan Ibn Majah",
  malik: "Muwatta Malik",
}

export function getCollectionDisplayName(id: string): string {
  return COLLECTION_DISPLAY_NAMES[id as HadithCollectionId] ?? id
}

export const hadithCollections: HadithCollection[] = [
  {
    id: "bukhari",
    name: "Sahih al-Bukhari",
    nameArabic: "صحيح البخاري",
    totalHadith: 7589,
    totalBooks: 98,
    description: "The most authentic Hadith collection compiled by Imam Muhammad al-Bukhari.",
  },
  {
    id: "muslim",
    name: "Sahih Muslim",
    nameArabic: "صحيح مسلم",
    totalHadith: 7563,
    totalBooks: 57,
    description: "The second most authentic Hadith collection compiled by Imam Muslim ibn al-Hajjaj.",
  },
  {
    id: "abudawud",
    name: "Sunan Abi Dawud",
    nameArabic: "سنن أبي داود",
    totalHadith: 5274,
    totalBooks: 43,
    description: "A comprehensive collection on Islamic law compiled by Imam Abu Dawud, focusing on jurisprudence and daily practice.",
  },
  {
    id: "tirmidhi",
    name: "Jami at-Tirmidhi",
    nameArabic: "جامع الترمذي",
    totalHadith: 3998,
    totalBooks: 49,
    description: "A unique collection that grades each hadith for authenticity and includes scholarly opinions on jurisprudential matters.",
  },
  {
    id: "nasai",
    name: "Sunan an-Nasa'i",
    nameArabic: "سنن النسائي",
    totalHadith: 5765,
    totalBooks: 52,
    description: "A highly regarded collection known for its rigorous authentication process, considered the most accurate of the Sunan books.",
  },
  {
    id: "ibnmajah",
    name: "Sunan Ibn Majah",
    nameArabic: "سنن ابن ماجه",
    totalHadith: 4343,
    totalBooks: 38,
    description: "The sixth canonical collection, containing many unique hadith not found in the other five books.",
  },
  {
    id: "malik",
    name: "Muwatta Malik",
    nameArabic: "موطأ مالك",
    totalHadith: 1858,
    totalBooks: 62,
    description: "One of the earliest collections of hadith compiled by Imam Malik ibn Anas, forming the foundation of Maliki jurisprudence.",
  },
]

export function getCollection(id: string): HadithCollection | undefined {
  return hadithCollections.find((c) => c.id === id)
}
