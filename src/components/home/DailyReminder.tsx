"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Star, Quote } from "lucide-react"
import type { DailyItem, DailyPools } from "@/lib/home/dailyPool"

interface Props {
  pools: DailyPools
  // The day index computed at build time. Used for the very first (server)
  // render so the markup hydrates cleanly; the client then recomputes it from
  // the visitor's own local date in an effect below.
  serverDay: number
}

// Whole days since the Unix epoch, in the viewer's LOCAL timezone. Using local
// midnight (not UTC) means the card flips over at the visitor's midnight.
function localDayNumber(d: Date): number {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.floor(local.getTime() / 86_400_000)
}

// Pick the item for a given day: alternate Quran (even days) / Hadith (odd
// days), and walk through each pool one entry per day so it cycles smoothly.
function pickForDay(pools: DailyPools, day: number): DailyItem | null {
  const preferHadith = day % 2 === 1
  const primary = preferHadith ? pools.hadith : pools.quran
  const fallback = preferHadith ? pools.quran : pools.hadith
  const chosen = primary.length > 0 ? primary : fallback
  if (chosen.length === 0) return null
  // Divide by 2 because each kind only advances every other day.
  const index = Math.floor(day / 2) % chosen.length
  return chosen[index]
}

export function DailyReminder({ pools, serverDay }: Props) {
  const [day, setDay] = useState(serverDay)

  // After hydration, recompute from the visitor's real local date. If they
  // leave the tab open across midnight, refresh when it regains focus.
  useEffect(() => {
    const update = () => setDay(localDayNumber(new Date()))
    update()
    window.addEventListener("focus", update)
    document.addEventListener("visibilitychange", update)
    return () => {
      window.removeEventListener("focus", update)
      document.removeEventListener("visibilitychange", update)
    }
  }, [])

  const item = pickForDay(pools, day)
  if (!item) return null

  const isQuran = item.kind === "quran"
  const Icon = isQuran ? Star : Quote
  const label = isQuran ? "Ayah of the Day" : "Hadith of the Day"

  return (
    <Link
      href={item.href}
      className="group block rounded-xl border border-gold-dim/20 bg-gold-dim/5 p-6 transition-all hover:border-gold-dim/40 hover:bg-gold-dim/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="size-4 text-gold-light" />
        <span className="text-xs font-medium text-gold-light uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="font-arabic text-xl text-foreground leading-[2.2] text-right mb-4" dir="rtl">
        {item.arabic}
      </p>
      {item.narrator && (
        <p className="text-xs text-gold-dim/70 mb-1.5 font-medium">
          {item.narrator} narrated:
        </p>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
        {item.translation}
      </p>
      <p className="text-xs text-gold-dim/60 mt-3">{item.reference}</p>
    </Link>
  )
}
