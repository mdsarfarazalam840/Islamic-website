export function getBasmala(): string {
  return "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u0650"
}

export function hasBasmala(surahNumber: number): boolean {
  return surahNumber !== 9 && surahNumber !== 1
}

export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ؤ]/g, "و")
    .replace(/[ى]/g, "ي")
    .replace(/[ة]/g, "ه")
}

export function getSurahNameWithNumber(number: number, nameArabic: string): string {
  return `(${number}) ${nameArabic}`
}
