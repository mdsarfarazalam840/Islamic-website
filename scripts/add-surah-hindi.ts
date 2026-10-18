import fs from "node:fs"
import path from "node:path"

/**
 * Add Hindi surah names and meanings to src/data/quran/surahs.json.
 *
 * This is the `surah` section of the AI pass, authored directly instead. The
 * upstream catalog (scripts/fetch-quran-data.ts, from alquran.cloud) ships only
 * `name` (transliterated Arabic) and `nameTranslated` (English meaning), so a
 * Hindi reader sees Latin script on every surah card and in the reader header.
 *
 * Two fields per surah, matching the `Surah` type in src/types/quran.ts:
 *   nameHi            the name in Devanagari, as a Hindi reader writes it
 *   nameTranslatedHi  the meaning in natural Hindi
 *
 * Register follows the rest of the site: familiar Urdu/Hindi religious
 * vocabulary with nuqta where the word takes one (फ़ातिहा, क़ुरैश, ग़ार) rather
 * than Sanskritised substitutes. Names that are a person or a disconnected
 * letter-group are transliterated and repeated as their own meaning, exactly as
 * the English column does (Yunus/Jonah -> यूनुस/यूनुस, Ta-Ha -> ता-हा/ता-हा).
 *
 * Keyed by surah number so a reordered or re-fetched catalog cannot shift the
 * mapping.
 *
 * Run: npx tsx scripts/add-surah-hindi.ts            # dry run
 *      npx tsx scripts/add-surah-hindi.ts --write    # apply
 */

const SURAHS_FILE = path.resolve("src/data/quran/surahs.json")
const WRITE = process.argv.includes("--write")

/** number -> [nameHi, nameTranslatedHi] */
const HINDI: Record<number, [string, string]> = {
  1: ["अल-फ़ातिहा", "खोलने वाली"],
  2: ["अल-बक़रा", "गाय"],
  3: ["आल-ए-इमरान", "इमरान का घराना"],
  4: ["अन-निसा", "औरतें"],
  5: ["अल-माइदा", "दस्तरख़्वान"],
  6: ["अल-अनआम", "मवेशी"],
  7: ["अल-आराफ़", "बुलंदियाँ"],
  8: ["अल-अनफ़ाल", "जंग का माल"],
  9: ["अत-तौबा", "तौबा"],
  10: ["यूनुस", "यूनुस"],
  11: ["हूद", "हूद"],
  12: ["यूसुफ़", "यूसुफ़"],
  13: ["अर-रअद", "बिजली की गरज"],
  14: ["इब्राहीम", "इब्राहीम"],
  15: ["अल-हिज्र", "पथरीला इलाक़ा"],
  16: ["अन-नह्ल", "शहद की मक्खी"],
  17: ["अल-इसरा", "रात का सफ़र"],
  18: ["अल-कहफ़", "ग़ार"],
  19: ["मरयम", "मरयम"],
  20: ["ता-हा", "ता-हा"],
  21: ["अल-अंबिया", "नबी"],
  22: ["अल-हज्ज", "हज"],
  23: ["अल-मोमिनून", "ईमान वाले"],
  24: ["अन-नूर", "रौशनी"],
  25: ["अल-फ़ुरक़ान", "कसौटी"],
  26: ["अश-शुअरा", "शायर"],
  27: ["अन-नम्ल", "चींटी"],
  28: ["अल-क़सस", "क़िस्से"],
  29: ["अल-अनकबूत", "मकड़ी"],
  30: ["अर-रूम", "रूमी"],
  31: ["लुक़मान", "लुक़मान"],
  32: ["अस-सजदा", "सजदा"],
  33: ["अल-अहज़ाब", "लश्कर"],
  34: ["सबा", "सबा"],
  35: ["फ़ातिर", "पैदा करने वाला"],
  36: ["या-सीन", "या-सीन"],
  37: ["अस-साफ़्फ़ात", "कतार बाँधने वाले"],
  38: ["साद", "साद"],
  39: ["अज़-ज़ुमर", "गिरोह"],
  40: ["ग़ाफ़िर", "बख़्शने वाला"],
  41: ["फ़ुस्सिलत", "तफ़सील से बयान"],
  42: ["अश-शूरा", "मशवरा"],
  43: ["अज़-ज़ुख़रुफ़", "सोने के ज़ेवर"],
  44: ["अद-दुख़ान", "धुआँ"],
  45: ["अल-जासिया", "घुटनों पर बैठना"],
  46: ["अल-अहक़ाफ़", "रेत के टीले"],
  47: ["मुहम्मद", "मुहम्मद"],
  48: ["अल-फ़त्ह", "फ़तह"],
  49: ["अल-हुजुरात", "हुजरे"],
  50: ["क़ाफ़", "क़ाफ़"],
  51: ["अज़-ज़ारियात", "बिखेरने वाली हवाएँ"],
  52: ["अत-तूर", "तूर पहाड़"],
  53: ["अन-नज्म", "सितारा"],
  54: ["अल-क़मर", "चाँद"],
  55: ["अर-रहमान", "बड़ा मेहरबान"],
  56: ["अल-वाक़िआ", "होने वाली घटना"],
  57: ["अल-हदीद", "लोहा"],
  58: ["अल-मुजादिला", "झगड़ने वाली औरत"],
  59: ["अल-हश्र", "इकट्ठा होना"],
  60: ["अल-मुम्तहिना", "जाँची गई औरत"],
  61: ["अस-सफ़्फ़", "सफ़"],
  62: ["अल-जुमुआ", "जुमा"],
  63: ["अल-मुनाफ़िक़ून", "मुनाफ़िक़"],
  64: ["अत-तग़ाबुन", "हार और जीत"],
  65: ["अत-तलाक़", "तलाक़"],
  66: ["अत-तहरीम", "हराम ठहराना"],
  67: ["अल-मुल्क", "बादशाही"],
  68: ["अल-क़लम", "क़लम"],
  69: ["अल-हाक़्क़ा", "यक़ीनी घड़ी"],
  70: ["अल-मआरिज", "चढ़ने की सीढ़ियाँ"],
  71: ["नूह", "नूह"],
  72: ["अल-जिन्न", "जिन्न"],
  73: ["अल-मुज़्ज़म्मिल", "चादर लपेटने वाला"],
  74: ["अल-मुद्दस्सिर", "कपड़ा ओढ़ने वाला"],
  75: ["अल-क़ियामा", "क़यामत"],
  76: ["अल-इंसान", "इंसान"],
  77: ["अल-मुरसलात", "भेजी जाने वाली हवाएँ"],
  78: ["अन-नबा", "बड़ी ख़बर"],
  79: ["अन-नाज़िआत", "खींच निकालने वाले"],
  80: ["अबस", "उसने त्यौरी चढ़ाई"],
  81: ["अत-तकवीर", "लपेट दिया जाना"],
  82: ["अल-इनफ़ितार", "फट जाना"],
  83: ["अल-मुतफ़्फ़िफ़ीन", "नाप-तोल में कमी करने वाले"],
  84: ["अल-इंशिक़ाक़", "फट पड़ना"],
  85: ["अल-बुरूज", "बड़े सितारे"],
  86: ["अत-तारिक़", "रात को आने वाला"],
  87: ["अल-आला", "सबसे बुलंद"],
  88: ["अल-ग़ाशिया", "छा जाने वाली"],
  89: ["अल-फ़ज्र", "सुबह"],
  90: ["अल-बलद", "शहर"],
  91: ["अश-शम्स", "सूरज"],
  92: ["अल-लैल", "रात"],
  93: ["अद-दुहा", "सुबह की रौशनी"],
  94: ["अश-शरह", "राहत"],
  95: ["अत-तीन", "अंजीर"],
  96: ["अल-अलक़", "जमा हुआ ख़ून"],
  97: ["अल-क़द्र", "क़द्र की रात"],
  98: ["अल-बय्यिना", "खुली दलील"],
  99: ["अज़-ज़लज़ला", "भूकंप"],
  100: ["अल-आदियात", "दौड़ने वाले घोड़े"],
  101: ["अल-क़ारिआ", "खड़खड़ाने वाली घड़ी"],
  102: ["अत-तकासुर", "ज़्यादा की होड़"],
  103: ["अल-अस्र", "ज़माना"],
  104: ["अल-हुमज़ा", "ताना देने वाला"],
  105: ["अल-फ़ील", "हाथी"],
  106: ["क़ुरैश", "क़ुरैश"],
  107: ["अल-माऊन", "छोटी भलाई"],
  108: ["अल-कौसर", "कौसर"],
  109: ["अल-काफ़िरून", "काफ़िर"],
  110: ["अन-नस्र", "ख़ुदाई मदद"],
  111: ["अल-मसद", "खजूर की रस्सी"],
  112: ["अल-इख़्लास", "ख़ालिस तौहीद"],
  113: ["अल-फ़लक़", "पौ फटना"],
  114: ["अन-नास", "लोग"],
}

