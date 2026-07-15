# Quran & Hadith Website — Complete Implementation Plan

## 1. Project Overview

A comprehensive Islamic website featuring:
- Complete Quran with English, Hindi, Urdu translations
- Hadith collections (Sahih Bukhari & Muslim initially, expandable)
- Curated YouTube video library of Islamic scholars
- Islamic architectural UI/UX theme (Makkah, Madina inspired)
- 3D interactive elements (Kaaba, mosque architecture) using React Three Fiber
- Framer Motion animations for premium feel
- Hybrid architecture: static content + dynamic search/user features
- **100% open source — zero cost for any software or hosting**

---

## 2. Tech Stack (100% Open Source & Free)

| Layer | Technology | License | Cost |
|-------|-----------|---------|------|
| **Framework** | Next.js 14+ (App Router) | MIT | Free |
| **Language** | TypeScript | Apache 2.0 | Free |
| **Styling** | Tailwind CSS v4 | MIT | Free |
| **2D Animations** | Framer Motion | MIT | Free |
| **3D Engine** | React Three Fiber + Three.js | MIT | Free |
| **3D Helpers** | @react-three/drei | MIT | Free |
| **3D Models** | Free Kaaba/Mosque GLTF from Sketchfab | CC0/Free | Free |
| **UI Components** | shadcn/ui (Radix primitives) | MIT | Free |
| **State Management** | Zustand + TanStack React Query | MIT | Free |
| **Data Validation** | Zod | MIT | Free |
| **Search** | Fuse.js | Apache 2.0 | Free |
| **Hosting** | Cloudflare Pages | Free tier | **$0** (unlimited bandwidth, 500 builds/mo, free SSL, global CDN) |
| **Analytics** | Umami (self-hosted) or Cloudflare Web Analytics | MIT / Free | Free |
| **Quran API** | UmmahAPI / Quran-API (no rate limit, no API key) | Open Source | Free |
| **Hadith API** | UmmahAPI / Al-Furqan API (free, no API key) | Open Source | Free |
| **3D Models** | Free Kaaba/Mosque GLTF from Sketchfab | CC0/Free | Free |
| **Fonts** | Google Fonts (Noto Naskh Arabic, Noto Nastaliq Urdu, Inter) | OFL | Free |
| **Icons** | Lucide React | MIT | Free |

---

## 3. Project Structure

```
quran-website/
├── public/
│   ├── images/
│   │   ├── architecture/       # Islamic architecture assets
│   │   │   ├── makkah-bg.webp
│   │   │   ├── madina-bg.webp
│   │   │   ├── kaaba-silhouette.svg
│   │   │   ├── dome-pattern.svg
│   │   │   ├── geometric-pattern.svg
│   │   │   └── arabesque-border.svg
│   │   ├── scholars/           # Scholar profile images
│   │   └── icons/              # App icons, favicon
│   │   └── posters/            # Video thumbnails/posters
│   └── fonts/                  # Arabic & Urdu fonts
│
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with theme provider
│   │   ├── page.tsx            # Homepage
│   │   ├── quran/
│   │   │   ├── page.tsx        # Quran index (surah list)
│   │   │   └── [surahNumber]/
│   │   │       └── page.tsx    # Individual surah page
│   │   ├── hadith/
│   │   │   ├── page.tsx        # Hadith collections index
│   │   │   └── [collection]/
│   │   │       ├── page.tsx    # Collection books list
│   │   │       └── [bookId]/
│   │   │           └── page.tsx # Hadith list per book
│   │   ├── videos/
│   │   │   ├── page.tsx        # Video library
│   │   │   └── [scholar]/
│   │   │       └── page.tsx    # Scholar-specific videos
│   │   ├── search/
│   │   │   └── page.tsx        # Global search
│   │   └── about/
│   │       └── page.tsx        # About page
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── quran/
│   │   │   ├── SurahCard.tsx
│   │   │   ├── AyahDisplay.tsx
│   │   │   ├── TranslationTabs.tsx
│   │   │   ├── AyahActions.tsx   # Bookmark, share, copy
│   │   │   ├── JuzNavigator.tsx
│   │   │   └── QuranReader.tsx
│   │   ├── hadith/
│   │   │   ├── HadithCard.tsx
│   │   │   ├── HadithChain.tsx   # Sanad/isnad display
│   │   │   ├── CollectionCard.tsx
│   │   │   └── HadithSearch.tsx
│   │   ├── videos/
│   │   │   ├── VideoCard.tsx
│   │   │   ├── VideoGrid.tsx
│   │   │   ├── ScholarProfile.tsx
│   │   │   └── YouTubeEmbed.tsx
│   │   ├── three/               # 3D components
│   │   │   ├── KaabaModel.tsx
│   │   │   ├── MosqueScene.tsx
│   │   │   ├── GeometricPattern3D.tsx
│   │   │   ├── LanternGlow.tsx
│   │   │   ├── StarParticles.tsx
│   │   │   ├── Scene3D.tsx       # Canvas wrapper with lighting
│   │   │   └── Loading3D.tsx
│   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   └── shared/
│   │       ├── SearchBar.tsx
│   │       ├── ThemeToggle.tsx
│   │       ├── LanguageSwitcher.tsx
│   │       ├── BookmarkButton.tsx
│   │       └── LoadingSkeleton.tsx
│   │
│   ├── data/                   # Static JSON data
│   │   ├── quran/
│   │   │   ├── surahs.json     # Surah metadata
│   │   │   ├── juz.json        # Juz boundaries
│   │   │   ├── en.ahmedali.json
│   │   │   ├── en.yusufali.json
│   │   │   ├── hi.hindi.json
│   │   │   └── ur.urdu.json
│   │   ├── hadith/
│   │   │   ├── bukhari/
│   │   │   │   ├── metadata.json
│   │   │   │   └── books/      # Split by book for lazy loading
│   │   │   └── muslim/
│   │   │       ├── metadata.json
│   │   │       └── books/
│   │   └── scholars.json       # Curated scholar list
│   │
│   ├── lib/
│   │   ├── quran/
│   │   │   ├── surahs.ts       # Surah data utilities
│   │   │   ├── translations.ts  # Translation loading
│   │   │   └── search.ts       # Quran search logic
│   │   ├── hadith/
│   │   │   ├── collections.ts  # Hadith collection metadata
│   │   │   ├── search.ts       # Hadith search
│   │   │   └── references.ts   # Reference formatting
│   │   ├── youtube/
│   │   │   ├── api.ts          # YouTube Data API client
│   │   │   ├── scholars.ts     # Scholar channel config
│   │   │   └── cache.ts        # Video data caching
│   │   └── utils/
│   │       ├── cn.ts           # Tailwind class merger
│   │       ├── arabic.ts       # Arabic text utilities
│   │       └── seo.ts          # SEO metadata helpers
│   │
│   ├── hooks/
│   │   ├── useQuran.ts
│   │   ├── useHadith.ts
│   │   ├── useYouTube.ts
│   │   ├── useBookmarks.ts
│   │   └── useSearch.ts
│   │
│   ├── types/
│   │   ├── quran.ts
│   │   ├── hadith.ts
│   │   ├── video.ts
│   │   └── scholar.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   ├── theme.ts
│   │   └── animations.ts
│   │
│   └── config/
│       ├── site.ts            # Site metadata
│       ├── scholars.ts        # Scholar channel IDs
│       └── api.ts             # API configuration
│
├── public/
│   └── data/                  # Static JSON data (git LFS if large)
│       ├── quran/
│       │   ├── surahs.json
│       │   ├── en.ahmedali.json
│       │   ├── hi.hindi.json
│       │   └── ur.urdu.json
│       └── hadith/
│           ├── bukhari/
│           └── muslim/
│
├── scripts/
│   ├── fetch-quran-data.ts     # Script to download Quran JSON
│   ├── fetch-hadith-data.ts    # Script to download Hadith JSON
│   └── generate-sitemap.ts     # SEO sitemap generator
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. Data Architecture

### 4.1 Quran Data

**Source (Free, No API Key Required):**
- [UmmahAPI](https://ummahapi.com/quran-api) — Free, unlimited, no API key. 12 translations including English, Urdu. Also has Hadith, Tafsir, Prayer Times.
- [Quran-API](https://github.com/The-Quran-Project/Quran-API) — Open source, no rate limit, self-hostable. Includes English, Urdu, Bengali.
- [Al-Furqan API](https://alfurqan.online/docs) — Free, no API key. 44 reciters, 8 tafseers, Hadith collections.
- Fallback: Pre-bundled static JSON at build time (zero API dependency for core content).

**Data Structure per Ayah:**
```typescript
interface Ayah {
  number: number;           // Global ayah number
  surahNumber: number;
  ayahNumber: number;        // Ayah number within surah
  juz: number;
  hizb: number;
  arabic: string;           // Arabic text with tashkeel
  translations: {
    en: string;              // English (Sahih International / Yusuf Ali)
    hi: string;              // Hindi
    ur: string;              // Urdu
  };
  tafsir?: {
    ibnKathir?: string;
    maududi?: string;
  };
}
```

**Data Pipeline:**
1. Run `scripts/fetch-quran-data.ts` at build time
2. Downloads Arabic text + 3 translations from free APIs (UmmahAPI or Quran-API)
3. Saves as structured JSON in `public/data/quran/`
4. Next.js reads from file system at build (SSG) or runtime (ISR)

### 4.2 Hadith Data

**Initial Scope:** Sahih Bukhari + Sahih Muslim

**Source (Free, No API Key Required):**
- [UmmahAPI](https://ummahapi.com/) — 36,000+ hadiths from 7 major collections, free, unlimited, no API key
- [Al-Furqan API](https://alfurqan.online/docs) — Free hadith download (Bukhari, Muslim, etc.), no API key
- [Sunnah.com](https://sunnah.com) — Pre-processed JSON available

**Data Structure:**
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
  grade: string;              // Sahih, Da'if, etc.
  reference: {
    collection: string;       // "Sahih al-Bukhari"
    book: string;             // "Book of Revelation"
    hadithNumber: number;
    volume?: number;
    bookNumber?: number;
    uscMsa?: string;          // USC-MSA reference
  };
  tags: string[];             // For search/filter
}
```

