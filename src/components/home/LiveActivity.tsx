"use client"

import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Flame, Headphones, Radio } from "lucide-react"
import {
  useRealtime,
  type ActivityEvent,
} from "@/components/realtime/RealtimeProvider"
import { LivePulse } from "@/components/shared/LivePulse"
import { cn } from "@/lib/utils"

/** How many surahs the trending list shows. */
const TRENDING_LIMIT = 5

const SECTION_LABELS: Record<string, string> = {
  quran: "the Quran",
  hadith: "the Hadith collections",
  videos: "the video library",
  "knowledge-base": "the Knowledge Base",
  search: "search",
  saved: "their saved verses",
  about: "the about page",
  home: "the home page",
}

/** One anonymous sentence per arrival. No reader is ever identified. */
function lineFor(event: ActivityEvent): string {
  if (event.listening && event.name) {
    return event.reciter
      ? `Someone is listening to Surah ${event.name} · ${event.reciter}`
      : `Someone is listening to Surah ${event.name}`
  }
  if (event.name) return `Someone opened Surah ${event.name}`
  const label = SECTION_LABELS[event.section]
  return label ? `Someone is exploring ${label}` : "A reader just joined"
}

/**
 * "Trending right now" and the live activity feed, side by side.
 *
 * Both are derived from the single presence snapshot in `RealtimeProvider` —
 * trending is that map sorted by reader count, the feed is its arrivals — so
 * this panel opens no connection and issues no request of its own.
 *
 * Renders nothing until there is something real to show, which is also what
 * keeps it invisible on a build without Supabase env vars.
 */
export function LiveActivity({ className }: { className?: string }) {
  const { bySurah, activity, online } = useRealtime()
  const reduceMotion = useReducedMotion()

  const trending = [...bySurah.values()]
    .sort((a, b) => b.readers - a.readers || a.surah - b.surah)
    .slice(0, TRENDING_LIMIT)

  if (trending.length === 0 && activity.length === 0) return null

  const busiest = trending[0]?.readers ?? 1

  return (
    <div
      className={cn(
        "rounded-xl border border-gold-dim/20 bg-card/40 p-6",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-6">
        <LivePulse />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-light">
          Happening now
        </h2>
        {online !== null && (
          <span className="text-xs text-muted-foreground/60">
            {online === 1 ? "1 reader online" : `${online} readers online`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            <Flame className="size-3.5 text-gold-dim" aria-hidden />
            Trending surahs
          </h3>
          {trending.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">
              Nobody is reading a surah at this moment.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {trending.map((row) => (
                <li key={row.surah}>
                  <Link
                    href={`/quran/${row.surah}`}
                    className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gold-dim/5"
                  >
                    <span className="w-6 shrink-0 text-xs tabular-nums text-gold-dim/60">
                      {row.surah}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground group-hover:text-gold-light transition-colors">
                      {row.name}
                    </span>
                    {row.listeners > 0 && (
                      <Headphones
                        className="size-3 shrink-0 text-emerald/70"
                        aria-label={`${row.listeners} listening`}
                      />
                    )}
                    {/* Bar is relative to the busiest surah, so the top row is
                        always full width and the rest read as a share of it. */}
                    <span
                      className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-border"
                      aria-hidden
                    >
                      <span
                        className="block h-full rounded-full bg-emerald/70"
                        style={{ width: `${(row.readers / busiest) * 100}%` }}
                      />
                    </span>
                    <span className="w-5 shrink-0 text-right text-xs tabular-nums text-emerald/80">
                      {row.readers}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            <Radio className="size-3.5 text-gold-dim" aria-hidden />
            Live activity
          </h3>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">
              Waiting for the next reader to arrive.
            </p>
          ) : (
            // aria-live so the feed is announced rather than silently mutating
            // under a screen reader; polite because none of it is urgent.
            <ul className="flex flex-col gap-1.5" aria-live="polite">
              <AnimatePresence initial={false}>
                {activity.map((event) => (
                  <motion.li
                    key={event.id}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-gold-dim/50" />
                    <span className="min-w-0">{lineFor(event)}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
