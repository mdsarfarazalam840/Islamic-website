"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"
import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js"
import { getSupabase } from "@/lib/supabase/client"

/** Realtime channel every open tab joins. Presence on it is the "online now" set. */
const PRESENCE_CHANNEL = "noor-live"
/** Row holding the lifetime counter in public.site_stats. */
const STATS_ROW = "total"
/** localStorage marker holding the UTC day a visit was last counted on. */
const VISIT_FLAG = "noor-visit-day"

/**
 * Floor on the gap between presence writes from one tab. Every track() fans out
 * to every other connected tab, so a reader clicking through surahs would
 * otherwise multiply into a burst of messages; patches coalesce into one write
 * instead.
 */
const TRACK_INTERVAL_MS = 3000
/**
 * Presence replays the whole existing member list as join events on subscribe
 * and after every reconnect. Joins seen within this window of SUBSCRIBED are
 * that backlog, not real arrivals, so they are counted but never shown in the
 * feed.
 */
const JOIN_GRACE_MS = 2000
/** How many activity lines to keep. */
const FEED_LIMIT = 6

/**
 * NEXT_PUBLIC_LIVE_DETAIL=off collapses the presence payload to a bare
 * heartbeat: the footer's online + visits numbers keep working, and the
 * per-surah, trending, and activity features go dark. It exists because
 * presence fan-out grows with both traffic and concurrency — this is the lever
 * to pull if the project's Realtime message quota comes into view.
 */
const DETAIL = process.env.NEXT_PUBLIC_LIVE_DETAIL?.trim().toLowerCase() !== "off"

const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH?.trim().replace(/\/$/, "") || ""

/**
 * What one tab publishes about itself. Keys are single letters because this
 * object is delivered to every other connected tab on each write; nothing here
 * identifies a reader.
 *
 * Declared as a type alias rather than an interface on purpose: the realtime
 * SDK's generics require an implicit index signature, which interfaces do not
 * get.
 */
export type PresencePayload = {
  /** Surah being read, null everywhere else on the site. */
  s: number | null
  /**
   * Surah name. Carried in the payload so that consumers — including the footer,
   * which every page loads — can label a surah without importing the 114-entry
   * catalog from `@/lib/quran/surahs`.
   */
  n: string | null
  /** True while recitation audio is actually playing. */
  p: boolean
  /** Reciter behind that audio, for the activity line. */
  r: string | null
  /** Coarse section of the site: "quran", "hadith", "videos", "home", … */
  z: string
}

type PresenceEntry = PresencePayload & { presence_ref: string }

export interface SurahActivity {
  surah: number
  name: string
  /** Tabs with this surah open. */
  readers: number
  /** Tabs playing its recitation right now. */
  listeners: number
}

export interface ActivityEvent {
  /** Presence ref of the join — unique per arrival, so it works as a React key. */
  id: string
  surah: number | null
  name: string | null
  reciter: string | null
  listening: boolean
  section: string
}

export interface RealtimeValue {
  /** Tabs currently connected, or null until the first presence sync lands. */
  online: number | null
  /** Lifetime visit count, or null until it has been read. */
  visits: number | null
  /** Live per-surah counts, keyed by surah number. Every live number derives from this. */
  bySurah: ReadonlyMap<number, SurahActivity>
  /** Newest-first arrivals, capped at FEED_LIMIT. */
  activity: readonly ActivityEvent[]
  /**
   * Publish something about this tab. Patches merge into one payload and are
   * throttled, so callers can fire freely on every render-driven change.
   */
  report: (patch: Partial<PresencePayload>) => void
}

const EMPTY_SURAHS: ReadonlyMap<number, SurahActivity> = new Map()

/**
 * Deliberately a null-ish default rather than a throw: every live component is
 * built to render nothing without data, so a subtree mounted outside the
 * provider degrades to no badge instead of a crashed page.
 */
const RealtimeContext = createContext<RealtimeValue>({
  online: null,
  visits: null,
  bySurah: EMPTY_SURAHS,
  activity: [],
  report: () => {},
})

export function useRealtime(): RealtimeValue {
  return useContext(RealtimeContext)
}

/** First path segment, with the deploy basePath stripped if the router kept it. */
function sectionOf(pathname: string): string {
  const rel =
    BASE_PATH && pathname.startsWith(BASE_PATH)
      ? pathname.slice(BASE_PATH.length)
      : pathname
  return rel.split("/").filter(Boolean)[0] ?? "home"
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10)
}

function countedToday(): boolean {
  try {
    return localStorage.getItem(VISIT_FLAG) === utcDay()
  } catch {
    // Private mode / storage disabled: treat as counted so the tab reads the
    // total without inflating it on every navigation.
    return true
  }
}

function markCountedToday(): void {
  try {
    localStorage.setItem(VISIT_FLAG, utcDay())
  } catch {
    /* storage disabled — the count just stays best-effort */
  }
}

function toEvent(entry: PresenceEntry): ActivityEvent {
  return {
    id: entry.presence_ref,
    surah: typeof entry.s === "number" ? entry.s : null,
    name: typeof entry.n === "string" ? entry.n : null,
    reciter: typeof entry.r === "string" ? entry.r : null,
    listening: entry.p === true,
    section: typeof entry.z === "string" ? entry.z : "home",
  }
}

/**
 * Fold a presence snapshot into per-surah counts. Only the newest entry per
 * presence key is read: a tab that just re-tracked briefly has both its old and
 * new meta in the state, and counting both would show one reader as two.
 */
