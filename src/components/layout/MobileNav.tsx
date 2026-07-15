"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, MessageSquareText, Video, Search, Home } from "lucide-react"
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
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border/50 glass" aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                isActive
                  ? "text-secondary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
