# Quran Website — Work Progress

## Objective
Optimize the Quran website for speed by reducing HTTP requests, pre-building search indexes, and adding user features via Cloudflare D1/KV — all on Cloudflare's free tier without breaking existing logic or deploying.

## Important Details
- Data is static JSON (Quran ~5 MB across 114 files, Hadith ~28.5 MB across 157 files) served via Cloudflare Pages CDN
- Main bottleneck: SearchClient.tsx fetches 272+ individual JSON files and builds Fuse.js indexes client-side
- Use Cloudflare D1 (free 5GB) for bookmarks/progress, KV (free 100k reads/day) for caching — same provider as existing hosting = zero added latency
- Standardized Fuse.js key weights for pre-built indexes: Quran → en=1, hi=0.8, ur=0.8, arabic=0.6; Hadith → english=1, arabic=0.6, narrator=0.4, bookName=0.3
- Do NOT deploy — implement changes locally only

## Completed

### Build Scripts
- `scripts/fetch-quran-data.ts` — generates `quran-all.json` (combined ayahs) + `quran-search-index.json` (pre-built Fuse.js index)
- `scripts/fetch-hadith-data.ts` — generates per-collection + combined `hadith-all.json` + per-collection search indexes

### Server-Side Data Loaders (Fast-Paths)
- `src/lib/quran/translations.ts` — `getAllAyahs()` checks `quran-all.json` first, falls back to 114-file loop
- `src/lib/hadith/translations.ts` — `getAllHadiths()` and `getHadithById()` check `{collection}-all.json` first, fall back to per-book loop
- `src/lib/quran/search.ts` — `getFuse()` uses pre-built `quran-search-index.json` via `Fuse.parseIndex()`, falls back to runtime index building
- `src/lib/hadith/search.ts` — `getFuse()` uses pre-built `{collection}-search-index.json` via `Fuse.parseIndex()`, falls back to runtime index building

### Search UI Optimization
- `src/app/search/hadithData.ts` — `loadCollectionHadiths()` fetches `{collection}-all.json` (single fetch), falls back to batched book fetches; extracted shared `transformHadith()` helper
- `src/app/search/SearchClient.tsx` — loads Quran via 2 fetches (`quran-all.json` + `quran-search-index.json`), Hadith via 2 fetches (`hadith-all.json` + `hadith-search-index.json`), both use pre-built indexes; all paths have fallbacks

### YouTube Channel IDs
- `src/config/scholars.ts` — updated with real channel IDs:
  - Tuaha ibn Jalil: `UCo9HPMSoI3aDsDMn_HVzvtg`
  - Uthman ibn Farooq: `UC0jXz6YbbOUJ-EZPY1iaaqQ`
  - Omar Suleiman: `UC3vHW2h22WE-pNi5WJtRIjg` (Yaqeen Institute)
  - Yasir Qadhi: `UClUa7-iHJNKEM2e_zWYSPQg`
  - Mufti Menk: `UCNB_OaI4524fASt8h0IL8dw`
  - Nouman Ali Khan: `UCRtiU-lpcBSi-ipFKyfIkug` (Bayyinah)
  - Bilal Philips: `UCzX0itkJ3Qq1aFdCc9CsRjw`
  - Placeholders for: Dr. Israr Ahmed (original channel terminated by YouTube), Abu Saad (needs real ID), Muhammad Ali (needs real ID)

### Cloudflare Infrastructure
- `wrangler.toml` — added D1 binding (`DB`) + KV namespace binding (`CACHE`)
- `db/schema.sql` — `bookmarks` table (client_id, surah_number, ayah_number) + `reading_progress` table (client_id, surah_number, last_ayah_number, completed)

### Cloudflare Pages Functions (functions/api/)
- `bookmarks.ts` — GET (list), POST (add), DELETE (remove) with CORS
- `progress.ts` — GET (list), PUT (upsert) with CORS
- `search.ts` — POST (cached proxy via KV, 1h TTL)
- `youtube.ts` — GET (cache-first proxy to YouTube Data API v3, 1h TTL)

### Client-Side API Helpers (src/lib/api/)
- `client.ts` — anonymous client ID via localStorage UUID (`getClientId()`, `resetClientId()`)
- `bookmarks.ts` — `getBookmarks()`, `addBookmark()`, `removeBookmark()`, `isBookmarked()`
- `progress.ts` — `getProgress()`, `updateProgress()`, `getSurahProgress()`

### Build Verification
- `npm run build` passes successfully (compiled, TypeScript check, static generation)

## To Go Live with User Features (Do NOT deploy yet)
1. Run `npx wrangler d1 create quran-db` → paste ID into `wrangler.toml`
2. Run `npx wrangler kv namespace create CACHE` → paste IDs
3. Run `npx wrangler d1 execute quran-db --file=db/schema.sql --remote`
4. Add `YOUTUBE_API_KEY` to Cloudflare Pages environment variables
