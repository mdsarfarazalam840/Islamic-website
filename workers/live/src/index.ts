/**
 * Live reader presence for Noor.
 *
 * One Durable Object ("global") owns every open WebSocket. Clients never store
 * or send an identity: a connection is a tab, and what it reports about itself
 * is the page path plus optional reading detail (surah, audio state).
 *
 * The hibernation WebSocket API is used throughout, so an idle object costs no
 * duration while its clients stay connected. Per-connection state lives in the
 * socket attachment, which survives hibernation.
 */

import { DurableObject } from "cloudflare:workers"

export interface Env {
  PRESENCE: DurableObjectNamespace<PresenceHub>
  ALLOWED_ORIGINS?: string
}

/** A socket with no ping for this long is considered gone. */
const STALE_MS = 75_000
/** How often the object wakes to prune dead sockets while readers exist. */
const PRUNE_MS = 30_000
/**
 * Broadcasts are coalesced: a burst of joins/navigations in the same second
 * must not fan out one snapshot per event.
 */
const BROADCAST_MIN_GAP_MS = 800
/** Arrivals kept for the activity feed. */
const FEED_LIMIT = 6
/** Hard ceiling per instance; beyond this the Worker answers 503. */
const MAX_CONNECTIONS = 5_000
/** Largest accepted client frame. Track messages are tiny. */
const MAX_MESSAGE_CHARS = 512
/** One visit bump per address per minute, in memory only. */
const VISIT_THROTTLE_MS = 60_000
const VISITS_KEY = "visits"

type Mode = "reader" | "stats"

interface Attachment {
  /** Random per connection, used as the activity-feed key. */
  id: string
  mode: Mode
  /** Normalized page path this tab is on. */
  path: string
  /** Coarse site section ("quran", "hadith", …). */
  section: string
  surah: number | null
  name: string | null
  playing: boolean
  reciter: string | null
  /** Last ping/track, epoch ms. */
  ts: number
}

export interface SurahRow {
  surah: number
  name: string
  readers: number
  listeners: number
}

export interface ActivityEvent {
  id: string
  surah: number | null
  name: string | null
  reciter: string | null
  listening: boolean
  section: string
}

export interface PageRow {
  path: string
  readers: number
  /** Surah name when this path is a surah page, otherwise null. */
  name: string | null
}

export interface StatsSnapshot {
  total: number
  pages: PageRow[]
  surahs: SurahRow[]
  visits: number
  ts: number
}

/** Clamp a client path to something safe to count and render. */
export function cleanPath(input: unknown): string {
  if (typeof input !== "string" || input.length === 0) return "/"
  let path = input.trim()
  if (!path.startsWith("/")) path = `/${path}`
  path = path.split("?")[0].split("#")[0].replace(/\/{2,}/g, "/")
  if (!/^\/[\w\-./%]*$/.test(path)) return "/"
  return path.slice(0, 160)
}

function cleanSection(input: unknown): string {
  return typeof input === "string" && /^[a-z0-9-]{1,40}$/.test(input)
    ? input
    : "home"
}

function cleanText(input: unknown, max: number): string | null {
  if (typeof input !== "string") return null
  // Strip control characters; the name is rendered in the activity feed.
  const text = input.replace(/[\u0000-\u001f\u007f]/g, "").trim()
  return text ? text.slice(0, max) : null
}

function isSurah(input: unknown): input is number {
  return typeof input === "number" && Number.isInteger(input) && input >= 1 && input <= 114
}

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

function isAllowedOrigin(env: Env, origin: string | null): boolean {
  const allowed = allowedOrigins(env)
  if (allowed.includes("*")) return true
  if (!origin) return false
  return allowed.includes(origin)
}

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = allowedOrigins(env)
  const allowAny = allowed.includes("*")
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    Vary: "Origin",
  }
  if (allowAny) headers["Access-Control-Allow-Origin"] = "*"
  else if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin
  return headers
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get("Origin")
    const cors = corsHeaders(env, origin)

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors })
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true }, { headers: cors })
    }

    if (!isAllowedOrigin(env, origin)) {
      return Response.json({ error: "origin not allowed" }, { status: 403, headers: cors })
    }

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426, headers: cors })
      }
      const stub = env.PRESENCE.getByName("global")
      return stub.fetch(request)
    }

    if (url.pathname === "/stats") {
      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers: cors })
      }
      const stub = env.PRESENCE.getByName("global")
      const snapshot = await stub.snapshot()
      return Response.json(snapshot, { headers: cors })
    }

    if (url.pathname === "/visit") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: cors })
      }
      const stub = env.PRESENCE.getByName("global")
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown"
      const visits = await stub.bumpVisits(ip)
      return Response.json({ visits }, { headers: cors })
    }

    return new Response("Not found", { status: 404, headers: cors })
  },
} satisfies ExportedHandler<Env>

