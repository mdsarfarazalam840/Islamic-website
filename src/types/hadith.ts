export type HadithCollectionId =
  | "bukhari"
  | "muslim"
  | "abudawud"
  | "tirmidhi"
  | "nasai"
  | "ibnmajah"
  | "malik"

export interface Hadith {
  id: string
  collection: HadithCollectionId
  bookId: number
  bookName: string
  chapterId: number
  chapterName: string
  hadithNumber: number
  arabic: string
  english: string
  urdu: string
  narrator: string
  grade: string
  reference: {
    collection: string
    book: string
    hadithNumber: number
    volume?: number
    bookNumber?: number
    uscMsa?: string
  }
  tags: string[]
}

export interface HadithCollection {
  id: HadithCollectionId
  name: string
  nameArabic: string
  totalHadith: number
  totalBooks: number
  description: string
}

export interface HadithBook {
  id: number
  collection: HadithCollectionId
  name: string
  hadithCount: number
}
