import type { Metadata } from "next"
import { BookOpen, Heart } from "lucide-react"

export const metadata: Metadata = {
  title: "About",
  description: "About Noor — your comprehensive Islamic resource.",
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="size-6 text-secondary" />
        <h1 className="text-2xl font-display font-bold text-foreground">About Noor</h1>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-muted-foreground leading-relaxed">
          Noor is a comprehensive Islamic resource designed to provide easy access to the Holy Quran,
          authentic Hadith collections, and Islamic scholarly content. Our mission is to make Islamic
          knowledge accessible to everyone, anywhere.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: "Quran",
              description: "Complete Quran with Arabic text and translations in English, Hindi, and Urdu.",
            },
            {
              title: "Hadith",
              description: "Authentic Hadith collections including Sahih al-Bukhari and Sahih Muslim.",
            },
            {
              title: "Videos",
              description: "Curated video library from renowned Islamic scholars.",
            },
            {
              title: "Free & Open Source",
              description: "100% free to use. No ads, no tracking, no cost.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground leading-relaxed mt-8 flex items-center gap-2">
          Made with <Heart className="size-4 text-secondary" /> for the Ummah.
        </p>
      </div>
    </div>
  )
}
