# Quran & Hadith Website — Implementation Plan (Deduplicated)

## 1. Project Overview

A comprehensive Islamic website featuring:
- Complete Quran with English, Hindi, Urdu translations
- Hadith collections (Sahih Bukhari & Muslim)
- Curated YouTube video library of Islamic scholars
- Islamic architectural UI/UX theme (Makkah, Madina inspired)
- 3D interactive elements (Kaaba, mosque architecture) using React Three Fiber
- Framer Motion animations
- Hybrid architecture: static content + dynamic search/user features
- **100% open source — zero cost for any software or hosting**

---

## 2. Tech Stack (100% Open Source & Free)

| Layer | Technology | License | Cost |
|-------|-----------|---------|------|
| **Framework** | Next.js 14+ (App Router) | MIT | Free |
| **Language** | TypeScript | Apache 2.0 | Free |
| **Styling** | Tailwind CSS v4 | MIT | Free |
| **Animations** | Framer Motion | MIT | Free |
| **3D Engine** | React Three Fiber + Three.js | MIT | Free |
| **3D Helpers** | @react-three/drei | MIT | Free |
| **UI Components** | shadcn/ui (Radix primitives) | MIT | Free |
| **State Management** | Zustand + TanStack React Query | MIT | Free |
| **Data Validation** | Zod | MIT | Free |
| **Search** | Fuse.js | Apache 2.0 | Free |
| **Hosting** | Cloudflare Pages | Free tier | **$0** (unlimited bandwidth, 500 builds/mo, free SSL, global CDN) |
| **Analytics** | Cloudflare Web Analytics | Free | Free |
| **Quran API** | UmmahAPI / Quran-API | Open Source | Free |
| **Hadith API** | UmmahAPI / Al-Furqan API | Open Source | Free |
| **3D Models** | Free Kaaba/Mosque GLTF from Sketchfab | CC0 | Free |
| **Fonts** | Google Fonts (Noto Naskh Arabic, Noto Nastaliq Urdu, Inter) | OFL | Free |
| **Icons** | Lucide React | MIT | Free |

---

## 3. Project Structure

