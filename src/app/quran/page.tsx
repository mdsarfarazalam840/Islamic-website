import type { Metadata } from "next"
import { getAllSurahs } from "@/lib/quran/surahs"
import { getJuzIndex } from "@/lib/quran/juz"
import { QuranIndexClient } from "./QuranIndexClient"

export const metadata: Metadata = {
  title: "Al-Quran — Noor",
  description: "Browse all 114 surahs of the Holy Quran with translations in English, Hindi, and Urdu.",
}

export default function QuranIndexPage() {
  const surahs = getAllSurahs()
  // Where each juz starts, computed at build time: ~2 KB, and it's the one fact
  // "go to juz 5" needs that the surah catalog can't supply.
  const juzIndex = getJuzIndex()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <QuranIndexClient surahs={surahs} juzIndex={juzIndex} />
    </div>
  )
}
