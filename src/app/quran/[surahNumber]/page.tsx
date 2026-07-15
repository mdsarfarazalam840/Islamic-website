import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getSurah, getAllSurahs } from "@/lib/quran/surahs"
import { getSurahAyahs } from "@/lib/quran/translations"
import { ArrowLeft, BookOpen, Headphones } from "lucide-react"
import { QuranReader } from "@/components/quran/QuranReader"
import { getSurahAudioUrl, RECITER_NAME } from "@/config/audio"

interface Props {
  params: Promise<{ surahNumber: string }>
}

export async function generateStaticParams() {
  const surahs = getAllSurahs()
  return surahs.map((surah) => ({
    surahNumber: surah.number.toString(),
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { surahNumber } = await params
  const surah = getSurah(Number(surahNumber))
  if (!surah) return {}
  return {
    title: `${surah.number}. ${surah.name} (${surah.nameArabic}) — Noor`,
    description: `Read Surah ${surah.name} (${surah.nameTranslated}) with Arabic text and translations in English, Hindi, and Urdu. ${surah.revelationType} · ${surah.ayahCount} verses.`,
  }
}

export default async function SurahPage({ params }: Props) {
  const { surahNumber } = await params
  const surah = getSurah(Number(surahNumber))
  if (!surah) notFound()

  const ayahs = getSurahAyahs(surah.number)
  const audioUrl = getSurahAudioUrl(surah.number)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: `Surah ${surah.name} (${surah.nameArabic})`,
    description: `Read Surah ${surah.name} (${surah.nameTranslated}) with Arabic text and translations. ${surah.revelationType.charAt(0).toUpperCase() + surah.revelationType.slice(1)} surah with ${surah.ayahCount} verses.`,
    numberOfPages: surah.ayahCount,
    inLanguage: ["ar", "en", "hi", "ur"],
    isPartOf: {
      "@type": "Book",
      name: "The Holy Quran",
    },
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/quran"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Surah list
      </Link>

      <div className="flex flex-col items-center gap-4 mb-10 text-center">
        <div className="flex items-center gap-2 text-secondary">
          <BookOpen className="size-5" />
          <span className="text-sm font-medium uppercase tracking-wider">
            Surah {surah.number}
          </span>
        </div>
        <h1 className="text-4xl font-arabic text-secondary leading-relaxed">
          {surah.nameArabic}
        </h1>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {surah.name}
        </h2>
        <p className="text-muted-foreground text-sm">
          {surah.nameTranslated} &middot; {surah.revelationType} &middot; {surah.ayahCount} verses
          {surah.juz.length > 0 && ` \u00b7 Juz ${surah.juz.join(", ")}`}
        </p>

        {audioUrl && (
          <a
            href={audioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-secondary/10 px-4 py-2 text-sm text-secondary hover:bg-secondary/20 transition-colors"
          >
            <Headphones className="size-4" />
            Listen ({RECITER_NAME})
          </a>
        )}
      </div>

      {ayahs.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-10 text-center">
          <BookOpen className="size-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">
            Ayah data not available yet.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Run <code className="rounded bg-surface px-2 py-0.5 text-xs">npm run fetch:quran</code> to download translations.
          </p>
        </div>
      ) : (
        <QuranReader surah={surah} ayahs={ayahs} />
      )}
    </div>
  )
}