```
quran-website/
├── public/
│   ├── images/
│   │   ├── architecture/       # Islamic architecture assets
│   │   ├── scholars/           # Scholar profile images
│   │   ├── icons/              # App icons, favicon
│   │   └── posters/            # Video thumbnails/posters
│   ├── fonts/                  # Arabic & Urdu fonts
│   └── data/                   # Static JSON data
│       ├── quran/              # surahs.json, translations
│       └── hadith/             # bukhari/, muslim/
│
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Homepage
│   │   ├── quran/
│   │   │   ├── page.tsx
│   │   │   └── [surahNumber]/page.tsx
│   │   ├── hadith/
│   │   │   ├── page.tsx
│   │   │   ├── [collection]/page.tsx
│   │   │   └── [collection]/[bookId]/page.tsx
│   │   ├── videos/
│   │   │   ├── page.tsx
│   │   │   └── [scholar]/page.tsx
│   │   ├── search/page.tsx
│   │   └── about/page.tsx
│   │
│   ├── components/
│   │   ├── layout/             # Navbar, Footer, Sidebar, MobileNav
│   │   ├── quran/             # SurahCard, AyahDisplay, TranslationTabs, AyahActions, JuzNavigator, QuranReader
│   │   ├── hadith/            # HadithCard, HadithChain, CollectionCard, HadithSearch
│   │   ├── videos/            # VideoCard, VideoGrid, ScholarProfile, YouTubeEmbed
│   │   ├── three/             # KaabaModel, MosqueScene, GeometricPattern3D, LanternGlow, StarParticles, Scene3D, Loading3D
│   │   ├── ui/                # shadcn/ui components
│   │   ├── shared/            # SearchBar, ThemeToggle, LanguageSwitcher, BookmarkButton, LoadingSkeleton
│   │   └── borrowed/          # Adapted design patterns from premium libraries
│   │
│   ├── data/                  # Static JSON data (surahs, juz, translations, hadith metadata)
│   ├── lib/                   # Utilities (quran/, hadith/, youtube/, utils/)
│   ├── hooks/                 # useQuran, useHadith, useYouTube, useBookmarks, useSearch
│   ├── types/                 # quran.ts, hadith.ts, video.ts, scholar.ts
│   ├── styles/               # globals.css, theme.ts, animations.ts
│   └── config/               # site.ts, scholars.ts, api.ts
│
├── scripts/                  # Data fetch scripts (fetch-quran-data, fetch-hadith-data, generate-sitemap)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Data Architecture

### 4.1 Quran Data

**Source (Free, No API Key):** UmmahAPI, Quran-API, Al-Furqan API

**Data Structure:**
```typescript
interface Ayah {
  number: number;
  surahNumber: number;
  ayahNumber: number;
  juz: number;
  hizb: number;
  arabic: string;
  translations: { en: string; hi: string; ur: string };
  tafsir?: { ibnKathir?: string; maududi?: string };
}
```

**Pipeline:** Build-time script → download from free APIs → save structured JSON in `public/data/quran/`

### 4.2 Hadith Data

**Initial Scope:** Sahih Bukhari + Sahih Muslim
**Source:** UmmahAPI (36,000+ hadiths), Al-Furqan API, Sunnah.com

```typescript
interface Hadith {
  id: string;
  collection: 'bukhari' | 'muslim';
  bookId: number;
  bookName: string;
  chapterId: number;
  chapterName: string;
  hadithNumber: number;
  arabic: string;
  english: string;
  narrator: string;
  grade: string;
  reference: { collection: string; book: string; hadithNumber: number; volume?: number; bookNumber?: number; uscMsa?: string };
  tags: string[];
}
```

### 4.3 YouTube / Scholar Videos

```typescript
interface Scholar {
  id: string; name: string; nameAr: string; bio: string; image: string;
  channelId: string; channelUrl: string; featured: boolean;
}
interface Video {
  id: string; youtubeId: string; title: string; description: string;
  scholarId: string; scholarName: string; thumbnail: string;
  duration: string; publishedAt: string; category: string; views: number;
}
```

**Scholar Channels:** Dr. Israr Ahmed, Abu Saad, Muhammad Ali, Tuaha ibn Jalil, Uthman ibn Farooq, Omar Suleiman, Yasir Qadhi, Mufti Menk, Nouman Ali Khan, Bilal Philips (expandable)

---

## 5. UI/UX Design System — "Noor" (Light)

### 5.1 Design Philosophy
- **Colors:** Deep midnight blues, emerald greens, gold accents
- **Typography:** Arabic calligraphy for headers, clean sans-serif for body
- **Geometry:** Islamic geometric patterns as subtle backgrounds
- **Lighting:** Warm golden-hour gradients and glow effects
- **Motifs:** Dome silhouettes, arch shapes, arabesque borders
- **3D:** Interactive Kaaba, floating geometric patterns, lantern glow

### 5.2 Color Palette
```css
--color-primary: #1a3a4a;         --color-primary-light: #2a5a6a;
--color-secondary: #c8a45c;       --color-secondary-light: #e8c87c;
--color-accent: #2d7d46;          --color-accent-light: #4a9d66;
--color-background: #0a1628;      --color-surface: #1a2a3e;
--color-surface-light: #2a3a4e;   --color-text: #e8e0d0;
--color-text-muted: #9a9080;      --color-border: #2a3a4e;
--color-success: #2d7d46;         --color-warning: #c8a45c;
--color-error: #8b3a3a;
```

### 5.3 Typography
```css
--font-arabic: 'Noto Naskh Arabic', 'Traditional Arabic', serif;
--font-urdu: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif;
--font-primary: 'Inter', system-ui, sans-serif;
--font-display: 'Playfair Display', serif;
```

### 5.4 Design Patterns
| Pattern | Implementation |
|---------|---------------|
| **Geometric Backgrounds** | CSS-generated repeating patterns |
| **Mosaic Borders** | CSS gradients + SVG patterns |
| **Arch Shapes** | `clip-path: polygon(...)` for arch cards |
| **Glassmorphism** | Backdrop blur on navbars, modals |
| **Gold Accents** | `box-shadow` with gold color |
| **Lantern Glow** | Radial gradient overlays |
| **Calligraphy** | Arabic text with golden gradient |
| **Transition Animations** | Page transitions, surah transitions |
| **3D Kaaba** | Rotating model on homepage hero |
| **3D Mosque Scene** | Interactive 3D dome with particles |
| **3D Star Particles** | Floating particle system |

### 5.5 Page Layouts

- **Homepage:** 3D Kaaba model hero, search bar, quick links, featured scholar carousel, featured ayah + hadith
- **Quran Page:** Surah list → verse reader with translation tabs (English | Hindi | Urdu), Juz navigator, ayah actions
- **Hadith Page:** Collection selector → book/chapter nav → hadith cards (Arabic + English, narrator, grade, reference)
- **Video Library:** Scholar filter chips, category filter, grid of video cards with YouTube thumbnails
- **Search:** Global search across Quran, Hadith, Videos with filters

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
| # | Task | Details |
|---|------|---------|
| 1.1 | Initialize Next.js project | App Router, TypeScript, Tailwind |
| 1.2 | Install dependencies | shadcn/ui, framer-motion, three, r3f, zustand, react-query, fuse.js, zod |
| 1.3 | Set up Tailwind theme | Islamic color palette, custom fonts, geometric patterns |
| 1.4 | Create layout components | Navbar, Footer, Sidebar, MobileNav |
| 1.5 | Build data pipeline | Scripts to fetch Quran + Hadith JSON, validate with Zod |
| 1.6 | Create type definitions | All TypeScript interfaces |

### Phase 2: Quran Module (Week 2-3)
| # | Task | Details |
|---|------|---------|
| 2.1 | Surah index page | 114 surahs with metadata, search/filter |
| 2.2 | Surah reader page | Verse-by-verse with Arabic + 3 translations |
| 2.3 | Translation tabs | Toggle English, Hindi, Urdu per verse |
| 2.4 | Juz navigator | Jump between juz boundaries |
| 2.5 | Ayah actions | Bookmark (localStorage), copy, share |
| 2.6 | Quran search | Keyword search across translations |
| 2.7 | Audio integration | Link to free Al-Furqan API recitations |

### Phase 3: Hadith Module (Week 3-4)
| # | Task | Details |
|---|------|---------|
| 3.1 | Collection index | Bukhari & Muslim with metadata |
| 3.2 | Book/chapter nav | Hierarchical navigation |
| 3.3 | Hadith card | Arabic + English, narrator, grade, reference |
| 3.4 | Reference display | Standardized format |
| 3.5 | Hadith search | Text, narrator, topic search |
| 3.6 | Grade filtering | Sahih, Hasan, Da'if |

### Phase 4: Video Library (Week 4-5)
| # | Task | Details |
|---|------|---------|
| 4.1 | Scholar config | Profiles with channel IDs, images, bios |
| 4.2 | YouTube API integration | Fetch latest videos per channel |
| 4.3 | Video grid | Responsive grid with thumbnails |
| 4.4 | Video player | Embedded YouTube player |
| 4.5 | Category filtering | Tafsir, Seerah, Fiqh, Aqeedah, Duas |
| 4.6 | Scholar pages | Dedicated pages per scholar |

### Phase 5: Search & Advanced Features (Week 5-6)
| # | Task | Details |
|---|------|---------|
| 5.1 | Global search | Unified Quran, Hadith, Videos |
| 5.2 | Fuse.js integration | Client-side fuzzy search |
| 5.3 | Bookmarking | localStorage for ayahs & hadith |
| 5.4 | Share functionality | Text or social cards |
| 5.5 | SEO optimization | Dynamic metadata, JSON-LD, sitemap |
| 5.6 | PWA support | Service worker, offline cache |

### Phase 6: Polish & Launch (Week 6-7)
| # | Task | Details |
|---|------|---------|
| 6.1 | Performance audit | Lighthouse, Core Web Vitals |
| 6.2 | Responsive testing | Mobile, tablet, desktop |
| 6.3 | Accessibility | ARIA labels, keyboard nav, screen reader |
| 6.4 | Dark/light mode | Theme toggle + system preference |
| 6.5 | Loading states | Skeleton screens, progressive 3D loading |
| 6.6 | Error boundaries | Graceful API failure handling |
| 6.7 | Deploy to Cloudflare Pages | CI/CD via GitHub, custom domain, free SSL |

---

## 7. Key Implementation Details

### 7.1 Islamic Architecture UI Components
- **GeometricPattern:** SVG-based repeating patterns (8-pointed stars)
- **ArchCard:** Mosque arch shape via clip-path with gold gradient border
- **MosaicDivider:** Repeating geometric tile pattern section divider
- **LanternEffect:** Radial gradient overlay for warm lighting

### 7.2 3D Components (React Three Fiber)
- **KaabaModel:** Free GLTF from Sketchfab, auto-rotate on homepage, interactive orbit
- **MosqueScene:** Interactive dome with geometric patterns, floating particles, warm lighting
- **StarParticles:** 3D particle system with Islamic geometric shapes, mouse-follow
- **Scene3D:** Canvas wrapper with suspense, warm lighting, performance optimizations

**Free 3D Model Sources:** Sketchfab (CC0), Tripo AI, 3DExport

### 7.3 Animation Strategy
| Animation | Library | Effect |
|-----------|---------|--------|
| Page transitions | Framer Motion AnimatePresence | Fade + scale between routes |
| Surah verse reveal | Framer Motion | Staggered fade-in per verse |
| Hadith card entry | Framer Motion | Slide-up with spring physics |
| Video card hover | Framer Motion | Scale + gold glow border |
| 3D Kaaba rotation | useFrame | Continuous Y-axis rotation |
| 3D particles | Three.js PointsMaterial | Floating shapes, mouse-follow |
| Scroll-driven 3D | Framer Motion scroll | Camera changes on scroll |

### 7.4 Performance Strategy
| Technique | Application |
|-----------|-------------|
| **SSG** | All Quran + hadith pages |
| **ISR** | Video pages (revalidate ~6h) |
| **Lazy Loading** | Hadith books loaded on demand |
| **Image Optimization** | Next.js `<Image>` |
| **Code Splitting** | Route-based + dynamic imports for 3D |
| **Font Optimization** | `next/font` |
| **Bundle Analysis** | `@next/bundle-analyzer` |
| **3D Performance** | `@react-three/drei` perf utils, `r3f-perf` |

### 7.5 SEO Strategy
- JSON-LD Structured Data (IslamicContent, Quran, Hadith schemas)
- Dynamic OG Images (satori / @vercel/og)
- Dynamic sitemap.xml + robots.txt
- Canonical URLs + Arabic meta tags per page

### 7.6 Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation for Quran/Hadith reading
- Focus management for modals
- Screen reader announcements for search results
- WCAG AA color contrast
- `prefers-reduced-motion` support
- 3D fallback (static image if WebGL unavailable)

### 7.7 Premium Design Inspiration Sources
| Source | Components Used |
|--------|---------------|
| **21st.dev** | Shader backgrounds, scroll reveal, interactive globe |
| **Spell UI** | Light rays, exploding search, animated gradient |
| **Vengeance UI** | Glass dock, spotlight navbar, kinetic loader, morph text |
| **Skiper UI** | Dynamic island, image cursor trail, image reveal |
| **Fancy Components** | Gravity text, text highlighter, marquee calligraphy |
| **Motion (Framer Motion)** | Parallax, confetti, typewriter, skeleton shimmer |
| **Taste Skill** | Design system governance for AI agents |
| **MotionSites** | Hero section reference inspiration |
| **Dark Design** | Dark mode design reference |
| **CTA Gallery** | CTA button/form/modal inspiration |

> Note: Components are re-implemented with Islamic color palette, geometric motifs, and Arabic calligraphy — not copy-pasted.

---

## 8. Data Sources & APIs (All Free)

| Data | Source | Method |
|------|--------|--------|
| Quran Arabic | UmmahAPI / Quran-API | Static JSON at build |
| Quran English | UmmahAPI (Sahih Intl, Yusuf Ali, Pickthall) | Static JSON at build |
| Quran Hindi | AlQuran Cloud | Static JSON at build |
| Quran Urdu | UmmahAPI / AlQuran Cloud | Static JSON at build |
| Hadith Bukhari | UmmahAPI / Al-Furqan API | Static JSON at build |
| Hadith Muslim | UmmahAPI / Al-Furqan API | Static JSON at build |
| YouTube Videos | YouTube Data API v3 (10k req/day free) | Runtime with caching |
| 3D Models | Sketchfab (CC0) | Static GLTF/GLB |
| Fonts | Google Fonts (OFL) | CDN |
| Icons | Lucide React (MIT) | npm |

---

## 9. Key Design Decisions

### 9.1 Hybrid Architecture (Static + Dynamic)
- **Static:** Quran pages, hadith pages — rarely change, CDN cacheable
- **Dynamic:** Search, bookmarks, YouTube videos — real-time/user interaction
- **ISR:** Video pages revalidate every few hours

### 9.2 Fuse.js for Search
- No backend database needed
- Client-side fuzzy matching handles Arabic transliteration typos
- Extensible to Meilisearch later

### 9.3 Hadith Reference Format
```
Sahih al-Bukhari 1
  Book 1: Revelation
  Chapter 1: How the Divine Revelation started
  Narrated by 'Aisha (RA)
  Grade: Sahih
