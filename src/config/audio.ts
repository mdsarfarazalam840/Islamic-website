const BASE_URL = "https://server8.mp3quran.net/afs"

export function getSurahAudioUrl(surahNumber: number): string | null {
  const padded = surahNumber.toString().padStart(3, "0")
  return `${BASE_URL}/${padded}.mp3`
}

export const RECITER_NAME = "Mishary Al-Afasy"
export const RECITER_ID = "afs"
