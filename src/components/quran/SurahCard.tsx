"use client"

import Link from "next/link"
import { useRealtime } from "@/components/realtime/RealtimeProvider"
import { LivePulse } from "@/components/shared/LivePulse"
import type { Surah } from "@/types"

interface SurahCardProps {
  surah: Surah
}

export function SurahCard({ surah }: SurahCardProps) {
  const isMeccan = surah.revelationType === "meccan"
  // Off the shared presence snapshot — no request of its own, so putting this on
  // all 114 cards costs nothing.
  const { bySurah } = useRealtime()
  const readers = bySurah.get(surah.number)?.readers ?? 0

  return (
    <Link
      href={`/quran/${surah.number}`}
      className="group flex items-center justify-between rounded-xl border border-border/20 bg-card/40 p-5 transition-all duration-300 hover:border-gold-dim/30 hover:gold-shadow"
    >
      <div className="flex items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold-dim/10 text-sm font-semibold text-gold-light border border-gold-dim/20 group-hover:border-gold-dim/40 transition-colors">
          {surah.number}
        </span>
        <div>
          <p className="font-medium text-foreground group-hover:text-gold-light transition-colors duration-300">
            {surah.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className={isMeccan ? "text-gold-dim/70" : "text-emerald/70"}>
              {isMeccan ? "Meccan" : "Medinan"}
            </span>
            {" · "}{surah.ayahCount} verses
            {surah.juz.length > 0 && ` · Juz ${surah.juz.join(", ")}`}
            {readers > 0 && (
              <span
                className="ml-1.5 inline-flex items-center gap-1 align-middle text-emerald/80"
                title={`${readers} reading now`}
              >
                <LivePulse />
                <span className="tabular-nums">{readers}</span>
              </span>
            )}
          </p>
        </div>
      </div>
      <span className="text-xl font-arabic text-gold-dim/60 group-hover:text-gold-light/80 transition-colors duration-300">{surah.nameArabic}</span>
    </Link>
  )
}