export class PresenceHub extends DurableObject<Env> {
  private visits = 0
  /** Ephemeral arrivals; an empty feed after hibernation is acceptable. */
  private activity: ActivityEvent[] = []
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null
  private lastBroadcastAt = 0
  private ipThrottle = new Map<string, number>()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      this.visits = (await ctx.storage.get<number>(VISITS_KEY)) ?? 0
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const mode: Mode = url.searchParams.get("m") === "stats" ? "stats" : "reader"
    const sockets = this.ctx.getWebSockets()

    if (sockets.length >= MAX_CONNECTIONS) {
      return new Response("Too many connections", { status: 503 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.ctx.acceptWebSocket(server)

    const attachment: Attachment = {
      id: crypto.randomUUID(),
      mode,
      path: cleanPath(url.searchParams.get("p")),
      section: "home",
      surah: null,
      name: null,
      playing: false,
      reciter: null,
      ts: Date.now(),
    }
    server.serializeAttachment(attachment)

    if (mode === "reader") this.rememberArrival(attachment)

    await this.ensurePruneAlarm()
    this.scheduleBroadcast()

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string" || message.length > MAX_MESSAGE_CHARS) return

    let data: Record<string, unknown>
    try {
      data = JSON.parse(message) as Record<string, unknown>
    } catch {
      return
    }

    const attachment = ws.deserializeAttachment() as Attachment | null
    if (!attachment) return

    // A ping only proves the tab is alive. It must not fan out a snapshot.
    if (data.t === "ping") {
      attachment.ts = Date.now()
      ws.serializeAttachment(attachment)
      return
    }

    if (data.t !== "track") return

    attachment.ts = Date.now()
    if (typeof data.u === "string") attachment.path = cleanPath(data.u)
    if (typeof data.z === "string") attachment.section = cleanSection(data.z)

    if ("s" in data) {
      if (isSurah(data.s)) {
        attachment.surah = data.s
        attachment.name = cleanText(data.n, 80) ?? `Surah ${data.s}`
      } else {
        attachment.surah = null
        attachment.name = null
      }
    }

    if ("p" in data) attachment.playing = data.p === true
    attachment.reciter = attachment.playing ? cleanText(data.r, 60) : null

    ws.serializeAttachment(attachment)
    this.scheduleBroadcast()
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      if (code >= 1000 && code < 5000 && ![1004, 1005, 1006, 1015].includes(code)) {
        ws.close(code, reason)
      } else {
        ws.close()
      }
    } catch {
      // Already closed.
    }
    this.scheduleBroadcast()
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close(1011, "socket error")
    } catch {
      // Already closed.
    }
    this.scheduleBroadcast()
  }