### 4.3 YouTube / Scholar Videos

**Data Structure:**
```typescript
interface Scholar {
  id: string;
  name: string;
  nameAr: string;
  bio: string;
  image: string;
  channelId: string;
  channelUrl: string;
  featured: boolean;
}

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  scholarId: string;
  scholarName: string;
  thumbnail: string;         // YouTube thumbnail URL
  duration: string;
  publishedAt: string;
  category: string;          // tafsir, seerah, fiqh, etc.
  views: number;
}
```

**Scholar Channels to Include:**
- Dr. Israr Ahmed
- Abu Saad
- Muhammad Ali
- Tuaha ibn Jalil
- Uthman ibn Farooq
- Omar Suleiman
- Yasir Qadhi
- Mufti Menk
- Nouman Ali Khan
- Bilal Philips
- (Expandable via config)

---

## 5. UI/UX Design System

### 5.1 Design Philosophy — "Noor" (Light)

The design draws from Islamic art, architecture, and geometry:
- **Colors:** Deep midnight blues, emerald greens, gold accents (inspired by mosque tiles)
- **Typography:** Elegant Arabic calligraphy for headers, clean sans-serif for body
- **Geometry:** Islamic geometric patterns as subtle backgrounds
- **Lighting:** Warm, golden-hour inspired gradients and glow effects
- **Motifs:** Dome silhouettes, arch shapes, arabesque borders
- **3D:** Interactive 3D Kaaba, floating geometric patterns, lantern glow effects

### 5.2 Color Palette

```css
--color-primary: #1a3a4a;         /* Deep teal - Makkah night sky */
--color-primary-light: #2a5a6a;
--color-secondary: #c8a45c;      /* Gold - mosque domes */
--color-secondary-light: #e8c87c;
--color-accent: #2d7d46;         /* Emerald green - Islam */
--color-accent-light: #4a9d66;
--color-background: #0a1628;     /* Dark navy */
--color-surface: #1a2a3e;       /* Card backgrounds */
--color-surface-light: #2a3a4e;
--color-text: #e8e0d0;          /* Warm white */
--color-text-muted: #9a9080;
--color-border: #2a3a4e;
--color-success: #2d7d46;
--color-warning: #c8a45c;
--color-error: #8b3a3a;
```

### 5.2 Typography

```css
--font-arabic: 'Noto Naskh Arabic', 'Traditional Arabic', serif;
--font-urdu: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif;
--font-primary: 'Inter', system-ui, sans-serif;
--font-display: 'Playfair Display', serif;  // For headings
```

### 5.3 Design Patterns

