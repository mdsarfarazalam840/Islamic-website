# Noor — Remaining Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Complete all remaining items: Shared Components, UI Components, Phase 6 Polish, and 3D Components.

**Architecture:** Each component is a self-contained file in its respective directory. Shared components use existing hooks/stores. UI components wrap `@base-ui/react` primitives with shadcn-style styling via `cva`. Phase 6 integrates existing components into pages. 3D components use `@react-three/fiber` with geometric abstract style.

**Tech Stack:** Next.js 16.2 · React 19.2 · Tailwind CSS v4 · shadcn/@base-ui/react 1.6 · Three.js 0.185 · r3f 9.6 · drei 10.7 · framer-motion 12.42 · next-themes · lucide-react

## Global Constraints

- Every UI component must follow the pattern in `src/components/ui/button.tsx`: `cva` variants, `cn()` class merging, `data-slot` attribute, `"use client"` directive
- Base UI primitives are imported via namespace pattern: `import { Tabs } from "@base-ui/react/tabs"` then `<Tabs.Root>`, `<Tabs.Tab>`, etc.
- All Tailwind classes use CSS variables from `globals.css` (OKLCH color space, custom radius tokens)
- Every client component must be hydration-safe (check `typeof window` or `useEffect` mount guard)
- Three.js components must have `hasWebGL()` guard and `Suspense` fallback with `.geometric-bg` CSS class
- New files listed under "Create:" — existing files under "Modify:"

---

---

## Task 1: BookmarkButton + LanguageSwitcher Shared Components

**Files:**
- Create: `src/components/shared/BookmarkButton.tsx`
- Create: `src/components/shared/LanguageSwitcher.tsx`

**Interfaces:**
- `BookmarkButton` consumes `useBookmarks()` hook from `@/hooks/useBookmarks`; props: `{ type: "ayah" | "hadith"; id: string; reference: string; text: string; className?: string }`
- `LanguageSwitcher` produces: custom event `noor:languageChange` with `CustomEvent<{ language: string }>` detail; reads/writes `noor-language` in localStorage

- [ ] **Step 1: Create BookmarkButton**

```tsx
// src/components/shared/BookmarkButton.tsx
"use client"

import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBookmarks } from "@/hooks/useBookmarks"
import { cn } from "@/lib/utils"

interface BookmarkButtonProps {
  type: "ayah" | "hadith"
  id: string
  reference: string
  text: string
  className?: string
}

export function BookmarkButton({ type, id, reference, text, className }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const active = isBookmarked(id)

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggleBookmark({ id, type, reference, text })}
      className={cn(active && "text-secondary", className)}
      aria-label={active ? "Remove bookmark" : `Bookmark ${reference}`}
    >
      <Bookmark className={cn("size-4", active && "fill-secondary")} />
    </Button>
  )
}
```

- [ ] **Step 2: Create LanguageSwitcher**

```tsx
// src/components/shared/LanguageSwitcher.tsx
"use client"

import { useEffect, useState } from "react"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ur", label: "Urdu" },
]

const STORAGE_KEY = "noor-language"

export function LanguageSwitcher() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [language, setLanguageState] = useState("en")

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setLanguageState(stored)
  }, [])

  function setLanguage(value: string) {
    setLanguageState(value)
    localStorage.setItem(STORAGE_KEY, value)
    window.dispatchEvent(new CustomEvent("noor:languageChange", { detail: { language: value } }))
    setOpen(false)
  }

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled aria-label="Language" className="size-8"><div className="size-4" /></Button>
  }

  const current = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0]

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label={`Language: ${current.label}`} className="size-8">
        <Languages className="size-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-32 rounded-lg border border-border bg-popover p-1 shadow-lg">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted aria-[current=true]:text-secondary"
                aria-current={language === lang.value}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build with no errors

---

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
              <span className="text-xs text-muted-foreground">{r.surahName} · {r.ayah.ayahNumber}</span>
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

## Task 3: LoadingSkeleton Shared Component

**Files:**
- Create: `src/components/shared/LoadingSkeleton.tsx`

**Interfaces:**
- Exports `LoadingSkeleton` with prop `variant: "quran-index" | "quran-reader" | "hadith-collection" | "hadith-book" | "videos" | "search" | "default"`
- Uses existing `Skeleton`, `SkeletonCard`, `SkeletonList` from `@/components/shared/Skeleton`

- [ ] **Step 1: Create LoadingSkeleton component**

```tsx
// src/components/shared/LoadingSkeleton.tsx
import { Skeleton, SkeletonCard, SkeletonList } from "@/components/shared/Skeleton"

