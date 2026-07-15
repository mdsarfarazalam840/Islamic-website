import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BookOpen, BookMarked, Search } from "lucide-react"
import { getCollection, getBooksForCollection } from "@/lib/hadith/translations"
import { HadithSearch } from "@/components/hadith/HadithSearch"

interface Props {
  params: Promise<{ collection: string }>
}

const validCollections = ["bukhari", "muslim"]

export function generateStaticParams() {
  return validCollections.map((collection) => ({ collection }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection } = await params
  const meta = getCollection(collection)
  if (!meta) return {}
  return {
    title: `${meta.name} — Noor`,
    description: `Browse ${meta.totalBooks} books and ${meta.totalHadith.toLocaleString()} hadiths from ${meta.name}.`,
  }
}

export default async function CollectionPage({ params }: Props) {
  const { collection } = await params
  const meta = getCollection(collection)
  if (!meta) notFound()

  const books = getBooksForCollection(collection)

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <Link
        href="/hadith"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to collections
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <BookOpen className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{meta.name}</h1>
          <span className="text-base font-arabic text-secondary/70">{meta.nameArabic}</span>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.totalHadith.toLocaleString()} hadiths &middot; {meta.totalBooks} books
            {meta.author ? ` &middot; Compiled by ${meta.author}` : ""}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <details className="group rounded-xl border border-border/50 bg-card overflow-hidden">
          <summary className="flex items-center gap-2 p-4 cursor-pointer text-sm font-medium text-foreground hover:text-secondary transition-colors">
            <BookMarked className="size-4 text-secondary" />
            Browse all {meta.totalBooks} books
            <span className="ml-auto text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="border-t border-border/50 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {books.map((book) => (
                <Link
                  key={book.id}
                  href={`/hadith/${collection}/${book.id}`}
                  className="group/book flex items-center justify-between rounded-lg border border-border/20 bg-surface/50 p-3 transition-all hover:border-secondary/30 hover:bg-secondary/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-secondary/10 text-[10px] font-medium text-secondary">
                      {book.id}
                    </span>
                    <span className="text-xs text-foreground truncate">{book.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {book.hadithCount}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </details>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="size-4 text-secondary" />
          <h2 className="text-sm font-medium text-foreground">Search Hadith</h2>
        </div>
        <HadithSearch collectionId={collection} books={books} />
      </div>
    </div>
  )
}