| Pattern | Implementation |
|---------|---------------|
| **Geometric Backgrounds** | CSS-generated repeating patterns (8-pointed stars, girih tiles) |
| **Mosaic Borders** | CSS gradients + SVG patterns mimicking mosque tilework |
| **Arch Shapes** | `clip-path: polygon(...)` for arch-shaped cards and windows |
| **Glassmorphism** | Backdrop blur on navbars, modals for depth |
| **Gold Accents** | `box-shadow` with gold color on interactive elements |
| **Lantern Glow** | Radial gradient overlays simulating mosque lantern light |
| **Calligraphy** | Arabic text rendered with proper font, golden gradient text |
| **Transition Animations** | Page transitions with fade + scale, surah transitions with slide |
| **3D Kaaba** | Rotating 3D Kaaba model on homepage hero (React Three Fiber) |
| **3D Mosque Scene** | Interactive 3D mosque dome with floating geometric particles |
| **3D Star Particles** | Floating 3D particle system in background (Three.js) |

### 5.3 Page Layouts

#### Homepage
- Hero section: **3D Kaaba model** (rotating, interactive) with geometric pattern background
- Search bar overlaid on 3D scene
- Quick links: Quran, Hadith, Videos, Duas
- Featured scholar video carousel (Framer Motion)
- Today's featured ayah + hadith with fade animations
- 3D floating geometric particles in background

#### Quran Page
- Surah list with Arabic name, English name, revelation type, ayah count
- Click opens surah reader with verse-by-verse display
- Translation tabs: English | Hindi | Urdu
- Juz navigator sidebar
- Ayah bookmarking, sharing, copy
- Page transitions with Framer Motion (fade + slide)

#### Hadith Page
- Collection selector (Bukhari / Muslim)
- Book/chapter navigation
- Hadith card with:
  - Arabic text
  - English translation
  - Narrator chain
  - Grade (Sahih, Da'if, etc.)
  - Full reference (collection, book, number)
  - Share/bookmark

#### Video Library
- Scholar filter chips
- Category filter (Tafsir, Seerah, Fiqh, etc.)
- Grid of video cards with YouTube thumbnails
- Click opens embedded player with scholar info
- "Latest from scholars" section

#### Search
- Global search across Quran, Hadith, and Videos
- Filters for content type, language, collection
- Highlighted results with context

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)

| Step | Task | Details |
|------|------|---------|
| 1.1 | Initialize Next.js project | `npx create-next-app@latest` with TypeScript, App Router, Tailwind |
| 1.2 | Install dependencies | shadcn/ui, framer-motion, three, @react-three/fiber, @react-three/drei, zustand, @tanstack/react-query, fuse.js, zod |
| 1.3 | Set up Tailwind theme | Islamic color palette, custom fonts, geometric patterns |
| 1.4 | Create layout components | Navbar, Footer, Sidebar, MobileNav with Islamic styling |
| 1.5 | Build data pipeline | Scripts to fetch Quran + Hadith JSON from free APIs, validate with Zod |
| 1.6 | Create type definitions | All TypeScript interfaces for Quran, Hadith, Videos, Scholars, 3D |

### Phase 2: Quran Module (Week 2-3)

| Step | Task | Details |
|------|------|---------|
| 2.1 | Surah index page | List all 114 surahs with metadata, search/filter |
| 2.2 | Surah reader page | Verse-by-verse display with Arabic + 3 translations |
| 2.3 | Translation tabs | Toggle between English, Hindi, Urdu per verse |
| 2.4 | Juz navigator | Jump between juz, display juz boundaries |
| 2.5 | Ayah actions | Bookmark (localStorage), copy, share |
| 2.6 | Quran search | Search by keyword across all translations |
| 2.7 | Audio integration | Optional: link to Quran audio recitations from free Al-Furqan API |

### Phase 3: Hadith Module (Week 3-4)

