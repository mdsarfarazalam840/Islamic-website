# Noor Al-Quds — Design System

> **نور القدس** — *Light of the Sacred*
>
> A premium, awe-inspiring design language for the digital Quran & Hadith experience.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [The "Chamber" Concept](#2-the-chamber-concept)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Spatial System](#5-spatial-system)
6. [Atmosphere & Lighting](#6-atmosphere--lighting)
7. [Navigation Architecture](#7-navigation-architecture)
8. [Page Designs](#8-page-designs)
   - 8.1 Homepage — "The Grand Foyer"
   - 8.2 Quran Reader — "The Scriptorium" (Triptych)
   - 8.3 Hadith — "The Chain Library"
   - 8.4 Videos — "The Assembly Hall"
   - 8.5 Search — "The Beacon"
   - 8.6 About — "The Colophon"
9. [Component Design](#9-component-design)
10. [3D & Environment](#10-3d--environment)
11. [Animation Language](#11-animation-language)
12. [Mobile Experience](#12-mobile-experience)
13. [Light Mode — "Dawn"](#13-light-mode--dawn)
14. [Implementation Guide](#14-implementation-guide)

---

## 1. Design Philosophy

### Core Emotion: **Awe & Grandeur**

Every pixel serves one purpose: to make the visitor feel they have entered a sacred space. The website is not a "tool" — it is a **destination**. The feeling should mirror walking into a great mosque: the vastness, the hush, the gold catching light, the calligraphy drawing the eye upward.

### Design Pillars

| Pillar | Manifestation |
|--------|---------------|
| **The Sacred** | Nothing feels casual. Every interaction has weight and intentionality. |
| **The Celestial** | Darkness dotted with points of light — like the night sky over Makkah. Deep space blues, not flat blacks. |
| **The Monumental** | Scale is dramatic. Typography is generous. Whitespace is not empty — it is *breathing room*. |
| **The Crafted** | Every detail is hand-considered. Gold is never flat — it always has gradient, glow, or grain. |
| **The Unified** | Different pages are different "chambers" in the same sacred building — connected by a consistent atmospheric language. |

### What Makes This Unique

No existing Islamic website uses this approach:
- **Chamber-based navigation** instead of flat pages
- **Atmospheric lighting as a UX signal** — darker chambers for deep reading, brighter for browsing
- **Vanishing/reappearing navigation** — the interface steps aside so the content commands reverence
- **Triptych Quran reader** — three-panel manuscript layout never seen in digital Quran apps
- **Geometric veil transitions** — Islamic patterns as page transition effects, not just static backgrounds

---

## 2. The "Chamber" Concept

Every page is a **chamber** in a great spiritual building. The navigation between chambers should feel like walking from one room to another — not clicking links on a screen.

### Chamber Types

| Chamber | Page | Lighting | Mood |
|---------|------|----------|------|
| **Grand Foyer** | Homepage | Warm golden, high contrast | Welcoming, awe-inspiring |
| **Scriptorium** | Quran Reader | Focused, intimate — dimmed periphery | Contemplative, sacred |
| **Chain Library** | Hadith | Warm ambient, even light | Scholarly, grounded |
| **Assembly Hall** | Videos | Brighter, energetic | Engaging, communal |
| **Beacon** | Search | Focused beam effect | Clear, precise |
| **Cloister** | About | Soft, muted | Reflective, intimate |

### Transition Between Chambers

When navigating between chambers, a **geometric veil** animates:
1. Current page content fades into darkness
2. A gold Islamic geometric pattern (8-pointed star tessellation) expands from the center
3. The pattern dissolves to reveal the new chamber's content

This replaces abrupt route changes with a ceremonial transition.

---

## 3. Color System

### Dark Theme Default — "The Night"

The default state. Inspired by the night sky above the Masjid al-Haram — infinite darkness punctuated by gold light.

```
--space-deep:      oklch(0.03 0.015 260)   #050a14  — Absolute deepest background
--space-navy:      oklch(0.06 0.025 260)   #0b1424  — Primary background
--space-surface:   oklch(0.10 0.03 260)    #141f33  — Card/surface backgrounds
--space-mid:       oklch(0.16 0.04 260)    #1f2e45  — Elevated surfaces
--space-light:     oklch(0.22 0.05 260)    #2a3d57  — Borders, dividers

--gold-light:      oklch(0.85 0.10 85)     #e8d48b  — Bright gold (CTAs, highlights)
--gold-main:       oklch(0.78 0.09 85)     #d4af37  — Primary gold (accents, icons)
--gold-dim:        oklch(0.65 0.08 85)     #b8922e  — Muted gold (borders, secondary)
--gold-glow:       oklch(0.80 0.10 85 / 0.3)        — Gold glow (shadows, lens flares)

--emerald:         oklch(0.50 0.14 160)    #1a8a5c  — Success, completion, "green light"
--emerald-dim:     oklch(0.40 0.12 160)    #0d6b44  — Muted emerald

--text-primary:    oklch(0.92 0.02 80)     #e8e0d0  — Body text
--text-muted:      oklch(0.65 0.03 80)     #9a9080  — Secondary text
--text-dim:        oklch(0.45 0.03 80)     #6b6255  — Tertiary, placeholders

--destructive:     oklch(0.55 0.20 25)     #b33a3a  — Errors only
```

### Gold Gradient System

Gold is **never** a flat color. It always has a gradient to simulate metallic foil reflectivity:

```
--gold-gradient-primary:  linear-gradient(135deg, #d4af37 0%, #f5d77b 40%, #d4af37 70%, #b8922e 100%)
--gold-gradient-warm:     linear-gradient(135deg, #c9a227 0%, #e8d48b 50%, #b8922e 100%)
--gold-gradient-subtle:   linear-gradient(180deg, oklch(0.78 0.09 85 / 0.15), oklch(0.65 0.08 85 / 0.05))
--gold-shimmer:           conic-gradient(from 0deg, #d4af37, #f5d77b, #d4af37, #b8922e, #d4af37)
```

### Color Usage Rules

- Gold is **10-15%** of any viewport — accent only, never a background fill
- Never place gold text on white/cream backgrounds (accessibility fail)
- **Emerald is reserved** for "complete" states, success confirmations, and active indicators — never decorative
- All shadows on interactive elements should have a gold tint (`rgba(212, 175, 55, x)`)
- Cards use `space-surface` with a `gold-dim` border at `0.15` opacity — visible only on hover

---

## 4. Typography

### Font Stack

| Role | Font | Weight | Letter Spacing |
|------|------|--------|----------------|
| Display (English) | Playfair Display | 700, 900 | `-0.03em` |
| Display (Arabic) | Noto Naskh Arabic | 600 | normal |
| Body | Inter | 300, 400, 500 | normal |
| UI Elements | Inter | 500, 600 | `+0.02em` |

### Scale

```css
--text-xs:   0.75rem   (12px)
--text-sm:   0.875rem  (14px)
--text-base: 1rem      (16px)
--text-lg:   1.125rem  (18px)
--text-xl:   1.25rem   (20px)
--text-2xl:  1.5rem    (24px)
--text-3xl:  2rem      (32px)     /* Section headings */
--text-4xl:  2.5rem    (40px)     /* Page titles */
--text-5xl:  3.5rem    (56px)     /* Chamber names */
--text-6xl:  5rem      (80px)     /* Homepage "Noor" */
--text-7xl:  6rem      (96px)     /* Large calligraphy */
```

### Gold Drop-Cap

The first letter of the Bismillah on each surah page, and the first ayah of each surah:
- Font: Playfair Display 900
- Size: `3em` line-height: `0.8`
- Color: `var(--gold-light)` with `var(--gold-gradient-primary)` applied via `background-clip: text`
- Floats left, surrounded by the Arabic text

### Arabic Typography Rules

- Quranic Arabic: minimum `text-3xl` on mobile, `text-4xl` on desktop
- Line height: `2.2` minimum
- Word spacing: `0.05em` for readability
- Ayah numbers: Eastern Arabic numerals (؎), sized at 60% of the ayah text, in `gold-dim`
- End-of-verse markers: use Unicode ﴿ ﴾ in `gold-dim` at 70% size

---

## 5. Spatial System

### Grid

12-column grid with generous gutters:
- Mobile: 4-column, 16px gutters
- Tablet: 8-column, 24px gutters
- Desktop: 12-column, 32px gutters

### Section Spacing

- Section padding: `py-24` (6rem) minimum
- Between major chambers: `py-32` (8rem)
- Content max-width: `1280px` (centered)
- Reading width for translations: `680px` (centered)
- Arabic text width: `880px` (centered, or full triptych center panel)

### The "Sacred Margin"

Every chamber boundary has a **sacred margin** — a strip of pure `space-deep` with no content, before the next chamber begins. This creates a meditative pause between sections.

---

## 6. Atmosphere & Lighting

Every chamber has a **lighting rig** — CSS-based atmospheric lighting that sets the mood.

### The Lantern Glow (Hero Sections)

```css
.lantern-glow {
  background: radial-gradient(
    ellipse 80% 50% at 50% 40%,
    oklch(0.80 0.10 85 / 0.12) 0%,
    oklch(0.80 0.10 85 / 0.04) 40%,
    transparent 70%
  );
}
```

### The Beam Effect (Search)

```css
.search-beam {
  background: conic-gradient(
    from 180deg at 50% 0%,
    transparent,
    oklch(0.80 0.10 85 / 0.08) 20%,
    transparent 40%
  );
}
```

### The Scriptorium Glow (Quran Reader)

```css
.scriptorium-glow {
  background: radial-gradient(
    ellipse 60% 80% at 50% 30%,
    oklch(0.78 0.09 85 / 0.06) 0%,
    transparent 60%
  );
}
```

### Ambient Particles

A subtle particle layer (CSS-based, no Three.js cost) floats in the background of every chamber:
- Gold dots at `opacity: 0.02-0.06`
- Slow vertical drift (60s cycle)
- Varying sizes (1px, 2px, 3px)
- Implemented via multiple CSS radial-gradient layers with animation

---

## 7. Navigation Architecture

### Desktop: The Vanishing Navbar

The navbar is **not always visible**. This is the key innovation.

| State | Behavior |
|-------|----------|
| **Idle** (at top) | Full navbar visible — glass effect with subtle gold bottom border |
| **Scrolling down** | Navbar fades out (`opacity: 0`, `translateY(-100%)`) — content takes full focus |
| **Scrolling up** | Navbar fades back in |
| **Scrolled past hero** | Navbar shrinks — smaller padding, more compact |
| **Active page indicator** | A small gold geometric diamond beneath the active link |

### The Lantern Button (Bottom-Center)

When the navbar is hidden, a single **floating gold lantern icon** appears at the bottom-center of the screen:
- A glowing gold orb with `filter: blur(2px)` aura
- Hover expands it into a mini radial menu (Home, Quran, Hadith, Videos, Search)
- Click on the orb itself reveals the full navbar
- This is unprecedented in Islamic web design — inspired by the lantern (قنديل) motif in mosques

### Mobile: The Illuminated Dock

- Bottom dock with 5 icons + theme toggle
- Active icon has a gold glow ring around it (`box-shadow: 0 0 8px gold-dim`)
- Dock itself is glass with a gold top border
- On scroll down: dock shrinks to minimal height (like iOS home bar)
- On scroll up: dock expands back

---

## 8. Page Designs

### 8.1 Homepage — "The Grand Foyer"

```
┌──────────────────────────────────────────────┐
│ ┌────────────────────────────────────────┐  │
│ │         FULL-BLEED 3D K A A B A       │  │
│ │      ORBITING GEOMETRIC RINGS          │  │
│ │     STAR PARTICLES DRIFT BY            │  │
│ │                                        │  │
│ │           ن و ر    Noor                 │  │  ← Gold, 6rem
│ │     Your Islamic resource              │  │  ← Fade in on scroll
│ │     [Start Reading] [Search]           │  │  ← Glass buttons with gold borders
│ └────────────────────────────────────────┘  │
│                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │Quran │ │Hadith│ │Videos│ │Search│     │  ← 4 quick-link cards
│  │ 114  │ │15K   │ │19    │ │4 lang│     │    with gold hover borders
│  └──────┘ └──────┘ └──────┘ └──────┘     │
│                                              │
│         Sacred Margin (pure space)           │
│                                              │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ Ayah of Day  │  │ Hadith of Day│        │  ← Glass cards with lantern glow
│  │ ─── Arabic ─→│  │ ─── Text ───→│        │
│  │ ─ Trans ────→│  │ ── Ref ────→│        │
│  └──────────────┘  └──────────────┘        │
│                                              │
│    "The Quran was revealed..." — Hadith    │  ← Pull quote
│                                              │
│         Footer (glass, minimal)              │
└──────────────────────────────────────────────┘
```

**Key behaviors:**
- 3D scene is the hero — text overlays appear only after the 3D scene has loaded (or after 1.5s, whichever comes first)
- Stats section scroll-triggered: numbers count up on entrance
- Quick links have gold border that illuminates on hover (`box-shadow: 0 0 15px gold-dim`)
- Ayah of the Day / Hadith of the Day: fetched from static JSON, displayed in decorative arch-shaped cards

### 8.2 Quran Reader — "The Scriptorium" (Triptych)

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back to Index     Al-Fatiha (الفاتحة)     [Juz 1 ▼]    │  ← Gold gradient header
├────────────┬──────────────────────┬─────────────────────────┤
│            │                      │                         │
│  SIDEBAR   │    CENTER PANEL      │     RIGHT PANEL         │
│            │                      │                         │
│  Juz Nav   │  ┌──────────────┐   │  Translation: English   │
│  (compact) │  │  Bismillah   │   │  ┌──────────────────┐   │
│            │  │  بِسْمِ ٱللَّهِ │   │  │In the name of   │   │
│  • Juz 1   │  │  ٱلرَّحْمَٰنِ  │   │  │Allah...         │   │
│  • Juz 2   │  │  ٱلرَّحِيمِ   │   │  └──────────────────┘   │
│  • Juz 3 ◀ │  └──────────────┘   │                         │
│            │                      │   Translation: Hindi    │
│  Surah Info│    1  ٱلْحَمْدُ      │   ┌──────────────────┐   │
│  ┌───────┐ │    لِلَّهِ رَبِّ     │   │(Hindi text...)   │   │
│  │Meccan │ │    ٱلْعَٰلَمِينَ    │   └──────────────────┘   │
│  │86 v.  │ │                    │                         │
│  └───────┘ │         2          │   Translation: Urdu      │
│            │    ٱلرَّحْمَٰنِ      │   ┌──────────────────┐   │
│            │    ٱلرَّحِيمِ      │   │(Urdu text...)    │   │
│            │                    │   └──────────────────┘   │
│            │    Ayah actions:   │                         │
│            │    [🔖][📋][🔗]    │   Tafsir toggle         │
│            │                    │   [Show Tafsir ▾]       │
│            │  ─── next ayah ─→ │                         │
├────────────┴──────────────────────┴─────────────────────────┤
│  [🔊 Recitation]  ═══════●═══════════  [Surah Al-Fatiha]   │  ← Audio bar (optional)
└──────────────────────────────────────────────────────────────┘
```

**Key innovations:**
- **Three-pane triptych layout** — Arabic center (the sacred text, widest), translations stacked on the right, navigation on the left
- On mobile: collapses to single scroll with translation toggle
- **Ayah numbers as illuminated manuscript markers** — gold rounded squares with Arabic numerals
- **Gold drop-cap** on first ayah
- **Basmala** displayed in an ornate decorative frame (gold geometric border, larger text)
- **Translation tabs** are replaced by a stacked accordion — all translations visible at once, expandable/contractible
- **Juz navigator** in sidebar is compact — just numbered dots with gold fill for current juz
- **Tafsir** available as expandable below each translation in the right panel

### 8.3 Hadith — "The Chain Library"

```
┌──────────────────────────────────────────┐
│  Hadith Collections     [Bukhari ▼]     │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │
│  │  🔍 Search hadith...    [Filter ▼]│  │  ← Gold search bar
│  └────────────────────────────────────┘  │
│                                           │
│  Collection cards with gold arch tops:    │
│  ┌──────────┐ ┌──────────┐              │
│  │  📖     │ │  📖     │              │
│  │ Bukhari  │ │ Muslim   │              │
│  │ 98 books │ │ 57 books│              │
│  └──────────┘ └──────────┘              │
│                                           │
│  Per-book view: Hadith cards              │
│  ┌──────────────────────────────────┐    │
│  │  Hadith 1                        │    │  ← Gold chain icon
│  │  Arabic text (right-aligned)     │    │
│  │  English text                    │    │
│  │  Narrated by Aisha (RA)          │    │
│  │  [Sahih]  [🔖][📋]              │    │
│  └──────────────────────────────────┘    │
│                                           │
│  Chain (Sanad) visualization:             │
│  ┌─ Aisha ─→ Hisham ─→ Malik ─→ ─┐      │  ← Horizontal gold dots connected
│  │       Bukhari: Book 1:1        │      │    by thin gold lines
│  └────────────────────────────────┘      │
└──────────────────────────────────────────┘
```

**Key innovations:**
- **Sanad (chain) visualization** — horizontal timeline-style display of the narration chain as connected gold dots
- Grade badges use emerald for Sahih, gold for Hasan, muted for Da'if — never red (avoids negative associations)
- Collection cards are arch-topped (using `clip-path`) to echo mosque architecture

### 8.4 Videos — "The Assembly Hall"

```
┌──────────────────────────────────────────┐
│  Video Library    [All Scholars ▾]      │
├──────────────────────────────────────────┤
│  Scholar filter chips (animated tabs):    │
│  [All] [Dr.Israr] [Mufti Menk] [Nouman]...│
│                                           │
│  Category filter:                         │
│  [Tafsir] [Seerah] [Fiqh] [Aqeedah] ...  │
│                                           │
│  Video grid (3-col → 2-col → 1-col):      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │🎬      │ │🎬      │ │🎬      │    │
│  │Title   │ │Title   │ │Title   │    │
│  │Scholar │ │Scholar │ │Scholar │    │
│  │👁 12K  │ │👁 8K   │ │👁 5K   │    │
│  └─────────┘ └─────────┘ └─────────┘    │
│                                           │
│  "Load More" button (gold, glass)         │
└──────────────────────────────────────────┘
```

**Key innovations:**
- Scholar chips have a gold outline when selected, emerald dot when active
- Category chips are pill-shaped with subtle gold gradient backgrounds
- Video card hover: thumbnail scales up, a gold geometric overlay appears with a "play" button
- Modal player: dark backdrop with gold border, geometric pattern in corner
- Scholar pages: profile section with gold arch-top card, Arabic name in calligraphy

### 8.5 Search — "The Beacon"

```
┌──────────────────────────────────────────┐
│                                         │
│           🔍                             │  ← Large gold search icon
│    Search Quran, Hadith & Videos        │
│  ┌────────────────────────────────────┐  │
│  │  Type to search...                 │  │  ← Oversized input with gold glow
│  └────────────────────────────────────┘  │
│                                         │
│  Filters:                                │
│  [Quran] [Hadith] [Videos] [All ✓]     │  ← Gold pill tabs
│                                         │
│  Results:                                │
│  ┌──────────────────────────────────┐   │
│  │ Surah Al-Fatiha (1)              │   │  ← Gold left border indicator
│  │ ...guidance for the righteous... │   │
│  │ — Quran, Surah 1, Ayah 2        │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Beam effect overlay behind results     │
└──────────────────────────────────────────┘
```

### 8.6 About — "The Colophon"

```
┌──────────────────────────────────────────┐
│           About Noor                     │
│           نور                             │
│                                         │
│  [Decorative gold divider]              │
│                                         │
│  A sacred space for the word of Allah.  │
│                                         │
│  Features:                              │
│  ● Complete Quran with translations     │
│  ● Authentic Hadith collections         │
│  ● Curated scholar videos               │
│                                         │
│  [Decorative gold divider]              │
│                                         │
│  "نور على نور — Light upon light"      │
│      — Quran, Surah An-Nur (24:35)     │
│                                         │
│  Tech & Credits section (minimal)       │
└──────────────────────────────────────────┘
```

---

## 9. Component Design

### Cards

All cards follow a consistent hierarchy:

```
┌──────────────────────────────────┐
│ ╔══════════════════════════════╗  │  ← Gold gradient top border (1.5px)
│ ║  Card Title              🔖 ║  │
│ ╚══════════════════════════════╝  │
│                                  │
│  Content area (space-surface)    │  ← Subtle geometric pattern overlay at 0.02 opacity
│                                  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  ← Gold-dim divider at 0.3 opacity
│                                  │
│  Footer: metadata, actions       │
└──────────────────────────────────┘
```

Card variants:
- **Standard:** Rounded corners (`radius-lg`), border at `border-gold-dim/15`, hover elevates
- **Arch:** Top clip-path arch shape, used for featured content
- **Glass:** `backdrop-blur-xl bg-space-surface/60` for overlays
- **Feature:** Full-bleed image/graphic top, content below

### Buttons

```
Primary (Gold):    bg-gold-gradient  text-space-deep  hover:shadow-gold-glow
Secondary:         border-gold-dim/30  text-gold-light  hover:bg-gold-dim/10
Ghost:             text-text-muted  hover:text-gold-light
```

All buttons have:
- `transition-all duration-300`
- `hover:scale-[1.02]`
- Gold shadow on hover (`0 0 20px gold-dim`)

### Badges

```
Sahih (Authentic):    bg-emerald/15  text-emerald  border-emerald/30
Hasan (Good):         bg-gold-dim/15  text-gold-light  border-gold-dim/30
Da'if (Weak):         bg-text-dim/10  text-text-dim  border-text-dim/20
Category:             bg-space-mid/50  text-gold-dim  border-gold-dim/20
```

### Dividers

```
Section divider:  ═══ ✦ ═══
                  Gold geometric ornament SVG centered
                  Thin gold line extending 30% from each side
                  Opacity: 0.3
```

---

## 10. 3D & Environment

### Homepage Hero (Current enhancement)

Builds on existing `HeroScene3D` with additions:

| Element | Status | Enhancement |
|---------|--------|-------------|
| Concentric rings | Already exists | Add slow color pulse |
| Sparkles | Already exists | Increase count from 40 to 80 |
| Star particles | Already exists | Add slow orbital drift |
| KaabaModel | Already exists | Place at center of rings |
| MosqueScene | Already exists | Use on scholar/video pages |
| LanternGlow | Already exists | Use as atmosphere layer |

### 3D Loading Strategy

- All 3D components use `next/dynamic` with `ssr: false`
- CSS geometric pattern background shown immediately as fallback
- 3D loads after `requestIdleCallback` or 2s timeout
- WebGL detection: fallback to CSS geometric patterns
- Performance: `dpr={[1, 1.5]}` to cap at 1.5 on high-DPI devices

### Decorative 3D (Non-Hero Pages)

- `GeometricPattern3D` — rotating 8-pointed star, used as subtle background on hadith and about pages
- `MosqueScene` — geometric dome, used on scholar pages
- `LanternGlow` — CSS radial gradient, used on all pages

---

## 11. Animation Language

### Principles

1. **Everything moves slowly.** No fast animations. `duration-500` minimum.
2. **Motion follows meaning.** Sacred content (ayahs) fades in with reverence. Interactive elements have spring physics.
3. **Reduced motion respected.** All animations check `prefers-reduced-motion`.

### Animation Catalog

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Page transition (veil) | Geometric pattern expands from center, then dissolves | 600ms | `ease-in-out` |
| Navbar hide/show | TranslateY with fade | 400ms | `ease-in-out` |
| Lantern button appear | Scale + fade | 300ms | `spring(0.3)` |
| Ayah reveal (Quran) | Fade in + translateY(8px) | 500ms | `ease-out` |
| Staggered ayah delay | `index * 0.03s` | — | — |
| Card hover | Scale(1.02) + border gold glow | 300ms | `ease-out` |
| Scroll reveal | Fade + translateY(30px) → 0 | 700ms | `ease-out` |
| Gold shimmer | Background-position shift | 3s loop | `linear` |
| Stats count-up | Numerical increment | 1.5s | `ease-out` |
| Veil overlay | Opacity 0 → 0.6 → 0 | 600ms | `ease-in-out` |

---

## 12. Mobile Experience

### Layout Adaptation

| Page | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| Homepage | Full 3D hero + 4-col cards | 2-col cards | Single column, 3D simplified |
| Quran Reader | Triptych (3 panels) | 2 panels (Arabic + stacked translations) | Single scroll, translation toggle |
| Hadith | 2-col collection cards + full card | 1-col + full card | Single column |
| Videos | 3-col grid | 2-col grid | 1-col grid |

### Touch Interactions

- Swipe left/right on Quran reader = next/previous surah (with haptic-like spring animation)
- Long-press on ayah = action menu (bookmark, copy, share)
- Pull-to-refresh on video pages = refresh YouTube data
- Bottom sheet for juz navigator on mobile (slides up from bottom)

### Mobile Navbar

- Bottom dock (existing `MobileNav.tsx`) enhanced with gold glow ring on active icon
- On scroll down: dock height reduces to 40px
- On scroll up: returns to 64px
- No floating lantern button on mobile (screen too small)

---

## 13. Light Mode — "Dawn"

Light mode is called **Dawn** — the transition from night to first light.

### Color Adjustments

```
--space-deep:      oklch(0.97 0.01 80)     #f4efe6  — Warm cream background
--space-navy:      oklch(0.95 0.015 80)    #ede6d8  — Surface
--space-surface:   oklch(0.92 0.02 80)     #e0d7c6  — Card backgrounds
--space-mid:       oklch(0.85 0.025 80)    #cfc4b0  — Borders

--gold-main:       oklch(0.65 0.10 85)     #b8922e  — Darker for contrast on light bg
--gold-light:      oklch(0.75 0.10 85)     #d4af37

--text-primary:    oklch(0.20 0.03 80)     #2c2416  — Dark warm
--text-muted:      oklch(0.45 0.03 80)     #625948
```

### Light Mode Changes

- Navbar: glass effect with light cream background
- Geometric patterns: gold on warm cream (opacity increased to 0.05-0.08)
- 3D: keep but with ambient light adjustment
- Shadows: warm brown tint instead of gold
- Lantern glow: reduced intensity, warmer tone

---

## 14. Implementation Guide

### Order of Implementation

1. **CSS Foundation** — Update globals.css with new color values, custom utilities, atmosphere layers
2. **Typography** — Adjust font sizes, add gold drop-cap utility
3. **Navigation** — Add auto-hide behavior, lantern button, enhanced glass effects
4. **Homepage** — Enhanced hero, scroll-triggered reveals, ayah/hadith of the day
5. **Quran Reader** — Triptych layout, illuminated markers, stacked translations
6. **Hadith** — Sanad visualization, enhanced cards
7. **Videos** — Scholar chips, enhanced grid
8. **Search** — Beam effect, oversized input
9. **About** — Colophon layout
10. **Animations** — Veil transitions, scroll reveals, staggered entries
11. **Mobile** — Touch interactions, responsive adaptations
12. **Light Mode** — Dawn color adjustments
13. **Polish** — Micro-interactions, performance tuning, accessibility pass

### Preserve at All Costs

- SSG: All 292 routes must continue to build statically
- Bookmarks: `useBookmarks` hook with localStorage + `useSyncExternalStore`
- Theme: `next-themes` with class strategy
- Search: Fuse.js with pre-built indexes
- PWA: Manifest + service worker
- Accessibility: ARIA labels, keyboard nav, skip-to-content
- Cloudflare: D1, KV, Pages Functions
- 3D fallback: `hasWebGL()` guard maintains graceful degradation

### Quality Checklist

- [ ] Build succeeds (302/302 routes)
- [ ] No console errors
- [ ] Dark/light mode toggle works
- [ ] All bookmarks persist
- [ ] Search returns results
- [ ] 3D loads without errors
- [ ] Mobile navigation works
- [ ] Page transitions smooth
- [ ] Accessible (keyboard + screen reader)
- [ ] Lighthouse 95+ performance
