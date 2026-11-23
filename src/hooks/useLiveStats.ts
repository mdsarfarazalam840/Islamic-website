"use client"

import { useEffect, useState } from "react"
import {
  fetchLiveStats,
  isLiveConfigured,
  type LiveStats,
} from "@/lib/live/types"

/** Dashboard refresh cadence. The badge itself stays on the WebSocket. */
const POLL_MS = 4000

export interface LiveStatsState {
  stats: LiveStats | null
  error: string | null
  configured: boolean
}

/**
 * Polls the presence Worker's /stats endpoint.
 *
 * The /live dashboard is a monitoring view, not something every reader keeps
 * open, so a short poll is cheaper than a second WebSocket per tab. Polling
 * pauses while the tab is hidden and refreshes the moment it becomes visible.
 */
export function useLiveStats(): LiveStatsState {
  const [stats, setStats] = useState<LiveStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const configured = isLiveConfigured()

  useEffect(() => {
    if (!configured) return

    let cancelled = false
    const controller = new AbortController()

    const load = async () => {
      if (document.hidden) return
      try {
        const next = await fetchLiveStats(controller.signal)
        if (cancelled) return
        setStats(next)
        setError(null)
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        setError(err instanceof Error ? err.message : "Live stats unavailable")
      }
    }

    void load()
    const interval = setInterval(() => void load(), POLL_MS)

    const onVisibility = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      controller.abort()
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [configured])

  return { stats, error, configured }
}
