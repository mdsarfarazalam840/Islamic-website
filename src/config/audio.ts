import type { Reciter } from "@/types"
import recitersData from "@/data/quran/reciters.json"

// Recitation audio comes from the islamic.network CDN, the same project behind
// the alquran.cloud API used for the text. Two file shapes exist, and which one
// a reciter supports decides how the player behaves:
//
//   per ayah  -> /quran/audio/{bitrate}/{id}/{globalAyahNumber}.mp3   (1..6236)
//   per surah -> /quran/audio-surah/{bitrate}/{id}/{surahNumber}.mp3  (1..114)
//
// Bitrates differ per edition and a wrong one answers 403, so they are probed
// at build time and baked into the catalog by scripts/fetch-reciters.ts.
const CDN_BASE = "https://cdn.islamic.network/quran"

export const RECITERS = recitersData as Reciter[]

export const DEFAULT_RECITER_ID = "ar.alafasy"

/** Reciter by id, falling back to the default when an id is stale or unknown. */
export function getReciter(id: string): Reciter {
  return (
    RECITERS.find((r) => r.id === id) ??
    RECITERS.find((r) => r.id === DEFAULT_RECITER_ID) ??
    RECITERS[0]
  )
}

/** True when per-ayah files exist, i.e. playback can follow the text verse by verse. */
export function supportsAyahSync(reciter: Reciter): boolean {
  return reciter.ayahBitrate !== null
}

export type ReciterGroup = "ayah" | "surah" | "other"

/** Section a reciter belongs to in the picker. */
export function getReciterGroup(reciter: Reciter): ReciterGroup {
  if (reciter.language !== "ar") return "other"
  return supportsAyahSync(reciter) ? "ayah" : "surah"
}

export const RECITER_GROUP_LABELS: Record<ReciterGroup, string> = {
  ayah: "Verse by verse · ayah sync",
  surah: "Full-surah recordings",
  other: "Translations & other languages",
}

/**
 * URL for a single ayah's recitation, addressed by the *global* ayah number
 * (Ayah.number, 1–6236). Returns null for reciters without per-ayah audio.
 */
export function getAyahAudioUrl(
  reciter: Reciter,
  globalAyahNumber: number,
): string | null {
  if (reciter.ayahBitrate === null) return null
  return `${CDN_BASE}/audio/${reciter.ayahBitrate}/${reciter.id}/${globalAyahNumber}.mp3`
}

/** URL for a whole surah as one file. Null when the reciter has no surah files. */
export function getSurahAudioUrl(
  reciter: Reciter,
  surahNumber: number,
): string | null {
  if (reciter.surahBitrate === null) return null
  return `${CDN_BASE}/audio-surah/${reciter.surahBitrate}/${reciter.id}/${surahNumber}.mp3`
}
