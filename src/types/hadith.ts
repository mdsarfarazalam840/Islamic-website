export interface Hadith {
  id: string
  collection: "bukhari" | "muslim"
  bookId: number
  bookName: string
  chapterId: number
  chapterName: string
  hadithNumber: number
  arabic: string
  english: string
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
  id: "bukhari" | "muslim"
  name: string
  nameArabic: string
  totalHadith: number
  totalBooks: number
  description: string
}

export interface HadithBook {
  id: number
  collection: "bukhari" | "muslim"
  name: string
  hadithCount: number
}
