import Link from "next/link"
import { Star } from "lucide-react"
import { getAllAyahs } from "@/lib/quran/translations"
import { getAllSurahs } from "@/lib/quran/surahs"

export function AyahOfTheDay() {
  const ayahs = getAllAyahs()
  const surahs = getAllSurahs()
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const ayah = ayahs[dayOfYear % ayahs.length]
  const surah = surahs.find((s) => s.number === ayah?.surahNumber)
  if (!ayah || !surah) return null

  return (
    <Link
      href={`/quran/${ayah.surahNumber}#ayah-${ayah.number}`}
      className="group block rounded-xl border border-gold-dim/20 bg-gold-dim/5 p-6 transition-all hover:border-gold-dim/40 hover:bg-gold-dim/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <Star className="size-4 text-gold-light" />
        <span className="text-xs font-medium text-gold-light uppercase tracking-wider">Ayah of the Day</span>
      </div>
      <p className="font-arabic text-xl text-foreground leading-[2.2] text-right mb-4" dir="rtl">
        {ayah.arabic}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
        {ayah.translations.en}
      </p>
      <p className="text-xs text-gold-dim/60 mt-3">
        {surah.name} · {ayah.surahNumber}:{ayah.ayahNumber}
      </p>
    </Link>
  )
}
