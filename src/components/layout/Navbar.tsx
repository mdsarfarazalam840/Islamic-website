"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { Menu, X, Search, BookOpen, Video, MessageSquareText, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/quran", label: "Quran", icon: BookOpen },
  { href: "/hadith", label: "Hadith", icon: MessageSquareText },
  { href: "/videos", label: "Videos", icon: Video },
  { href: "/search", label: "Search", icon: Search },
]

const lanternLinks = [
  { href: "/", label: "Home", icon: Home },
  ...navLinks,
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [lanternOpen, setLanternOpen] = useState(false)
  const pathname = usePathname()

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY
    setScrolled(currentScrollY > 60)

    if (currentScrollY > 200) {
      setHidden(currentScrollY > lastScrollY)
    } else {
      setHidden(false)
    }

    setLastScrollY(currentScrollY)
  }, [lastScrollY])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  useEffect(() => {
    setMobileOpen(false)
    setLanternOpen(false)
  }, [pathname])

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-400 ease-in-out",
          hidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100",
          scrolled
            ? "glass border-b border-border/50"
            : "bg-gradient-to-b from-space-deep/80 to-transparent border-b border-transparent"
        )}
      >
        <div className={cn(
          "mx-auto flex items-center justify-between px-4 sm:px-6 transition-all duration-300",
          scrolled ? "h-14" : "h-16"
        )}>
          <Link href="/" className="flex items-center gap-2 group">
            <span className={cn(
              "font-display font-bold tracking-tight transition-all duration-300 gold-gradient-text",
              scrolled ? "text-xl" : "text-2xl"
            )}>
              Noor
            </span>
            <span className={cn(
              "text-muted-foreground font-arabic transition-all duration-300",
              scrolled ? "text-xs" : "text-sm"
            )}>
              نور
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium relative",
                    "transition-colors duration-200",
                    isActive
                      ? "text-gold-light bg-gold-dim/10"
                      : "text-muted-foreground hover:text-gold-light hover:bg-gold-dim/5"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-4" />
                  {label}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 size-1.5 rotate-45 bg-gold-light rounded-[1px]" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 glass" role="dialog" aria-label="Navigation menu">
            <nav className="flex flex-col gap-1 p-4" aria-label="Mobile navigation">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                      "transition-colors duration-200",
                      isActive
                        ? "text-gold-light bg-gold-dim/10"
                        : "text-muted-foreground hover:text-gold-light hover:bg-gold-dim/5"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      {hidden && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden md:block">
          <div className="relative">
            <button
              onClick={() => setLanternOpen(!lanternOpen)}
              onMouseEnter={() => setLanternOpen(true)}
              onMouseLeave={() => setLanternOpen(false)}
              className={cn(
                "flex items-center justify-center size-12 rounded-full transition-all duration-300 lantern-orb",
                "gold-gradient-bg text-space-deep shadow-lg",
                "hover:scale-110 hover:gold-shadow-lg",
                lanternOpen ? "scale-110 gold-shadow-lg" : ""
              )}
              aria-label="Navigation menu"
            >
              <Menu className="size-5" />
            </button>

            {lanternOpen && (
              <div
                className="absolute bottom-16 left-1/2 -translate-x-1/2 glass-gold rounded-xl p-2 shadow-2xl min-w-40"
                onMouseEnter={() => setLanternOpen(true)}
                onMouseLeave={() => setLanternOpen(false)}
              >
                <nav className="flex flex-col gap-1">
                  {lanternLinks.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setLanternOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "text-gold-light bg-gold-dim/15"
                            : "text-muted-foreground hover:text-gold-light hover:bg-gold-dim/10"
                        )}
                      >
                        <Icon className="size-4" />
                        {label}
                      </Link>
                    )
                  })}
                  <div className="border-t border-gold-dim/20 pt-1 mt-1">
                    <ThemeToggle />
                  </div>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
