# Noor — نور

> **نُورٌ عَلَىٰ نُورٍ** — *Light upon light.* A sacred digital space for the word of Allah.

Noor is a premium, open-source Quran & Hadith platform featuring the complete Quran with multilingual translations, authentic Hadith collections (Sahih Bukhari & Sahih Muslim), and a curated Islamic video library. Built with Next.js and Cloudflare, it delivers a cathedral-like reading experience with 3D elements, gold-accented Islamic geometry, and zero runtime costs.

🌐 **Live:** [https://quran-website.pages.dev](https://quran-website.pages.dev)

---

## Features

### 📖 Quran Reader
- All 114 surahs with Arabic (Uthmani script) + English, Hindi, Urdu translations
- Triptych layout: navigation sidebar | Arabic center panel | translation panel
- Gold-illuminated ayah numbers, gold drop-caps, verse markers (﴿﴾)
- Juz navigator with compact gold dot indicators
- Ayah bookmarking, copy, and share
- Basmala displayed in ornate gold decorative frame

### 📜 Hadith Collections
- 15,152 authentic hadiths (Sahih al-Bukhari + Sahih Muslim)
- Sanad (narration chain) visualization with connected gold dots
- Grade badges: emerald (Sahih), gold (Hasan), muted (Da'if)
- Full-text fuzzy search across all hadiths
- Book/chapter hierarchical navigation

### 🎬 Scholar Videos
- 19 renowned Islamic scholars with YouTube integration
- Category filtering: Tafsir, Seerah, Fiqh, Aqeedah, Dawah, and more
- Gold-accented video cards with hover play overlay
- Modal video player with geometric veil backdrop

### 🔍 Global Search
- Unified fuzzy search across Quran, Hadith, and Videos
- Pre-built Fuse.js indexes for instant client-side search
- Beam-effect backdrop on search page

### 🎨 Design System — "Noor Al-Quds"
- **Chamber-based navigation:** Every page is a sacred chamber with unique atmospheric lighting
- **Gold + Deep Navy palette:** Premium gold gradients, emerald for completion states
- **Vanishing navbar:** Auto-hides on scroll; floating lantern button appears at bottom-center
- **Geometric veil transitions:** Islamic patterns as page transition effects
- **3D environment:** Three.js concentric rings, star particles, Kaaba model, mosque scenes
- **Dark/Light mode:** "The Night" (dark) and "Dawn" (light) themes
- **Responsive:** Mobile-first with gold-glowing bottom dock

### ⚡ Performance
- 100% static site generation (SSG) — 292 routes pre-built
- Pre-built Fuse.js search indexes (4 fetches vs 272+)
- 3D components lazy-loaded via `next/dynamic`
- Cloudflare global CDN with 330+ edge locations
- PWA: offline access via service worker

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **UI** | React 19 + shadcn/ui + @base-ui |
| **Styling** | Tailwind CSS v4 + tw-animate-css |
| **3D** | Three.js + React Three Fiber + Drei |
| **Animation** | Framer Motion |
| **Search** | Fuse.js (client-side fuzzy search) |
| **Icons** | Lucide React |
| **State** | Zustand + TanStack Query |
| **Validation** | Zod |
| **Hosting** | Cloudflare Pages (static export) |
| **Database** | Cloudflare D1 (bookmarks, reading progress) |
| **Cache** | Cloudflare KV (YouTube API cache) |
| **Fonts** | Inter, Playfair Display, Noto Naskh Arabic |
| **CI/CD** | GitHub Actions + Wrangler |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Quran   │ │  Hadith  │ │  Videos  │ │  Search  │  │
│  │ (SSG)    │ │ (SSG)    │ │ (SSG)    │ │ (CSR)    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │            │            │            │          │
│       └────────────┴────────────┴────────────┘          │
│                        │                                 │
│              ┌─────────▼─────────┐                      │
│              │  Fuse.js Search   │                      │
│              │  (4 pre-built     │                      │
│              │   indexes)        │                      │
│              └─────────┬─────────┘                      │
│                        │                                 │
│              ┌─────────▼─────────┐                      │
│              │  localStorage     │                      │
│              │  (bookmarks,      │                      │
│              │   theme, lang)    │                      │
│              └───────────────────┘                      │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│              Cloudflare Pages (Static)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Quran   │ │  Hadith  │ │  Videos  │ │  Assets  │  │
│  │  JSON    │ │  JSON    │ │  Config  │ │  (fonts, │  │
│  │  data    │ │  data    │ │          │ │  icons)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│          Cloudflare Functions (Dynamic)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ YouTube  │ │  Search  │ │ Bookmark │ │ Progress │  │
│  │ API      │ │  Proxy   │ │ (D1)    │ │ (D1)    │  │
│  │ (KV)     │ │  (KV)    │ │          │ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Design Philosophy — "The Chamber Concept"

Every page is a **chamber** in a great spiritual building:

| Chamber | Page | Lighting | Mood |
|---------|------|----------|------|
| Grand Foyer | Homepage | Warm golden beam | Welcoming, awe |
| Scriptorium | Quran Reader | Focused intimate glow | Contemplative |
| Chain Library | Hadith | Warm ambient | Scholarly |
| Assembly Hall | Videos | Energetic | Engaging |
| Beacon | Search | Focused beam | Precise |
| Cloister | About | Soft muted | Reflective |

---

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout (fonts, nav, footer, providers)
│   ├── page.tsx              # Homepage (3D hero, quick links, stats)
│   ├── globals.css           # Tailwind theme, custom utilities, atmosphere layers
│   ├── quran/                # Quran module
│   │   ├── page.tsx          # Surah index (SSG)
│   │   ├── [surahNumber]/    # Surah reader (114 SSG pages)
│   │   └── ...
│   ├── hadith/               # Hadith module
│   │   ├── [collection]/     # Collection + book pages (157 SSG pages)
│   │   └── ...
│   ├── videos/               # Video library
│   │   ├── page.tsx          # Scholar index + latest videos
│   │   └── [scholar]/        # Per-scholar pages (10 SSG pages)
│   ├── search/               # Global search
│   └── about/                # About page
│
├── components/
│   ├── layout/               # Navbar, Footer, Sidebar, MobileNav
│   ├── quran/                # QuranReader, AyahDisplay, SurahCard, JuzNavigator
│   ├── hadith/               # HadithCard, HadithChain, CollectionCard, HadithSearch
│   ├── videos/               # VideoCard, VideoGrid, YouTubeEmbed, CategoryFilter
│   ├── three/                # HeroScene3D, KaabaModel, MosqueScene, StarParticles
│   ├── ui/                   # shadcn primitives (button, card, badge, tabs, etc.)
│   └── shared/               # SearchBar, ThemeToggle, BookmarkButton, ErrorBoundary
│
├── config/                   # site.ts, scholars.ts, api.ts, audio.ts
├── types/                    # TypeScript interfaces (quran, hadith, video)
├── hooks/                    # useBookmarks, useQuran, useYouTube
├── lib/                      # Data layers (quran, hadith, youtube, utils)
└── data/                     # Static JSON (surahs metadata)

public/
├── data/                     # Pre-built JSON (quran, hadith, search indexes)
├── images/                   # Icons, scholar profiles, architecture
├── manifest.json             # PWA manifest
└── sw.js                     # Service worker

functions/api/                # Cloudflare Pages Functions
├── youtube.ts                # YouTube API proxy with KV cache
├── search.ts                 # Search proxy with KV cache
├── bookmarks.ts              # D1 CRUD
└── progress.ts               # D1 CRUD

tests/                        # E2E tests (Playwright Python)
├── phase1.py                 # Foundation
├── phase3_hadith.py
├── phase4_video.py
├── phase5_search.py
└── phase6_polish.py
```

---

## Data Sources

All data sources are **free, no API key required:**

| Data | Source | Format |
|------|--------|--------|
| Quran Arabic | UmmahAPI / Quran-API | Static JSON at build |
| Quran English | UmmahAPI (Sahih Intl) | Static JSON at build |
| Quran Hindi | AlQuran Cloud | Static JSON at build |
| Quran Urdu | UmmahAPI | Static JSON at build |
| Hadith Bukhari | UmmahAPI (7,589 hadiths) | Static JSON at build |
| Hadith Muslim | UmmahAPI (7,563 hadiths) | Static JSON at build |
| YouTube Videos | YouTube Data API v3 | Runtime with KV caching |
| Scholar Data | Curated config (`config/scholars.ts`) | Static |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm / pnpm / yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/quran-website.git
cd quran-website

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your YouTube API key (optional — mock data used without it)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build    # Generates static export in `out/`
```

### Running Tests

```bash
# Start the server
npm run dev

# In a separate terminal, run tests
pip install playwright
playwright install chromium
python tests/phase1.py
python tests/phase3_hadith.py
python tests/phase4_video.py
python tests/phase5_search.py
python tests/phase6_polish.py
```

---

## Deployment

### Cloudflare Pages (Free — Recommended)

1. Push to GitHub
2. Connect repository to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Build command: `npm run build`
4. Output directory: `out`
5. Set environment variables in Cloudflare dashboard
6. Deploy — free SSL, global CDN, unlimited bandwidth

### Manual

```bash
npm run build
npx wrangler pages deploy out --project-name noor-quran
```

---

## Design System

Full documentation in [`DESIGN.md`](./DESIGN.md) covering:

- **Color System:** Deep navy (`#050a14`), gold gradients, emerald accents
- **Typography:** Playfair Display (headings), Inter (body), Noto Naskh Arabic (Arabic)
- **Atmosphere:** Lantern glow, scriptorium glow, search beam, geometric veil
- **Components:** Cards, buttons, badges, dividers with gold-accented variants
- **3D:** Concentric rings, star particles, Kaaba model, mosque dome, geometric star
- **Animations:** Slow elegant transitions, staggered ayah reveals, scroll-triggered fades

---

## Color Palette

```
--space-deep:      #050a14    — Absolute deepest background
--space-navy:      #0b1424    — Primary background
--gold-light:      #e8d48b    — Bright gold (CTAs, highlights)
--gold-main:       #d4af37    — Primary gold (accents, icons)
--gold-dim:        #b8922e    — Muted gold (borders, secondary)
--emerald:         #1a8a5c    — Success, completion
--text-primary:    #e8e0d0    — Body text
```

Gold is never flat — all gold elements use multi-stop gradients to simulate metallic foil reflectivity.

---

## Contributing

Contributions are welcome! Please read the design guidelines in [`DESIGN.md`](./DESIGN.md) before making UI changes.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source. All code is available under the MIT License.

---

## Built With ❤️ for the Ummah

**Noor** — *Light.* May this project bring benefit and draw people closer to the Qur'an and Sunnah.

> *"يَرْفَعِ ٱللَّهُ ٱلَّذِينَ ءَامَنُوا۟ مِنكُمْ وَٱلَّذِينَ أُوتُوا۟ ٱلْعِلْمَ دَرَجَـٰتٍۢ"*
> *Allah will raise those who have believed among you and those who were given knowledge, by degrees.*
> — Quran, Surah Al-Mujadila (58:11)
