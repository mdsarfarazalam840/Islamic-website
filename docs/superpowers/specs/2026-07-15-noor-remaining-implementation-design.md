# Noor — Remaining Implementation Design

> **Date:** 2026-07-15
> **Project:** Noor — Quran & Hadith Website
> **Order:** Shared Components → UI Components → Phase 6 Polish → 3D Components

---

## 1. Shared Components

### 1.1 SearchBar
- **File:** `src/components/shared/SearchBar.tsx`
- **Type:** `"use client"` component
- **Behavior:**
  - Debounced input (300ms) with Search icon (lucide-react)
  - On input change, uses Fuse.js against the Quran verses index (loaded lazily)
  - Dropdown shows top 5 matching ayahs (Arabic + English preview, surah name, ayah number)
  - Each result links to `/quran/{surahNumber}#ayah-{ayahNumber}`
  - "View all results" link at bottom navigates to `/search?q={query}`
  - Keyboard navigation: arrow keys cycle through results, Enter selects, Escape closes
  - Click outside closes dropdown
  - Empty state: "Search the Quran..." placeholder
  - Uses existing `useQuran` hook for data access
- **Props:** `placeholder?: string`, `className?: string`

### 1.2 LanguageSwitcher
- **File:** `src/components/shared/LanguageSwitcher.tsx`
- **Type:** `"use client"` component
- **Behavior:**
  - Dropdown with options: English, Arabic, Hindi, Urdu
  - Uses `lucide-react` Globe icon
  - Stores preference in localStorage under `noor-language`
  - On change, dispatches a custom event `noor:languageChange` that other components can listen to
  - Shows a checkmark next to the active language
  - Hydration-safe: renders a placeholder until mounted
- **Props:** none (self-contained)

### 1.3 BookmarkButton
- **File:** `src/components/shared/BookmarkButton.tsx`
- **Type:** `"use client"` component
- **Behavior:**
  - Uses existing `useBookmarks` hook
  - Accepts `type: 'ayah' | 'hadith'`, plus identifier props (`surahNumber`, `ayahNumber`, `hadithId`, `collection`)
  - Toggle button: Bookmark (lucide) icon, filled when bookmarked, outline when not
  - Accessible: `aria-label` toggles between "Bookmark this ayah" / "Remove bookmark" etc.
  - Animated transition between states (framer-motion scale)
- **Props:** `type: 'ayah' | 'hadith'`, `surahNumber?: number`, `ayahNumber?: number`, `hadithId?: string`, `collection?: string`, `className?: string`

### 1.4 LoadingSkeleton
- **File:** `src/components/shared/LoadingSkeleton.tsx`
- **Type:** Server-compatible component
- **Behavior:**
  - Renders a full-page skeleton matching the app layout
  - Variants: `'quran-index'`, `'quran-reader'`, `'hadith-collection'`, `'hadith-book'`, `'videos'`, `'search'`, `'default'`
  - Each variant mirrors the actual page layout shapes (grid cards, text lines, sidebar)
  - Uses the existing `Skeleton`, `SkeletonCard`, `SkeletonList` under the hood
- **Props:** `variant: LoadingVariant`, `className?: string`

---

## 2. UI Components (shadcn + @base-ui/react)

All components follow the existing pattern in `button.tsx`: use `class-variance-authority` for variants, `clsx`/`tailwind-merge` for class merging, and Tailwind v4 CSS variables from `globals.css`.

### 2.1 Card
- **File:** `src/components/ui/card.tsx`
- **Sub-components:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- **Variants:** None (structural)
- **Interactive variant:** `.card-interactive` with hover lift + border highlight

### 2.2 Tabs
- **File:** `src/components/ui/tabs.tsx`
- **Primitive:** `@base-ui/react/tabs`
- **Sub-components:** `TabsList`, `TabTrigger`, `TabPanel`
- **Variants:** Default (underline active), `pills` (filled active background)

