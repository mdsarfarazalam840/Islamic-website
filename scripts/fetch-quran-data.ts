import fs from "node:fs"
import path from "node:path"

const API_BASE = "https://api.alquran.cloud/v1"
const OUTPUT_DIR = path.resolve("public/data/quran")

interface ApiSurah {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  revelationType: "Meccan" | "Medinan"
  numberOfAyahs: number
}

interface ApiAyah {
  number: number
  text: string
  surah: { number: number }
  numberInSurah: number
  juz: number
  manzil: number
  page: number
  ruku: number
  hizbQuarter: number
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json()
}

function mapRevelationType(t: "Meccan" | "Medinan"): "meccan" | "medinan" {
  return t === "Meccan" ? "meccan" : "medinan"
}

async function fetchSurahs() {
  console.log("Fetching surah list...")
  const data = await fetchJson(`${API_BASE}/surah`)
  const surahs = data.data.map((s: ApiSurah) => ({
    number: s.number,
    name: s.englishName,
    nameArabic: s.name,
    nameTranslated: s.englishNameTranslation,
    revelationType: mapRevelationType(s.revelationType),
    ayahCount: s.numberOfAyahs,
    juz: [] as number[],
  }))
  return surahs
}

async function fetchTranslation(edition: string): Promise<Record<number, string>> {
  console.log(`  Fetching translation: ${edition}...`)
  const data = await fetchJson(`${API_BASE}/quran/${edition}`)
  const result: Record<number, string> = {}
  for (const ayah of data.data.surahs.flatMap((s: any) => s.ayahs)) {
    result[ayah.number] = ayah.text
  }
  return result
}

async function fetchArabic(): Promise<Record<number, { text: string; surah: number; ayahInSurah: number; juz: number }>> {
  console.log("Fetching Arabic text...")
  const data = await fetchJson(`${API_BASE}/quran/quran-uthmani`)
  const result: Record<number, { text: string; surah: number; ayahInSurah: number; juz: number }> = {}
  for (const surah of data.data.surahs) {
    const surahNum = surah.number
    for (const ayah of surah.ayahs) {
      result[ayah.number] = {
        text: ayah.text,
        surah: surahNum,
        ayahInSurah: ayah.numberInSurah,
        juz: ayah.juz ?? 0,
      }
    }
  }
  return result
}

async function fetchJuzData(): Promise<{ surah: number; ayah: number }[]> {
  console.log("Fetching juz data...")
  const data = await fetchJson(`${API_BASE}/juz`)
  const juzStart: { surah: number; ayah: number }[] = []
  for (const juz of data.data) {
    juzStart.push({
      surah: juz.surah.number,
      ayah: juz.ayah.number,
    })
  }
  return juzStart
}

async function main() {
  console.log("=== Quran Data Fetcher ===\n")

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const surahs = await fetchSurahs()

  try {
    const juzData = await fetchJuzData()
    for (let i = 1; i <= 30; i++) {
      const j = juzData[i - 1]
      if (j) {
        const surah = surahs.find((s: { number: number }) => s.number >= j.surah)
        if (surah) {
          if (!surah.juz.includes(i)) {
            surah.juz.push(i)
          }
        }
      }
    }
  } catch {
    console.warn("  ⚠ Could not fetch juz data, surah.juz may be incomplete")
  }

  const surahsOutput = surahs.map((s) => ({
    ...s,
    juz: s.juz.sort((a, b) => a - b),
  }))

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "surahs.json"),
    JSON.stringify(surahsOutput, null, 2),
  )
  console.log(`  ✓ Saved ${surahsOutput.length} surahs to surahs.json`)

  console.log("\nFetching translations...")

  const editions: { key: string; file: string }[] = [
    { key: "en.ahmedali", file: "en.ahmedali.json" },
    { key: "hi.hindi", file: "hi.hindi.json" },
    { key: "ur.jalandhry", file: "ur.jalandhry.json" },
  ]

  const arabicData = await fetchArabic()
  const translations = {
    en: await fetchTranslation(editions[0].key),
    hi: await fetchTranslation(editions[1].key),
    ur: await fetchTranslation(editions[2].key),
  }

  const merged: any[] = []
  for (const [ayahNum, info] of Object.entries(arabicData)) {
    merged.push({
      number: Number(ayahNum),
      surahNumber: info.surah,
      ayahNumber: info.ayahInSurah,
      juz: info.juz,
      arabic: info.text,
      translations: {
        en: translations.en[Number(ayahNum)] || "",
        hi: translations.hi[Number(ayahNum)] || "",
        ur: translations.ur[Number(ayahNum)] || "",
      },
    })
  }

  merged.sort((a, b) => a.number - b.number)

  const groupedBySurah: Record<number, any[]> = {}
  for (const ayah of merged) {
    if (!groupedBySurah[ayah.surahNumber]) {
      groupedBySurah[ayah.surahNumber] = []
    }
    groupedBySurah[ayah.surahNumber].push(ayah)
  }

  for (const [surahNum, ayahs] of Object.entries(groupedBySurah)) {
    const filename = `surah-${surahNum}.json`
    fs.writeFileSync(
      path.join(OUTPUT_DIR, filename),
      JSON.stringify(ayahs, null, 2),
    )
  }

  console.log(`  ✓ Saved ${merged.length} ayahs across ${Object.keys(groupedBySurah).length} surah files`)

  // Save combined file for client-side search (no pretty-print to minimize size)
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "quran-all.json"),
    JSON.stringify(merged),
  )
  console.log(`  ✓ Saved quran-all.json (${merged.length} ayahs)`)

  console.log("\n✓ Quran data fetch complete!\n")
}

main().catch((err) => {
  console.error("Error fetching Quran data:", err)
  process.exit(1)
})
