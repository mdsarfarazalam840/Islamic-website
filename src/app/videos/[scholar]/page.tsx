import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { scholars } from "@/config/scholars"
import { ScholarClient } from "./ScholarClient"
import { ArrowLeft } from "lucide-react"

interface Props {
  params: Promise<{ scholar: string }>
}

export async function generateStaticParams() {
  return scholars.map((s) => ({ scholar: s.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scholar } = await params
  const s = scholars.find((s) => s.id === scholar)
  if (!s) return {}
  return { title: `${s.name} — Videos`, description: s.bio }
}

export default async function ScholarPage({ params }: Props) {
  const { scholar } = await params
  const s = scholars.find((s) => s.id === scholar)
  if (!s) notFound()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <Link
        href="/videos"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to scholars
      </Link>

      <div className="flex items-start gap-5 mb-8">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gold-dim/10 text-gold-light text-2xl font-bold border border-gold-dim/20">
          {s.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-display gold-gradient-text font-bold">{s.name}</h1>
          <span className="text-sm text-gold-dim/60 font-arabic">{s.nameAr}</span>
          <p className="text-muted-foreground mt-2 max-w-2xl">{s.bio}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {s.categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-gold-dim/10 px-3 py-0.5 text-xs font-medium text-gold-light border border-gold-dim/20"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ScholarClient scholarId={scholar} />
    </div>
  )
}
