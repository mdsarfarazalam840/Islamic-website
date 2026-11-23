# noor-live

Cloudflare Worker + Durable Object that powers Noor's live reader counter.

One Durable Object (`PresenceHub`, instance name `global`) owns every open
WebSocket and broadcasts an anonymous snapshot when the set of readers or their
pages changes. The site's footer badge, per-surah counts, activity feed, and the
`/live` dashboard all read from it.

There is no Cloudflare product called "Live Readers"; this is built on Durable
Objects with the hibernation WebSocket API, which is the supported primitive for
presence.

## What it exposes

| Route | Method | Purpose |
| --- | --- | --- |
| `/ws?p=/quran/2/` | GET + `Upgrade: websocket` | Reader connection. Server pushes snapshots. |
| `/stats` | GET | Aggregate: total, per-page counts, per-surah counts, visits. |
| `/visit` | POST | Bumps the lifetime visit counter (throttled per IP per minute). |
| `/health` | GET | Liveness probe. |

Client messages are small JSON frames:

```json
{ "t": "ping" }
{ "t": "track", "u": "/quran/2/", "z": "quran", "s": 2, "n": "Al-Baqarah", "p": false, "r": null }
```

`ping` only refreshes the socket's liveness timestamp. `track` updates the
page/reading state and triggers a broadcast (coalesced to at most one per 800ms).

Server snapshots:

```json
{
  "type": "snapshot",
  "total": 12,
  "surahs": [{ "surah": 2, "name": "Al-Baqarah", "readers": 3, "listeners": 1 }],
  "activity": [{ "id": "…", "surah": 2, "name": "Al-Baqarah", "reciter": null, "listening": false, "section": "quran" }],
  "visits": 12345,
  "ts": 1763900000000,
  "mine": { "path": "/quran/2/", "readers": 3 }
}
```

`/stats` returns the same object plus `pages: [{ path, readers, name }]`.
Dashboard connections (`/ws?m=stats`) receive the page list too.

## Deploy

```sh
npx wrangler login          # once
npm run live:deploy
```

The first deploy creates the Durable Object namespace and applies migration
`v1`. Wrangler prints the Worker URL (`https://noor-live.<account>.workers.dev`).

Set that URL in the Pages project (or `.env.local` for local work) and rebuild:

```
NEXT_PUBLIC_LIVE_URL=https://noor-live.<account>.workers.dev
```

Restrict who may connect in production:

```toml
[vars]
ALLOWED_ORIGINS = "https://noor.pages.dev,https://your-domain.com"
```

`*` (the default) allows any origin.

## Local development

```sh
npm run live:dev     # wrangler dev on http://localhost:8787
# .env.local: NEXT_PUBLIC_LIVE_URL=http://localhost:8787
npm run dev
```

## Cost and limits

- Hibernation WebSockets: idle connections cost no Durable Object duration.
- A pruning alarm wakes the object once per 30s **only while readers exist**;
  it closes sockets that stopped pinging for 75s (clients ping every 25s).
- One instance caps at 5,000 concurrent connections (`MAX_CONNECTIONS`).
- Reads scale fine for a reader counter. If the object ever becomes hot, shard
  by page path: `getByName(path)` plus a directory object that aggregates for
  `/stats`.

## Privacy

A connection is a tab. Nothing stored identifies a reader: no IP, no user agent,
no cookie. The `/visit` endpoint uses `CF-Connecting-IP` only for an in-memory
one-minute throttle and never persists it.