### 2.3 Dialog
- **File:** `src/components/ui/dialog.tsx`
- **Primitive:** `@base-ui/react/dialog`
- **Sub-components:** `DialogTrigger`, `DialogPortal`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`
- **Sizes:** `sm` (max-w-sm), `md` (max-w-lg), `lg` (max-w-2xl)
- **Features:** Escape to close, click-outside to close, focus trap, body scroll lock

### 2.4 Input
- **File:** `src/components/ui/input.tsx`
- **Primitive:** Native `input` (styled)
- **Variants:** `default` (bordered), `ghost` (no border, subtle bg)
- **Sizes:** `default` (h-10), `sm` (h-8), `lg` (h-12)
- Adds `file:` styling for file inputs

### 2.5 Badge
- **File:** `src/components/ui/badge.tsx`
- **Primitive:** `span` (styled)
- **Variants:** `default` (primary bg), `secondary`, `outline`, `gold`, `emerald`, `destructive`
- **Sizes:** `default`, `sm`, `lg`

### 2.6 Select
- **File:** `src/components/ui/select.tsx`
- **Primitive:** `@base-ui/react/select`
- **Sub-components:** `SelectTrigger`, `SelectValue`, `SelectPopup`, `SelectItem`, `SelectGroup`, `SelectLabel`
- **Variants:** Same as Input (default, ghost)
- **Features:** Native select fallback for mobile, keyboard navigation, portal rendering

### 2.7 Sheet
- **File:** `src/components/ui/sheet.tsx`
- **Primitive:** `@base-ui/react/dialog`
- **Sub-components:** `SheetTrigger`, `SheetPortal`, `SheetOverlay`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`
- **Sides:** `left`, `right`, `top`, `bottom`
- **Sizes:** `sm` (w-72), `md` (w-96), `lg` (w-1/2), `full` (w-screen)
- **Features:** Escape to close, click-outside to close, focus trap, body scroll lock, smooth slide animation

### 2.8 Tooltip
- **File:** `src/components/ui/tooltip.tsx`
- **Primitive:** `@base-ui/react/tooltip`
- **Sub-components:** `TooltipProvider`, `TooltipTrigger`, `TooltipContent`
- **Variants:** `dark` (default, dark bg), `light` (light bg)
- **Sides:** `top`, `bottom`, `left`, `right`
- **Delay:** 500ms show, 200ms hide

---

## 3. Phase 6: Polish & Launch

### 3.1 Dark/Light Toggle in Navbar
- Add `ThemeToggle` to `Navbar.tsx` (desktop, next to nav links)
- Add to `MobileNav.tsx` (mobile, in the menu list)
- Uses existing `ThemeToggle` component from `src/components/shared/ThemeToggle.tsx`

### 3.2 Loading States Enhancement
- Review each route's `loading.tsx` — replace generic spinners with `LoadingSkeleton` matching page layout
- Add `Suspense` boundaries around data-fetching client components
- Specific pages: Quran reader (skeleton with verse cards), Hadith book (skeleton with hadith cards), Videos (skeleton with video cards), Search (skeleton with results)

### 3.3 Error Boundaries Integration
- Update each route's `error.tsx` to use the `ErrorBoundary` component with proper fallback UI
- Add `ErrorBoundary` wrapper around main content in `layout.tsx`
- Ensure error pages have retry buttons that work

### 3.4 Performance Audit
- Run Lighthouse on all page types (home, quran, hadith, videos, search)
- Fix critical findings: image dimensions, preload key resources, code-split heavy dependencies
- Add `next/dynamic` for Three.js components (lazy load)
- Add `priority` to LCP images
- Ensure 90+ Lighthouse score

### 3.5 Responsive Testing
- Verify at breakpoints: 320px, 375px, 768px, 1024px, 1440px
- Fix: mobile nav overflow, Quran reader on small screens, video grid on tablet
- Ensure footer + mobile nav don't overlap

### 3.6 Accessibility
- Add skip-to-content link (already in layout, verify works)
- ARIA labels on all icon buttons (already partial)
- Ensure focus indicators visible
- Keyboard navigation for search dropdown and modals
- Color contrast check for all text/background combos
- Screen reader testing for Quran reader (announce ayah numbers)

### 3.7 Cloudflare Pages Deploy
- Create `wrangler.toml`:
  ```toml
  name = "noor-quran"
  pages_build_output_dir = ".next"
  compatibility_date = "2026-07-15"
  pages_build_command = "npm run build"
  ```
- Create `.github/workflows/deploy.yml` for CI/CD
- Add environment variable placeholders for YouTube API key
- Configure Cloudflare Pages project settings (build command, output dir, env vars)

---

## 4. 3D Components (Geometric/Abstract)

