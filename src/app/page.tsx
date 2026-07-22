import Link from "next/link"
import { BookOpen, MessageSquareText, Video, Search, ArrowRight, Library, BookMarked, Star } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { DynamicHero } from "@/components/three/DynamicHero"
import { getAllSurahs } from "@/lib/quran/surahs"
import { getAllAyahs } from "@/lib/quran/translations"

const quickLinks = [
  {
    title: "Al-Quran",
    description: "Read all 114 surahs with Arabic text and translations in English, Hindi, Urdu",
    icon: BookOpen,
    href: "/quran",
    gradient: "from-gold-dim/20 to-gold-dim/5",
    stats: "114 Surahs · 6236 Verses",
  },
  {
    title: "Hadith",
    description: "Explore 7 authentic Hadith collections",
    icon: MessageSquareText,
    href: "/hadith",
    gradient: "from-emerald/20 to-emerald/5",
    stats: "7 Collections · 36,000+ Hadiths",
  },
  {
    title: "Videos",
    description: "Islamic lectures from top scholars worldwide",
    icon: Video,
    href: "/videos",
    gradient: "from-accent/20 to-accent/5",
    stats: "19 Scholars",
  },
  {
    title: "Search",
    description: "Search across the entire Quran with fuzzy matching",
    icon: Search,
    href: "/search",
    gradient: "from-space-mid/30 to-space-mid/10",
    stats: "Arabic · English · Hindi · Urdu",
  },
]

export default function HomePage() {
  const surahs = getAllSurahs()
  const meccanCount = surahs.filter((s) => s.revelationType === "meccan").length
  const medinanCount = surahs.filter((s) => s.revelationType === "medinan").length

  return (
    <div className="flex flex-col">
      {/* Grand Foyer — Full-bleed 3D Hero */}
      <section className="relative flex min-h-[80dvh] flex-col items-center justify-center overflow-hidden px-4">
        <DynamicHero />
        <div className="absolute inset-0 lantern-glow" />
        <div className="absolute inset-0 geometric-bg" />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-3xl">
          <div className="flex items-center gap-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-display gold-gradient-text font-bold tracking-tight">
              Noor
            </h1>
            <span className="text-4xl sm:text-5xl md:text-6xl font-arabic text-gold-light/70">
              نور
            </span>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
            A sacred space for the word of Allah — Quran, Hadith, and scholar videos.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/quran"
              className={buttonVariants({
                size: "lg",
                className: "gold-gradient-bg text-space-deep font-semibold hover:gold-shadow-lg transition-all duration-300 hover:scale-[1.02] border-0"
              })}
            >
              <BookOpen className="size-4" />
              Start Reading
            </Link>
            <Link
              href="/search"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "border-gold-dim/30 text-gold-light hover:bg-gold-dim/10 hover:text-gold-light"
              })}
            >
              <Search className="size-4" />
              Search Quran
            </Link>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-muted-foreground/40">
          <span className="text-[10px] tracking-widest uppercase">Scroll</span>
          <div className="size-4 border-2 border-gold-dim/30 rounded-full flex items-start justify-center p-0.5">
            <div className="size-1.5 rounded-full bg-gold-dim/40 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Sacred Margin */}
      <div className="sacred-margin" />

      {/* Quick Links — Four Chambers */}
      <section className="mx-auto max-w-7xl w-full px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map(({ title, description, icon: Icon, href, gradient, stats }) => (
            <Link
              key={href}
              href={href}
              className="group relative overflow-hidden rounded-xl border border-border/20 bg-card/40 p-6 transition-all duration-500 hover:border-gold-dim/30 hover:gold-shadow"
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-gold-dim/10 text-gold-light">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-gold-light transition-colors duration-300">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  <p className="text-xs text-gold-dim/60 mt-2">{stats}</p>
                </div>
                <ArrowRight className="size-4 text-gold-light opacity-0 group-hover:opacity-100 transition-all translate-x-[-8px] group-hover:translate-x-0 duration-300" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Sacred Margin */}
      <div className="sacred-margin" />

      {/* Stats Section */}
      <section className="border-t border-gold-dim/10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center group">
              <div className="flex items-center justify-center size-16 rounded-xl bg-gold-dim/10 text-gold-light mx-auto mb-5 transition-all duration-300 group-hover:gold-shadow">
                <BookMarked className="size-7" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">The Holy Quran</h3>
              <p className="text-sm text-muted-foreground">
                {meccanCount} Meccan &middot; {medinanCount} Medinan surahs
              </p>
              <p className="text-xs text-gold-dim/60 mt-2">
                Read with 3 translations &middot; Juz navigation &middot; Search
              </p>
            </div>
            <div className="text-center group">
              <div className="flex items-center justify-center size-16 rounded-xl bg-emerald/10 text-emerald mx-auto mb-5 transition-all duration-300 group-hover:shadow-lg">
                <Library className="size-7" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Hadith Collections</h3>
              <p className="text-sm text-muted-foreground">
                Authentic sayings of the Prophet (PBUH)
              </p>
              <p className="text-xs text-gold-dim/60 mt-2">
                Kutub as-Sittah &middot; Muwatta Malik
              </p>
            </div>
            <div className="text-center group">
              <div className="flex items-center justify-center size-16 rounded-xl bg-accent/10 text-accent mx-auto mb-5 transition-all duration-300 group-hover:shadow-lg">
                <Video className="size-7" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Scholar Videos</h3>
              <p className="text-sm text-muted-foreground">
                Curated lectures from renowned scholars
              </p>
              <p className="text-xs text-gold-dim/60 mt-2">
                Tafsir &middot; Seerah &middot; Fiqh &middot; Aqeedah
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sacred Margin */}
      <div className="sacred-margin" />

      {/* Divine Quote */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 text-center pb-20">
        <hr className="gold-divider mb-10" />
        <p className="text-2xl md:text-3xl font-display text-gold-light/70 leading-relaxed italic">
          "نُورٌ عَلَىٰ نُورٍ"
        </p>
        <p className="text-lg text-muted-foreground mt-3">
          Light upon light
        </p>
        <p className="text-xs text-gold-dim/50 mt-2">
          — Quran, Surah An-Nur (24:35)
        </p>
        <hr className="gold-divider mt-10" />
      </section>
    </div>
  )
}
