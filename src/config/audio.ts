const BASE_URL = "https://server8.mp3quran.net/afs"

// Per-ayah recitation files (Mishary Al-Afasy) served from Quran.com's CDN.
// The API returns paths like "Alafasy/mp3/001001.mp3" for this base.
const AYAH_BASE_URL = "https://verses.quran.com/Alafasy/mp3"

export function getSurahAudioUrl(surahNumber: number): string | null {
  const padded = surahNumber.toString().padStart(3, "0")
  return `${BASE_URL}/${padded}.mp3`
}

/**
 * URL for a single ayah's recitation. Filenames are the zero-padded surah
 * number followed by the zero-padded ayah-within-surah number, e.g. 001001.mp3
 * for Al-Fatiha ayah 1.
 */
export function getAyahAudioUrl(surahNumber: number, ayahNumber: number): string {
  const surah = surahNumber.toString().padStart(3, "0")
  const ayah = ayahNumber.toString().padStart(3, "0")
  return `${AYAH_BASE_URL}/${surah}${ayah}.mp3`
}

export const RECITER_NAME = "Mishary Al-Afasy"
export const RECITER_ID = "afs"