interface Surah {
  number: number
  name: string
  nameArabic: string
  nameTranslated: string
  nameHi?: string
  nameTranslatedHi?: string
  revelationType: string
  ayahCount: number
  juz: number[]
}

function main() {
  console.log(`=== Surah Hindi names ${WRITE ? "(WRITING)" : "(dry run — pass --write)"} ===\n`)

  const raw = fs.readFileSync(SURAHS_FILE, "utf-8")
  const surahs = JSON.parse(raw) as Surah[]

  const missing = surahs.filter((s) => !HINDI[s.number]).map((s) => s.number)
  if (missing.length) {
    throw new Error(`No Hindi authored for surah(s): ${missing.join(", ")}`)
  }

  let added = 0
  let updated = 0
  for (const s of surahs) {
    const [nameHi, nameTranslatedHi] = HINDI[s.number]
    if (s.nameHi === nameHi && s.nameTranslatedHi === nameTranslatedHi) continue
    if (s.nameHi === undefined) added++
    else updated++
    s.nameHi = nameHi
    s.nameTranslatedHi = nameTranslatedHi
  }

  // Matches the formatting scripts/fetch-quran-data.ts writes.
  const out = JSON.stringify(surahs, null, 2)
  if (WRITE) fs.writeFileSync(SURAHS_FILE, out)

  console.log(`  ${added} surah(s) gained Hindi, ${updated} updated, ${surahs.length} total`)
  console.log("\n  sample:")
  for (const n of [1, 2, 18, 36, 55, 112, 114]) {
    const s = surahs.find((x) => x.number === n)!
    console.log(`    ${String(n).padStart(3)}  ${s.name} / ${s.nameTranslated}`)
    console.log(`         ${s.nameHi} / ${s.nameTranslatedHi}`)
  }
  console.log(WRITE ? "\n  Written.\n" : "\n  Nothing written — re-run with --write.\n")
}

main()