const variants = {
  "quran-index": () => (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-8 h-8 w-48" />
      <Skeleton className="mb-4 h-10 w-72" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  ),
  "quran-reader": () => (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-6 h-10 w-64" />
      <Skeleton className="mb-8 h-5 w-96" />
      <div className="space-y-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  ),
  "hadith-collection": () => (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-8 h-8 w-48" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-xl border border-border p-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  ),
  "hadith-book": () => (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-6 h-8 w-48" />
      <Skeleton className="mb-8 h-5 w-72" />
      <SkeletonList count={5} />
    </div>
  ),
  "videos": () => (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-8 h-8 w-48" />
      <Skeleton className="mb-6 h-10 w-96" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  ),
  "search": () => (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-6 h-10 w-full" />
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  ),
  "default": () => (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-8 h-8 w-48" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  ),
}

export type LoadingVariant = keyof typeof variants

interface LoadingSkeletonProps {
  variant?: LoadingVariant
}

export function LoadingSkeleton({ variant = "default" }: LoadingSkeletonProps) {
  const Component = variants[variant] ?? variants.default
  return <Component />
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 4: Card + Badge UI Components

**Files:**
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`

**Interfaces:**
- `Card`: structural sub-components (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter) — no variants
- `Badge`: `cva` with variants { default, secondary, outline, gold, emerald, destructive } and sizes { default, sm, lg }

- [ ] **Step 1: Create Card component**

```tsx
// src/components/ui/card.tsx
import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card" className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-xs", className)} {...props} />
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 data-slot="card-title" className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-footer" className={cn("flex items-center p-6 pt-0", className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
```

- [ ] **Step 2: Create Badge component**

```tsx
// src/components/ui/badge.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        gold: "border-transparent bg-gold/15 text-gold",
        emerald: "border-transparent bg-emerald/15 text-emerald",
        destructive: "border-transparent bg-destructive/10 text-destructive",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.25 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 5: Input + Tabs UI Components

**Files:**
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/tabs.tsx`

**Interfaces:**
- `Input`: `cva` with variants { default, ghost }, sizes { default, sm, lg }
- `Tabs`: wraps `@base-ui/react/tabs` with `cva` variants { default, pills }

- [ ] **Step 1: Create Input component**

```tsx
// src/components/ui/input.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input",
        ghost: "border-transparent bg-muted/50 hover:bg-muted focus-visible:bg-background",
      },
      size: {
        default: "h-10 py-2",
        sm: "h-8 py-1 text-xs",
        lg: "h-12 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {}

function Input({ className, variant, size, type, ...props }: InputProps) {
  return <input type={type} data-slot="input" className={cn(inputVariants({ variant, size }), className)} {...props} />
}

export { Input, inputVariants }
```

- [ ] **Step 2: Create Tabs component**

```tsx
// src/components/ui/tabs.tsx
"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tabsListVariants = cva(
  "inline-flex items-center gap-1",
  {
    variants: {
      variant: {
        default: "border-b border-border",
        pills: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "text-muted-foreground data-[selected]:text-foreground data-[selected]:border-b-2 data-[selected]:border-secondary -mb-px",
        pills: "rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted data-[selected]:bg-secondary data-[selected]:text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>, VariantProps<typeof tabsListVariants> {
  variant?: "default" | "pills"
}

function TabsList({ className, variant = "default", ...props }: TabsListProps) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn(tabsListVariants({ variant }), className)} {...props} />
}

function TabsTrigger({ className, variant = "default", ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Tab> & VariantProps<typeof tabsTriggerVariants>) {
  return <TabsPrimitive.Tab data-slot="tabs-trigger" className={cn(tabsTriggerVariants({ variant }), className)} {...props} />
}

function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Panel>) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />
}

export { TabsList, TabsTrigger, TabsContent }
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 6: Dialog + Sheet UI Components

**Files:**
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/sheet.tsx`

**Interfaces:**
- `Dialog`: wraps `@base-ui/react/dialog` with sizes { sm, md, lg }
- `Sheet`: wraps `@base-ui/react/dialog` with sides { left, right, top, bottom } and sizes { sm, md, lg, full }

- [ ] **Step 1: Create Dialog component**

```tsx
// src/components/ui/dialog.tsx
"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const dialogContentVariants = cva(
  "fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-full -translate-x-1/2 -translate-y-1/2 flex-col gap-4 border border-border bg-background p-6 shadow-xl duration-200 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 data-[closed]:duration-150",
  {
    variants: {
      size: {
        sm: "max-w-sm rounded-xl",
        md: "max-w-lg rounded-xl",
        lg: "max-w-2xl rounded-xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

function DialogTrigger(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Backdrop>) {
  return <DialogPrimitive.Backdrop data-slot="dialog-overlay" className={cn("fixed inset-0 z-40 bg-black/50 data-[open]:animate-in data-[open]:fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0", className)} {...props} />
}

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>, VariantProps<typeof dialogContentVariants> {}

function DialogContent({ className, size, children, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Popup data-slot="dialog-content" className={cn(dialogContentVariants({ size }), className)} {...props}>
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2", className)} {...props} />
}

function DialogClose(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

export { DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose }
```

- [ ] **Step 2: Create Sheet component**

```tsx
// src/components/ui/sheet.tsx
"use client"

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sheetContentVariants = cva(
  "fixed z-50 flex flex-col gap-4 border border-border bg-background p-6 shadow-xl transition-all duration-200 data-[open]:animate-in data-[closed]:animate-out",
  {
    variants: {
      side: {
        left: "inset-y-0 left-0 h-full data-[open]:slide-in-from-left data-[closed]:slide-out-to-left",
        right: "inset-y-0 right-0 h-full data-[open]:slide-in-from-right data-[closed]:slide-out-to-right",
        top: "inset-x-0 top-0 w-full data-[open]:slide-in-from-top data-[closed]:slide-out-to-top",
        bottom: "inset-x-0 bottom-0 w-full data-[open]:slide-in-from-bottom data-[closed]:slide-out-to-bottom",
      },
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        full: "",
      },
    },
    defaultVariants: {
      side: "right",
      size: "sm",
    },
  }
)

function SheetTrigger(props: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal(props: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Backdrop>) {
  return <SheetPrimitive.Backdrop data-slot="sheet-overlay" className={cn("fixed inset-0 z-40 bg-black/50", className)} {...props} />
}

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Popup>, VariantProps<typeof sheetContentVariants> {}

function SheetContent({ className, side = "right", size = "sm", children, ...props }: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Popup data-slot="sheet-content" className={cn(sheetContentVariants({ side, size }), className)} {...props}>
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-footer" className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2", className)} {...props} />
}

function SheetClose(props: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

export { SheetTrigger, SheetPortal, SheetOverlay, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose }
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 7: Select + Tooltip UI Components

**Files:**
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/tooltip.tsx`

**Interfaces:**
- `Select`: wraps `@base-ui/react/select` with variants { default, ghost }
- `Tooltip`: wraps `@base-ui/react/tooltip` with variants { dark, light }, sides { top, bottom, left, right }

- [ ] **Step 1: Create Select component**

```tsx
// src/components/ui/select.tsx
"use client"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const selectTriggerVariants = cva(
  "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
  {
    variants: {
      variant: {
        default: "border-input",
        ghost: "border-transparent bg-muted/50 hover:bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function SelectTrigger({ className, variant, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & VariantProps<typeof selectTriggerVariants>) {
  return (
    <SelectPrimitive.Trigger data-slot="select-trigger" className={cn(selectTriggerVariants({ variant }), className)} {...props}>
      {children}
      <SelectPrimitive.Icon className="flex items-center">
        <ChevronDown className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" className={cn("text-foreground", className)} {...props} />
}

function SelectPopup({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Popup>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Backdrop className="fixed inset-0 z-40" />
      <SelectPrimitive.Popup data-slot="select-popup" className={cn("z-50 max-h-64 min-w-[8rem] overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95", className)} {...props} />
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn("relative flex w-full cursor-default items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[selected]:font-medium", className)} {...props}>
      <span className="absolute left-2 flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectGroup({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn("", className)} {...props} />
}

function SelectLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.GroupLabel>) {
  return <SelectPrimitive.GroupLabel data-slot="select-label" className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />
}

export { SelectTrigger, SelectValue, SelectPopup, SelectItem, SelectGroup, SelectLabel }
```

- [ ] **Step 2: Create Tooltip component**

```tsx
// src/components/ui/tooltip.tsx
"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tooltipContentVariants = cva(
  "z-50 overflow-hidden rounded-lg border px-3 py-1.5 text-xs font-medium shadow-md data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95",
  {
    variants: {
      variant: {
        dark: "bg-foreground text-background border-foreground",
        light: "bg-background text-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "dark",
    },
  }
)

function TooltipProvider(props: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" {...props} />
}

function TooltipRoot(props: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip-root" {...props} />
}

function TooltipTrigger(props: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Popup>, VariantProps<typeof tooltipContentVariants> {}

function TooltipContent({ className, variant = "dark", ...props }: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner>
        <TooltipPrimitive.Popup data-slot="tooltip-content" className={cn(tooltipContentVariants({ variant }), className)} {...props} />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent }
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 8: ThemeToggle to MobileNav

**Files:**
- Modify: `src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Add ThemeToggle to MobileNav**

```tsx
// In src/components/layout/MobileNav.tsx — add ThemeToggle import and render it in the nav bar
import { ThemeToggle } from "@/components/shared/ThemeToggle"

// Add ThemeToggle between the last nav link and the end of the flex container
// Change the container to include ThemeToggle
// In the return, modify:
// Change `<div className="flex items-center justify-around h-16 px-2">`
// to `<div className="flex items-center justify-around h-16 px-2">` and add ThemeToggle as an item
```

Add ThemeToggle as an additional item in the mobile nav:

Search for:
```tsx
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
```

Replace with:
```tsx
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
        <ThemeToggle />
      </div>
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 9: Loading States — Enhance All loading.tsx Files

**Files (modify):**
- `src/app/quran/loading.tsx`
- `src/app/quran/[surahNumber]/loading.tsx`
- `src/app/hadith/loading.tsx`
- `src/app/hadith/[collection]/loading.tsx`
- `src/app/hadith/[collection]/[bookId]/loading.tsx`
- `src/app/videos/loading.tsx`
- `src/app/videos/[scholar]/loading.tsx`
- `src/app/search/loading.tsx`
- `src/app/about/loading.tsx`

- [ ] **Step 1: Update each loading.tsx to use LoadingSkeleton**

For example, `src/app/quran/loading.tsx` becomes:
```tsx
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

export default function QuranLoading() {
  return <LoadingSkeleton variant="quran-index" />
}
```

Map each route to its variant:
- `/quran` → `"quran-index"`
- `/quran/[surahNumber]` → `"quran-reader"`
- `/hadith` → `"hadith-collection"`
- `/hadith/[collection]` → `"hadith-collection"` (book list page)
- `/hadith/[collection]/[bookId]` → `"hadith-book"`
- `/videos` → `"videos"`
- `/videos/[scholar]` → `"videos"`
- `/search` → `"search"`
- `/about` → `"default"`

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 10: Error Boundaries Integration

**Files (modify):**
- `src/app/layout.tsx` — add ErrorBoundary around main content
- `src/app/quran/error.tsx`
- `src/app/quran/[surahNumber]/error.tsx`
- `src/app/hadith/error.tsx`
- `src/app/hadith/[collection]/error.tsx`
- `src/app/hadith/[collection]/[bookId]/error.tsx`
- `src/app/videos/error.tsx`
- `src/app/videos/[scholar]/error.tsx`
- `src/app/search/error.tsx`
- `src/app/about/error.tsx`

- [ ] **Step 1: Update root layout to wrap main content in ErrorBoundary**

In `src/app/layout.tsx`, add import and wrap the main tag:
```tsx
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"

// Wrap the main content:
<ErrorBoundary>
  <main id="main-content" className="flex-1 pt-16 pb-16 md:pb-0" role="main">
    {children}
  </main>
</ErrorBoundary>
```

- [ ] **Step 2: Update each error.tsx to use ErrorBoundary style**

Each route-level `error.tsx` is a client component (`"use client"`) that receives `{ error, reset }`. Replace the body with a proper UI that matches the ErrorBoundary default fallback pattern.

Example for `src/app/quran/error.tsx`:
```tsx
"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function QuranError({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <Button variant="default" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
```

Apply this pattern to all error.tsx files.

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 11: Performance + Responsive + A11y + Deploy

**Files:**
- Modify: `src/app/layout.tsx` — add `next/dynamic` for heavy components
- Modify: `src/components/videos/YouTubeEmbed.tsx` — add ARIA improvements
- Create: `wrangler.toml`
- Create: `.github/workflows/deploy.yml`
- Create: `.env.example`

- [ ] **Step 1: Performance — Lazy load Three.js**

In `src/app/page.tsx`, ensure `HeroScene3D` is dynamically imported:
```tsx
import dynamic from "next/dynamic"

const HeroScene3D = dynamic(() => import("@/components/three/HeroScene3D"), {
  ssr: false,
  loading: () => <div className="geometric-bg absolute inset-0" />,
})
```

- [ ] **Step 2: Performance — Add image dimensions and priority**

Search for all `<Image>` or `<img>` tags and add `width`, `height`, and `priority` for LCP images.

- [ ] **Step 3: Accessibility — Add ARIA labels where missing**

Review interactive elements and ensure:
- All icon-only buttons have `aria-label`
- SearchBar has proper ARIA roles (already done in Task 2)
- YouTube embed modal has `aria-label` and focus trap
- All form inputs have associated labels

- [ ] **Step 4: Create wrangler.toml**

```toml
# wrangler.toml
name = "noor-quran"
pages_build_output_dir = ".next"
pages_build_command = "npm run build"
compatibility_date = "2026-07-15"
compatibility_flags = ["nodejs_compat"]
```

- [ ] **Step 5: Create deploy workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy .next --project-name=noor-quran
```

- [ ] **Step 6: Create .env.example**

```
# YouTube Data API v3
# Get your API key: https://console.cloud.google.com/apis/credentials
# Enable the YouTube Data API v3 in your Google Cloud project
YOUTUBE_API_KEY=
```

- [ ] **Step 7: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 12: 3D Utils + KaabaModel + StarParticles

**Files:**
- Create: `src/lib/three/utils.ts`
- Create: `src/components/three/KaabaModel.tsx`
- Create: `src/components/three/StarParticles.tsx`

- [ ] **Step 1: Create 3D utilities**

```tsx
// src/lib/three/utils.ts
export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    return !!(canvas.getContext("webgl") || canvas.getContext("webgl2"))
  } catch {
    return false
  }
}

export function randomPosition(range = 5): [number, number, number] {
  return [
    (Math.random() - 0.5) * range * 2,
    (Math.random() - 0.5) * range * 2,
    (Math.random() - 0.5) * range * 2,
  ]
}

export const GOLD_PALETTE = {
  main: "#c8a45c",
  light: "#e8d4a0",
  dark: "#8b6d30",
  emissive: "#4a3a1a",
}

export const TEAL_PALETTE = {
  main: "#2dd4bf",
  light: "#5eead4",
  dark: "#0f766e",
  emissive: "#134e4a",
}
```

- [ ] **Step 2: Create KaabaModel**

```tsx
// src/components/three/KaabaModel.tsx
"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float, Sparkles } from "@react-three/drei"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE, TEAL_PALETTE } from "@/lib/three/utils"

function Kaaba() {
  const meshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15
    }
    if (edgesRef.current) {
      edgesRef.current.rotation.y += delta * 0.15
    }
  })

  return (
    <Float speed={0.5} rotationIntensity={0.05} floatIntensity={0.1}>
      <mesh ref={meshRef}>
        <boxGeometry args={[2, 2.5, 2]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.8}
          roughness={0.3}
          emissive={GOLD_PALETTE.emissive}
          emissiveIntensity={0.1}
        />
      </mesh>
      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(2, 2.5, 2)]} />
        <lineBasicMaterial color={GOLD_PALETTE.main} linewidth={2} />
      </lineSegments>
      <Sparkles count={20} scale={3} size={0.5} speed={0.3} color={GOLD_PALETTE.light} />
    </Float>
  )
}

export function KaabaModel({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.8} color={GOLD_PALETTE.light} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} color={TEAL_PALETTE.main} />
        <Kaaba />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 3: Create StarParticles**

```tsx
// src/components/three/StarParticles.tsx
"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { hasWebGL, randomPosition, GOLD_PALETTE, TEAL_PALETTE } from "@/lib/three/utils"

function Particles({ count = 100 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null)

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const gold = new THREE.Color(GOLD_PALETTE.main)
    const teal = new THREE.Color(TEAL_PALETTE.main)

    for (let i = 0; i < count; i++) {
      const [x, y, z] = randomPosition(8)
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      const c = gold.clone().lerp(teal, Math.random())
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return [pos, col]
  }, [count])

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.001
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} vertexColors transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

export function StarParticles({ className, count = 100 }: { className?: string; count?: number }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 10], fov: 60 }}>
        <Particles count={count} />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 13: MosqueScene + GeometricPattern3D + LanternGlow

**Files:**
- Create: `src/components/three/MosqueScene.tsx`
- Create: `src/components/three/GeometricPattern3D.tsx`
- Create: `src/components/three/LanternGlow.tsx`

- [ ] **Step 1: Create MosqueScene**

```tsx
// src/components/three/MosqueScene.tsx
"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float } from "@react-three/drei"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE, TEAL_PALETTE } from "@/lib/three/utils"

function Mosque() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      {/* Dome */}
      <Float speed={0.8} rotationIntensity={0.05} floatIntensity={0.15}>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={GOLD_PALETTE.main} metalness={0.6} roughness={0.2} />
        </mesh>
      </Float>
      {/* Base */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[3.5, 0.5, 3.5]} />
        <meshStandardMaterial color="#2a2a4a" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Minarets */}
      {[-2.2, 2.2].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.2, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 2.4, 8]} />
            <meshStandardMaterial color="#3a3a5a" metalness={0.3} roughness={0.5} />
          </mesh>
          <mesh position={[x, 2.5, 0]}>
            <coneGeometry args={[0.25, 0.3, 8]} />
            <meshStandardMaterial color={GOLD_PALETTE.main} metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Archways */}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x, -0.2, 1.76]}>
          <torusGeometry args={[0.4, 0.08, 8, 16, Math.PI]} />
          <meshStandardMaterial color={GOLD_PALETTE.light} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
      {/* Ambient glow */}
      <pointLight position={[0, 2, 0]} intensity={0.5} color={GOLD_PALETTE.light} />
    </group>
  )
}

