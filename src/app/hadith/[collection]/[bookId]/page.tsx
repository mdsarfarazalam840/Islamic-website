import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BookOpen } from "lucide-react"
import { getCollection, getBookHadiths, getBooksForCollection } from "@/lib/hadith/translations"
import { HadithCard } from "@/components/hadith/HadithCard"

interface Props {
  params: Promise<{ collection: string; bookId: string }>
}

const validCollections = ["bukhari", "muslim"]

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

  if (!validCollections.includes(collection)) notFound()
  const meta = getCollection(collection)
  if (!meta) notFound()

  const books = getBooksForCollection(collection)
  const book = books.find((b) => b.id === Number(bookId))
  if (!book) notFound()

  const hadiths = getBookHadiths(collection, Number(bookId))

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <Link
        href={`/hadith/${collection}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to books
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <BookOpen className="size-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-display font-bold text-foreground">{book.name}</h1>
            <span className="rounded-lg bg-secondary/10 px-2 py-0.5 text-[10px] font-medium text-secondary">
              Book {book.id}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.name} &middot; {hadiths.length} hadith{hadiths.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {hadiths.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-10 text-center">
          <BookOpen className="size-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">No hadith found in this book.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hadiths.map((hadith, i) => (
            <HadithCard key={hadith.id} hadith={hadith} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