function deriveSurahs(
  state: RealtimePresenceState<PresencePayload>,
): ReadonlyMap<number, SurahActivity> {
  const map = new Map<number, SurahActivity>()
  for (const entries of Object.values(state)) {
    const entry = entries[entries.length - 1]
    if (!entry || typeof entry.s !== "number") continue
    const row = map.get(entry.s) ?? {
      surah: entry.s,
      name: typeof entry.n === "string" ? entry.n : `Surah ${entry.s}`,
      readers: 0,
      listeners: 0,
    }
    row.readers += 1
    if (entry.p === true) row.listeners += 1
    map.set(entry.s, row)
  }
  return map
}

/**
 * Owns the site's single Realtime connection.
 *
 * One channel carries everything: presence gives the online count, the
 * per-surah reader and listener counts, and the activity feed, while a
 * postgres_changes binding on the same channel keeps the lifetime visit total
 * ticking. Nothing here polls, and no feature adds a second connection —
 * consumers read `useRealtime()` and derive what they need from the one
 * snapshot.
 *
 * All numbers stay null when Supabase is not configured, which is what makes
 * every live component render nothing rather than a row of zeros.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState<number | null>(null)
  const [visits, setVisits] = useState<number | null>(null)
  const [bySurah, setBySurah] =
    useState<ReadonlyMap<number, SurahActivity>>(EMPTY_SURAHS)
  const [activity, setActivity] = useState<readonly ActivityEvent[]>([])

  const channelRef = useRef<RealtimeChannel | null>(null)
  const pending = useRef<PresencePayload>({
    s: null,
    n: null,
    p: false,
    r: null,
    z: "home",
  })
  const lastSent = useRef(0)
  const trackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** False from each SUBSCRIBED until the replayed presence backlog has passed. */
  const feedReady = useRef(false)
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    const channel = channelRef.current
    if (!channel) return
    lastSent.current = Date.now()
    void channel.track(DETAIL ? pending.current : {})
  }, [])

  const report = useCallback(
    (patch: Partial<PresencePayload>) => {
      pending.current = { ...pending.current, ...patch }
      // Before SUBSCRIBED there is nothing to write to; the first flush picks the
      // merged payload up. With detail off the payload is never sent at all.
      if (!channelRef.current || !DETAIL) return
      const wait = TRACK_INTERVAL_MS - (Date.now() - lastSent.current)
      if (wait <= 0) {
        flush()
        return
      }
      // A write is already queued and will read `pending` when it fires.
      if (trackTimer.current) return
      trackTimer.current = setTimeout(() => {
        trackTimer.current = null
        flush()
      }, wait)
    },
    [flush],
  )

  useEffect(() => {
    let cancelled = false
    let teardown: (() => void) | undefined

    void (async () => {
      const supabase = await getSupabase()
      if (!supabase || cancelled) return

      // Presence needs a key that is unique per tab: reusing one key across tabs
      // would collapse them into a single "online" entry.
      const channel = supabase.channel(PRESENCE_CHANNEL, {
        config: { presence: { key: crypto.randomUUID() } },
      })

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<PresencePayload>()
          setOnline(Object.keys(state).length)
          setBySurah(deriveSurahs(state))
        })
        .on<PresencePayload>("presence", { event: "join" }, ({ newPresences }) => {
          if (!feedReady.current || !DETAIL) return
          setActivity((prev) =>
            [...newPresences.map(toEvent), ...prev].slice(0, FEED_LIMIT),
          )
        })
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "site_stats" },
          (payload) => {
            const next = (payload.new as { id?: string; visits?: number }) ?? {}
            if (next.id === STATS_ROW && typeof next.visits === "number") {
              setVisits(next.visits)
            }
          },
        )

      // Assigned before subscribing so the status callback's flush() finds it.
      channelRef.current = channel

      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return
        feedReady.current = false
        if (graceTimer.current) clearTimeout(graceTimer.current)
        graceTimer.current = setTimeout(() => {
          graceTimer.current = null
          feedReady.current = true
        }, JOIN_GRACE_MS)
        flush()
      })

      teardown = () => {
        channelRef.current = null
        void supabase.removeChannel(channel)
      }

      if (countedToday()) {
        const { data } = await supabase
          .from("site_stats")
          .select("visits")
          .eq("id", STATS_ROW)
          .maybeSingle()
        if (!cancelled && typeof data?.visits === "number") setVisits(data.visits)
        return
      }

      const { data, error } = await supabase.rpc("bump_visits")
      if (error || typeof data !== "number") return
      markCountedToday()
      if (!cancelled) setVisits(data)
    })()

    return () => {
      cancelled = true
      if (trackTimer.current) clearTimeout(trackTimer.current)
      if (graceTimer.current) clearTimeout(graceTimer.current)
      trackTimer.current = null
      graceTimer.current = null
      feedReady.current = false
      teardown?.()
    }
  }, [flush])

  // Which part of the site this tab is in. Route changes are the main driver of
  // presence writes, which is why report() throttles.
  const pathname = usePathname()
  useEffect(() => {
    report({ z: sectionOf(pathname) })
  }, [pathname, report])

  const value = useMemo<RealtimeValue>(
    () => ({ online, visits, bySurah, activity, report }),
    [online, visits, bySurah, activity, report],
  )

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  )
}
