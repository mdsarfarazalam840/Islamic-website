import type { HadithCollection } from "@/types"

export const hadithCollections: HadithCollection[] = [
  {
    id: "bukhari",
    name: "Sahih al-Bukhari",
    nameArabic: "صحيح البخاري",
    totalHadith: 7563,
    totalBooks: 97,
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
]

export function getCollection(id: string): HadithCollection | undefined {
  return hadithCollections.find((c) => c.id === id)
}
