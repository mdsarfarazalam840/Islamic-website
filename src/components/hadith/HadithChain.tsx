"use client"

import { Users, ArrowDown } from "lucide-react"
import type { Hadith } from "@/types"

interface HadithChainProps {
  hadith: Hadith
}

export function HadithChain({ hadith }: HadithChainProps) {
  if (!hadith.narrator) return null

  const narrators = hadith.narrator
    .split(/\s+(?:from|that)\s+/i)
    .map((n) => n.trim())
    .filter(Boolean)

  return (
    <div className="rounded-lg border border-border/20 bg-surface/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="size-3.5 text-secondary" />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Narration Chain (Sanad)
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {narrators.length > 1 ? (
          narrators.map((narrator, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="rounded bg-secondary/5 px-1.5 py-0.5">{narrator}</span>
              {i < narrators.length - 1 && <ArrowDown className="size-3 rotate-[-90deg] text-secondary/40" />}
            </span>
          ))
        ) : (
          <span className="rounded bg-secondary/5 px-1.5 py-0.5">{hadith.narrator}</span>
        )}
      </div>
    </div>
  )
}
