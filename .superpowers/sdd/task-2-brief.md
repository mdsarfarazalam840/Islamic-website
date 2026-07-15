## Task 2: SearchBar Shared Component

**Files:**
- Create: `src/components/shared/SearchBar.tsx`

**Interfaces:**
- Consumes: `quranData` from `@/hooks/useQuran`, `Fuse` from `fuse.js`, `useRouter` from `next/navigation`
- Produces: navigates to `/search?q={query}` on submit or result click

- [ ] **Step 1: Create SearchBar component**

```tsx
// src/components/shared/SearchBar.tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"
import Fuse from "fuse.js"
import { cn } from "@/lib/utils"
import { useQuran } from "@/hooks/useQuran"
import type { Ayah } from "@/types"

interface SearchBarProps {
  placeholder?: string
  className?: string
}

export function SearchBar({ placeholder = "Search the Quran...", className }: SearchBarProps) {
  const router = useRouter()
  const { surahs, getAyahs } = useQuran()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ ayah: Ayah; surahName: string; surahNumber: number }[]>([])
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [fuse, setFuse] = useState<Fuse<{ ayah: Ayah; surahName: string; surahNumber: number }> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build Fuse index lazily
  useEffect(() => {
    if (fuse || !surahs.length) return
    setLoading(true)
    const allAyahs: { ayah: Ayah; surahName: string; surahNumber: number }[] = []
    const surahNames = new Map(surahs.map((s) => [s.number, s.name]))
    for (let i = 1; i <= 114; i++) {
      const ayahs = getAyahs(i)
      const name = surahNames.get(i) ?? ""
      for (const ayah of ayahs) {
        allAyahs.push({ ayah, surahName: name, surahNumber: i })
      }
    }
    setFuse(new Fuse(allAyahs, {
      keys: [
        { name: "ayah.translations.en", weight: 0.3 },
        { name: "ayah.translations.hi", weight: 0.15 },
        { name: "ayah.translations.ur", weight: 0.15 },
        { name: "ayah.arabic", weight: 0.2 },
        { name: "surahName", weight: 0.2 },
      ],
      threshold: 0.4,
      includeScore: true,
    }))
    setLoading(false)
  }, [fuse, surahs, getAyahs])

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    setSelectedIndex(-1)
    if (!value.trim() || !fuse) {
      setResults([])
      setOpen(false)
      return
    }
    const res = fuse.search(value).slice(0, 5).map((r) => r.item)
    setResults(res)
    setOpen(res.length > 0)
  }, [fuse])

  const navigate = useCallback((surahNumber: number, ayahNumber: number) => {
    setOpen(false)
    setQuery("")
    router.push(`/quran/${surahNumber}#ayah-${ayahNumber}`)
  }, [router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open || !results.length) {
      if (e.key === "Enter" && query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query)}`)
        setOpen(false)
      }
      return
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0) {
          const r = results[selectedIndex]
          navigate(r.surahNumber, r.ayah.ayahNumber)
        } else if (query.trim()) {
          router.push(`/search?q=${encodeURIComponent(query)}`)
          setOpen(false)
        }
        break
      case "Escape":
        setOpen(false)
        inputRef.current?.blur()
        break
    }
  }, [open, results, selectedIndex, query, router, navigate])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={cn("relative", className)} role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length) setOpen(true) }}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Search"
          aria-autocomplete="list"
          aria-controls="search-results"
          role="searchbox"
        />
      </div>
      {open && results.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {results.map((r, i) => (
            <li
              key={`${r.surahNumber}-${r.ayah.ayahNumber}`}
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => navigate(r.surahNumber, r.ayah.ayahNumber)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={cn(
                "flex flex-col gap-0.5 rounded-md px-3 py-2 cursor-pointer",
                i === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <span className="text-xs text-muted-foreground">{r.surahName} Â· {r.ayah.ayahNumber}</span>
              <span className="text-sm line-clamp-1">{r.ayah.translations.en}</span>
              <span className="text-xs text-muted-foreground font-arabic line-clamp-1" dir="rtl">{r.ayah.arabic}</span>
            </li>
          ))}
          <li
            role="option"
            onClick={() => { router.push(`/search?q=${encodeURIComponent(query)}`); setOpen(false) }}
            className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer border-t border-border"
          >
            <Search className="size-3.5" />
            View all results
          </li>
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Clean build with no errors

---