export function MosqueScene({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1, 5], fov: 50 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[3, 4, 3]} intensity={0.6} color={TEAL_PALETTE.light} />
        <Mosque />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 2: Create GeometricPattern3D**

```tsx
// src/components/three/GeometricPattern3D.tsx
"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE, TEAL_PALETTE } from "@/lib/three/utils"

function StarShape({ radius = 2 }: { radius?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const shape = useMemo(() => {
    const s = new THREE.Shape()
    const points = 8
    const outerR = radius
    const innerR = radius * 0.4
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 === 0 ? outerR : innerR
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    }
    s.closePath()
    return s
  }, [radius])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.2
    }
  })

  return (
    <mesh ref={meshRef}>
      <extrudeGeometry args={[shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 }]} />
      <meshStandardMaterial
        color={GOLD_PALETTE.main}
        metalness={0.7}
        roughness={0.2}
        emissive={GOLD_PALETTE.emissive}
        emissiveIntensity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function RotatingRing() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.x += delta * 0.3
  })
  return (
    <mesh ref={ref} rotation={[Math.PI / 3, 0, 0]}>
      <ringGeometry args={[2.5, 2.8, 64]} />
      <meshBasicMaterial color={TEAL_PALETTE.main} transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function GeometricPattern3D({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[2, 3, 4]} intensity={0.5} />
        <StarShape />
        <RotatingRing />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 3: Create LanternGlow**

```tsx
// src/components/three/LanternGlow.tsx
"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE } from "@/lib/three/utils"

