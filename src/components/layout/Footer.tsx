import Link from "next/link"
import { BookOpen, MessageSquareText, Video } from "lucide-react"

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
    <footer className="border-t border-gold-dim/20 bg-space-deep">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-xl font-display gold-gradient-text font-bold">Noor</span>
              <span className="text-sm text-gold-dim font-arabic">نور</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              A sacred space for the word of Allah — Quran, Hadith, and scholar videos.
            </p>
          </div>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-gold-light mb-4 tracking-wider uppercase">{group.title}</h3>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-gold-light transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <hr className="gold-divider my-10" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Noor. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
            Made with <span className="text-gold-light">&#9829;</span> for the Ummah
          </p>
        </div>
      </div>
    </footer>
  )
}