  /**
   * Wakes on a timer while any socket exists: closes sockets that stopped
   * pinging and reschedules itself. No sockets means no alarm, so the object is
   * free to hibernate.
   */
  async alarm(): Promise<void> {
    const now = Date.now()
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as Attachment | null
      const stale = !attachment || now - attachment.ts > STALE_MS
      if (!stale) continue
      try {
        ws.close(4000, "stale")
      } catch {
        // Already closed.
      }
    }

    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + PRUNE_MS)
    }
    this.scheduleBroadcast()
  }

  /** Aggregate for the /stats endpoint and the /live dashboard. */
  snapshot(): StatsSnapshot {
    const { total, pages, surahs } = this.collect()
    return {
      total,
      pages: [...pages.entries()]
        .map(([path, row]) => ({ path, readers: row.readers, name: row.name }))
        .sort((a, b) => b.readers - a.readers || a.path.localeCompare(b.path)),
      surahs: [...surahs.values()].sort(
        (a, b) => b.readers - a.readers || a.surah - b.surah,
      ),
      visits: this.visits,
      ts: Date.now(),
    }
  }

  /** Lifetime visit counter. One address can bump at most once a minute. */
  bumpVisits(ip: string): number {
    const now = Date.now()
    const last = this.ipThrottle.get(ip) ?? 0
    if (now - last < VISIT_THROTTLE_MS) return this.visits

    if (this.ipThrottle.size > 10_000) this.ipThrottle.clear()
    this.ipThrottle.set(ip, now)

    this.visits += 1
    this.ctx.waitUntil(this.ctx.storage.put(VISITS_KEY, this.visits))
    this.scheduleBroadcast()
    return this.visits
  }

  private collect(): {
    total: number
    pages: Map<string, { readers: number; name: string | null }>
    surahs: Map<number, SurahRow>
  } {
    const pages = new Map<string, { readers: number; name: string | null }>()
    const surahs = new Map<number, SurahRow>()
    let total = 0

    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as Attachment | null
      if (!attachment || attachment.mode !== "reader") continue

      total += 1
      const page = pages.get(attachment.path) ?? { readers: 0, name: null }
      page.readers += 1
      if (!page.name && attachment.name) page.name = attachment.name
      pages.set(attachment.path, page)

      if (attachment.surah !== null) {
        const row = surahs.get(attachment.surah) ?? {
          surah: attachment.surah,
          name: attachment.name ?? `Surah ${attachment.surah}`,
          readers: 0,
          listeners: 0,
        }
        row.readers += 1
        if (attachment.playing) row.listeners += 1
        surahs.set(attachment.surah, row)
      }
    }

    return { total, pages, surahs }
  }

  private rememberArrival(attachment: Attachment): void {
    this.activity = [
      {
        id: attachment.id,
        surah: attachment.surah,
        name: attachment.name,
        reciter: attachment.reciter,
        listening: attachment.playing,
        section: attachment.section,
      },
      ...this.activity,
    ].slice(0, FEED_LIMIT)
  }

  private scheduleBroadcast(): void {
    if (this.broadcastTimer !== null) return

    const wait = Math.max(0, BROADCAST_MIN_GAP_MS - (Date.now() - this.lastBroadcastAt))
    if (wait === 0) {
      this.broadcast()
      return
    }

    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = null
      this.broadcast()
    }, wait)
  }

  private broadcast(): void {
    this.lastBroadcastAt = Date.now()

    const sockets = this.ctx.getWebSockets()
    if (sockets.length === 0) return

    const { total, pages, surahs } = this.collect()
    const base = {
      type: "snapshot" as const,
      total,
      surahs: [...surahs.values()].sort(
        (a, b) => b.readers - a.readers || a.surah - b.surah,
      ),
      activity: this.activity,
      visits: this.visits,
      ts: this.lastBroadcastAt,
    }

    // The dashboard wants every page; readers only need their own count, so the
    // per-page list never ships to normal tabs.
    const statsPayload = JSON.stringify({
      ...base,
      pages: [...pages.entries()]
        .map(([path, row]) => ({ path, readers: row.readers, name: row.name }))
        .sort((a, b) => b.readers - a.readers || a.path.localeCompare(b.path)),
    })

    for (const ws of sockets) {
      const attachment = ws.deserializeAttachment() as Attachment | null
      if (!attachment) continue

      try {
        if (attachment.mode === "stats") {
          ws.send(statsPayload)
          continue
        }
        ws.send(
          JSON.stringify({
            ...base,
            mine: {
              path: attachment.path,
              readers: pages.get(attachment.path)?.readers ?? 1,
            },
          }),
        )
      } catch {
        // Socket closed between collection and send; the close handler will
        // broadcast the corrected snapshot.
      }
    }
  }

  private async ensurePruneAlarm(): Promise<void> {
    const current = await this.ctx.storage.getAlarm()
    if (current === null) {
      await this.ctx.storage.setAlarm(Date.now() + PRUNE_MS)
    }
  }
}
