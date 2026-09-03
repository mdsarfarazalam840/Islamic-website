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

// In-memory cache: "slug/surah/ayah" → text | null (null = fetch failed)
const cache = new Map<string, string | null>()

export async function fetchTafsir(
  slug: TafsirSlug,
  surahNumber: number,
  ayahNumber: number,
): Promise<string | null> {
  const key = `${slug}/${surahNumber}/${ayahNumber}`
  if (cache.has(key)) return cache.get(key)!
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