### 4.1 Common Pattern
Each component follows this structure:
- Named export wrapping `<Canvas>` with `dpr={[1, 1.5]}` for performance
- `Suspense` fallback with `.geometric-bg` CSS class
- `hasWebGL()` check that returns null (graceful degradation)
- Canvas gets `className` from parent for sizing

### 4.2 Component Details

| Component | Description | Geometry | Animation |
|-----------|-------------|----------|-----------|
| **KaabaModel** | Abstract Kaaba representation | BoxGeometry with gold wireframe edges, dark emissive material | Slow Y-axis rotation, subtle float |
| **MosqueScene** | Geometric mosque silhouette | Combination of SphereGeometry (dome), CylinderGeometry (minaret), BoxGeometry (base) | Slow rotation, pulsing dome glow |
| **GeometricPattern3D** | Islamic star pattern extruded | Shape-based star/octagon geometry, gold material with wireframe overlay | Continuous Z-axis rotation |
| **LanternGlow** | Decorative lantern | Custom geometry using lathe or tube, emissive gold material | Point light animation, slight sway |
| **StarParticles** | Floating particle system | Points geometry, random positions in sphere, gold/teal color gradient | Slow drift upward + rotation |
| **Scene3D** | Composition wrapper (orchestrator) | Accepts `children`, provides shared Canvas, lights, controls | Empty group with ambient animation |
| **Loading3D** | Loading animation | IcosahedronGeometry with wireframe, gold material | Fast rotation, scale pulse |

### 4.3 Helper: `lib/three/utils.ts`
- Shared utilities: `hasWebGL`, `randomPosition`, `getGoldPalette`, `getTealPalette`

---

## 5. Implementation Order

1. **Shared Components** (SearchBar, LanguageSwitcher, BookmarkButton, LoadingSkeleton)
2. **UI Components** (Card, Tabs, Dialog, Input, Badge, Select, Sheet, Tooltip)
3. **Phase 6** (toggle wiring, loading states, error boundaries, perf, responsive, a11y, deploy)
4. **3D Components** (all 7 + three/utils)

---

## 6. Files to Create/Modify

### New Files
```
src/components/ui/card.tsx
src/components/ui/tabs.tsx
src/components/ui/dialog.tsx
src/components/ui/input.tsx
src/components/ui/badge.tsx
src/components/ui/select.tsx
src/components/ui/sheet.tsx
src/components/ui/tooltip.tsx
src/components/shared/SearchBar.tsx
src/components/shared/LanguageSwitcher.tsx
src/components/shared/BookmarkButton.tsx
src/components/shared/LoadingSkeleton.tsx
src/components/three/KaabaModel.tsx
src/components/three/MosqueScene.tsx
src/components/three/GeometricPattern3D.tsx
src/components/three/LanternGlow.tsx
src/components/three/StarParticles.tsx
src/components/three/Scene3D.tsx
src/components/three/Loading3D.tsx
src/lib/three/utils.ts
wrangler.toml
.github/workflows/deploy.yml
.env.example
```

### Modified Files
```
src/components/layout/Navbar.tsx          # Add ThemeToggle
src/components/layout/MobileNav.tsx       # Add ThemeToggle
src/app/layout.tsx                        # Add ErrorBoundary wrapper
src/app/quran/loading.tsx                  # Use LoadingSkeleton
src/app/quran/[surahNumber]/loading.tsx    # Use LoadingSkeleton
src/app/hadith/loading.tsx                 # Use LoadingSkeleton
src/app/hadith/[collection]/loading.tsx    # Use LoadingSkeleton
src/app/hadith/[collection]/[bookId]/loading.tsx # Use LoadingSkeleton
src/app/videos/loading.tsx                 # Use LoadingSkeleton
src/app/videos/[scholar]/loading.tsx        # Use LoadingSkeleton
src/app/search/loading.tsx                 # Use LoadingSkeleton
src/app/about/loading.tsx                  # Use LoadingSkeleton
src/app/error.tsx                          # Use ErrorBoundary
src/app/about/error.tsx                    # Use ErrorBoundary
src/app/quran/error.tsx                    # Use ErrorBoundary
src/app/hadith/error.tsx                   # Use ErrorBoundary
src/app/videos/error.tsx                   # Use ErrorBoundary
src/app/search/error.tsx                   # Use ErrorBoundary
```

---

*End of design document*
