import fs from "node:fs"
import path from "node:path"

// Reciter catalog builder.
//
// alquran.cloud lists every audio edition; the actual MP3s live on the
// islamic.network CDN under two shapes:
//
//   per ayah : /quran/audio/{bitrate}/{editionId}/{globalAyahNumber}.mp3   (1..6236)
//   per surah: /quran/audio-surah/{bitrate}/{editionId}/{surahNumber}.mp3  (1..114)
//
// Two things make probing necessary rather than inferring from the API:
//   1. Each edition is published at its own bitrate (Alafasy 128, Abdul Basit
//      Murattal 64, Ibrahim Walk 192, ...). A wrong bitrate answers 403.
//   2. The edition "type" field does not track which shapes exist — some
//      editions typed "translation" serve both per-ayah and per-surah files.
//
// So for every edition we walk the candidate bitrates until one answers 200,
// for both shapes, and confirm the tail file too so half-published editions
// don't ship as complete. Result lands in src/data/quran/reciters.json, which
// is committed so builds never touch the network.

const API_URL = "https://api.alquran.cloud/v1/edition?format=audio"
const CDN_BASE = "https://cdn.islamic.network/quran"
const OUTPUT_FILE = path.resolve("src/data/quran/reciters.json")

const BITRATES = [192, 128, 64, 48, 32] as const
const LAST_AYAH = 6236
const LAST_SURAH = 114

const CONCURRENCY = 6
const BATCH_DELAY_MS = 250

interface ApiEdition {
  identifier: string
  language: string
  name: string
  englishName: string
  format: string
  type: string
}

interface Reciter {
  id: string
  name: string
  nameArabic: string
  language: string
  type: string
  ayahBitrate: number | null
  surahBitrate: number | null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** HEAD a URL, retrying once on throttling/transient server errors. */
async function head(url: string): Promise<number> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { method: "HEAD" })
      if (res.status === 429 || res.status >= 500) {
        await sleep(1000)
        continue
      }
      return res.status
    } catch {
      await sleep(1000)
    }
  }
  return 0
}

/**
 * First bitrate at which both the opening and the closing file of a shape are
 * served. Checking only the first file would let editions that stop halfway
 * through the Quran pass as complete.
 */
async function findBitrate(
  shape: "audio" | "audio-surah",
  id: string,
  last: number,
): Promise<number | null> {
  for (const bitrate of BITRATES) {
    const first = await head(`${CDN_BASE}/${shape}/${bitrate}/${id}/1.mp3`)
    if (first !== 200) continue
    const tail = await head(`${CDN_BASE}/${shape}/${bitrate}/${id}/${last}.mp3`)
    if (tail === 200) return bitrate
    console.log(`    ${id}: ${shape} @${bitrate} incomplete (last file ${tail})`)
  }
  return null
}

async function probeEdition(edition: ApiEdition): Promise<Reciter | null> {
  const [ayahBitrate, surahBitrate] = await Promise.all([
    findBitrate("audio", edition.identifier, LAST_AYAH),
    findBitrate("audio-surah", edition.identifier, LAST_SURAH),
  ])

  if (ayahBitrate === null && surahBitrate === null) {
    console.log(`  skip ${edition.identifier} — no playable audio found`)
    return null
  }

  return {
    id: edition.identifier,
    name: edition.englishName,
    nameArabic: edition.name,
    language: edition.language,
    type: edition.type,
    ayahBitrate,
    surahBitrate,
  }
}

/**
 * Picker ordering: ayah-sync Arabic reciters first (they are what most readers
 * want, and only they drive the verse-by-verse highlight), then full-surah
 * Arabic recordings, then the translated/other-language editions.
 */
function sortKey(r: Reciter): number {
  const arabic = r.language === "ar"
  if (arabic && r.ayahBitrate !== null) return 0
  if (arabic) return 1
  return 2
}

async function main() {
  console.log("Fetching audio editions...")
  const res = await fetch(API_URL)
  if (!res.ok) throw new Error(`Failed to fetch ${API_URL}: ${res.status}`)
  const { data } = (await res.json()) as { data: ApiEdition[] }
  console.log(`  ${data.length} editions listed`)

  const reciters: Reciter[] = []
  for (let i = 0; i < data.length; i += CONCURRENCY) {
    const batch = data.slice(i, i + CONCURRENCY)
    console.log(`Probing ${i + 1}-${i + batch.length} of ${data.length}...`)
    const results = await Promise.all(batch.map(probeEdition))
    reciters.push(...results.filter((r): r is Reciter => r !== null))
    if (i + CONCURRENCY < data.length) await sleep(BATCH_DELAY_MS)
  }

  reciters.sort(
    (a, b) => sortKey(a) - sortKey(b) || a.name.localeCompare(b.name),
  )

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(reciters, null, 2) + "\n")

  const ayahCapable = reciters.filter((r) => r.ayahBitrate !== null).length
  const surahOnly = reciters.filter(
    (r) => r.ayahBitrate === null && r.surahBitrate !== null,
  ).length
  console.log(
    `\nWrote ${reciters.length} reciters to ${path.relative(process.cwd(), OUTPUT_FILE)}`,
  )
  console.log(`  ${ayahCapable} with per-ayah audio (verse sync)`)
  console.log(`  ${surahOnly} full-surah only`)
  console.log(`  ${data.length - reciters.length} dropped (no playable audio)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
