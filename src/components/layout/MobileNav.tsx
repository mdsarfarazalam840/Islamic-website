"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, MessageSquareText, Video, Search, Bookmark, Library } from "lucide-react"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useReadingProgress } from "@/hooks/useReadingProgress"
import { useHadithProgress } from "@/hooks/useHadithProgress"
import { useArticleProgress } from "@/hooks/useArticleProgress"
import { cn } from "@/lib/utils"

// Six tabs is already the most that fits, so Saved takes the Home slot — the
// "Noor" wordmark in the top bar still navigates home. `short` is what the tab
// actually renders: at six-across on a 360px screen there is ~55px per tab, and
// "Knowledge" does not fit in that without shrinking every label to nothing.
const mobileLinks = [
  { href: "/saved", label: "Saved", short: "Saved", icon: Bookmark },
  { href: "/quran", label: "Quran", short: "Quran", icon: BookOpen },
  { href: "/hadith", label: "Hadith", short: "Hadith", icon: MessageSquareText },
  { href: "/knowledge-base", label: "Knowledge", short: "Learn", icon: Library },
  { href: "/videos", label: "Videos", short: "Videos", icon: Video },
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
      {/* Equal-width grid, not justify-around: with flex the wider tabs pushed the
          row past a 360px viewport and the last one clipped. The theme toggle
          lives in the top bar, which is visible on mobile too, so it is not
          duplicated here. */}
      <div className="grid grid-cols-6 items-stretch h-16 px-1">
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