function Lantern() {
  const groupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
    }
    if (lightRef.current) {
      lightRef.current.intensity = 0.6 + Math.sin(clock.elapsedTime * 1.5) * 0.2
    }
  })

  return (
    <group ref={groupRef}>
      {/* Lantern body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 1.5, 12]} />
        <meshPhysicalMaterial
          color="#2a2a4a"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.7}
          emissive={GOLD_PALETTE.emissive}
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 0.9, 0]}>
        <coneGeometry args={[0.5, 0.3, 12]} />
        <meshStandardMaterial color={GOLD_PALETTE.main} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Bottom base */}
      <mesh position={[0, -0.85, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.15, 12]} />
        <meshStandardMaterial color={GOLD_PALETTE.main} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Ring handle */}
      <mesh position={[0, 1.15, 0]}>
        <torusGeometry args={[0.25, 0.04, 8, 16]} />
        <meshStandardMaterial color={GOLD_PALETTE.light} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Glow light */}
      <pointLight ref={lightRef} position={[0, 0, 0]} intensity={0.8} color={GOLD_PALETTE.light} distance={4} />
      {/* Decorative dots */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.55, Math.sin(i) * 0.3 - 0.2, Math.sin(angle) * 0.55]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color={GOLD_PALETTE.light} emissive={GOLD_PALETTE.light} emissiveIntensity={1} />
          </mesh>
        )
      })}
    </group>
  )
}

