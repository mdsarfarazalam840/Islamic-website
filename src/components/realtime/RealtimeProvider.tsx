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

/**
 * Live presence now runs on a Cloudflare Durable Object (see `workers/live`)
 * instead of Supabase Realtime. One hibernatable WebSocket per tab carries
 * everything: the online total, per-page and per-surah counts, the arrival
 * feed, and the lifetime visit counter.
 *
 * Nothing here identifies a reader. A connection is a tab; the only state it
 * reports is the page path and optional reading detail.
 */

/**
 * Base URL of the presence Worker, e.g. https://noor-live.example.workers.dev.
 * Unset means no live layer: every number stays null and each live component
 * renders nothing instead of a row of zeros.
 */
const LIVE_URL = process.env.NEXT_PUBLIC_LIVE_URL?.trim().replace(/\/+$/, "") || ""

/**
 * NEXT_PUBLIC_LIVE_DETAIL=off collapses track messages to path + section. The
 * online total, per-page counts, and visits keep working; per-surah counts and
 * the activity feed go quiet.
 */
const DETAIL = process.env.NEXT_PUBLIC_LIVE_DETAIL?.trim().toLowerCase() !== "off"

const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH?.trim().replace(/\/$/, "") || ""

/** Keepalive cadence. The Worker prunes a socket after 75s of silence. */
const HEARTBEAT_MS = 25_000
/**
 * Floor on the gap between track writes from one tab. Every write fans out a
 * snapshot to every connected tab, so a reader clicking through surahs would
 * otherwise multiply into a burst; patches coalesce into one write instead.
 */
const TRACK_INTERVAL_MS = 3000
const RECONNECT_MIN_MS = 1000
const RECONNECT_MAX_MS = 30_000
/** localStorage marker holding the UTC day a visit was last counted on. */
const VISIT_FLAG = "noor-visit-day"
const FEED_LIMIT = 6

/**
 * What one tab publishes about itself. Keys are single letters because this
 * object is delivered to every connected tab on each write.
 */
export type PresencePayload = {
  /** Surah being read, null everywhere else on the site. */
  s: number | null
  /** Surah name, carried so consumers need no catalog import. */
  n: string | null
  /** True while recitation audio is actually playing. */
  p: boolean
  /** Reciter behind that audio, for the activity line. */
  r: string | null
  /** Coarse section of the site: "quran", "hadith", "videos", "home", … */
  z: string
}

/** Wire shape of the presence payload plus the page the tab is on. */
type TrackPayload = PresencePayload & {
  /** Normalized page path, with the deploy basePath already stripped. */
  u: string
}

export interface SurahActivity {
  surah: number
  name: string
  /** Tabs with this surah open. */
  readers: number
  /** Tabs playing its recitation right now. */
  listeners: number
}

export interface ActivityEvent {
  /** Unique per arrival, so it works as a React key. */
  id: string
  surah: number | null
  name: string | null
  reciter: string | null
  listening: boolean
  section: string
}

/** Snapshot broadcast by the Durable Object. */
interface SnapshotMessage {
  type: "snapshot"
  total: number
  visits: number
  surahs: SurahActivity[]
  activity: ActivityEvent[]
  ts: number
  mine?: { path: string; readers: number }
}

export interface RealtimeValue {
  /** Tabs currently connected, or null until the first snapshot lands. */
  online: number | null
  /** Lifetime visit count, or null until it has been read. */
  visits: number | null
  /** Live per-surah counts. Every surah number derives from this. */
  bySurah: ReadonlyMap<number, SurahActivity>
  /** Newest-first arrivals, capped at FEED_LIMIT. */
  activity: readonly ActivityEvent[]
  /** Tabs on this exact page, or null until the first snapshot lands. */
  page: number | null
  /**
   * Publish something about this tab. Patches merge into one payload and are
   * throttled, so callers can fire freely on every render-driven change.
   */
  report: (patch: Partial<TrackPayload>) => void
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
  page: null,
  report: () => {},
})

export function useRealtime(): RealtimeValue {
  return useContext(RealtimeContext)
}

/** First path segment, with the deploy basePath stripped if the router kept it. */
function relativePath(pathname: string): string {
  const rel =
    BASE_PATH && pathname.startsWith(BASE_PATH)
      ? pathname.slice(BASE_PATH.length)
      : pathname
  return rel.startsWith("/") ? rel : `/${rel}`
}

