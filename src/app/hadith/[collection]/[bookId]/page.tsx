import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BookOpen } from "lucide-react"
import { getCollection, getBooksForCollection } from "@/lib/hadith/translations"
import { HadithBookClient } from "@/components/hadith/HadithBookClient"
import { FontSizeControls } from "@/components/shared/FontSizeControls"

import type { HadithCollectionId } from "@/types"

interface Props {
  params: Promise<{ collection: string; bookId: string }>
}

const validCollections: HadithCollectionId[] = [
  "bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik",
]

export async function generateStaticParams() {
  const params: { collection: string; bookId: string }[] = []
  for (const collection of validCollections) {
    const books = getBooksForCollection(collection)
    for (const book of books) {
      params.push({ collection, bookId: book.id.toString() })
    }
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection, bookId } = await params
  const meta = getCollection(collection)
  if (!meta) return {}
  const books = getBooksForCollection(collection)
  const book = books.find((b) => b.id === Number(bookId))
  return {
    title: `${book?.name ?? `Book ${bookId}`} — ${meta.name} — Noor`,
    description: `Browse ${book?.hadithCount ?? 0} hadiths from ${book?.name ?? `Book ${bookId}`} of ${meta.name}.`,
  }
}

export default async function BookPage({ params }: Props) {
  const { collection, bookId } = await params

  if (!validCollections.includes(collection as HadithCollectionId)) notFound()
  const meta = getCollection(collection)
  if (!meta) notFound()

  const books = getBooksForCollection(collection)
  const book = books.find((b) => b.id === Number(bookId))
  if (!book) notFound()

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <Link
        href={`/hadith/${collection}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold-light mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to books
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gold-dim/10 text-gold-light border border-gold-dim/20">
          <BookOpen className="size-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-display gold-gradient-text font-bold">{book.name}</h1>
            <span className="rounded-lg bg-gold-dim/15 px-2 py-0.5 text-[10px] font-medium text-gold-light border border-gold-dim/20">
              Book {book.id}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.name} &middot; {book.hadithCount} hadith{book.hadithCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <HadithBookClient
        collection={collection as HadithCollectionId}
        bookId={Number(bookId)}
        totalHadiths={book.hadithCount}
      />

      <FontSizeControls />
    </div>
  )
}