| Step | Task | Details |
|------|------|---------|
| 3.1 | Collection index | Bukhari & Muslim collection pages with metadata |
| 3.2 | Book/chapter nav | Hierarchical navigation through books and chapters |
| 3.3 | Hadith card | Display Arabic + English, narrator, grade, full reference |
| 3.4 | Reference display | Format: "Sahih al-Bukhari, Book of Revelation, Hadith 1" |
| 3.5 | Hadith search | Search across collections by text, narrator, topic |
| 3.6 | Grade filtering | Filter by authenticity grade (Sahih, Hasan, Da'if) |

### Phase 4: Video Library (Week 4-5)

| Step | Task | Details |
|------|------|---------|
| 4.1 | Scholar config | Define scholar profiles with channel IDs, images, bios |
| 4.2 | YouTube API integration | Fetch latest videos from each channel |
| 4.3 | Video grid | Responsive grid with thumbnails, titles, scholar name |
| 4.4 | Video player | Embedded YouTube player with custom poster overlay |
| 4.5 | Category filtering | Tafsir, Seerah, Fiqh, Aqeedah, Duas, etc. |
| 4.6 | Scholar pages | Dedicated pages per scholar with bio + video list |

### Phase 5: Search & Advanced Features (Week 5-6)

| Step | Task | Details |
|------|------|---------|
| 5.1 | Global search | Unified search across Quran, Hadith, Videos |
| 5.2 | Fuse.js integration | Client-side fuzzy search with relevance scoring |
| 5.3 | Bookmarking | localStorage-based bookmark system for ayahs & hadith |
| 5.4 | Share functionality | Share ayahs/hadith as text or social cards |
| 5.5 | SEO optimization | Dynamic metadata, JSON-LD structured data, sitemap |
| 5.6 | PWA support | Service worker, manifest, offline access to cached content |

### Phase 6: Polish & Launch (Week 6-7)

| Step | Task | Details |
|------|------|---------|
| 6.1 | Performance audit | Lighthouse scores, Core Web Vitals optimization |
| 6.2 | Responsive testing | Mobile, tablet, desktop breakpoints |
| 6.3 | Accessibility | ARIA labels, keyboard nav, screen reader testing |
| 6.4 | Dark/light mode | Theme toggle with system preference detection |
| 6.5 | Loading states | Skeleton screens, progressive loading for 3D |
| 6.6 | Error boundaries | Graceful error handling for API failures |
| 6.7 | Deploy to Cloudflare Pages | Configure CI/CD via GitHub, custom domain, free SSL |

---

## 7. Key Implementation Details

### 7.1 Islamic Architecture UI Components

**Geometric Pattern Background:**
```tsx
// components/shared/GeometricPattern.tsx
// SVG-based repeating geometric patterns (8-pointed stars, girih)
// Overlay with subtle opacity on hero sections and cards
```

**Arch Card Component:**
```tsx
// The card top is shaped like a mosque arch using clip-path
// Gold border gradient, inner glow on hover
```

**Mosaic Divider:**
```tsx
// Horizontal divider with repeating geometric tile pattern
// Used between major sections
```

**Lantern Effect:**
```css
/* Radial gradient overlay for warm lighting effect */
background: radial-gradient(ellipse at center, rgba(200,164,92,0.15) 0%, transparent 70%);
```

### 7.2 3D Components (React Three Fiber)

**3D Kaaba Model (`src/components/three/KaabaModel.tsx`):**
```tsx
// Load free Kaaba GLTF model from Sketchfab (CC0 license)
// Auto-rotate on homepage hero
// Click to interact / orbit
// Gold wireframe glow effect
// Suspense fallback with loading spinner
```

**3D Mosque Scene (`src/components/three/MosqueScene.tsx`):**
```tsx
// Interactive 3D mosque dome with geometric patterns
// Floating particles (stars) in background
// Ambient lighting with warm golden hue
// Camera orbit controls for user interaction
```

**3D Geometric Particles (`src/components/three/StarParticles.tsx`):**
```tsx
// 3D particle system with Islamic geometric shapes
// Slow rotation, golden glow
// Mouse interaction (particles follow cursor)
```

**3D Scene Setup (`src/components/three/Scene3D.tsx`):**
```tsx
// Canvas wrapper with:
// - Suspense boundary for model loading
// - Ambient + directional lighting (warm tones)
// - Environment map (golden hour)
// - Performance optimizations (dpr, framerate)
// - Responsive sizing
```

**Free 3D Model Sources:**
- [Sketchfab - Free Kaaba Model](https://sketchfab.com/3d-models/kaaba-68575d6bf6e643eebda29205e8d0dc23) (CC0, free download)
- [Sketchfab - Free Mosque Models](https://sketchfab.com/tags/mosque) (various free/CC0)
- [Tripo AI - Free Islamic Architecture](https://studio.tripo3d.ai/3d-model-gallery/islamic-architecture) (free GLB downloads)
- [3DExport - Free Mosque Models](https://3dexport.com/free-3d-models/mosque) (free downloads)

### 7.3 Framer Motion + 3D Animation Strategy

| Animation | Library | Effect |
|-----------|---------|--------|
| Page transitions | Framer Motion | Fade + scale between routes |
| Surah verse reveal | Framer Motion | Staggered fade-in per verse |
| Hadith card entry | Framer Motion | Slide-up with spring physics |
| Video card hover | Framer Motion | Scale + glow effect |
| 3D Kaaba rotation | React Three Fiber (useFrame) | Continuous slow rotation, interactive orbit |
| 3D particles | Three.js (PointsMaterial) | Floating geometric shapes, mouse-follow |
| Scroll-triggered 3D | Framer Motion + R3F | Scroll controls affect 3D scene camera |
| Page transitions | Framer Motion (AnimatePresence) | Route change fade + scale |

### 7.3 YouTube Data Integration

**Scholar Configuration (`src/config/scholars.ts`):**
```typescript
export const scholars: Scholar[] = [
  {
    id: 'dr-israr-ahmed',
    name: 'Dr. Israr Ahmed',
    nameAr: 'ڈاکٹر اسرار احمد',
    channelId: 'UC...',
    image: '/images/scholars/dr-israr.jpg',
    bio: '...',
    categories: ['tafsir', 'seerah', 'aqeedah'],
    playlists: {
      tafsir: 'PL...',
      seerah: 'PL...',
    }
  },
  // ... more scholars
]
```

**YouTube API Integration:**
- Use YouTube Data API v3 to fetch:
  - Channel uploads (latest videos)
  - Playlist items (curated series)
  - Video statistics (views, duration)
- Cache results in localStorage or IndexedDB (TTL: 1 hour)
- Fallback to static data if API fails

### 7.3 Performance Strategy

| Technique | Application |
|-----------|-------------|
| **Static Generation (SSG)** | All Quran surah pages, hadith collection pages |
| **Incremental Static Regeneration (ISR)** | Video pages (revalidate every 6 hours) |
| **Lazy Loading** | Hadith books loaded on demand, not all at once |
| **Image Optimization** | Next.js `<Image>` for scholar photos, YouTube thumbnails |
| **Code Splitting** | Route-based splitting, dynamic imports for heavy components (3D) |
| **Font Optimization** | `next/font` for Arabic, Urdu, and Latin fonts |
| **Bundle Analysis** | `@next/bundle-analyzer` to monitor bundle size |
| **3D Lazy Loading** | Dynamic import of R3F components (not loaded on every page) |

### 7.4 SEO Strategy

- **JSON-LD Structured Data:** IslamicContent, Quran, Hadith schemas
- **Dynamic OG Images:** `@vercel/og` or `@cloudflare/og` for social share cards
- **Sitemap:** Dynamic sitemap.xml for all Quran/Hadith pages
- **Robots.txt:** Proper crawling directives
- **Canonical URLs:** Prevent duplicate content issues
- **Meta Tags:** Arabic title, description per page

### 7.5 Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation for Quran/Hadith reading
- Focus management for modal dialogs
- Screen reader announcements for search results
- Sufficient color contrast (WCAG AA minimum)
- Reduced motion support for animations (respects `prefers-reduced-motion`)

### 7.6 Premium Component Library — Sourced from Top Design Systems

Components hand-picked from 10 premium design systems to give the Quran website a luxury Islamic aesthetic with 3D, interactivity, and motion. All are open source / free-tier.

| Source | Component | Use Case in Quran Website | Why It Fits |
|--------|-----------|--------------------------|-------------|
| **[21st.dev](https://21st.dev)** | Heroes, Backgrounds, Shaders, Scroll Areas, Globes, Marquees, Testimonials | Homepage hero with 3D Kaaba background, surah scroll transitions, scholar testimonial carousel | Largest library of community components — scroll-driven animations, shader backgrounds, interactive globes perfect for Islamic geometric patterns |
| **[Spell UI](https://spell.sh)** | Perspective Book, Light Rays, Exploding Input, Animated Gradient, Signature, Pop Button, Spotify Card, Perspective Grid | Quran page turning effect (Perspective Book), golden light rays on hero, exploding search input, animated gradient dividers | Ultra-premium refined components with light ray effects perfectly matching the "Noor" (light) design philosophy |
| **[Vengeance UI](https://www.vengenceui.com)** | Pixelated Image Trail, Flip Text, Morph Text, Glass Dock, Spotlight Navbar, Animated Rays, Staggered Grid, Kinetic Loader, Cursor Card | Glassmorphism dock for surah navigation, spotlight navbar glow, kinetic loader while Quran loads, image trails for scholar photos, morph text for Arabic/English switching | Unique interaction patterns — displacement hover effects, animated tooltips, scroll-driven cards. Glass dock + spotlight navbar give a premium MacOS-style Islamic UI |
| **[Skiper UI](https://skiper-ui.com)** | Image Reveal, Dynamic Island, Image Cursor Trail, Hover Members, Things Drag & Scroll, Vercel Tooltip | Floating dynamic island for ayah bookmark status, image reveal on scholar hover, cursor trail with sparkle effect, drag-to-scroll through surah list | 106+ components with rare interaction patterns. Dynamic island and image cursor trail add "wow" factor |
| **[Fancy Components](https://www.fancycomponents.dev)** | Gravity, Text Highlighter, CSS Box, Image Trail, Marquee Along SVG Path | Gravity text animation on homepage headings, text highlighter for Quran search results, marquee along curved path for Arabic calligraphy | Free & open source micro-interactions. Gravity text gives a magical feel to Bismillah, marquee along SVG path for decorative Arabic calligraphy borders |
| **[Motion](https://motion.dev)** (Framer Motion) | Parallax, Confetti, Typewriter, Skeleton Shimmer, Modal, iOS Pointer, Spring Physics | Parallax scrolling on Quran pages, confetti on completion, typewriter for ayah of the day, skeleton shimmer for loading states | The core animation engine powering all motion in the site. Production-grade spring physics for natural-feeling interactions |
| **[Taste Skill](https://www.tasteskill.dev)** | Anti-slop frontend framework for AI agents — design system rules, motion depth, layout families, dark mode protocol | Design governance for AI agents building the site — ensures consistent Islamic design language across all AI-generated components | Not a component library but a SKILL.md framework that trains AI agents to produce premium, non-generic UIs. Install via `npx skills add Leonxlnx/taste-skill` |
| **[MotionSites](https://motionsites.ai)** | AI-generated hero sections, landing pages, 3D portfolios, glassmorphism heroes, dark mode layouts | Reference inspiration for homepage design — 3D portfolio style hero with Kaaba, glassmorphism cards, luxury dark theme | Collection of 200+ premium animated hero sections and landing page prompts. Use as visual reference for Islamic architectural UI patterns |
| **[Dark Design](https://www.dark.design)** | Curated dark-themed website gallery — dark mode inspiration, premium agency/software sites | Dark mode design reference — the entire Quran website follows a dark navy/gold theme inspired by Makkah night sky | Gallery of 100+ handpicked dark websites. Study patterns from sites like Vercel, Resend, Raycast for premium dark UI with golden accents |
| **[CTA Gallery](https://www.cta.gallery)** | Curated call-to-action buttons, forms, modals, pricing sections, newsletter signups (categorized by industry) | CTA for "Read Quran", "Browse Hadith", "Watch Videos", newsletter signup for daily ayah, pricing/donation section | Specialized CTA design inspiration. CTAs categorized by type (button, form, modal) — use for conversion-optimized Islamic content actions |

### 7.7 Component Integration Plan

```
src/components/
├── borrowed/              # Adapted/ inspired from these sources
│   ├── from-21st/
│   │   ├── HeroBackground.tsx      # Adapted from 21st.dev shader backgrounds
│   │   ├── ScrollReveal.tsx        # Scroll-driven ayah reveal
│   │   └── GlobeScene.tsx          # Interactive 3D globe (optional)
│   ├── from-spell/
│   │   ├── LightRays.tsx           # Golden light rays overlay
│   │   ├── ExplodingSearch.tsx     # Quran/hadith search input
│   │   └── AnimatedGradient.tsx    # Section dividers
│   ├── from-vengeance/
│   │   ├── GlassDock.tsx           # Surah/juz navigation dock
│   │   ├── SpotlightNavbar.tsx     # Premium glowing navbar
│   │   ├── KineticLoader.tsx       # Loading animation
│   │   └── MorphText.tsx           # Arabic/English text morph
│   ├── from-skiper/
│   │   ├── DynamicIsland.tsx       # Bookmark/status indicator
│   │   ├── ImageCursorTrail.tsx    # Scholar hover effect
│   │   └── ImageReveal.tsx         # Scholar card reveal
│   └── from-fancy/
│       ├── GravityText.tsx         # Bismillah gravity animation
│       ├── TextHighlighter.tsx     # Search result highlights
│       └── SVGCalligraphy.tsx      # Decorative Arabic borders
```

**Important note:** These are design inspirations and architectural patterns. Components are NOT directly copy-pasted. Each is re-implemented using the Islamic color palette, geometric motifs, and Arabic calligraphy. The sources provide the *interaction patterns* — the *visual identity* remains uniquely Islamic.

---

## 8. Data Sources & APIs (All Free, No API Key Required)

| Data | Source | Method | Cost |
|------|--------|--------|------|
| Quran Arabic | [UmmahAPI](https://ummahapi.com/quran-api) or [Quran-API](https://github.com/The-Quran-Project/Quran-API) (no rate limit) | Static JSON at build | Free |
| Quran English | UmmahAPI (Sahih Intl, Yusuf Ali, Pickthall) | Static JSON at build | Free |
| Quran Hindi | [AlQuran Cloud](https://api.alquran.cloud/v1/quran/hi.hindi) | Static JSON at build | Free |
| Quran Urdu | [AlQuran Cloud](https://api.alquran.cloud/v1/quran/ur.urdu) or UmmahAPI | Static JSON at build | Free |
| Hadith Bukhari | [UmmahAPI](https://ummahapi.com/) or [Al-Furqan API](https://alfurqan.online/docs) | Static JSON at build | Free |
| Hadith Muslim | [UmmahAPI](https://ummahapi.com/) or [Al-Furqan API](https://alfurqan.online/docs) | Static JSON at build | Free |
| YouTube Videos | [YouTube Data API v3](https://developers.google.com/youtube/v3) (free quota: 10,000 requests/day) | Runtime with caching | Free |
| Scholar Data | Curated config file | Static | Free |
| 3D Models | [Sketchfab](https://sketchfab.com/3d-models/kaaba-68575d6bf6e643eebda29205e8d0dc23) (free CC0) | Static GLTF/GLB | Free |

### 7.3 Framer Motion + 3D Animation Strategy

| Animation | Library | Effect |
|-----------|---------|--------|
| Page transitions | Framer Motion (AnimatePresence) | Fade + scale between routes |
| Surah verse reveal | Framer Motion | Staggered fade-in per verse with spring physics |
| Hadith card entry | Framer Motion | Slide-up with spring, stagger children |
| Video card hover | Framer Motion | Scale + gold glow border |
| 3D Kaaba rotation | React Three Fiber (useFrame) | Continuous slow Y-axis rotation |
| 3D Kaaba interaction | React Three Fiber | Orbit controls, click to zoom |
| 3D particles | Three.js (PointsMaterial) | Floating geometric shapes, mouse-follow |
| 3D mosque scene | React Three Fiber + drei | Environment map, soft shadows, bloom |
| Scroll-driven 3D | Framer Motion scroll | Camera position changes on scroll |
| Loading transitions | Framer Motion | Skeleton pulse, 3D model suspense |

### 7.4 Performance Strategy

| Technique | Application |
|-----------|-------------|
| **Static Generation (SSG)** | All Quran surah pages, hadith collection pages |
| **Incremental Static Regeneration (ISR)** | Video pages (revalidate every 6 hours) |
| **Lazy Loading** | Hadith books loaded on demand, not all at once |
| **Image Optimization** | Next.js `<Image>` for scholar photos, YouTube thumbnails |
| **Code Splitting** | Route-based splitting, dynamic imports for heavy components (3D) |
| **Font Optimization** | `next/font` for Arabic, Urdu, and Latin fonts |
| **Bundle Analysis** | `@next/bundle-analyzer` to monitor bundle size |
| **3D Performance** | `@react-three/drei` performance utils, `r3f-perf` monitor |
| **3D Lazy Load** | Dynamic import: `dynamic(() => import('@/components/three/KaabaModel'), { ssr: false })` |

### 7.6 SEO Strategy

- **JSON-LD Structured Data:** IslamicContent, Quran, Hadith schemas
- **Dynamic OG Images:** `@vercel/og` or `satori` for social share cards
- **Sitemap:** Dynamic sitemap.xml for all Quran/Hadith pages
- **Robots.txt:** Proper crawling directives
- **Canonical URLs:** Prevent duplicate content issues
- **Meta Tags:** Arabic title, description per page

### 7.7 Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation for Quran/Hadith reading
- Focus management for modal dialogs
- Screen reader announcements for search results
- Sufficient color contrast (WCAG AA minimum)
- Reduced motion support for animations (respects `prefers-reduced-motion`)
- 3D fallback: Static image if WebGL unavailable

---

## 8. Data Sources & APIs (All 100% Free, No Payment Required)

| Data | Source | Method | Cost |
|------|--------|--------|------|
| Quran Arabic | [UmmahAPI](https://ummahapi.com/quran-api) (free, no key) | Static JSON at build | Free |
| Quran English | [UmmahAPI](https://ummahapi.com/quran-api) (Sahih Intl, Yusuf Ali, Pickthall) | Static JSON at build | Free |
| Quran Hindi | [AlQuran Cloud](https://api.alquran.cloud/v1/quran/hi.hindi) | Static JSON at build | Free |
| Quran Urdu | [UmmahAPI](https://ummahapi.com/quran-api) or [AlQuran Cloud](https://api.alquran.cloud/v1/quran/ur.urdu) | Static JSON at build | Free |
| Hadith Bukhari | [UmmahAPI](https://ummahapi.com/) (36,000+ hadiths, free) | Static JSON at build | Free |
| Hadith Muslim | [UmmahAPI](https://ummahapi.com/) or [Al-Furqan API](https://alfurqan.online/docs) | Static JSON at build | Free |
| YouTube Videos | [YouTube Data API v3](https://developers.google.com/youtube/v3) (free: 10,000 requests/day) | Runtime with caching | Free |
| Scholar Data | Curated config file | Static | Free |
| 3D Models | [Sketchfab](https://sketchfab.com/3d-models/kaaba-68575d6bf6e643eebda29205e8d0dc23) (free CC0) | Static GLTF/GLB | Free |
| Fonts | [Google Fonts](https://fonts.google.com/) (Noto Naskh Arabic, Noto Nastaliq Urdu, Inter) | CDN | Free |
| Icons | [Lucide React](https://lucide.dev/) | MIT | Free |

---

## 8. Key Design Decisions

### 8.1 Why Hybrid (Static + Dynamic)?

- **Static:** Quran pages, hadith pages — these rarely change, benefit from CDN caching, instant load
- **Dynamic:** Search, bookmarks, YouTube video list — need real-time data or user interaction
- **ISR:** Video pages revalidate every few hours to show latest content

### 8.2 Why Fuse.js for Search?

- No backend database needed
- Works entirely client-side with pre-loaded indexes
- Fuzzy matching handles typos in Arabic transliterations
- Can be extended to Meilisearch later for scale

### 8.3 Hadith Reference Format

Standardized reference display:
```
Sahih al-Bukhari 1
  Book 1: Revelation
  Chapter 1: How the Divine Revelation started
  Narrated by 'Aisha (RA)
  Grade: Sahih
```

### 8.4 Why Cloudflare Pages (Not Vercel)?

| Factor | Cloudflare Pages (Free) | Vercel (Hobby) |
|--------|------------------------|----------------|
| **Bandwidth** | Unlimited | 100 GB |
| **Builds** | 500/month | 6,000 build minutes |
| **SSL** | Free automatic | Free automatic |
| **CDN** | 330+ global data centers | Global edge network |
| **Commercial use** | Allowed | **Not allowed** on free tier |
| **Custom domains** | Unlimited | Unlimited |
| **Functions** | 100k Workers req/day | 1M invocations |
| **Analytics** | Free Cloudflare Analytics | $20/mo for Pro |

**Cloudflare Pages Free Tier Details:**
- Unlimited bandwidth (no overage charges)
- 500 builds per month
- Free SSL (automatic)
- Global CDN (330+ data centers)
- 100 custom domains per project
- Free Cloudflare Web Analytics (privacy-first)
- Git integration (auto-deploy on push)

### 8.3 Hadith Reference Format

Standardized reference display:
```
Sahih al-Bukhari 1
  Book 1: Revelation
  Chapter 1: How the Divine Revelation started
  Narrated by 'Aisha (RA)
  Grade: Sahih
```

### 8.4 Why Cloudflare Pages (Not Vercel)?

| Factor | Cloudflare Pages (Free) | Vercel (Hobby) |
|--------|------------------------|----------------|
| **Bandwidth** | Unlimited | 100 GB |
| **Commercial use** | Allowed | **Not allowed** |
| **SSL** | Free automatic | Free automatic |
| **CDN** | 330+ data centers | Global edge |
| **Builds** | 500/month | 6,000 min/month |
| **Analytics** | Free Cloudflare Web Analytics | Not included |
| **Cost** | **$0 forever** | Free tier, but no commercial use |

---

## 9. Future Enhancements (Post-MVP)

- [ ] User accounts (auth) with cloud-synced bookmarks
- [ ] Tafsir integration (Ibn Kathir, Maududi, Tabari)
- [ ] Quran audio recitation player (free from Al-Furqan API — 44 reciters)
- [ ] Prayer times widget (UmmahAPI — free, 22 methods)
- [ ] Islamic calendar (Hijri date) via UmmahAPI
- [ ] Daily ayah/hadith notification
- [ ] PDF export of surahs/hadith collections
- [ ] Community notes/tafsir
- [ ] More hadith collections (Abu Dawud, Tirmidhi, Nasai, Ibn Majah)
- [ ] Multi-language UI (Arabic, English, Urdu, Hindi, Indonesian, etc.)
- [ ] Mobile app (React Native or PWA)
- [ ] More 3D scenes (Madina, Dome of the Rock)

---

## 10. AI Agent Execution Guide

### For opencode / Codex / Cursor / Antigravity:

**Step 1: Project Setup**
```bash
npx create-next-app@latest quran-website --typescript --tailwind --app
cd quran-website
npx shadcn@latest init
npm install framer-motion three @react-three/fiber @react-three/drei zustand @tanstack/react-query fuse.js zod
npm install -D @types/three
```

**Step 2: Data Fetching**
- Run `scripts/fetch-quran-data.ts` to download all Quran JSON from free APIs
- Run `scripts/fetch-hadith-data.ts` to download Bukhari + Muslim from UmmahAPI
- Place all JSON in `public/data/`

**Step 3: Build Components**
- Start with layout (Navbar, Footer, Sidebar)
- Build Quran reader (most complex component)
- Build Hadith viewer
- Build Video library
- Add 3D components (Kaaba model, mosque scene, particles)
- Add search

**Step 4: Styling**
- Configure Tailwind with Islamic color palette
- Add geometric pattern utilities
- Implement arch-shaped cards, mosaic borders
- Add Framer Motion animations (page transitions, verse reveals)
- Add 3D scenes with React Three Fiber

**Step 5: Deploy**
- `npm run build` — verify no errors
- Push to GitHub
- Connect to Cloudflare Pages (free)
- Set environment variables (YouTube API key)
- Deploy — Cloudflare auto-detects Next.js

### Key Files for Each Agent:

| Agent | Focus Area |
|-------|-----------|
| **opencode** | Full-stack implementation, data pipeline, API routes |
| **Codex** | Component architecture, TypeScript types, data flow |
| **Cursor** | UI components, Tailwind styling, Framer Motion animations |
| **Antigravity** | Full project scaffolding, 3D components, deployment config |

---

## 11. Dependencies (100% Open Source)

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "framer-motion": "^11.0",
    "three": "^0.170",
    "@react-three/fiber": "^8.0",
    "@react-three/drei": "^9.0",
    "@tanstack/react-query": "^5.0",
    "zustand": "^4.5",
    "fuse.js": "^7.0",
    "zod": "^3.22",
    "lucide-react": "^0.400",
    "clsx": "^2.1",
    "tailwind-merge": "^2.3"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/three": "^0.170",
    "tailwindcss": "^3.4",
    "postcss": "^8",
    "autoprefixer": "^10",
    "eslint": "^8",
    "eslint-config-next": "^14",
    "prettier": "^3",
    "prettier-plugin-tailwindcss": "^0.5"
  }
}
```

---

## 12. Environment Variables

```env
# .env.local
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
NEXT_PUBLIC_SITE_URL=https://quran-website.pages.dev
```

---

## 13. Deployment (100% Free on Cloudflare Pages)

1. Push to GitHub (free)
2. Connect to Cloudflare Pages (free tier, no credit card needed)
3. Set build command: `npm run build`
4. Set output directory: `out`
5. Set environment variables in Cloudflare dashboard
6. Deploy — Cloudflare auto-detects Next.js
7. Get free `*.pages.dev` subdomain or use custom domain
8. Free SSL automatic
9. Enable ISR for video pages

**Why Cloudflare Pages over Vercel:**
- Unlimited bandwidth (Vercel: 100 GB cap)
- Commercial use allowed on free tier (Vercel forbids it)
- Free Cloudflare Web Analytics included
- 330+ edge locations vs Vercel's network
- No credit card required to start

---

## 9. Future Enhancements (Post-MVP)

- [ ] User accounts (auth) with cloud-synced bookmarks
- [ ] Tafsir integration (Ibn Kathir, Maududi, Tabari) via UmmahAPI
- [ ] Quran audio recitation player (free from Al-Furqan API — 44 reciters)
- [ ] Prayer times widget (UmmahAPI — free, 22 methods)
- [ ] Islamic calendar (Hijri date) via UmmahAPI
- [ ] Daily ayah/hadith notification
- [ ] PDF export of surahs/hadith collections
- [ ] Community notes/tafsir
- [ ] More hadith collections (Abu Dawud, Tirmidhi, Nasai, Ibn Majah)
- [ ] Multi-language UI (Arabic, English, Urdu, Hindi, Indonesian, etc.)
- [ ] Mobile app (React Native or PWA)
- [ ] More 3D scenes (Madina, Dome of the Rock, floating lanterns)

---

## 10. AI Agent Execution Guide

### For opencode / Codex / Cursor / Antigravity:

**Step 1: Project Setup**
```bash
npx create-next-app@latest quran-website --typescript --tailwind --app
cd quran-website
npx shadcn@latest init
npm install framer-motion three @react-three/fiber @react-three/drei zustand @tanstack/react-query fuse.js zod
npm install -D @types/three
```

**Step 2: Data Fetching**
- Run `scripts/fetch-quran-data.ts` to download all Quran JSON from free APIs
- Run `scripts/fetch-hadith-data.ts` to download Bukhari + Muslim from UmmahAPI
- Place all JSON in `public/data/`

**Step 3: Build Components**
- Start with layout (Navbar, Footer, Sidebar)
- Build Quran reader (most complex component)
- Build Hadith viewer
- Build Video library
- Build 3D components (Kaaba model, mosque scene, particles)
- Add search

**Step 4: Styling**
- Configure Tailwind with Islamic color palette
- Add geometric pattern utilities
- Implement arch-shaped cards, mosaic borders
- Add Framer Motion animations (page transitions, verse reveals)
- Add 3D scenes with React Three Fiber

**Step 5: Deploy**
- `npm run build` — verify no errors
- Push to GitHub (free)
- Connect to Cloudflare Pages (free, no credit card)
- Set environment variables (YouTube API key)
- Deploy — Cloudflare auto-detects Next.js
- Get free `*.pages.dev` subdomain

### Key Files for Each Agent:

| Agent | Focus Area |
|-------|-----------|
| **opencode** | Full-stack implementation, data pipeline, API routes |
| **Codex** | Component architecture, TypeScript types, data flow |
| **Cursor** | UI components, Tailwind styling, Framer Motion animations |
| **Antigravity** | Full project scaffolding, 3D components, deployment config |

---

## 11. Dependencies (100% Open Source)

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "framer-motion": "^11.0",
    "three": "^0.170",
    "@react-three/fiber": "^8.0",
    "@react-three/drei": "^9.0",
    "@tanstack/react-query": "^5.0",
    "zustand": "^4.5",
    "fuse.js": "^7.0",
    "zod": "^3.22",
    "lucide-react": "^0.400",
    "clsx": "^2.1",
    "tailwind-merge": "^2.3"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/three": "^0.170",
    "tailwindcss": "^3.4",
    "postcss": "^8",
    "autoprefixer": "^10",
    "eslint": "^8",
    "eslint-config-next": "^14",
    "prettier": "^3",
    "prettier-plugin-tailwindcss": "^0.5"
  }
}
```

---

## 12. Environment Variables

```env
# .env.local
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
NEXT_PUBLIC_SITE_URL=https://quran-website.pages.dev
```

---

## 13. Deployment (100% Free on Cloudflare Pages)

1. Push to GitHub (free)
2. Connect to Cloudflare Pages (free tier, no credit card required)
3. Set build command: `npm run build`
4. Set output directory: `out`
5. Set environment variables in Cloudflare dashboard
6. Deploy — Cloudflare auto-detects Next.js
7. Get free `*.pages.dev` subdomain
8. Free SSL automatic
9. Enable ISR for video pages

**No paid services required at any point:**
- Hosting: Cloudflare Pages (free, unlimited bandwidth)
- Quran data: UmmahAPI (free, no API key)
- Hadith data: UmmahAPI (free, no API key)
- 3D models: Sketchfab (free CC0 downloads)
- Fonts: Google Fonts (free, OFL license)
- Icons: Lucide (free, MIT license)
- Analytics: Cloudflare Web Analytics (free)
- Domain: `*.pages.dev` free subdomain or use a free Freenom domain

---

## 9. Future Enhancements (Post-MVP)

- [ ] User accounts (auth) with cloud-synced bookmarks
- [ ] Tafsir integration (Ibn Kathir, Maududi, Tabari) via UmmahAPI
- [ ] Quran audio recitation player (free from Al-Furqan API — 44 reciters)
- [ ] Prayer times widget (UmmahAPI — free, 22 methods)
- [ ] Islamic calendar (Hijri date) via UmmahAPI
- [ ] Daily ayah/hadith notification
- [ ] PDF export of surahs/hadith collections
- [ ] Community notes/tafsir
- [ ] More hadith collections (Abu Dawud, Tirmidhi, Nasai, Ibn Majah)
- [ ] Multi-language UI (Arabic, English, Urdu, Hindi, Indonesian, etc.)
- [ ] Mobile app (React Native or PWA)
- [ ] More 3D scenes (Madina, Dome of the Rock, floating lanterns)

---

## 10. AI Agent Execution Guide

### For opencode / Codex / Cursor / Antigravity:

**Step 1: Project Setup**
```bash
npx create-next-app@latest quran-website --typescript --tailwind --app
cd quran-website
npx shadcn@latest init
npm install framer-motion three @react-three/fiber @react-three/drei zustand @tanstack/react-query fuse.js zod
npm install -D @types/three
```

**Step 2: Data Fetching**
- Run `scripts/fetch-quran-data.ts` to download all Quran JSON from free APIs
- Run `scripts/fetch-hadith-data.ts` to download Bukhari + Muslim from UmmahAPI
- Place all JSON in `public/data/`

**Step 3: Build Components**
- Start with layout (Navbar, Footer, Sidebar)
- Build Quran reader (most complex component)
- Build Hadith viewer
- Build Video library
- Build 3D components (Kaaba model, mosque scene, particles)
- Add search

**Step 4: Styling**
- Configure Tailwind with Islamic color palette
- Add geometric pattern utilities
- Implement arch-shaped cards, mosaic borders
- Add Framer Motion animations (page transitions, verse reveals)
- Add 3D scenes with React Three Fiber

**Step 5: Deploy**
- `npm run build` — verify no errors
- Push to GitHub (free)
- Connect to Cloudflare Pages (free, no credit card)
- Set environment variables (YouTube API key)
- Deploy — Cloudflare auto-detects Next.js
- Get free `*.pages.dev` subdomain

### Key Files for Each Agent:

| Agent | Focus Area |
|-------|-----------|
| **opencode** | Full-stack implementation, data pipeline, API routes |
| **Codex** | Component architecture, TypeScript types, data flow |
| **Cursor** | UI components, Tailwind styling, Framer Motion animations |
| **Antigravity** | Full project scaffolding, 3D components, deployment config |

---

## 11. Dependencies (100% Open Source)

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "framer-motion": "^11.0",
    "three": "^0.170",
    "@react-three/fiber": "^8.0",
    "@react-three/drei": "^9.0",
    "@tanstack/react-query": "^5.0",
    "zustand": "^4.5",
    "fuse.js": "^7.0",
    "zod": "^3.22",
    "lucide-react": "^0.400",
    "clsx": "^2.1",
    "tailwind-merge": "^2.3"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/three": "^0.170",
    "tailwindcss": "^3.4",
    "postcss": "^8",
    "autoprefixer": "^10",
    "eslint": "^8",
    "eslint-config-next": "^14",
    "prettier": "^3",
    "prettier-plugin-tailwindcss": "^0.5"
  }
}
```

---

## 12. Environment Variables

```env
# .env.local
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
NEXT_PUBLIC_SITE_URL=https://quran-website.pages.dev
```

---

## 13. Deployment (100% Free — No Credit Card Needed)

1. Push to GitHub (free)
2. Connect to Cloudflare Pages (free tier, no credit card required)
3. Set build command: `npm run build`
4. Set output directory: `out`
5. Set environment variables in Cloudflare dashboard
6. Deploy — Cloudflare auto-detects Next.js
7. Get free `*.pages.dev` subdomain
8. Free SSL automatic
9. Enable ISR for video pages

**No paid services required at any point:**
- Hosting: Cloudflare Pages (free, unlimited bandwidth)
- Quran data: UmmahAPI (free, no API key)
- Hadith data: UmmahAPI (free, no API key)
- 3D models: Sketchfab (free CC0 downloads)
- Fonts: Google Fonts (free, OFL license)
- Icons: Lucide (free, MIT license)
- Analytics: Cloudflare Web Analytics (free)
- Domain: `*.pages.dev` free subdomain

---

## 14. Success Metrics

- Lighthouse score: 95+ Performance, 100 Accessibility, 100 SEO
- All 114 surahs loadable with 3 translations
- 7000+ hadith from Bukhari & Muslim searchable
- 50+ scholar videos displayed
- 3D Kaaba model loads and rotates smoothly
- < 1s Time to Interactive on desktop
- < 2s Largest Contentful Paint
- 0 Cumulative Layout Shift
- Zero cost for hosting, data, or software
