import type { Metadata } from "next"
import { BookOpen, Heart, BookMarked, Library, Video, Code } from "lucide-react"

export const metadata: Metadata = {
  title: "About — Noor",
  description: "About Noor — a sacred space for the word of Allah.",
}

const features = [
  {
    title: "Al-Quran",
    description: "Complete Quran with Arabic text and translations in English, Hindi, and Urdu.",
    icon: BookMarked,
  },
  {
    title: "Hadith",
    description: "Authentic Hadith collections — the six canonical books (Kutub as-Sittah) and Muwatta Malik.",
    icon: Library,
  },
  {
    title: "Videos",
    description: "Curated video library from renowned Islamic scholars worldwide.",
    icon: Video,
  },
  {
    title: "Free & Open Source",
    description: "100% free to use. No ads, no tracking, no cost. Built for the Ummah.",
    icon: Code,
  },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-4 mb-4">
          <h1 className="text-4xl font-display gold-gradient-text font-bold">About Noor</h1>
          <span className="text-3xl font-arabic text-gold-light/70">نور</span>
        </div>
        <hr className="gold-divider max-w-xs mx-auto" />
      </div>

      {/* Description */}
      <div className="text-center mb-12">
        <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
          A sacred space for the word of Allah — providing easy access to the Holy Quran,
          authentic Hadith collections, and Islamic scholarly content.
        </p>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        {features.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            className="rounded-xl border border-gold-dim/15 bg-card/40 p-5 transition-all duration-300 hover:border-gold-dim/30 hover:gold-shadow group"
          >
            <Icon className="size-5 text-gold-light mb-3" />
            <h3 className="font-semibold text-foreground group-hover:text-gold-light transition-colors mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      {/* Sacred quote */}
      <div className="text-center py-10">
        <hr className="gold-divider mb-8" />
        <p className="text-xl md:text-2xl font-display text-gold-light/60 leading-relaxed italic">
          "نُورٌ عَلَىٰ نُورٍ يَهْدِي ٱللَّهُ لِنُورِهِۦ مَن يَشَآءُ"
        </p>
        <p className="text-sm text-muted-foreground mt-3">
          Light upon light — Allah guides to His light whom He wills.
        </p>
        <p className="text-xs text-gold-dim/50 mt-1">— Quran, Surah An-Nur (24:35)</p>
        <hr className="gold-divider mt-8" />
      </div>

      {/* Footer note */}
      <p className="text-center text-muted-foreground/60 text-sm flex items-center justify-center gap-2">
        Made with <Heart className="size-4 text-gold-light" /> for the Ummah
      </p>
    </div>
  )
}
