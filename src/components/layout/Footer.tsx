import Link from "next/link"
import { BookOpen, MessageSquareText, Video, Mail } from "lucide-react"

const footerLinks = [
  {
    title: "Content",
    links: [
      { label: "Quran", href: "/quran" },
      { label: "Hadith", href: "/hadith" },
      { label: "Videos", href: "/videos" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Search", href: "/search" },
      { label: "About", href: "/about" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <span className="text-xl font-display text-secondary font-bold">Noor</span>
              <span className="text-sm text-muted-foreground font-arabic">نور</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your comprehensive Islamic resource — Quran, Hadith, and scholar videos in one place.
            </p>
          </div>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-foreground mb-3">{group.title}</h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Noor. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <span className="text-secondary">&#9829;</span> for the Ummah
          </p>
        </div>
      </div>
    </footer>
  )
}
