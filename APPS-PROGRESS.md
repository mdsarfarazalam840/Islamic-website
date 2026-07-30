# Noor — Cross-Platform Apps: Progress Tracker

> **Resume here.** This file tracks all progress on the native apps project.
> Design spec: [`docs/superpowers/specs/2026-07-30-cross-platform-apps-design.md`](./docs/superpowers/specs/2026-07-30-cross-platform-apps-design.md)

---

## Summary

| Item | Choice |
|------|--------|
| Desktop | Tauri 2.0 (Windows + macOS) |
| Mobile | Capacitor (iOS + Android) |
| Structure | Monorepo: `apps/desktop/`, `apps/mobile/` |
| Offline | Bundled Quran core + downloadable hadith/video data |
| Distribution | GitHub Releases → app stores later |
| Native features | Offline-first, prayer notifications, native share, background audio |

---

## Phases & Status

### Phase 0: Setup & Scaffolding ✅
- [x] Create `apps/desktop/` with Tauri 2.0 init
- [x] Create `apps/mobile/` with Capacitor init
- [x] Add `scripts/build-apps.mjs` orchestrator
- [x] Add npm scripts to root `package.json`
- [x] Verify `out/` builds correctly for app consumption

### Phase 1: Desktop (Tauri)
- [x] Configure `tauri.conf.json` (frontendDist → `../../out`)
- [x] App icon, window config, app metadata
- [x] `tauri-plugin-notification` — prayer time local notifications
- [x] `tauri-plugin-http` + `tauri-plugin-fs` — download manager for hadith data
- [x] Native share via Web Share API (WebView2 supports it natively)
- [ ] Install Rust toolchain (`rustup`) — **required before building**
- [ ] Test Windows build (.msi/.exe)
- [ ] Test macOS build (.dmg)

### Phase 2: Mobile (Capacitor)
- [x] `capacitor.config.ts` — webDir → `../../out`
- [ ] Android project init (`npx cap add android`)
- [ ] iOS project init (`npx cap add ios`) — requires Mac
- [x] `@capacitor/local-notifications` — prayer times
- [x] `@capacitor/filesystem` — download manager
- [x] `@capacitor/share` — native share
- [ ] Background audio plugin for recitation
- [x] Splash screen + status bar config
- [ ] Test Android build (.apk)
- [ ] Test iOS build (requires Mac + Xcode)

### Phase 3: Web App Integration Layer
- [x] `src/lib/platform.ts` — detect web/tauri/capacitor
- [ ] Data layer: check local FS first, fallback to bundled JSON
- [x] `src/hooks/usePrayerNotifications.ts` — adhan-based scheduling
- [x] `src/hooks/useNativeShare.ts` — native share → Web Share API fallback
- [ ] Download manager UI component

### Phase 4: CI/CD ✅
- [x] `.github/workflows/apps.yml` — build on tag push
- [x] Windows build job (windows-latest)
- [x] macOS build job (macos-latest)
- [x] Android build job (ubuntu-latest)
- [ ] iOS build job (macos-latest, requires secrets)
- [x] Upload artifacts to GitHub Releases

### Phase 5: App Stores (later)
- [ ] Microsoft Store (MSIX)
- [ ] Mac App Store
- [ ] Google Play (.aab)
- [ ] Apple App Store (.ipa)

---

## Log

| Date | What happened |
|------|---------------|
| 2026-07-30 | Design approved. Spec written. Ready for implementation planning. |
| 2026-07-30 | Phase 0 complete: Tauri + Capacitor scaffolded, platform layer created, CI workflow added. |

---

## How to Resume

1. Read this file for current status
2. Read the [design spec](./docs/superpowers/specs/2026-07-30-cross-platform-apps-design.md) for architecture details
3. Pick up from the first unchecked item in the current phase
4. Update this file after each session
