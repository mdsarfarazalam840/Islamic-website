# Implementation Plan: Quran Khatmah Reading Plans

## Technical Context

- Next.js App Router 16.4.2 with static export.
- Existing Quran progress is stored by `src/hooks/useReadingProgress.ts`.
- Existing Quran data provides global ayah numbers and Juz boundaries through
  `src/lib/quran/juz.ts` and `src/lib/quran/translations.ts`.
- Existing UI uses `font-display`, `font-arabic`, gold semantic tokens, and card
  patterns visible in Quran and Saved components.

## Design

1. Add a plain local-first Khatmah store under `src/lib/khatmah.ts` and a
   subscription hook under `src/hooks/useKhatmah.ts`.
2. Record Khatmah activity from the Quran reader in parallel with
   `saveReadingProgress`; do not change the existing storage key or clear behavior.
3. Derive completion percentage, daily goal, ETA, streaks, and 30-Juz status from
   the plan plus `getJuzIndex()` boundaries.
4. Add `/khatmah` as a focused dashboard with setup, progress cards, Juz grid,
   reminder controls, and a link to continue reading.
5. Add a compact Khatmah entry to the Quran index and navigation where consistent
   with current Noor patterns.
6. Use browser notifications when available, with a persisted reminder preference
   and duplicate-per-day suppression. Keep the feature usable when permission is
   denied or unsupported.
7. Add unit tests for calculations/store behavior and Playwright coverage for the
   full reader-to-dashboard flow.

## Constitution Check

- Preserve Noor fonts and visual language: satisfied by existing tokens/components.
- Local-first static export: satisfied; no runtime API or server dependency.
- Separate data ownership: satisfied; existing latest-position key remains intact.
- Accessibility: semantic labels, focus rings, touch-sized controls, readable status text.
- Verification: unit tests, typecheck, lint, build, and browser E2E.

## Risks and Mitigations

- Browser notification support varies: treat notifications as best effort and show a
  clear in-page reminder status.
- Date changes can make streaks ambiguous: normalize dates to local calendar keys and
  calculate streaks from recorded active dates without negative values.
- Reader observer events can be frequent: only write when the furthest plan position
  or current day's activity changes.