function sectionOf(pathname: string): string {
  return relativePath(pathname).split("/").filter(Boolean)[0] ?? "home"
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

/** WebSocket URL for a page, or null when the Worker is not configured. */
function socketUrl(path: string): string | null {
  if (!LIVE_URL) return null
  try {
    const url = new URL(LIVE_URL)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`
    url.search = ""
    url.searchParams.set("p", path)
    return url.toString()
  } catch {
    return null
  }
}

/** Worker base URL for the two HTTP endpoints (stats, visit). */
function apiUrl(path: string): string {
  return `${LIVE_URL}${path}`
}

/**
 * Owns the site's single live connection.
 *
 * The provider reconnects with capped exponential backoff, reconnects on tab
 * visibility, and sends a keepalive ping well inside the Worker's 75s stale
 * window. Every live component reads `useRealtime()`; none opens its own
 * socket or request.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const [online, setOnline] = useState<number | null>(null)
  const [visits, setVisits] = useState<number | null>(null)
  const [page, setPage] = useState<number | null>(null)
  const [bySurah, setBySurah] =
    useState<ReadonlyMap<number, SurahActivity>>(EMPTY_SURAHS)
  const [activity, setActivity] = useState<readonly ActivityEvent[]>([])

  const socketRef = useRef<WebSocket | null>(null)
  const pending = useRef<TrackPayload>({
    u: relativePath(pathname),
    z: sectionOf(pathname),
    s: null,
    n: null,
    p: false,
    r: null,
  })
  const lastSent = useRef(0)
  const trackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    lastSent.current = Date.now()
    const payload = DETAIL
      ? pending.current
      : { u: pending.current.u, z: pending.current.z }
    socket.send(JSON.stringify({ t: "track", ...payload }))
  }, [])

  const report = useCallback(
    (patch: Partial<TrackPayload>) => {
      pending.current = { ...pending.current, ...patch }
      // Before the socket opens there is nothing to write to; the first flush
      // picks the merged payload up.
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return
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
    if (!LIVE_URL) return

    let cancelled = false
    let socket: WebSocket | null = null
    let heartbeat: ReturnType<typeof setInterval> | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    const stopHeartbeat = () => {
      if (heartbeat !== null) {
        clearInterval(heartbeat)
        heartbeat = null
      }
    }

    const connect = () => {
      if (cancelled) return
      const url = socketUrl(pending.current.u)
      if (!url) return

      socket = new WebSocket(url)
      socketRef.current = socket

      socket.onopen = () => {
        attempt = 0
        flush()
        stopHeartbeat()
        heartbeat = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) socket.send('{"t":"ping"}')
        }, HEARTBEAT_MS)
      }

      socket.onmessage = (event) => {
        if (typeof event.data !== "string") return
        let data: SnapshotMessage
        try {
          data = JSON.parse(event.data) as SnapshotMessage
        } catch {
          return
        }
        if (data?.type !== "snapshot") return

        setOnline(typeof data.total === "number" ? data.total : null)
        setVisits(typeof data.visits === "number" ? data.visits : null)
        setPage(typeof data.mine?.readers === "number" ? data.mine.readers : null)
        setBySurah(
          new Map(
            (Array.isArray(data.surahs) ? data.surahs : []).map((row) => [
              row.surah,
              row,
            ]),
          ),
        )
        setActivity(
          Array.isArray(data.activity) ? data.activity.slice(0, FEED_LIMIT) : [],
        )
      }

      socket.onclose = () => {
        stopHeartbeat()
        if (socketRef.current === socket) socketRef.current = null
        // Stale numbers would claim readers who already left.
        setOnline(null)
        setPage(null)
        if (cancelled) return
        const delay = Math.min(
          RECONNECT_MAX_MS,
          RECONNECT_MIN_MS * 2 ** attempt,
        )
        attempt += 1
        retryTimer = setTimeout(connect, delay)
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    const onVisibility = () => {
      if (document.hidden) return
      const state = socket?.readyState
      if (state === undefined || state === WebSocket.CLOSED) {
        if (retryTimer !== null) clearTimeout(retryTimer)
        attempt = 0
        connect()
        return
      }
      // Already connected: republish immediately so a long-hidden tab is not
      // shown on the wrong page after it wakes.
      if (state === WebSocket.OPEN) flush()
    }

    connect()
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      stopHeartbeat()
      document.removeEventListener("visibilitychange", onVisibility)
      if (retryTimer !== null) clearTimeout(retryTimer)
      if (trackTimer.current) clearTimeout(trackTimer.current)
      trackTimer.current = null
      const current = socket
      socketRef.current = null
      current?.close(1000, "unmount")
    }
  }, [flush])

  // Lifetime visits: one bump per tab per UTC day, read back for everyone else.
  useEffect(() => {
    if (!LIVE_URL) return
    let cancelled = false

    void (async () => {
      try {
        if (countedToday()) {
          const response = await fetch(apiUrl("/stats"), { cache: "no-store" })
          if (!response.ok) return
          const data = (await response.json()) as { visits?: number }
          if (!cancelled && typeof data.visits === "number") setVisits(data.visits)
          return
        }

        const response = await fetch(apiUrl("/visit"), { method: "POST" })
        if (!response.ok) return
        const data = (await response.json()) as { visits?: number }
        if (typeof data.visits !== "number") return
        markCountedToday()
        if (!cancelled) setVisits(data.visits)
      } catch {
        /* offline — the badge simply keeps its last value */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Route changes are the main driver of track writes, which is why report()
  // throttles. The path rides along so the tab's page count moves with it.
  useEffect(() => {
    report({ u: relativePath(pathname), z: sectionOf(pathname) })
  }, [pathname, report])

  const value = useMemo<RealtimeValue>(
    () => ({ online, visits, bySurah, activity, page, report }),
    [online, visits, bySurah, activity, page, report],
  )

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  )
}