```

### 9.4 Why Cloudflare Pages (Not Vercel)
| Factor | Cloudflare Pages (Free) | Vercel (Hobby) |
|--------|------------------------|----------------|
| Bandwidth | Unlimited | 100 GB |
| Commercial use | Allowed | **Not allowed** |
| SSL | Free automatic | Free automatic |
| CDN | 330+ data centers | Global edge |
| Builds | 500/month | 6,000 min/month |
| Analytics | Free Cloudflare Web Analytics | Not included |
| Cost | **$0 forever** | Free tier, no commercial use |

---

## 10. Dependencies

```json
{
  "dependencies": {
    "next": "^14.2", "react": "^18.3", "react-dom": "^18.3",
    "framer-motion": "^11.0", "three": "^0.170",
    "@react-three/fiber": "^8.0", "@react-three/drei": "^9.0",
    "@tanstack/react-query": "^5.0", "zustand": "^4.5",
    "fuse.js": "^7.0", "zod": "^3.22",
    "lucide-react": "^0.400", "clsx": "^2.1", "tailwind-merge": "^2.3"
  },
  "devDependencies": {
    "typescript": "^5.4", "@types/node": "^20", "@types/react": "^18",
    "@types/three": "^0.170", "tailwindcss": "^3.4",
    "postcss": "^8", "autoprefixer": "^10",
    "eslint": "^8", "eslint-config-next": "^14",
    "prettier": "^3", "prettier-plugin-tailwindcss": "^0.5"
  }
}
```

---

## 11. Environment Variables

```env
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
NEXT_PUBLIC_SITE_URL=https://quran-website.pages.dev
```

---

## 12. Deployment (100% Free on Cloudflare Pages)

1. Push to GitHub (free)
2. Connect to Cloudflare Pages (free tier, no credit card)
3. Build command: `npm run build`
4. Output directory: `out`
5. Set env vars in Cloudflare dashboard
6. Deploy — Cloudflare auto-detects Next.js
7. Free `*.pages.dev` subdomain + automatic SSL
8. Enable ISR for video pages

**No paid services required:**
- Hosting: Cloudflare Pages (free, unlimited bandwidth)
- Quran data: UmmahAPI (free, no API key)
- Hadith data: UmmahAPI (free, no API key)
- 3D models: Sketchfab (free CC0)
- Fonts: Google Fonts (free OFL)
- Icons: Lucide (free MIT)
- Analytics: Cloudflare Web Analytics (free)
- Domain: `*.pages.dev` free subdomain

---

## 13. AI Agent Execution Guide

### Step 1: Project Setup
```bash
npx create-next-app@latest quran-website --typescript --tailwind --app
cd quran-website
npx shadcn@latest init
npm install framer-motion three @react-three/fiber @react-three/drei zustand @tanstack/react-query fuse.js zod
npm install -D @types/three
```

### Step 2: Data Fetching
- Run `scripts/fetch-quran-data.ts` to download Quran JSON from free APIs
- Run `scripts/fetch-hadith-data.ts` to download Bukhari + Muslim
- Place all JSON in `public/data/`

### Step 3: Build Components (order)
Layout → Quran reader → Hadith viewer → Video library → 3D components → Search

### Step 4: Styling
Configure Tailwind → geometric patterns → arch cards → animations → 3D scenes

### Step 5: Deploy
`npm run build` → push to GitHub → connect Cloudflare Pages → set env vars → deploy

### Agent Focus Areas
| Agent | Focus |
|-------|-------|
| opencode | Full-stack, data pipeline, API routes |
| Codex | Components, types, data flow |
| Cursor | UI, Tailwind, Framer Motion |
| Antigravity | Scaffolding, 3D, deployment |

---

## 14. Future Enhancements (Post-MVP)

- [ ] User accounts with cloud-synced bookmarks
- [ ] Tafsir integration (Ibn Kathir, Maududi, Tabari)
- [ ] Quran audio recitation player (Al-Furqan API — 44 reciters)
- [ ] Prayer times widget (UmmahAPI — 22 methods)
- [ ] Islamic calendar (Hijri date)
- [ ] Daily ayah/hadith notification
- [ ] PDF export of surahs/hadith collections
- [ ] Community notes/tafsir
- [ ] More hadith collections (Abu Dawud, Tirmidhi, Nasai, Ibn Majah)
- [ ] Multi-language UI (Arabic, English, Urdu, Hindi, Indonesian)
- [ ] Mobile app (React Native or PWA)
- [ ] More 3D scenes (Madina, Dome of the Rock, floating lanterns)

---

## 15. Success Metrics

- Lighthouse: 95+ Performance, 100 Accessibility, 100 SEO
- All 114 surahs with 3 translations
- 7000+ hadith from Bukhari & Muslim searchable
- 50+ scholar videos displayed
- 3D Kaaba loads and rotates smoothly
- < 1s Time to Interactive (desktop)
- < 2s Largest Contentful Paint
- 0 Cumulative Layout Shift
- **Zero cost for hosting, data, or software**
