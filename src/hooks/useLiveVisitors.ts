"use client"

import { useRealtime } from "@/components/realtime/RealtimeProvider"

export interface LiveStats {
  /** Tabs currently connected, or null until the first presence sync lands. */
  online: number | null
  /** Lifetime visit count, or null until it has been read. */
  visits: number | null
}

/**
 * The footer badge's two numbers.
 *
 * The channel, the presence tracking, and the visit bump all live in
 * `RealtimeProvider` — one connection is shared by every live feature on the
 * site, so this is just a read of that context.
 */
export function useLiveVisitors(): LiveStats {
  const { online, visits } = useRealtime()
  return { online, visits }
}
