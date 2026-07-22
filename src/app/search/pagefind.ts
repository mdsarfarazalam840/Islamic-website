/**
 * Thin typed wrapper around the Pagefind browser search API.
 *
 * Pagefind ships a static index bundle (built by scripts/build-pagefind-index.mjs).
 * The browser loads a ~45KB core script, then fetches only the tiny index chunks
 * and result fragments matching each query — tens of KB per search instead of
 * downloading the whole Quran/Hadith corpus.
 *
 * The bundle is hosted separately (see NEXT_PUBLIC_PAGEFIND_BUNDLE) because it
 * contains ~43k files, which exceeds Cloudflare Pages' 20k-file site limit; R2
 * (unlimited objects, free egress) hosts it and Pagefind loads it cross-origin
 * via `bundlePath`. When the env var is unset we fall back to the same-origin
 * "/pagefind/" path (works in local dev where the bundle sits in public/).
 */

// The pagefind.js module is resolved at runtime from a URL, so it has no types.

export interface PagefindMeta {
  type?: "quran" | "hadith"
  title?: string
  // Quran
  surah?: string
  ayah?: string
  juz?: string
  // Hadith
  collection?: string
  collectionName?: string
  bookId?: string
  book?: string
  hadithNumber?: string
  narrator?: string
  grade?: string
}

export interface PagefindResultData {
  url: string
  excerpt: string
  meta: PagefindMeta
}

interface PagefindApi {
  options: (opts: Record<string, unknown>) => Promise<void>
  init: () => void
  search: (
    term: string,
    opts?: { filters?: Record<string, string | string[]> },
  ) => Promise<{ results: { id: string; data: () => Promise<PagefindResultData> }[] }>
}

let pagefindPromise: Promise<PagefindApi> | null = null

function bundleBase(): string {
  const raw = process.env.NEXT_PUBLIC_PAGEFIND_BUNDLE?.trim()
  if (!raw) return "/pagefind/"
  return raw.endsWith("/") ? raw : `${raw}/`
}

/** Lazily import and initialize Pagefind exactly once per page load. */
export function getPagefind(): Promise<PagefindApi> {
  if (pagefindPromise) return pagefindPromise
  pagefindPromise = (async () => {
    const base = bundleBase()
    // Dynamic import via a runtime-computed URL. The webpackIgnore hint stops
    // the bundler from trying to resolve/inline this at build time — it must
    // stay a live network import of the static bundle.
    const mod: PagefindApi = await import(/* webpackIgnore: true */ `${base}pagefind.js`)
    // bundlePath must be set before init() or it is ignored.
    await mod.options({ bundlePath: base })
    mod.init()
    return mod
  })()
  return pagefindPromise
}
