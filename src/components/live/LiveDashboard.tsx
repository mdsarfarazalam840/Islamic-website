"use client"

import Link from "next/link"
import { BookOpen, Eye, Headphones, Radio, Users } from "lucide-react"
import { LivePulse } from "@/components/shared/LivePulse"
import { useLiveStats } from "@/hooks/useLiveStats"
import type { LivePageRow } from "@/lib/live/types"
import { cn } from "@/lib/utils"

const numbers = new Intl.NumberFormat("en-US")

function readersLabel(count: number): string {
  return count === 1 ? "reader" : "readers"
}

/** Surah pages carry a name; every other path is shown as-is. */
function pageTitle(row: LivePageRow): string {
  if (row.name) return row.name
  if (row.path === "/") return "Home"
  return row.path
}

function LiveBar({ value, max }: { value: number; max: number }) {
  return (
    <span
      className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-border sm:w-24"
      aria-hidden
    >
      <span
        className="block h-full rounded-full bg-emerald/70"
        style={{ width: `${Math.max(4, (value / Math.max(1, max)) * 100)}%` }}
      />
    </span>
  )
}

function SetupNotice() {
  return (
    <div className="rounded-xl border border-gold-dim/20 bg-card/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-light">
        Live counter is not connected
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The presence Worker is not configured for this build. Deploy{" "}
        <code className="rounded bg-space-deep px-1.5 py-0.5 text-xs">
          workers/live
        </code>{" "}
        and set{" "}
        <code className="rounded bg-space-deep px-1.5 py-0.5 text-xs">
          NEXT_PUBLIC_LIVE_URL
        </code>{" "}
        before building the site.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-space-deep p-4 text-xs text-muted-foreground">
        <code>{`npm run live:deploy
# then, in the Pages project environment:
NEXT_PUBLIC_LIVE_URL=https://noor-live.<account>.workers.dev`}</code>
      </pre>
    </div>
  )
}

/**
 * Public overview of the live layer: total readers, the pages they are on, and
 * the surahs being read. Every number comes from the Durable Object snapshot;
 * nothing here identifies a reader.
 */
export function LiveDashboard({ className }: { className?: string }) {
  const { stats, error, configured } = useLiveStats()

  if (!configured) return <SetupNotice />

  const total = stats?.total ?? 0
  const pages = stats?.pages ?? []
  const surahs = stats?.surahs ?? []
  const busiestPage = pages[0]?.readers ?? 1
  const busiestSurah = surahs[0]?.readers ?? 1

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <section className="rounded-xl border border-gold-dim/20 bg-card/40 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gold-light">
              <LivePulse />
              Live now
            </p>
            <p className="mt-3 flex items-baseline gap-3">
              <span className="text-5xl font-display font-bold tabular-nums text-emerald sm:text-6xl">
                {stats ? numbers.format(total) : "—"}
              </span>
              <span className="text-sm text-muted-foreground">
                {stats ? readersLabel(total) : "connecting"}
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {stats
                ? `${pages.length} ${pages.length === 1 ? "page" : "pages"} active across Noor`
                : "Waiting for the first snapshot…"}
            </p>
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Eye className="size-3.5" aria-hidden />
                Visits
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {stats ? numbers.format(stats.visits) : "—"}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <BookOpen className="size-3.5" aria-hidden />
                Surahs
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {stats ? numbers.format(surahs.length) : "—"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs text-gold-dim" role="status">
            {error}. Retrying automatically.
          </p>
        )}
        {stats && (
          <p className="mt-4 text-xs text-muted-foreground/60">
            Updated{" "}
            {new Date(stats.ts).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            · refreshes every 4s
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="rounded-xl border border-gold-dim/20 bg-card/40 p-6 lg:col-span-3">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Users className="size-3.5 text-gold-dim" aria-hidden />
            Where readers are
          </h2>

          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">
              {stats
                ? "Nobody is on the site right now."
                : "Waiting for the first reader…"}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {pages.map((row) => (
                <li key={row.path}>
                  <Link
                    href={row.path}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gold-dim/5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground transition-colors group-hover:text-gold-light">
                        {pageTitle(row)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground/60">
                        {row.path}
                      </span>
                    </span>
                    <LiveBar value={row.readers} max={busiestPage} />
                    <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-emerald/90">
                      {row.readers}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gold-dim/20 bg-card/40 p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Radio className="size-3.5 text-gold-dim" aria-hidden />
            Surahs being read
          </h2>

          {surahs.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">
              {stats ? "No surah open right now." : "Waiting for readers…"}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {surahs.map((row) => (
                <li key={row.surah}>
                  <Link
                    href={`/quran/${row.surah}`}
                    className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gold-dim/5"
                  >
                    <span className="w-6 shrink-0 text-xs tabular-nums text-gold-dim/60">
                      {row.surah}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground transition-colors group-hover:text-gold-light">
                      {row.name}
                    </span>
                    {row.listeners > 0 && (
                      <Headphones
                        className="size-3 shrink-0 text-emerald/70"
                        aria-label={`${row.listeners} listening`}
                      />
                    )}
                    <LiveBar value={row.readers} max={busiestSurah} />
                    <span className="w-5 shrink-0 text-right text-xs tabular-nums text-emerald/80">
                      {row.readers}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-xs text-muted-foreground/60">
        Counts come from one Cloudflare Durable Object. A reader is one open tab;
        no reader is identified.
      </p>
    </div>
  )
}
