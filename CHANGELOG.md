## [Unreleased]

### Features
- Saved tab: bookmark ayahs, hadiths, and Knowledge Base articles, and resume reading where you left off. Bookmark actions are now visible on touch devices (they were hover-only), a "Save my spot" button on each reader stores the exact ayah/hadith position, and the new `/saved` route lists bookmarks alongside Quran, Hadith, Knowledge Base, and video resume points. The mobile bottom nav's Home tab becomes Saved (the Noor wordmark still links home).
- Hadith number lookup: typing a hadith number resolves it to the hadith itself instead of relying on text ranking. Works on the Hadith landing page, inside a collection's search, and in global search, and accepts a bare number (`1234`), a collection-qualified reference (`Bukhari 1234`, `Sahih Muslim 500`), and common separators (`bukhari:1234`, `#1234`). Results link straight to the hadith's anchor in its book. Backed by a new 34 KB run-length index (`public/data/hadith/number-index.json`, built by `npm run build:hadith-index`) that maps hadith numbers to books without downloading a collection.

### Bug Fixes
- Mobile layout fixes: the bottom nav no longer overflows a 360px screen (it dropped the theme toggle that duplicated the one in the top bar, switched to an even 6-column grid, and shortened "Knowledge" to "Learn"), the footer's last line is no longer hidden behind the fixed bottom nav, and the Saved page's filter chips and "Save my spot" labels stay inside the viewport.

### Performance
- A collection's full-text search index is now built on the first keyword search rather than on page load, so opening a collection or looking up a hadith number no longer downloads every book in it (~22 MB for Bukhari).
## [0.2.7] - 2026-08-19

### Other
- Added Knowledge base button to Top navigation bar as well as in the three lines for easy access (930e2d0)
- Major Feature Added Knowledge Base in the website with updated Readme (10c70c5)
- Containerized the whole project (0fdb0f2)


## [0.2.6] - 2026-08-09

### Other
- Enhanced resume in all the section and continue reading (6c8666b)


## [0.2.5] - 2026-08-06

### Other
- fixed the ayah of the day (cda5098)


## [0.2.4] - 2026-07-29

### Other
- Fixed UI and bugs, implemented pagination in videos sections and fixed some scholars videos (74eecb3)


## [0.2.3] - 2026-07-28

### Other
- Fixed optimization for all the pages (44d5c3d)
- Major Update as well as Enhancement for UI 3D model, Tafsir, pagination in search, audio player added (6918508)
- Updated UI with the 3D model to include (6566149)
- Added approval gate as well in the versioning (294c4dc)


## [0.2.2] - 2026-07-27

### Other
- Added rollback in deploy workflow (c96d1cd)


## [0.2.1] - 2026-07-26

### Other
- Fixed versioning to skip the release (b69fc34)
- Changes in Readme and workflows (8d76c13)
- Added more scholars in the Videos (65f8d6f)
- Fetch long-form YouTube videos and refresh twice daily (ab8700a)
- Updated geolocations for each scholar videos (19e6842)
- bug fix for 404 in searching phase (fabdee9)
- Updated release in the validation.yml file (5fd2393)
- fixed the changes for github action workflow (70d7404)


## [0.2.0] - 2026-07-22

### Features
- feat: add SearchBar component with Fuse.js fuzzy search (a816d4d)

### Bug Fixes
- fix: root error.tsx, lint suppressions, StarParticles purity, root loading.tsx (578cdd3)
- fix: gate SearchBar Fuse index build on loaded data (da14ae6)

### Other
- Merge pull request #2 from mdsarfarazalam840/feat-changes-in-UI-and-backend (19221c5)
- Updated the versioning for token acceptance (dc3eab9)
- Merge pull request #1 from mdsarfarazalam840/feat-changes-in-UI-and-backend (e0a0927)
- Add scroll-to-hash deep-linking, Suspense boundary, and server-side YouTube key (57c5215)
- Replace client-side corpus search with Pagefind index (684acc9)
- Fixed UI and backend changes (b90ee06)
- Added font maximize and minimize with extra hadith included (f1a98e7)
- Updated responsiveness in the UI for three line golden button (99c13b8)
- Fixed the animation for three line button (2f53c5e)
- Updated language for Urdu and other fixes (08ea04b)
- UI design changed (d5568fe)
- Fixed changes in videos section (7d2f6db)
- Updated routing in the pages (1cb5adc)
- Add 3D components (KaabaModel, StarParticles, MosqueScene, GeometricPattern3D, LanternGlow, Scene3D, Loading3D) and utils (2c4d7ba)
- perf: lazy load HeroScene3D via dynamic import with client wrapper (81ff154)
- Phase 6 Polish: ThemeToggle in MobileNav, LoadingSkeleton in all routes, ErrorBoundary integration (1e7cbdd)
- Add LoadingSkeleton, Card, Badge, Input, Tabs, Dialog, Sheet, Select, Tooltip components (77e7de1)
- Add BookmarkButton and LanguageSwitcher shared components (755161b)
- Initial commit from Create Next App (eab941e)


