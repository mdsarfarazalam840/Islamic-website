"use client"

import { Eye } from "lucide-react"
import { useLiveVisitors } from "@/hooks/useLiveVisitors"
import { LivePulse } from "@/components/shared/LivePulse"
import { cn } from "@/lib/utils"

const numbers = new Intl.NumberFormat("en-US")

/**
 * "N reading now · M visits" badge. Renders nothing until at least one of the
 * numbers is real, so a site built without Supabase env vars — or a native shell
 * with no connection — shows no placeholder and no zeros.
 */
export function LiveVisitors({ className }: { className?: string }) {
  const { online, visits } = useLiveVisitors()
  if (online === null && visits === null) return null

  return (
    <p
      className={cn(
        "flex items-center gap-3 text-xs text-muted-foreground/60",
        className,
      )}
    >
      {online !== null && (
        <span className="flex items-center gap-1.5">
          <LivePulse />
          <span className="tabular-nums text-emerald/90">{numbers.format(online)}</span>
          reading now
        </span>
      )}
      {visits !== null && (
        <span className="flex items-center gap-1.5">
          <Eye className="size-3" aria-hidden />
          <span className="tabular-nums">{numbers.format(visits)}</span>
          visits
        </span>
      )}
    </p>
  )
}
