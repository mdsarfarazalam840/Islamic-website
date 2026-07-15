# Task 2 Report: SearchBar Shared Component

## Status: DONE_WITH_CONCERNS

## Commits
- `a816d4d` — feat: add SearchBar component with Fuse.js fuzzy search

## Test Summary
Clean `npm run build` — compiled successfully, TypeScript passed, all pages generated (292/292).

## Concerns
1. **Missing `useQuran` hook**: The brief specifies importing from `@/hooks/useQuran`, but no such hook existed. It was created as part of this task to get the build to pass. The hook preloads all 114 surahs into a cache on mount — this is a heavy upfront data fetch (~6k+ ayahs) that may cause a brief loading delay on first use.
2. **`getAyahs` is synchronous**: The SearchBar calls `getAyahs(i)` in a loop inside `useEffect`. The implemented hook preloads data eagerly via `useEffect` + `fetch`, then returns cached results from a `Map`. Between mount and fetch completion, `getAyahs` returns `[]`. The component handles this gracefully via the `loading` state (shows spinner).

## Files Created/Modified
- **Created:** `src/components/shared/SearchBar.tsx` — full component as specified in brief
- **Created:** `src/hooks/useQuran.ts` — exports `useQuran()` returning `{ surahs, getAyahs }`
