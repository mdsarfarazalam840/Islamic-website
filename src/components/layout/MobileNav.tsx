"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, MessageSquareText, Video, Search, Home } from "lucide-react"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { cn } from "@/lib/utils"

const mobileLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/quran", label: "Quran", icon: BookOpen },
  { href: "/hadith", label: "Hadith", icon: MessageSquareText },
  { href: "/videos", label: "Videos", icon: Video },
  { href: "/search", label: "Search", icon: Search },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-gold-dim/15 bg-space-navy/90 backdrop-blur-xl" aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 relative",
                isActive
                  ? "text-gold-light"
                  : "text-muted-foreground hover:text-gold-dim"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 size-1 rotate-45 bg-gold-light gold-ring-glow rounded-[1px]" />
              )}
            </Link>
          )
        })}
        <ThemeToggle />
      </div>
    </nav>
  )
}