export function LanternGlow({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 3.5], fov: 40 }}>
        <ambientLight intensity={0.1} />
        <Lantern />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 14: Scene3D + Loading3D + Integrate 3D Components

**Files:**
- Create: `src/components/three/Scene3D.tsx`
- Create: `src/components/three/Loading3D.tsx`

- [ ] **Step 1: Create Scene3D (orchestrator component)**

```tsx
// src/components/three/Scene3D.tsx
"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { hasWebGL } from "@/lib/three/utils"

interface Scene3DProps {
  children: React.ReactNode
  className?: string
  cameraPosition?: [number, number, number]
  fov?: number
  dpr?: [number, number]
}

export function Scene3D({
  children,
  className,
  cameraPosition = [0, 0, 5],
  fov = 50,
  dpr = [1, 1.5],
}: Scene3DProps) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={dpr} camera={{ position: cameraPosition, fov }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.5} />
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 2: Create Loading3D**

```tsx
// src/components/three/Loading3D.tsx
"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE } from "@/lib/three/utils"

function IcosahedronSpinner() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 1.5
      meshRef.current.rotation.y += delta * 2
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.05
      meshRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.2, 0]} />
      <meshStandardMaterial
        color={GOLD_PALETTE.main}
        metalness={0.6}
        roughness={0.2}
        wireframe
        emissive={GOLD_PALETTE.emissive}
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

export function Loading3D({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4], fov: 40 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[3, 3, 3]} intensity={0.8} color={GOLD_PALETTE.light} />
        <IcosahedronSpinner />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

## Task 15: Final Build Verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Clean build, zero errors, zero warnings

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors

- [ ] **Step 3: Verify all routes work**

Check these pages load successfully:
- `/` — homepage with 3D, stats, quick links
- `/quran` — surah index
- `/quran/1` — Fatiha reader
- `/hadith` — collection index
- `/hadith/bukhari` — Bukhari books
- `/hadith/bukhari/1` — Bukhari book 1
- `/videos` — video grid
- `/videos/mishary-rashid-al-afasy` — scholar page
- `/search` — search page
- `/about` — about page

- [ ] **Step 4: Run existing E2E tests if available**

```bash
npx playwright test
```

Expected: All existing tests pass
