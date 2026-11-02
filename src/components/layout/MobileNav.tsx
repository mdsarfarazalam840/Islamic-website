"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, MessageSquareText, Video, Search, Bookmark, Library, Clock3 } from "lucide-react"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useReadingProgress } from "@/hooks/useReadingProgress"
import { useHadithProgress } from "@/hooks/useHadithProgress"
import { useArticleProgress } from "@/hooks/useArticleProgress"
import { cn } from "@/lib/utils"

// Seven tabs keeps the main tools one tap away on mobile. `short` is what the
// tab actually renders, so labels stay readable at roughly 50px per tab.
const mobileLinks = [
  { href: "/saved", label: "Saved", short: "Saved", icon: Bookmark },
  { href: "/quran", label: "Quran", short: "Quran", icon: BookOpen },
  { href: "/hadith", label: "Hadith", short: "Hadith", icon: MessageSquareText },
  { href: "/knowledge-base", label: "Knowledge", short: "Learn", icon: Library },
  { href: "/videos", label: "Videos", short: "Videos", icon: Video },
  { href: "/prayer", label: "Prayer", short: "Prayer", icon: Clock3 },
  { href: "/search", label: "Search", short: "Search", icon: Search },
]

export function MobileNav() {
  const pathname = usePathname()
  const { bookmarks } = useBookmarks()
  const { progress: quranProgress } = useReadingProgress()
  const { progress: hadithProgress } = useHadithProgress()
  const { progress: articleProgress } = useArticleProgress()

  // Badge the Saved tab when there is anything to come back to. Video progress
  // is deliberately excluded — /videos surfaces that on its own.
  const hasSaved =
    bookmarks.length > 0 || !!quranProgress || !!hadithProgress || !!articleProgress

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-gold-dim/15 bg-space-navy/90 backdrop-blur-xl" aria-label="Mobile navigation">
      {/* Equal-width grid prevents wider labels from pushing the last tab out of
          view. The theme toggle stays in the top bar. */}
      <div className="grid grid-cols-7 items-stretch h-16 px-1">
        {mobileLinks.map(({ href, label, short, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 transition-all duration-200 relative",
                isActive
                  ? "text-gold-light"
                  : "text-muted-foreground hover:text-gold-dim"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="relative">
                <Icon className="size-5" />
                {href === "/saved" && hasSaved && (
                  <span
                    className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-gold-light gold-ring-glow"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="max-w-full truncate text-[10px] font-medium">{short}</span>
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 size-1 rotate-45 bg-gold-light gold-ring-glow rounded-[1px]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
