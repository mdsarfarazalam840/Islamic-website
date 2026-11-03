# Implementation Plan: Hadith-Sourced Duas & Adhkar

## Technical Context

- Next.js App Router 16.4.2 with static export.
- Existing hadith data lives in `public/data/hadith/<collection>/books`.
- Existing Hisn al-Muslim data lives in `src/data/duas/hisn-al-muslim.json`.
- The interactive library is `src/components/duas/DuaLibrary.tsx`.
- The combined data must remain suitable for a client component and static export.

## Design

1. Add `scripts/build-hadith-duas.mjs` to scan all seven collections, score direct
   formula/practice cues, classify selected entries, and write a local JSON index.
2. Extend the dua model with source and hadith metadata while preserving the existing
   Hisn model and bookmark IDs.
3. Add source filtering and hadith citation links to the existing library.
4. Keep pagination after filtering and make hadith entries use the existing browser
   speech fallback when no licensed audio is available.
5. Add data-integrity tests and a Playwright static-export smoke flow.

## Constitution Check

- Noor visual language: satisfied by extending existing cards and controls.
- Sourced content: satisfied by local corpus metadata and direct reader links.
- Static export: satisfied by build-time JSON generation and no runtime API dependency.
- Accessibility: satisfied by semantic controls, labels, and keyboard focus styles.
- Verification: satisfied by unit/data checks, lint, build, and browser coverage.

## Risks and Mitigations

- English translation wording varies between collections; retain the original text and
  show the grade instead of silently normalizing it.
- Some records contain narrative context around a formula; label them as hadith-sourced
  and link to the full original narration for verification.
