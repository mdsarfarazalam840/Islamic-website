import fs from "node:fs"
import path from "node:path"

const dataRoot = path.join(process.cwd(), "public", "data", "hadith")
const outputPath = path.join(process.cwd(), "src", "data", "duas", "hadith-duas.json")
const collections = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]
const displayNames = {
  bukhari: "Sahih al-Bukhari",
  muslim: "Sahih Muslim",
  abudawud: "Sunan Abi Dawud",
  tirmidhi: "Jami at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  ibnmajah: "Sunan Ibn Majah",
  malik: "Muwatta Malik",
}

const directFormula = /\b(allahumma|o allah|i seek refuge|we seek refuge|seek refuge in allah|take refuge in allah|forgive me|forgive us|grant me|protect me|guide me|have mercy|praise be to allah|glory be to allah)\b/i
const practiceWords = /\b(used to say|would say|taught .* to say|said:|saying:|supplication|supplications|invocation|invocations|dhikr|remembrance|qunut|tashahhud|talbiyah)\b/i
const contextWords = /\b(morning|evening|before sleep|when he lay down|when he woke|after prayer|in prayer|prayer|fasting|fast|travel|journey|rain|wind|illness|sick|marriage|child|children|distress|grief|worry|debt|anger|dream|grave|devil|evil eye)\b/i

function scoreHadith(hadith) {
  const english = hadith.english ?? ""
  let score = 0
  if (/\b(allahumma|o allah)\b/i.test(english)) score += 4
  if (/\b(i seek refuge|we seek refuge|seek refuge in allah|take refuge in allah)\b/i.test(english)) score += 5
  if (/\b(used to say|would say|taught .* to say|said:|saying:|he said)\b/i.test(english)) score += 3
  if (practiceWords.test(english)) score += 2
  if (/\b(forgive me|forgive us|grant me|protect me|guide me|have mercy|praise be to allah|glory be to allah)\b/i.test(english)) score += 1
  if (contextWords.test(english)) score += 2
  return score
}

function categoryFor(hadith) {
  const text = `${hadith.english ?? ""} ${hadith.bookName ?? ""} ${hadith.chapterName ?? ""}`.toLocaleLowerCase()
  if (/prayer|salah|witr|tashahhud|qunut|prostration|sujud|mosque/.test(text)) return "prayer"
  if (/morning|evening|woke|waking|night|lay down|sleep|dream/.test(text)) return /sleep|lay down|dream/.test(text) ? "sleep" : "morning-evening"
  if (/hajj|umrah|talbiyah|travel|journey|ride|mount/.test(text)) return /hajj|umrah|talbiyah/.test(text) ? "hajj" : "travel"
  if (/fast|ramadan|iftar|suhur/.test(text)) return "ramadan"
  if (/rain|wind|thunder|cloud|eclipse|moon/.test(text)) return "weather"
  if (/illness|sick|pain|healing|medicine|disease|death|grave|funeral/.test(text)) return "health"
  if (/marriage|wife|husband|child|children|family|parent/.test(text)) return "family"
  if (/devil|satan|evil eye|magic|grave|fear|refuge|protection|fitnah/.test(text)) return "protection"
  if (/distress|grief|worry|debt|anger|hardship|sadness|sin/.test(text)) return "anxiety"
  if (/remembrance|dhikr|glorif|praise|forgive|istighfar|takbir|tahlil/.test(text)) return "remembrance"
  return "daily-life"
}

function readCollection(collection) {
  const booksPath = path.join(dataRoot, collection, "books")
  const files = fs.readdirSync(booksPath).filter((file) => /^book-\d+\.json$/.test(file))
  return files.flatMap((file) => JSON.parse(fs.readFileSync(path.join(booksPath, file), "utf8")))
}

const allEntries = []
const collectionCounts = {}
let scannedCount = 0

for (const collection of collections) {
  const hadiths = readCollection(collection)
  scannedCount += hadiths.length
  const selected = []

  for (const hadith of hadiths) {
    const score = scoreHadith(hadith)
    if (score < 7 || !directFormula.test(hadith.english ?? "") || !practiceWords.test(hadith.english ?? "")) continue
    selected.push({
      id: `hadith-${collection}-${hadith.number}`,
      source: "hadith",
      category: categoryFor(hadith),
      title: `${displayNames[collection]} · Hadith ${hadith.number}`,
      arabic: hadith.arabic ?? "",
      transliteration: "",
      translation: hadith.english ?? "",
      reference: `${displayNames[collection]} · ${hadith.bookName || "Hadith"} · Hadith ${hadith.number}${hadith.grade ? ` · ${hadith.grade}` : ""}`,
      chapterNumber: 0,
      chapterTitle: hadith.bookName || "Hadith collection",
      hadithCollection: collection,
      hadithNumber: hadith.number,
      bookId: hadith.bookId,
      bookName: hadith.bookName || `Book ${hadith.bookId}`,
      narrator: hadith.narrator ?? "",
      grade: hadith.grade ?? "",
      hadithHref: `/hadith/${collection}/${hadith.bookId}#hadith-${collection}-${hadith.number}`,
      relevanceScore: score,
    })
  }

  collectionCounts[collection] = { scanned: hadiths.length, selected: selected.length }
  allEntries.push(...selected)
}

const output = {
  source: {
    title: "Local hadith corpus",
    description: "A complete scan of the seven hadith collections already bundled with Noor; entries are selected when their English text contains a direct supplication/remembrance formula and practice cue.",
    scannedHadithCount: scannedCount,
    selectedHadithCount: allEntries.length,
    collectionCounts,
  },
  duas: allEntries,
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, JSON.stringify(output))
console.log(JSON.stringify({ scanned: scannedCount, selected: allEntries.length, collectionCounts }))
