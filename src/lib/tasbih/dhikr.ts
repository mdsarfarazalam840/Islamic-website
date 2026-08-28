import type { DhikrPreset, DhikrSequenceStep } from "@/types"

/**
 * The dhikr the tasbih counter offers, and the fixed 33/33/34 sequence.
 *
 * Every `note` here is checked against the hadith shipped in
 * `public/data/hadith/` — no reference is quoted from memory. `source.query` is
 * the string /search resolves back to that hadith, so a reader can open the
 * wording for themselves.
 */

const BUKHARI = (n: number) => ({ label: `Sahih al-Bukhari ${n}`, query: `Bukhari ${n}` })

export const DHIKR_PRESETS: DhikrPreset[] = [
  {
    id: "subhanallah",
    label: "Subhanallah",
    arabic: "سُبْحَانَ اللَّهِ",
    transliteration: "Subhan Allah",
    translation: "Glory be to Allah",
    defaultTarget: 33,
    note: "Said 33 times after every prayer.",
    source: BUKHARI(843),
  },
  {
    id: "alhamdulillah",
    label: "Alhamdulillah",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    translation: "All praise is for Allah",
    defaultTarget: 33,
    note: "Said 33 times after every prayer.",
    source: BUKHARI(843),
  },
  {
    id: "allahu-akbar",
    label: "Allahu Akbar",
    arabic: "اللَّهُ أَكْبَرُ",
    transliteration: "Allahu Akbar",
    translation: "Allah is the Greatest",
    defaultTarget: 34,
    note: "34 completes the tasbih the Prophet ﷺ taught Fatimah at bedtime.",
    source: BUKHARI(5362),
  },
  {
    id: "subhanallahi-wa-bihamdihi",
    label: "Subhanallahi wa bihamdihi",
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    transliteration: "Subhan Allahi wa bihamdihi",
    translation: "Glory be to Allah, and praise be to Him",
    defaultTarget: 100,
    note: "Whoever says it 100 times a day is forgiven his sins.",
    source: BUKHARI(6405),
  },
  {
    id: "tahlil",
    label: "La ilaha illallah",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "La ilaha illallah wahdahu la sharika lahu, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir",
    translation:
      "There is no deity but Allah, alone, without partner; His is the dominion and His the praise, and He is able to do all things",
    defaultTarget: 100,
    note: "Said 100 times a day: a shield until nightfall.",
    source: BUKHARI(6403),
  },
  {
    id: "istighfar",
    label: "Astaghfirullah",
    arabic: "أَسْتَغْفِرُ اللَّهَ",
    transliteration: "Astaghfirullah",
    translation: "I seek forgiveness from Allah",
    defaultTarget: 100,
    note: "The Prophet ﷺ sought forgiveness more than seventy times a day.",
    source: BUKHARI(6307),
  },
  {
    id: "subhanallahil-azim",
    label: "Subhanallahil 'Azim",
    arabic: "سُبْحَانَ اللَّهِ الْعَظِيمِ",
    transliteration: "Subhan Allahil 'Azim",
    translation: "Glory be to Allah, the Most Great",
    defaultTarget: 100,
    note: "Light on the tongue, heavy in the balance.",
    source: BUKHARI(6406),
  },
  {
    id: "hawla",
    label: "La hawla wa la quwwata illa billah",
    arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    transliteration: "La hawla wa la quwwata illa billah",
    translation: "There is no might nor power except with Allah",
    defaultTarget: 33,
    note: "Called a treasure of Paradise.",
    source: BUKHARI(6409),
  },
  {
    id: "salawat",
    label: "Salawat",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ",
    transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad",
    translation: "O Allah, send blessings upon Muhammad and upon the family of Muhammad",
    defaultTarget: 100,
    note: "Quran 33:56 commands the believers to send blessings upon the Prophet ﷺ.",
  },
]

/** Targets a round can be set to, plus whatever the preset itself asks for. */
export const TARGET_CHOICES = [33, 99, 100, 500, 1000] as const

const BY_ID = new Map(DHIKR_PRESETS.map((d) => [d.id, d]))

export function getDhikr(id: string): DhikrPreset | undefined {
  return BY_ID.get(id)
}

/** First preset — the default selection and the fallback for an unknown id. */
export const DEFAULT_DHIKR_ID = DHIKR_PRESETS[0].id

/**
 * The tasbih of Fatimah: 33 Subhanallah, 33 Alhamdulillah, 34 Allahu Akbar
 * (Sahih al-Bukhari 5362). In sequence mode, finishing one leg moves to the next.
 */
export const TASBIH_FATIMAH_SEQUENCE: DhikrSequenceStep[] = [
  { id: "subhanallah", target: 33 },
  { id: "alhamdulillah", target: 33 },
  { id: "allahu-akbar", target: 34 },
]
