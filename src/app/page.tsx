import Link from "next/link"
import { BookOpen, MessageSquareText, Video, Search, ArrowRight, Library, BookMarked } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { HeroScene3D } from "@/components/three/HeroScene3D"
import { getAllSurahs } from "@/lib/quran/surahs"
import { getAllAyahs } from "@/lib/quran/translations"

const quickLinks = [
  {
    title: "Al-Quran",
    description: "Read all 114 surahs with Arabic text and translations in English, Hindi, Urdu",
    icon: BookOpen,
    href: "/quran",
    gradient: "from-secondary/20 to-secondary/5",
    stats: "114 Surahs · 6236 Verses",
  },
  {
    title: "Hadith",
    description: "Explore Sahih Bukhari and Sahih Muslim collections",
    icon: MessageSquareText,
    href: "/hadith",
    gradient: "from-emerald/20 to-emerald/5",
    stats: "Bukhari · Muslim",
  },
  {
    title: "Videos",
    description: "Islamic lectures from top scholars worldwide",
    icon: Video,
    href: "/videos",
    gradient: "from-accent/20 to-accent/5",
    stats: "10+ Scholars",
  },
  {
    title: "Search",
    description: "Search across the entire Quran with fuzzy matching",
    icon: Search,
    href: "/search",
    gradient: "from-primary/20 to-primary/5",
    stats: "Arabic · English · Hindi · Urdu",
  },
]

export default function HomePage() {
  const surahs = getAllSurahs()
  const meccanCount = surahs.filter((s) => s.revelationType === "meccan").length
  const medinanCount = surahs.filter((s) => s.revelationType === "medinan").length

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[60dvh] flex-col items-center justify-center overflow-hidden px-4">
        <HeroScene3D />
        <div className="absolute inset-0 lantern-glow" />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-3xl">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display text-secondary font-bold tracking-tight">
              Noor
            </h1>
            <span className="text-3xl sm:text-4xl md:text-5xl font-arabic text-secondary/80">
              نور
            </span>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl">
            Your comprehensive Islamic resource — Quran, Hadith, and scholar videos in one place.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/quran" className={buttonVariants({ size: "lg", className: "bg-secondary text-background hover:bg-secondary/90" })}>
              Start Reading <BookOpen className="size-4" />
            </Link>
            <Link href="/search" className={buttonVariants({ variant: "outline", size: "lg" })}>
              <Search className="size-4" /> Search Quran
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl w-full px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map(({ title, description, icon: Icon, href, gradient, stats }) => (
            <Link
              key={href}
              href={href}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/5"
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${gradient}`} />
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-secondary transition-colors">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  <p className="text-xs text-secondary/60 mt-2">{stats}</p>
                </div>
                <ArrowRight className="size-4 text-secondary opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center size-14 rounded-xl bg-secondary/10 text-secondary mx-auto mb-4">
                <BookMarked className="size-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">The Holy Quran</h3>
              <p className="text-sm text-muted-foreground">
                {meccanCount} Meccan &middot; {medinanCount} Medinan surahs
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Read with 3 translations &middot; Juz navigation &middot; Search
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center size-14 rounded-xl bg-emerald/10 text-emerald mx-auto mb-4">
                <Library className="size-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Hadith Collections</h3>
              <p className="text-sm text-muted-foreground">
                Authentic sayings of the Prophet (PBUH)
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Sahih Bukhari &middot; Sahih Muslim
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center size-14 rounded-xl bg-accent/10 text-accent mx-auto mb-4">
                <Video className="size-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Scholar Videos</h3>
              <p className="text-sm text-muted-foreground">
                Curated lectures from renowned scholars
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Tafsir &middot; Seerah &middot; Fiqh &middot; Aqeedah
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
