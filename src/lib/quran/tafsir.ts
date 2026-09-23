import { assetPath } from "@/lib/utils"

const BASE = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir"

export const TAFSIR_EDITIONS = [
  { slug: "en-tafisr-ibn-kathir",      label: "Ibn Kathir",       lang: "en" },
  { slug: "en-tafsir-maarif-ul-quran", label: "Maarif-ul-Quran",  lang: "en" },
  // The only Hindi edition the dataset carries. Listed above the Urdu ones so a
  // Hindi reader finds it without scanning past three Urdu labels.
  { slug: "hindi-mokhtasar",           label: "हिन्दी मुख़्तसर",     lang: "hi" },
  { slug: "ur-tafseer-ibn-e-kaseer",   label: "ابن کثیر",         lang: "ur" },
  { slug: "ur-tafsir-bayan-ul-quran",  label: "بیان القرآن",      lang: "ur" },
  { slug: "tazkiru-quran-ur",          label: "تذکیر القرآن",     lang: "ur" },
] as const

export type TafsirSlug = (typeof TAFSIR_EDITIONS)[number]["slug"]
export type TafsirLang = (typeof TAFSIR_EDITIONS)[number]["lang"]

/**
 * The one edition we serve from our own data rather than jsDelivr.
 *
 * It is snapshotted by scripts/fetch-tafsir-hindi.ts and then proofread by
 * scripts/ai-hindi-pass.ts, so the local copy is the corrected one — reading it
 * from the CDN would silently undo every fix. The other five editions have no
 * local copy and keep going upstream.
 */
const LOCAL_SLUG: TafsirSlug = "hindi-mokhtasar"

// In-memory cache: "slug/surah/ayah" → text | null (null = fetch failed)
const cache = new Map<string, string | null>()

/**
 * One in-flight/settled fetch per surah of the local edition. The snapshot is
 * stored per surah, so opening one ayah's tafsir warms every other ayah in the
 * same surah for free — which is the common reading pattern.
 */
const localSurahs = new Map<number, Promise<Record<string, string> | null>>()

function fetchLocalSurah(surahNumber: number): Promise<Record<string, string> | null> {
  const cached = localSurahs.get(surahNumber)
  if (cached) return cached

  const promise = fetch(assetPath(`/data/tafsir/${LOCAL_SLUG}/surah-${surahNumber}.json`))
    .then((res) => (res.ok ? (res.json() as Promise<Record<string, string>>) : null))
    // A missing snapshot is not an error — fetchTafsir falls back to jsDelivr.
    .catch(() => null)

  localSurahs.set(surahNumber, promise)
  return promise
}

export async function fetchTafsir(
  slug: TafsirSlug,
  surahNumber: number,
  ayahNumber: number,
): Promise<string | null> {
  const key = `${slug}/${surahNumber}/${ayahNumber}`
  if (cache.has(key)) return cache.get(key)!

  if (slug === LOCAL_SLUG) {
    const surah = await fetchLocalSurah(surahNumber)
    // Only treat the snapshot as authoritative when it loaded. A surah that is
    // present but has no entry for this ayah genuinely has no tafsir.
    if (surah) {
      const text = surah[String(ayahNumber)]?.trim() || null
      cache.set(key, text)
      return text
    }
  }

  try {
    const res = await fetch(`${BASE}/${slug}/${surahNumber}/${ayahNumber}.json`)
    if (!res.ok) { cache.set(key, null); return null }
    const data = (await res.json()) as { text?: string }
    const text = data.text?.trim() || null
    cache.set(key, text)
    return text
  } catch {
    cache.set(key, null)
    return null
  }
}
