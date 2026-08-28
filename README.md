<div align="center">

# Noor — نور

**نُورٌ عَلَىٰ نُورٍ** — *Light upon light.*

A premium open-source Quran & Hadith platform — complete Quran with multilingual translations, seven authentic Hadith collections (36,000+ hadiths), a trilingual Knowledge Base, and a curated Islamic video library. Fully static, zero runtime cost.



<img width="1831" height="955" alt="image" src="https://github.com/user-attachments/assets/57b6f040-261a-499e-abbb-d4bc44fc8321" />




[![CI](https://img.shields.io/github/actions/workflow/status/mdsarfarazalam840/Islamic-website/deploy.yml?style=flat-square&logo=github&label=Build)](https://github.com/mdsarfarazalam840/Islamic-website/actions)
![Node](https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-D6A137?style=flat-square)](/LICENSE)

</div>

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
  - [System Overview](#system-overview) · [Data Flow](#data-flow) · [Component Structure](#component-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [CI/CD](#cicd)
- [Design System](#design-system)
- [Contributing](#contributing)

---

## Features

### 📖 Quran Reader
All 114 surahs with Arabic (Uthmani script) + English, Urdu, Hindi translations. Triptych layout: navigation sidebar | Arabic center panel | translation panel. Gold-illuminated ayah numbers, gold drop-caps, verse markers. Juz navigator with gold dot indicators. Ayah bookmarking, copy, and share.

### 🔊 Recitation & Reciters
Every audio edition on the islamic.network CDN (~190 reciters) is selectable from a searchable picker in the surah player, and the choice persists across surahs and reloads. Reciters that publish per-ayah audio play **in sync with the text** — the active verse is highlighted, the reader auto-scrolls to it (switching Juz when needed), playback auto-advances verse to verse, and every ayah has its own play button. Reciters that only publish full-surah recordings play as a single track. The catalog, including each edition's bitrate, is probed once at build time by `npm run fetch:reciters`, so nothing is guessed at runtime.

### 📜 Hadith Collections
36,000+ authentic hadiths across 7 major collections — Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, and Muwatta Malik. Sanad (narration chain) visualization. Grade badges: emerald (Sahih), gold (Hasan), muted (Da'if). Full-text search via Pagefind, plus direct hadith-number lookup.

### 📚 Knowledge Base
A trilingual (English · हिन्दी · اردو) library of 63 source-graded articles across five categories — the Basics (pillars & articles of faith), Core Concepts, the 25 Prophets, Quranic Stories, and Surah Virtues. Per-article language toggle. `verse` blocks render **live** Arabic + translations pulled from the Quran data (no duplicated scripture); `hadith` blocks deep-link into the Hadith library. Every article carries graded source tags (Quran / hadith / tafsir / seerah) rendered as strength-colored badges. Indexed into Pagefind.

### 🎬 Scholar Videos
20+ renowned Islamic scholars linked to their YouTube channels. Long-form videos scraped at build time — no API keys, no quota, no billing. Category filtering: Tafsir, Seerah, Fiqh, Aqeedah, Dawah, and more.

### 🔍 Global Search
Unified search across Quran, Hadith, Knowledge Base, and Videos. Pagefind static index for Quran, Hadith & Knowledge Base — fetches only fragment chunks per query. Fuse.js for the video list.

### #️⃣ Hadith Number Lookup
Type a hadith number and land on the hadith, not on whatever text happens to rank for the digits. Accepts a bare number (`1234`), a collection-qualified reference (`Bukhari 1234`, `Sahih Muslim 500`), and common separators (`bukhari:1234`, `#1234`); a bare number inside a collection stays in that collection, while on the Hadith landing page and in global search it resolves across all seven. Results link straight to the hadith's anchor in its book.

A bare number can't tell you which of a collection's ~100 books holds it, so a build step (`npm run build:hadith-index`) run-length-encodes every number→book mapping into a single 34 KB file. The lookup fetches that once instead of downloading a collection (~22 MB for Bukhari).

### 🔖 Saved & Resume
Bookmark any ayah, hadith, or Knowledge Base article, or hit **Save my spot** while reading to keep the exact verse/hadith you were on. The **Saved** tab (bottom nav on mobile, main nav on desktop) lists every bookmark with filters, plus a "pick up where you left off" row for the Quran, Hadith, Knowledge Base, and videos — each deep-linking straight back to the anchor you left. Reading positions are tracked automatically as you scroll. All of it lives in `localStorage`, per device, with no account required.

### 👥 Live Visitors
The footer shows how many people are reading right now and how many visits the site has had. "Reading now" is Supabase Realtime **presence** — every open tab tracks itself on a shared channel, so the number rises the moment someone lands and falls the moment they close the tab, with no polling and no timeout guesswork. The visit total is one Postgres row bumped once per browsing session and subscribed to over Realtime, so it ticks up for everyone already on the page.

Optional: with no Supabase env vars the badge renders nothing rather than showing zeros, which is also what the desktop/mobile shells do when offline. See [Environment Variables](#environment-variables).

### 🎨 Noor Al-Quds Design System
Chamber-based navigation — every page is a sacred chamber with unique lighting. Gold + deep navy palette. Vanishing navbar with floating lantern button. Three.js 3D environment (star particles, Kaaba model). Dark/Light modes.

### ⚡ Performance
100% SSG — every route pre-rendered at build time. Pagefind fragment-based search. 3D components lazy-loaded. GitHub Pages CDN + PWA offline via service worker.

---

## Architecture

### System Overview

<a href="https://mdsarfarazalam840.github.io/Islamic-website/architecture/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/architecture/quran-website-architecture.visual-check.2048x1320.dark.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/architecture/quran-website-architecture.visual-check.2048x1320.light.png">
    <img alt="Quran Website — static build and delivery architecture: build-time ingestion, one-origin delivery, runtime and release" src="docs/architecture/quran-website-architecture.visual-check.2048x1320.light.png">
  </picture>
</a>

**[▶ Open the interactive diagram](https://mdsarfarazalam840.github.io/Islamic-website/architecture/)** — 5 guided views (build-time ingestion, deploy and rollback, client-side fetching, live visitors, desktop shells), path highlighting, dark/light themes, and PNG/SVG export. Source: [`docs/architecture/`](docs/architecture/).

### Data Flow

```mermaid
graph LR
    QAPI[Quran APIs] --> |Fetch| QDATA[public/data/quran/]
    HAPI[Hadith APIs] --> |Fetch| HDATA[public/data/hadith/]
    YT[YouTube Scraper] --> |Build-time scrape| YDATA[public/data/youtube/]
    KB[src/data/knowledge/] --> |Build| PF[Pagefind Index]
    QDATA --> |Build| PF
    HDATA --> |Build| PF
    PF --> |Embed| NX[Next.js SSG]
    QDATA --> NX
    HDATA --> NX
    YDATA --> NX
    KB --> |Hydrate verse/hadith refs| NX
    NX --> |Static export| GHP[GitHub Pages]
    GHP --> |Serve| BROWSER[Client Browser]
    BROWSER --> |Fragment fetches| PFS[Pagefind Search]
    BROWSER --> |localStorage| BOOK[Bookmarks & Theme]
```

### Component Structure

```mermaid
graph LR
    ROOT[Root Layout] --> HOME[Homepage]
    ROOT --> QRN[Quran Reader]
    ROOT --> HAD[Hadith]
    ROOT --> KBS[Knowledge Base]
    ROOT --> VID[Videos]
    ROOT --> SRC[Search]
    ROOT --> ABT[About]
    QRN --> QR[QuranReader]
    QRN --> JZ[JuzNavigator]
    HAD --> HC[HadithCard]
    HAD --> HCH[HadithChain]
    KBS --> AV[ArticleView]
    KBS --> BR[BlockRenderer<br/>Verse · Hadith · Source tags]
    VID --> VG[VideoGrid]
    VID --> CF[CategoryFilter]
    SRC --> SC[SearchClient]
    ROOT --> TGL[ThemeToggle]
    ROOT --> NAV[Navbar]
    ROOT --> FTR[Footer]
    ROOT --> T40[3D Environment<br/>Kaaba · Stars · Mosque]
```

### The Chamber Concept

Every page is a chamber in a sacred building, each with its own lighting and mood:

| Page | Chamber | Lighting | Mood |
|------|---------|----------|------|
| Homepage | Grand Foyer | Warm golden beam | Welcoming |
| Quran Reader | Scriptorium | Soft gold glow | Contemplative |
| Hadith | Chain Library | Ambient lantern | Scholarly |
| Knowledge Base | Study Hall | Steady gold | Teaching |
| Videos | Assembly Hall | Dynamic | Engaging |
| Search | Beacon | Focused beam | Precise |
| About | Cloister | Soft muted | Reflective |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, `output: "export"`) |
| Language | TypeScript |
| UI | React 19 + shadcn/ui + @base-ui |
| Styling | Tailwind CSS v4 + tw-animate-css |
| 3D | Three.js + React Three Fiber + Drei |
| Animation | Framer Motion |
| Search | Pagefind (Quran + Hadith + Knowledge Base) · Fuse.js (videos, hadith text) · run-length number index (hadith references) |
| Icons | Lucide React |
| State | Zustand + TanStack Query |
| Validation | Zod |
| Hosting | GitHub Pages · PWA |
| CI/CD | GitHub Actions |
| Fonts | Inter · Playfair Display · Noto Naskh Arabic |

---

## Getting Started

### Prerequisites
- Node.js 22+
- npm

### Install & Run

```bash
git clone https://github.com/mdsarfarazalam840/Islamic-website.git
cd Islamic-website
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Everything works without these; each one switches on one optional piece. Put them in `.env.local` for development, and in **Settings → Secrets and variables → Actions** for the Pages deploy.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL — enables the live layer: the footer badge, per-surah reader counts, trending surahs, the activity feed, and the audio listener count. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (publishable) key. Public by design; RLS limits it to reading the counter and calling `bump_visits()`. |
| `NEXT_PUBLIC_LIVE_DETAIL` | Set to `off` to keep only the footer's online + visits numbers and switch the per-surah, trending, and activity features off. Presence updates fan out to every connected tab, so this is the lever to pull if the project's Realtime message quota comes into view. |
| `NEXT_PUBLIC_BASE_PATH` | URL subpath for project-site hosting. Set by the deploy workflow; leave unset locally. |
| `NEXT_PUBLIC_PAGEFIND_BUNDLE` | Where the search index is served from. Set by the deploy workflow. |

For the live layer, run both migrations once in the Supabase SQL Editor, in order:

- `supabase/migrations/0001_site_stats.sql` — the counter row, its RLS policies, and `bump_visits()`.
- `supabase/migrations/0002_visit_rate_limit.sql` — rebuilds `bump_visits()` with a per-address daily
  budget. Without it the RPC is a loop away from meaningless: the anon key ships in the client
  bundle, so anyone could drive the counter anywhere and burn the project's request quota doing it.

Visits are counted once per browser per UTC day, and capped at 20 per address per UTC day server-side
(tunable via `public.visit_daily_cap()`). The cap is well above 1 on purpose — carrier NAT and office
networks put many real readers behind a single address.

### Build Data

```bash
npm run fetch:quran        # Quran JSON
npm run fetch:reciters     # Reciter catalog + per-edition audio bitrates
npm run fetch:hadith       # 7 Hadith collections
npm run fetch:youtube      # Latest videos
npm run build:pagefind     # Search index
npm run build:hadith-index # Hadith number → book lookup (34 KB)
npm run fetch:all          # All of the above
```

### Production Build

```bash
npm run build:static       # Hadith number index + Pagefind + Next.js → out/
```

### Test

```bash
npm run dev                # Terminal 1
pip install playwright && playwright install chromium
python tests/phase1.py
python tests/phase3_hadith.py
python tests/phase4_video.py
python tests/phase5_search.py
python tests/phase6_polish.py
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (fonts, nav, footer, providers)
│   ├── page.tsx            # Homepage (3D hero, quick links)
│   ├── globals.css         # Tailwind theme, custom utilities
│   ├── quran/              # Quran module
│   ├── hadith/             # Hadith module
│   ├── knowledge-base/     # Knowledge Base (category & article routes)
│   ├── videos/             # Video library
│   ├── search/             # Global search
│   ├── saved/              # Bookmarks + resume positions
│   └── about/              # About page
├── components/
│   ├── layout/             # Navbar, Footer, Sidebar, MobileNav
│   ├── quran/              # QuranReader, AyahDisplay, SurahCard, JuzNavigator, SurahAudioPlayer, ReciterSelect
│   ├── hadith/             # HadithCard, HadithChain, CollectionCard, HadithSearch
│   ├── knowledge/          # ArticleView, BlockRenderer, VerseBlockView, HadithBlockView, SourceTagBadge
│   ├── videos/             # VideoCard, VideoGrid, YouTubeEmbed, CategoryFilter
│   ├── saved/              # SavedClient, SavedItemCard, ContinueSection
│   ├── three/              # HeroScene3D, KaabaModel, MosqueScene, StarParticles
│   ├── ui/                 # shadcn primitives
│   └── shared/             # ThemeToggle, BookmarkButton, SaveSpotButton, SearchBar, Breadcrumbs, ErrorBoundary
├── config/                 # site.ts, scholars.ts, api.ts, audio.ts (reciter catalog + CDN URLs)
├── lib/                    # Data layers (quran, hadith, youtube, knowledge, utils)
├── hooks/                  # useBookmarks, useQuran, useYouTube, useReciter, reading/hadith/article/video progress
└── types/                  # TypeScript interfaces

public/
├── data/                   # Pre-built JSON (quran, hadith, youtube)
├── pagefind/               # Static search index
├── images/                 # Icons, scholar profiles
├── manifest.json           # PWA manifest
└── sw.js                   # Service worker

src/data/
├── knowledge/articles/     # Knowledge Base articles (one JSON per article)
└── quran/                  # surahs.json, reciters.json (audio edition catalog)

scripts/
├── fetch-quran-data.ts     # Quran JSON builder
├── fetch-reciters.ts       # Reciter catalog + bitrate prober
├── fetch-hadith-data.ts    # Hadith JSON builder
├── fetch-youtube-data.ts   # YouTube scraper
├── build-pagefind-index.mjs
└── bump-version.js         # Conventional-commit versioning
```

---

## CI/CD

Two GitHub Actions workflows drive releases. Tags are the **single source of truth** for what is live.

```mermaid
graph LR
    MAIN[Push to main] --> VG[versioning.yml]
    VG --> |Analyze commits| BUMP[Bump version + changelog]
    BUMP --> |Push tag| TAG[vX.Y.Z tag]
    TAG --> |Trigger| DP[deploy.yml]
    SCHED[Cron · 06:07 / 18:07 UTC] -.-> DP
    MANUAL[workflow_dispatch] -.-> DP
    DP --> BUILD[npm ci + fetch + build]
    BUILD --> |Static export| PAGES[GitHub Pages]
```

> [!TIP]
> **Break-glass rollback** — redeploy any known-good release:
> ```bash
> git tag -f v1.2.0 <good-commit-sha>
> git push -f origin v1.2.0
> ```
> The tag push triggers deploy and ships that exact commit.

---

## Design System

Full documentation in [`DESIGN.md`](./DESIGN.md).

### Color Palette

```
--space-deep:   #050a14    — Deepest background
--space-navy:   #0b1424    — Primary background
--gold-light:   #e8d48b    — Bright gold (CTAs, highlights)
--gold-main:    #d4af37    — Primary gold (accents, icons)
--gold-dim:     #b8922e    — Muted gold (borders, secondary)
--emerald:      #1a8a5c    — Success, completion
--text-primary: #e8e0d0    — Body text
```

Gold is never flat — all gold elements use multi-stop gradients for metallic foil reflectivity.

### Data Sources

| Data | Source | When |
|------|--------|------|
| Quran (Arabic + EN/UR/HI) | Public Quran APIs | Build → `public/data/quran/` |
| Reciter catalog | alquran.cloud editions + islamic.network CDN probe | Build → `src/data/quran/reciters.json` |
| Recitation audio | islamic.network CDN (per-ayah and per-surah MP3) | Streamed on demand in the browser |
| Hadith (7 collections) | Public Hadith APIs | Build → `public/data/hadith/` |
| Knowledge Base (EN/HI/UR) | Authored, source-graded articles | Hand-written → `src/data/knowledge/articles/` |
| Scholar Videos | YouTube `/videos` tabs | Build + twice-daily cron → `public/data/youtube/` |

YouTube runs on GitHub's US runners. Per-channel failures fall back to bundled mock data.

---

## Contributing

Use **Conventional Commits** (`feat:`, `fix:`, `chore:`, `BREAKING CHANGE:`).

1. Fork the repo
2. `git checkout -b feat/amazing-feature`
3. `git commit -m 'feat: add amazing feature'`
4. `git push origin feat/amazing-feature`
5. Open a Pull Request

---

<div align="center">

**Noor** — *Light.* May this project bring benefit and draw people closer to the Qur'an and Sunnah.

*"يَرْفَعِ ٱللَّهُ ٱلَّذِينَ ءَامَنُوا۟ مِنكُمْ وَٱلَّذِينَ أُوتُوا۟ ٱلْعِلْمَ دَرَجَـٰتٍۢ"*  
*Allah will raise those who have believed among you and those who were given knowledge, by degrees.*  
— Quran, Surah Al-Mujadila (58:11)

</div>
