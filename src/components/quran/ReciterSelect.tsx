"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Mic, Search } from "lucide-react"
import type { Reciter } from "@/types"
import {
  RECITERS,
  RECITER_GROUP_LABELS,
  getReciterGroup,
  supportsAyahSync,
  type ReciterGroup,
} from "@/config/audio"
import { useReciter } from "@/hooks/useReciter"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const GROUP_ORDER: ReciterGroup[] = ["ayah", "surah", "other"]

// The catalog runs to ~190 editions, so the list needs a filter box; the Base UI
// Select in components/ui has no search, hence this small popover.
export function ReciterSelect({ className }: { className?: string }) {
  const reciterId = useReciter((s) => s.reciterId)
  const setReciter = useReciter((s) => s.setReciter)
  const active = RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0]

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (r: Reciter) =>
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.nameArabic.includes(query.trim()) ||
      r.language.toLowerCase() === q
    return GROUP_ORDER.map((group) => ({
      group,
      items: RECITERS.filter((r) => getReciterGroup(r) === group && matches(r)),
    })).filter((g) => g.items.length > 0)
  }, [query])

  const select = (id: string) => {
    setReciter(id)
    setOpen(false)
    setQuery("")
  }

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-gold-dim/10 hover:text-gold-light"
      >
        <Mic className="size-3 shrink-0 text-gold-dim" />
        <span className="truncate">{active?.name ?? "Select reciter"}</span>
        <ChevronDown className="size-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[80vw] rounded-xl border border-gold-dim/20 bg-popover p-2 shadow-lg">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              size="sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reciters…"
              aria-label="Search reciters"
              className="pl-8"
            />
          </div>

          <div role="listbox" aria-label="Reciters" className="max-h-72 overflow-y-auto">
            {groups.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No reciter matches “{query}”.
              </p>
            )}
            {groups.map(({ group, items }) => (
              <div key={group} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-gold-light/70">
                  {RECITER_GROUP_LABELS[group]}
                </p>
                {items.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={r.id === active?.id}
                    onClick={() => select(r.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      r.id === active?.id
                        ? "bg-gold-dim/15 text-gold-light"
                        : "text-foreground hover:bg-gold-dim/10 hover:text-gold-light",
                    )}
                  >
                    <span className="flex size-3.5 shrink-0 items-center justify-center">
                      {r.id === active?.id && <Check className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                    {r.language !== "ar" && (
                      <span className="shrink-0 rounded bg-space-mid/40 px-1 text-[9px] uppercase text-muted-foreground">
                        {r.language}
                      </span>
                    )}
                    {supportsAyahSync(r) && (
                      <span className="shrink-0 rounded bg-gold-dim/15 px-1 text-[9px] uppercase tracking-wide text-gold-light/90">
                        Ayah sync
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
